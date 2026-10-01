import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://guswnstjr125.github.io/claude/
export default defineConfig({
  plugins: [react()],
  base: '/claude/',
})
