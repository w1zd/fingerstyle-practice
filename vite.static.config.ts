// Builds the static single-page version (no server, no sign-in) into dist-static/.
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: `${root}static`,
  base: './',
  publicDir: `${root}public`,
  plugins: [react()],
  resolve: { alias: { '@': root.replace(/\/$/, '') } },
  build: { outDir: `${root}dist-static`, emptyOutDir: true },
});
