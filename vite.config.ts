import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// waterfall1889.github.io 是用户主页仓库，部署在域名根路径下
export default defineConfig({
  plugins: [react()],
  base: '/',
})
