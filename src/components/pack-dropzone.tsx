import { useId, useRef, useState, type DragEvent } from "react"
import { FileArchiveIcon, UploadIcon } from "lucide-react"
import { cn } from "cn"

interface Props {
  file: File | null
  onFile: (file: File) => void
  disabled?: boolean
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PackDropzone({ file, onFile, disabled }: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [rejected, setRejected] = useState(false)

  function accept(f: File | undefined) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith(".mrpack")) {
      setRejected(true)
      return
    }
    setRejected(false)
    onFile(f)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    if (disabled) return
    accept(e.dataTransfer.files?.[0])
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
          "has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
          over ? "border-foreground bg-muted" : "border-border hover:border-foreground/40 hover:bg-muted/40",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".mrpack"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            accept(e.target.files?.[0])
            e.target.value = ""
          }}
        />
        {file ? (
          <>
            <FileArchiveIcon className="size-6 text-foreground" aria-hidden />
            <div className="text-base font-medium">{file.name}</div>
            <div className="text-sm text-muted-foreground">
              {formatSize(file.size)}. Drop another file to replace it.
            </div>
          </>
        ) : (
          <>
            <UploadIcon className="size-6 text-muted-foreground" aria-hidden />
            <div className="text-base font-medium">Drop a .mrpack here</div>
            <div className="text-sm text-muted-foreground">or click to choose one from your computer</div>
          </>
        )}
      </label>
      {rejected && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          That is not a .mrpack file. Export your pack from Modrinth or your launcher first.
        </p>
      )}
    </div>
  )
}
