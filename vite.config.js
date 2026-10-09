import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // rutas relativas: el build funciona igual en la raíz de un dominio o bajo una subruta de nginx
  base: './',
})
