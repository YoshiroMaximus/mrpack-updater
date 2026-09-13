import { fetchVersions, hasCompatibleVersion, searchProjects } from "./modrinth"
import { readJson, STORAGE_PREFIX, writeJson } from "./storage"
import { CATEGORY, type Category, type MissingItem, type ResultRow } from "./types"
import { parseModpackNames } from "./versions"

const KEY = `${STORAGE_PREFIX}missing_items`
const VERSION = 3

interface Store {
  version: number
  items: MissingItem[]
}

export interface CheckProgress {
  done: number
  total: number
}

// The store is held in memory and written through on every change, so reads are
// free and snapshots are referentially stable for useSyncExternalStore.
let store: Store = readJson<Store>(KEY) ?? { version: VERSION, items: [] }
let checking: CheckProgress | null = null
const listeners = new Set<() => void>()

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  for (const fn of listeners) fn()
}

function save(items: MissingItem[]) {
  store = { version: VERSION, items }
  writeJson(KEY, store)
  emit()
}

function setChecking(p: CheckProgress | null) {
  checking = p
  emit()
}

export const getMissingItems = () => store.items
export const getCheckProgress = () => checking

/** Used only to upgrade very old tracked items that were stored by name. */
async function resolveProjectIdFromName(name: string, category: Category): Promise<string | null> {
  const hits = (await searchProjects(name))?.hits ?? []
  const lower = name.toLowerCase()
  for (const hit of hits) {
    const t = hit.title.toLowerCase()
    if (!(t.includes(lower) || lower.includes(t))) continue
    if ((await fetchVersions(hit.project_id, "1.20.1", CATEGORY[category].defaultLoader)).length) return hit.project_id
  }
  return null
}

let upgrade: Promise<void> | null = null

/** Brings older stored formats up to date. Safe to call repeatedly; runs once. */
export function ensureUpgraded(): Promise<void> {
  upgrade ??= (async () => {
    if (store.version >= VERSION) return
    const items: MissingItem[] = []
    for (const item of store.items) {
      if (item.projectId) {
        items.push({ ...item, loader: item.loader || CATEGORY[item.category].defaultLoader })
      } else {
        const projectId = await resolveProjectIdFromName(item.name, item.category).catch(() => null)
        if (projectId) items.push({ ...item, projectId, loader: CATEGORY[item.category].defaultLoader })
      }
    }
    save(items)
  })()
  return upgrade
}

function missingItemId(category: Category, name: string, targetMc: string): string {
  return `${category}-${name}-${targetMc}`.replace(/[^a-zA-Z0-9-]/g, "-")
}

interface RememberSummary {
  added: number
  updated: number
}

export function rememberMissing(rows: ResultRow[], targetMc: string, packName: string): RememberSummary {
  const items = store.items.map((i) => ({ ...i }))
  const summary: RememberSummary = { added: 0, updated: 0 }
  const now = new Date().toISOString()

  for (const row of rows) {
    const id = missingItemId(row.category, row.name, targetMc)
    const existing = items.find((i) => i.id === id)
    if (existing) {
      const packs = parseModpackNames(existing.originalModpack)
      if (!packs.includes(packName)) {
        existing.originalModpack = [...packs, packName].join(", ")
        existing.dateAdded = now
        summary.updated++
      }
      continue
    }
    items.push({
      id,
      name: row.name,
      category: row.category,
      targetMcVersion: targetMc,
      originalModpack: packName,
      projectId: row.project_id,
      loader: row.target_loader,
      dateAdded: now,
      lastChecked: null,
      found: false,
    })
    summary.added++
  }
  save(items)
  return summary
}

export function removeMissingItem(id: string) {
  save(store.items.filter((i) => i.id !== id))
}

export function clearMissingItems() {
  save([])
}

/** Re-checks every tracked item against Modrinth. Returns the items now available. */
export async function checkMissingItems(): Promise<MissingItem[]> {
  if (checking) return []
  await ensureUpgraded()
  const items = store.items
  const found: MissingItem[] = []
  setChecking({ done: 0, total: items.length })
  try {
    for (const [i, item] of items.entries()) {
      if (item.projectId) {
        const ok = await hasCompatibleVersion(item.projectId, item.targetMcVersion, item.loader)
        const lastChecked = new Date().toISOString()
        // Re-read from the live store: the user may have removed items while we were waiting.
        save(store.items.map((x) => (x.id === item.id ? { ...x, found: ok, lastChecked } : x)))
        if (ok) found.push({ ...item, found: true, lastChecked })
        await new Promise((r) => setTimeout(r, 100))
      }
      setChecking({ done: i + 1, total: items.length })
    }
  } finally {
    setChecking(null)
  }
  return found
}
