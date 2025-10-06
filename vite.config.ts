import {defineConfig} from 'vite';
import {resolve} from 'path';
import arraybuffer from "vite-plugin-arraybuffer";
import svgLoader from "vite-svg-loader";
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
    plugins: [arraybuffer(), svgLoader({defaultImport: 'url'}), viteCompression()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    },
    build: {
        target: 'esnext',
        minify: 'esbuild',
        sourcemap: true,
    },
    server: {
        port: 3000,
        open: true
    }
});
