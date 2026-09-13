import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// GitHub Pages serves project sites from /<repo>/. Override with VITE_BASE=/ for root hosting.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/mrpack-updater/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
})
