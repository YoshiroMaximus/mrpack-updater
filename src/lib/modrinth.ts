import { fetchJson, tryFetchJson } from "./http"
import { CATEGORY, type Category, type ModrinthProject, type ModrinthVersion, type ModrinthVersionFile } from "./types"

const API = "https://api.modrinth.com/v2"

export interface GameVersion {
  version: string
  /** Final releases only; snapshots, pre-releases and release candidates are "snapshot". */
  type: "release" | "snapshot"
}

/** Used when Modrinth's version list cannot be loaded. */
export const FALLBACK_GAME_VERSIONS: GameVersion[] = [{ version: "1.21.4", type: "release" }]

/** Newest first, as Modrinth orders them by date. */
export async function fetchGameVersions(): Promise<GameVersion[]> {
  const tags = await fetchJson<Array<{ version: string; version_type: string }>>(`${API}/tag/game_version`)
  return tags
    .filter((t) => t.version_type === "release" || t.version_type === "snapshot")
    .map((t) => ({ version: t.version, type: t.version_type === "release" ? "release" : "snapshot" }))
}

export function defaultTargetVersion(versions: GameVersion[]): string {
  return versions.find((v) => v.type === "release")?.version ?? versions[0]?.version ?? ""
}

export function resolveVersionFiles(sha1s: string[]): Promise<Record<string, ModrinthVersion | null>> {
  return fetchJson(`${API}/version_files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hashes: sha1s, algorithm: "sha1" }),
  })
}

/** Versions of a project for one game version and loader. Empty on error. */
export async function fetchVersions(projectId: string, mc: string, loader: string): Promise<ModrinthVersion[]> {
  const url = new URL(`${API}/project/${projectId}/version`)
  url.searchParams.set("game_versions", JSON.stringify([mc]))
  url.searchParams.set("loaders", JSON.stringify([loader]))
  const versions = await tryFetchJson<ModrinthVersion[]>(url, `Versions for ${projectId}`)
  return Array.isArray(versions) ? versions : []
}

export async function getProjectsBatch(projectIds: string[]): Promise<Map<string, ModrinthProject>> {
  if (!projectIds.length) return new Map()
  const url = new URL(`${API}/projects`)
  url.searchParams.set("ids", JSON.stringify(projectIds))
  const projects = (await tryFetchJson<ModrinthProject[]>(url, "Project batch")) ?? []
  return new Map(projects.map((p) => [p.id, p]))
}

export function searchProjects(query: string, limit = 10) {
  const url = new URL(`${API}/search`)
  url.searchParams.set("query", query)
  url.searchParams.set("limit", String(limit))
  return tryFetchJson<{ hits?: Array<{ title: string; project_id: string }> }>(url, `Search "${query}"`)
}

export async function hasCompatibleVersion(projectId: string, mc: string, loader: string): Promise<boolean> {
  return (await fetchVersions(projectId, mc, loader)).length > 0
}

/** Newest release-tier build for the target, falling back to beta then alpha. */
export async function getBestTargetVersion(
  projectId: string,
  mc: string,
  loader: string,
): Promise<ModrinthVersion | null> {
  const versions = await fetchVersions(projectId, mc, loader)
  if (!versions.length) return null
  const tier = (v: ModrinthVersion) => (v.version_type === "release" ? 3 : v.version_type === "beta" ? 2 : 1)
  versions.sort((a, b) => {
    const t = tier(b) - tier(a)
    if (t) return t
    return new Date(b.date_published).getTime() - new Date(a.date_published).getTime()
  })
  return versions[0]
}

export function pickPrimaryFile(version: ModrinthVersion | null): ModrinthVersionFile | null {
  if (!version?.files?.length) return null
  return version.files.find((f) => f.primary) ?? version.files[0]
}

export async function getRecommendedFabricLoader(mc: string): Promise<string | null> {
  const arr = await tryFetchJson<Array<{ loader?: { version?: string; stable?: boolean } }>>(
    `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mc)}`,
    "Fabric Meta lookup",
  )
  if (!Array.isArray(arr)) return null
  const pick = arr.find((x) => x?.loader?.stable) ?? arr[0]
  return pick?.loader?.version ?? null
}

export function projectUrl(project: ModrinthProject | undefined, pid: string, category: Category): string {
  return project?.slug
    ? `https://modrinth.com/${CATEGORY[category].modrinthType}/${project.slug}`
    : `https://modrinth.com/project/${pid}`
}
