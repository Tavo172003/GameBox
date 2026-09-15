import { useState, useEffect, useRef, useCallback } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import Sidebar from "./Sidebar.jsx";

// Iconos vectoriales de plataformas para la lista de sugerencias del autocompletado
const platformIcons = {
  playstation: "/SVG/Plataformas/Playstation.svg",
  xbox: "/SVG/Plataformas/XBOX.svg",
  pc: "/SVG/Plataformas/Windows.svg",
  nintendo: "/SVG/Plataformas/Switch.svg",
  android: "/SVG/Plataformas/Mobile.svg",
  ios: "/SVG/Plataformas/Mobile.svg",
};

/**
 * Cabecera principal (Header):
 * - Buscador central con autocompletado reactivo, debounce (300ms) y aborto de peticiones.
 * - Navegación accesible por teclado (flechas Arriba/Abajo, Enter y Escape).
 * - Botón de alternancia de tema (ThemeContext) y apertura del cajón de filtros (Sidebar).
 */
function Header({
  searchQuery = "",
  setSearchQuery,
  selectedPlatform,
  setSelectedPlatform,
  selectedGenre,
  setSelectedGenre,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [showSidebar, setShowSidebar] = useState(false);

  const urlQuery = searchParams.get("search") || "";

  // Estado del texto escrito actualmente en el input de búsqueda
  const [inputValue, setInputValue] = useState(searchQuery || urlQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Referencias para la gestión de eventos, temporizador de debounce y abortos
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);
  const abortControllerRef = useRef(null);
  const isCommittedRef = useRef(false);

  // Mantiene sincronizado el valor del input al cambiar de ruta o parámetros de URL
  useEffect(() => {
    if (location.pathname === "/") {
      setInputValue(searchQuery || urlQuery);
    }
    // Cierra el sidebar al navegar a cualquier ruta (ej. al abrir un juego)
    setShowSidebar(false);
  }, [searchQuery, urlQuery, location.pathname]);

  /**
   * Obtiene sugerencias rápidas de la API de RAWG para el desplegable.
   * No altera la cuadrícula principal de la página.
   */
  const fetchSuggestions = useCallback(async (query) => {
    const trimmed = query.trim();
    if (!trimmed || isCommittedRef.current) {
      setSuggestions([]);
      setTotalCount(0);
      setShowDropdown(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoadingSuggestions(true);
      const apiKey = import.meta.env.VITE_RAWG_API_KEY;
      const url = `https://api.rawg.io/api/games?key=${apiKey}&page_size=8&search=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return;
      const data = await res.json();

      if (!controller.signal.aborted && !isCommittedRef.current) {
        setSuggestions(data.results || []);
        setTotalCount(data.count || 0);
        setShowDropdown(true);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        // Ignora silenciosamente errores de red en sugerencias
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoadingSuggestions(false);
      }
    }
  }, []);

  // Maneja la entrada de texto aplicando un debounce de 300ms
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    isCommittedRef.current = false;

    clearTimeout(debounceTimer.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!val.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  // Confirma la búsqueda: redirige o actualiza los parámetros URL de la vista principal
  const commitSearch = (value) => {
    const trimmed = value.trim();
    isCommittedRef.current = true;
    clearTimeout(debounceTimer.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setShowDropdown(false);
    setLoadingSuggestions(false);
    inputRef.current?.blur();

    if (location.pathname === "/") {
      if (setSearchQuery) setSearchQuery(trimmed);
      navigate(trimmed ? `/?search=${encodeURIComponent(trimmed)}` : "/", {
        replace: true,
      });
    } else {
      navigate(trimmed ? `/?search=${encodeURIComponent(trimmed)}` : "/");
    }
  };

  // Selecciona un juego específico del desplegable y navega directamente a su detalle
  const handleSelectGame = (game) => {
    isCommittedRef.current = true;
    clearTimeout(debounceTimer.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setShowDropdown(false);
    setShowSidebar(false);
    setInputValue("");
    navigate(`/game/${game.id}`);
  };

  // Navegación accesible por teclado dentro del desplegable
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectGame(suggestions[highlightedIndex]);
      } else {
        commitSearch(inputValue);
      }
    }
    if (e.key === "Escape") {
      clearTimeout(debounceTimer.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
        setShowDropdown(true);
      }
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setHighlightedIndex((prev) =>
          prev <= 0 ? suggestions.length - 1 : prev - 1,
        );
        setShowDropdown(true);
      }
    }
  };

  // Limpia el término de búsqueda actual y reenfoca el campo de texto
  const handleClear = () => {
    isCommittedRef.current = false;
    clearTimeout(debounceTimer.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setInputValue("");
    if (location.pathname === "/" && setSearchQuery) {
      setSearchQuery("");
      navigate("/", { replace: true });
    }
    setSuggestions([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Cierra el menú desplegable al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="w-full sticky top-0 z-40 bg-transparent">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20 gap-2 sm:gap-4">
          {/* Logotipo y enlace a la página principal */}
          <div className="flex items-center flex-shrink-0 z-10">
            <Link
              to="/"
              className="flex-shrink-0 flex items-center gap-2 group"
            >
              <img
                src="/SVG/HeaderIcon/Logo.svg"
                alt="GameBox Logo"
                className={`w-8 h-8 object-contain transition-transform group-hover:scale-105 ${
                  isDark
                    ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                    : "brightness-0"
                }`}
              />
              <span
                className={`font-black italic text-2xl tracking-wider transition-colors duration-200 ease-out hidden sm:inline ${
                  isDark
                    ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                    : "text-neutral-900"
                }`}
              >
                GameBox
              </span>
            </Link>
          </div>

          {/* Barra de búsqueda central con autocompletado interactivo */}
          <div
            className="flex-1 max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-2 sm:mx-6 relative"
            ref={containerRef}
          >
            <div className="relative group w-full">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (
                    !isCommittedRef.current &&
                    inputValue.trim() &&
                    suggestions.length > 0
                  ) {
                    setShowDropdown(true);
                  }
                }}
                className={`w-full rounded-full py-3 pl-6 pr-14 text-sm sm:text-base transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[#00e639]/40 ${
                  isDark
                    ? "bg-[#0A0A0A] border border-white/10 text-[#e2e2e2] placeholder:text-gray-500 focus:border-[#00e639] focus:shadow-[inset_0_0_8px_rgba(0,230,57,0.3)] shadow-md"
                    : "bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-[#00e639] focus:shadow-[0_0_12px_rgba(0,230,57,0.2)] shadow-sm"
                }`}
                placeholder="Buscar juegos..."
              />
              {/* Botón para limpiar el texto introducido */}
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={`absolute right-12 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${
                    isDark
                      ? "text-gray-400 hover:text-white"
                      : "text-neutral-400 hover:text-neutral-700"
                  }`}
                  aria-label="Limpiar búsqueda"
                >
                  <span className="material-symbols-outlined text-lg">
                    close
                  </span>
                </button>
              )}
              {/* Botón de envío de búsqueda */}
              <button
                type="button"
                onClick={() => commitSearch(inputValue)}
                className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-xl transition-colors cursor-pointer ${
                  isDark
                    ? "text-gray-400 group-focus-within:text-[#00e639] hover:text-[#00e639]"
                    : "text-neutral-400 group-focus-within:text-[#00e639] hover:text-[#00e639]"
                }`}
                aria-label="Buscar"
              >
                search
              </button>
            </div>

            {/* Menú flotante de resultados sugeridos */}
            {showDropdown && (
              <div
                className={`absolute top-[calc(100%+10px)] left-0 right-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-50 border ${
                  isDark
                    ? "bg-[#0d0d0d] border-white/10 text-[#e2e2e2]"
                    : "bg-white border-neutral-200 text-neutral-800"
                }`}
              >
                {/* Cabecera del desplegable con conteo total de coincidencias */}
                <div
                  className={`px-4 py-3 border-b flex items-center justify-between ${
                    isDark ? "border-white/5" : "border-neutral-100"
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      isDark ? "text-white" : "text-neutral-900"
                    }`}
                  >
                    Juegos{" "}
                    <span className="text-[#00e639] font-black">
                      {totalCount.toLocaleString("es-ES")}
                    </span>
                  </span>
                  {loadingSuggestions && (
                    <div className="w-3 h-3 border-2 border-[#00e639] border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Lista interactiva de sugerencias */}
                <ul className="max-h-[420px] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {suggestions.map((game, idx) => {
                    const platforms = (game.parent_platforms || [])
                      .map((p) => p.platform.slug)
                      .filter((slug) => platformIcons[slug]);

                    const isHighlighted = highlightedIndex === idx;

                    return (
                      <li key={game.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectGame(game)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left group/item cursor-pointer ${
                            isDark ? "hover:bg-white/5" : "hover:bg-neutral-100"
                          } ${isHighlighted ? (isDark ? "bg-white/10" : "bg-neutral-200") : ""}`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ${
                              isDark ? "bg-neutral-800" : "bg-neutral-200"
                            }`}
                          >
                            {game.background_image ? (
                              <img
                                src={game.background_image}
                                alt={game.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className={`w-full h-full ${
                                  isDark ? "bg-neutral-700" : "bg-neutral-300"
                                }`}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {platforms.length > 0 && (
                              <div className="flex gap-1.5 mb-0.5">
                                {platforms.map((slug) => (
                                  <img
                                    key={slug}
                                    src={platformIcons[slug]}
                                    alt={slug}
                                    className={`w-3 h-3 object-contain ${
                                      isDark
                                        ? "opacity-50"
                                        : "brightness-0 opacity-75"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                            <span
                              className={`text-sm font-semibold truncate block transition-colors ${
                                isDark
                                  ? "text-[#e2e2e2] group-hover/item:text-white"
                                  : "text-neutral-800 group-hover/item:text-black"
                              }`}
                            >
                              {game.name}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Pie del desplegable: Recordatorio de atajo de teclado */}
                <div
                  className={`px-4 py-2.5 border-t flex items-center gap-2 ${
                    isDark
                      ? "border-white/5"
                      : "border-neutral-100 bg-neutral-50/50"
                  }`}
                >
                  <kbd
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                      isDark
                        ? "bg-white/10 text-neutral-400 border-white/10"
                        : "bg-neutral-200 text-neutral-600 border-neutral-300"
                    }`}
                  >
                    Enter
                  </kbd>
                  <span
                    className={`text-[11px] ${
                      isDark ? "text-neutral-500" : "text-neutral-500"
                    }`}
                  >
                    para buscar &quot;{inputValue}&quot; en todos los juegos
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Acciones del lado derecho: Conmutador de tema y botón de filtros */}
          <div className="flex items-center gap-1 flex-shrink-0 z-10">
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ease-out cursor-pointer active:scale-90 hover:scale-105 ${
                isDark
                  ? "hover:bg-white/10 text-yellow-400"
                  : "hover:bg-neutral-100 text-neutral-700"
              }`}
              aria-label="Cambiar tema"
              title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              <span className="material-symbols-outlined text-xl transition-transform duration-200 ease-out select-none">
                {isDark ? "light_mode" : "dark_mode"}
              </span>
            </button>

            {/* Botón para abrir el panel lateral de filtros (únicamente en la vista de catálogo) */}
            {location.pathname === "/" && (
              <button
                type="button"
                onClick={() => setShowSidebar((prev) => !prev)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 ease-in-out cursor-pointer ${
                  isDark
                    ? "hover:bg-white/10 text-white"
                    : "hover:bg-neutral-100 text-neutral-700"
                }`}
                aria-label="Abrir filtros"
                title="Filtros de plataforma y género"
              >
                <span className="material-symbols-outlined text-xl leading-none">
                  menu
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Cajón lateral de filtros (Sidebar): se mantiene montado condicionalmente con animación de salida */}
      {location.pathname === "/" && (
        <Sidebar
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          selectedPlatform={selectedPlatform}
          setSelectedPlatform={setSelectedPlatform}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
        />
      )}
    </>
  );
}

export default Header;
