/* =========================================================
 *  Emoji Manager — Fluent 3D Emoji rendering for canvas & DOM
 *  Replaces system font emoji with Microsoft Fluent 3D PNGs
 * ========================================================= */

// Our own copies of the Microsoft Fluent 3D emoji, re-encoded to WebP at the
// same 256px resolution by scripts/fetch-emoji.mjs (`npm run emoji`).
// Self-hosting is ~85% fewer bytes than the PNGs we used to hot-link from
// jsDelivr, is same-origin, and does not depend on a third-party mirror.
const CDN_BASE = '/assets/emoji/fluent/';

// ---- Image cache (preloaded Image objects keyed by emoji char) ----
const imageCache = {};

// ---- Sprite cache (offscreen canvases keyed by "emoji|size|dpr") ----
const spriteCache = {};

/* ------------------------------------------------------------------
 *  Filename helpers
 * ------------------------------------------------------------------ */

/** Convert an emoji character to its codepoint-based CDN filename.
 *  Strips variation selector FE0F since the asset files omit it.
 *  e.g. '🚀' → '1f680_3d.webp', '👨‍🚀' → '1f468-200d-1f680_3d.webp' */
export function emojiToFilename(emoji) {
  const cps = [...emoji]
    .map(c => c.codePointAt(0))
    .filter(cp => cp !== 0xFE0F)
    .map(cp => cp.toString(16))
    .join('-');
  return cps + '_3d.webp';
}

/** Get the CDN URL for an emoji image. */
export function getEmojiUrl(emoji) {
  return CDN_BASE + emojiToFilename(emoji);
}

/* ------------------------------------------------------------------
 *  Loading & preloading
 * ------------------------------------------------------------------ */

/** Load a single emoji image. Resolves to the Image or null on failure.
 *  If the exact ZWJ/skin-tone URL fails, tries the base emoji (first codepoint). */
const LOAD_TIMEOUT_MS = 6000;

export function loadEmoji(emoji) {
  if (imageCache[emoji] !== undefined) return Promise.resolve(imageCache[emoji]);
  const url = getEmojiUrl(emoji);
  return new Promise(resolve => {
    // A CDN that hangs (rather than errors) used to leave every game's
    // preload pending forever — blank screen. Give up and fall back after
    // a few seconds; the <img> keeps loading and fills the cache if it lands.
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const timer = setTimeout(() => done(imageCache[emoji] === undefined ? null : imageCache[emoji]), LOAD_TIMEOUT_MS);
    const img = new Image();
    img.onload  = () => { clearTimeout(timer); imageCache[emoji] = img; done(img); };
    img.onerror = () => {
      clearTimeout(timer);
      // Fallback: try base emoji (first codepoint only, strips ZWJ/gender/skin)
      const base = emoji.codePointAt(0).toString(16);
      const baseUrl = CDN_BASE + base + '_3d.webp';
      if (baseUrl !== url) {
        const fb = new Image();
        fb.onload  = () => { imageCache[emoji] = fb; resolve(fb); };
        fb.onerror = () => { imageCache[emoji] = null; resolve(null); };
        fb.src = baseUrl;
      } else {
        imageCache[emoji] = null;
        resolve(null);
      }
    };
    img.src = url;
  });
}

/** Preload an array of emoji.
 *
 *  Games used to await *every* image before rendering a single frame. Spell It
 *  Out pulled 99 files (3.2 MB) to show one duck, which on a phone meant a
 *  blank screen for several seconds — the top reason first-time mobile
 *  visitors bounced. Now the promise resolves as soon as either every image
 *  has landed or PRELOAD_DEADLINE_MS has passed, whichever comes first. The
 *  stragglers keep downloading and fill the cache behind the running game,
 *  and createEmojiImg/getSprite below upgrade themselves when they arrive.
 *
 *  Pass deadlineMs = 0 to genuinely wait for everything. */
const PRELOAD_DEADLINE_MS = 600;

export function preloadEmojis(emojiList, deadlineMs = PRELOAD_DEADLINE_MS) {
  const all = Promise.all(emojiList.map(loadEmoji));
  if (!deadlineMs) return all;
  let deadline = null;
  // Only surface a spinner on a genuinely slow connection. On a normal one the
  // opening images land well inside SPINNER_AFTER_MS and nothing flashes.
  const spinner = setTimeout(showLoading, SPINNER_AFTER_MS);
  const settle = (v) => { clearTimeout(spinner); clearTimeout(deadline); hideLoading(); return v; };
  return Promise.race([
    all.then(settle),
    new Promise((resolve) => { deadline = setTimeout(() => resolve(settle(null)), deadlineMs); }),
  ]);
}

/* ---- Loading indicator (shared by every game, created on demand) ---- */
const SPINNER_AFTER_MS = 250;
let loadingEl = null;

function showLoading() {
  const host = document.getElementById('playground');
  if (!host) return;
  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.className = 'emoji-loading';
    loadingEl.setAttribute('role', 'status');
    loadingEl.setAttribute('aria-label', 'Loading');
    loadingEl.innerHTML = '<i></i><i></i><i></i>';
  }
  if (loadingEl.parentNode !== host) host.appendChild(loadingEl);
  loadingEl.classList.add('show');
}

function hideLoading() {
  if (loadingEl) loadingEl.classList.remove('show');
}

/** Start loading emoji in the background. Returns nothing; never awaited.
 *  Use for assets a game will need soon but not this instant. */
export function warmEmojis(emojiList) {
  for (const e of emojiList) if (imageCache[e] === undefined) loadEmoji(e);
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
    spriteCache[key] = c;      // only a real image is worth keeping
    return c;
  }

  // Fallback: system emoji via fillText. Deliberately NOT cached — the image
  // is probably still downloading, and a cached fallback would freeze the
  // canvas games on system emoji for the rest of the session.
  ctx.font = Math.round(size * dpr * 0.75) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, dim / 2, dim / 2);
  return c;
}

/* ------------------------------------------------------------------
 *  DOM API — for DOM-based games (splat-keys, ball-bonanza, etc.)
 * ------------------------------------------------------------------ */

/** Create an <img> element for an emoji (or fallback <span> with text).
 *  @param {string} emoji     - Emoji character
 *  @param {string} [className] - Optional CSS class name
 *  @returns {HTMLElement} <img> or <span> element */
function textEmoji(emoji, className) {
  const span = document.createElement('span');
  span.textContent = emoji;
  if (className) span.className = className;
  return span;
}

export function createEmojiImg(emoji, className) {
  // Known-missing on the CDN (14 of the 362 in the registries): straight to text.
  if (imageCache[emoji] === null) return textEmoji(emoji, className);

  // Not yet cached is no longer a reason to fall back. Hand back the <img> and
  // let the browser stream it in — waiting for the cache is what made games
  // start slowly. If the URL turns out to be a 404 we try the base codepoint
  // (strips ZWJ/gender/skin tone) and only then swap in a text span in place.
  const el = document.createElement('img');
  el.alt = emoji;
  el.draggable = false;
  if (className) el.className = className;

  if (imageCache[emoji] === undefined) {
    let triedBase = false;
    el.addEventListener('error', function onError() {
      const baseUrl = CDN_BASE + emoji.codePointAt(0).toString(16) + '_3d.webp';
      if (!triedBase && baseUrl !== getEmojiUrl(emoji)) {
        triedBase = true;
        el.src = baseUrl;
        return;
      }
      el.removeEventListener('error', onError);
      imageCache[emoji] = null;
      if (el.parentNode) el.parentNode.replaceChild(textEmoji(emoji, className), el);
    });
    el.addEventListener('load', () => {
      if (imageCache[emoji] === undefined) imageCache[emoji] = el;
    }, { once: true });
  }

  el.src = getEmojiUrl(emoji);
  return el;
}

/** Get the emoji URL directly (for use in HTML or CSS).
 *  Returns null if the emoji image was not preloaded. */
export function getEmojiSrc(emoji) {
  return imageCache[emoji] === null ? null : getEmojiUrl(emoji);
}

/* ------------------------------------------------------------------
 *  Cache management
 * ------------------------------------------------------------------ */

/** Clear the sprite cache (call on resize to regenerate at new sizes). */
export function clearSpriteCache() {
  for (const k of Object.keys(spriteCache)) delete spriteCache[k];
}
