/* =========================================================
 *  Dress-Up Party — tap a furry friend to dress it up,
 *  then take a photo in the photo booth. No wrong answers.
 *
 *  The body is inline SVG tinted per animal; the face and
 *  every piece of clothing are Fluent 3D emoji placed on
 *  named slots. Every interaction is a single tap.
 * ========================================================= */

import {
  initAudio, playBubblePop, playSnap, playWhoosh, playColorChange,
  playCardSwoosh, playWinFanfare
} from '../audio.js';
import { spawnParticles } from '../effects.js';
import { preloadEmojis, createEmojiImg, getEmojiUrl } from '../emoji.js';
import { EMOJI_REGISTRY } from '../emoji-registry.js';
import { createTimerPool } from '../timers.js';
import { shareOrCopy } from '../share.js';

// ===== Data =====

const ANIMALS = [
  { emoji: '🐻', name: 'Bear',  body: '#C58B5A', belly: '#EBC9A4' },
  { emoji: '🐰', name: 'Bunny', body: '#F1EDE8', belly: '#FBD9E0' },
  { emoji: '🐱', name: 'Cat',   body: '#F4A261', belly: '#FCE3C8' },
  { emoji: '🐶', name: 'Puppy', body: '#D9A066', belly: '#F4E0C2' },
  { emoji: '🐸', name: 'Frog',  body: '#7BC96F', belly: '#DAF3CC' },
  { emoji: '🐼', name: 'Panda', body: '#E9E9E9', belly: '#FFFFFF' },
];

// Geometry is in % of the square puppet box. Item index 0 = nothing worn.
const SLOTS = {
  hat:     { items: ['', '🎩', '👒', '🧢', '👑', '🎀', '🎓'],             x: 50, y: 5,  size: 30, z: 6,
             hit: { x: 18, y: -10, w: 64, h: 24 } },
  glasses: { items: ['', '👓', '🕶️', '🥽'],                          x: 50, y: 23, size: 22, z: 5,
             hit: { x: 24, y: 14, w: 52, h: 16 } },
  top:     { items: ['', '👕', '👗', '🧥', '🦺', '👘', '🥋', '🎽'],        x: 50, y: 60, size: 46, z: 4,
             hit: { x: 22, y: 42, w: 56, h: 34 } },
  shoes:   { items: ['', '👟', '🥾', '👠', '🩴', '👢'],              x: 50, y: 93, size: 20, w: 44, z: 4,
             hit: { x: 18, y: 78, w: 64, h: 26 } },
  hand:    { items: ['', '🎈', '🧸', '🌂', '⚽', '🎸', '🪁', '🍦', '🪄'], x: 83, y: 65, size: 26, z: 7,
             hit: { x: 70, y: 47, w: 32, h: 36 } },
};
const SLOT_ORDER = ['hat', 'glasses', 'top', 'shoes', 'hand'];
const SLOT_LABEL = { hat: 'Hat', glasses: 'Glasses', top: 'Top', shoes: 'Shoes', hand: 'Toy' };
// Tapping the lower face cycles the animal (hat and glasses own the bands above)
const FACE_HIT = { x: 26, y: 30, w: 48, h: 12 };
const HEAD = { x: 50, y: 22, size: 36 };

const SCENES = [
  { cls: 'du-scene-park',    emoji: ['🌳', '🌷', '🦋'] },
  { cls: 'du-scene-beach',   emoji: ['🌴', '🌊', '⛱️'] },
  { cls: 'du-scene-circus',  emoji: ['🎪', '🎈', '🎠'] },
  { cls: 'du-scene-night',   emoji: ['🌙', '⭐', '🦉'] },
  { cls: 'du-scene-snow',    emoji: ['❄️', '⛄', '🌲'] },
  { cls: 'du-scene-rainbow', emoji: ['🌈', '☁️', '🦄'] },
];
const SCENE_SPOTS = [{ x: 9, y: 20 }, { x: 12, y: 74 }, { x: 84, y: 80 }];

// Outfit name: adjective from the hat, then the animal ("Royal Bunny")
const HAT_ADJ = ['Happy', 'Fancy', 'Sunny', 'Sporty', 'Royal', 'Pretty', 'Clever'];
const CONFETTI = ['🎉', '✨', '⭐', '🎊', '💫'];

// ===== State =====

const timers = createTimerPool();
let sessionId = 0;
let gameEl = null;
let puppetEl = null, bodyFill = null, bellyFill = null, headSlot = null;
let slotEls = {}, chipEls = {}, animalChip = null;
let sceneLayer = null, hintEl = null, flashEl = null, cardWrap = null;
let gameState = 'idle';      // idle | loading | dressing | photo | card
let animalIdx = 0;
let sel = { hat: 0, glasses: 0, top: 0, shoes: 0, hand: 0 };
let sceneIdx = 0;
let hintShown = false;

// ===== Helpers =====

function pct(n) { return n + '%'; }

function emojiEl(emoji, cls) {
  return createEmojiImg(emoji, cls || 'emoji-img');
}

function burstAt(el) {
  if (!el || !gameEl) return;
  const r = el.getBoundingClientRect();
  const g = gameEl.getBoundingClientRect();
  spawnParticles(r.left - g.left + r.width / 2, r.top - g.top + r.height / 2, gameEl);
}

function popAnim(el) {
  if (!el) return;
  el.classList.remove('du-pop');
  void el.offsetWidth;
  el.classList.add('du-pop');
}

function hideHint() {
  if (hintEl && !hintShown) {
    hintShown = true;
    hintEl.classList.add('du-hint-hide');
    timers.later(() => { if (hintEl) hintEl.remove(); hintEl = null; }, 500);
  }
}

// ===== DOM =====

function buildDOM() {
  gameEl.innerHTML = '';

  // Scene decorations (behind everything)
  sceneLayer = document.createElement('div');
  sceneLayer.className = 'du-scene';
  SCENE_SPOTS.forEach(s => {
    const d = document.createElement('span');
    d.className = 'du-scene-emoji';
    d.style.left = pct(s.x);
    d.style.top = pct(s.y);
    sceneLayer.appendChild(d);
  });
  gameEl.appendChild(sceneLayer);

  // Stage + puppet
  const stage = document.createElement('div');
  stage.className = 'du-stage';
  puppetEl = document.createElement('div');
  puppetEl.className = 'du-puppet';

  // Teddy silhouette sized to the clothes: the torso is as wide as the
  // garment slot, arms hang down the sides ending in paws, and the legs
  // sit exactly under the two shoes.
  puppetEl.innerHTML =
    '<svg class="du-body" viewBox="0 0 100 100" aria-hidden="true">' +
      // arms (slight outward lean) + paws
      '<rect class="du-fill" x="27" y="45" width="10" height="26" rx="5" transform="rotate(8 32 45)"/>' +
      '<rect class="du-fill" x="63" y="45" width="10" height="26" rx="5" transform="rotate(-8 68 45)"/>' +
      '<circle class="du-fill" cx="28.5" cy="72" r="6"/>' +
      '<circle class="du-fill" cx="71.5" cy="72" r="6"/>' +
      // legs (centred under each shoe)
      '<rect class="du-fill" x="33" y="70" width="12" height="22" rx="6"/>' +
      '<rect class="du-fill" x="55" y="70" width="12" height="22" rx="6"/>' +
      // torso + belly
      '<rect class="du-fill" x="35" y="40" width="30" height="37" rx="14"/>' +
      '<ellipse class="du-belly" cx="50" cy="61" rx="10" ry="11"/>' +
    '</svg>';
  bodyFill  = puppetEl.querySelectorAll('.du-fill');
  bellyFill = puppetEl.querySelector('.du-belly');

  // Head (the animal) and clothing slots
  headSlot = makeSlot('head', HEAD.x, HEAD.y, HEAD.size, 3);
  puppetEl.appendChild(headSlot);
  slotEls = {};
  SLOT_ORDER.forEach(name => {
    const s = SLOTS[name];
    slotEls[name] = makeSlot(name, s.x, s.y, s.size, s.z, s.w);
    puppetEl.appendChild(slotEls[name]);
  });

  // Hit zones (on top of the art, invisible, generous)
  SLOT_ORDER.forEach(name => puppetEl.appendChild(makeHit(SLOTS[name].hit, { slot: name })));
  puppetEl.appendChild(makeHit(FACE_HIT, { action: 'animal' }));

  stage.appendChild(puppetEl);
  gameEl.appendChild(stage);

  // Wardrobe strip
  const strip = document.createElement('div');
  strip.className = 'du-strip';
  animalChip = makeChip({ action: 'animal' }, 'Friend');
  strip.appendChild(animalChip);
  chipEls = {};
  SLOT_ORDER.forEach(name => {
    chipEls[name] = makeChip({ slot: name }, SLOT_LABEL[name]);
    strip.appendChild(chipEls[name]);
  });
  gameEl.appendChild(strip);

  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'du-actions';
  actions.appendChild(makeAction('surprise', '🎲', 'Surprise outfit'));
  actions.appendChild(makeAction('photo', '📸', 'Take a photo'));
  gameEl.appendChild(actions);

  // Hint, flash, polaroid container
  hintEl = document.createElement('div');
  hintEl.className = 'du-hint';
  hintEl.textContent = 'Tap your friend to dress up!';
  gameEl.appendChild(hintEl);

  flashEl = document.createElement('div');
  flashEl.className = 'du-flash';
  gameEl.appendChild(flashEl);

  cardWrap = document.createElement('div');
  cardWrap.className = 'du-card-wrap';
  gameEl.appendChild(cardWrap);
}

function makeSlot(name, x, y, size, z, width) {
  const w = width || size;
  const el = document.createElement('div');
  el.className = 'du-slot du-slot-' + name;
  el.style.left = pct(x - w / 2);
  el.style.top = pct(y - size / 2);
  el.style.width = pct(w);
  el.style.height = pct(size);
  el.style.zIndex = z;
  return el;
}

function makeHit(rect, data) {
  const b = document.createElement('button');
  b.className = 'du-hit';
  b.type = 'button';
  b.style.left = pct(rect.x);
  b.style.top = pct(rect.y);
  b.style.width = pct(rect.w);
  b.style.height = pct(rect.h);
  if (data.slot) { b.dataset.slot = data.slot; b.setAttribute('aria-label', 'Change ' + SLOT_LABEL[data.slot].toLowerCase()); }
  if (data.action) { b.dataset.action = data.action; b.setAttribute('aria-label', 'Change friend'); }
  return b;
}

function makeChip(data, label) {
  const c = document.createElement('button');
  c.className = 'du-chip';
  c.type = 'button';
  if (data.slot) c.dataset.slot = data.slot;
  if (data.action) c.dataset.action = data.action;
  c.innerHTML = '<span class="du-chip-emoji"></span><span class="du-chip-label">' + label + '</span>';
  return c;
}

function makeAction(action, emoji, label) {
  const b = document.createElement('button');
  b.className = 'du-btn du-btn-' + action;
  b.type = 'button';
  b.dataset.action = action;
  b.setAttribute('aria-label', label);
  b.appendChild(emojiEl(emoji));
  return b;
}

// ===== Render =====

function renderAll() {
  renderAnimal();
  SLOT_ORDER.forEach(renderSlot);
  renderScene();
}

function renderAnimal() {
  const a = ANIMALS[animalIdx];
  headSlot.innerHTML = '';
  headSlot.appendChild(emojiEl(a.emoji));
  bodyFill.forEach(p => { p.style.fill = a.body; });
  bellyFill.style.fill = a.belly;
  const chipEmoji = animalChip.querySelector('.du-chip-emoji');
  chipEmoji.innerHTML = '';
  chipEmoji.appendChild(emojiEl(a.emoji));
}

function renderSlot(name) {
  const item = SLOTS[name].items[sel[name]];
  const el = slotEls[name];
  el.innerHTML = '';
  if (item) {
    el.appendChild(emojiEl(item));
    if (name === 'shoes') el.appendChild(emojiEl(item));   // one per leg, second mirrored in CSS
  }
  const chipEmoji = chipEls[name].querySelector('.du-chip-emoji');
  chipEmoji.innerHTML = '';
  if (item) chipEmoji.appendChild(emojiEl(item));
  else chipEmoji.textContent = '·';
  chipEls[name].classList.toggle('du-chip-empty', !item);
}

function renderScene() {
  SCENES.forEach(s => gameEl.classList.remove(s.cls));
  gameEl.classList.add(SCENES[sceneIdx].cls);
  const spots = sceneLayer.querySelectorAll('.du-scene-emoji');
  SCENES[sceneIdx].emoji.forEach((e, i) => {
    if (!spots[i]) return;
    spots[i].innerHTML = '';
    spots[i].appendChild(emojiEl(e));
    popAnim(spots[i]);
  });
}

// ===== Actions =====

function cycle(name, step) {
  const s = SLOTS[name];
  if (!s) return;
  sel[name] = (sel[name] + (step || 1) + s.items.length) % s.items.length;
  renderSlot(name);
  popAnim(slotEls[name]);
  popAnim(chipEls[name]);
  playBubblePop(SLOT_ORDER.indexOf(name) + 1);
  burstAt(slotEls[name]);
  hideHint();
}

function nextAnimal() {
  animalIdx = (animalIdx + 1) % ANIMALS.length;
  renderAnimal();
  popAnim(puppetEl);
  popAnim(animalChip);
  playSnap();
  burstAt(headSlot);
  hideHint();
}

function nextScene(evt) {
  sceneIdx = (sceneIdx + 1) % SCENES.length;
  renderScene();
  playColorChange();
  if (evt && gameEl) {
    const g = gameEl.getBoundingClientRect();
    spawnParticles(evt.clientX - g.left, evt.clientY - g.top, gameEl);
  }
  hideHint();
}

function surprise() {
  hideHint();
  playWhoosh();
  SLOT_ORDER.forEach((name, i) => {
    timers.later(() => {
      if (gameState !== 'dressing') return;
      const s = SLOTS[name];
      let next = 1 + Math.floor(Math.random() * (s.items.length - 1));   // always something, never "none"
      if (next === sel[name]) next = 1 + (next % (s.items.length - 1));
      sel[name] = next;
      renderSlot(name);
      popAnim(slotEls[name]);
      popAnim(chipEls[name]);
      playBubblePop(i + 1);
      burstAt(slotEls[name]);
    }, i * 120);
  });
  timers.later(() => {
    if (gameState !== 'dressing') return;
    sceneIdx = (sceneIdx + 1 + Math.floor(Math.random() * (SCENES.length - 1))) % SCENES.length;
    renderScene();
    playColorChange();
  }, SLOT_ORDER.length * 120);
}

function takePhoto() {
  if (gameState !== 'dressing') return;
  gameState = 'photo';
  hideHint();

  // Shutter + flash
  playCardSwoosh();
  flashEl.classList.remove('du-flash-on');
  void flashEl.offsetWidth;
  flashEl.classList.add('du-flash-on');

  // Little dance while the photo "develops"
  puppetEl.classList.add('du-dance');
  timers.later(() => { playWinFanfare(); spawnConfetti(); }, 450);
  timers.later(showCard, 1400);
}

function outfitName() {
  return HAT_ADJ[sel.hat] + ' ' + ANIMALS[animalIdx].name;
}

function showCard() {
  if (gameState !== 'photo') return;
  gameState = 'card';
  puppetEl.classList.remove('du-dance');

  const clone = puppetEl.cloneNode(true);
  clone.className = 'du-puppet du-puppet-photo';
  clone.querySelectorAll('.du-hit').forEach(h => h.remove());

  cardWrap.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'du-polaroid';
  const photo = document.createElement('div');
  photo.className = 'du-photo ' + SCENES[sceneIdx].cls;
  photo.appendChild(clone);
  card.appendChild(photo);

  const caption = document.createElement('div');
  caption.className = 'du-caption';
  caption.textContent = outfitName();
  card.appendChild(caption);

  const actions = document.createElement('div');
  actions.className = 'du-card-actions';
  actions.innerHTML =
    '<button class="du-btn-again" type="button">Dress up again</button>' +
    '<button class="endcard-share-btn" data-share type="button"><img src="' + getEmojiUrl('📤') + '" class="emoji-img btn-emoji" alt="📤"> Share with a parent</button>';
  card.appendChild(actions);
  cardWrap.appendChild(card);

  // These buttons rely on click (touchstart passthrough via their class names)
  actions.querySelector('.du-btn-again').addEventListener('click', (e) => { e.stopPropagation(); closeCard(); });
  wireEndcardShare(card);

  timers.later(() => cardWrap.classList.add('du-card-show'), 20);
}

function closeCard() {
  if (gameState !== 'card') return;
  gameState = 'dressing';
  cardWrap.classList.remove('du-card-show');
  timers.later(() => { if (cardWrap) cardWrap.innerHTML = ''; }, 300);
  playBubblePop(0);
}

function spawnConfetti() {
  const count = 24;
  for (let i = 0; i < count; i++) {
    const c = document.createElement('span');
    c.className = 'du-confetti';
    const img = emojiEl(CONFETTI[Math.floor(Math.random() * CONFETTI.length)]);
    const size = 1 + Math.random() * 1.4;
    img.style.width = size + 'rem';
    img.style.height = size + 'rem';
    c.appendChild(img);
    c.style.left = (Math.random() * 100) + '%';
    c.style.top = '-40px';
    c.style.setProperty('--fall-dist', (window.innerHeight + 80) + 'px');
    c.style.setProperty('--fall-rot', (Math.random() * 720 - 360) + 'deg');
    c.style.setProperty('--fall-dur', (1.8 + Math.random() * 1.6) + 's');
    c.style.setProperty('--sway', (Math.random() * 120 - 60) + 'px');
    c.style.animationDelay = (Math.random() * 0.6) + 's';
    gameEl.appendChild(c);
    c.addEventListener('animationend', () => c.remove());
    timers.later(() => c.remove(), 4500);   // reduced-motion fallback
  }
}

function wireEndcardShare(container) {
  const btn = container.querySelector('[data-share]');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const result = await shareOrCopy();
    if (result.method === 'copy' && result.success) {
      btn.innerHTML = '<img src="' + getEmojiUrl('✅') + '" class="emoji-img btn-emoji" alt="✅"> Copied!';
      timers.later(() => { btn.innerHTML = '<img src="' + getEmojiUrl('📤') + '" class="emoji-img btn-emoji" alt="📤"> Share with a parent'; }, 2500);
    }
  });
  btn.addEventListener('touchend', (e) => e.stopPropagation());
}

// ===== Input =====

// One delegated pointerdown for the whole game: hit zones and chips carry
// data-slot / data-action; anything else on the stage changes the scene.
function onPointer(e) {
  if (gameState === 'loading' || gameState === 'photo') return;
  initAudio();

  if (gameState === 'card') {
    // Buttons inside the polaroid use click; a tap anywhere else closes it
    if (!e.target.closest('.du-polaroid')) closeCard();
    return;
  }

  const target = e.target.closest('[data-slot], [data-action]');
  if (target) {
    e.preventDefault();
    if (target.dataset.slot) cycle(target.dataset.slot, 1);
    else if (target.dataset.action === 'animal') nextAnimal();
    else if (target.dataset.action === 'surprise') surprise();
    else if (target.dataset.action === 'photo') takePhoto();
    return;
  }
  if (e.target.closest('.du-strip, .du-actions')) return;
  e.preventDefault();
  nextScene(e);
}

// ===== Cleanup =====

function cleanup() {
  timers.clearAll();
  if (gameEl) {
    gameEl.removeEventListener('pointerdown', onPointer);
    gameEl.innerHTML = '';
    SCENES.forEach(s => gameEl.classList.remove(s.cls));
  }
  puppetEl = bodyFill = bellyFill = headSlot = null;
  slotEls = {}; chipEls = {}; animalChip = null;
  sceneLayer = hintEl = flashEl = cardWrap = null;
  gameState = 'idle';
  animalIdx = 0;
  sel = { hat: 0, glasses: 0, top: 0, shoes: 0, hand: 0 };
  sceneIdx = 0;
  hintShown = false;
}

// ===== Exported Game Module =====

export const dressUp = {
  id: 'dress-up',

  start() {
    gameEl = document.getElementById('dressUpGame');
    gameEl.style.display = 'block';
    gameState = 'loading';
    // Bound synchronously so a stop() mid-preload can always remove it
    gameEl.addEventListener('pointerdown', onPointer);

    const mySession = ++sessionId;
    preloadEmojis(EMOJI_REGISTRY['dress-up'] || []).then(() => {
      if (mySession !== sessionId || gameState !== 'loading') return;   // stopped while loading
      buildDOM();
      renderAll();
      gameState = 'dressing';
    });
  },

  stop() {
    if (gameEl) gameEl.style.display = 'none';
    cleanup();
  },

  onKey(e) {
    if (e.repeat) return;
    if (gameState === 'card') {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') closeCard();
      return;
    }
    if (gameState !== 'dressing') return;
    if (e.key === ' ') { surprise(); return; }
    if (e.key === 'Enter') { takePhoto(); return; }
    if (e.key.length === 1) {
      // Same key → same slot, so a toddler discovers "this key changes the hat"
      const idx = e.key.toLowerCase().charCodeAt(0) % SLOT_ORDER.length;
      cycle(SLOT_ORDER[idx], 1);
    }
  },

  // Pointer input is handled by the delegated pointerdown in start()
  onMouse() {},
  onTouch() {}
};
