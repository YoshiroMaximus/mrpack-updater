# Modrinth Pack Version Updater

Move a Modrinth modpack (`.mrpack`) to a different Minecraft version. Drop in a pack, pick a target version and loader, see which mods already have a compatible build, and download an updated `.mrpack`. Everything runs in your browser.

Hosted version of the original project: <https://kristc.github.io/mrpack-updater/>

## Features

- Checks every mod, resource pack, shader and datapack in the pack against Modrinth for the target version
- Supports Fabric, Quilt, Forge and NeoForge
- Builds an updated `.mrpack` with the compatible versions, keeps your `overrides/`, and bumps Fabric Loader to the recommended release
- Falls back to GitHub releases for Fabric Carpet when Modrinth has no build (shown in the results, not written into the pack)
- Remembers projects that had no build and re-checks them each time you open the page
- Light, dark and system themes

## How it works

1. Drop a `.mrpack` file.
2. Pick the target Minecraft version and loader.
3. Check. File hashes from the pack are sent to Modrinth to identify the projects, then each project is looked up for the target version.
4. Review the results, grouped by type, with a filter for missing items.
5. Build and download the updated pack. Optionally remember the missing items.

Only file hashes and version queries are sent to Modrinth. The pack itself never leaves your device.

## Development

Built with Vite, React, TypeScript, Tailwind CSS and [shadcn/ui](https://ui.shadcn.com).

```bash
npm install
npm run dev        # http://localhost:5173/mrpack-updater/
npm run build      # production build in dist/
npm run typecheck
```

The Vite `base` defaults to `/mrpack-updater/` for GitHub project pages. Set `VITE_BASE=/` to build for a domain root.

### Structure

```
index.html                  SEO metadata and app shell
public/                     favicons, manifest, robots, sitemap
src/
  App.tsx                   check → results → build flow
  components/               UI (dropzone, results table, missing-items sheet, help, theme)
  components/ui/            shadcn/ui primitives
  hooks/                    theme and missing-items state
  lib/modrinth.ts           Modrinth and Fabric Meta API calls
  lib/carpet.ts             GitHub release matching for Fabric Carpet
  lib/mrpack.ts             pack analysis and .mrpack building
  lib/missing-items.ts      localStorage store for remembered items
```

To add a shadcn component: `npx shadcn@latest add <name>`.

## Deployment

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. In the repository settings, set Pages to deploy from GitHub Actions.

## API dependencies

- Modrinth API v2 for project and version data
- Fabric Meta for the recommended loader version
- GitHub API for Fabric Carpet releases

## Limitations

- Modrinth `.mrpack` files only
- Mod dependencies are not resolved
- Large packs may hit Modrinth rate limits

## License

MIT. See [LICENSE](LICENSE). JSZip is used under its MIT license.

Not affiliated with Modrinth or Mojang.
