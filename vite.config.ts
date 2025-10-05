import { defineConfig } from 'vite';
import { resolve } from 'path';
import arraybuffer from "vite-plugin-arraybuffer";
import svgLoader from "vite-svg-loader";

export default defineConfig({
  plugins: [arraybuffer(), svgLoader({ defaultImport: 'url' })],
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
