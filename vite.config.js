import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Configuración del empaquetador Vite
// Integra el plugin oficial de React (Fast Refresh) y la integración de Tailwind CSS v4
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})

