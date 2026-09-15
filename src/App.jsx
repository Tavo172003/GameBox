import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useSearchParams } from 'react-router-dom';
import './App.css';
import './index.css';
import Header from './components/Header.jsx';
import GameCard from './components/GameCard.jsx';
import Description from './components/Description.jsx';
import CategoryCarousel from './components/CategoryCarousel.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import { safeEncodeParam } from './utils/security.js';

// Mapeo de nombres de plataformas a los IDs de 'parent_platforms' requeridos por la API de RAWG
const platformIds = {
  PlayStation: '2',
  Xbox: '3',
  PC: '1',
  Nintendo: '7',
  Mobile: '4,8'
};

// Mapeo de nombres de géneros a los slugs oficiales de la API de RAWG
const genreSlugs = {
  Action: 'action',
  RPG: 'role-playing-games-rpg',
  Shooter: 'shooter',
  Strategy: 'strategy',
  Indie: 'indie',
  Adventure: 'adventure',
  Racing: 'racing',
  Sports: 'sports',
  Fighting: 'fighting',
  Simulation: 'simulation',
  Puzzle: 'puzzle',
  Arcade: 'arcade'
};

// Nombres legibles en español para los géneros en encabezados y títulos
const genreNamesSpanish = {
  Action: 'Acción',
  RPG: 'RPG',
  Shooter: 'Shooters',
  Strategy: 'Estrategia',
  Indie: 'Indie',
  Adventure: 'Aventura',
  Racing: 'Carreras',
  Sports: 'Deportes',
  Fighting: 'Lucha',
  Simulation: 'Simulación',
  Puzzle: 'Puzles',
  Arcade: 'Arcade'
};

/**
 * Vista principal (Catálogo de videojuegos):
 * Gestiona el filtrado reactivo mediante query params en la URL,
 * la carga paginada con scroll infinito y los estados de UI (esqueletos/error).
 */
function HomePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Sincronización de filtros con los search params de la URL para permitir compartir enlaces
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPlatform = searchParams.get('platform') || null;
  const selectedGenre = searchParams.get('genre') || null;
  const selectedOrder = searchParams.get('order') || null;
  const searchQuery = searchParams.get('search') || '';

  // Modificadores de filtros que actualizan la URL de forma limpia y mutuamente consistente
  const setSelectedPlatform = useCallback((platform) => {
    setSearchParams(() => {
      const next = new URLSearchParams();
      if (platform) {
        next.set('platform', platform);
      }
      return next;
    });
  }, [setSearchParams]);

  const setSelectedGenre = useCallback((genre) => {
    setSearchParams(() => {
      const next = new URLSearchParams();
      if (genre) {
        next.set('genre', genre);
      }
      return next;
    });
  }, [setSearchParams]);

  const setSelectedOrder = useCallback((order) => {
    setSearchParams(() => {
      const next = new URLSearchParams();
      if (order) {
        next.set('order', order);
      }
      return next;
    });
  }, [setSearchParams]);

  const setSearchQuery = useCallback((query) => {
    setSearchParams(() => {
      const next = new URLSearchParams();
      if (query && query.trim()) {
        next.set('search', query.trim());
      }
      return next;
    });
  }, [setSearchParams]);

  // Estados para el catálogo de juegos y el control de paginación infinita
  const [games, setGames] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  // Referencias para el observador de scroll infinito y para abortar peticiones en vuelo
  const observerTarget = useRef(null);
  const loadMoreAbortRef = useRef(null);

  /**
   * Realiza la petición a la API de RAWG aplicando los filtros activos.
   * Utiliza AbortController para prevenir condiciones de carrera al cambiar filtros rápidamente.
   */
  const fetchGames = useCallback((targetPage = 1, isInitial = false) => {
    const controller = new AbortController();
    if (isInitial) {
      setPage(1);
      setHasMore(true);
      setLoading(true);
      setError(null);
    }

    const apiKey = import.meta.env.VITE_RAWG_API_KEY;
    let url = `https://api.rawg.io/api/games?key=${apiKey}&page_size=20&page=${targetPage}`;

    // Construcción dinámica de parámetros según la prioridad de filtros seleccionados
    if (selectedPlatform && platformIds[selectedPlatform]) {
      url += `&parent_platforms=${platformIds[selectedPlatform]}`;
    } else if (selectedGenre && genreSlugs[selectedGenre]) {
      url += `&genres=${genreSlugs[selectedGenre]}`;
    } else if (selectedOrder) {
      url += `&ordering=${selectedOrder}`;
    } else if (searchQuery) {
      url += `&search=${safeEncodeParam(searchQuery)}`;
    }

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar los juegos');
        return res.json();
      })
      .then((data) => {
        const results = data.results || [];
        if (isInitial) {
          setGames(results);
        } else {
          // Evita duplicados en caso de que la paginación de la API devuelva elementos solapados
          setGames((prev) => {
            const existingIds = new Set(prev.map((g) => g.id));
            const newGames = results.filter((g) => !existingIds.has(g.id));
            return [...prev, ...newGames];
          });
        }
        setHasMore(Boolean(data.next) && results.length > 0);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Error de conexión');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      });

    return controller;
  }, [selectedPlatform, selectedGenre, selectedOrder, searchQuery]);

  // Dispara la carga de la primera página cada vez que cambia algún filtro o término de búsqueda
  useEffect(() => {
    const controller = fetchGames(1, true);
    return () => {
      controller.abort();
    };
  }, [fetchGames]);

  // Carga la siguiente página de resultados (scroll infinito)
  const loadMoreGames = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;

    if (loadMoreAbortRef.current) {
      loadMoreAbortRef.current.abort();
    }
    const nextPage = page + 1;
    setLoadingMore(true);
    setPage(nextPage);

    loadMoreAbortRef.current = fetchGames(nextPage, false);
  }, [loading, loadingMore, hasMore, page, fetchGames]);

  // Observador de intersección: detecta cuando el usuario se acerca al final de la página (300px antes)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreGames();
        }
      },
      { rootMargin: '300px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMoreGames, hasMore, loading, loadingMore]);

  // Determina el título principal dinámico según el criterio de visualización actual
  const getTitle = () => {
    if (searchQuery) return `Resultados de "${searchQuery}"`;
    if (selectedGenre && genreNamesSpanish[selectedGenre]) return `Juegos de ${genreNamesSpanish[selectedGenre]}`;
    if (selectedOrder === '-metacritic') return 'Juegos Mejor Valorados';
    if (selectedOrder === '-released') return 'Novedades y Recientes';
    if (selectedPlatform) return `Juegos para ${selectedPlatform}`;
    return 'Juegos Populares';
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ease-out ${
      isDark
        ? 'bg-black text-[#c4c7c7] selection:bg-[#00e639]/30 selection:text-white'
        : 'bg-[#f4f5f8] text-neutral-800 selection:bg-[#00e639]/30 selection:text-black'
    }`}>
      {/* Barra de cabecera con buscador global y accesos directos */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedPlatform={selectedPlatform}
        setSelectedPlatform={setSelectedPlatform}
        selectedGenre={selectedGenre}
        setSelectedGenre={setSelectedGenre}
      />

      {/* Contenedor principal de contenidos */}
      <main className="w-full flex-1 min-h-[calc(100vh-80px)] pt-1 sm:pt-2 pb-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="w-full max-w-[1440px] mx-auto">
          
          {/* Encabezado descriptivo de la sección */}
          <div className={`mb-3 pb-2.5 border-b text-center transition-colors duration-200 ease-out ${isDark ? 'border-white/5' : 'border-neutral-200'}`}>
            <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight transition-colors duration-200 ease-out ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              {getTitle()}
            </h1>
            <p className={`text-xs sm:text-sm mt-1 font-medium transition-colors duration-200 ease-out ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Explora los mejores videojuegos filtrados por categoría, género y plataforma
            </p>
          </div>

          {/* Carrusel de categorías y ordenamientos rápidos */}
          <CategoryCarousel
            selectedGenre={selectedGenre}
            setSelectedGenre={setSelectedGenre}
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            searchQuery={searchQuery}
          />

          {/* Estado de carga inicial: Muestra tarjetas esqueleto (Skeleton cards) */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6 justify-center">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`animate-pulse rounded-xl overflow-hidden border h-[340px] flex flex-col ${
                    isDark ? 'bg-neutral-900/40 border-white/5' : 'bg-white border-neutral-200 shadow-sm'
                  }`}
                >
                  <div className={`h-48 w-full ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className={`h-4 rounded w-3/4 mb-3 ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
                      <div className={`h-3 rounded w-1/2 ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
                    </div>
                    <div className={`h-6 rounded w-1/3 mt-4 ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Estado de error con botón de reintento */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>Error de conexión</h3>
              <p className={`text-sm max-w-md mb-4 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>{error}</p>
              <button
                onClick={() => fetchGames(1, true)}
                className="px-4 py-2 bg-[#00e639]/20 hover:bg-[#00e639]/30 text-emerald-700 dark:text-[#00e639] border border-[#00e639]/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : (
            /* Cuadrícula de videojuegos obtenidos */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6 justify-center">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>

              {/* Indicador de carga para la paginación infinita */}
              {loadingMore && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6 mt-6 justify-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={`more-skeleton-${i}`}
                      className={`animate-pulse rounded-xl overflow-hidden border h-[340px] flex flex-col ${
                        isDark ? 'bg-neutral-900/40 border-white/5' : 'bg-white border-neutral-200 shadow-sm'
                      }`}
                    >
                      <div className={`h-48 w-full ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className={`h-4 rounded w-3/4 mb-3 ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
                          <div className={`h-3 rounded w-1/2 ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
                        </div>
                        <div className={`h-6 rounded w-1/3 mt-4 ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

                {/* Centinela observado por IntersectionObserver al final del listado */}
                <div ref={observerTarget} className="h-10 w-full flex items-center justify-center my-6">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-sm text-[#00e639] font-semibold">
                      <div className="w-4 h-4 border-2 border-[#00e639] border-t-transparent rounded-full animate-spin"></div>
                      Cargando más juegos...
                    </div>
                  )}
                  {!hasMore && games.length > 0 && (
                    <p className={`text-xs font-semibold text-center ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      Has llegado al final de los resultados
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
    </div>
  );
}

/**
 * Componente raíz de enrutamiento:
 * Define las rutas principales del catálogo general y la vista de detalle.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game/:id" element={<Description />} />
    </Routes>
  );
}

export default App;