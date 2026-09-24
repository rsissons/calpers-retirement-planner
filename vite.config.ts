import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` makes a normal static site in dist/ (for hosting).
// `npm run build:single` (mode "single") makes one self-contained HTML file in release/
// that opens by double-click, with no server and no internet connection.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: mode === 'single' ? { outDir: 'release', emptyOutDir: true } : {},
  server: {
    // Windows can miss file-change events; polling keeps the dev server in step
    watch: { usePolling: true, interval: 300 },
  },
}))
