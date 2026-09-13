import type { Analysis } from "./mrpack"
import { compareByName } from "./versions"

/** Markdown release notes for the pack once it is moved to the target version. */
export function buildChangelog({ packName, targetMc, index, rows }: Analysis): string {
  const packVersion = typeof index.versionId === "string" && index.versionId ? index.versionId : null
  const updated = rows.filter((r) => r.target_available && r.has_update).sort(compareByName)
  const missing = rows.filter((r) => !r.target_available).sort(compareByName)

  const lines = [`## ${packName} Updated ${packVersion ?? targetMc}`, ""]

  if (updated.length) {
    lines.push("### Updated", ...updated.map((r) => `- ${r.name}`), "")
  }

  if (missing.length) {
    lines.push(`### Not yet available for ${targetMc}`, ...missing.map((r) => `- ${r.name}`), "")
  }

  lines.push(
    "### Improvements",
    `- Updated core dependencies for Minecraft ${targetMc}`,
    "- Improved compatibility and performance",
    "- Updated various supporting libraries to their latest releases",
  )

  return lines.join("\n")
}
