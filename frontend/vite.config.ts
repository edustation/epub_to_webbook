import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/books': 'http://localhost:8002',
      '/image/': 'http://localhost:8002',
      '/auth/': 'http://localhost:8002',
      '/upload': 'http://localhost:8002',
      '/activity': 'http://localhost:8002',
      '/store': 'http://localhost:8002',
      '/admin': 'http://localhost:8002',
      '/notices': 'http://localhost:8002',
      '/reviews': 'http://localhost:8002',
      '/chatbot': 'http://localhost:8002',
      '/ai': 'http://localhost:8002',
    }
  }
})
