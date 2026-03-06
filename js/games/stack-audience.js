/* =========================================================
 *  Stack & Smash — Stadium Audience
 *  Reactive emoji crowd in semicircular stadium bowl layout
 * ========================================================= */

const AUDIENCE_EMOJIS = [
  '🐶','🐱','🐻','🐼','🐸','🐵','🦁','🐯','🐷','🐮',
  '🐰','🐹','🐧','🐔','🦊','😀','😃','😄','😊','🥳','🤩'
];
const WORRY_EMOJIS = ['😰','😱','🙈','😬','🫣'];

// ---- Stadium layout constants ----
const NUM_ROWS      = 20;
const MIN_RADIUS    = 80;    // front row arc radius (px)
const RADIUS_STEP   = 22;    // spacing between rows
const CLEAR_ZONE    = 70;    // no emojis within this distance of ball center
const ARC_START_DEG = 15;    // arc start angle (degrees from right)
const ARC_END_DEG   = 165;   // arc end angle
const REACTIVE_ROWS = 8;     // rows 0-7 get full reaction animations

let containerEl = null;
let emojiEls = [];
let originalEmojis = [];
let currentReaction = 'idle';
let reactionTimer = null;

// ---- Create & Destroy ----

export function createAudience(parent) {
  if (containerEl) destroyAudience();

  containerEl = document.createElement('div');
  containerEl.className = 'stack-audience audience-idle';
  containerEl.setAttribute('aria-hidden', 'true');

  // Use parent container dimensions so arcs are centered on the ball
  // (ball uses left:50% of the same container)
  const rect = parent.getBoundingClientRect();
  const screenW = rect.width;
  const screenH = rect.height;
  const centerX = screenW / 2;
  const ballCenterY = screenH - 25; // approximate ball visual center

  const startAngle = ARC_START_DEG * Math.PI / 180;
  const endAngle   = ARC_END_DEG * Math.PI / 180;

  let globalIndex = 0;

  for (let r = 0; r < NUM_ROWS; r++) {
    const radius = MIN_RADIUS + r * RADIUS_STEP;
    const emojisInRow = Math.floor(6 + r * 0.8);
    const t = r / (NUM_ROWS - 1); // 0 = front, 1 = back

    const fontSize = 1.6 - t * 1.05; // 1.6rem → 0.55rem
    const opacity  = 0.85 - t * 0.55; // 0.85 → 0.30
    const isReactive = r < REACTIVE_ROWS;

    for (let j = 0; j < emojisInRow; j++) {
      const angle = emojisInRow === 1
        ? (startAngle + endAngle) / 2
        : startAngle + j * (endAngle - startAngle) / (emojisInRow - 1);

      const x = centerX + radius * Math.cos(angle);
      const y = screenH - radius * Math.sin(angle);

      // Skip emojis too close to the ball
      const dx = x - centerX;
      const dy = y - ballCenterY;
      if (Math.sqrt(dx * dx + dy * dy) < CLEAR_ZONE) continue;

      // Skip emojis outside screen bounds
      if (x < -10 || x > screenW + 10 || y < -10 || y > screenH + 10) continue;

      const span = document.createElement('span');
      const emoji = AUDIENCE_EMOJIS[Math.floor(Math.random() * AUDIENCE_EMOJIS.length)];
      span.className = 'audience-emoji';
      span.textContent = emoji;

      span.style.left = x + 'px';
      span.style.bottom = (screenH - y) + 'px';
      span.style.fontSize = fontSize + 'rem';
      span.style.opacity = opacity;

      span.classList.add(isReactive ? 'reactive-row' : 'ambient-row');

      // Stagger delay for wave/reaction animations
      span.style.setProperty('--audience-delay', (globalIndex * 0.04) + 's');
      // Random idle offset for desynchronized bobbing
      span.style.setProperty('--idle-offset', (Math.random() * 3) + 's');

      containerEl.appendChild(span);
      emojiEls.push(span);
      originalEmojis.push(emoji);
      globalIndex++;
    }
  }

  parent.appendChild(containerEl);
}

export function destroyAudience() {
  if (reactionTimer) { clearTimeout(reactionTimer); reactionTimer = null; }
  if (containerEl) { containerEl.remove(); containerEl = null; }
  emojiEls = [];
  originalEmojis = [];
  currentReaction = 'idle';
}

// ---- Reactions ----

const REACTION_CLASSES = [
  'audience-idle', 'audience-cheer', 'audience-wild',
  'audience-wave', 'audience-worry', 'audience-gasp', 'audience-party'
];

function clearReactionClasses() {
  if (!containerEl) return;
  REACTION_CLASSES.forEach(c => containerEl.classList.remove(c));
}

function restoreOriginalEmojis() {
  emojiEls.forEach((el, i) => {
    el.textContent = originalEmojis[i];
  });
}

function swapToWorryEmojis() {
  // Only swap reactive-row emojis to worried faces
  emojiEls.forEach((el, i) => {
    if (el.classList.contains('reactive-row') && Math.random() < 0.4) {
      el.textContent = WORRY_EMOJIS[Math.floor(Math.random() * WORRY_EMOJIS.length)];
    }
  });
}

export function audienceReact(event) {
  if (!containerEl) return;
  if (reactionTimer) { clearTimeout(reactionTimer); reactionTimer = null; }

  // Restore emojis if coming out of worry
  if (currentReaction === 'worry' && event !== 'worry') {
    restoreOriginalEmojis();
  }

  clearReactionClasses();
  currentReaction = event;

  switch (event) {
    case 'cheer':
      containerEl.classList.add('audience-cheer');
      reactionTimer = setTimeout(() => {
        clearReactionClasses();
        containerEl.classList.add('audience-idle');
        currentReaction = 'idle';
      }, 500);
      break;

    case 'wild':
      containerEl.classList.add('audience-wild');
      reactionTimer = setTimeout(() => {
        clearReactionClasses();
        containerEl.classList.add('audience-idle');
        currentReaction = 'idle';
      }, 700);
      break;

    case 'wave':
      containerEl.classList.add('audience-wave');
      reactionTimer = setTimeout(() => {
        clearReactionClasses();
        containerEl.classList.add('audience-idle');
        currentReaction = 'idle';
      }, 1200);
      break;

    case 'worry':
      swapToWorryEmojis();
      containerEl.classList.add('audience-worry');
      break;

    case 'gasp':
      swapToWorryEmojis();
      containerEl.classList.add('audience-gasp');
      break;

    case 'party':
      containerEl.classList.add('audience-party');
      break;

    case 'idle':
    default:
      restoreOriginalEmojis();
      containerEl.classList.add('audience-idle');
      break;
  }
}
