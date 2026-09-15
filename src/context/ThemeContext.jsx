import { createContext, useContext, useState, useEffect } from 'react';

// Contexto global para la gestión del tema visual (oscuro / claro)
const ThemeContext = createContext();

/**
 * Proveedor del tema visual:
 * - Lee la preferencia guardada en localStorage o utiliza 'dark' por defecto.
 * - Sincroniza la clase 'dark' o 'light' en la etiqueta raíz <html> para Tailwind.
 * - Persiste cualquier cambio en el almacenamiento local del navegador.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('gamebox_theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('gamebox_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Alterna entre modo oscuro y modo claro
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook personalizado para consumir el tema y su función conmutadora.
 * Incluye valor de reserva (fallback) por si se invoca fuera del ThemeProvider.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: 'dark', toggleTheme: () => {} };
  }
  return context;
}

