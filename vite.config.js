import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, open: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react")) return "react";
            if (id.includes("recharts") || id.includes("d3")) return "charts";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("xlsx")) return "xlsx";
            if (id.includes("pptxgenjs")) return "pptx";
          }
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
