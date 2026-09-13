import { findFallbackRelease } from "./fallbacks"
import {
  getBestTargetVersion,
  getProjectsBatch,
  getRecommendedFabricLoader,
  pickPrimaryFile,
  projectUrl,
  resolveVersionFiles,
} from "./modrinth"
import { CATEGORY, categoryForPath, type IndexFile, type Loader, type ModrinthVersion, type PackIndex, type Progress, type ResultRow } from "./types"
import { loaderFor, slugify } from "./versions"

const MAX_CONCURRENCY = 6

export interface Analysis {
  packName: string
  packMc: string
  targetMc: string
  loader: Loader
  index: PackIndex
  rows: ResultRow[]
  /** Original index entry per project id, used to keep paths and env when building. */
  originalFiles: Map<string, IndexFile>
}

export interface BuildResult {
  blob: Blob
  fileName: string
  loaderNote: string
  skipped: ResultRow[]
}

export class PackError extends Error {}

// JSZip is only needed once a file is dropped, so keep it out of the initial bundle.
const loadJSZip = () => import("jszip").then((m) => m.default)

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  onTick?: (done: number, total: number) => void,
): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  let done = 0
  async function worker() {
    while (next < items.length) {
      const idx = next++
      out[idx] = await fn(items[idx])
      done++
      onTick?.(done, items.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

async function readIndex(file: File): Promise<{ zip: import("jszip"); index: PackIndex }> {
  const JSZip = await loadJSZip()
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const indexFile = zip.file("modrinth.index.json")
  if (!indexFile) throw new PackError("This file has no modrinth.index.json, so it is not a Modrinth pack.")
  return { zip, index: JSON.parse(await indexFile.async("string")) }
}

export async function analyzePack(
  file: File,
  targetMc: string,
  packLoader: Loader,
  onProgress: (p: Progress) => void,
): Promise<Analysis> {
  onProgress({ phase: "Reading pack", fraction: 0 })
  const { index } = await readIndex(file)
  const packName = index.name || "Updated Pack"
  const packMc = index.dependencies?.minecraft ?? "–"

  const sha1ToFile = new Map<string, IndexFile>()
  for (const f of index.files ?? []) {
    if (f.hashes?.sha1) sha1ToFile.set(f.hashes.sha1, f)
  }
  if (!sha1ToFile.size) throw new PackError("The pack lists no files with hashes, so there is nothing to check.")

  onProgress({ phase: "Resolving versions from hashes", detail: `${sha1ToFile.size} files`, fraction: 0.1 })
  const versionMap = await resolveVersionFiles([...sha1ToFile.keys()])

  const entries = new Map<string, { version: ModrinthVersion; file: IndexFile }>()
  for (const [sha1, ver] of Object.entries(versionMap)) {
    if (!ver?.project_id || entries.has(ver.project_id)) continue
    entries.set(ver.project_id, { version: ver, file: sha1ToFile.get(sha1)! })
  }
  const projectIds = [...entries.keys()]
  if (!projectIds.length) throw new PackError("Modrinth did not recognise any of the files in this pack.")

  onProgress({ phase: "Fetching project details", detail: `${projectIds.length} projects`, fraction: 0.2 })
  const projects = await getProjectsBatch(projectIds)

  const checkPhase = `Checking for ${targetMc} builds`
  onProgress({ phase: checkPhase, detail: `0 / ${projectIds.length}`, fraction: 0.3 })
  const rows = await mapLimit(
    projectIds,
    MAX_CONCURRENCY,
    async (pid): Promise<ResultRow> => {
      const { version: current, file } = entries.get(pid)!
      const category = categoryForPath(file.path ?? "")
      const project = projects.get(pid)
      const loader = loaderFor(project, category, packLoader)
      const url = projectUrl(project, pid, category)

      const modrinth = await getBestTargetVersion(pid, targetMc, loader)
      const fallback = modrinth ? null : await findFallbackRelease(project, pid, targetMc)
      const best = modrinth ?? fallback
      const fmeta = pickPrimaryFile(modrinth)

      return {
        project_id: pid,
        project_url: url,
        category,
        name: project?.title || current.name || "(unknown)",
        slug: project?.slug,
        current_version_number: current.version_number || "–",
        current_mc: packMc,
        target_loader: loader,
        target_available: !!best,
        target_version_number: best?.version_number || "–",
        target_mc: targetMc,
        target_date: best?.date_published ?? null,
        download_url: fmeta?.url ?? fallback?.download_url ?? null,
        source: fallback ? "github-fallback" : project ? "modrinth" : "none",
        source_url: fallback?.release_url ?? url,
        target_file_sha1: fmeta?.hashes?.sha1 ?? null,
        target_file_sha512: fmeta?.hashes?.sha512 ?? null,
        target_file_size: Number.isFinite(fmeta?.size) ? fmeta!.size : null,
        target_file_url: fmeta?.url ?? null,
        target_file_name: fmeta?.filename ?? null,
      }
    },
    (done, total) => onProgress({ phase: checkPhase, detail: `${done} / ${total}`, fraction: 0.3 + 0.7 * (done / total) }),
  )

  const originalFiles = new Map([...entries].map(([pid, e]) => [pid, e.file]))
  return { packName, packMc, targetMc, loader: packLoader, index, rows, originalFiles }
}

/** Rows that can be written into the new index: a Modrinth build with complete file metadata. */
function isBuildable(r: ResultRow): boolean {
  return r.source === "modrinth" && !!(r.target_file_sha512 && r.target_file_sha1 && r.target_file_size && r.target_file_url)
}

/** Keep the original folder but name the file after the new build. */
function targetPath(originalPath: string | undefined, row: ResultRow): string {
  const info = CATEGORY[row.category]
  if (!originalPath) return `${info.folder}/${row.slug || row.category}.${info.ext}`
  const dir = originalPath.slice(0, originalPath.lastIndexOf("/") + 1)
  return row.target_file_name ? `${dir}${row.target_file_name}` : originalPath
}

export async function buildPack(file: File, a: Analysis, onProgress: (p: Progress) => void): Promise<BuildResult> {
  onProgress({ phase: "Packaging .mrpack", fraction: 0.1 })
  const JSZip = await loadJSZip()
  const { zip } = await readIndex(file)

  const files: IndexFile[] = a.rows.filter(isBuildable).map((row) => {
    const orig = a.originalFiles.get(row.project_id) ?? {}
    return {
      path: targetPath(orig.path, row),
      hashes: { sha512: row.target_file_sha512!, sha1: row.target_file_sha1! },
      env: orig.env ?? { client: "required", server: "required" },
      downloads: [row.target_file_url!],
      fileSize: row.target_file_size!,
    }
  })

  const newIndex: PackIndex = structuredClone(a.index)
  newIndex.dependencies = { ...newIndex.dependencies, minecraft: a.targetMc }

  let loaderNote = ""
  if (a.loader === "fabric") {
    onProgress({ phase: "Looking up Fabric Loader", fraction: 0.4 })
    const rec = await getRecommendedFabricLoader(a.targetMc)
    if (rec) {
      newIndex.dependencies["fabric-loader"] = rec
      loaderNote = `Fabric Loader set to ${rec}.`
    } else if (newIndex.dependencies["fabric-loader"]) {
      loaderNote = `Kept Fabric Loader ${newIndex.dependencies["fabric-loader"]} because the lookup failed.`
    } else {
      loaderNote = "Fabric Loader was not set because the lookup failed."
    }
  }

  newIndex.name = `${a.packName.replace(/\s+$/, "")} (for ${a.targetMc})`
  newIndex.files = files

  onProgress({ phase: "Copying overrides", fraction: 0.6 })
  const out = new JSZip()
  for (const e of Object.values(zip.files)) {
    if (e.name.startsWith("overrides/") && !e.dir) out.file(e.name, await e.async("arraybuffer"))
  }
  out.file("modrinth.index.json", JSON.stringify(newIndex, null, 2))

  onProgress({ phase: "Compressing", fraction: 0.85 })
  const blob = await out.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } })
  const skipped = a.rows.filter((r) => r.target_available && !isBuildable(r))

  onProgress({ phase: "Done", fraction: 1 })
  return { blob, fileName: `${slugify(newIndex.name)}.mrpack`, loaderNote, skipped }
}
