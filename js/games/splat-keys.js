import { playRandomSound, playBubblePop } from '../audio.js';
import { EMOJIS, spawnParticles } from '../effects.js';
import { preloadEmojis, createEmojiImg } from '../emoji.js';
import { EMOJI_REGISTRY } from '../emoji-registry.js';
import { createTimerPool } from '../timers.js';
import { local } from '../storage.js';

const timers = createTimerPool();
// A held key fires ~30 keydowns/s and each emoji lives 7s with an infinite
// float animation — cap the live count so a toddler leaning on the keyboard
// can't build up hundreds of animating nodes.
const MAX_ACTIVE = 40;

const splatKeysGame = document.getElementById('splatKeysGame');
const splatHint     = document.getElementById('splatHint');
const splatModeBtn  = document.getElementById('splatModeBtn');

// ---- ABC mode (parent request: "an abc and number one, not random things") ----
// Letters and digits show a big glyph card with the matching emoji.
// Taps walk through the alphabet then 0-9.
const ABC_SEQ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
const ABC_COLORS = ['#FF6B8A', '#7C5CFC', '#F4845F', '#2EC4B6', '#3A86FF', '#FFB703', '#8AC926', '#E040FB'];
const ABC_MODE_KEY = 'thp-splat-abc';
let abcMode = false;
let abcIndex = 0;

function setAbcMode(on) {
  abcMode = !!on;
  local.set(ABC_MODE_KEY, abcMode ? 1 : 0);
  if (splatModeBtn) {
    splatModeBtn.classList.toggle('on', abcMode);
    splatModeBtn.setAttribute('aria-pressed', String(abcMode));
  }
  splatHint.textContent = abcMode ? 'Press a letter or tap the screen!' : 'Press any key and watch the magic!';
}

function isToggle(target) {
  return !!(target && target.closest && target.closest('.splat-mode-btn'));
}

function onModeToggle(e) {
  e.preventDefault();
  e.stopPropagation();
  setAbcMode(!abcMode);
  playBubblePop(abcMode ? 4 : 1);
}

const KEY_MAP = {
  a: '🍎',  b: '🐝',  c: '🐱',  d: '🐶',  e: '🐘',
  f: '🐸',  g: '🦒',  h: '🐴',  i: '🍦',  j: '🃏',
  k: '🪁',  l: '🦁',  m: '🐵',  n: '🌙',  o: '🐙',
  p: '🍕',  q: '👑',  r: '🌈',  s: '⭐',  t: '🐢',
  u: '🦄',  v: '🌋',  w: '🐋',  x: '✨',  y: '🪀',
  z: '🦓',
  '1': '🎸',  '2': '🎲',  '3': '🎪',  '4': '🍀',  '5': '✌️',
  '6': '🎵',  '7': '🌟',  '8': '🎱',  '9': '🎈',  '0': '⚽',
  ' ': '🚀',   ',': '🐞',   '.': '🌻',   '/': '⚡',
  ';': '🍩',   "'": '💎',
  '[': '🎁',   ']': '🧩',   '\\': '🔮',
  '-': '🍭',   '=': '🎯',   '`': '🌸',
  'Enter': '🎉',  'Tab': '🦋',  'Backspace': '💫',
  'ArrowUp': '🚁',  'ArrowDown': '🐠',  'ArrowLeft': '🦀',  'ArrowRight': '🐎',
  'Shift': '🔥',  'Control': '❄️',  'Alt': '🌊',  'Meta': '💜',
  'CapsLock': '🎩',  'Escape': '🌀',
};

const EMOJI_SIZE = 90;
let activeEmojis = [];

function splatHideHint() {
  if (splatHint.style.opacity !== '0') splatHint.style.opacity = '0';
}

function spawnEmoji(x, y, key) {
  // ABC mode: only letters and digits count; taps walk the sequence
  let glyph = null;
  if (abcMode) {
    if (key == null) glyph = ABC_SEQ[abcIndex++ % ABC_SEQ.length];
    else if (key.length === 1 && /[a-z0-9]/i.test(key)) glyph = key.toUpperCase();
    else return;
  }
  splatHideHint();
  const lookup = glyph ? glyph.toLowerCase() : key;
  const char = (lookup && KEY_MAP[lookup]) ? KEY_MAP[lookup]
             : (lookup && KEY_MAP[lookup.toLowerCase()]) ? KEY_MAP[lookup.toLowerCase()]
             : EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const rot = (Math.random() * 30 - 15);
  const randDrift = () => (Math.random() * 40 - 20) + 'px';

  const el = document.createElement('span');
  el.className = 'emoji' + (glyph ? ' abc' : '');
  if (glyph) {
    const letter = document.createElement('span');
    letter.className = 'abc-letter';
    letter.textContent = glyph;
    letter.style.color = ABC_COLORS[glyph.charCodeAt(0) % ABC_COLORS.length];
    el.appendChild(letter);
  }
  const imgEl = createEmojiImg(char, 'emoji-img');
  const imgSize = glyph ? Math.round(EMOJI_SIZE * 1.5) : EMOJI_SIZE;   // big emoji under the letter
  imgEl.style.width = imgSize + 'px';
  imgEl.style.height = imgSize + 'px';
  el.appendChild(imgEl);
  const boxW = glyph ? 180 : EMOJI_SIZE, boxH = glyph ? 270 : EMOJI_SIZE;
  el.style.left = (x - boxW / 2) + 'px';
  el.style.top  = (y - boxH / 2) + 'px';
  el.style.setProperty('--rot', rot + 'deg');
  el.style.setProperty('--float-dur', (3 + Math.random() * 3) + 's');
  el.style.setProperty('--float-delay', (Math.random() * -3) + 's');
  el.style.setProperty('--fx', randDrift());
  el.style.setProperty('--fy', randDrift());
  el.style.setProperty('--fx2', randDrift());
  el.style.setProperty('--fy2', randDrift());
  el.style.setProperty('--fx3', randDrift());
  el.style.setProperty('--fy3', randDrift());

  splatKeysGame.appendChild(el);
  activeEmojis.push(el);
  while (activeEmojis.length > MAX_ACTIVE) {
    const oldest = activeEmojis.shift();   // evict the oldest immediately
    oldest.remove();
  }

  timers.later(() => {
    el.classList.add('fade-out');
    timers.later(() => {
      el.remove();
      const idx = activeEmojis.indexOf(el);
      if (idx !== -1) activeEmojis.splice(idx, 1);
    }, 2000);
  }, 5000);

  spawnParticles(x, y, splatKeysGame);
  if (glyph) {
    playBubblePop(glyph.charCodeAt(0) % 6);
  } else {
    playRandomSound();
  }
}

function randPos() {
  return { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight };
}

export const splatKeys = {
  id: 'splat-keys',
  start() {
    splatKeysGame.style.display = 'block';
    splatHint.style.opacity = '1';
    abcIndex = 0;
    setAbcMode(local.getInt(ABC_MODE_KEY) === 1);
    if (splatModeBtn) splatModeBtn.addEventListener('pointerdown', onModeToggle);
    preloadEmojis(EMOJI_REGISTRY['splat-keys']);
  },
  stop() {
    splatKeysGame.style.display = 'none';
    if (splatModeBtn) splatModeBtn.removeEventListener('pointerdown', onModeToggle);
    timers.clearAll();
    activeEmojis.forEach(el => el.remove());
    activeEmojis = [];
    splatKeysGame.querySelectorAll('.particle').forEach(p => p.remove());
  },
  onKey(e) {
    if (e.repeat) return;   // one press = one emoji; auto-repeat is not a toddler tapping
    const pos = randPos();
    spawnEmoji(pos.x, pos.y, e.key);
  },
  onMouse(e) {
    if (isToggle(e.target)) return;   // the toggle handles itself
    if (e.button === 2) {
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i + Math.random() * 0.8;
        const dist = 60 + Math.random() * 40;
        spawnEmoji(e.clientX + Math.cos(angle) * dist, e.clientY + Math.sin(angle) * dist);
      }
    } else {
      spawnEmoji(e.clientX, e.clientY);
    }
  },
  onTouch(e) {
    if (isToggle(e.target)) return;
    // Only the fingers that just landed — e.touches includes every finger
    // already resting on the screen (a palm gave 55 emoji instead of 10)
    const pts = e.changedTouches && e.changedTouches.length ? e.changedTouches : e.touches;
    for (let i = 0; i < pts.length; i++) {
      spawnEmoji(pts[i].clientX, pts[i].clientY);
    }
  }
};
