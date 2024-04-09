import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [dts({ rollupTypes: true })],
    
  build: { 
    sourcemap: true,
    lib: { 
        entry: resolve(__dirname, 'src/main.ts'), 
        formats: ["es"],
        fileName: (format) => `index.${format}.js`,
    } 
  },
  resolve: { alias: { src: resolve('src/') } },
})