import { CATEGORY, type Category, type Loader, type ModrinthProject } from "./types"

export function parseModpackNames(s: string | undefined | null): string[] {
  if (!s || typeof s !== "string") return []
  return s.split(", ").map((x) => x.trim())
}

/** The loader to query Modrinth with for a project in the given category. */
export function loaderFor(project: ModrinthProject | undefined, category: Category, packLoader: Loader): string {
  if (category === "mod") return packLoader
  return project?.loaders?.[0] ?? CATEGORY[category].defaultLoader
}

export function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export function formatDate(iso: string | null | undefined, { time = false } = {}): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return time ? d.toLocaleString() : d.toLocaleDateString()
}

export function compareByName(a: { name?: string }, b: { name?: string }): number {
  return (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" })
}
