import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "./Header.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import {
  isValidExternalUrl,
  safeEncodeParam,
  cleanHtmlTags,
} from "../utils/security.js";

// Mapeo de plataformas a iconos vectoriales para las insignias de detalle
const platformIcons = {
  playstation: "/SVG/Plataformas/Playstation.svg",
  xbox: "/SVG/Plataformas/XBOX.svg",
  pc: "/SVG/Plataformas/Windows.svg",
  nintendo: "/SVG/Plataformas/Switch.svg",
  android: "/SVG/Plataformas/Mobile.svg",
  ios: "/SVG/Plataformas/Mobile.svg",
};

/**
 * Componente visual para la valoración por estrellas (escala 1 a 5):
 * Calcula estrellas llenas, media estrella y vacías según el rating devuelto por la API.
 */
function StarRating({ rating }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`material-symbols-outlined text-xl ${
            i <= full
              ? "text-yellow-400"
              : i === full + 1 && hasHalf
                ? "text-yellow-400 opacity-50"
                : "text-neutral-700"
          }`}
        >
          star
        </span>
      ))}
      <span className="ml-2 text-lg font-black text-yellow-400">
        {rating.toFixed(1)}
      </span>
      <span className="ml-1 text-sm text-neutral-500 font-medium">/ 5</span>
    </div>
  );
}

/**
 * Insignia estilizada de la puntuación en Metacritic con código de color dinámico
 */
function MetacriticBadge({ score }) {
  if (!score) return null;
  const color =
    score >= 75
      ? "text-[#00e639] border-[#00e639]/50 bg-[#00e639]/10 shadow-[0_0_20px_rgba(0,230,57,0.15)]"
      : score >= 50
        ? "text-yellow-400 border-yellow-400/50 bg-yellow-400/10"
        : "text-red-400 border-red-400/50 bg-red-400/10";
  return (
    <div
      className={`flex flex-col items-center border-2 rounded-2xl px-5 py-3 ${color}`}
    >
      <span className="text-4xl font-black leading-none">{score}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">
        Metacritic
      </span>
    </div>
  );
}

/**
 * Tarjeta genérica para atributos individuales del juego (desarrollador, editor, etc.)
 */
function InfoCard({ label, children, isDark }) {
  return (
    <div
      className={`flex flex-col gap-1.5 p-4 rounded-xl border transition-colors ${
        isDark
          ? "bg-white/[0.03] border-white/5"
          : "bg-white border-neutral-200 shadow-sm"
      }`}
    >
      <span
        className={`text-[10px] font-bold uppercase tracking-widest ${
          isDark ? "text-neutral-500" : "text-neutral-500"
        }`}
      >
        {label}
      </span>
      <div
        className={`text-sm font-semibold leading-snug ${
          isDark ? "text-[#e2e2e2]" : "text-neutral-900"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Traduce texto al español mediante la API de Google Translate (gtx):
 * - Divide el texto por párrafos y oraciones para no exceder los límites de longitud de la URL.
 * - Limita las peticiones concurrentes y devuelve el texto original en caso de error.
 */
async function translateToSpanish(text) {
  if (!text) return "";
  try {
    const paragraphs = text
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paragraphs.length === 0) return text;

    // Limita el número de párrafos a procesar para evitar saturar el endpoint
    const boundedParagraphs = paragraphs.slice(0, 10);

    const translatedParagraphs = await Promise.all(
      boundedParagraphs.map(async (p) => {
        try {
          if (p.length > 1500) {
            const sentences = p.match(/[^.!?]+[.!?]+|\S+/g) || [p];
            const sentenceTranslations = await Promise.all(
              sentences.slice(0, 8).map(async (s) => {
                const encodedQuery = safeEncodeParam(s.trim());
                if (!encodedQuery) return s;
                const res = await fetch(
                  `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodedQuery}`,
                );
                if (!res.ok) return s;
                const data = await res.json();
                return data[0]?.map((item) => item[0]).join("") || s;
              }),
            );
            return sentenceTranslations.join(" ");
          } else {
            const encodedQuery = safeEncodeParam(p);
            if (!encodedQuery) return p;
            const res = await fetch(
              `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodedQuery}`,
            );
            if (!res.ok) return p;
            const data = await res.json();
            return data[0]?.map((item) => item[0]).join("") || p;
          }
        } catch {
          return p;
        }
      }),
    );

    return translatedParagraphs.join("\n\n");
  } catch {
    return text;
  }
}

/**
 * Vista detallada del videojuego:
 * - Carga en paralelo la ficha del juego y la galería de capturas con Promise.allSettled.
 * - Traduce la sinopsis al español de forma asíncrona permitiendo alternar con el original.
 * - Muestra plataformas, metadatos, distribución de valoraciones y visor de capturas (lightbox).
 */
function Description() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Estados para datos del juego, traducción y visualización
  const [game, setGame] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [spanishDesc, setSpanishDesc] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeScreenshot, setActiveScreenshot] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);

  /**
   * Carga los datos del juego y las capturas de pantalla de la API de RAWG en paralelo.
   */
  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setGame(null);
    setScreenshots([]);
    setSpanishDesc("");
    setIsTranslating(false);
    setShowOriginal(false);
    try {
      const apiKey = import.meta.env.VITE_RAWG_API_KEY;
      const safeId = safeEncodeParam(id);
      const [gameRes, shotRes] = await Promise.allSettled([
        fetch(`https://api.rawg.io/api/games/${safeId}?key=${apiKey}`),
        fetch(
          `https://api.rawg.io/api/games/${safeId}/screenshots?key=${apiKey}&page_size=12`,
        ),
      ]);

      if (gameRes.status === "fulfilled" && gameRes.value.ok) {
        const gameData = await gameRes.value.json();
        setGame(gameData);

        // Dispara la traducción si existe descripción disponible
        const raw = gameData.description_raw || gameData.description;
        if (raw) {
          const cleaned = cleanHtmlTags(raw);
          setIsTranslating(true);
          translateToSpanish(cleaned)
            .then((res) => {
              if (res) setSpanishDesc(res);
            })
            .catch(() => {})
            .finally(() => setIsTranslating(false));
        }
      }

      if (shotRes.status === "fulfilled" && shotRes.value.ok) {
        const shotData = await shotRes.value.json();
        setScreenshots(shotData.results || []);
      }
    } catch {
      // Ignora silenciosamente errores generales de red
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
    window.scrollTo(0, 0);
  }, [fetchDetails]);

  // Formatea la fecha de lanzamiento en formato extendido en español
  const formatDate = (str) => {
    if (!str) return "TBA";
    try {
      return new Date(str).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return str;
    }
  };

  const stripHtml = (html) => {
    return cleanHtmlTags(html);
  };

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${
        isDark ? "bg-black text-[#c4c7c7]" : "bg-[#f8f9fb] text-neutral-800"
      }`}
    >
      {/* Barra de cabecera compartida */}
      <Header />

      {/* Banner de portada (Hero Banner) con imagen nítida y fondo desenfocado ambiental */}
      <div className="relative w-full h-[60vh] min-h-[420px] max-h-[580px] overflow-hidden bg-neutral-950">
        {game?.background_image ? (
          <>
            {/* Capa de fondo con desenfoque extremo para generar ambientación cromática */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={game.background_image}
                alt=""
                className="w-full h-full object-cover object-center blur-3xl opacity-35 scale-110"
              />
            </div>

            {/* Imagen principal nítida */}
            <img
              src={game.background_image}
              alt={game?.name}
              className="w-full h-full object-cover object-[center_18%] sm:object-[center_22%] relative z-0"
            />
          </>
        ) : (
          <div className="w-full h-full bg-neutral-900 animate-pulse" />
        )}

        {/* Gradientes de superposición para legibilidad de botones y transición suave al contenido */}
        <div
          className={`absolute inset-0 bg-gradient-to-t ${
            isDark
              ? "from-black via-black/40 to-black/30"
              : "from-[#f8f9fb] via-black/40 to-black/30"
          } z-[1]`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent z-[1]" />

        {/* Barra superior flotante: Botón de volver y enlace al sitio web oficial validado */}
        <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-black/70 hover:bg-black/90 border border-white/10 rounded-full text-white text-sm font-semibold backdrop-blur-md transition-all hover:border-[#00e639]/40 hover:shadow-[0_0_15px_rgba(0,230,57,0.2)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">
              arrow_back
            </span>
            Volver
          </button>

          {game?.website && isValidExternalUrl(game.website) && (
            <a
              href={game.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-black/70 hover:bg-black/90 border border-white/10 rounded-full text-xs font-semibold text-neutral-300 hover:text-white backdrop-blur-md transition-all"
            >
              <span className="material-symbols-outlined text-sm">public</span>
              Web Oficial
            </a>
          )}
        </div>
      </div>

      {/* Contenedor del contenido principal */}
      <div className="max-w-5xl mx-auto px-6 -mt-28 relative z-10 pb-20">
        {/* Título principal, estrellas de calificación y medalla de Metacritic */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            {loading && !game ? (
              <div className="animate-pulse space-y-3">
                <div
                  className={`h-10 rounded-xl w-96 ${
                    isDark ? "bg-neutral-800" : "bg-neutral-300"
                  }`}
                />
                <div
                  className={`h-5 rounded-lg w-48 ${
                    isDark ? "bg-neutral-800" : "bg-neutral-300"
                  }`}
                />
              </div>
            ) : (
              <>
                <h1
                  className={`text-3xl sm:text-4xl md:text-5xl font-black leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] mb-3 ${
                    isDark ? "text-white" : "text-neutral-900 drop-shadow-none"
                  }`}
                >
                  {game?.name}
                </h1>
                {game?.rating > 0 && <StarRating rating={game.rating} />}
              </>
            )}
          </div>
          {!loading && <MetacriticBadge score={game?.metacritic} />}
        </div>

        {/* Esqueleto de carga durante la llamada a la API */}
        {loading && !game ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-20 rounded-xl ${
                    isDark ? "bg-neutral-900" : "bg-neutral-200"
                  }`}
                />
              ))}
            </div>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`h-3 rounded w-full ${
                    isDark ? "bg-neutral-900" : "bg-neutral-200"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : game ? (
          <div className="space-y-10">
            {/* Lista de plataformas disponibles */}
            {game.parent_platforms && (
              <div className="flex flex-wrap gap-3 items-center">
                {game.parent_platforms
                  .map((p) => p.platform.slug)
                  .filter((s) => platformIcons[s])
                  .map((slug) => (
                    <div
                      key={slug}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                        isDark
                          ? "bg-white/5 border-white/5"
                          : "bg-white border-neutral-200 shadow-sm"
                      }`}
                    >
                      <img
                        src={platformIcons[slug]}
                        alt={slug}
                        className={`w-4 h-4 object-contain ${
                          isDark ? "opacity-70" : "brightness-0 opacity-80"
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold capitalize ${
                          isDark ? "text-neutral-300" : "text-neutral-700"
                        }`}
                      >
                        {slug}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Ficha técnica resumida: fecha, desarrolladores, distribuidores y duración */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoCard label="Lanzamiento" isDark={isDark}>
                {formatDate(game.released)}
              </InfoCard>
              <InfoCard label="Desarrollador" isDark={isDark}>
                {game.developers?.map((d) => d.name).join(", ") || "—"}
              </InfoCard>
              <InfoCard label="Editor" isDark={isDark}>
                {game.publishers?.map((p) => p.name).join(", ") || "—"}
              </InfoCard>
              <InfoCard label="Duración media" isDark={isDark}>
                {game.playtime ? `~${game.playtime} horas` : "—"}
              </InfoCard>
            </div>

            {/* Géneros y etiquetas secundarias */}
            <div className="space-y-3">
              {game.genres?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {game.genres.map((g) => (
                    <span
                      key={g.id}
                      className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                        isDark
                          ? "bg-[#ecb1ff]/10 text-[#ecb1ff] border-[#ecb1ff]/20"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}
              {game.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {game.tags.slice(0, 16).map((t) => (
                    <span
                      key={t.id}
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium border ${
                        isDark
                          ? "bg-white/5 text-neutral-400 border-white/5"
                          : "bg-white text-neutral-600 border-neutral-200 shadow-sm"
                      }`}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sinopsis del juego con soporte de traducción y expansión de texto */}
            {(game.description_raw || game.description) && (
              <div
                className={`pt-2 border-t ${
                  isDark ? "border-white/5" : "border-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#00e639]">
                      Descripción
                    </h2>
                    {isTranslating && (
                      <span className="text-[10px] text-neutral-400 italic animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00e639] animate-ping" />
                        Traduciendo al español...
                      </span>
                    )}
                  </div>
                  {/* Botón para alternar entre el texto traducido al español y el original en inglés */}
                  {spanishDesc &&
                    spanishDesc !==
                      stripHtml(game.description_raw || game.description) && (
                      <button
                        onClick={() => setShowOriginal((prev) => !prev)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isDark
                            ? "text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border-white/10"
                            : "text-neutral-600 hover:text-black bg-white hover:bg-neutral-100 border-neutral-200 shadow-sm"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs text-[#00e639]">
                          translate
                        </span>
                        {showOriginal ? "Ver en Español" : "Ver original (EN)"}
                      </button>
                    )}
                </div>

                {/* Contenedor del texto con recorte de altura inicial y gradiente de desvanecimiento */}
                <div className="relative">
                  <div
                    className={`text-sm leading-relaxed overflow-hidden transition-all duration-500 whitespace-pre-line text-justify ${
                      isDark ? "text-neutral-300" : "text-neutral-700"
                    } ${descExpanded ? "max-h-[9999px]" : "max-h-44"}`}
                  >
                    {showOriginal
                      ? stripHtml(game.description_raw || game.description)
                      : spanishDesc ||
                        stripHtml(game.description_raw || game.description)}
                  </div>
                  {!descExpanded &&
                    (spanishDesc || game.description_raw || game.description)
                      .length > 500 && (
                      <div
                        className={`absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t pointer-events-none ${
                          isDark
                            ? "from-black via-black/80 to-transparent"
                            : "from-[#f8f9fb] via-[#f8f9fb]/80 to-transparent"
                        }`}
                      />
                    )}
                </div>

                {/* Botón para expandir/contraer la descripción si supera 500 caracteres */}
                {(spanishDesc || game.description_raw || game.description)
                  .length > 500 && (
                  <div className="flex justify-center mt-5">
                    <button
                      onClick={() => setDescExpanded((p) => !p)}
                      className={`group flex items-center gap-2 px-6 py-2.5 rounded-full border text-xs font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md ${
                        isDark
                          ? "bg-white/[0.04] hover:bg-[#00e639]/10 border-white/10 hover:border-[#00e639]/40 text-neutral-300 hover:text-[#00e639] shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_20px_rgba(0,230,57,0.2)]"
                          : "bg-white hover:bg-emerald-50/50 border-neutral-300 hover:border-[#00e639] text-neutral-700 hover:text-emerald-700 shadow-sm"
                      }`}
                    >
                      <span>
                        {descExpanded
                          ? "Mostrar menos"
                          : "Leer descripción completa"}
                      </span>
                      <span
                        className={`material-symbols-outlined text-base text-[#00e639] transition-transform duration-300 ${
                          descExpanded
                            ? "-rotate-180"
                            : "group-hover:translate-y-0.5"
                        }`}
                      >
                        expand_more
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Distribución porcentual de las valoraciones de la comunidad */}
            {game.ratings?.length > 0 && (
              <div
                className={`pt-2 border-t ${
                  isDark ? "border-white/5" : "border-neutral-200"
                }`}
              >
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#00e639] mb-4">
                  Valoraciones de la comunidad
                </h2>
                <div className="space-y-3">
                  {game.ratings.map((r) => (
                    <div key={r.id} className="flex items-center gap-4">
                      <span
                        className={`text-xs font-semibold w-24 capitalize ${
                          isDark ? "text-neutral-400" : "text-neutral-600"
                        }`}
                      >
                        {r.title}
                      </span>
                      <div
                        className={`flex-1 rounded-full h-2 overflow-hidden ${
                          isDark ? "bg-white/5" : "bg-neutral-200"
                        }`}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00e639] to-[#00b82e]"
                          style={{ width: `${r.percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-500 font-semibold w-12 text-right">
                        {r.percent.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Galería de capturas de pantalla */}
            {screenshots.length > 0 && (
              <div
                className={`pt-2 border-t ${
                  isDark ? "border-white/5" : "border-neutral-200"
                }`}
              >
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#00e639] mb-4">
                  Capturas de pantalla
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {screenshots.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveScreenshot(s.image)}
                      className={`relative group rounded-xl overflow-hidden aspect-video border focus:outline-none cursor-pointer ${
                        isDark
                          ? "bg-neutral-900 border-white/5"
                          : "bg-neutral-200 border-neutral-300 shadow-sm"
                      }`}
                    >
                      <img
                        src={s.image}
                        alt="screenshot"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                          fullscreen
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Estado de error si no se pudo cargar la información del juego */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-red-500 text-5xl mb-4">
              error
            </span>
            <p
              className={`text-sm ${
                isDark ? "text-neutral-400" : "text-neutral-600"
              }`}
            >
              No se pudo cargar la información del juego.
            </p>
            <button
              onClick={() => navigate(-1)}
              className={`mt-4 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 text-white"
                  : "bg-neutral-200 hover:bg-neutral-300 text-neutral-800"
              }`}
            >
              Volver
            </button>
          </div>
        )}
      </div>

      {/* Visor modal en pantalla completa (Lightbox) para la captura seleccionada */}
      {activeScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setActiveScreenshot(null)}
        >
          <img
            src={activeScreenshot}
            alt="screenshot"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
          />
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all"
            onClick={() => setActiveScreenshot(null)}
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Description;

