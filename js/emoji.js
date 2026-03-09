/* =========================================================
 *  Emoji Manager — Fluent 3D Emoji rendering for canvas & DOM
 *  Replaces system font emoji with Microsoft Fluent 3D PNGs
 * ========================================================= */

// jsDelivr CDN — serves Microsoft Fluent 3D emoji PNGs by codepoint
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/';

// ---- Image cache (preloaded Image objects keyed by emoji char) ----
const imageCache = {};

// ---- Sprite cache (offscreen canvases keyed by "emoji|size|dpr") ----
const spriteCache = {};

/* ------------------------------------------------------------------
 *  Filename helpers
 * ------------------------------------------------------------------ */

/** Convert an emoji character to its codepoint-based CDN filename.
 *  Strips variation selector FE0F since the asset files omit it.
 *  e.g. '🚀' → '1f680_3d.png', '👨‍🚀' → '1f468-200d-1f680_3d.png' */
export function emojiToFilename(emoji) {
  const cps = [...emoji]
    .map(c => c.codePointAt(0))
    .filter(cp => cp !== 0xFE0F)
    .map(cp => cp.toString(16))
    .join('-');
  return cps + '_3d.png';
}

/** Get the CDN URL for an emoji image. */
export function getEmojiUrl(emoji) {
  return CDN_BASE + emojiToFilename(emoji);
}

/* ------------------------------------------------------------------
 *  Loading & preloading
 * ------------------------------------------------------------------ */

/** Load a single emoji image. Resolves to the Image or null on failure. */
export function loadEmoji(emoji) {
  if (imageCache[emoji] !== undefined) return Promise.resolve(imageCache[emoji]);
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => { imageCache[emoji] = img; resolve(img); };
    img.onerror = () => { imageCache[emoji] = null; resolve(null); };
    img.src = getEmojiUrl(emoji);
  });
}

/** Preload an array of emoji. Returns a promise that resolves when all are loaded. */
export function preloadEmojis(emojiList) {
  return Promise.all(emojiList.map(loadEmoji));
}

/** Get the preloaded Image for an emoji, or null if not loaded / failed. */
export function getImage(emoji) {
  return imageCache[emoji] || null;
}

/* ------------------------------------------------------------------
 *  Canvas API — for canvas-based games (rocket-ride, balloon-float, tiny-town)
 * ------------------------------------------------------------------ */

/** Get an offscreen canvas sprite for an emoji at the given pixel size.
 *  @param {string} emoji - Emoji character
 *  @param {number} size  - Desired display size in CSS pixels
 *  @param {number} [dpr=1] - Device pixel ratio for sharp rendering
 *  @returns {HTMLCanvasElement} Offscreen canvas with the emoji drawn */
export function getSprite(emoji, size, dpr) {
  dpr = dpr || 1;
  const key = emoji + '|' + size + '|' + dpr;
  if (spriteCache[key]) return spriteCache[key];

  const dim = Math.ceil(size * dpr);
  const c = document.createElement('canvas');
  c.width = c.height = dim;
  const ctx = c.getContext('2d');

  const img = imageCache[emoji];
  if (img) {
    ctx.drawImage(img, 0, 0, dim, dim);
  } else {
    // Fallback: system emoji via fillText
    ctx.font = Math.round(size * dpr * 0.75) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, dim / 2, dim / 2);
  }

  spriteCache[key] = c;
  return c;
}

/* ------------------------------------------------------------------
 *  DOM API — for DOM-based games (splat-keys, ball-bonanza, etc.)
 * ------------------------------------------------------------------ */

/** Create an <img> element for an emoji (or fallback <span> with text).
 *  @param {string} emoji     - Emoji character
 *  @param {string} [className] - Optional CSS class name
 *  @returns {HTMLElement} <img> or <span> element */
export function createEmojiImg(emoji, className) {
  const img = imageCache[emoji];
  if (img) {
    const el = document.createElement('img');
    el.src = getEmojiUrl(emoji);
    el.alt = emoji;
    el.draggable = false;
    if (className) el.className = className;
    return el;
  }
  // Fallback: plain text emoji
  const span = document.createElement('span');
  span.textContent = emoji;
  if (className) span.className = className;
  return span;
}

/** Get the emoji URL directly (for use in HTML or CSS).
 *  Returns null if the emoji image was not preloaded. */
export function getEmojiSrc(emoji) {
  return imageCache[emoji] ? getEmojiUrl(emoji) : null;
}

/* ------------------------------------------------------------------
 *  Cache management
 * ------------------------------------------------------------------ */

/** Clear the sprite cache (call on resize to regenerate at new sizes). */
export function clearSpriteCache() {
  for (const k of Object.keys(spriteCache)) delete spriteCache[k];
}
