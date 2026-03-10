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

const PITCH_MAP = { Do: 0, Re: 1, Mi: 2, Fa: 3, Sol: 4, La: 5, Ti: 6, Do2: 7 };
const TEMPO = 500;  // ms per beat — base rhythm unit

/** Ms from one note's start to the next note's start */
function noteDelay(note) {
  return (note.b + note.g) * TEMPO;
}

/** Resolve a note object's pitch name to a NOTES index */
function pitchIndex(note) {
  return PITCH_MAP[note.p];
}

// ===== Melodies =====
// Each note: { p: pitch name, b: beat duration, g: gap (rest) after note }

const MELODIES = [
  // ---- Levels 1-5: Equal beats, 3-4 notes ----
  { name: 'The Heartbeat',   emoji: '💓',  notes: [
    {p:'Do',b:1,g:0.2}, {p:'Do',b:1,g:0.2}, {p:'Do',b:1,g:0}
  ]},
  { name: 'Going Up',        emoji: '⬆️',  notes: [
    {p:'Do',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Mi',b:1,g:0}
  ]},
  { name: 'Coming Home',     emoji: '🏠',  notes: [
    {p:'Mi',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Do',b:1,g:0}
  ]},
  { name: 'The Mountain',    emoji: '⛰️',  notes: [
    {p:'Do',b:1,g:0.3}, {p:'Mi',b:1,g:0.3}, {p:'Sol',b:1,g:0}
  ]},
  { name: 'Starry Sky',      emoji: '🌟',  notes: [
    {p:'Do',b:1,g:0.2}, {p:'Do',b:1,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Sol',b:1,g:0}
  ]},

  // ---- Levels 6-10: Introduce held notes (b:2) and longer rests ----
  { name: 'The Slide',       emoji: '🛝',  notes: [
    {p:'Sol',b:1,g:0.2}, {p:'Fa',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Do',b:2,g:0}
  ]},
  { name: 'Brother John',    emoji: '🔔',  notes: [
    {p:'Do',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Do',b:2,g:0}
  ]},
  { name: 'The Wave',        emoji: '🌊',  notes: [
    {p:'Do',b:1,g:0.2}, {p:'Mi',b:2,g:0.5}, {p:'Do',b:1,g:0.2}, {p:'Mi',b:2,g:0}
  ]},
  { name: 'Little Lamb',     emoji: '🐑',  notes: [
    {p:'Mi',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Do',b:1,g:0.2}, {p:'Re',b:1,g:0.2},
    {p:'Mi',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Mi',b:2,g:0}
  ]},
  { name: 'The Grand Scale', emoji: '🏆',  notes: [
    {p:'Do',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Fa',b:1,g:0.2},
    {p:'Sol',b:1,g:0.2}, {p:'La',b:1,g:0.2}, {p:'Ti',b:1,g:0.2}, {p:'Do2',b:2,g:0}
  ]},

  // ---- Levels 11-15: Mix of b:1 and b:2, varied gaps ----
  { name: 'Morning Bells',   emoji: '🌅',  notes: [
    {p:'Sol',b:2,g:0.5}, {p:'Mi',b:1,g:0.2}, {p:'Sol',b:2,g:0.5}, {p:'Mi',b:2,g:0}
  ]},
  { name: 'Raindrops',       emoji: '🌧️',  notes: [
    {p:'Sol',b:1,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Mi',b:2,g:0.8},
    {p:'Sol',b:1,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Mi',b:2,g:0}
  ]},
  { name: 'Marching Band',   emoji: '🥁',  notes: [
    {p:'Do',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Fa',b:1,g:0.2},
    {p:'Sol',b:1,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Sol',b:2,g:0}
  ]},
  { name: 'Bee Hive',        emoji: '🐝',  notes: [
    {p:'Sol',b:1,g:0.2}, {p:'Fa',b:0.5,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Fa',b:0.5,g:0.2}, {p:'Mi',b:2,g:0}
  ]},
  { name: 'The Bridge',      emoji: '🌉',  notes: [
    {p:'Do',b:1,g:0.3}, {p:'Mi',b:1,g:0.3}, {p:'Sol',b:2,g:0.5}, {p:'Mi',b:1,g:0.3}, {p:'Do',b:2,g:0}
  ]},

  // ---- Levels 16-20: Real songs, authentic rhythm, introduce b:0.5 ----
  { name: 'Hot Cross Buns',  emoji: '🍞',  notes: [
    {p:'Mi',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Do',b:2,g:1.0},
    {p:'Mi',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Do',b:2,g:0}
  ]},
  { name: 'Mary\'s Lamb',    emoji: '🎀',  notes: [
    {p:'Mi',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Do',b:1,g:0.2}, {p:'Re',b:1,g:0.2},
    {p:'Mi',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Mi',b:2,g:0.8},
    {p:'Re',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Do',b:2,g:0}
  ]},
  { name: 'Old MacDonald',   emoji: '🐄',  notes: [
    {p:'Sol',b:1,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Re',b:1,g:0.2},
    {p:'Mi',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Re',b:2,g:0}
  ]},
  { name: 'Row Your Boat',   emoji: '🚣',  notes: [
    {p:'Do',b:2,g:0.2}, {p:'Do',b:1,g:0.2}, {p:'Do',b:0.5,g:0.2}, {p:'Re',b:0.5,g:0.2}, {p:'Mi',b:2,g:0}
  ]},
  { name: 'London Bridge',   emoji: '🏰',  notes: [
    {p:'Sol',b:1,g:0.2}, {p:'La',b:0.5,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Fa',b:1,g:0.2},
    {p:'Mi',b:1,g:0.2}, {p:'Fa',b:1,g:0.2}, {p:'Sol',b:2,g:0}
  ]},

  // ---- Levels 21-25: Complex patterns, 8-10 notes, mixed rhythms ----
  { name: 'The Giant Step',  emoji: '👣',  notes: [
    {p:'Do',b:2,g:0.5}, {p:'Sol',b:2,g:0.5}, {p:'Do',b:2,g:0.5}, {p:'Sol',b:2,g:0}
  ]},
  { name: 'High & Low',      emoji: '🎢',  notes: [
    {p:'Do',b:1,g:0.2}, {p:'Sol',b:1,g:0.5}, {p:'Mi',b:1,g:0.2}, {p:'Ti',b:2,g:0}
  ]},
  { name: 'Jingle Bells',    emoji: '🎄',  notes: [
    {p:'Mi',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Mi',b:2,g:0.5},
    {p:'Mi',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Mi',b:2,g:0.5},
    {p:'Mi',b:1,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Do',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Mi',b:2,g:0}
  ]},
  { name: 'Playground Song', emoji: '😜',  notes: [
    {p:'Sol',b:0.5,g:0.2}, {p:'Sol',b:0.5,g:0.2}, {p:'Mi',b:2,g:0.5},
    {p:'La',b:0.5,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Mi',b:2,g:0}
  ]},
  { name: 'Bingo Start',     emoji: '🐕',  notes: [
    {p:'Sol',b:1,g:0.2}, {p:'Do',b:0.5,g:0.2}, {p:'Do',b:0.5,g:0.2}, {p:'Sol',b:1,g:0.2},
    {p:'Sol',b:1,g:0.2}, {p:'La',b:1,g:0.2}, {p:'La',b:1,g:0.2}, {p:'Sol',b:2,g:0}
  ]},

  // ---- Levels 26-30: Long sequences, sophisticated rhythm, Grand Finale ----
  { name: 'Zig-Zag',         emoji: '⚡',  notes: [
    {p:'Do',b:0.5,g:0.2}, {p:'Re',b:0.5,g:0.2}, {p:'Do',b:0.5,g:0.2}, {p:'Mi',b:1,g:0.3},
    {p:'Re',b:0.5,g:0.2}, {p:'Fa',b:1,g:0.3}, {p:'Mi',b:0.5,g:0.2}, {p:'Sol',b:2,g:0}
  ]},
  { name: 'Twinkle Twinkle', emoji: '⭐',  notes: [
    {p:'Do',b:1,g:0.2}, {p:'Do',b:1,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Sol',b:1,g:0.2},
    {p:'La',b:1,g:0.2}, {p:'La',b:1,g:0.2}, {p:'Sol',b:2,g:0}
  ]},
  { name: 'Happy Birthday',  emoji: '🎂',  notes: [
    {p:'Sol',b:0.5,g:0.2}, {p:'Sol',b:0.5,g:0.2}, {p:'La',b:1,g:0.2}, {p:'Sol',b:1,g:0.2},
    {p:'Do2',b:1,g:0.2}, {p:'Ti',b:2,g:0}
  ]},
  { name: 'Ode to Joy',      emoji: '🎵',  notes: [
    {p:'Mi',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Fa',b:1,g:0.2}, {p:'Sol',b:1,g:0.2},
    {p:'Sol',b:1,g:0.2}, {p:'Fa',b:1,g:0.2}, {p:'Mi',b:1,g:0.2}, {p:'Re',b:1,g:0.2},
    {p:'Do',b:1,g:0.2}, {p:'Do',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Mi',b:2,g:0}
  ]},
  { name: 'Grand Finale',    emoji: '👑',  notes: [
    {p:'Do',b:1,g:0.2}, {p:'Mi',b:0.5,g:0.2}, {p:'Sol',b:1,g:0.3}, {p:'Do2',b:2,g:0.8},
    {p:'Ti',b:1,g:0.2}, {p:'La',b:1,g:0.2}, {p:'Sol',b:1,g:0.2}, {p:'Fa',b:0.5,g:0.2},
    {p:'Mi',b:1,g:0.2}, {p:'Re',b:1,g:0.2}, {p:'Do',b:2,g:0}
  ]},
];

// ===== DOM references (set in start()) =====

let melodyGameEl, modeSelectEl, teacherAreaEl, teacherEl, teacherSpeechEl;
let melodyNameEl, progressEl, keyboardEl, celebrateEl;

// ===== Game State =====

let gameState = 'idle';         // idle | mode-select | level-select | freestyle | lesson-intro | teacher-playing | student-turn | correct-pause | retry-pause | lesson-complete
let currentMelodyIndex = 0;
let currentStepIndex = 0;
let teacherTimers = [];
let retryCount = 0;
let retrySpeedMultiplier = 1.0;
let isSlowMode = false;          // turtle/rabbit speed toggle
let speedToggleEl = null;
let lionNodTimer = null;
let isTouchDevice = false;
let heldKeys = new Set();
let freestyleHintEl = null;
let freestyleNotePlayed = false;
let noteTimestamps = [];         // performance.now() per correct note
let tempoRatings = [];           // 'green' | 'yellow' | 'red' per note
let replayBtnEl = null;
let rotatePromptEl = null;
let countdownEl = null;
let orientationHandler = null;       // listener ref for cleanup
let levelSelectEl = null;
let levelGridEl = null;
let levelBackEl = null;
let gridTouchStartY = 0;       // iOS tap-vs-scroll detection
let gridTouchStartTime = 0;

// ===== Level Progress (localStorage) =====

const LS_KEY = 'tinyhandsplay-melody-progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return Math.max(1, Math.min(MELODIES.length, data.highestUnlocked || 1));
    }
  } catch (e) { /* ignore */ }
  return 1;
}

function saveProgress(levelJustCompleted) {
  try {
    const current = loadProgress();
    const next = Math.min(MELODIES.length, levelJustCompleted + 1);
    const highest = Math.max(current, next);
    localStorage.setItem(LS_KEY, JSON.stringify({ highestUnlocked: highest }));
  } catch (e) { /* ignore */ }
}

// Dev console: window.__melodyUnlockAll()
window.__melodyUnlockAll = function() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ highestUnlocked: MELODIES.length }));
    console.log('All melody levels unlocked!');
  } catch(e) { console.error(e); }
};

/** Combine turtle/rabbit toggle with retry slow-down */
function getEffectiveMultiplier() {
  const toggleFactor = isSlowMode ? 1.4 : 1.0;
  return toggleFactor * retrySpeedMultiplier;
}

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
  melody.notes.forEach((note, i) => {
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
      const rating = tempoRatings[i] || 'green';
      dot.style.background = rating === 'green'  ? '#2ECC71'
                            : rating === 'yellow' ? '#F1C40F'
                            :                       '#E74C3C';
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

function highlightKey(noteIndex, type, durationOverride) {
  const key = getKeyEl(noteIndex);
  if (!key) return;

  const cls = type === 'teacher' ? 'teacher-highlight'
            : type === 'correct' ? 'correct-glow'
            : 'incorrect-flash';

  key.classList.remove('teacher-highlight', 'correct-glow', 'incorrect-flash');
  void key.offsetWidth;
  key.classList.add(cls);

  const dur = durationOverride || (type === 'teacher' ? 400 : type === 'correct' ? 600 : 400);
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

function keyCascade() {
  keyboardEl.querySelectorAll('.melody-key').forEach((k, i) => {
    setTimeout(() => {
      k.classList.remove('correct-glow');
      void k.offsetWidth;
      k.classList.add('correct-glow');
      playPianoNote(i);
      setTimeout(() => k.classList.remove('correct-glow'), 600);
    }, i * 100);
  });
}

// ===== Teacher =====

function showTeacher(state, speech, speechEmoji) {
  teacherEl.className = 'melody-teacher ' + (state || '');
  teacherEl.innerHTML = '';
  const img = document.createElement('img');
  img.src = getEmojiUrl(TEACHER_EMOJI);
  img.className = 'emoji-img';
  img.alt = TEACHER_EMOJI;
  teacherEl.appendChild(img);

  // Build speech with optional inline Fluent 3D emoji
  teacherSpeechEl.innerHTML = '';
  if (speechEmoji) {
    const eImg = document.createElement('img');
    eImg.src = getEmojiUrl(speechEmoji);
    eImg.className = 'emoji-img';
    eImg.alt = speechEmoji;
    eImg.style.width = '1.3em';
    eImg.style.height = '1.3em';
    eImg.style.verticalAlign = 'middle';
    eImg.style.marginRight = '4px';
    teacherSpeechEl.appendChild(eImg);
  }
  if (speech) {
    teacherSpeechEl.appendChild(document.createTextNode(speech));
  }
}

// ===== Lion Rhythmic Nod =====

function startLionNod() {
  stopLionNod();
  const melody = MELODIES[currentMelodyIndex];
  if (!melody || !melody.notes.length) return;

  // Calculate average beat interval for the nod speed
  const mult = getEffectiveMultiplier();
  let totalMs = 0;
  melody.notes.forEach(n => { totalMs += noteDelay(n) * mult; });
  const avgBeatMs = totalMs / melody.notes.length;

  // Replace waiting/playing animation with rhythmic nod
  teacherEl.classList.remove('playing', 'waiting', 'happy');
  teacherEl.style.animationDuration = avgBeatMs + 'ms';
  teacherEl.classList.add('nodding');
}

function stopLionNod() {
  if (teacherEl) {
    teacherEl.classList.remove('nodding');
    teacherEl.style.animationDuration = '';
  }
}

// ===== Mode Selection =====

function showModeSelect() {
  gameState = 'mode-select';
  melodyGameEl.classList.remove('melody-playing');
  modeSelectEl.classList.add('active');
  teacherAreaEl.classList.remove('active');
  keyboardEl.style.display = 'none';
  celebrateEl.classList.remove('show');
  showReplayBtn(false);
  showSpeedToggle(false);
  stopLionNod();
  if (freestyleHintEl) { freestyleHintEl.remove(); freestyleHintEl = null; }
}

function onModeClick(e) {
  const btn = e.target.closest('.melody-mode-btn');
  if (!btn) return;
  initAudio();  // unlock iOS AudioContext on user gesture
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
  melodyGameEl.classList.add('melody-playing');
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

// ===== Level Select =====

function buildLevelGrid() {
  levelGridEl.innerHTML = '';
  const highestUnlocked = loadProgress();

  // --- Compute grid layout ---
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isPortrait = vh > vw;
  const cols = (vw <= 667 && isPortrait) ? 3
             : (vh <= 500 && !isPortrait) ? 6
             : 5;

  const gap = Math.min(14, vw * 0.015);
  levelGridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  levelGridEl.style.gap = `${gap}px`;

  // Build tiles first, then measure width to set square row height
  MELODIES.forEach((melody, i) => {
    const levelNum = i + 1;
    const tile = document.createElement('button');
    tile.className = 'melody-level-tile';
    tile.dataset.level = levelNum;

    if (levelNum > highestUnlocked) {
      // LOCKED
      tile.classList.add('locked');
      tile.disabled = true;
      const lockImg = document.createElement('img');
      lockImg.src = getEmojiUrl('🔒');
      lockImg.className = 'emoji-img melody-level-lock';
      lockImg.alt = '🔒';
      tile.appendChild(lockImg);
      const num = document.createElement('span');
      num.className = 'melody-level-num';
      num.textContent = levelNum;
      tile.appendChild(num);
    } else if (levelNum < highestUnlocked) {
      // COMPLETED
      tile.classList.add('completed');
      const starImg = document.createElement('img');
      starImg.src = getEmojiUrl('⭐');
      starImg.className = 'emoji-img melody-level-star';
      starImg.alt = '⭐';
      tile.appendChild(starImg);
      const num = document.createElement('span');
      num.className = 'melody-level-num';
      num.textContent = levelNum;
      tile.appendChild(num);
      const name = document.createElement('span');
      name.className = 'melody-level-name';
      name.textContent = melody.name;
      tile.appendChild(name);
    } else {
      // CURRENT (unlocked, not yet completed)
      tile.classList.add('current');
      const emojiImg = document.createElement('img');
      emojiImg.src = getEmojiUrl(melody.emoji);
      emojiImg.className = 'emoji-img melody-level-emoji';
      emojiImg.alt = melody.emoji;
      tile.appendChild(emojiImg);
      const num = document.createElement('span');
      num.className = 'melody-level-num';
      num.textContent = levelNum;
      tile.appendChild(num);
      const name = document.createElement('span');
      name.className = 'melody-level-name';
      name.textContent = melody.name;
      tile.appendChild(name);
    }

    levelGridEl.appendChild(tile);
  });

  // Measure actual tile width → set row height to match (square tiles)
  const sample = levelGridEl.firstElementChild;
  if (sample) {
    const tileW = sample.offsetWidth;
    levelGridEl.style.gridAutoRows = `${tileW}px`;
  }
}

function showLevelSelect() {
  gameState = 'level-select';
  melodyGameEl.classList.remove('melody-playing');
  levelSelectEl.classList.add('active');
  modeSelectEl.classList.remove('active');
  teacherAreaEl.classList.remove('active');
  keyboardEl.style.display = 'none';
  celebrateEl.classList.remove('show');
  showReplayBtn(false);
  showSpeedToggle(false);
  stopLionNod();
  buildLevelGrid();
}

function hideLevelSelect() {
  levelSelectEl.classList.remove('active');
}

function onLevelGridClick(e) {
  const tile = e.target.closest('.melody-level-tile');
  if (!tile || tile.disabled) return;
  initAudio();  // unlock iOS AudioContext on user gesture
  const levelNum = parseInt(tile.dataset.level, 10);
  if (isNaN(levelNum)) return;
  currentMelodyIndex = levelNum - 1;
  retryCount = 0;
  retrySpeedMultiplier = 1.0;
  hideLevelSelect();
  keyboardEl.style.display = '';
  startLessonIntro();
}

function onLevelBackClick() {
  hideLevelSelect();
  showModeSelect();
}

// --- iOS touch fallbacks (click can fail in scroll containers) ---

function onGridTouchStart(e) {
  const t = e.touches[0];
  gridTouchStartY = t.clientY;
  gridTouchStartTime = Date.now();
}

function onGridTouchEnd(e) {
  const t = e.changedTouches[0];
  const dy = Math.abs(t.clientY - gridTouchStartY);
  const dt = Date.now() - gridTouchStartTime;
  // Only treat as tap if finger moved < 15 px and held < 400 ms
  if (dy > 15 || dt > 400) return;
  const el = document.elementFromPoint(t.clientX, t.clientY);
  if (!el) return;
  const tile = el.closest('.melody-level-tile');
  if (!tile || tile.disabled) return;
  e.preventDefault();  // prevent delayed click double-fire
  initAudio();
  const levelNum = parseInt(tile.dataset.level, 10);
  if (isNaN(levelNum)) return;
  currentMelodyIndex = levelNum - 1;
  retryCount = 0;
  retrySpeedMultiplier = 1.0;
  hideLevelSelect();
  keyboardEl.style.display = '';
  startLessonIntro();
}

function onBackTouchEnd(e) {
  e.preventDefault();  // prevent delayed click double-fire
  onLevelBackClick();
}

// ===== Lesson Mode =====

function startLessons() {
  showLevelSelect();
}

/** True when device is a phone in portrait (rotate prompt visible). */
function isPhonePortrait() {
  return window.innerWidth <= 667 && window.innerHeight > window.innerWidth;
}

/** Remove the orientation listener if active. */
function clearOrientationWait() {
  if (orientationHandler) {
    window.removeEventListener('resize', orientationHandler);
    orientationHandler = null;
  }
}

/** Show a 3-2-1 countdown overlay, then call `cb`. */
function runCountdown(cb) {
  if (!countdownEl) {
    countdownEl = document.createElement('div');
    countdownEl.className = 'melody-countdown';
    melodyGameEl.appendChild(countdownEl);
  }
  countdownEl.style.display = 'flex';
  let count = 3;

  function tick() {
    if (count > 0) {
      countdownEl.textContent = count;
      countdownEl.classList.remove('melody-countdown-pop');
      void countdownEl.offsetWidth;
      countdownEl.classList.add('melody-countdown-pop');
      playCountdownBeep();
      count--;
      const t = setTimeout(tick, 800);
      teacherTimers.push(t);
    } else {
      countdownEl.style.display = 'none';
      cb();
    }
  }
  tick();
}

/** Short beep for countdown ticks (reuses piano synthesis). */
function playCountdownBeep() {
  initAudio();
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

function startLessonIntro() {
  gameState = 'lesson-intro';
  melodyGameEl.classList.add('melody-playing');
  const melody = MELODIES[currentMelodyIndex];

  teacherAreaEl.classList.add('active');
  showTeacher('', 'Get ready!', '🎵');
  melodyNameEl.textContent = `${currentMelodyIndex + 1}. ${melody.emoji} ${melody.name}`;
  buildProgressDots(melody);
  setKeysDisabled(true);
  showReplayBtn('disabled');  // visible but dimmed until student turn
  showSpeedToggle(true);

  // If phone is in portrait → wait for landscape, then countdown → demo
  if (isTouchDevice && isPhonePortrait()) {
    clearOrientationWait();
    orientationHandler = function() {
      if (!isPhonePortrait()) {
        clearOrientationWait();
        runCountdown(() => startTeacherDemo());
      }
    };
    window.addEventListener('resize', orientationHandler);
  } else {
    // Desktop or already landscape — brief intro pause, then teacher plays
    const t = setTimeout(() => startTeacherDemo(), 1500);
    teacherTimers.push(t);
  }
}

// ===== Replay Button =====

/** @param {'active'|'disabled'|false} state */
function showReplayBtn(state) {
  if (!replayBtnEl) {
    replayBtnEl = document.createElement('button');
    replayBtnEl.className = 'melody-replay-btn';
    const img = document.createElement('img');
    img.src = getEmojiUrl('🔄');
    img.className = 'emoji-img';
    img.alt = '🔄';
    replayBtnEl.appendChild(img);
    replayBtnEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (gameState === 'student-turn') {
        // Replay the teacher demo from student turn
        currentStepIndex = 0;
        noteTimestamps = [];
        tempoRatings = [];
        updateProgressDots();
        startTeacherDemo();
      }
    });
    melodyGameEl.appendChild(replayBtnEl);
  }
  if (state === false) {
    replayBtnEl.style.display = 'none';
  } else {
    replayBtnEl.style.display = 'flex';
    replayBtnEl.classList.toggle('disabled', state === 'disabled');
  }
}

// ===== Speed Toggle (Turtle / Rabbit) =====

function showSpeedToggle(visible) {
  if (!speedToggleEl) {
    speedToggleEl = document.createElement('button');
    speedToggleEl.className = 'melody-speed-toggle';
    updateSpeedToggleIcon();
    speedToggleEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      isSlowMode = !isSlowMode;
      updateSpeedToggleIcon();
    });
    melodyGameEl.appendChild(speedToggleEl);
  }
  speedToggleEl.style.display = visible ? 'flex' : 'none';
}

function updateSpeedToggleIcon() {
  if (!speedToggleEl) return;
  speedToggleEl.innerHTML = '';
  const img = document.createElement('img');
  img.src = getEmojiUrl(isSlowMode ? '🐢' : '🐇');
  img.className = 'emoji-img';
  img.alt = isSlowMode ? 'Slow' : 'Fast';
  speedToggleEl.appendChild(img);
}

// ===== Bouncy Ball =====

function showBouncyBall() {
  let ball = melodyGameEl.querySelector('.melody-bouncy-ball');
  if (!ball) {
    ball = document.createElement('div');
    ball.className = 'melody-bouncy-ball';
    melodyGameEl.appendChild(ball);
  }
  ball.style.display = 'block';
  ball.style.opacity = '1';
  return ball;
}

function hideBouncyBall() {
  const ball = melodyGameEl.querySelector('.melody-bouncy-ball');
  if (ball) {
    ball.style.opacity = '0';
    setTimeout(() => { ball.style.display = 'none'; }, 300);
  }
}

function bounceToKey(ball, noteIndex, travelMs) {
  const key = getKeyEl(noteIndex);
  if (!key || !ball) return;
  const keyRect = key.getBoundingClientRect();
  const gameRect = melodyGameEl.getBoundingClientRect();
  const x = keyRect.left - gameRect.left + keyRect.width / 2;
  const y = keyRect.top - gameRect.top - 20;  // sit above the key

  if (travelMs != null && travelMs > 0) {
    ball.style.transition = `left ${travelMs}ms ease-out, `
      + `top ${travelMs}ms ease-out, `
      + `opacity 0.3s ease`;
    // Arc hop animation — ball bounces up during travel
    ball.style.setProperty('--hop-ms', travelMs + 'ms');
    ball.classList.remove('ball-hop', 'ball-land');
    void ball.offsetWidth;
    ball.classList.add('ball-hop');
  } else {
    ball.style.transition = 'none';
    ball.classList.remove('ball-hop');
  }

  ball.style.left = x + 'px';
  ball.style.top = y + 'px';
}

function triggerBallLand(ball) {
  // Stop hop arc, start squash-stretch landing
  ball.classList.remove('ball-hop', 'ball-land');
  void ball.offsetWidth;  // force reflow to restart animation
  ball.classList.add('ball-land');

  // Spawn particles from ball position (same as kid's play mode)
  const ballRect = ball.getBoundingClientRect();
  const gameRect = melodyGameEl.getBoundingClientRect();
  spawnParticles(
    ballRect.left - gameRect.left + ballRect.width / 2,
    ballRect.top - gameRect.top + ballRect.height / 2,
    melodyGameEl
  );
}

function startTeacherDemo() {
  gameState = 'teacher-playing';
  const melody = MELODIES[currentMelodyIndex];
  const mult = getEffectiveMultiplier();

  showTeacher('playing', 'Listen...', '👂');
  setKeysDisabled(true);
  noteTimestamps = [];
  tempoRatings = [];
  stopLionNod();

  // Clear any previous timers
  clearTeacherTimers();

  // Show bouncy ball during teacher demo
  const ball = showBouncyBall();

  // Position ball at first key instantly (no transition)
  const firstIdx = pitchIndex(melody.notes[0]);
  bounceToKey(ball, firstIdx, 0);

  // Cumulative delay — each note timed by its own (b + g) * TEMPO
  let cumDelay = 0;
  melody.notes.forEach((note, i) => {
    const idx = pitchIndex(note);
    const holdMs = note.b * TEMPO * mult;
    const t = setTimeout(() => {
      playPianoNote(idx);
      highlightKey(idx, 'teacher', holdMs);
      animateKeyPress(idx);       // key squash + particles (kid's play mode effect)
      triggerBallLand(ball);      // ball squash-stretch + particles

      // Start ball moving toward NEXT key (arrives when next note fires)
      if (i < melody.notes.length - 1) {
        const nextIdx = pitchIndex(melody.notes[i + 1]);
        const travelMs = noteDelay(note) * mult;
        bounceToKey(ball, nextIdx, travelMs);
      }
    }, cumDelay);
    teacherTimers.push(t);
    cumDelay += noteDelay(note) * mult;
  });

  // After last note → student turn
  const endDelay = cumDelay + 500;
  const t = setTimeout(() => {
    hideBouncyBall();
    showTeacher('waiting', 'Your turn!', '👆');
    startLionNod();
    gameState = 'student-turn';
    currentStepIndex = 0;
    updateProgressDots();
    setKeysDisabled(false);
    showReplayBtn('active');
  }, endDelay);
  teacherTimers.push(t);
}

function handleStudentInput(noteIndex) {
  if (gameState !== 'student-turn') return;

  const melody = MELODIES[currentMelodyIndex];
  const noteObj = melody.notes[currentStepIndex];
  const expected = pitchIndex(noteObj);

  playPianoNote(noteIndex);
  animateKeyPress(noteIndex);

  if (noteIndex === expected) {
    // Track timing for rhythm feedback
    const now = performance.now();
    noteTimestamps.push(now);
    if (currentStepIndex === 0) {
      tempoRatings.push('green');  // first note has no prior reference
    } else {
      const delta = now - noteTimestamps[noteTimestamps.length - 2];
      const prevNote = melody.notes[currentStepIndex - 1];
      const expectedMs = noteDelay(prevNote) * getEffectiveMultiplier();
      const ratio = delta / expectedMs;
      if (ratio >= 0.5 && ratio <= 1.5) tempoRatings.push('green');
      else if (ratio >= 0.3 && ratio <= 2.5) tempoRatings.push('yellow');
      else tempoRatings.push('red');
    }

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
  retrySpeedMultiplier = 1.0;
  showReplayBtn(false);
  showSpeedToggle(false);
  stopLionNod();

  // Rhythm feedback based on tempo accuracy
  const greens = tempoRatings.filter(r => r === 'green').length;
  const total  = tempoRatings.length;
  const greenRatio = total > 0 ? greens / total : 1;

  if (greenRatio >= 0.8) {
    showTeacher('happy', 'Perfect rhythm!', '🎵');
  } else if (greenRatio >= 0.5) {
    showTeacher('happy', 'Great! Try a steady beat', '🥁');
  } else {
    showTeacher('happy', 'Nice! Listen to the rhythm', '👂');
  }

  flashAllKeysGreen();
  playSuccessChime();

  // Tiered celebrations based on level
  const level = currentMelodyIndex + 1;  // 1-30
  const rect = teacherEl.getBoundingClientRect();
  const gameRect = melodyGameEl.getBoundingClientRect();
  const cx = rect.left - gameRect.left + rect.width / 2;
  const cy = rect.top - gameRect.top + rect.height / 2;

  if (level < 20) {
    // Standard: 3 particle bursts
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        spawnParticles(cx + (Math.random() - 0.5) * 80, cy, melodyGameEl);
      }, i * 150);
    }
  } else if (level < 26) {
    // Levels 20-25: 6 bursts + key cascade
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        spawnParticles(cx + (Math.random() - 0.5) * 120, cy, melodyGameEl);
      }, i * 120);
    }
    keyCascade();
  } else {
    // Levels 26-29: 8 bursts + key cascade + particles from each key
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        spawnParticles(cx + (Math.random() - 0.5) * 150, cy - 20 + Math.random() * 40, melodyGameEl);
      }, i * 100);
    }
    keyCascade();
    setTimeout(() => {
      keyboardEl.querySelectorAll('.melody-key').forEach((k, i) => {
        setTimeout(() => {
          const kr = k.getBoundingClientRect();
          spawnParticles(kr.left - gameRect.left + kr.width / 2, kr.top - gameRect.top, melodyGameEl);
        }, i * 80);
      });
    }, 400);
  }

  const pauseMs = level >= 20 ? 3000 : 2200;
  const t = setTimeout(() => {
    const completedLevel = currentMelodyIndex + 1;
    saveProgress(completedLevel);
    currentMelodyIndex++;
    if (currentMelodyIndex >= MELODIES.length) {
      onAllComplete();
    } else {
      startLessonIntro();
    }
  }, pauseMs);
  teacherTimers.push(t);
}

function onMelodyMistake() {
  gameState = 'retry-pause';
  setKeysDisabled(true);
  showReplayBtn('disabled');
  stopLionNod();
  showTeacher('waiting', 'Let\'s try again!', '🤔');

  retryCount++;
  // Slow down: +20% per retry, cap at 1.8x (80% slower)
  retrySpeedMultiplier = Math.min(1.8, 1.0 + retryCount * 0.2);
  noteTimestamps = [];
  tempoRatings = [];

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
  showSpeedToggle(false);
  playWinFanfare();

  celebrateEl.innerHTML = '';

  const emoji = document.createElement('div');
  emoji.className = 'melody-celebrate-emoji melody-grand-finale';
  const img = document.createElement('img');
  img.src = getEmojiUrl('🏆');
  img.className = 'emoji-img';
  img.alt = '🏆';
  img.style.width = 'clamp(4rem, 14vw, 7rem)';
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
    showLevelSelect();
  });
  celebrateEl.appendChild(btn);

  requestAnimationFrame(() => celebrateEl.classList.add('show'));

  // Grand finale particles — multiple waves
  const gameRect = melodyGameEl.getBoundingClientRect();
  for (let wave = 0; wave < 5; wave++) {
    setTimeout(() => {
      for (let i = 0; i < 6; i++) {
        spawnParticles(
          Math.random() * gameRect.width,
          Math.random() * gameRect.height * 0.6,
          melodyGameEl
        );
      }
    }, wave * 400);
  }
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
  stopLionNod();
  gameState = 'idle';
  currentMelodyIndex = 0;
  currentStepIndex = 0;
  retryCount = 0;
  retrySpeedMultiplier = 1.0;
  isSlowMode = false;
  heldKeys.clear();
  freestyleNotePlayed = false;
  noteTimestamps = [];
  tempoRatings = [];

  // Remove countdown + orientation listener
  clearOrientationWait();
  if (countdownEl) { countdownEl.remove(); countdownEl = null; }

  // Remove replay button
  if (replayBtnEl) { replayBtnEl.remove(); replayBtnEl = null; }

  // Remove speed toggle
  if (speedToggleEl) { speedToggleEl.remove(); speedToggleEl = null; }

  // Remove bouncy ball
  if (melodyGameEl) {
    const ball = melodyGameEl.querySelector('.melody-bouncy-ball');
    if (ball) ball.remove();
    melodyGameEl.classList.remove('melody-playing');
  }

  // Remove rotate prompt
  if (rotatePromptEl) { rotatePromptEl.remove(); rotatePromptEl = null; }

  if (keyboardEl) {
    keyboardEl.removeEventListener('pointerdown', onKeyboardPointer);
    keyboardEl.innerHTML = '';
    keyboardEl.style.display = '';
  }
  if (levelSelectEl) levelSelectEl.classList.remove('active');
  if (levelGridEl) {
    levelGridEl.removeEventListener('click', onLevelGridClick);
    levelGridEl.removeEventListener('touchstart', onGridTouchStart);
    levelGridEl.removeEventListener('touchend', onGridTouchEnd);
  }
  if (levelBackEl) {
    levelBackEl.removeEventListener('click', onLevelBackClick);
    levelBackEl.removeEventListener('touchend', onBackTouchEnd);
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
    levelSelectEl  = document.getElementById('melodyLevelSelect');
    levelGridEl    = document.getElementById('melodyLevelGrid');
    levelBackEl    = document.getElementById('melodyLevelBack');

    melodyGameEl.style.display = 'block';
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Create rotate-device prompt for small screens in portrait
    if (!rotatePromptEl) {
      rotatePromptEl = document.createElement('div');
      rotatePromptEl.className = 'melody-rotate-prompt';
      rotatePromptEl.innerHTML = '<div class="melody-rotate-icon">📱</div>'
        + '<div class="melody-rotate-text">Rotate your device to play!</div>';
      melodyGameEl.appendChild(rotatePromptEl);
    }

    preloadEmojis(EMOJI_REGISTRY['melody-maker'] || []).then(() => {
      buildKeyboard();
      modeSelectEl.addEventListener('click', onModeClick);
      levelGridEl.addEventListener('click', onLevelGridClick);
      levelBackEl.addEventListener('click', onLevelBackClick);
      // iOS touch fallbacks — click can fail in scroll containers
      levelGridEl.addEventListener('touchstart', onGridTouchStart, { passive: true });
      levelGridEl.addEventListener('touchend', onGridTouchEnd);
      levelBackEl.addEventListener('touchend', onBackTouchEnd);
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
