/**
 * The tests read the application code with the same "@/" paths the application
 * uses, so a route can be exercised in a test without being rewritten for it.
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
