/* =========================================================
 *  Tiny Hands Play — Game Manager (Entry Point)
 * ========================================================= */

import { initAudio, isAudioReady, playFanfare, playBubblePop } from './audio.js';
import { EMOJIS, createBgEmojis } from './effects.js';
import { createEmojiImg } from './emoji.js';
import { splatKeys } from './games/splat-keys.js';
import { stackSmash } from './games/stack-smash.js';
import { spellItOut } from './games/spell-it-out.js';
import { memoryMatch } from './games/memory-match.js';
import { balloonFloat } from './games/balloon-float.js';
import { rocketRide } from './games/rocket-ride.js';
import { ballBonanza } from './games/ball-bonanza.js';
import { tinyTown } from './games/tiny-town.js';
import { melodyMaker } from './games/melody-maker.js';
import { shareOrCopy } from './share.js';
import { local, session } from './storage.js';

// ---- Element references ----
const landing    = document.getElementById('landing');
const playground = document.getElementById('playground');
const escHint    = document.getElementById('escHint');
const exitBtn    = document.getElementById('exitGame');
const overlay    = document.getElementById('transition-overlay');

// ---- Post-game nudge references ----
const postgameNudge       = document.getElementById('postgameNudge');
const postgameNudgeClose  = document.getElementById('postgameNudgeClose');
const postgameNudgeShare  = document.getElementById('postgameNudgeShare');
const postgameNudgeTip    = document.getElementById('postgameNudgeTip');
const postgameNudgeCopied = document.getElementById('postgameNudgeCopied');

// ---- Floating background emojis ----
createBgEmojis(landing);

// ---- Platform detection ----
// iPadOS 13+ reports "MacIntel" but has touch — second check catches it
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isIPad = isIOS && !/iPhone|iPod/.test(navigator.userAgent);
// Only Safari supports "Add to Home Screen" on iOS — Brave, Chrome, Firefox don't
const isIOSSafari = isIOS && /Safari/.test(navigator.userAgent) &&
                    !/CriOS|FxiOS|EdgiOS|OPiOS|Brave/.test(navigator.userAgent);
// macOS Safari supports "Add to Dock" — exclude iPadOS (caught by isIOS above)
const isMacSafari = !isIOS && /Macintosh/.test(navigator.userAgent) &&
                    /Safari/.test(navigator.userAgent) &&
                    !/Chrome|Chromium|Edg|OPR|Brave|Firefox/.test(navigator.userAgent);
const isSafari = isIOSSafari || isMacSafari;
const isStandalone = navigator.standalone === true ||
                     window.matchMedia('(display-mode: standalone)').matches;

// ---- Shared state ----
let currentGame     = null;
let pendingGame     = null;
let ownBackPending  = false;   // stopGame() called history.back(); its popstate is ours, not the user's
let deferredAndroidPrompt = null;

// ---- Game Registry ----
const GAMES = {
  'splat-keys': splatKeys,
  'stack-smash': stackSmash,
  'spell-it-out': spellItOut,
  'memory-match': memoryMatch,
  'balloon-float': balloonFloat,
  'rocket-ride': rocketRide,
  'ball-bonanza': ballBonanza,
  'tiny-town': tinyTown,
  'melody-maker': melodyMaker
};

// ===== Entry Animation & Fullscreen =====

function playEntryAnimation(originBtn, callback) {
  overlay.style.display = 'block';
  overlay.innerHTML = '';

  const rect = originBtn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < 25; i++) {
    const em = document.createElement('span');
    em.className = 'boom-emoji';
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    em.appendChild(createEmojiImg(emoji, 'emoji-img'));
    em.querySelector('.emoji-img').style.width = '1em';
    em.querySelector('.emoji-img').style.height = '1em';
    const angle = (Math.PI * 2 / 25) * i + Math.random() * 0.3;
    const dist = 300 + Math.random() * 400;
    em.style.left = cx + 'px';
    em.style.top = cy + 'px';
    em.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    em.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    em.style.setProperty('--tr', (Math.random() * 360 - 180) + 'deg');
    em.style.animationDelay = (Math.random() * 0.15) + 's';
    overlay.appendChild(em);
  }

  const flash = document.createElement('div');
  flash.className = 'flash';
  flash.style.animationDelay = '0.2s';
  overlay.appendChild(flash);

  playFanfare();

  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.innerHTML = '';
    callback();
  }, 800);
}

function launchGame(gameId, btn) {
  // A double-tap on Play used to queue two deferred starts; the second one
  // called startGame(null) and left the playground visible with no game and
  // no working exit. One launch at a time.
  if (pendingGame || currentGame) return;
  initAudio();
  const game = GAMES[gameId];
  if (!game) return;
  pendingGame = game;

  // Consume pendingGame exactly once, whichever path gets there first
  const startPending = () => {
    if (!currentGame && pendingGame) startGame(pendingGame);
    pendingGame = null;
  };

  playEntryAnimation(btn, () => {
    // iOS: skip Fullscreen API to avoid "typing in fullscreen" security warning.
    // CSS position:fixed + inset:0 on #playground already fills the viewport.
    if (isIOS) { startPending(); return; }
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
    if (rfs) {
      let p;
      try { p = rfs.call(el); } catch (e) { p = Promise.reject(e); }
      Promise.resolve(p).then(startPending).catch(startPending);
    } else {
      startPending();
    }
  });
}

function startGame(game) {
  currentGame = game;
  landing.style.display = 'none';
  playground.style.display = 'block';
  document.body.classList.add('game-active');

  // Virtual page view for Vercel Analytics
  history.pushState({ game: game.id }, '', '/play/' + game.id);

  initAudio();

  // Show ESC hint briefly on desktop (touch devices have the ✕ button)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice) {
    escHint.textContent = 'Press ESC to exit';
    escHint.style.opacity = '1';
    setTimeout(() => { escHint.style.opacity = '0'; }, 3000);
  }

  // Show our exit button only on touch devices when NOT in fullscreen
  // (in fullscreen, the browser provides its own native exit button)
  updateExitBtn();

  game.start();
}

function updateExitBtn() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (currentGame && isTouchDevice && !fsEl) {
    exitBtn.style.display = 'block';
  } else {
    exitBtn.style.display = 'none';
  }
}

// Single teardown path for ✕, ESC, fullscreen exit and the browser Back
// button. `fromHistory` is true when popstate already moved the URL, so we
// must not touch history again.
function stopGame({ fromHistory = false } = {}) {
  if (!currentGame) return;

  currentGame.stop();
  currentGame = null;

  playground.style.display = 'none';
  landing.style.display = 'flex';
  document.body.classList.remove('game-active');

  // Back button out of a desktop fullscreen game left the landing page
  // fullscreen — leave it here, fullscreenchange then sees no game and no-ops
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) { try { const p = exit.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  }

  // Reset scroll position — iOS Safari sometimes retains stale scroll offset
  // from when the address bar was hidden during gameplay
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;

  // Force header + banner visible — CSS animation with 'forwards' won't replay
  // after display:none toggle in Safari, leaving elements stuck at opacity:0.
  // Re-trigger the animation by removing and re-adding it.
  const header = landing.querySelector('header');
  if (header) {
    header.style.animation = 'none';
    void header.offsetWidth;              // force reflow
    header.style.animation = '';          // restore CSS animation
  }
  collapsePwaBanner();

  playground.querySelectorAll('.particle').forEach(p => p.remove());

  // Virtual page view — back to landing. Popping the /play/ entry (instead of
  // pushing a new '/') keeps the history stack flat, so one Back press
  // leaves the site instead of landing on a stale /play/x URL.
  if (!fromHistory) {
    if (history.state && history.state.game) {
      // The popstate from this back() arrives asynchronously — flag it so the
      // handler doesn't mistake it for a user Back press against a game that
      // may have been launched in the meantime.
      ownBackPending = true;
      history.back();
    } else {
      history.replaceState({}, '', '/');
    }
  }

  // Show post-game nudge once per session after first game exit
  if (!session.get('tipNudgeShown')) {
    session.set('tipNudgeShown', 'true');
    setTimeout(() => {
      postgameNudge.style.display = 'flex';
      requestAnimationFrame(() => postgameNudge.classList.add('show'));
    }, 1000);
  }
}

// ✕ button and ESC key: leave fullscreen if we're in it (fullscreenchange
// then calls stopGame), otherwise stop directly. Previously ESC only worked
// as a side effect of the browser exiting fullscreen — if requestFullscreen
// had been refused, the "Press ESC to exit" hint lied and there was no exit.
function exitGame() {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    stopGame();
  }
}

// ===== Fullscreen change listener =====
function onFullscreenChange() {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl && !currentGame && pendingGame) {
    startGame(pendingGame);
    pendingGame = null;
  } else if (!fsEl && currentGame) {
    stopGame();
  }
  // Update exit button visibility whenever fullscreen state changes
  if (currentGame) updateExitBtn();
}
document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);

// ===== Card Info Button (flip toggle) =====
document.querySelectorAll('.card-info-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.game-card').classList.add('flipped');
  });
});

// ===== Flip back: click anywhere on a flipped card =====
document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', (e) => {
    if (!card.classList.contains('flipped')) return;
    if (e.target.closest('.card-info-btn')) return;
    card.classList.remove('flipped');
  });
});

// ===== Bubble pop sound on card entrance animation =====
// animationend bubbles, so `once` alone would be consumed by whichever child
// animation (e.g. the icon) finishes first — wait for the card's own.
document.querySelectorAll('.game-card').forEach((card, i) => {
  card.addEventListener('animationend', function onEnd(e) {
    if (e.target !== card) return;
    card.removeEventListener('animationend', onEnd);
    if (isAudioReady()) playBubblePop(i);
  });
});

// ===== Play buttons launch games =====
// click alone covers touch here — a touchend handler would also fire when a
// scroll swipe starts on the button, launching games mid-scroll on tablets
document.querySelectorAll('.play-btn[data-game]').forEach(btn => {
  btn.addEventListener('click', () => launchGame(btn.dataset.game, btn));
});

// ===== Exit Button (touch + desktop) =====
exitBtn.addEventListener('click', exitGame);
exitBtn.addEventListener('touchend', (e) => {
  e.preventDefault();   // suppress the synthetic click so exitGame runs once
  exitGame();
});

// ===== Story Modal =====
const storyBackdrop = document.getElementById('storyBackdrop');
const storyClose = document.getElementById('storyClose');
const footerStoryLink = document.getElementById('footerStoryLink');

// Open state is tracked explicitly: the 'show' class is added in a rAF, which
// doesn't run in a background tab, so it can't be used to decide "is open"
let storyOpen = false;
let feedbackOpen = false;

function openStory(e) {
  if (e) e.preventDefault();
  if (storyOpen) return;
  storyOpen = true;
  storyBackdrop.style.display = 'flex';
  requestAnimationFrame(() => storyBackdrop.classList.add('show'));
  document.body.style.overflow = 'hidden';
  history.pushState({ story: true }, '', '/story');
}

if (footerStoryLink) footerStoryLink.addEventListener('click', openStory);

// ===== Hero CTA Buttons =====
const heroBrowse = document.getElementById('heroBrowse');
const heroLearnMore = document.getElementById('heroLearnMore');
if (heroBrowse) {
  heroBrowse.addEventListener('click', () => {
    document.querySelector('.games-grid').scrollIntoView({ behavior: 'smooth' });
  });
}
if (heroLearnMore) {
  heroLearnMore.addEventListener('click', openStory);
}

// `fromHistory`: popstate already left /story, don't move history again
function closeStory({ fromHistory = false } = {}) {
  if (!storyOpen) return;
  storyOpen = false;
  storyBackdrop.classList.remove('show');
  setTimeout(() => { storyBackdrop.style.display = 'none'; }, 300);
  document.body.style.overflow = '';
  if (!fromHistory) {
    if (history.state && history.state.story) history.back();
    else if (window.location.pathname === '/story') history.replaceState({}, '', '/');
  }
}

storyClose.addEventListener('click', closeStory);
storyBackdrop.addEventListener('click', (e) => {
  if (e.target === storyBackdrop) closeStory();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && storyOpen) closeStory();
  if (e.key === 'Escape' && feedbackOpen) closeFeedback();
});

// ===== Feedback Overlay =====
const fbBackdrop = document.getElementById('feedbackBackdrop');
const fbFrame = document.getElementById('feedbackFrame');
const fbClose = document.getElementById('feedbackClose');
const TYPEFORM_URL = 'https://mauroferrante85.typeform.com/to/pptDHXKN';

document.getElementById('feedbackLink').addEventListener('click', (e) => {
  e.preventDefault();
  if (feedbackOpen) return;
  feedbackOpen = true;
  fbFrame.src = TYPEFORM_URL;
  fbBackdrop.style.display = 'block';
  requestAnimationFrame(() => fbBackdrop.classList.add('show'));
  document.body.style.overflow = 'hidden';
  // Push an entry so the Back button closes the overlay instead of leaving the site
  history.pushState({ feedback: true }, '', window.location.pathname);
});

function closeFeedback({ fromHistory = false } = {}) {
  if (!feedbackOpen) return;
  feedbackOpen = false;
  fbBackdrop.classList.remove('show');
  setTimeout(() => { fbBackdrop.style.display = 'none'; fbFrame.src = ''; }, 300);
  document.body.style.overflow = '';
  if (!fromHistory && history.state && history.state.feedback) history.back();
}
fbClose.addEventListener('click', closeFeedback);
fbBackdrop.addEventListener('click', (e) => {
  if (e.target === fbBackdrop) closeFeedback();
});

// ===== Post-Game Nudge =====

function dismissNudge() {
  postgameNudge.classList.remove('show');
  setTimeout(() => { postgameNudge.style.display = 'none'; }, 300);
}

postgameNudgeClose.addEventListener('click', dismissNudge);

postgameNudgeTip.addEventListener('click', () => {
  sessionStorage.setItem('tipNudgeShown', 'true');
  trackIntent('donate');
});

postgameNudgeShare.addEventListener('click', async () => {
  trackIntent('share');
  const result = await shareOrCopy();
  if (result.method === 'copy' && result.success) {
    postgameNudgeCopied.classList.add('visible');
    setTimeout(() => postgameNudgeCopied.classList.remove('visible'), 2500);
  }
});

// ===== Global Event Listeners =====

// Keyboard — always registered. Gating on maxTouchPoints === 0 broke keyboard
// input on touchscreen laptops, Surfaces, and iPads with attached keyboards.
// (iOS never enters the Fullscreen API — see launchGame — so the Safari
// "typing in fullscreen" warning this gate guarded against can't occur there.)
document.addEventListener('keydown', (e) => {
  if (!currentGame) return;
  if (e.key === 'Escape') { exitGame(); return; }
  // Let browser shortcuts through (Cmd/Ctrl+R, F5, Cmd+F…) — a parent must be
  // able to reload while a game is up. Tab stays swallowed: Splat Keys maps it.
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  e.preventDefault();
  currentGame.onKey(e);
});

// Mouse
document.addEventListener('mousedown', (e) => {
  if (!currentGame) return;
  e.preventDefault();
  currentGame.onMouse(e);
});

// Touch
// Elements whose default touch behaviour must survive: anything bound to
// `click` (preventDefault on touchstart suppresses the synthetic click on
// iOS/Android) or that needs native scrolling. Melody Maker's lesson picker
// was missing from this list, which is why no lesson could be tapped or
// scrolled on tablets.
const TOUCH_PASSTHROUGH = [
  '#spellKeyboard', '#memoryGame',
  '#melodyKeyboard', '#melodyModeSelect', '#melodyLevelSelect', '.melody-celebrate',
  '.parade-song-select', '.parade-top-bar',
  '.endcard-share-btn', '[class*="endcard-btn"]', '[class*="btn-again"]', '[class*="btn-diff"]',
  '#postgameNudge', '#exitGame'
].join(',');

document.addEventListener('touchstart', (e) => {
  if (!currentGame) return;
  // The ✕ button has its own handler — don't also drop a block / spawn an emoji
  if (e.target.closest('#exitGame')) return;
  if (!e.target.closest(TOUCH_PASSTHROUGH)) e.preventDefault();
  currentGame.onTouch(e);
}, { passive: false });

// Cursor stays hidden in all games (#playground has cursor: none)

// Prevent context menu
document.addEventListener('contextmenu', (e) => {
  if (currentGame) e.preventDefault();
});

// Unlock & keep audio alive on every user interaction (iOS requirement)
// iOS Safari can re-suspend AudioContext after fullscreen transitions or inactivity,
// so we resume on every touch/click, not just the first one.
// touchend is included because some iOS versions only allow audio unlock on touchend.
document.addEventListener('touchstart', () => { initAudio(); });
document.addEventListener('touchend', () => { initAudio(); });
document.addEventListener('click', () => { initAudio(); });

// ===== Analytics: Virtual Page Views =====

// Track intent (donate / share) as a brief virtual page view
// The intent entry is pushed (so the analytics script sees a route change)
// and then replaced back, so it leaves the stack one entry deeper at most
// and keeps the game's history state intact for stopGame's history.back().
// A second tap inside the window used to capture /intent/… as "prev" and
// leave the URL stuck there.
let intentTimer = null;
function trackIntent(name) {
  if (intentTimer) return;
  const prevPath  = window.location.pathname;
  const prevState = history.state;
  history.pushState(prevState, '', '/intent/' + name);
  intentTimer = setTimeout(() => {
    intentTimer = null;
    if (window.location.pathname.startsWith('/intent/')) history.replaceState(prevState, '', prevPath);
  }, 600);
}

// Browser back button: exit game when user navigates back
window.addEventListener('popstate', () => {
  const path  = window.location.pathname;
  const state = history.state || {};

  if (ownBackPending) {
    // This is the echo of stopGame()'s own history.back(). The game is already
    // gone; only tidy the URL if the entry we landed on is stale.
    ownBackPending = false;
    if (!currentGame && (path.startsWith('/play/') || path.startsWith('/intent/'))) history.replaceState({}, '', '/');
    return;
  }

  if (currentGame) {
    if (!path.startsWith('/play/')) stopGame({ fromHistory: true });
    return;
  }
  // Modals: Back closes them (their open pushed a state entry)
  if (!state.story && storyOpen) closeStory({ fromHistory: true });
  if (!state.feedback && feedbackOpen) closeFeedback({ fromHistory: true });

  // No game running but the URL says otherwise (stale entry left by an
  // earlier intent ping or an old session) — normalise so the address bar
  // matches what's on screen.
  if (path.startsWith('/play/') || path.startsWith('/intent/') || (path === '/story' && !state.story)) {
    history.replaceState({}, '', '/');
  }
});

// In-game share buttons: track as /intent/share (delegated on playground)
playground.addEventListener('click', (e) => {
  if (e.target.closest('[data-share]')) trackIntent('share');
});

// Footer tip link: track as /intent/donate
const footerTip = document.getElementById('footerTip');
if (footerTip) footerTip.addEventListener('click', () => trackIntent('donate'));

// Clean URL on fresh page load — /play/ and /story paths are virtual routes
// used only for analytics (pushState), not real deep links.
// If the user refreshes mid-game, silently reset to landing.
(function cleanUrlOnLoad() {
  const path = window.location.pathname;
  if (path.startsWith('/play/') || path === '/story' || path.startsWith('/intent/')) {
    history.replaceState({}, '', '/');
  }
})();

// ===== PWA Install Prompt (Banner + Modal) =====

const pwaBanner        = document.getElementById('pwaBanner');
const pwaBannerCollapsed = document.getElementById('pwaBannerCollapsed');
const pwaBannerSteps   = document.getElementById('pwaBannerSteps');
const pwaBannerExpand  = document.getElementById('pwaBannerExpand');
// -- Landing banner (dismissible — resurfaces after 5 sessions) --
const pwaBannerClose = document.getElementById('pwaBannerClose');

// Dismissed banner resurfaces after 5 page loads: trackSession() (run on
// every load) counts them and clears the dismissal at 5, so by the time
// shouldShowBanner() runs, "dismissed" alone is the answer.
function shouldShowBanner() {
  return !local.getInt('pwa-banner-dismissed');
}

function trackSession() {
  if (!local.getInt('pwa-banner-dismissed')) return;
  const sessions = local.getInt('pwa-banner-sessions') + 1;
  local.set('pwa-banner-sessions', sessions);
  if (sessions >= 5) {
    local.remove('pwa-banner-dismissed');
    local.remove('pwa-banner-sessions');
  }
}
trackSession();

function hidePwaBanner() {
  pwaBanner.style.display = 'none';
  document.body.classList.remove('pwa-banner-visible', 'pwa-banner-expanded');
}

// Collapse the install steps (used when returning from a game). Resets the
// toggle label too — it used to stay on "Hide ▴" with the steps collapsed.
function collapsePwaBanner() {
  if (!pwaBanner || pwaBanner.style.display === 'none') return;
  pwaBannerSteps.classList.remove('expanded');
  document.body.classList.remove('pwa-banner-expanded');
  pwaBannerExpand.style.display = '';
  if (!deferredAndroidPrompt) pwaBannerExpand.textContent = 'Learn how ▾';
}

if (pwaBannerClose) {
  pwaBannerClose.addEventListener('click', () => {
    hidePwaBanner();
    local.set('pwa-banner-dismissed', '1');
    local.set('pwa-banner-sessions', '0');
  });
}

function initPwaBanner() {
  if (isStandalone) return;
  if (!shouldShowBanner()) return;

  if (isIOSSafari) {
    pwaBanner.style.display = '';
  } else if (isMacSafari) {
    pwaBanner.style.display = '';
    document.querySelectorAll('.pwa-verb').forEach(el => { el.textContent = 'Click'; });
    document.querySelectorAll('.pwa-step2-label').forEach(el => { el.textContent = 'Add to Dock'; });
  } else if (isIOS) {
    // Non-Safari iOS browser (Brave, Chrome, Firefox, etc.)
    // Prepend a "switch to Safari" step and renumber existing steps
    const safariStep = document.createElement('div');
    safariStep.className = 'pwa-step';
    safariStep.innerHTML =
      '<span class="pwa-step-num">1</span>' +
      '<span>Open <strong>tinyhandsplay.com</strong> in <strong>Safari</strong></span>';
    pwaBannerSteps.insertBefore(safariStep, pwaBannerSteps.firstChild);
    // Renumber existing steps to 2 and 3
    const existingNums = pwaBannerSteps.querySelectorAll('.pwa-step-num');
    existingNums[1].textContent = '2';
    existingNums[2].textContent = '3';
    pwaBanner.style.display = '';
  } else if (deferredAndroidPrompt) {
    pwaBanner.style.display = '';
    pwaBannerExpand.textContent = 'Install';
  }
  // Footer bottom padding is reserved via this class only while the banner shows
  if (pwaBanner.style.display !== 'none') {
    document.body.classList.add('pwa-banner-visible');
  }
}

pwaBannerExpand.addEventListener('click', () => {
  if (deferredAndroidPrompt) {
    triggerAndroidInstall();
    return;
  }
  const isExpanded = pwaBannerSteps.classList.toggle('expanded');
  // Grow the footer clearance so the expanded banner can't hide the footer links
  document.body.classList.toggle('pwa-banner-expanded', isExpanded);
  pwaBannerExpand.textContent = isExpanded ? 'Hide ▴' : 'Learn how ▾';
});

// -- Android beforeinstallprompt --

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredAndroidPrompt = e;
  initPwaBanner();
});

function triggerAndroidInstall() {
  if (deferredAndroidPrompt) {
    deferredAndroidPrompt.prompt();
    deferredAndroidPrompt.userChoice.then(() => {
      deferredAndroidPrompt = null;
      hidePwaBanner();   // also drops the body classes that reserve footer padding
    });
  }
}

// Init banner on page load
// Safari + non-Safari iOS show immediately; Android waits for beforeinstallprompt
if (isSafari || isIOS) initPwaBanner();
