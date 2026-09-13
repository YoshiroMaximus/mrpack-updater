import { useEffect, useRef, useSyncExternalStore } from "react"
import { toast } from "sonner"
import {
  checkMissingItems,
  ensureUpgraded,
  getCheckProgress,
  getMissingItems,
  subscribe,
  type CheckProgress,
} from "@/lib/missing-items"
import type { MissingItem } from "@/lib/types"

/** Live view of the tracked items and any check in progress. */
export function useMissingItems(): { items: MissingItem[]; checking: CheckProgress | null } {
  const items = useSyncExternalStore(subscribe, getMissingItems)
  const checking = useSyncExternalStore(subscribe, getCheckProgress)
  useEffect(() => {
    void ensureUpgraded()
  }, [])
  return { items, checking }
}

export function announceFound(found: MissingItem[], opts?: Parameters<typeof toast.success>[1]) {
  toast.success(`${found.length} of your missing items now have a build`, {
    description: found.map((i) => `${i.name} for ${i.targetMcVersion}`).join(", "),
    ...opts,
  })
}

/** Re-checks remembered items once, shortly after load, and offers to show any that became available. */
export function useAutoCheckMissingItems(onShow: () => void) {
  const onShowRef = useRef(onShow)
  onShowRef.current = onShow
  useEffect(() => {
    if (getMissingItems().length === 0) return
    const t = setTimeout(async () => {
      const found = await checkMissingItems().catch(() => [])
      if (found.length) {
        announceFound(found, { action: { label: "Show", onClick: () => onShowRef.current() }, duration: 10000 })
      }
    }, 2000)
    return () => clearTimeout(t)
  }, [])
}
