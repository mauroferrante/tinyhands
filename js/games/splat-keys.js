import { playRandomSound } from '../audio.js';
import { EMOJIS, spawnParticles } from '../effects.js';

const splatKeysGame = document.getElementById('splatKeysGame');
const splatHint     = document.getElementById('splatHint');

const KEY_MAP = {
  a: '🍎',  b: '🐝',  c: '🐱',  d: '🐶',  e: '🐘',
  f: '🐸',  g: '🦒',  h: '🐴',  i: '🍦',  j: '🃏',
  k: '🪁',  l: '🦁',  m: '🐵',  n: '🌙',  o: '🐙',
  p: '🐧',  q: '👑',  r: '🌈',  s: '⭐',  t: '🐢',
  u: '🦄',  v: '🌋',  w: '🐋',  x: '✨',  y: '🪀',
  z: '🦓',
  '1': '🎸',  '2': '🎲',  '3': '🎪',  '4': '🍀',  '5': '🖐️',
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
  splatHideHint();
  const char = (key && KEY_MAP[key]) ? KEY_MAP[key]
             : (key && KEY_MAP[key.toLowerCase()]) ? KEY_MAP[key.toLowerCase()]
             : EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const rot = (Math.random() * 30 - 15);
  const randDrift = () => (Math.random() * 40 - 20) + 'px';

  const el = document.createElement('span');
  el.className = 'emoji';
  el.textContent = char;
  el.style.left = (x - EMOJI_SIZE / 2) + 'px';
  el.style.top  = (y - EMOJI_SIZE / 2) + 'px';
  el.style.fontSize = EMOJI_SIZE + 'px';
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

  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => {
      el.remove();
      const idx = activeEmojis.indexOf(el);
      if (idx !== -1) activeEmojis.splice(idx, 1);
    }, 2000);
  }, 5000);

  spawnParticles(x, y, splatKeysGame);
  playRandomSound();
}

function randPos() {
  return { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight };
}

export const splatKeys = {
  id: 'splat-keys',
  start() {
    splatKeysGame.style.display = 'block';
    splatHint.style.opacity = '1';
  },
  stop() {
    splatKeysGame.style.display = 'none';
    activeEmojis.forEach(el => el.remove());
    activeEmojis = [];
    splatKeysGame.querySelectorAll('.particle').forEach(p => p.remove());
  },
  onKey(e) {
    const pos = randPos();
    spawnEmoji(pos.x, pos.y, e.key);
  },
  onMouse(e) {
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
    for (let i = 0; i < e.touches.length; i++) {
      spawnEmoji(e.touches[i].clientX, e.touches[i].clientY);
    }
  }
};
