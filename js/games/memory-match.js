/* =========================================================
 *  Memory Match — Emoji Memory Card Game
 * ========================================================= */

import { playCardFlip, playMatchChime, playNoMatchBoop,
         playCardSettle, playWinFanfare } from '../audio.js';
import { spawnParticles } from '../effects.js';
import { shareOrCopy } from '../share.js';

// ---- Difficulty configs ----
const DIFFICULTIES = {
  easy:   { cols: 4, rows: 3, pairs: 6 },
  medium: { cols: 6, rows: 4, pairs: 12 },
  hard:   { cols: 6, rows: 6, pairs: 18 }
};

// ---- 36 distinct emojis ----
const EMOJI_POOL = [
  '\u{1F436}','\u{1F431}','\u{1F438}','\u{1F981}','\u{1F43C}','\u{1F428}',
  '\u{1F437}','\u{1F42E}','\u{1F414}','\u{1F98A}','\u{1F419}','\u{1F98B}',
  '\u{1F308}','\u{1F33B}','\u{1F34E}','\u{1F355}','\u{1F680}','\u{2B50}',
  '\u{1F388}','\u{1F3B8}','\u{1F3C0}','\u{1F382}','\u{1F319}','\u{2764}\u{FE0F}',
  '\u{1F984}','\u{1F433}','\u{1F422}','\u{1F369}','\u{1F514}','\u{1F3AF}',
  '\u{1F9F8}','\u{1F41D}','\u{1F349}','\u{1F9A9}','\u{1F3AA}','\u{1F3C6}'
];

// ---- localStorage ----
const LS_PREFIX = 'tinyhandsplay-memory';

// ---- DOM refs ----
const memoryGameEl      = document.getElementById('memoryGame');
const memoryDiffEl      = document.getElementById('memoryDifficulty');
const memoryBoardEl     = document.getElementById('memoryBoard');
const memoryHudEl       = document.getElementById('memoryHud');
const memoryFlipsEl     = document.getElementById('memoryFlips');
const memoryPairsEl     = document.getElementById('memoryPairs');
const memoryTimeEl      = document.getElementById('memoryTime');
const memoryCelebrateEl = document.getElementById('memoryCelebrate');

// ---- Game state ----
let currentDifficulty = null;
let cards = [];
let flippedCards = [];
let matchedCount = 0;
let totalPairs = 0;
let flipCount = 0;
let timerStart = null;
let timerInterval = null;
let elapsedSeconds = 0;
let isProcessing = false;
let gameActive = false;

// ===== Utilities =====

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function lsKey(diff, metric) {
  return `${LS_PREFIX}-${diff}-${metric}`;
}

function getBest(diff) {
  return {
    flips: parseInt(localStorage.getItem(lsKey(diff, 'flips')) || '0', 10),
    time:  parseInt(localStorage.getItem(lsKey(diff, 'time'))  || '0', 10)
  };
}

function saveBest(diff, flips, time) {
  const prev = getBest(diff);
  let isNew = false;
  if (prev.flips === 0 || flips < prev.flips) {
    try { localStorage.setItem(lsKey(diff, 'flips'), String(flips)); } catch (e) {}
    isNew = true;
  }
  if (prev.time === 0 || time < prev.time) {
    try { localStorage.setItem(lsKey(diff, 'time'), String(time)); } catch (e) {}
    isNew = true;
  }
  return isNew;
}

function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ===== Difficulty Picker =====

function showDifficultyPicker() {
  memoryDiffEl.style.display = 'flex';
  memoryBoardEl.style.display = 'none';
  memoryHudEl.style.display = 'none';
  memoryCelebrateEl.classList.remove('show');
  memoryCelebrateEl.innerHTML = '';

  ['easy', 'medium', 'hard'].forEach(diff => {
    const best = getBest(diff);
    const el = document.getElementById('memoryBest' + diff.charAt(0).toUpperCase() + diff.slice(1));
    if (el) {
      el.textContent = best.flips > 0
        ? `Best: ${best.flips} flips, ${fmt(best.time)}`
        : '';
    }
  });
}

function onDifficultyClick(e) {
  const btn = e.target.closest('.memory-diff-btn');
  if (!btn) return;
  const diff = btn.dataset.diff;
  if (diff && DIFFICULTIES[diff]) startRound(diff);
}

// ===== Core Game =====

function startRound(difficulty) {
  currentDifficulty = difficulty;
  const cfg = DIFFICULTIES[difficulty];
  totalPairs = cfg.pairs;
  matchedCount = 0;
  flipCount = 0;
  elapsedSeconds = 0;
  timerStart = null;
  flippedCards = [];
  isProcessing = false;

  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

  // UI
  memoryDiffEl.style.display = 'none';
  memoryBoardEl.style.display = 'grid';
  memoryHudEl.style.display = 'flex';
  memoryCelebrateEl.classList.remove('show');
  memoryCelebrateEl.innerHTML = '';

  memoryFlipsEl.textContent = 'Flips: 0';
  memoryPairsEl.textContent = `0 / ${totalPairs}`;
  memoryTimeEl.textContent = '0:00';

  // Grid config
  memoryBoardEl.style.setProperty('--cols', cfg.cols);
  memoryBoardEl.style.setProperty('--rows', cfg.rows);
  memoryBoardEl.className = `memory-board memory-${difficulty}`;

  // Pick & shuffle emojis
  const picked = shuffle(EMOJI_POOL).slice(0, totalPairs);
  const cardData = shuffle([...picked, ...picked]);

  // Build DOM
  memoryBoardEl.innerHTML = '';
  cards = cardData.map((emoji, i) => {
    const el = document.createElement('div');
    el.className = 'memory-card';
    el.dataset.index = i;
    el.style.animationDelay = `${i * 25}ms`;
    el.innerHTML =
      '<div class="memory-card-inner">' +
        '<div class="memory-card-back"></div>' +
        '<div class="memory-card-front"><span>' + emoji + '</span></div>' +
      '</div>';
    memoryBoardEl.appendChild(el);
    return { emoji, index: i, matched: false, element: el };
  });

  // Trigger deal animation + staggered deal sounds
  requestAnimationFrame(() => {
    memoryBoardEl.classList.add('memory-dealt');
    // Play a settle sound per card as each one lands
    cards.forEach((_, i) => {
      setTimeout(() => playCardSettle(), i * 25 + 300);
    });
  });
}

function flipCard(index) {
  if (!gameActive || isProcessing) return;

  const card = cards[index];
  if (!card || card.matched) return;
  if (flippedCards.includes(card)) return;
  if (flippedCards.length >= 2) return;

  card.element.classList.add('flipped');
  playCardFlip();
  flippedCards.push(card);

  // Start timer on very first flip
  if (!timerStart) {
    timerStart = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
  }

  if (flippedCards.length === 2) {
    flipCount++;
    memoryFlipsEl.textContent = `Flips: ${flipCount}`;
    isProcessing = true;
    evaluatePair();
  }
}

function evaluatePair() {
  const [a, b] = flippedCards;

  if (a.emoji === b.emoji) {
    // Match!
    setTimeout(() => {
      a.matched = true;
      b.matched = true;
      a.element.classList.add('matched');
      b.element.classList.add('matched');
      playMatchChime();

      [a, b].forEach(c => {
        const rect = c.element.getBoundingClientRect();
        const gameRect = memoryGameEl.getBoundingClientRect();
        spawnParticles(
          rect.left - gameRect.left + rect.width / 2,
          rect.top  - gameRect.top  + rect.height / 2,
          memoryGameEl
        );
      });

      matchedCount++;
      memoryPairsEl.textContent = `${matchedCount} / ${totalPairs}`;
      flippedCards = [];
      isProcessing = false;

      if (matchedCount === totalPairs) triggerWin();
    }, 400);
  } else {
    // No match
    playNoMatchBoop();
    setTimeout(() => {
      a.element.classList.remove('flipped');
      b.element.classList.remove('flipped');
      playCardSettle();
      flippedCards = [];
      isProcessing = false;
    }, 1000);
  }
}

function updateTimer() {
  if (!timerStart) return;
  elapsedSeconds = Math.floor((Date.now() - timerStart) / 1000);
  memoryTimeEl.textContent = fmt(elapsedSeconds);
}

// ===== Win =====

function triggerWin() {
  gameActive = false;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  elapsedSeconds = Math.floor((Date.now() - timerStart) / 1000);
  memoryTimeEl.textContent = fmt(elapsedSeconds);

  playWinFanfare();

  // Pulse all cards
  cards.forEach((card, i) => {
    setTimeout(() => card.element.classList.add('memory-win-pulse'), i * 40);
  });

  // Confetti
  spawnWinConfetti();

  // Save & check best
  const isNewBest = saveBest(currentDifficulty, flipCount, elapsedSeconds);
  const best = getBest(currentDifficulty);

  // Show win overlay
  const delay = cards.length * 40 + 600;
  setTimeout(() => {
    memoryCelebrateEl.innerHTML =
      '<div class="memory-endcard">' +
        '<div class="memory-endcard-emoji">\u{1F389}</div>' +
        '<div class="memory-endcard-title">You found them all!</div>' +
        '<div class="memory-endcard-stats">' +
          '<span>\u{23F1} ' + fmt(elapsedSeconds) + '</span>' +
          '<span>\u{1F504} ' + flipCount + ' flips</span>' +
        '</div>' +
        (isNewBest
          ? '<div class="memory-endcard-best">\u{1F3C6} New Best!</div>'
          : (best.flips > 0
              ? '<div class="memory-endcard-best-small">Best: ' + best.flips + ' flips, ' + fmt(best.time) + '</div>'
              : '')) +
        '<div class="memory-endcard-actions">' +
          '<button class="memory-endcard-btn memory-btn-again">Play Again</button>' +
          '<button class="memory-endcard-btn memory-btn-diff">Change Difficulty</button>' +
        '</div>' +
        '<button class="endcard-share-btn" data-share>\u{1F4E4} Share with a parent</button>' +
      '</div>';

    memoryCelebrateEl.classList.add('show');

    // Wire buttons
    const againBtn = memoryCelebrateEl.querySelector('.memory-btn-again');
    if (againBtn) againBtn.addEventListener('click', () => startRound(currentDifficulty));

    const diffBtn = memoryCelebrateEl.querySelector('.memory-btn-diff');
    if (diffBtn) diffBtn.addEventListener('click', () => showDifficultyPicker());

    wireShare(memoryCelebrateEl);
  }, delay);
}

function wireShare(container) {
  const btn = container.querySelector('[data-share]');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const result = await shareOrCopy();
    if (result.method === 'copy' && result.success) {
      btn.textContent = '\u{2705} Copied!';
      setTimeout(() => { btn.textContent = '\u{1F4E4} Share with a parent'; }, 2500);
    }
  });
  btn.addEventListener('touchend', (e) => e.stopPropagation());
}

function spawnWinConfetti() {
  const emojis = ['\u{1F389}', '\u{1F38A}', '\u{2B50}', '\u{2728}', '\u{1F31F}', '\u{1F4AB}', '\u{1F3C6}'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('span');
    el.className = 'memory-confetti';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = (Math.random() * 100) + '%';
    el.style.top = '-40px';
    el.style.fontSize = (1 + Math.random() * 1.5) + 'rem';
    el.style.setProperty('--fall-dist', (window.innerHeight + 80) + 'px');
    el.style.setProperty('--fall-rot', (Math.random() * 720 - 360) + 'deg');
    el.style.setProperty('--fall-dur', (2 + Math.random() * 2) + 's');
    el.style.setProperty('--sway', (Math.random() * 100 - 50) + 'px');
    el.style.animationDelay = (Math.random() * 1.5) + 's';
    memoryGameEl.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ===== Input handler (delegated) =====

function handleCardTap(e) {
  const cardEl = e.target.closest('.memory-card');
  if (!cardEl) return;
  const idx = parseInt(cardEl.dataset.index, 10);
  if (!isNaN(idx)) flipCard(idx);
}

// ===== Cleanup =====

function cleanup() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  gameActive = false;
  cards = [];
  flippedCards = [];
  isProcessing = false;
  timerStart = null;
  currentDifficulty = null;
  matchedCount = 0;
  flipCount = 0;
  elapsedSeconds = 0;

  memoryBoardEl.innerHTML = '';
  memoryBoardEl.className = 'memory-board';
  memoryCelebrateEl.classList.remove('show');
  memoryCelebrateEl.innerHTML = '';
  memoryHudEl.style.display = 'none';
  memoryDiffEl.style.display = 'none';

  memoryDiffEl.removeEventListener('click', onDifficultyClick);
  memoryBoardEl.removeEventListener('click', handleCardTap);

  memoryGameEl.querySelectorAll('.memory-confetti, .particle').forEach(el => el.remove());
}

// ===== Exported game object =====

export const memoryMatch = {
  id: 'memory-match',

  start() {
    memoryGameEl.style.display = 'block';
    gameActive = true;

    memoryDiffEl.addEventListener('click', onDifficultyClick);
    memoryBoardEl.addEventListener('click', handleCardTap);

    showDifficultyPicker();
  },

  stop() {
    memoryGameEl.style.display = 'none';
    cleanup();
  },

  onKey(e) {
    // Space/Enter to replay on win screen
    if (!gameActive && memoryCelebrateEl.classList.contains('show')) {
      if (e.key === ' ' || e.key === 'Enter') {
        startRound(currentDifficulty || 'easy');
      }
    }
  },

  onMouse() {},
  onTouch() {}
};
