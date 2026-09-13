// Keys are scoped to the path the app is served from, matching the original
// implementation so existing users keep their data. The pre-paint theme script
// in index.html re-derives this same prefix; keep the two in sync.
const APP_PATH = window.location.pathname.replace(/\/[^/]*$/, "") || "/"
export const STORAGE_PREFIX = `mrpack${APP_PATH.replace(/[^a-zA-Z0-9]/g, "_")}_`

export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable */
  }
}

export function readJson<T>(key: string): T | null {
  const raw = readString(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown): void {
  writeString(key, JSON.stringify(value))
}
