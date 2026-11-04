import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 相対パスで出力し、GitHub Pages 等どのサブパスでも配信できるようにする
export default defineConfig({
  base: "./",
  plugins: [react()],
});
