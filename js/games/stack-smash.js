import {
  playThud, playCrash, playSnap, playPerfectDing, playStreakChime,
  playWinFanfare, playWhoosh, playCreak, playPerfectClick,
  playHeightPing, playDangerBuzz, playBounce,
  playCrowdCheer, playCrowdGasp, playCrowdRoar
} from '../audio.js';
import { spawnParticles } from '../effects.js';
import { shareOrCopy } from '../share.js';
import { createAudience, destroyAudience, audienceReact } from './stack-audience.js';
import { preloadEmojis, createEmojiImg, getEmojiUrl } from '../emoji.js';
import { EMOJI_REGISTRY } from '../emoji-registry.js';

function wireEndcardShare(container) {
  const btn = container.querySelector('[data-share]');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const result = await shareOrCopy();
    if (result.method === 'copy' && result.success) {
      btn.innerHTML = '<img src="' + getEmojiUrl('✅') + '" class="emoji-img btn-emoji" alt="✅"> Copied!';
      setTimeout(() => { btn.innerHTML = '<img src="' + getEmojiUrl('📤') + '" class="emoji-img btn-emoji" alt="📤"> Share with a parent'; }, 2500);
    }
  });
  btn.addEventListener('touchend', (e) => e.stopPropagation());
}

const stackGameEl    = document.getElementById('stackGame');
const stackCameraEl  = document.getElementById('stackCamera');
const stackTowerEl   = document.getElementById('stackTower');
const stackScoreEl   = document.getElementById('stackScore');
const stackBestEl    = document.getElementById('stackBest');
const stackHint      = document.getElementById('stackHint');
const stackCelebrate = document.getElementById('stackCelebrate');
const stackDangerEl  = document.getElementById('stackDanger');

const BLOCK_COLORS = ['#FF6B8A','#FFB347','#7C5CFC','#4ECDC4','#FF85A1','#FFC75F','#845EC2','#00C9A7','#F9844A','#90BE6D'];
const BLOCK_H = 35;
const BALL_SIZE = 50;
const GROUND_H = BALL_SIZE - 5;
const PENDULUM_MAX_ANGLE_BASE = 0.7;
const CABLE_EXTEND_SPEED_BASE = 1.0;
const CABLE_START_LENGTH_BASE = 120;
const CRANE_HOOK_Y = 50;

// Dynamic cable/swing based on screen size and tower height
function stGetCableStartLength() {
  const screenH = window.innerHeight;
  const towerH = stGetTowerTopY();
  const available = screenH - CRANE_HOOK_Y - towerH - BLOCK_H * 2;
  // Cable = fraction of available space, shorter as tower grows
  const base = Math.min(CABLE_START_LENGTH_BASE, screenH * 0.15);
  return Math.max(40, Math.min(base, available * 0.5));
}

function stGetMaxAngle() {
  const screenH = window.innerHeight;
  // Smaller screens get smaller swing; also reduce as tower grows
  const screenFactor = Math.min(1, screenH / 800);
  const heightFactor = Math.max(0.4, 1 - stTowerBlocks.length * 0.03);
  return PENDULUM_MAX_ANGLE_BASE * screenFactor * heightFactor;
}

function stGetCableExtendSpeed() {
  const screenH = window.innerHeight;
  // Slower extension on small screens
  return Math.max(0.3, CABLE_EXTEND_SPEED_BASE * Math.min(1, screenH / 800));
}
const PERFECT_THRESHOLD = 0.01;
const INSTABILITY_THRESHOLD = 2.0;
const DANGER_ZONE = 1.6;
const WOBBLE_SCALE = 2.0;
const LEAN_SCALE = 5.0;
const MAX_WOBBLE_ANGLE = 20;
const FIRST_BLOCK_MAX_OFFSET = 0.40; // max offset ratio on ball before game over
const MIN_OVERLAP_RATIO = 0.35;      // block must overlap at least 35% of its width
const SWAY_SPEEDS = [0.6, 0.9, 1.2, 1.5, 1.8, 2.1];

// ---- High Score ----
const LS_KEY = 'tinyhandsplay-stack-best';
let stBestScore = parseInt(localStorage.getItem(LS_KEY) || '0', 10);

let stTowerBlocks = [];
let stActiveEl = null;
let stCableEl = null;
let stBlockWidth = 0;
let stOriginalWidth = 0;
let stSwayX = 0;
let stSwaySpeed = SWAY_SPEEDS[0];
let stDropping = false;
let stDropY = 0;
let stDropVy = 0;
let stPerfectStreak = 0;
let stBlockCount = 0;
let stInstability = 0;
let stLeanDirection = 0;
let stStructuralStress = 0;
let stIdealCenterX = 0;
let stWobbleTime = 0;
let stRestartTimer = null;
let stGameState = 'idle';
let stAnimFrame = null;
let stCableLength = 0;
let stSwingAngle = 0;
let stPendulumAngle = 0;
let stIsNewBest = false;

function stGetSwaySpeed() {
  if (stBlockCount < 5)  return SWAY_SPEEDS[0];
  if (stBlockCount < 10) return SWAY_SPEEDS[1];
  if (stBlockCount < 15) return SWAY_SPEEDS[2];
  if (stBlockCount < 20) return SWAY_SPEEDS[3];
  if (stBlockCount < 25) return SWAY_SPEEDS[4];
  return SWAY_SPEEDS[5];
}

function stGetTowerTopY() {
  return GROUND_H + stTowerBlocks.length * BLOCK_H;
}

function stShowBestScore() {
  if (stBestScore > 0) {
    stackBestEl.textContent = 'Best: ' + stBestScore;
  } else {
    stackBestEl.textContent = '';
  }
  stackBestEl.classList.remove('new-best');
}

function stCheckHighScore() {
  if (stBlockCount > stBestScore) {
    stBestScore = stBlockCount;
    localStorage.setItem(LS_KEY, stBestScore);
    stackBestEl.textContent = 'Best: ' + stBestScore;
    stackBestEl.classList.remove('new-best');
    void stackBestEl.offsetWidth; // force reflow for re-triggering animation
    stackBestEl.classList.add('new-best');
    stIsNewBest = true;
  }
}

function stRecalcBalance() {
  if (stTowerBlocks.length === 0) {
    stInstability = 0;
    stLeanDirection = 0;
    return;
  }

  let totalWeight = 0;
  let weightedOffset = 0;

  for (let i = 0; i < stTowerBlocks.length; i++) {
    const block = stTowerBlocks[i];
    const blockCenter = block.x + block.w / 2;
    const offset = blockCenter - stIdealCenterX;
    const heightWeight = 1 + i * 0.3;
    weightedOffset += offset * heightWeight;
    totalWeight += heightWeight;
  }

  const avgOffset = weightedOffset / totalWeight;
  const normalizedLean = avgOffset / stOriginalWidth;

  // --- Counterbalance-aware structural stress ---
  // Natural settling: small decay each block (tower "settles")
  stStructuralStress *= 0.82;

  const lastBlock = stTowerBlocks[stTowerBlocks.length - 1];
  const lastCenter = lastBlock.x + lastBlock.w / 2;
  const lastSignedOffset = (lastCenter - stIdealCenterX) / stOriginalWidth;
  const blockHeight = stTowerBlocks.length;
  const rawStress = Math.abs(lastSignedOffset) * (1 + blockHeight * 0.15) * 0.7;

  // Compute lean from all blocks EXCEPT the latest to see prior lean
  if (stTowerBlocks.length >= 2) {
    let priorWeightedOffset = 0;
    let priorTotalWeight = 0;
    for (let i = 0; i < stTowerBlocks.length - 1; i++) {
      const block = stTowerBlocks[i];
      const bCenter = block.x + block.w / 2;
      const bOffset = bCenter - stIdealCenterX;
      const hw = 1 + i * 0.4;
      priorWeightedOffset += bOffset * hw;
      priorTotalWeight += hw;
    }
    const priorLean = priorWeightedOffset / priorTotalWeight;

    // Block on opposite side of prior lean = counterbalancing
    if (lastSignedOffset * priorLean < 0) {
      // Reward: reduce stress — skillful rebalancing pays off (but less generous)
      const relief = rawStress * 0.3;
      stStructuralStress = Math.max(0, stStructuralStress - relief);
    } else {
      // Penalty: add stress — same-side blocks compound instability
      stStructuralStress += rawStress;
    }
  } else {
    // First block: just add stress normally
    stStructuralStress += rawStress;
  }

  stLeanDirection = normalizedLean * 3.0;

  const heightScale = 1 + stTowerBlocks.length * 0.12;
  const balanceInstability = Math.abs(normalizedLean) * heightScale * 5.0;
  stInstability = balanceInstability + stStructuralStress;
}

function stUpdateDangerVignette() {
  if (!stackDangerEl) return;
  if (stInstability >= DANGER_ZONE) {
    const ratio = Math.min((stInstability - DANGER_ZONE) / (INSTABILITY_THRESHOLD - DANGER_ZONE), 1);
    stackDangerEl.style.setProperty('--danger-opacity', ratio * 0.4);
    audienceReact('worry');
    playCrowdGasp();
  } else {
    stackDangerEl.style.setProperty('--danger-opacity', '0');
  }
}

function stUpdateCable() {
  if (!stCableEl) return;
  const craneX = window.innerWidth / 2;
  const blockCenterX = craneX + stCableLength * Math.sin(stPendulumAngle);
  const blockTopY = CRANE_HOOK_Y + stCableLength * Math.cos(stPendulumAngle);
  const line = stCableEl.firstChild;
  line.setAttribute('x1', craneX);
  line.setAttribute('y1', CRANE_HOOK_Y);
  line.setAttribute('x2', blockCenterX);
  line.setAttribute('y2', blockTopY);
}

function stStartSway() {
  if (stGameState === 'collapsing' || stGameState === 'winning') return;

  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  stSwaySpeed = stGetSwaySpeed();

  const towerTopFromBottom = stGetTowerTopY();
  if (towerTopFromBottom + BLOCK_H + 60 >= screenH) {
    stTriggerTowerComplete();
    return;
  }

  // Block width variety: after first 3 blocks, vary width 75%-125%
  if (stBlockCount >= 3) {
    const variation = 0.75 + Math.random() * 0.5;
    stBlockWidth = Math.round(stOriginalWidth * variation);
  } else {
    stBlockWidth = stOriginalWidth;
  }

  // Dynamic cable length: shorter on small screens and as tower grows
  const baseLen = stGetCableStartLength();
  const jitter = Math.min(30, baseLen * 0.2);
  stCableLength = baseLen + Math.random() * jitter * 2 - jitter;
  // Full random starting position in swing arc — prevents spam-key wins
  stSwingAngle = Math.random() * Math.PI * 2;
  stPendulumAngle = stGetMaxAngle() * Math.sin(stSwingAngle);

  const craneX = screenW / 2;
  const blockTopY = CRANE_HOOK_Y + stCableLength * Math.cos(stPendulumAngle);
  const blockCenterX = craneX + stCableLength * Math.sin(stPendulumAngle);
  stSwayX = blockCenterX - stBlockWidth / 2;

  const el = document.createElement('div');
  el.className = 'stack-block active';
  el.style.width = stBlockWidth + 'px';
  el.style.height = BLOCK_H + 'px';
  el.style.backgroundColor = BLOCK_COLORS[stBlockCount % BLOCK_COLORS.length];
  el.style.bottom = (screenH - blockTopY - BLOCK_H) + 'px';
  el.style.left = stSwayX + 'px';

  stackCameraEl.appendChild(el);
  stActiveEl = el;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'stack-cable');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('stroke', 'rgba(100,100,100,0.4)');
  line.setAttribute('stroke-width', '2');
  svg.appendChild(line);
  stackCameraEl.appendChild(svg);
  stCableEl = svg;
  stUpdateCable();

  stGameState = 'swaying';
  if (stBlockCount > 0) stackHint.style.opacity = '0';
}

function stDropBlock() {
  if (stGameState !== 'swaying' || !stActiveEl) return;

  stackHint.style.opacity = '0';
  stGameState = 'dropping';
  stDropping = true;
  stDropVy = 0;

  const blockTopY = CRANE_HOOK_Y + stCableLength * Math.cos(stPendulumAngle);
  stDropY = window.innerHeight - blockTopY - BLOCK_H;

  if (stCableEl) { stCableEl.remove(); stCableEl = null; }
  playWhoosh();

  stActiveEl.classList.remove('active');
}

function stOnLanded() {
  if (!stActiveEl) return;

  const landedX = stSwayX;
  const landedW = stBlockWidth;
  const towerY = stGetTowerTopY();

  if (stTowerBlocks.length === 0) {
    const screenW = window.innerWidth;
    const ballCenterX = screenW / 2;
    const blockCenterX = landedX + landedW / 2;
    const offset = blockCenterX - ballCenterX;
    const normalizedOffset = offset / (landedW / 2);

    // First block: if too far off-center on the ball, game over
    if (Math.abs(normalizedOffset) > FIRST_BLOCK_MAX_OFFSET) {
      // Show the block tilting off dramatically before collapsing
      const MAX_TILT = 35;
      const tiltDeg = normalizedOffset * MAX_TILT;
      const ballRelativeX = ballCenterX - landedX;
      stActiveEl.style.transformOrigin = ballRelativeX + 'px bottom';
      stActiveEl.style.bottom = GROUND_H + 'px';
      stActiveEl.style.left = landedX + 'px';
      stActiveEl.classList.remove('active');
      stackTowerEl.appendChild(stActiveEl);
      stTowerBlocks.push({ el: stActiveEl, x: landedX, w: landedW, y: GROUND_H });
      stBlockCount++;
      stackScoreEl.textContent = stBlockCount;
      stActiveEl = null;
      stDropping = false;
      playThud();
      audienceReact('gasp');
      playCrowdGasp();
      setTimeout(() => stTriggerCollapse(), 300);
      return;
    }

    const MAX_TILT = 10;
    const tiltDeg = normalizedOffset * MAX_TILT;
    const ballRelativeX = ballCenterX - landedX;
    stActiveEl.style.transformOrigin = ballRelativeX + 'px bottom';
    stActiveEl.style.transform = 'rotate(' + tiltDeg + 'deg)';

    stActiveEl.style.bottom = GROUND_H + 'px';
    stActiveEl.style.left = landedX + 'px';
    stActiveEl.classList.remove('active');
    stackTowerEl.appendChild(stActiveEl);

    stIdealCenterX = ballCenterX;
    stTowerBlocks.push({ el: stActiveEl, x: landedX, w: landedW, y: GROUND_H });

    stRecalcBalance();

    stBlockCount++;
    stackScoreEl.textContent = stBlockCount;
    stCheckHighScore();
    stActiveEl = null;
    stDropping = false;
    stGameState = 'idle';
    playThud();
    playBounce();
    audienceReact('cheer');
    playCrowdCheer();
    spawnParticles(blockCenterX, window.innerHeight - GROUND_H - BLOCK_H, stackTowerEl);
    stUpdateDangerVignette();
    stStartSway();
    return;
  }

  const below = stTowerBlocks[stTowerBlocks.length - 1];

  const overlapLeft = Math.max(landedX, below.x);
  const overlapRight = Math.min(landedX + landedW, below.x + below.w);
  const overlap = overlapRight - overlapLeft;
  const minRequired = Math.min(landedW, below.w) * MIN_OVERLAP_RATIO;

  if (overlap < minRequired) {
    // Not enough overlap — block slides off
    if (overlap > 0) {
      // Show it briefly before collapsing
      stActiveEl.style.left = landedX + 'px';
      stActiveEl.style.bottom = towerY + 'px';
      stActiveEl.classList.remove('active');
      stackTowerEl.appendChild(stActiveEl);
      stTowerBlocks.push({ el: stActiveEl, x: landedX, w: landedW, y: towerY });
      stBlockCount++;
      stackScoreEl.textContent = stBlockCount;
      stActiveEl = null;
      stDropping = false;
      playThud();
      audienceReact('gasp');
      playCrowdGasp();
      setTimeout(() => stTriggerCollapse(), 300);
    } else {
      stActiveEl.remove();
      stActiveEl = null;
      stDropping = false;
      stTriggerCollapse();
    }
    return;
  }

  stActiveEl.style.left = landedX + 'px';
  stActiveEl.style.bottom = towerY + 'px';
  stActiveEl.classList.remove('active');

  const blockCenterX = landedX + landedW / 2;
  const offsetFromIdeal = blockCenterX - stIdealCenterX;
  const normalizedOffset = Math.abs(offsetFromIdeal) / stOriginalWidth;

  const isPerfect = normalizedOffset < PERFECT_THRESHOLD;

  if (isPerfect) {
    const snappedX = stIdealCenterX - landedW / 2;
    stActiveEl.style.left = snappedX + 'px';
    stackTowerEl.appendChild(stActiveEl);
    stTowerBlocks.push({ el: stActiveEl, x: snappedX, w: landedW, y: towerY });

    stPerfectStreak++;
    stActiveEl.classList.add('perfect-flash');
    playPerfectDing();
    playPerfectClick();
    playHeightPing(stTowerBlocks.length);
    spawnParticles(stIdealCenterX, window.innerHeight - towerY - BLOCK_H, stackTowerEl);

    if (stPerfectStreak >= 3) {
      stActiveEl.classList.add('streak-flash');
      playStreakChime();
      audienceReact('wave');
    } else {
      audienceReact('wild');
    }
    playCrowdCheer();
  } else {
    stackTowerEl.appendChild(stActiveEl);
    stTowerBlocks.push({ el: stActiveEl, x: landedX, w: landedW, y: towerY });
    stPerfectStreak = 0;

    playThud();
    playSnap();
    playHeightPing(stTowerBlocks.length);
    audienceReact('cheer');
    playCrowdCheer();
  }

  stRecalcBalance();

  if (stInstability >= DANGER_ZONE) {
    playDangerBuzz();
    playCreak();
  }

  stBlockCount++;
  stackScoreEl.textContent = stBlockCount;
  stCheckHighScore();
  stActiveEl = null;
  stDropping = false;
  stGameState = 'idle';

  stUpdateDangerVignette();

  const LEAN_COLLAPSE_THRESHOLD = 1.5;
  if (stInstability >= INSTABILITY_THRESHOLD || Math.abs(stLeanDirection) >= LEAN_COLLAPSE_THRESHOLD) {
    setTimeout(() => stTriggerCollapse(), 400);
    return;
  }

  setTimeout(() => stStartSway(), 250);
}

function stTriggerCollapse() {
  stGameState = 'collapsing';
  playCrash();
  playCrowdGasp();
  audienceReact('gasp');

  const collapseDir = stLeanDirection >= 0 ? 1 : -1;

  stTowerBlocks.forEach((block, i) => {
    const vx = collapseDir * (10 + Math.random() * 15);
    const vy = -(5 + Math.random() * 15);
    const rot = collapseDir * (200 + Math.random() * 520);
    block.el.style.transition = 'transform 1.2s ease-out, opacity 1.2s ease-out';
    block.el.style.transform = `translate(${vx * 30}px, ${vy * 20}px) rotate(${rot}deg)`;
    block.el.style.opacity = '0';

    if (i % 2 === 0) {
      spawnParticles(block.x + block.w / 2, window.innerHeight - block.y - BLOCK_H / 2, stackTowerEl);
    }
  });

  stackTowerEl.style.transition = 'transform 1s ease-in';
  stackTowerEl.style.transform = `rotate(${collapseDir * 25}deg)`;

  const bestText = stIsNewBest ? `<div class="stack-endcard-best"><img src="${getEmojiUrl('🏆')}" class="emoji-img inline-emoji" alt="🏆"> New best!</div>` : '';
  stackCelebrate.innerHTML = `<div class="stack-endcard"><div class="stack-endcard-emoji"><img src="${getEmojiUrl('💥')}" class="emoji-img" alt="💥" style="width:1em;height:1em"></div><div class="stack-endcard-title">${stBlockCount} blocks!</div>${bestText}<div class="stack-endcard-hint">Tap to play again</div><button class="endcard-share-btn" data-share><img src="${getEmojiUrl('📤')}" class="emoji-img btn-emoji" alt="📤"> Share with a parent</button></div>`;
  stackCelebrate.classList.add('show');
  wireEndcardShare(stackCelebrate);
}

function stTriggerTowerComplete() {
  stGameState = 'winning';
  playWinFanfare();
  playCrowdRoar();
  audienceReact('party');

  const confettiColors = ['#FF6B8A','#FFB347','#7C5CFC','#4ECDC4','#FFC75F','#845EC2','#00C9A7','#FF85A1'];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement('div');
    c.className = 'stack-confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.top = -(Math.random() * 20 + 10) + 'px';
    c.style.width = (6 + Math.random() * 10) + 'px';
    c.style.height = (6 + Math.random() * 10) + 'px';
    c.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    c.style.setProperty('--fall-dur', (2 + Math.random() * 3) + 's');
    c.style.setProperty('--fall-dist', window.innerHeight + 50 + 'px');
    c.style.setProperty('--fall-rot', (Math.random() * 720 - 360) + 'deg');
    stackGameEl.appendChild(c);
  }

  const emojis = ['🎉','🏆','⭐','🥳','🎊','✨'];
  for (let i = 0; i < 15; i++) {
    const e = document.createElement('div');
    e.className = 'stack-confetti';
    e.style.left = Math.random() * 100 + '%';
    e.style.top = -(Math.random() * 30 + 10) + 'px';
    const emojiSize = (24 + Math.random() * 20);
    e.style.width = 'auto';
    e.style.height = 'auto';
    const confImg = createEmojiImg(emojis[Math.floor(Math.random() * emojis.length)], 'emoji-img');
    confImg.style.width = emojiSize + 'px';
    confImg.style.height = emojiSize + 'px';
    e.appendChild(confImg);
    e.style.setProperty('--fall-dur', (3 + Math.random() * 2) + 's');
    e.style.setProperty('--fall-dist', window.innerHeight + 80 + 'px');
    e.style.setProperty('--fall-rot', (Math.random() * 360 - 180) + 'deg');
    stackGameEl.appendChild(e);
  }

  const bestText = stIsNewBest ? `<div class="stack-endcard-best"><img src="${getEmojiUrl('🏆')}" class="emoji-img inline-emoji" alt="🏆"> New best!</div>` : '';
  stackCelebrate.innerHTML = `<div class="stack-endcard"><div class="stack-endcard-emoji"><img src="${getEmojiUrl('🏆')}" class="emoji-img" alt="🏆" style="width:1em;height:1em"></div><div class="stack-endcard-title">You Win!</div><div class="stack-endcard-stats">${stBlockCount} blocks stacked!</div>${bestText}<div class="stack-endcard-hint">Tap to play again</div><button class="endcard-share-btn" data-share><img src="${getEmojiUrl('📤')}" class="emoji-img btn-emoji" alt="📤"> Share with a parent</button></div>`;
  stackCelebrate.classList.add('show');
  wireEndcardShare(stackCelebrate);
}

function stResetStack() {
  if (stRestartTimer) { clearTimeout(stRestartTimer); stRestartTimer = null; }

  stTowerBlocks.forEach(b => b.el.remove());
  stTowerBlocks = [];
  if (stActiveEl) { stActiveEl.remove(); stActiveEl = null; }
  if (stCableEl) { stCableEl.remove(); stCableEl = null; }

  stackGameEl.querySelectorAll('.stack-confetti').forEach(c => c.remove());
  stackTowerEl.querySelectorAll('.particle').forEach(p => p.remove());

  stackCelebrate.classList.remove('show');
  stackCelebrate.innerHTML = '';

  const screenW = window.innerWidth;
  stOriginalWidth = Math.min(screenW * 0.4, 200);
  stBlockWidth = stOriginalWidth;
  stBlockCount = 0;
  stPerfectStreak = 0;
  stInstability = 0;
  stLeanDirection = 0;
  stStructuralStress = 0;
  stIdealCenterX = 0;
  stWobbleTime = 0;
  stIsNewBest = false;

  stackTowerEl.style.transition = 'none';
  stackTowerEl.style.transform = 'rotate(0deg)';
  if (stackDangerEl) stackDangerEl.style.setProperty('--danger-opacity', '0');

  stackScoreEl.textContent = '0';
  stShowBestScore();
  stDropping = false;
  stGameState = 'idle';

  audienceReact('idle');
  stStartSway();
}

function stGameLoop() {
  if (stGameState === 'swaying' && stActiveEl) {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const craneX = screenW / 2;

    stSwingAngle += stSwaySpeed * 0.03;
    const maxAngle = stGetMaxAngle();
    stPendulumAngle = maxAngle * Math.sin(stSwingAngle);

    stCableLength += stGetCableExtendSpeed();

    // Clamp cable so block doesn't go past tower top
    const towerTopFromBottom = stGetTowerTopY();
    const maxCable = screenH - CRANE_HOOK_Y - towerTopFromBottom - BLOCK_H * 1.5;
    if (stCableLength > maxCable) stCableLength = maxCable;

    const blockCenterX = craneX + stCableLength * Math.sin(stPendulumAngle);
    const blockTopY = CRANE_HOOK_Y + stCableLength * Math.cos(stPendulumAngle);
    stSwayX = blockCenterX - stBlockWidth / 2;

    stActiveEl.style.left = stSwayX + 'px';
    const bottomVal = screenH - blockTopY - BLOCK_H;
    stActiveEl.style.bottom = bottomVal + 'px';

    stUpdateCable();

    // Auto-drop only when block bottom touches tower AND overlaps horizontally
    if (bottomVal <= towerTopFromBottom + BLOCK_H + 10) {
      const blockLeft = stSwayX;
      const blockRight = stSwayX + stBlockWidth;
      let overlaps = false;
      if (stTowerBlocks.length === 0) {
        // First block: check overlap with ball area (center of screen)
        const ballLeft = screenW / 2 - BALL_SIZE;
        const ballRight = screenW / 2 + BALL_SIZE;
        overlaps = blockRight > ballLeft && blockLeft < ballRight;
      } else {
        // Check overlap with top tower block
        const top = stTowerBlocks[stTowerBlocks.length - 1];
        overlaps = blockRight > top.x && blockLeft < top.x + top.w;
      }
      if (overlaps) stDropBlock();
    }
  }

  if (stGameState === 'dropping' && stActiveEl) {
    stDropVy += 1.2;
    stDropY -= stDropVy;

    const towerTopFromBottom = stGetTowerTopY();

    if (stDropY <= towerTopFromBottom) {
      stDropY = towerTopFromBottom;
      stActiveEl.style.bottom = stDropY + 'px';
      stOnLanded();
    } else {
      stActiveEl.style.bottom = stDropY + 'px';
    }
  }

  if (stTowerBlocks.length > 0 && stGameState !== 'collapsing') {
    stWobbleTime += 0.016;

    const wobbleAmplitude = Math.min(stInstability * WOBBLE_SCALE, MAX_WOBBLE_ANGLE);
    const wobbleFreq = 1.5 + stInstability * 0.2;
    const wobbleOsc = Math.sin(stWobbleTime * wobbleFreq * Math.PI * 2) * wobbleAmplitude;

    const leanAngle = stLeanDirection * LEAN_SCALE;
    const totalAngle = Math.max(-15, Math.min(15, leanAngle + wobbleOsc));

    stackTowerEl.style.transform = `rotate(${totalAngle}deg)`;
  } else if (stGameState !== 'collapsing') {
    stackTowerEl.style.transform = 'rotate(0deg)';
  }

  stAnimFrame = requestAnimationFrame(stGameLoop);
}

export const stackSmash = {
  id: 'stack-smash',
  start() {
    stackGameEl.style.display = 'block';
    stackHint.style.opacity = '1';
    stackScoreEl.style.opacity = '1';
    const screenW = window.innerWidth;
    stOriginalWidth = Math.min(screenW * 0.4, 200);
    stBlockWidth = stOriginalWidth;
    stBlockCount = 0;
    stPerfectStreak = 0;
    stInstability = 0;
    stLeanDirection = 0;
    stStructuralStress = 0;
    stIdealCenterX = 0;
    stWobbleTime = 0;
    stRestartTimer = null;
    stTowerBlocks = [];
    stActiveEl = null;
    stDropping = false;
    stGameState = 'idle';
    stIsNewBest = false;
    stackTowerEl.style.transition = 'none';
    stackTowerEl.style.transform = 'rotate(0deg)';
    if (stackDangerEl) stackDangerEl.style.setProperty('--danger-opacity', '0');
    stackScoreEl.textContent = '0';

    // High score display
    stBestScore = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
    stShowBestScore();

    // Wait for emoji preload then build audience and start game
    preloadEmojis([...EMOJI_REGISTRY['stack-smash'], ...EMOJI_REGISTRY['stack-audience']]).then(() => {
      createAudience(stackGameEl);
    });

    stAnimFrame = requestAnimationFrame(stGameLoop);
    stStartSway();
  },
  stop() {
    stackGameEl.style.display = 'none';
    if (stAnimFrame) cancelAnimationFrame(stAnimFrame);
    if (stRestartTimer) clearTimeout(stRestartTimer);
    stAnimFrame = null;
    stRestartTimer = null;
    stTowerBlocks.forEach(b => b.el.remove());
    stTowerBlocks = [];
    if (stActiveEl) { stActiveEl.remove(); stActiveEl = null; }
    if (stCableEl) { stCableEl.remove(); stCableEl = null; }
    stackCelebrate.classList.remove('show');
    stackCelebrate.innerHTML = '';
    stackGameEl.querySelectorAll('.stack-confetti').forEach(c => c.remove());
    stackTowerEl.querySelectorAll('.particle').forEach(p => p.remove());
    stInstability = 0;
    stLeanDirection = 0;
    stStructuralStress = 0;
    stWobbleTime = 0;
    stackTowerEl.style.transition = 'none';
    stackTowerEl.style.transform = 'rotate(0deg)';
    if (stackDangerEl) stackDangerEl.style.setProperty('--danger-opacity', '0');
    stGameState = 'idle';

    // Clean up audience
    destroyAudience();
  },
  onKey(e) {
    if (stGameState === 'swaying') stDropBlock();
    else if (stGameState === 'collapsing' || stGameState === 'winning') stResetStack();
  },
  onMouse(e) {
    if (stGameState === 'swaying') stDropBlock();
    else if (stGameState === 'collapsing' || stGameState === 'winning') stResetStack();
  },
  onTouch(e) {
    if (stGameState === 'swaying') stDropBlock();
    else if (stGameState === 'collapsing' || stGameState === 'winning') stResetStack();
  }
};
