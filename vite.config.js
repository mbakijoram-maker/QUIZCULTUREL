import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND = `http://localhost:${process.env.PORT || 3001}`;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // accessible depuis les téléphones du réseau local
    port: 5173,
    proxy: {
      '/socket.io': { target: BACKEND, ws: true },
      '/api': BACKEND,
    },
  },
  build: { outDir: 'dist' },
});
