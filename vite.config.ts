import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Debuggability only - doesn't affect what ships to the browser at runtime.
    sourcemap: true,
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      // Keeps the Clinch API same-origin, so its session cookie works without CORS.
      "/api": { target: "http://127.0.0.1:8013", xfwd: true },
    },
    watch: {
      // red-team01/sentinelpay is a Python backend, not part of the app - its scripts
      // rewrite CSV logs on every request, which Vite otherwise can't HMR and falls
      // back to full page reload for, wiping in-progress UI state (e.g. Red Team ->
      // Blue Team sync results) seconds after they land.
      //
      // Fraudshield-back is also a Python backend (several nested .venv's, a dataset
      // folder, three sub-repos) - ~75k files that aren't part of the Vite app. Without
      // this, chokidar tries to set up a watch handle on every one of them on startup,
      // which on Windows saturates the dev server badly enough that it stops answering
      // requests after the first one or two.
      ignored: ["**/red-team01/**", "**/Fraudshield-back/**", "**/clinch-api/**"],
    },
  },
})
