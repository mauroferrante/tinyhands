import {
  playThud, playCrash, playSnap, playPerfectDing, playStreakChime,
  playWinFanfare, playWhoosh, playCreak, playPerfectClick,
  playHeightPing, playDangerBuzz, playBounce,
  playCrowdCheer, playCrowdGasp, playCrowdRoar
} from '../audio.js';
import { spawnParticles } from '../effects.js';
import { createAudience, destroyAudience, audienceReact } from './stack-audience.js';

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
const PENDULUM_MAX_ANGLE = 0.4;
const CABLE_EXTEND_SPEED = 1.0;
const CABLE_START_LENGTH = 120;
const CRANE_HOOK_Y = 50;
const PERFECT_THRESHOLD = 0.01;
const INSTABILITY_THRESHOLD = 2.8;
const DANGER_ZONE = 2.5;
const WOBBLE_SCALE = 1.2;
const LEAN_SCALE = 3.2;
const MAX_WOBBLE_ANGLE = 14;
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

  stLeanDirection = normalizedLean * 2.5;

  const lastBlock = stTowerBlocks[stTowerBlocks.length - 1];
  const lastCenter = lastBlock.x + lastBlock.w / 2;
  const lastOffset = Math.abs(lastCenter - stIdealCenterX) / stOriginalWidth;
  const blockHeight = stTowerBlocks.length;
  stStructuralStress += lastOffset * (1 + blockHeight * 0.1) * 0.4;

  const heightScale = 1 + stTowerBlocks.length * 0.08;
  const balanceInstability = Math.abs(normalizedLean) * heightScale * 3.5;
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

  stCableLength = CABLE_START_LENGTH;
  stSwingAngle = Math.PI * 0.25 + Math.random() * Math.PI * 0.5;
  if (Math.random() < 0.5) stSwingAngle += Math.PI;
  stPendulumAngle = PENDULUM_MAX_ANGLE * Math.sin(stSwingAngle);

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

  if (overlap <= 0) {
    stActiveEl.remove();
    stActiveEl = null;
    stDropping = false;
    stTriggerCollapse();
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

  const LEAN_COLLAPSE_THRESHOLD = 2.1;
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

  const bestText = stIsNewBest ? '<br>🏆 New best!' : '';
  stackCelebrate.innerHTML = `${stBlockCount} blocks! 💥<span class="sub-text">Tap to play again!${bestText}</span>`;
  stackCelebrate.classList.add('show');
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
    e.style.fontSize = (24 + Math.random() * 20) + 'px';
    e.style.width = 'auto';
    e.style.height = 'auto';
    e.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    e.style.setProperty('--fall-dur', (3 + Math.random() * 2) + 's');
    e.style.setProperty('--fall-dist', window.innerHeight + 80 + 'px');
    e.style.setProperty('--fall-rot', (Math.random() * 360 - 180) + 'deg');
    stackGameEl.appendChild(e);
  }

  const bestText = stIsNewBest ? '<br>🏆 New best!' : '';
  stackCelebrate.innerHTML = `🏆 You Win! 🏆<span class="sub-text">${stBlockCount} blocks stacked!${bestText}<br>Tap to play again</span>`;
  stackCelebrate.classList.add('show');
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
    stPendulumAngle = PENDULUM_MAX_ANGLE * Math.sin(stSwingAngle);

    stCableLength += CABLE_EXTEND_SPEED;

    const blockCenterX = craneX + stCableLength * Math.sin(stPendulumAngle);
    const blockTopY = CRANE_HOOK_Y + stCableLength * Math.cos(stPendulumAngle);
    stSwayX = blockCenterX - stBlockWidth / 2;

    stActiveEl.style.left = stSwayX + 'px';
    const bottomVal = screenH - blockTopY - BLOCK_H;
    stActiveEl.style.bottom = bottomVal + 'px';

    stUpdateCable();

    const towerTopFromBottom = stGetTowerTopY();
    if (bottomVal <= towerTopFromBottom + BLOCK_H + 20) {
      stDropBlock();
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

    // Stadium audience
    createAudience(stackGameEl);

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
