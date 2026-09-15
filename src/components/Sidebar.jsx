import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";

// Iconos vectoriales locales de plataformas para el menú lateral
const platformIcons = {
  PlayStation: "/SVG/Plataformas/Playstation.svg",
  Xbox: "/SVG/Plataformas/XBOX.svg",
  PC: "/SVG/Plataformas/Windows.svg",
  Nintendo: "/SVG/Plataformas/Switch.svg",
  Mobile: "/SVG/Plataformas/Mobile.svg",
};

// Iconos vectoriales locales de géneros para el menú lateral
const genreIcons = {
  Action: "/SVG/Generos/Accion.svg",
  RPG: "/SVG/Generos/RPG.svg",
  Shooter: "/SVG/Generos/Shooter.svg",
  Strategy: "/SVG/Generos/Estrategia.svg",
  Indie: "/SVG/Generos/Indie.svg",
  Adventure: "/SVG/Generos/Aventura.svg",
};

/**
 * Panel lateral deslizante (Drawer) para filtros de plataforma y género:
 * - Implementa un ciclo de vida con doble requestAnimationFrame para transiciones CSS fluidas.
 * - Desmonta del DOM tras la animación de salida (300ms).
 * - Bloquea el scroll del body y escucha la tecla Escape mientras permanece abierto.
 */
function Sidebar({
  selectedPlatform,
  setSelectedPlatform,
  selectedGenre,
  setSelectedGenre,
  isOpen = false,
  onClose,
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Controla el montaje real en el DOM (retrasado para permitir animación de salida)
  const [isMounted, setIsMounted] = useState(isOpen);
  // Controla las clases CSS de transición (se activa un tick después del montaje)
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 1. Monta el nodo en el DOM
      setIsMounted(true);
      // 2. Doble requestAnimationFrame: asegura que el navegador pinte el estado inicial
      // fuera de pantalla (translate-x-full) antes de aplicar la clase visible (translate-x-0)
      let raf1, raf2;
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setIsVisible(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    } else {
      // Inicia animación de salida y desmonta tras 300ms
      setIsVisible(false);
      const timer = setTimeout(() => setIsMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Bloquea el desplazamiento del fondo y asocia el cierre a la tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  return (
    <>
      {/* Fondo oscurecido semitransparente con efecto de desenfoque */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Contenedor deslizante lateral (Drawer) */}
      <aside
        className={`fixed right-0 top-0 h-full w-80 max-w-[85vw] z-50 flex flex-col p-6 shadow-2xl
            transition-transform duration-300 ease-in-out
            ${isVisible ? "translate-x-0" : "translate-x-full"}
            ${
              isDark
                ? "bg-[#111214] text-white border-l border-white/10"
                : "bg-white text-neutral-900 border-l border-neutral-200"
            } overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
      >
        {/* Encabezado con título y botón de cierre */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00e639]">
              tune
            </span>
            <span className="font-black text-lg tracking-wide">Filtros</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            aria-label="Cerrar filtros"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Sección de filtrado: Plataformas */}
        <div className="mb-6">
          <h3
            className={`text-xs font-bold uppercase tracking-widest mb-3 px-2 ${
              isDark ? "text-[#00e639]" : "text-emerald-600"
            }`}
          >
            Plataformas
          </h3>
          <nav className="flex flex-col gap-1.5">
            {["PlayStation", "Xbox", "PC", "Nintendo", "Mobile"].map(
              (platform) => {
                const isActive = selectedPlatform === platform;
                return (
                  <button
                    key={platform}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setSelectedPlatform(isActive ? null : platform);
                      if (onClose) onClose();
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full cursor-pointer ${
                      isActive
                        ? isDark
                          ? "bg-[#00e639]/15 text-[#00e639] border border-[#00e639]/40 shadow-[0_0_15px_rgba(0,230,57,0.15)] font-bold"
                          : "bg-[#00e639]/20 text-emerald-900 border border-[#00e639]/50 font-bold shadow-sm"
                        : isDark
                          ? "text-[#c4c7c7] opacity-80 hover:bg-white/5 hover:opacity-100 hover:text-white border border-transparent"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent"
                    }`}
                  >
                    <img
                      src={platformIcons[platform]}
                      alt=""
                      aria-hidden="true"
                      className={`w-4 h-4 object-contain ${!isDark ? "brightness-0 opacity-80" : ""}`}
                    />
                    <span className="flex-1">{platform}</span>
                    {isActive && (
                      <span className="material-symbols-outlined text-sm text-[#00e639]">
                        check
                      </span>
                    )}
                  </button>
                );
              },
            )}
          </nav>
        </div>

        {/* Sección de filtrado: Géneros */}
        <div className="mb-6">
          <h3
            className={`text-xs font-bold uppercase tracking-widest mb-3 px-2 ${
              isDark ? "text-[#00e639]" : "text-emerald-600"
            }`}
          >
            Géneros
          </h3>
          <nav className="flex flex-col gap-1.5">
            {["Action", "RPG", "Shooter", "Strategy", "Indie", "Adventure"].map(
              (genre) => {
                const isActive = selectedGenre === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setSelectedGenre(isActive ? null : genre);
                      if (onClose) onClose();
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full cursor-pointer ${
                      isActive
                        ? isDark
                          ? "bg-[#ecb1ff]/15 text-[#ecb1ff] border border-[#ecb1ff]/40 shadow-[0_0_15px_rgba(236,177,255,0.15)] font-bold"
                          : "bg-purple-100 text-purple-900 border border-purple-300 font-bold shadow-sm"
                        : isDark
                          ? "text-[#c4c7c7] opacity-80 hover:bg-white/5 hover:opacity-100 hover:text-white border border-transparent"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent"
                    }`}
                  >
                    <img
                      src={genreIcons[genre]}
                      alt=""
                      aria-hidden="true"
                      className={`w-4 h-4 object-contain ${!isDark ? "brightness-0 opacity-80" : ""}`}
                    />
                    <span className="flex-1">{genre}</span>
                    {isActive && (
                      <span className="material-symbols-outlined text-sm text-[#ecb1ff] dark:text-[#ecb1ff]">
                        check
                      </span>
                    )}
                  </button>
                );
              },
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

