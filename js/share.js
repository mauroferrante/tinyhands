/* =========================================================
 *  Share / Copy Utility for Tiny Hands Play
 *  Web Share API on mobile, clipboard copy on desktop.
 * ========================================================= */

export const SHARE_URL = 'https://tinyhandsplay.com';

function shareUrl(medium) {
  return SHARE_URL + '?utm_source=share&utm_medium=' + medium;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
         ('ontouchstart' in window && window.innerWidth < 768);
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    return { method: 'copy', success: true };
  } catch (e) {
    return { method: 'copy', success: false };
  } finally {
    ta.remove();
  }
}

/**
 * Attempt native share on mobile, clipboard copy on desktop.
 * @returns {Promise<{method: 'share'|'copy', success: boolean}>}
 */
export async function shareOrCopy() {
  // Native share sheet on mobile
  if (navigator.share && isMobileDevice()) {
    try {
      await navigator.share({
        title: 'Tiny Hands Play',
        text: 'Free fun and educational games for toddlers and kids — no ads, no installs, just play!',
        url: shareUrl('native')
      });
      return { method: 'share', success: true };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { method: 'share', success: false };
      }
      // Fall through to clipboard on other errors
    }
  }

  // Clipboard API (desktop or mobile fallback)
  const copyUrl = shareUrl('copy');
  try {
    await navigator.clipboard.writeText(copyUrl);
    return { method: 'copy', success: true };
  } catch (err) {
    return fallbackCopy(copyUrl);
  }
}
