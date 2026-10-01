import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://guswnstjr125.github.io/claude/
// 폰에서 최신 버전인지 확인할 수 있게 빌드 시각(한국 시간)을 화면에 표시
const build = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(5, 16).replace('T', ' ')

export default defineConfig({
  plugins: [react()],
  define: { __BUILD__: JSON.stringify(build) },
  base: '/claude/',
})
