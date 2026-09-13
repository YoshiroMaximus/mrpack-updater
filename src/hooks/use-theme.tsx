import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { readString, STORAGE_PREFIX, writeString } from "@/lib/storage"

export type Theme = "system" | "light" | "dark"
const KEY = `${STORAGE_PREFIX}theme`
const query = () => window.matchMedia("(prefers-color-scheme: dark)")

interface ThemeContextValue {
  theme: Theme
  resolved: "light" | "dark"
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readTheme(): Theme {
  const t = readString(KEY)
  return t === "light" || t === "dark" ? t : "system"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const [systemDark, setSystemDark] = useState(() => query().matches)

  useEffect(() => {
    const mq = query()
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark")
    document.documentElement.style.colorScheme = resolved
  }, [resolved])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    writeString(KEY, t)
  }, [])

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}
