/* =========================================================
 *  Stack & Smash — Stadium Audience
 *  Reactive emoji crowd that cheers, gasps, and celebrates
 * ========================================================= */

const AUDIENCE_EMOJIS = [
  '🐶','🐱','🐻','🐼','🐸','🐵','🦁','🐯','🐷','🐮',
  '🐰','🐹','🐧','🐔','🦊','😀','😃','😄','😊','🥳','🤩'
];
const WORRY_EMOJIS = ['😰','😱','🙈','😬','🫣'];

const FRONT_ROW = 12;
const BACK_ROW  = 12;
const TOTAL     = FRONT_ROW + BACK_ROW;

let containerEl = null;
let emojiEls = [];
let originalEmojis = [];  // store originals for restoring after worry
let currentReaction = 'idle';
let reactionTimer = null;

// ---- Create & Destroy ----

export function createAudience(parent) {
  if (containerEl) destroyAudience();

  containerEl = document.createElement('div');
  containerEl.className = 'stack-audience audience-idle';
  containerEl.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < TOTAL; i++) {
    const span = document.createElement('span');
    const emoji = AUDIENCE_EMOJIS[Math.floor(Math.random() * AUDIENCE_EMOJIS.length)];
    span.className = 'audience-emoji';
    span.textContent = emoji;

    const isBackRow = i < BACK_ROW;
    const rowIndex = isBackRow ? i : i - BACK_ROW;
    const rowCount = isBackRow ? BACK_ROW : FRONT_ROW;

    // Position across the screen width
    const pct = ((rowIndex + 0.5) / rowCount) * 100;
    span.style.left = pct + '%';

    // Curved stadium effect: edges higher, center lower (parabola)
    const normalized = (rowIndex / (rowCount - 1)) * 2 - 1; // -1 to 1
    const curve = normalized * normalized * 18; // max 18px lift at edges

    if (isBackRow) {
      span.classList.add('back-row');
      span.style.bottom = (38 + curve) + 'px';
    } else {
      span.classList.add('front-row');
      span.style.bottom = (6 + curve) + 'px';
    }

    // Stagger delay for wave/idle animations
    span.style.setProperty('--audience-delay', (i * 0.08) + 's');
    // Random idle offset so they don't all bob in sync
    span.style.setProperty('--idle-offset', (Math.random() * 2) + 's');

    containerEl.appendChild(span);
    emojiEls.push(span);
    originalEmojis.push(emoji);
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
  // Randomly swap ~40% of emojis to worried faces
  emojiEls.forEach((el, i) => {
    if (Math.random() < 0.4) {
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
      // Stay in worry until something else happens
      break;

    case 'gasp':
      swapToWorryEmojis();
      containerEl.classList.add('audience-gasp');
      // Stay until reset
      break;

    case 'party':
      containerEl.classList.add('audience-party');
      // Stay until reset
      break;

    case 'idle':
    default:
      restoreOriginalEmojis();
      containerEl.classList.add('audience-idle');
      break;
  }
}
