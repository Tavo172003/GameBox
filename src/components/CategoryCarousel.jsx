import { useRef, useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext.jsx";

// Lista de filtros predefinidos organizados por tipo: por defecto (populares), por ordenación y por género
const CATEGORIES = [
  {
    id: "popular",
    label: "Populares",
    icon: "local_fire_department",
    type: "default",
  },
  {
    id: "top_rated",
    label: "Mejor Valorados",
    icon: "military_tech",
    type: "order",
    value: "-metacritic",
  },
  {
    id: "recent",
    label: "Novedades",
    icon: "rocket_launch",
    type: "order",
    value: "-released",
  },
  {
    id: "Action",
    label: "Acción",
    icon: "swords",
    type: "genre",
    value: "Action",
  },
  {
    id: "RPG",
    label: "RPG / Rol",
    icon: "magic_button",
    type: "genre",
    value: "RPG",
  },
  {
    id: "Shooter",
    label: "Shooters",
    icon: "adjust",
    type: "genre",
    value: "Shooter",
  },
  {
    id: "Adventure",
    label: "Aventura",
    icon: "explore",
    type: "genre",
    value: "Adventure",
  },
  {
    id: "Strategy",
    label: "Estrategia",
    icon: "psychology",
    type: "genre",
    value: "Strategy",
  },
  {
    id: "Racing",
    label: "Carreras",
    icon: "sports_motorsports",
    type: "genre",
    value: "Racing",
  },
  {
    id: "Sports",
    label: "Deportes",
    icon: "sports_soccer",
    type: "genre",
    value: "Sports",
  },
  {
    id: "Fighting",
    label: "Lucha",
    icon: "sports_mma",
    type: "genre",
    value: "Fighting",
  },
  {
    id: "Indie",
    label: "Indie",
    icon: "lightbulb",
    type: "genre",
    value: "Indie",
  },
  {
    id: "Simulation",
    label: "Simulación",
    icon: "flight",
    type: "genre",
    value: "Simulation",
  },
  {
    id: "Puzzle",
    label: "Puzles",
    icon: "extension",
    type: "genre",
    value: "Puzzle",
  },
  {
    id: "Arcade",
    label: "Arcade",
    icon: "videogame_asset",
    type: "genre",
    value: "Arcade",
  },
];

/**
 * Carrusel interactivo de categorías y filtros:
 * - Permite desplazamiento horizontal fluido mediante botones, arrastre táctil o rueda del ratón.
 * - Deshabilita de forma inteligente los botones de desplazamiento según la posición del scroll.
 * - Sincroniza la activación del filtro activo y limpia filtros incompatibles.
 */
function CategoryCarousel({
  selectedGenre,
  setSelectedGenre,
  selectedOrder,
  setSelectedOrder,
  selectedPlatform,
  setSelectedPlatform,
  searchQuery,
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Calcula si el contenedor ha alcanzado los límites de desplazamiento izquierdo o derecho
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    // Convierte el scroll vertical de la rueda del ratón en desplazamiento horizontal
    const onWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY * 2,
          behavior: "smooth",
        });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Desplaza el carrusel en bloques de 300px con animación suave
  const handleScroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 300;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Maneja la alternancia y exclusividad de los filtros
  const handleSelect = (cat) => {
    if (cat.type === "default") {
      setSelectedGenre(null);
      setSelectedOrder(null);
      if (setSelectedPlatform) setSelectedPlatform(null);
    } else if (cat.type === "order") {
      if (setSelectedPlatform) setSelectedPlatform(null);
      setSelectedOrder(cat.value === selectedOrder ? null : cat.value);
    } else if (cat.type === "genre") {
      if (setSelectedPlatform) setSelectedPlatform(null);
      setSelectedGenre(cat.value === selectedGenre ? null : cat.value);
    }
  };

  return (
    <div className="flex items-center gap-2 w-full mb-5 select-none">
      {/* Botón de desplazamiento hacia la izquierda */}
      <button
        type="button"
        onClick={() => handleScroll("left")}
        disabled={!canScrollLeft}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
          isDark
            ? "bg-neutral-800 border border-white/10 text-white hover:bg-neutral-700 disabled:opacity-30"
            : "bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 disabled:opacity-30"
        }`}
        aria-label="Desplazar a la izquierda"
      >
        <span className="material-symbols-outlined text-lg leading-none">
          chevron_left
        </span>
      </button>

      {/* Lista desplazable de botones de categoría */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center overflow-x-auto px-2 py-2 space-x-2 scroll-smooth no-scrollbar"
      >
        {CATEGORIES.map((cat) => {
          let isActive = false;
          if (cat.type === "default") {
            isActive =
              !selectedGenre &&
              !selectedOrder &&
              !selectedPlatform &&
              !searchQuery;
          } else if (cat.type === "order") {
            isActive =
              selectedOrder === cat.value && !selectedPlatform && !searchQuery;
          } else if (cat.type === "genre") {
            isActive =
              selectedGenre === cat.value && !selectedPlatform && !searchQuery;
          }

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelect(cat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 flex-shrink-0 ${
                isActive
                  ? "bg-[#00e639] text-black font-bold shadow-[0_0_15px_rgba(0,230,57,0.35)] scale-105"
                  : isDark
                    ? "bg-neutral-900/70 text-neutral-300 border border-white/10 hover:border-white/25 hover:bg-neutral-800 hover:text-white"
                    : "bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 shadow-sm"
              }`}
            >
              <span className="material-symbols-outlined text-base leading-none">
                {cat.icon}
              </span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Botón de desplazamiento hacia la derecha */}
      <button
        type="button"
        onClick={() => handleScroll("right")}
        disabled={!canScrollRight}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
          isDark
            ? "bg-neutral-800 border border-white/10 text-white hover:bg-neutral-700 disabled:opacity-30"
            : "bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 disabled:opacity-30"
        }`}
        aria-label="Desplazar a la derecha"
      >
        <span className="material-symbols-outlined text-lg leading-none">
          chevron_right
        </span>
      </button>
    </div>
  );
}

export default CategoryCarousel;

