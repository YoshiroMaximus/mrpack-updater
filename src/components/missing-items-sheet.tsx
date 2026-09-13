import { BookmarkIcon, ExternalLinkIcon, Loader2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { announceFound, useMissingItems } from "@/hooks/use-missing-items"
import { checkMissingItems, clearMissingItems, removeMissingItem } from "@/lib/missing-items"
import { projectUrl } from "@/lib/modrinth"
import type { MissingItem } from "@/lib/types"
import { compareByName, formatDate } from "@/lib/versions"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Found first, then by name. */
function sortItems(items: MissingItem[]) {
  return [...items].sort((a, b) => Number(b.found) - Number(a.found) || compareByName(a, b))
}

export function MissingItemsSheet({ open, onOpenChange }: Props) {
  const { items, checking } = useMissingItems()
  const found = items.filter((i) => i.found).length

  async function runCheck() {
    try {
      const nowFound = await checkMissingItems()
      if (nowFound.length) announceFound(nowFound)
      else toast("Nothing new yet", { description: `Checked ${items.length} items.` })
    } catch (e) {
      console.error(e)
      toast.error("Could not check for updates", { description: "Modrinth did not answer. Try again in a moment." })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size={items.length ? "default" : "icon"} aria-label="Missing items">
          <BookmarkIcon />
          {items.length > 0 && (
            <span className="tabular-nums">
              {items.length}
              {found > 0 && <span className="text-success"> · {found} ready</span>}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Missing items</SheetTitle>
          <SheetDescription>Projects you asked to remember. They are re-checked each time you open this page.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing here yet. After a check, use “Remember missing items” to keep an eye on the projects that had no build.
            </p>
          ) : (
            <ul className="divide-y">
              {sortItems(items).map((item) => (
                <li key={item.id} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.targetMcVersion}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.category} for {item.loader}. From {item.originalModpack || "an unknown pack"}.
                      </div>
                    </div>
                    {item.found ? (
                      <Badge className="shrink-0 bg-success/15 text-success">Ready</Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-muted-foreground">
                        Waiting
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {item.lastChecked ? `Checked ${formatDate(item.lastChecked, { time: true })}` : "Not checked yet"}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.projectId && (
                        <Button variant="ghost" size="xs" asChild>
                          <a href={projectUrl(undefined, item.projectId, item.category)} target="_blank" rel="noreferrer">
                            Modrinth <ExternalLinkIcon data-icon="inline-end" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Stop tracking ${item.name}`}
                        onClick={() => {
                          removeMissingItem(item.id)
                          toast(`Stopped tracking ${item.name}`)
                        }}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <SheetFooter className="flex-row items-center justify-between gap-2 border-t">
            <Button variant="outline" onClick={runCheck} disabled={!!checking}>
              {checking ? (
                <>
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                  {checking.done} / {checking.total}
                </>
              ) : (
                "Check now"
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground">
                  Clear all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all missing items?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This forgets {items.length} tracked {items.length === 1 ? "project" : "projects"}. You can remember them again after
                    your next check.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep them</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      clearMissingItems()
                      toast("Cleared all missing items")
                    }}
                  >
                    Clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
