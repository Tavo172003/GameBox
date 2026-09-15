/**
 * Utilidades de seguridad para validación y sanitización
 */

/**
 * Valida si una URL externa es segura para ser usada en enlaces (<a href="...">).
 * Previene ataques de inyección de esquemas como `javascript:`, `data:`, `vbscript:`.
 * 
 * @param {string} url - La URL a verificar
 * @returns {boolean} true si el protocolo es http: o https:
 */
export function isValidExternalUrl(url) {
  if (!url || typeof url !== 'string') return false;

  // Trim y verificación inicial
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    // Si no es una URL absoluta válida pero comienza con /, la consideramos relativa interna
    return false;
  }
}

/**
 * Codifica de forma segura un parámetro o valor de búsqueda para URLs de APIs.
 * 
 * @param {string|number} param - Parámetro a codificar
 * @returns {string} Parámetro codificado
 */
export function safeEncodeParam(param) {
  if (param === null || param === undefined) return '';
  return encodeURIComponent(String(param).trim());
}

/**
 * Limpia etiquetas HTML básicas y entidades HTML de un texto de manera segura.
 * 
 * @param {string} rawText - Texto con posibles etiquetas HTML
 * @returns {string} Texto limpio
 */
export function cleanHtmlTags(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
