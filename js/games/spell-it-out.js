/* =========================================================
 *  Spell It Out — Emoji Spelling Game
 *  Find the missing letter in each emoji word!
 * ========================================================= */

import { playCorrectDing, playWrongBoop, playLifeLost, playSpellWhoosh,
         playWinFanfare, playStreakChime } from '../audio.js';
import { spawnParticles } from '../effects.js';

// ---- Word Pool ----
const WORD_POOL = [
  // 3-letter words
  { emoji: '🐱', word: 'CAT' },
  { emoji: '🐶', word: 'DOG' },
  { emoji: '🐷', word: 'PIG' },
  { emoji: '🐮', word: 'COW' },
  { emoji: '🐝', word: 'BEE' },
  { emoji: '🐜', word: 'ANT' },
  { emoji: '🦇', word: 'BAT' },
  { emoji: '🐛', word: 'CATERPILLAR' },
  { emoji: '🦊', word: 'FOX' },
  { emoji: '🐔', word: 'HEN' },
  { emoji: '🦉', word: 'OWL' },
  { emoji: '🐀', word: 'RAT' },
  { emoji: '☀️', word: 'SUN' },
  { emoji: '🌙', word: 'MOON' },
  { emoji: '⭐', word: 'STAR' },
  { emoji: '🚗', word: 'CAR' },
  { emoji: '🚌', word: 'BUS' },
  { emoji: '🧢', word: 'CAP' },
  { emoji: '🎩', word: 'HAT' },
  { emoji: '👁️', word: 'EYE' },
  { emoji: '🏺', word: 'AMPHORA' },
  { emoji: '🗝️', word: 'KEY' },
  { emoji: '🥛', word: 'MILK' },
  { emoji: '🥜', word: 'PEANUTS' },
  { emoji: '🥧', word: 'PIE' },
  { emoji: '🏃', word: 'RUN' },

  // 4-letter words
  { emoji: '🐸', word: 'FROG' },
  { emoji: '🐻', word: 'BEAR' },
  { emoji: '🦁', word: 'LION' },
  { emoji: '🐟', word: 'FISH' },
  { emoji: '🐦', word: 'BIRD' },
  { emoji: '🦀', word: 'CRAB' },
  { emoji: '🦆', word: 'DUCK' },
  { emoji: '🐐', word: 'GOAT' },
  { emoji: '🦈', word: 'SHARK' },
  { emoji: '🐍', word: 'SNAKE' },
  { emoji: '🐌', word: 'SNAIL' },
  { emoji: '🌲', word: 'TREE' },
  { emoji: '🌹', word: 'ROSE' },
  { emoji: '🍎', word: 'APPLE' },
  { emoji: '🍌', word: 'BANANA' },
  { emoji: '🍇', word: 'GRAPE' },
  { emoji: '🍋', word: 'LEMON' },
  { emoji: '🍊', word: 'ORANGE' },
  { emoji: '🍑', word: 'PEACH' },
  { emoji: '🍐', word: 'PEAR' },
  { emoji: '🍕', word: 'PIZZA' },
  { emoji: '🌮', word: 'TACO' },
  { emoji: '🍪', word: 'COOKIE' },
  { emoji: '🎂', word: 'CAKE' },
  { emoji: '🍩', word: 'DONUT' },
  { emoji: '🏠', word: 'HOUSE' },
  { emoji: '🚪', word: 'DOOR' },
  { emoji: '📚', word: 'BOOKS' },
  { emoji: '🔔', word: 'BELL' },
  { emoji: '👑', word: 'CROWN' },
  { emoji: '🎸', word: 'GUITAR' },
  { emoji: '🎹', word: 'KEYBOARD' },
  { emoji: '🥁', word: 'DRUM' },
  { emoji: '⚽', word: 'BALL' },
  { emoji: '🏈', word: 'FOOTBALL' },
  { emoji: '🎾', word: 'TENNIS' },
  { emoji: '🚀', word: 'ROCKET' },
  { emoji: '✈️', word: 'PLANE' },
  { emoji: '🚂', word: 'TRAIN' },
  { emoji: '🚢', word: 'SHIP' },
  { emoji: '🚲', word: 'BIKE' },
  { emoji: '🌊', word: 'WAVE' },
  { emoji: '🔥', word: 'FIRE' },
  { emoji: '❄️', word: 'SNOW' },
  { emoji: '🌧️', word: 'RAIN' },
  { emoji: '⛈️', word: 'STORM' },
  { emoji: '🌈', word: 'RAINBOW' },
  { emoji: '🎃', word: 'PUMPKIN' },
  { emoji: '🌻', word: 'FLOWER' },
  { emoji: '🦋', word: 'BUTTERFLY' },
  { emoji: '🐢', word: 'TURTLE' },
  { emoji: '🐵', word: 'MONKEY' },
  { emoji: '🐧', word: 'PENGUIN' },
  { emoji: '🦄', word: 'UNICORN' },
  { emoji: '🐉', word: 'DRAGON' },
  { emoji: '🐘', word: 'ELEPHANT' },
  { emoji: '🦒', word: 'GIRAFFE' },
  { emoji: '🐊', word: 'CROCODILE' },
  { emoji: '🧀', word: 'CHEESE' },
  { emoji: '🍀', word: 'CLOVER' },
];

// ---- Encouragement messages ----
const ENCOURAGEMENTS = [
  'Almost!', 'Not quite!', 'Try next one!', 'Keep going!',
  'You got this!', 'Good try!', 'So close!'
];

// ---- DOM references ----
const spellGameEl = document.getElementById('spellGame');
const spellLivesEl = document.getElementById('spellLives');
const spellScoreBarEl = document.getElementById('spellScoreBar');
const spellEmojiEl = document.getElementById('spellEmoji');
const spellTilesEl = document.getElementById('spellTiles');
const spellFeedbackEl = document.getElementById('spellFeedback');
const spellKeyboardEl = document.getElementById('spellKeyboard');
const spellCelebrateEl = document.getElementById('spellCelebrate');
const spellHintEl = document.getElementById('spellHint');

// ---- Palette for tile backgrounds ----
const TILE_COLORS = [
  '#FF6B8A', '#7C5CFC', '#FFB347', '#4ECDC4',
  '#FF85A1', '#FFC75F', '#845EC2', '#00C9A7'
];

// ---- Game State ----
const LS_KEY = 'tinyhandsplay-spell-best';
let shuffledPool = [];
let currentIndex = 0;
let currentWord = null;
let blankIndex = -1;
let lives = 3;
let score = 0;
let streak = 0;
let bestScore = 0;
let gameState = 'idle'; // idle | playing | paused | gameover | won
let answered = false;
let nextWordTimer = null;
let isTouchDevice = false;

// ---- Utilities ----

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shufflePool() {
  shuffledPool = shuffleArray(WORD_POOL);
  currentIndex = 0;
}

function randomEncouragement() {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

// ---- UI Updates ----

function updateLives() {
  spellLivesEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement('span');
    heart.className = 'spell-heart';
    heart.textContent = i < lives ? '❤️' : '🤍';
    if (i >= lives) heart.classList.add('lost');
    spellLivesEl.appendChild(heart);
  }
}

function updateScoreBar() {
  const bestDisplay = bestScore > 0 ? ` · Best: ${bestScore}` : '';
  spellScoreBarEl.textContent = `Score: ${score}${bestDisplay}`;
}

function checkHighScore() {
  if (score > bestScore) {
    bestScore = score;
    try { localStorage.setItem(LS_KEY, String(bestScore)); } catch (e) {}
    updateScoreBar();
  }
}

// ---- Core Game Logic ----

function showNextWord() {
  if (nextWordTimer) { clearTimeout(nextWordTimer); nextWordTimer = null; }

  if (currentIndex >= shuffledPool.length) {
    triggerWin();
    return;
  }

  currentWord = shuffledPool[currentIndex++];
  blankIndex = Math.floor(Math.random() * currentWord.word.length);
  answered = false;

  // Clear feedback
  spellFeedbackEl.textContent = '';
  spellFeedbackEl.className = 'spell-feedback';

  // Animate emoji
  spellEmojiEl.textContent = currentWord.emoji;
  spellEmojiEl.classList.remove('spell-emoji-enter');
  void spellEmojiEl.offsetWidth; // force reflow
  spellEmojiEl.classList.add('spell-emoji-enter');

  // Build tiles
  buildTiles();

  // Whoosh sound
  playSpellWhoosh();

  // Hide hint after first word
  if (currentIndex > 1) {
    spellHintEl.style.opacity = '0';
  }

  // Re-enable all keyboard keys
  enableAllKeys();
}

function buildTiles() {
  // Slide out old tiles
  spellTilesEl.classList.add('spell-tiles-exit');

  setTimeout(() => {
    spellTilesEl.innerHTML = '';
    spellTilesEl.classList.remove('spell-tiles-exit');
    spellTilesEl.classList.add('spell-tiles-enter');

    const colorIdx = Math.floor(Math.random() * TILE_COLORS.length);

    for (let i = 0; i < currentWord.word.length; i++) {
      const tile = document.createElement('span');
      tile.className = 'spell-tile';
      tile.dataset.index = i;

      if (i === blankIndex) {
        tile.classList.add('spell-blank');
        tile.textContent = '?';
      } else {
        tile.textContent = currentWord.word[i];
        tile.style.backgroundColor = TILE_COLORS[(colorIdx + i) % TILE_COLORS.length];
      }

      // Stagger entrance
      tile.style.animationDelay = (i * 0.06) + 's';
      spellTilesEl.appendChild(tile);
    }

    setTimeout(() => {
      spellTilesEl.classList.remove('spell-tiles-enter');
    }, 400);
  }, currentIndex > 1 ? 300 : 0); // skip exit animation for first word
}

function handleGuess(letter) {
  if (answered || gameState !== 'playing') return;
  answered = true;

  const correctLetter = currentWord.word[blankIndex];
  const blankTile = spellTilesEl.querySelector('.spell-blank');

  if (letter === correctLetter) {
    handleCorrect(blankTile, letter);
  } else {
    handleWrong(blankTile, letter);
  }
}

function handleCorrect(blankTile, letter) {
  // Fill in the blank
  blankTile.textContent = letter;
  blankTile.classList.remove('spell-blank');
  blankTile.classList.add('spell-correct');

  // Color it
  const colorIdx = Math.floor(Math.random() * TILE_COLORS.length);
  blankTile.style.backgroundColor = TILE_COLORS[colorIdx];

  // Sound
  playCorrectDing();

  // Particles
  const rect = blankTile.getBoundingClientRect();
  const gameRect = spellGameEl.getBoundingClientRect();
  spawnParticles(
    rect.left - gameRect.left + rect.width / 2,
    rect.top - gameRect.top + rect.height / 2,
    spellGameEl
  );

  // Score
  score++;
  streak++;
  updateScoreBar();

  // Streak milestone
  if (streak > 0 && streak % 5 === 0) {
    playStreakChime();
    showFeedback(`🔥 ${streak} in a row!`, 'streak');
  } else {
    showFeedback('✨ Correct!', 'correct');
  }

  checkHighScore();

  // Disable guessed key
  disableKey(letter);

  // Next word after delay
  nextWordTimer = setTimeout(() => showNextWord(), 1800);
}

function handleWrong(blankTile, letter) {
  // Show wrong letter briefly
  blankTile.textContent = letter;
  blankTile.classList.remove('spell-blank');
  blankTile.classList.add('spell-wrong');

  // Sound
  playWrongBoop();

  // Encouragement
  showFeedback(randomEncouragement(), 'wrong');

  // Disable the wrong key
  disableKey(letter);

  // Reset streak
  streak = 0;

  // After delay, reveal correct letter
  setTimeout(() => {
    blankTile.textContent = currentWord.word[blankIndex];
    blankTile.classList.remove('spell-wrong');
    blankTile.classList.add('spell-revealed');

    // Life lost
    playLifeLost();
    lives--;
    animateHeartLost();

    if (lives <= 0) {
      nextWordTimer = setTimeout(() => triggerGameOver(), 2500);
    } else {
      nextWordTimer = setTimeout(() => showNextWord(), 2500);
    }
  }, 800);
}

function showFeedback(text, type) {
  spellFeedbackEl.textContent = text;
  spellFeedbackEl.className = 'spell-feedback spell-feedback-' + type;
  spellFeedbackEl.classList.add('spell-feedback-show');
}

function animateHeartLost() {
  const hearts = spellLivesEl.querySelectorAll('.spell-heart');
  // lives has already been decremented, so current lives = index of heart to remove
  const heartToRemove = hearts[lives];
  if (heartToRemove) {
    heartToRemove.classList.add('spell-heart-breaking');
    setTimeout(() => {
      heartToRemove.textContent = '🤍';
      heartToRemove.classList.add('lost');
      heartToRemove.classList.remove('spell-heart-breaking');
    }, 500);
  }
}

// ---- Game Over / Win ----

function triggerGameOver() {
  gameState = 'gameover';

  const isNewBest = score >= bestScore && score > 0;
  if (isNewBest) checkHighScore();

  spellCelebrateEl.innerHTML = `
    <div class="spell-endcard">
      <div class="spell-endcard-emoji">😅</div>
      <div class="spell-endcard-title">Game Over!</div>
      <div class="spell-endcard-score">Score: ${score}</div>
      ${isNewBest ? '<div class="spell-endcard-best">🏆 New Best!</div>' :
        bestScore > 0 ? `<div class="spell-endcard-best-small">Best: ${bestScore}</div>` : ''}
      <div class="spell-endcard-restart">Tap or press Space to play again</div>
    </div>
  `;
  spellCelebrateEl.classList.add('show');
}

function triggerWin() {
  gameState = 'won';
  checkHighScore();

  playWinFanfare();
  spawnWinConfetti();

  spellCelebrateEl.innerHTML = `
    <div class="spell-endcard">
      <div class="spell-endcard-emoji">🏆</div>
      <div class="spell-endcard-title">You spelled them ALL!</div>
      <div class="spell-endcard-score">Score: ${score} / ${WORD_POOL.length}</div>
      <div class="spell-endcard-best">Amazing! 🎉</div>
      <div class="spell-endcard-restart">Tap or press Space to play again</div>
    </div>
  `;
  spellCelebrateEl.classList.add('show');
}

function spawnWinConfetti() {
  const confettiEmojis = ['🎉', '🎊', '⭐', '✨', '🌟', '💫', '🏆'];
  for (let i = 0; i < 30; i++) {
    const conf = document.createElement('span');
    conf.className = 'spell-confetti';
    conf.textContent = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
    conf.style.left = (Math.random() * 100) + '%';
    conf.style.top = '-40px';
    conf.style.fontSize = (1 + Math.random() * 1.5) + 'rem';
    conf.style.setProperty('--fall-dist', (window.innerHeight + 80) + 'px');
    conf.style.setProperty('--fall-rot', (Math.random() * 720 - 360) + 'deg');
    conf.style.setProperty('--fall-dur', (2 + Math.random() * 2) + 's');
    conf.style.setProperty('--sway', (Math.random() * 100 - 50) + 'px');
    conf.style.animationDelay = (Math.random() * 1.5) + 's';
    spellGameEl.appendChild(conf);
    conf.addEventListener('animationend', () => conf.remove());
  }
}

// ---- Mobile Keyboard ----

function buildMobileKeyboard() {
  isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice) {
    spellKeyboardEl.style.display = 'none';
    return;
  }

  spellKeyboardEl.innerHTML = '';
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

  rows.forEach((row, rowIdx) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'spell-key-row';

    for (const ch of row) {
      const btn = document.createElement('button');
      btn.className = 'spell-key';
      btn.textContent = ch;
      btn.dataset.letter = ch;
      rowDiv.appendChild(btn);
    }

    spellKeyboardEl.appendChild(rowDiv);
  });

  // Delegated click handler
  spellKeyboardEl.addEventListener('click', onKeyboardClick);
}

function onKeyboardClick(e) {
  const btn = e.target.closest('.spell-key');
  if (!btn || btn.disabled) return;
  const letter = btn.dataset.letter;
  if (letter) handleGuess(letter);
}

function disableKey(letter) {
  if (!isTouchDevice) return;
  const btn = spellKeyboardEl.querySelector(`.spell-key[data-letter="${letter}"]`);
  if (btn) {
    btn.disabled = true;
    btn.classList.add('spell-key-disabled');
  }
}

function enableAllKeys() {
  if (!isTouchDevice) return;
  spellKeyboardEl.querySelectorAll('.spell-key').forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('spell-key-disabled');
  });
}

function destroyMobileKeyboard() {
  spellKeyboardEl.removeEventListener('click', onKeyboardClick);
  spellKeyboardEl.innerHTML = '';
}

// ---- Reset ----

function resetGame() {
  if (nextWordTimer) { clearTimeout(nextWordTimer); nextWordTimer = null; }

  shufflePool();
  lives = 3;
  score = 0;
  streak = 0;
  gameState = 'playing';
  answered = false;

  spellCelebrateEl.classList.remove('show');
  spellCelebrateEl.innerHTML = '';
  spellHintEl.style.opacity = '1';
  spellFeedbackEl.textContent = '';
  spellFeedbackEl.className = 'spell-feedback';

  updateLives();
  updateScoreBar();
  showNextWord();
}

// ---- Cleanup ----

function cleanup() {
  if (nextWordTimer) { clearTimeout(nextWordTimer); nextWordTimer = null; }
  gameState = 'idle';
  currentWord = null;
  answered = false;
  streak = 0;

  spellTilesEl.innerHTML = '';
  spellEmojiEl.textContent = '';
  spellFeedbackEl.textContent = '';
  spellCelebrateEl.classList.remove('show');
  spellCelebrateEl.innerHTML = '';
  spellHintEl.style.opacity = '0';
  spellScoreBarEl.textContent = '';
  spellLivesEl.innerHTML = '';

  destroyMobileKeyboard();

  // Remove any lingering confetti
  spellGameEl.querySelectorAll('.spell-confetti').forEach(c => c.remove());
  // Remove any lingering particles
  spellGameEl.querySelectorAll('.particle').forEach(p => p.remove());
}

// ---- Export ----

export const spellItOut = {
  id: 'spell-it-out',

  start() {
    spellGameEl.style.display = 'block';
    bestScore = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
    buildMobileKeyboard();
    resetGame();
  },

  stop() {
    spellGameEl.style.display = 'none';
    cleanup();
  },

  onKey(e) {
    // Restart on gameover/won
    if (gameState === 'gameover' || gameState === 'won') {
      if (e.key === ' ' || e.key === 'Enter') {
        resetGame();
      }
      return;
    }

    const key = e.key.toUpperCase();
    if (key.length === 1 && key >= 'A' && key <= 'Z') {
      handleGuess(key);
    }
  },

  onMouse(e) {
    if (gameState === 'gameover' || gameState === 'won') {
      resetGame();
    }
  },

  onTouch(e) {
    // Mobile keyboard handles letter input via delegated click
    // Tap anywhere else during gameover/won to restart
    if (gameState === 'gameover' || gameState === 'won') {
      resetGame();
    }
  }
};
