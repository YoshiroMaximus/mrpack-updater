import { tryFetchJson } from "./http"
import type { ModrinthProject } from "./types"

export interface FallbackRelease {
  version_number: string
  date_published: string | null
  download_url: string
  release_url: string
}

/** A project whose builds can be found outside Modrinth when Modrinth has none. */
export interface GitHubFallback {
  matches(project: ModrinthProject | undefined, projectId: string): boolean
  fetch(targetMc: string): Promise<FallbackRelease | null>
}

interface GhAsset { name: string; browser_download_url: string }
interface GhRelease {
  draft: boolean
  prerelease: boolean
  tag_name?: string
  name?: string
  html_url: string
  published_at?: string
  created_at?: string
  assets?: GhAsset[]
}

function escReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Minecraft's newer year.release.patch scheme: a patch release like 26.1.2 may be
 * covered by a build labelled for the 26.1 family.
 */
function releaseCandidates(targetMc: string): string[] {
  const versions = [targetMc]
  if (/^\d+\.\d+\.\d+$/.test(targetMc) && !targetMc.startsWith("1.")) {
    versions.push(targetMc.split(".").slice(0, -1).join("."))
  }
  return versions
}

function isPrereleaseName(name: string): boolean {
  return /(?:^|[._\-\s])(?:pre|preview|prerelease|pre-release|rc|beta|alpha|snapshot)(?:[._\-\s\d]|$)/i.test(name)
}

function matchesMinecraftReleaseVersion(name: string, mc: string): boolean {
  return new RegExp(`(^|[^\\d.])${escReg(mc)}(?=$|[^\\d.]|\\.(?!\\d))`).test(name)
}

/** Stable GitHub release whose jar asset matches the target Minecraft version. */
function githubReleases(repo: string, assetPattern: RegExp): GitHubFallback["fetch"] {
  return async (targetMc) => {
    const releases = await tryFetchJson<GhRelease[]>(`https://api.github.com/repos/${repo}/releases`, `GitHub releases for ${repo}`, {
      headers: { Accept: "application/vnd.github+json" },
    })
    if (!releases) return null
    for (const mc of releaseCandidates(targetMc)) {
      for (const r of releases) {
        if (r.draft || r.prerelease || isPrereleaseName(`${r.tag_name ?? ""} ${r.name ?? ""}`)) continue
        const asset = (r.assets ?? []).find(
          (a) => /\.jar$/i.test(a.name) && assetPattern.test(a.name) && matchesMinecraftReleaseVersion(a.name, mc) && !isPrereleaseName(a.name),
        )
        if (asset) {
          return {
            version_number: r.tag_name || asset.name,
            date_published: r.published_at || r.created_at || null,
            download_url: asset.browser_download_url,
            release_url: r.html_url,
          }
        }
      }
    }
    return null
  }
}

const FALLBACKS: GitHubFallback[] = [
  {
    // Fabric Carpet publishes to GitHub before Modrinth.
    matches: (project, pid) => project?.slug === "fabric-carpet" || pid === "TQTTVgYE",
    fetch: githubReleases("gnembon/fabric-carpet", /fabric-?carpet/i),
  },
]

export function findFallbackRelease(
  project: ModrinthProject | undefined,
  projectId: string,
  targetMc: string,
): Promise<FallbackRelease | null> {
  const fallback = FALLBACKS.find((f) => f.matches(project, projectId))
  return fallback ? fallback.fetch(targetMc) : Promise.resolve(null)
}
