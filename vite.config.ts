import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true
  }
});
