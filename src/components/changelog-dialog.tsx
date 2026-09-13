import { useMemo, useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { buildChangelog } from "@/lib/changelog"
import type { Analysis } from "@/lib/mrpack"

export function ChangelogDialog({ analysis }: { analysis: Analysis }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const text = useMemo(() => buildChangelog(analysis), [analysis])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Could not copy", { description: "Select the text and copy it manually." })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Changelog</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Changelog</DialogTitle>
          <DialogDescription>Markdown release notes for the {analysis.targetMc} update. Edit after pasting.</DialogDescription>
        </DialogHeader>
        <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap select-all">{text}</pre>
        <Button onClick={copy} className="self-end">
          {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          {copied ? "Copied" : "Copy Markdown"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
