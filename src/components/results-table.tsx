import { DownloadIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ResultRow } from "@/lib/types"
import { compareByName, formatDate } from "@/lib/versions"

interface Props {
  rows: ResultRow[]
  targetMc: string
  packLoader: string
}

/** Missing first, then by name. */
function sortRows(rows: ResultRow[]): ResultRow[] {
  return [...rows].sort((a, b) => Number(a.target_available) - Number(b.target_available) || compareByName(a, b))
}

export function ResultsTable({ rows, targetMc, packLoader }: Props) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nothing to show.</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-40">Name</TableHead>
          <TableHead>Current</TableHead>
          <TableHead>{targetMc}</TableHead>
          <TableHead className="hidden sm:table-cell">Published</TableHead>
          <TableHead className="w-10 text-right" aria-label="Download" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortRows(rows).map((r) => (
          <TableRow key={r.project_id}>
            <TableCell className="whitespace-normal">
              <a href={r.project_url} target="_blank" rel="noreferrer" className="font-medium underline-offset-4 hover:underline">
                {r.name}
              </a>
              {r.target_loader !== packLoader && <span className="ml-2 text-xs text-muted-foreground">{r.target_loader}</span>}
            </TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">{r.current_version_number}</TableCell>
            <TableCell className="whitespace-nowrap">
              {r.target_available ? (
                <span className="inline-flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-success" aria-label={`Available for ${targetMc}`} />
                  {r.target_version_number}
                  {r.source === "github-fallback" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a href={r.source_url} target="_blank" rel="noreferrer">
                          <Badge variant="outline">GitHub</Badge>
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        Found on GitHub because Modrinth has no {targetMc} build. Not written into the built pack.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-label="Not available" />
                  No build yet
                </span>
              )}
            </TableCell>
            <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(r.target_date) ?? "–"}</TableCell>
            <TableCell className="text-right">
              {r.download_url && (
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground" asChild>
                  <a href={r.download_url} target="_blank" rel="noreferrer" aria-label={`Download ${r.target_file_name ?? r.name}`}>
                    <DownloadIcon />
                  </a>
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
