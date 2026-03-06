/* =========================================================
 *  Stack It Up — Stadium Audience
 *  Reactive emoji crowd in semicircular stadium bowl layout
 * ========================================================= */

const AUDIENCE_EMOJIS = [
  '🐶','🐱','🐻','🐼','🐸','🐵','🦁','🐯','🐷','🐮',
  '🐰','🐹','🐧','🐔','🦊','😀','😃','😄','😊','🥳','🤩'
];
const WORRY_EMOJIS = ['😰','😱','🙈','😬','🫣'];

// ---- Layout constants ----
const EMOJI_SPACING = 28;    // horizontal spacing between emojis (px)
const BALL_GAP      = 60;    // clear gap on each side of the ball center

let containerEl = null;
let emojiEls = [];
let originalEmojis = [];
let currentReaction = 'idle';
let reactionTimer = null;
let resizeObserver = null;
let parentRef = null;
let buildTimer = null;

// ---- Build (internal) ----

function buildAudienceNow(parent) {
  // Remove old container if rebuilding
  if (containerEl) { containerEl.remove(); }
  emojiEls = [];
  originalEmojis = [];
  currentReaction = 'idle';

  containerEl = document.createElement('div');
  containerEl.className = 'stack-audience audience-idle';
  containerEl.setAttribute('aria-hidden', 'true');

  const rect = parent.getBoundingClientRect();
  const screenW = rect.width;
  const centerX = screenW / 2;

  // Place emojis in a single row at the bottom, left and right of the ball
  const leftStart = 10;
  const leftEnd   = centerX - BALL_GAP;
  const rightStart = centerX + BALL_GAP;
  const rightEnd   = screenW - 10;

  let globalIndex = 0;

  // Left side
  for (let x = leftStart; x <= leftEnd; x += EMOJI_SPACING) {
    const span = document.createElement('span');
    const emoji = AUDIENCE_EMOJIS[Math.floor(Math.random() * AUDIENCE_EMOJIS.length)];
    span.className = 'audience-emoji reactive-row';
    span.textContent = emoji;
    span.style.left = x + 'px';
    span.style.bottom = '4px';
    span.style.fontSize = '1.4rem';
    span.style.opacity = '0.85';
    span.style.setProperty('--audience-delay', (globalIndex * 0.04) + 's');
    span.style.setProperty('--idle-offset', (Math.random() * 3) + 's');
    containerEl.appendChild(span);
    emojiEls.push(span);
    originalEmojis.push(emoji);
    globalIndex++;
  }

  // Right side
  for (let x = rightStart; x <= rightEnd; x += EMOJI_SPACING) {
    const span = document.createElement('span');
    const emoji = AUDIENCE_EMOJIS[Math.floor(Math.random() * AUDIENCE_EMOJIS.length)];
    span.className = 'audience-emoji reactive-row';
    span.textContent = emoji;
    span.style.left = x + 'px';
    span.style.bottom = '4px';
    span.style.fontSize = '1.4rem';
    span.style.opacity = '0.85';
    span.style.setProperty('--audience-delay', (globalIndex * 0.04) + 's');
    span.style.setProperty('--idle-offset', (Math.random() * 3) + 's');
    containerEl.appendChild(span);
    emojiEls.push(span);
    originalEmojis.push(emoji);
    globalIndex++;
  }

  parent.appendChild(containerEl);
}

// ---- Create & Destroy ----

export function createAudience(parent) {
  if (containerEl) destroyAudience();
  parentRef = parent;

  buildAudienceNow(parent);

  // Rebuild when container resizes (e.g. fullscreen transition)
  resizeObserver = new ResizeObserver(() => {
    clearTimeout(buildTimer);
    buildTimer = setTimeout(() => {
      if (parentRef) buildAudienceNow(parentRef);
    }, 50);
  });
  resizeObserver.observe(parent);
}

export function destroyAudience() {
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (buildTimer) { clearTimeout(buildTimer); buildTimer = null; }
  if (reactionTimer) { clearTimeout(reactionTimer); reactionTimer = null; }
  if (containerEl) { containerEl.remove(); containerEl = null; }
  emojiEls = [];
  originalEmojis = [];
  currentReaction = 'idle';
  parentRef = null;
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
