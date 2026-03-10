/* =========================================================
 *  Melody Maker — Piano & Melody Learning Game
 *  Play freely or learn melodies with a friendly teacher!
 * ========================================================= */

import { getAudioCtx, initAudio, playWinFanfare } from '../audio.js';
import { spawnParticles } from '../effects.js';
import { preloadEmojis, getEmojiUrl } from '../emoji.js';
import { EMOJI_REGISTRY } from '../emoji-registry.js';

// ===== Constants =====

const TEACHER_EMOJI = '🦁';
const CELEBRATE_EMOJIS = ['🎉', '👏', '⭐', '🥳', '🌟', '✨', '💫'];

const NOTES = [
  { name: 'C4',  freq: 261.63, color: '#E74C3C', label: 'Do', key: 'a' },
  { name: 'D4',  freq: 293.66, color: '#F39C12', label: 'Re', key: 's' },
  { name: 'E4',  freq: 329.63, color: '#F1C40F', label: 'Mi', key: 'd' },
  { name: 'F4',  freq: 349.23, color: '#2ECC71', label: 'Fa', key: 'f' },
  { name: 'G4',  freq: 392.00, color: '#1ABC9C', label: 'Sol', key: 'g' },
  { name: 'A4',  freq: 440.00, color: '#3498DB', label: 'La', key: 'h' },
  { name: 'B4',  freq: 493.88, color: '#9B59B6', label: 'Ti', key: 'j' },
  { name: 'C5',  freq: 523.25, color: '#E91E8C', label: 'Do', key: 'k' },
];

const KEY_MAP = {};
NOTES.forEach((n, i) => { KEY_MAP[n.key] = i; });

// ===== Melodies =====
// Indices: Do=0 Re=1 Mi=2 Fa=3 Sol=4 La=5 Ti=6 Do(high)=7

const MELODIES = [
  { name: 'The Heartbeat',   emoji: '💓',  notes: [0, 0, 0],               tempo: 600 },
  { name: 'Going Up',        emoji: '⬆️',  notes: [0, 1, 2],               tempo: 550 },
  { name: 'Coming Home',     emoji: '🏠',  notes: [2, 1, 0],               tempo: 550 },
  { name: 'The Mountain',    emoji: '⛰️',  notes: [0, 2, 4],               tempo: 600 },
  { name: 'Starry Sky',      emoji: '🌟',  notes: [0, 0, 4, 4],           tempo: 550 },
  { name: 'The Slide',       emoji: '🛝',  notes: [4, 3, 2, 1, 0],        tempo: 450 },
  { name: 'Brother John',    emoji: '🔔',  notes: [0, 1, 2, 0],           tempo: 500 },
  { name: 'The Wave',        emoji: '🌊',  notes: [0, 2, 0, 2],           tempo: 500 },
  { name: 'Little Lamb',     emoji: '🐑',  notes: [2, 1, 0, 1, 2, 2, 2], tempo: 400 },
  { name: 'The Grand Scale', emoji: '🏆',  notes: [0, 1, 2, 3, 4, 5, 6, 7], tempo: 400 },
  // ---- Extended Curriculum (11–30) ----
  { name: 'Morning Bells',   emoji: '🌅',  notes: [4, 2, 4, 2],                               tempo: 550 },
  { name: 'Raindrops',       emoji: '🌧️',  notes: [4, 4, 2, 4, 4, 2],                         tempo: 500 },
  { name: 'Marching Band',   emoji: '🥁',  notes: [0, 1, 2, 3, 4, 4, 4],                     tempo: 450 },
  { name: 'Bee Hive',        emoji: '🐝',  notes: [4, 3, 4, 3, 2],                             tempo: 450 },
  { name: 'The Bridge',      emoji: '🌉',  notes: [0, 2, 4, 2, 0],                             tempo: 500 },
  { name: 'Hot Cross Buns',  emoji: '🍞',  notes: [2, 1, 0, 2, 1, 0],                         tempo: 500 },
  { name: 'Mary\'s End',     emoji: '🎀',  notes: [2, 1, 0, 1, 2, 2, 2, 1, 1, 2, 1, 0],     tempo: 380 },
  { name: 'Old Mac Intro',   emoji: '🐄',  notes: [4, 4, 4, 1, 2, 2, 1],                     tempo: 420 },
  { name: 'Row Your Boat',   emoji: '🚣',  notes: [0, 0, 0, 1, 2],                             tempo: 500 },
  { name: 'London Bridge',   emoji: '🏰',  notes: [4, 5, 4, 3, 2, 3, 4],                     tempo: 420 },
  { name: 'The Giant Step',  emoji: '👣',  notes: [0, 4, 0, 4],                                 tempo: 550 },
  { name: 'High & Low',      emoji: '🎢',  notes: [0, 4, 2, 6],                                 tempo: 550 },
  { name: 'Jingle Bells',    emoji: '🎄',  notes: [2, 2, 2, 2, 2, 2, 2, 4, 0, 1, 2],         tempo: 350 },
  { name: 'Playground Song', emoji: '😜',  notes: [4, 4, 2, 5, 4, 2],                         tempo: 450 },
  { name: 'Bingo Start',     emoji: '🐕',  notes: [4, 0, 0, 4, 4, 5, 5, 4],                   tempo: 400 },
  { name: 'Zig-Zag',         emoji: '⚡',  notes: [0, 1, 0, 2, 1, 3, 2, 4],                   tempo: 400 },
  { name: 'Twinkle Twinkle', emoji: '⭐',  notes: [0, 0, 4, 4, 5, 5, 4],                     tempo: 420 },
  { name: 'Happy Birthday',  emoji: '🎂',  notes: [4, 4, 5, 4, 7, 6],                         tempo: 450 },
  { name: 'Ode to Joy',      emoji: '🎵',  notes: [2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2],     tempo: 380 },
  { name: 'Grand Finale',    emoji: '👑',  notes: [0, 2, 4, 7, 6, 5, 4, 3, 2, 1, 0],         tempo: 350 },
];

// ===== DOM references (set in start()) =====

let melodyGameEl, modeSelectEl, teacherAreaEl, teacherEl, teacherSpeechEl;
let melodyNameEl, progressEl, keyboardEl, celebrateEl;

// ===== Game State =====

let gameState = 'idle';         // idle | mode-select | freestyle | lesson-intro | teacher-playing | student-turn | correct-pause | retry-pause | lesson-complete
let currentMelodyIndex = 0;
let currentStepIndex = 0;
let teacherTimers = [];
let retryCount = 0;
let speedMultiplier = 1.0;
let isTouchDevice = false;
let heldKeys = new Set();
let freestyleHintEl = null;
let freestyleNotePlayed = false;

// ===== Audio — Piano Note Synthesis =====

function playPianoNote(noteIndex) {
  initAudio();
  const ctx = getAudioCtx();
  if (!ctx) return;

  const freq = NOTES[noteIndex].freq;
  const now = ctx.currentTime;

  // Primary: triangle wave (warm, flute-like)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, now);
  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
  gain1.gain.setValueAtTime(0.15, now + 0.08);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.8);

  // Harmonic: sine at 2x frequency (bell brightness)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, now);
  gain2.gain.setValueAtTime(0.001, now);
  gain2.gain.linearRampToValueAtTime(0.06, now + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + 0.4);
}

function playThinkingSound() {
  initAudio();
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.exponentialRampToValueAtTime(250, now + 0.25);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

function playSuccessChime() {
  initAudio();
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.35);
  });
}

// ===== DOM Builders =====

function buildKeyboard() {
  keyboardEl.innerHTML = '';
  NOTES.forEach((note, i) => {
    const key = document.createElement('button');
    key.className = 'melody-key';
    key.dataset.noteIndex = i;
    key.style.setProperty('--key-color', note.color);

    const label = document.createElement('span');
    label.className = 'melody-key-label';
    label.textContent = note.label;
    key.appendChild(label);

    if (!isTouchDevice) {
      const hint = document.createElement('span');
      hint.className = 'melody-key-hint';
      hint.textContent = note.key.toUpperCase();
      key.appendChild(hint);
    }

    keyboardEl.appendChild(key);
  });

  keyboardEl.addEventListener('pointerdown', onKeyboardPointer);
}

function buildProgressDots(melody) {
  progressEl.innerHTML = '';
  melody.notes.forEach((noteIdx, i) => {
    const dot = document.createElement('span');
    dot.className = 'melody-dot';
    dot.dataset.step = i;
    progressEl.appendChild(dot);
  });
}

function updateProgressDots() {
  const dots = progressEl.querySelectorAll('.melody-dot');
  const melody = MELODIES[currentMelodyIndex];
  dots.forEach((dot, i) => {
    dot.classList.remove('filled', 'current');
    if (i < currentStepIndex) {
      dot.classList.add('filled');
      dot.style.background = NOTES[melody.notes[i]].color;
    } else if (i === currentStepIndex) {
      dot.classList.add('current');
      dot.style.background = '';
    } else {
      dot.style.background = '';
    }
  });
}

// ===== Key Visual Feedback =====

function getKeyEl(noteIndex) {
  return keyboardEl.querySelector(`[data-note-index="${noteIndex}"]`);
}

function animateKeyPress(noteIndex) {
  const key = getKeyEl(noteIndex);
  if (!key) return;
  key.classList.remove('pressed');
  void key.offsetWidth;
  key.classList.add('pressed');

  // Spawn particles from key center
  const rect = key.getBoundingClientRect();
  const gameRect = melodyGameEl.getBoundingClientRect();
  spawnParticles(
    rect.left - gameRect.left + rect.width / 2,
    rect.top - gameRect.top,
    melodyGameEl
  );

  setTimeout(() => key.classList.remove('pressed'), 160);
}

function highlightKey(noteIndex, type) {
  const key = getKeyEl(noteIndex);
  if (!key) return;

  const cls = type === 'teacher' ? 'teacher-highlight'
            : type === 'correct' ? 'correct-glow'
            : 'incorrect-flash';

  key.classList.remove('teacher-highlight', 'correct-glow', 'incorrect-flash');
  void key.offsetWidth;
  key.classList.add(cls);

  const dur = type === 'teacher' ? 400 : type === 'correct' ? 600 : 400;
  setTimeout(() => key.classList.remove(cls), dur);
}

function setKeysDisabled(disabled) {
  keyboardEl.querySelectorAll('.melody-key').forEach(k => {
    k.classList.toggle('disabled', disabled);
  });
}

function flashAllKeysGreen() {
  keyboardEl.querySelectorAll('.melody-key').forEach((k, i) => {
    setTimeout(() => {
      k.classList.remove('correct-glow');
      void k.offsetWidth;
      k.classList.add('correct-glow');
      setTimeout(() => k.classList.remove('correct-glow'), 600);
    }, i * 60);
  });
}

// ===== Teacher =====

function showTeacher(state, speech) {
  teacherEl.className = 'melody-teacher ' + (state || '');
  teacherEl.innerHTML = '';
  const img = document.createElement('img');
  img.src = getEmojiUrl(TEACHER_EMOJI);
  img.className = 'emoji-img';
  img.alt = TEACHER_EMOJI;
  teacherEl.appendChild(img);
  teacherSpeechEl.textContent = speech || '';
}

// ===== Mode Selection =====

function showModeSelect() {
  gameState = 'mode-select';
  modeSelectEl.classList.add('active');
  teacherAreaEl.classList.remove('active');
  keyboardEl.style.display = 'none';
  celebrateEl.classList.remove('show');
  if (freestyleHintEl) { freestyleHintEl.remove(); freestyleHintEl = null; }
}

function onModeClick(e) {
  const btn = e.target.closest('.melody-mode-btn');
  if (!btn) return;
  const mode = btn.dataset.mode;
  modeSelectEl.classList.remove('active');
  keyboardEl.style.display = '';

  if (mode === 'freestyle') {
    startFreestyle();
  } else {
    startLessons();
  }
}

// ===== Freestyle Mode =====

function startFreestyle() {
  gameState = 'freestyle';
  teacherAreaEl.classList.remove('active');
  setKeysDisabled(false);
  freestyleNotePlayed = false;

  // Show hint
  freestyleHintEl = document.createElement('div');
  freestyleHintEl.className = 'melody-freestyle-hint';
  freestyleHintEl.textContent = isTouchDevice ? 'Tap the keys to play!' : 'Press A – K or tap the keys!';
  melodyGameEl.appendChild(freestyleHintEl);
}

function hideFreestyleHint() {
  if (freestyleHintEl && !freestyleNotePlayed) {
    freestyleNotePlayed = true;
    freestyleHintEl.style.opacity = '0';
    setTimeout(() => { if (freestyleHintEl) { freestyleHintEl.remove(); freestyleHintEl = null; } }, 500);
  }
}

// ===== Lesson Mode =====

function startLessons() {
  currentMelodyIndex = 0;
  retryCount = 0;
  speedMultiplier = 1.0;
  startLessonIntro();
}

function startLessonIntro() {
  gameState = 'lesson-intro';
  const melody = MELODIES[currentMelodyIndex];

  teacherAreaEl.classList.add('active');
  showTeacher('', 'Get ready!');
  melodyNameEl.textContent = `${currentMelodyIndex + 1}. ${melody.emoji} ${melody.name}`;
  buildProgressDots(melody);
  setKeysDisabled(true);

  // Brief intro pause, then teacher plays
  const t = setTimeout(() => startTeacherDemo(), 1500);
  teacherTimers.push(t);
}

function startTeacherDemo() {
  gameState = 'teacher-playing';
  const melody = MELODIES[currentMelodyIndex];
  const tempo = melody.tempo * speedMultiplier;

  showTeacher('playing', 'Listen...');
  setKeysDisabled(true);

  // Clear any previous timers
  clearTeacherTimers();

  melody.notes.forEach((noteIdx, i) => {
    const t = setTimeout(() => {
      playPianoNote(noteIdx);
      highlightKey(noteIdx, 'teacher');
    }, i * tempo);
    teacherTimers.push(t);
  });

  // After last note → student turn
  const endDelay = melody.notes.length * tempo + 500;
  const t = setTimeout(() => {
    showTeacher('waiting', 'Your turn!');
    gameState = 'student-turn';
    currentStepIndex = 0;
    updateProgressDots();
    setKeysDisabled(false);
  }, endDelay);
  teacherTimers.push(t);
}

function handleStudentInput(noteIndex) {
  if (gameState !== 'student-turn') return;

  const melody = MELODIES[currentMelodyIndex];
  const expected = melody.notes[currentStepIndex];

  playPianoNote(noteIndex);
  animateKeyPress(noteIndex);

  if (noteIndex === expected) {
    highlightKey(noteIndex, 'correct');
    currentStepIndex++;
    updateProgressDots();

    if (currentStepIndex >= melody.notes.length) {
      onMelodyComplete();
    }
  } else {
    highlightKey(noteIndex, 'incorrect');
    playThinkingSound();
    onMelodyMistake();
  }
}

function onMelodyComplete() {
  gameState = 'correct-pause';
  setKeysDisabled(true);
  retryCount = 0;
  speedMultiplier = 1.0;

  showTeacher('happy', CELEBRATE_EMOJIS[Math.floor(Math.random() * CELEBRATE_EMOJIS.length)]);
  flashAllKeysGreen();
  playSuccessChime();

  // Confetti burst
  const rect = teacherEl.getBoundingClientRect();
  const gameRect = melodyGameEl.getBoundingClientRect();
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      spawnParticles(
        rect.left - gameRect.left + rect.width / 2 + (Math.random() - 0.5) * 80,
        rect.top - gameRect.top + rect.height / 2,
        melodyGameEl
      );
    }, i * 150);
  }

  const t = setTimeout(() => {
    currentMelodyIndex++;
    if (currentMelodyIndex >= MELODIES.length) {
      onAllComplete();
    } else {
      startLessonIntro();
    }
  }, 2200);
  teacherTimers.push(t);
}

function onMelodyMistake() {
  gameState = 'retry-pause';
  setKeysDisabled(true);
  showTeacher('waiting', '🤔 Let\'s try again!');

  retryCount++;
  // Slow down: +20% per retry, cap at 1.8x (80% slower)
  speedMultiplier = Math.min(1.8, 1.0 + retryCount * 0.2);

  const t = setTimeout(() => {
    currentStepIndex = 0;
    updateProgressDots();
    startTeacherDemo();
  }, 1500);
  teacherTimers.push(t);
}

function onAllComplete() {
  gameState = 'lesson-complete';
  teacherAreaEl.classList.remove('active');
  keyboardEl.style.display = 'none';
  playWinFanfare();

  celebrateEl.innerHTML = '';

  const emoji = document.createElement('div');
  emoji.className = 'melody-celebrate-emoji';
  const img = document.createElement('img');
  img.src = getEmojiUrl('🏆');
  img.className = 'emoji-img';
  img.alt = '🏆';
  img.style.width = 'clamp(3rem, 10vw, 5rem)';
  img.style.height = img.style.width;
  emoji.appendChild(img);
  celebrateEl.appendChild(emoji);

  const txt = document.createElement('div');
  txt.className = 'melody-celebrate-text';
  txt.textContent = 'You played them all!';
  celebrateEl.appendChild(txt);

  const sub = document.createElement('div');
  sub.className = 'melody-celebrate-sub';
  sub.textContent = '30 melodies mastered 🎶';
  celebrateEl.appendChild(sub);

  const btn = document.createElement('button');
  btn.className = 'melody-btn-again';
  btn.textContent = 'Play Again';
  btn.addEventListener('click', () => {
    celebrateEl.classList.remove('show');
    keyboardEl.style.display = '';
    showModeSelect();
  });
  celebrateEl.appendChild(btn);

  requestAnimationFrame(() => celebrateEl.classList.add('show'));
}

// ===== Input Handling =====

function onKeyboardPointer(e) {
  const key = e.target.closest('.melody-key');
  if (!key) return;
  e.preventDefault();
  initAudio();
  const idx = parseInt(key.dataset.noteIndex, 10);
  if (isNaN(idx)) return;

  if (gameState === 'freestyle') {
    hideFreestyleHint();
    playPianoNote(idx);
    animateKeyPress(idx);
  } else if (gameState === 'student-turn') {
    handleStudentInput(idx);
  }
}

function handleKeyDown(e) {
  const k = e.key.toLowerCase();

  // Prevent key repeat
  if (heldKeys.has(k)) return;
  heldKeys.add(k);

  const idx = KEY_MAP[k];
  if (idx === undefined) return;

  initAudio();

  if (gameState === 'freestyle') {
    hideFreestyleHint();
    playPianoNote(idx);
    animateKeyPress(idx);
  } else if (gameState === 'student-turn') {
    handleStudentInput(idx);
  }
}

function handleKeyUp(e) {
  heldKeys.delete(e.key.toLowerCase());
}

// ===== Cleanup =====

function clearTeacherTimers() {
  teacherTimers.forEach(t => clearTimeout(t));
  teacherTimers = [];
}

function cleanup() {
  clearTeacherTimers();
  gameState = 'idle';
  currentMelodyIndex = 0;
  currentStepIndex = 0;
  retryCount = 0;
  speedMultiplier = 1.0;
  heldKeys.clear();
  freestyleNotePlayed = false;

  if (keyboardEl) {
    keyboardEl.removeEventListener('pointerdown', onKeyboardPointer);
    keyboardEl.innerHTML = '';
    keyboardEl.style.display = '';
  }
  if (modeSelectEl) {
    modeSelectEl.classList.remove('active');
    modeSelectEl.removeEventListener('click', onModeClick);
  }
  if (teacherAreaEl) teacherAreaEl.classList.remove('active');
  if (celebrateEl) { celebrateEl.classList.remove('show'); celebrateEl.innerHTML = ''; }
  if (freestyleHintEl) { freestyleHintEl.remove(); freestyleHintEl = null; }

  // Remove particles
  if (melodyGameEl) {
    melodyGameEl.querySelectorAll('.particle').forEach(p => p.remove());
  }

  document.removeEventListener('keyup', handleKeyUp);
}

// ===== Exported Game Module =====

export const melodyMaker = {
  id: 'melody-maker',

  start() {
    melodyGameEl   = document.getElementById('melodyGame');
    modeSelectEl   = document.getElementById('melodyModeSelect');
    teacherAreaEl  = document.getElementById('melodyTeacherArea');
    teacherEl      = document.getElementById('melodyTeacher');
    teacherSpeechEl = document.getElementById('melodyTeacherSpeech');
    melodyNameEl   = document.getElementById('melodyMelodyName');
    progressEl     = document.getElementById('melodyProgress');
    keyboardEl     = document.getElementById('melodyKeyboard');
    celebrateEl    = document.getElementById('melodyCelebrate');

    melodyGameEl.style.display = 'block';
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    preloadEmojis(EMOJI_REGISTRY['melody-maker'] || []).then(() => {
      buildKeyboard();
      modeSelectEl.addEventListener('click', onModeClick);
      document.addEventListener('keyup', handleKeyUp);
      showModeSelect();
    });
  },

  stop() {
    if (melodyGameEl) melodyGameEl.style.display = 'none';
    cleanup();
  },

  onKey(e) {
    handleKeyDown(e);

    // Space/Enter on completion screens
    if (e.key === ' ' || e.key === 'Enter') {
      if (gameState === 'lesson-complete') {
        celebrateEl.classList.remove('show');
        keyboardEl.style.display = '';
        showModeSelect();
      }
    }
  },

  onMouse() {
    // Piano clicks handled by delegated pointerdown on keyboardEl
  },

  onTouch() {
    // Piano touches handled by delegated pointerdown on keyboardEl
  }
};
