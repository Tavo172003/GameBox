import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";

// Rutas locales a los iconos vectoriales de cada plataforma
const platformIcons = {
  playstation: "/SVG/Plataformas/Playstation.svg",
  xbox: "/SVG/Plataformas/XBOX.svg",
  pc: "/SVG/Plataformas/Windows.svg",
  nintendo: "/SVG/Plataformas/Switch.svg",
  android: "/SVG/Plataformas/Mobile.svg",
  ios: "/SVG/Plataformas/Mobile.svg",
};

/**
 * Tarjeta individual de videojuego:
 * - Reproduce automáticamente el tráiler en loop cuando el usuario pasa el cursor (hover).
 * - Muestra la insignia coloreada de Metacritic según el rango de puntuación.
 * - Enlaza a la página de descripción completa (/game/:id).
 */
function GameCard({ game }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Estado y referencia para la previsualización de vídeo en hover
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef(null);

  // Obtiene la fuente del vídeo disponible según la resolución devuelta por RAWG
  const videoSrc =
    game?.clip?.clips?.["640"] ||
    game?.clip?.clips?.["320"] ||
    game?.clip?.clip;

  // Controla la reproducción o pausa del tráiler al entrar o salir del hover
  useEffect(() => {
    if (videoRef.current) {
      if (isHovered && videoSrc) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovered, videoSrc]);

  if (!game) return null;

  const {
    name,
    background_image,
    released,
    rating,
    metacritic,
    parent_platforms,
    genres,
  } = game;

  // Asigna colores semánticos a la insignia de Metacritic según la valoración
  const getMetacriticColor = (score) => {
    if (!score) return "";
    if (score >= 75)
      return "text-[#00e639] border-[#00e639]/30 bg-[#00e639]/10";
    if (score >= 50)
      return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
    return "text-red-500 border-red-500/30 bg-red-500/10";
  };

  // Formatea la fecha de lanzamiento al formato regional en español (ej. '15 oct 2024')
  const formatDate = (dateString) => {
    if (!dateString) return "TBA";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Link
      to={`/game/${game.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex flex-col backdrop-blur-md transition-all duration-300 rounded-xl overflow-hidden active:scale-[0.98] ${
        isDark
          ? "bg-neutral-900/40 hover:bg-neutral-900/70 border border-white/5 hover:border-[#00e639]/40 shadow-lg hover:shadow-[0_10px_30px_rgba(0,230,57,0.15)]"
          : "bg-white hover:bg-white border border-neutral-200 hover:border-[#00e639]/60 shadow-sm hover:shadow-xl"
      }`}
    >
      {/* Sección multimedia: Imagen de portada y reproductor de vídeo superpuesto */}
      <div className="relative h-48 w-full overflow-hidden bg-neutral-950">
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 ${
              isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          />
        )}

        {background_image ? (
          <img
            src={background_image}
            alt={name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-500 font-semibold text-xs px-4">
            Sin imagen
          </div>
        )}

        {/* Insignia de Metacritic */}
        {metacritic && (
          <span
            className={`absolute top-3 right-3 text-xs font-black px-2 py-0.5 rounded border z-20 ${getMetacriticColor(metacritic)}`}
          >
            {metacritic}
          </span>
        )}

        {/* Etiqueta indicativa de tráiler disponible */}
        {videoSrc && (
          <span className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white z-20">
            <span className="material-symbols-outlined text-xs text-[#00e639]">
              play_arrow
            </span>
            Trailer
          </span>
        )}

        {/* Gradiente para mejorar el contraste de los textos e insignias */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 z-10"></div>
      </div>

      {/* Sección de información textual y metadatos */}
      <div className="flex flex-col flex-grow p-4">
        {/* Iconos de plataformas soportadas y puntuación por estrellas */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-wrap gap-2 items-center">
            {parent_platforms &&
              parent_platforms
                .map((p) => p.platform.slug)
                .filter((slug) => platformIcons[slug])
                .map((slug) => (
                  <img
                    key={slug}
                    src={platformIcons[slug]}
                    alt={slug}
                    className={`w-4 h-4 object-contain transition-opacity ${
                      isDark
                        ? "opacity-60 group-hover:opacity-100"
                        : "brightness-0 opacity-70 group-hover:opacity-100"
                    }`}
                    title={slug}
                  />
                ))}
          </div>
          {rating > 0 && (
            <div className="flex items-center gap-1 text-xs text-yellow-500 font-bold shrink-0 ml-2">
              <span className="material-symbols-outlined text-xs leading-none">
                star
              </span>
              {rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Título del videojuego */}
        <h3
          className={`font-extrabold text-base leading-snug line-clamp-2 transition-colors ${
            isDark
              ? "text-white group-hover:text-[#00e639]"
              : "text-neutral-900 group-hover:text-emerald-600"
          }`}
        >
          {name}
        </h3>

        {/* Fecha de estreno */}
        <span
          className={`text-[11px] font-semibold mt-1 ${
            isDark ? "text-neutral-400" : "text-neutral-500"
          }`}
        >
          Lanzamiento: {formatDate(released)}
        </span>

        {/* Etiquetas de géneros */}
        {genres && genres.length > 0 && (
          <div
            className={`flex flex-wrap gap-1.5 mt-3 pt-3 border-t hidden sm:flex ${
              isDark ? "border-white/5" : "border-neutral-100"
            }`}
          >
            {genres.map((genre) => (
              <span
                key={genre.id}
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  isDark
                    ? "bg-white/5 text-[#ecb1ff] border-white/5"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }`}
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default GameCard;

