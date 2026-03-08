import { initAudio, getAudioCtx } from '../audio.js';
import { spawnParticles } from '../effects.js';

/* =============================================================
 *  Ball Bonanza — Chaotic Emoji Physics Playground
 * ============================================================= */

// ---- Constants ----
const PAD = 20;
const BALL_DRAG = 0.995;       // per-frame at 60 fps
const CHAR_DRAG = 0.975;
const WALL_REST = 0.9;
const CHAR_WALL_REST = 0.7;
const BALL_CHAR_REST = 0.8;
const MIN_SPEED = 0.3;
const LAUNCH_SPEED = 18;

// ---- Responsive sizing (computed in init) ----
// Base values tuned for iPhone (~375px wide)
const BASE_W = 375;
const BASE_BALL_R = 25;
const BASE_CHAR_R = 32;
const BASE_BALL_FONT = 50;
const BASE_CHAR_FONT = 60;
const MAX_BALL_FONT = 90;   // cap to avoid emoji blurriness
const MAX_CHAR_FONT = 100;
const BASE_CHARS = 5;       // min characters (small screens)
const MAX_CHARS_SMALL = 8;  // max on small screens
const MAX_CHARS_LARGE = 12; // max on large screens

let BALL_R = BASE_BALL_R;
let CHAR_R = BASE_CHAR_R;
let BALL_FONT = BASE_BALL_FONT;
let CHAR_FONT = BASE_CHAR_FONT;
let INITIAL_CHARS = BASE_CHARS;
let MAX_CHARS = MAX_CHARS_SMALL;

function computeSizes() {
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const screenMin = Math.min(screenW, screenH);

  // Scale factor: 1.0 at 375px, grows linearly, capped so fonts don't exceed max
  const scale = Math.max(1, screenMin / BASE_W);

  BALL_FONT = Math.min(Math.round(BASE_BALL_FONT * scale), MAX_BALL_FONT);
  CHAR_FONT = Math.min(Math.round(BASE_CHAR_FONT * scale), MAX_CHAR_FONT);

  // Radii scale proportionally with font size
  BALL_R = Math.round(BASE_BALL_R * (BALL_FONT / BASE_BALL_FONT));
  CHAR_R = Math.round(BASE_CHAR_R * (CHAR_FONT / BASE_CHAR_FONT));

  // More characters on bigger screens (based on screen area relative to iPhone)
  const areaRatio = (screenW * screenH) / (375 * 667); // iPhone SE area
  INITIAL_CHARS = Math.min(Math.round(BASE_CHARS + (areaRatio - 1) * 2), 10);
  INITIAL_CHARS = Math.max(BASE_CHARS, INITIAL_CHARS);
  MAX_CHARS = areaRatio > 2 ? MAX_CHARS_LARGE : MAX_CHARS_SMALL;
}
const CHAR_POOL = ['🐱','🐶','🐸','🦁','🐷','🐧','🐼','🦊','🐮','🐔','🐵','🐰','🐻','🦄','🐹'];
const REACTIONS = ['squash','spin','bounce','flip','shock'];

// ---- State ----
let gameEl;
let W, H;
let ball;
let characters = [];
let bonusBalls = [];
let inputCount = 0;
let running = false;
let animFrame = null;
let lastTime = 0;
let idleTime = 0;
let nextBonusAt, nextMegaAt;
let newCharTimer, shuffleTimer;

// ---- Audio helpers ----
function ctx() { return getAudioCtx(); }

function synth(type, freq, dur, sweep, vol) {
  const c = ctx(); if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  g.gain.setValueAtTime(vol || 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur);
}

function synthMulti(notes, type, vol) {
  const c = ctx(); if (!c) return;
  const t = c.currentTime;
  notes.forEach(([freq, delay, dur]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t + delay);
    g.gain.setValueAtTime(vol || 0.1, t + delay);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
    o.connect(g).connect(c.destination);
    o.start(t + delay); o.stop(t + delay + dur);
  });
}

// ---- Character sounds ----
const charSounds = {
  '🐱': () => synth('sine', 900, 0.15, 400),
  '🐶': () => synth('sawtooth', 200, 0.12, 100),
  '🐸': () => { // FM ribbit
    const c = ctx(); if (!c) return;
    const t = c.currentTime;
    const mod = c.createOscillator(); const mg = c.createGain();
    const o = c.createOscillator(); const g = c.createGain();
    mod.frequency.value = 30; mg.gain.value = 200;
    mod.connect(mg).connect(o.frequency);
    o.type = 'square';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(c.destination);
    mod.start(t); o.start(t); mod.stop(t + 0.15); o.stop(t + 0.15);
  },
  '🦁': () => synth('sawtooth', 120, 0.2, 60),
  '🐷': () => { // squeal up-down
    const c = ctx(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(400, t);
    o.frequency.linearRampToValueAtTime(800, t + 0.07);
    o.frequency.linearRampToValueAtTime(500, t + 0.15);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.15);
  },
  '🐧': () => synth('sine', 300, 0.2, 1200, 0.1),
  '🐼': () => synth('sine', 100, 0.15, 50, 0.14),
  '🦊': () => synth('triangle', 1000, 0.1, 600),
  '🐮': () => synth('sawtooth', 130, 0.2, 110, 0.08),
  '🐔': () => synth('square', 500, 0.12, 200, 0.1),
  '🐵': () => synthMulti([[600,0,0.07],[800,0.08,0.07]], 'sine'),
  '🐰': () => { // squeaky eee
    const c = ctx(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(1200, t);
    o.frequency.linearRampToValueAtTime(1400, t + 0.05);
    o.frequency.linearRampToValueAtTime(1100, t + 0.1);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.12);
  },
  '🐻': () => synth('sawtooth', 80, 0.2, 60, 0.1),
  '🦄': () => synthMulti([[523,0,0.12],[659,0.04,0.12],[784,0.08,0.12],[1047,0.12,0.12]], 'sine', 0.08),
  '🐹': () => synth('sine', 1500, 0.1, 1000, 0.1),
};

// ---- Ball sounds ----
function sndLaunch() { synth('triangle', 800 + Math.random() * 200, 0.05, 200); }
function sndWall()   { synth('sine', 300 + Math.random() * 50, 0.04, 150, 0.06); }
function sndHit()    { synth('sine', 500, 0.08, 200, 0.14); }
function sndBallBall() { synthMulti([[1200,0,0.03],[1600,0.015,0.03]], 'sine', 0.08); }
function sndBonus()  { synthMulti([[600,0,0.1],[800,0.04,0.1],[1000,0.08,0.1]], 'sine', 0.1); }
function sndMega()   {
  synth('sine', 150, 0.15, 40, 0.18);
  synthMulti([[523,0.05,0.15],[659,0.1,0.15],[784,0.15,0.15],[1047,0.2,0.15],[1319,0.25,0.15]], 'sine', 0.08);
}
function sndNewChar() { synthMulti([[440,0,0.1],[523,0.07,0.1]], 'sine', 0.1); }

// ---- Helpers ----
function rand(a, b) { return a + Math.random() * (b - a); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function speed(o) { return Math.hypot(o.vx, o.vy); }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

function randomPos(exclude, minDist) {
  for (let attempts = 0; attempts < 50; attempts++) {
    const x = rand(PAD + CHAR_R, W - PAD - CHAR_R);
    const y = rand(PAD + CHAR_R, H - PAD - CHAR_R);
    let ok = true;
    for (const e of exclude) {
      if (Math.hypot(x - e.x, y - e.y) < (minDist || 120)) { ok = false; break; }
    }
    if (ok) return { x, y };
  }
  return { x: rand(PAD + CHAR_R, W - PAD - CHAR_R), y: rand(PAD + CHAR_R, H - PAD - CHAR_R) };
}

// ---- DOM creation ----
function makeEl(emoji, cls) {
  const el = document.createElement('div');
  el.className = cls;
  const inner = document.createElement('span');
  inner.className = 'bb-inner';
  inner.textContent = emoji;
  el.appendChild(inner);
  return el;
}

function makeBall(emoji, x, y) {
  const el = makeEl(emoji, 'bb-ball');
  el.style.fontSize = BALL_FONT + 'px';
  gameEl.appendChild(el);
  return { x, y, vx: 0, vy: 0, r: BALL_R, rotation: 0, el, emoji };
}

function makeChar(emoji, x, y) {
  const el = makeEl(emoji, 'bb-char');
  el.style.fontSize = CHAR_FONT + 'px';
  const starsDiv = document.createElement('div');
  starsDiv.className = 'bb-stars';
  el.appendChild(starsDiv);
  gameEl.appendChild(el);
  return {
    x, y, vx: 0, vy: 0, r: CHAR_R, emoji, el,
    state: 'idle',        // idle | knocked | recovering | walking
    stateTimer: 0,
    targetX: null, targetY: null,
    bobPhase: Math.random() * Math.PI * 2,
    fidgetTimer: rand(4, 9),
    reactionClass: null,
  };
}

// ---- Visual effects ----
function flashAt(x, y) {
  const el = document.createElement('div');
  el.className = 'bb-flash';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  gameEl.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function impactStars(x, y) {
  const emojis = ['⭐','✨','💫'];
  for (let i = 0; i < 4; i++) {
    const el = document.createElement('span');
    el.className = 'bb-impact-star';
    el.textContent = emojis[i % emojis.length];
    const angle = (Math.PI * 2 / 4) * i + rand(-0.3, 0.3);
    const d = rand(25, 50);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.setProperty('--bx', Math.cos(angle) * d + 'px');
    el.style.setProperty('--by', Math.sin(angle) * d + 'px');
    gameEl.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

function showDizzyStars(char) {
  const starsDiv = char.el.querySelector('.bb-stars');
  starsDiv.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.className = 'bb-star';
    s.textContent = '⭐';
    s.style.setProperty('--ss', (i * 120) + 'deg');
    s.style.animationDelay = (i * 0.15) + 's';
    starsDiv.appendChild(s);
  }
  setTimeout(() => { starsDiv.innerHTML = ''; }, 2000);
}

function showEventText(text, x, y) {
  const el = document.createElement('div');
  el.className = 'bb-event-text';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  gameEl.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// ---- Character reactions ----
function triggerReaction(char) {
  // Remove previous reaction class
  if (char.reactionClass) {
    char.el.classList.remove(char.reactionClass);
  }

  // Randomly pick a reaction
  const pick = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
  const cls = 'bb-react-' + pick;
  char.reactionClass = cls;

  // Glow briefly
  char.el.classList.add('bb-glow');
  setTimeout(() => char.el.classList.remove('bb-glow'), 100);

  // Force reflow for re-triggering animation
  void char.el.offsetWidth;
  char.el.classList.add(cls);

  // Show dizzy stars on ~30% of hits
  if (Math.random() < 0.3) showDizzyStars(char);

  // Play character sound
  const snd = charSounds[char.emoji];
  if (snd) snd();

  // Clean up reaction after animation
  const dur = pick === 'flip' ? 1200 : pick === 'spin' ? 800 : 500;
  setTimeout(() => {
    char.el.classList.remove(cls);
    char.reactionClass = null;
  }, dur);
}

// ---- Physics ----
function updateBallPhysics(b, dt) {
  const f = Math.pow(BALL_DRAG, dt * 60);
  b.vx *= f;
  b.vy *= f;
  b.x += b.vx * dt * 60;
  b.y += b.vy * dt * 60;
  b.rotation += speed(b) * dt * 60 * 2 * (b.vx > 0 ? 1 : -1);

  // Wall bounces
  if (b.x < PAD + b.r)     { b.x = PAD + b.r;     b.vx *= -WALL_REST; sndWall(); }
  if (b.x > W - PAD - b.r) { b.x = W - PAD - b.r; b.vx *= -WALL_REST; sndWall(); }
  if (b.y < PAD + b.r)     { b.y = PAD + b.r;     b.vy *= -WALL_REST; sndWall(); }
  if (b.y > H - PAD - b.r) { b.y = H - PAD - b.r; b.vy *= -WALL_REST; sndWall(); }

  // Never fully stop
  if (speed(b) < MIN_SPEED) {
    const a = Math.random() * Math.PI * 2;
    b.vx = Math.cos(a) * MIN_SPEED;
    b.vy = Math.sin(a) * MIN_SPEED;
  }
}

function updateCharPhysics(c, dt) {
  if (c.state === 'walking') {
    // Move toward target
    const dx = c.targetX - c.x;
    const dy = c.targetY - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) {
      c.state = 'idle';
      c.vx = 0; c.vy = 0;
    } else {
      const spd = 1.5; // pixels per frame
      c.vx = (dx / d) * spd;
      c.vy = (dy / d) * spd;
      c.x += c.vx * dt * 60;
      c.y += c.vy * dt * 60;
    }
    return;
  }

  if (Math.abs(c.vx) < 0.1 && Math.abs(c.vy) < 0.1 && c.state === 'knocked') {
    c.vx = 0; c.vy = 0;
    c.state = 'recovering';
    c.stateTimer = 1.5;
    c.el.classList.add('bb-wobble');
    setTimeout(() => c.el.classList.remove('bb-wobble'), 300);
    return;
  }

  if (c.state === 'recovering') {
    c.stateTimer -= dt;
    if (c.stateTimer <= 0) {
      c.state = 'walking';
      const pos = randomPos([...characters, ball], 100);
      c.targetX = pos.x;
      c.targetY = pos.y;
    }
    return;
  }

  if (c.state !== 'knocked') return;

  const f = Math.pow(CHAR_DRAG, dt * 60);
  c.vx *= f;
  c.vy *= f;
  c.x += c.vx * dt * 60;
  c.y += c.vy * dt * 60;

  // Wall bounces
  if (c.x < PAD + c.r)     { c.x = PAD + c.r;     c.vx *= -CHAR_WALL_REST; }
  if (c.x > W - PAD - c.r) { c.x = W - PAD - c.r; c.vx *= -CHAR_WALL_REST; }
  if (c.y < PAD + c.r)     { c.y = PAD + c.r;     c.vy *= -CHAR_WALL_REST; }
  if (c.y > H - PAD - c.r) { c.y = H - PAD - c.r; c.vy *= -CHAR_WALL_REST; }
}

// ---- Collision detection ----
function collideBallChar(b) {
  for (const c of characters) {
    const d = dist(b, c);
    const minD = b.r + c.r;
    if (d < minD && d > 0) {
      // Separate
      const nx = (c.x - b.x) / d;
      const ny = (c.y - b.y) / d;
      const overlap = minD - d;
      b.x -= nx * overlap * 0.3;
      b.y -= ny * overlap * 0.3;
      c.x += nx * overlap * 0.7;
      c.y += ny * overlap * 0.7;

      // Ball bounce
      const dot = b.vx * nx + b.vy * ny;
      b.vx -= dot * nx * (1 + BALL_CHAR_REST);
      b.vy -= dot * ny * (1 + BALL_CHAR_REST);

      // Knockback to character
      const bs = speed(b);
      const knockForce = Math.max(bs * 0.6, 4);
      c.vx = nx * knockForce;
      c.vy = ny * knockForce;
      c.state = 'knocked';

      // Effects
      const cx = (b.x + c.x) / 2;
      const cy = (b.y + c.y) / 2;
      sndHit();
      flashAt(cx, cy);
      impactStars(cx, cy);
      triggerReaction(c);
    }
  }
}

function collideCharChar() {
  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      const a = characters[i];
      const b = characters[j];
      if (a.state !== 'knocked' && b.state !== 'knocked') continue;
      const d = dist(a, b);
      const minD = a.r + b.r;
      if (d < minD && d > 0) {
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        const overlap = minD - d;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;

        // Transfer momentum
        const relVx = a.vx - b.vx;
        const relVy = a.vy - b.vy;
        const relDot = relVx * nx + relVy * ny;
        if (relDot > 0) {
          a.vx -= relDot * nx * 0.5;
          a.vy -= relDot * ny * 0.5;
          b.vx += relDot * nx * 0.5;
          b.vy += relDot * ny * 0.5;
        }

        // Both react
        if (a.state !== 'knocked') { a.state = 'knocked'; triggerReaction(a); }
        if (b.state !== 'knocked') { b.state = 'knocked'; triggerReaction(b); }

        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        flashAt(cx, cy);
      }
    }
  }
}

function collideBalls() {
  const all = [ball, ...bonusBalls];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      const d = dist(a, b);
      const minD = a.r + b.r;
      if (d < minD && d > 0) {
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        const overlap = minD - d;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
        const relDot = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (relDot > 0) {
          a.vx -= relDot * nx;
          a.vy -= relDot * ny;
          b.vx += relDot * nx;
          b.vy += relDot * ny;
        }
        sndBallBall();
      }
    }
  }
}

// ---- Events ----
function spawnBonusBall() {
  sndBonus();
  const b = makeBall('🏀', W / 2, H / 2);
  const angle = Math.random() * Math.PI * 2;
  b.vx = Math.cos(angle) * LAUNCH_SPEED;
  b.vy = Math.sin(angle) * LAUNCH_SPEED;
  bonusBalls.push(b);
  showEventText('BONUS!', W / 2, H / 2);
  spawnParticles(W / 2, H / 2, gameEl);

  // Remove after 8 seconds
  setTimeout(() => {
    const idx = bonusBalls.indexOf(b);
    if (idx !== -1) {
      bonusBalls.splice(idx, 1);
      b.el.style.transition = 'opacity 0.5s';
      b.el.style.opacity = '0';
      setTimeout(() => b.el.remove(), 500);
    }
  }, 8000);
}

function triggerMegaEvent() {
  sndMega();
  gameEl.classList.add('bb-shaking');
  setTimeout(() => gameEl.classList.remove('bb-shaking'), 200);
  showEventText('MEGA!', W / 2, H / 2);

  // Spawn 4-5 balls from center
  const count = 4 + Math.floor(Math.random() * 2);
  const megaBalls = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + rand(-0.3, 0.3);
    const b = makeBall(['🏐','🎾','🏈','🥎','🏀'][i % 5], W / 2, H / 2);
    b.vx = Math.cos(angle) * LAUNCH_SPEED * 1.2;
    b.vy = Math.sin(angle) * LAUNCH_SPEED * 1.2;
    bonusBalls.push(b);
    megaBalls.push(b);
  }

  // Remove after 5 seconds
  setTimeout(() => {
    megaBalls.forEach(b => {
      const idx = bonusBalls.indexOf(b);
      if (idx !== -1) {
        bonusBalls.splice(idx, 1);
        b.el.style.transition = 'opacity 0.5s';
        b.el.style.opacity = '0';
        setTimeout(() => b.el.remove(), 500);
      }
    });
  }, 5000);
}

function spawnNewCharacter() {
  if (characters.length >= MAX_CHARS) return;
  const available = CHAR_POOL.filter(e => !characters.some(c => c.emoji === e));
  if (available.length === 0) return;
  const emoji = available[Math.floor(Math.random() * available.length)];

  // Enter from random edge
  const edge = Math.floor(Math.random() * 4);
  let sx, sy;
  if (edge === 0)      { sx = rand(PAD + CHAR_R, W - PAD - CHAR_R); sy = -CHAR_R * 2; }
  else if (edge === 1) { sx = rand(PAD + CHAR_R, W - PAD - CHAR_R); sy = H + CHAR_R * 2; }
  else if (edge === 2) { sx = -CHAR_R * 2; sy = rand(PAD + CHAR_R, H - PAD - CHAR_R); }
  else                 { sx = W + CHAR_R * 2; sy = rand(PAD + CHAR_R, H - PAD - CHAR_R); }

  const c = makeChar(emoji, sx, sy);
  const pos = randomPos([...characters, ball], 100);
  c.state = 'walking';
  c.targetX = pos.x;
  c.targetY = pos.y;
  characters.push(c);
  sndNewChar();
}

function shuffleCharacters() {
  // All current characters wave and leave, then new ones enter
  const leaving = [...characters];
  leaving.forEach(c => {
    // Pick a random edge to exit toward
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0)      { c.targetX = c.x; c.targetY = -CHAR_R * 3; }
    else if (edge === 1) { c.targetX = c.x; c.targetY = H + CHAR_R * 3; }
    else if (edge === 2) { c.targetX = -CHAR_R * 3; c.targetY = c.y; }
    else                 { c.targetX = W + CHAR_R * 3; c.targetY = c.y; }
    c.state = 'walking';
  });

  // After they leave, remove and spawn new ones
  setTimeout(() => {
    leaving.forEach(c => {
      c.el.remove();
      const idx = characters.indexOf(c);
      if (idx !== -1) characters.splice(idx, 1);
    });
    // Spawn fresh batch scaled to screen
    const count = INITIAL_CHARS + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      setTimeout(() => spawnNewCharacter(), i * 300);
    }
  }, 2500);
}

// ---- Idle behavior ----
function updateIdle(c, dt) {
  if (c.state !== 'idle') return;
  c.bobPhase += dt * 2.5;
  c.fidgetTimer -= dt;
  if (c.fidgetTimer <= 0) {
    c.fidgetTimer = rand(5, 10);
    c.el.classList.add('bb-fidget');
    setTimeout(() => c.el.classList.remove('bb-fidget'), 300);
  }
}

function triggerAttention() {
  const idleChars = characters.filter(c => c.state === 'idle');
  if (idleChars.length === 0) return;
  const c = idleChars[Math.floor(Math.random() * idleChars.length)];
  c.el.classList.add('bb-attention');
  setTimeout(() => c.el.classList.remove('bb-attention'), 800);
}

// ---- Input ----
function handleInput() {
  inputCount++;
  idleTime = 0;

  // Check bonus/mega thresholds
  if (inputCount >= nextMegaAt) {
    triggerMegaEvent();
    nextMegaAt = inputCount + 60 + Math.floor(Math.random() * 20);
    nextBonusAt = inputCount + 20 + Math.floor(Math.random() * 5);
  } else if (inputCount >= nextBonusAt) {
    spawnBonusBall();
    nextBonusAt = inputCount + 20 + Math.floor(Math.random() * 5);
  }
}

function launchBallRandom() {
  handleInput();
  const angle = Math.random() * Math.PI * 2;
  if (speed(ball) < 3) {
    ball.vx = Math.cos(angle) * LAUNCH_SPEED;
    ball.vy = Math.sin(angle) * LAUNCH_SPEED;
  } else {
    ball.vx += Math.cos(angle) * LAUNCH_SPEED * 0.8;
    ball.vy += Math.sin(angle) * LAUNCH_SPEED * 0.8;
  }
  sndLaunch();
}

function launchBallToward(tx, ty) {
  handleInput();
  const dx = tx - ball.x;
  const dy = ty - ball.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) { launchBallRandom(); return; }
  const spd = Math.min(d * 0.04, LAUNCH_SPEED);
  const nx = dx / d;
  const ny = dy / d;
  ball.vx += nx * Math.max(spd, 8);
  ball.vy += ny * Math.max(spd, 8);
  sndLaunch();
}

// ---- Render ----
function render() {
  // Ball
  ball.el.style.transform = `translate(${ball.x - ball.r}px, ${ball.y - ball.r}px)`;
  ball.el.querySelector('.bb-inner').style.transform = `rotate(${ball.rotation}deg)`;

  // Bonus balls
  bonusBalls.forEach(b => {
    b.el.style.transform = `translate(${b.x - b.r}px, ${b.y - b.r}px)`;
  });

  // Characters
  characters.forEach(c => {
    const bobY = c.state === 'idle' ? Math.sin(c.bobPhase) * 2.5 : 0;
    const walkSway = c.state === 'walking' ? Math.sin(c.bobPhase * 4) * 4 : 0;
    c.el.style.transform = `translate(${c.x - c.r}px, ${c.y - c.r + bobY}px)`;
    if (c.state === 'walking') {
      c.el.querySelector('.bb-inner').style.transform = `rotate(${walkSway}deg)`;
    }
  });
}

// ---- Game loop ----
function loop(timestamp) {
  if (!running) return;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // Physics
  updateBallPhysics(ball, dt);
  bonusBalls.forEach(b => updateBallPhysics(b, dt));
  characters.forEach(c => {
    updateCharPhysics(c, dt);
    updateIdle(c, dt);
  });

  // Collisions
  collideBallChar(ball);
  bonusBalls.forEach(b => collideBallChar(b));
  collideCharChar();
  if (bonusBalls.length > 0) collideBalls();

  // Idle attention
  idleTime += dt;
  if (idleTime > 8) {
    triggerAttention();
    idleTime = 0;
  }

  // New character timer
  newCharTimer -= dt;
  if (newCharTimer <= 0) {
    spawnNewCharacter();
    newCharTimer = 30;
  }

  // Shuffle timer
  shuffleTimer -= dt;
  if (shuffleTimer <= 0) {
    shuffleCharacters();
    shuffleTimer = rand(120, 180);
  }

  render();
  animFrame = requestAnimationFrame(loop);
}

// ---- Init / cleanup ----
function init() {
  gameEl = document.getElementById('ballBonanzaGame');
  W = window.innerWidth;
  H = window.innerHeight;

  // Compute responsive sizes based on screen dimensions
  computeSizes();

  // Clear previous
  gameEl.innerHTML = '';
  characters = [];
  bonusBalls = [];
  inputCount = 0;
  idleTime = 0;
  newCharTimer = 30;
  shuffleTimer = rand(120, 180);
  nextBonusAt = 20 + Math.floor(Math.random() * 5);
  nextMegaAt = 60 + Math.floor(Math.random() * 20);

  // Create ball near center
  ball = makeBall('⚽', W / 2, H / 2);

  // Spawn characters scaled to screen size
  const count = INITIAL_CHARS + Math.floor(Math.random() * 2);
  const pool = shuffle([...CHAR_POOL]).slice(0, count);
  const placed = [{ x: W / 2, y: H / 2 }]; // exclude ball center
  pool.forEach(emoji => {
    const pos = randomPos(placed, CHAR_R * 3.5);
    placed.push(pos);
    characters.push(makeChar(emoji, pos.x, pos.y));
  });
}

function cleanup() {
  gameEl.innerHTML = '';
  characters = [];
  bonusBalls = [];
  ball = null;
}

// ---- Resize handler ----
function onResize() {
  W = window.innerWidth;
  H = window.innerHeight;
  computeSizes();
  // Update existing entity radii and font sizes
  if (ball) {
    ball.r = BALL_R;
    ball.el.style.fontSize = BALL_FONT + 'px';
  }
  characters.forEach(c => {
    c.r = CHAR_R;
    c.el.style.fontSize = CHAR_FONT + 'px';
  });
  bonusBalls.forEach(b => {
    b.r = BALL_R;
    b.el.style.fontSize = BALL_FONT + 'px';
  });
}

// ---- Export ----
export const ballBonanza = {
  id: 'ball-bonanza',

  start() {
    initAudio();
    init();
    gameEl.style.display = 'block';
    running = true;
    lastTime = performance.now();
    animFrame = requestAnimationFrame(loop);
    window.addEventListener('resize', onResize);
  },

  stop() {
    running = false;
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    window.removeEventListener('resize', onResize);
    cleanup();
    gameEl.style.display = 'none';
  },

  onKey(e) {
    if (!running) return;
    if (e.repeat) return;   // ignore held-down keys — one press = one launch
    launchBallRandom();
  },

  onMouse(e) {
    if (!running) return;
    launchBallToward(e.clientX, e.clientY);
  },

  onTouch(e) {
    if (!running) return;
    for (let i = 0; i < e.touches.length; i++) {
      launchBallToward(e.touches[i].clientX, e.touches[i].clientY);
    }
  }
};
