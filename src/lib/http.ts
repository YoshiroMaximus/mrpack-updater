class HttpError extends Error {
  constructor(
    public readonly status: number,
    url: string,
  ) {
    super(`${url} responded ${status}`)
  }
}

export async function fetchJson<T>(url: string | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new HttpError(res.status, String(url))
  return res.json() as Promise<T>
}

/** Like fetchJson but logs and returns null instead of throwing. For lookups where a miss is not fatal. */
export async function tryFetchJson<T>(url: string | URL, label: string, init?: RequestInit): Promise<T | null> {
  try {
    return await fetchJson<T>(url, init)
  } catch (e) {
    console.warn(`${label} failed:`, e)
    return null
  }
}
