import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build de la version solo : un seul bundle JS + CSS, ensuite intégrés dans
// une page HTML unique par scripts/build-solo.mjs.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-solo',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: { input: 'solo.html' },
  },
});
