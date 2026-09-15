import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import './index.css'
import App from './App.jsx'

// Punto de entrada de la aplicación:
// - StrictMode: ayuda a detectar efectos secundarios y prácticas obsoletas durante el desarrollo.
// - BrowserRouter: habilita el enrutamiento del lado del cliente mediante la API History del navegador.
// - ThemeProvider: provee el contexto global de tema (modo oscuro/claro) a todos los componentes.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
