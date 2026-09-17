import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site: set VITE_BASE=/repo-name/ when building for Pages.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
});
