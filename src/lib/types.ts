export type Category = "mod" | "resourcepack" | "shaderpack" | "datapack"
export type Loader = "fabric" | "quilt" | "forge" | "neoforge"
export type Source = "modrinth" | "github-fallback" | "none"

export const LOADERS: Loader[] = ["fabric", "quilt", "forge", "neoforge"]

interface CategoryInfo {
  label: string
  /** Folder inside the pack. */
  folder: string
  /** File extension used when the original path is unknown. */
  ext: string
  /** Path segment on modrinth.com. */
  modrinthType: string
  /** Loader to query when the project's own loader list is unavailable. */
  defaultLoader: string
}

/** Single source of truth for everything that varies by category. */
export const CATEGORY: Record<Category, CategoryInfo> = {
  mod: { label: "Mods", folder: "mods", ext: "jar", modrinthType: "mod", defaultLoader: "fabric" },
  resourcepack: { label: "Resource packs", folder: "resourcepacks", ext: "zip", modrinthType: "resourcepack", defaultLoader: "minecraft" },
  shaderpack: { label: "Shaders", folder: "shaderpacks", ext: "zip", modrinthType: "shader", defaultLoader: "iris" },
  datapack: { label: "Datapacks", folder: "datapacks", ext: "zip", modrinthType: "datapack", defaultLoader: "minecraft" },
}

export const CATEGORIES = Object.keys(CATEGORY) as Category[]

export function categoryForPath(path: string): Category {
  return CATEGORIES.find((c) => c !== "mod" && path.startsWith(`${CATEGORY[c].folder}/`)) ?? "mod"
}

export interface ModrinthVersionFile {
  url: string
  filename: string
  primary: boolean
  size: number
  hashes: { sha1: string; sha512: string }
}

export interface ModrinthVersion {
  id: string
  project_id: string
  name: string
  version_number: string
  version_type: "release" | "beta" | "alpha"
  date_published: string
  files: ModrinthVersionFile[]
}

export interface ModrinthProject {
  id: string
  slug: string
  title: string
  project_type: string
  loaders?: string[]
}

export interface IndexFile {
  path?: string
  hashes?: { sha1?: string; sha512?: string }
  env?: { client: string; server: string }
  downloads?: string[]
  fileSize?: number
}

export interface PackIndex {
  name?: string
  dependencies?: Record<string, string>
  files?: IndexFile[]
  [key: string]: unknown
}

export interface ResultRow {
  project_id: string
  project_url: string
  category: Category
  name: string
  slug?: string
  current_version_number: string
  current_mc: string
  target_loader: string
  target_available: boolean
  target_version_number: string
  target_mc: string
  target_date: string | null
  download_url: string | null
  source: Source
  /** Page for the build that was found: the release page for a GitHub fallback, else the project page. */
  source_url: string
  target_file_sha1: string | null
  target_file_sha512: string | null
  target_file_size: number | null
  target_file_url: string | null
  target_file_name: string | null
}

export interface Progress {
  phase: string
  detail?: string
  /** 0..1 */
  fraction: number
}

export interface MissingItem {
  id: string
  name: string
  category: Category
  targetMcVersion: string
  /** Comma-separated list of pack names, kept for compatibility with stored data. */
  originalModpack: string
  projectId: string | null
  loader: string
  dateAdded: string
  lastChecked: string | null
  found: boolean
}
