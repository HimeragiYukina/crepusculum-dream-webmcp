import { defineConfig } from 'vite';

export default defineConfig({
  base: '/crepusculum-dream-webmcp/',
  server: { port: 5173 },
  optimizeDeps: { noDiscovery: true, include: [] },
  build: { target: 'chrome149' },
});
