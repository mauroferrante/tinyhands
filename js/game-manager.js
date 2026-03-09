/* =========================================================
 *  Tiny Hands Play — Game Manager (Entry Point)
 * ========================================================= */

import { initAudio, playFanfare, playBubblePop } from './audio.js';
import { EMOJIS, createBgEmojis } from './effects.js';
import { splatKeys } from './games/splat-keys.js';
import { stackSmash } from './games/stack-smash.js';
import { spellItOut } from './games/spell-it-out.js';
import { memoryMatch } from './games/memory-match.js';
import { balloonFloat } from './games/balloon-float.js';
import { rocketRide } from './games/rocket-ride.js';
import { ballBonanza } from './games/ball-bonanza.js';
import { tinyTown } from './games/tiny-town.js';
import { shareOrCopy } from './share.js';

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

// ---- Shared state ----
let currentGame     = null;
let pendingGame     = null;

// ---- Game Registry ----
const GAMES = {
  'splat-keys': splatKeys,
  'stack-smash': stackSmash,
  'spell-it-out': spellItOut,
  'memory-match': memoryMatch,
  'balloon-float': balloonFloat,
  'rocket-ride': rocketRide,
  'ball-bonanza': ballBonanza,
  'tiny-town': tinyTown
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
    em.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
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
  initAudio();
  const game = GAMES[gameId];
  if (!game) return;
  pendingGame = game;

  playEntryAnimation(btn, () => {
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
    if (rfs) {
      rfs.call(el).then(() => {
        if (!currentGame && pendingGame) {
          startGame(pendingGame);
          pendingGame = null;
        }
      }).catch(() => {
        if (pendingGame) startGame(pendingGame);
        pendingGame = null;
      });
    } else {
      startGame(pendingGame);
      pendingGame = null;
    }
  });
}

function startGame(game) {
  currentGame = game;
  landing.style.display = 'none';
  playground.style.display = 'block';
  document.body.classList.add('game-active');

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

function stopGame() {
  if (!currentGame) return;

  currentGame.stop();
  currentGame = null;

  playground.style.display = 'none';
  landing.style.display = 'flex';
  document.body.classList.remove('game-active');

  // Force header visible — CSS animation with 'forwards' won't replay after
  // display:none toggle in Safari, leaving the header stuck at opacity:0.
  // Re-trigger the animation by removing and re-adding it.
  const header = landing.querySelector('header');
  if (header) {
    header.style.animation = 'none';
    void header.offsetWidth;              // force reflow
    header.style.animation = '';          // restore CSS animation
  }

  playground.querySelectorAll('.particle').forEach(p => p.remove());

  // Show post-game nudge once per session after first game exit
  if (!sessionStorage.getItem('tipNudgeShown')) {
    sessionStorage.setItem('tipNudgeShown', 'true');
    setTimeout(() => {
      postgameNudge.style.display = 'flex';
      requestAnimationFrame(() => postgameNudge.classList.add('show'));
    }, 1000);
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
document.querySelectorAll('.game-card').forEach((card, i) => {
  card.addEventListener('animationend', () => playBubblePop(i), { once: true });
});

// ===== Play buttons launch games =====
document.querySelectorAll('.play-btn[data-game]').forEach(btn => {
  btn.addEventListener('click', () => launchGame(btn.dataset.game, btn));
  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    launchGame(btn.dataset.game, btn);
  });
});

// ===== Exit Button (touch + desktop) =====
exitBtn.addEventListener('click', () => {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    stopGame();
  }
});
exitBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    stopGame();
  }
});

// ===== Story Modal =====
const storyBackdrop = document.getElementById('storyBackdrop');
const storyClose = document.getElementById('storyClose');
const whyLink = document.getElementById('whyLink');

whyLink.addEventListener('click', () => {
  storyBackdrop.style.display = 'flex';
  requestAnimationFrame(() => storyBackdrop.classList.add('show'));
  document.body.style.overflow = 'hidden';
});

function closeStory() {
  storyBackdrop.classList.remove('show');
  setTimeout(() => { storyBackdrop.style.display = 'none'; }, 300);
  document.body.style.overflow = '';
}

storyClose.addEventListener('click', closeStory);
storyBackdrop.addEventListener('click', (e) => {
  if (e.target === storyBackdrop) closeStory();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && storyBackdrop.classList.contains('show')) closeStory();
});

// ===== Post-Game Nudge =====

function dismissNudge() {
  postgameNudge.classList.remove('show');
  setTimeout(() => { postgameNudge.style.display = 'none'; }, 300);
}

postgameNudgeClose.addEventListener('click', dismissNudge);

postgameNudgeTip.addEventListener('click', () => {
  sessionStorage.setItem('tipNudgeShown', 'true');
});

postgameNudgeShare.addEventListener('click', async () => {
  const result = await shareOrCopy();
  if (result.method === 'copy' && result.success) {
    postgameNudgeCopied.classList.add('visible');
    setTimeout(() => postgameNudgeCopied.classList.remove('visible'), 2500);
  }
});

// ===== Global Event Listeners =====

// Keyboard — disabled on touch devices to avoid Safari fullscreen typing warning
if (navigator.maxTouchPoints === 0) {
  document.addEventListener('keydown', (e) => {
    if (!currentGame) return;
    if (e.key !== 'Escape') e.preventDefault();
    currentGame.onKey(e);
  });
}

// Mouse
document.addEventListener('mousedown', (e) => {
  if (!currentGame) return;
  e.preventDefault();
  currentGame.onMouse(e);
});

// Touch
document.addEventListener('touchstart', (e) => {
  if (!currentGame) return;
  // Don't preventDefault on elements that need click events to fire
  if (!e.target.closest('#spellKeyboard') && !e.target.closest('#memoryGame') && !e.target.closest('.endcard-share-btn') && !e.target.closest('#postgameNudge')) {
    e.preventDefault();
  }
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
