import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: { rollupOptions: { output: { manualChunks(id) {
    const bank = id.match(/\/banks\/(interval|chord|mode|rhythm|notation)\.json$/)
    if (bank) return `questions-${bank[1]}`
    if (id.endsWith('/imported-bank.json')) return 'questions-legacy'
  } } } },
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3000' } }
})
