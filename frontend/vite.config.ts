import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    // Proxy API requests to backend in development
    proxy: {
      '/api': {
        target: 'https://codepilot-owya.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
