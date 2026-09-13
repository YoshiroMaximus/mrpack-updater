import { memo, useEffect, useMemo, useState } from "react"
import { DownloadIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { HelpDialog } from "@/components/help-dialog"
import { MissingItemsSheet } from "@/components/missing-items-sheet"
import { PackDropzone } from "@/components/pack-dropzone"
import { ResultsTable } from "@/components/results-table"
import { ThemeMenu } from "@/components/theme-menu"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Toaster } from "@/components/ui/sonner"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAutoCheckMissingItems } from "@/hooks/use-missing-items"
import { ThemeProvider } from "@/hooks/use-theme"
import { rememberMissing } from "@/lib/missing-items"
import { defaultTargetVersion, FALLBACK_GAME_VERSIONS, fetchGameVersions, type GameVersion } from "@/lib/modrinth"
import { analyzePack, buildPack, PackError, type Analysis, type BuildResult } from "@/lib/mrpack"
import { CATEGORIES, CATEGORY, LOADERS, type Category, type Loader, type Progress as ProgressState } from "@/lib/types"

const BASE_TITLE = "mrpack updater for Modrinth"

type Status =
  | { kind: "idle" }
  | { kind: "checking"; progress: ProgressState | null }
  | { kind: "error"; message: string }
  | { kind: "done"; analysis: Analysis }

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <Main />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}

function Main() {
  const [file, setFile] = useState<File | null>(null)
  const [versions, setVersions] = useState<GameVersion[] | null>(null)
  const [includePrereleases, setIncludePrereleases] = useState(false)
  const [targetMc, setTargetMc] = useState("")
  const [loader, setLoader] = useState<Loader>("fabric")
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    fetchGameVersions()
      .catch((e) => {
        console.warn("Falling back to a static version list:", e)
        return FALLBACK_GAME_VERSIONS
      })
      .then((v) => {
        setVersions(v)
        setTargetMc((cur) => cur || defaultTargetVersion(v))
      })
  }, [])

  useAutoCheckMissingItems(() => setSheetOpen(true))

  const packName = status.kind === "done" ? status.analysis.packName : null
  useEffect(() => {
    document.title = packName ? `${packName} | ${BASE_TITLE}` : BASE_TITLE
  }, [packName])

  const checking = status.kind === "checking"
  const visibleVersions = useMemo(
    () => versions?.filter((v) => includePrereleases || v.type === "release" || v.version === targetMc),
    [versions, includePrereleases, targetMc],
  )

  async function runCheck() {
    if (!file || !targetMc) return
    setStatus({ kind: "checking", progress: null })
    try {
      const analysis = await analyzePack(file, targetMc, loader, (progress) => setStatus({ kind: "checking", progress }))
      setStatus({ kind: "done", analysis })
    } catch (e) {
      console.error(e)
      const message =
        e instanceof PackError ? e.message
        : e instanceof Error ? `Something went wrong: ${e.message}`
        : "Something went wrong."
      setStatus({ kind: "error", message })
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex items-center justify-between gap-4">
        <a href="./" className="text-sm font-medium tracking-tight">
          mrpack updater
        </a>
        <nav className="flex items-center gap-1" aria-label="Tools">
          <MissingItemsSheet open={sheetOpen} onOpenChange={setSheetOpen} />
          <HelpDialog />
          <ThemeMenu />
        </nav>
      </header>

      <main className="mt-14 flex-1 space-y-8">
        <div className="max-w-xl space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Move a Modrinth pack to a new Minecraft version.
          </h1>
          <p className="text-muted-foreground text-pretty">
            See which mods already have a build for the version you want, then download an updated .mrpack. Everything runs in your
            browser.
          </p>
        </div>

        <PackDropzone
          file={file}
          disabled={checking}
          onFile={(f) => {
            setFile(f)
            setStatus({ kind: "idle" })
          }}
        />

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Target version">
            <VersionSelect
              versions={visibleVersions}
              value={targetMc}
              onChange={setTargetMc}
              disabled={!versions || checking}
            />
          </Field>
          <Field label="Loader">
            <NativeSelect className="w-32" aria-label="Mod loader" value={loader} onChange={(e) => setLoader(e.target.value as Loader)} disabled={checking}>
              {LOADERS.map((l) => (
                <NativeSelectOption key={l} value={l}>
                  {l}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Button onClick={runCheck} disabled={!file || !targetMc || checking} className="min-w-24">
            {checking ? <Loader2Icon className="animate-spin" /> : "Check"}
          </Button>
          <label className="flex h-8 items-center gap-2 text-sm text-muted-foreground sm:ml-auto">
            <Switch checked={includePrereleases} onCheckedChange={setIncludePrereleases} disabled={checking} />
            Include pre-releases
          </label>
        </div>

        {status.kind === "checking" && status.progress && (
          <section aria-live="polite" className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span>{status.progress.phase}</span>
              <span className="text-muted-foreground">{status.progress.detail}</span>
            </div>
            <Progress value={Math.round(status.progress.fraction * 100)} />
          </section>
        )}

        {status.kind === "error" && (
          <p role="alert" className="text-sm text-destructive">
            {status.message}
          </p>
        )}

        {status.kind === "done" && file && <Results file={file} analysis={status.analysis} />}
      </main>

      <footer className="mt-16 text-xs text-muted-foreground">
        Not affiliated with Modrinth or Mojang.{" "}
        <a href="https://github.com/YoshiroMaximus/mrpack-updater" className="underline-offset-4 hover:underline">
          Source on GitHub
        </a>
        .
      </footer>
    </div>
  )
}

/** Native select: hundreds of versions render instantly and the browser handles type-to-jump. */
const VersionSelect = memo(function VersionSelect({
  versions,
  value,
  onChange,
  disabled,
}: {
  versions: GameVersion[] | undefined
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <NativeSelect className="w-32" aria-label="Target Minecraft version" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {!versions && <NativeSelectOption value="">Loading…</NativeSelectOption>}
      {versions?.map((v) => (
        <NativeSelectOption key={v.version} value={v.version}>
          {v.version}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
})

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

type Filter = "all" | "updates" | "missing"

type BuildState = { kind: "idle" } | { kind: "building"; progress: ProgressState | null } | { kind: "done"; result: BuildResult; url: string }

function Results({ file, analysis }: { file: File; analysis: Analysis }) {
  const { rows, targetMc, packMc, loader, packName } = analysis
  const available = rows.filter((r) => r.target_available)
  const missing = rows.filter((r) => !r.target_available)
  const updates = available.filter((r) => r.has_update)
  const unchanged = available.length - updates.length
  const missingLabel = `${missing.length} missing ${missing.length === 1 ? "item" : "items"}`

  const [filter, setFilter] = useState<Filter>("all")
  const [chosenTab, setChosenTab] = useState<Category | null>(null)
  const [build, setBuild] = useState<BuildState>({ kind: "idle" })
  const [remembered, setRemembered] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    if (build.kind !== "done") return
    const { url } = build
    return () => URL.revokeObjectURL(url)
  }, [build])

  const visible = filter === "missing" ? missing : filter === "updates" ? updates : rows
  const groups = CATEGORIES.map((c) => ({ category: c, rows: visible.filter((r) => r.category === c) })).filter((g) => g.rows.length)
  const tab = groups.some((g) => g.category === chosenTab) ? chosenTab! : groups[0]?.category

  async function runBuild() {
    setBuild({ kind: "building", progress: null })
    try {
      const result = await buildPack(file, analysis, (progress) => setBuild({ kind: "building", progress }))
      setBuild({ kind: "done", result, url: URL.createObjectURL(result.blob) })
    } catch (e) {
      console.error(e)
      setBuild({ kind: "idle" })
      toast.error("Build failed", { description: e instanceof Error ? e.message : String(e) })
    }
  }

  function remember() {
    const s = rememberMissing(missing, targetMc, packName)
    setRemembered(true)
    const parts = []
    if (s.added) parts.push(`${s.added} new`)
    if (s.updated) parts.push(`${s.updated} already tracked from another pack`)
    toast.success(s.added || s.updated ? `Remembering ${missingLabel}` : "These items were already remembered", {
      description: parts.length ? parts.join(", ") : undefined,
    })
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {available.length} of {rows.length} have a {targetMc} build
          </h2>
          <p className="text-sm text-muted-foreground">
            {packName} is on {packMc} with {loader}.
          </p>
        </div>
        {available.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {updates.length} {updates.length === 1 ? "has" : "have"} a newer build to pull in
            {unchanged > 0 && <>, {unchanged} {unchanged === 1 ? "is" : "are"} already on the {targetMc} build in your pack</>}.
          </p>
        )}
        <div className="flex h-2 gap-px overflow-hidden rounded-full" aria-hidden>
          {[...available, ...missing].map((r) => (
            <span key={r.project_id} title={r.name} className={r.target_available ? "flex-1 bg-success" : "flex-1 bg-destructive/50"} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {build.kind === "done" ? (
          <Button asChild>
            <a href={build.url} download={build.result.fileName}>
              <DownloadIcon data-icon="inline-start" />
              Download {build.result.fileName}
            </a>
          </Button>
        ) : (
          <Button onClick={runBuild} disabled={build.kind === "building" || available.length === 0}>
            {build.kind === "building" ? (
              <>
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
                {build.progress?.phase ?? "Building"}
              </>
            ) : (
              "Build updated .mrpack"
            )}
          </Button>
        )}
        {missing.length > 0 && (
          <Button variant="outline" onClick={remember} disabled={remembered}>
            {remembered ? "Remembered" : `Remember ${missingLabel}`}
          </Button>
        )}
      </div>

      {build.kind === "done" && (
        <p className="text-sm text-muted-foreground">
          Includes every project with a Modrinth build for {targetMc} plus your overrides. {build.result.loaderNote}
          {build.result.skipped.length > 0 && (
            <> Left out because the file is not on Modrinth: {build.result.skipped.map((r) => r.name).join(", ")}.</>
          )}
        </p>
      )}

      <Tabs value={tab} onValueChange={(v) => setChosenTab(v as Category)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList variant="line">
            {groups.map((g) => (
              <TabsTrigger key={g.category} value={g.category}>
                {CATEGORY[g.category].label}
                <span className="text-muted-foreground tabular-nums">{g.rows.length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {rows.length > 1 && (
            <div className="flex gap-1" role="group" aria-label="Filter results">
              {(
                [
                  ["all", "All", rows.length],
                  ["updates", "Updates", updates.length],
                  ["missing", "Missing", missing.length],
                ] as const
              ).map(([key, label, count]) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className="text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
                >
                  {label}
                  <span className="tabular-nums opacity-70">{count}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
        {groups.map((g) => (
          <TabsContent key={g.category} value={g.category} className="mt-4">
            <ResultsTable rows={g.rows} targetMc={targetMc} packLoader={loader} />
          </TabsContent>
        ))}
        {groups.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">{filter === "updates" ? "Nothing has a newer build." : "Everything has a build."}</p>
        )}
      </Tabs>

      <details className="text-sm" onToggle={(e) => setShowRaw(e.currentTarget.open)}>
        <summary className="cursor-pointer text-muted-foreground select-none">Raw results</summary>
        {showRaw && <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(rows, null, 2)}</pre>}
      </details>
    </section>
  )
}
