/* =========================================================
 *  Balloon Float — Physics-Based Obstacle Avoidance Game
 *  With Stars + 5 Power-Ups + 3 Lives
 * ========================================================= */

import {
  initAudio, playWindPuff, playNearMiss, playBalloonPop,
  playBirdChirp, playPlaneZoom, playWinFanfare, playStarCollect,
  playPowerupCollect, playShieldActivate, playShieldBreak,
  playRainbowActivate, playMagnetActivate, playSlowMoActivate,
  playMysteryBoxOpen, playMysteryBoxReveal, playLifeLost
} from '../audio.js';
import { shareOrCopy } from '../share.js';

// ---- Physics constants ----
const GRAVITY         = 0.12;
const BUOYANCY        = 0.03;
const TAP_BOOST       = -3.0;
const MAX_VY          = 4.0;
const DAMPING         = 0.98;
const DRIFT_AMPLITUDE = 30;
const DRIFT_PERIOD    = 4;
const BOB_AMPLITUDE   = 2;
const BOB_FREQUENCY   = 0.03;

// ---- Collision ----
const BALLOON_RADIUS  = 36;
const HITBOX_SCALE    = 0.75;
const NEAR_MISS_DIST  = 22;

// ---- Obstacle spawning ----
const OBS_BASE_SPEED       = 2.0;
const SPAWN_INTERVAL_START = 2.5;
const SPAWN_INTERVAL_MIN   = 0.9;
const MIN_GAP_Y            = 180;

// ---- Scoring ----
const LS_KEY = 'tinyhandsplay-balloon-best';

// ---- Obstacle types ----
const OBS_KITE       = 'kite';
const OBS_EAGLE      = 'eagle';
const OBS_PARACHUTE  = 'parachute';
const OBS_SMALL_PLANE = 'small_plane';
const OBS_BAT        = 'bat';
const OBS_METEOR     = 'meteor';
const OBS_PLANE      = 'plane';

// ---- Star constants ----
const STAR_SPAWN_INTERVAL = 7.5;
const STAR_SIZE           = 36;

// ---- Power-up types ----
const PU_SHIELD  = 'shield';
const PU_RAINBOW = 'rainbow';
const PU_MAGNET  = 'magnet';
const PU_SLOWMO  = 'slowmo';
const PU_MYSTERY = 'mystery';

// ---- Power-up config ----
const POWERUP_SPAWN_START = 20;
const POWERUP_SPAWN_BASE  = 18;
const POWERUP_SPAWN_VAR   = 8;
const POWERUP_SIZE        = 44;
const SHIELD_DURATION     = 8;

const POWERUP_WEIGHTS = [
  { type: PU_SHIELD,  weight: 15 },
  { type: PU_RAINBOW, weight: 30 },
  { type: PU_MAGNET,  weight: 25 },
  { type: PU_SLOWMO,  weight: 20 },
  { type: PU_MYSTERY, weight: 10 },
];

const POWERUP_EMOJIS = {
  [PU_SHIELD]:  '\u{1F6E1}\uFE0F',
  [PU_RAINBOW]: '\u{1F308}',
  [PU_MAGNET]:  '\u{1F9F2}',
  [PU_SLOWMO]:  '\u{231B}',
  [PU_MYSTERY]: '\u{1F381}',
};

const POWERUP_DURATIONS = {
  [PU_RAINBOW]: 5.0,
  [PU_MAGNET]:  5.0,
  [PU_SLOWMO]:  3.0,
};

const MAGNET_RADIUS   = 180;
const MAGNET_STRENGTH = 4.0;

// ---- Extra life config ----
const EXTRALIFE_SPAWN_INTERVAL = 35;
const EXTRALIFE_CHANCE = 0.4;

// ---- DOM refs ----
const gameEl      = document.getElementById('balloonGame');
const canvas      = document.getElementById('balloonCanvas');
const hudEl       = document.getElementById('balloonHud');
const scoreEl     = document.getElementById('balloonScore');
const celebrateEl = document.getElementById('balloonCelebrate');
const puIndicator = document.getElementById('balloonPowerup');
const puIconEl    = document.getElementById('balloonPuIcon');
const puBarEl     = document.getElementById('balloonPuBar');
const shieldIndEl = document.getElementById('balloonShield');
const livesEl     = document.getElementById('balloonLives');

let ctx = null;
let W = 0;
let H = 0;

// ---- Game state ----
let balloonX, balloonY, vy;
let driftPhase, bobPhase;
let gameTime, score;
let bestScore;
let obstacles, bgClouds, puffs, sparkles, popParticles;
let stringPoints;
let gameState; // 'ready' | 'playing' | 'popping' | 'gameover'
let animFrame;
let lastFrameTime;
let lastSpawnTime;
let popTimer;
let nearMissCooldown;
let hintEl;

// ---- Lives state ----
let lives;
let invincibleTimer;

// ---- Star state ----
let stars;
let starScore;
let lastStarSpawnTime;
let floatingTexts;

// ---- Power-up state ----
let powerups;
let lastPowerupSpawnTime;
let nextPowerupInterval;
let activeTimedEffect;
let shieldActive;
let shieldTimer;
let slowMoFactor;
let scoreMultiplier;
let rainbowTrail;
let mysteryRevealing;

// ---- Extra life state ----
let extraLifeItems;
let lastExtraLifeCheck;

// ---- Landscape state ----
let landscapeLayers;

// ===== Canvas Setup =====

function initCanvas() {
  const dpr = window.devicePixelRatio || 1;
  W = gameEl.clientWidth;
  H = gameEl.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

// ===== Opaque Emoji Sprite Cache =====

const spriteCache = {};

function getSprite(emoji, size) {
  const key = emoji + '|' + size;
  if (spriteCache[key]) return spriteCache[key];

  const pad = Math.ceil(size * 0.3);
  const dim = size + pad * 2;
  const dpr = window.devicePixelRatio || 1;

  const off = document.createElement('canvas');
  off.width = dim * dpr;
  off.height = dim * dpr;
  const oc = off.getContext('2d');
  oc.scale(dpr, dpr);
  oc.font = size + 'px serif';
  oc.textAlign = 'center';
  oc.textBaseline = 'middle';
  oc.fillText(emoji, dim / 2, dim / 2);

  const imgData = oc.getImageData(0, 0, off.width, off.height);
  const d = imgData.data;
  for (let i = 3; i < d.length; i += 4) {
    if (d[i] > 0) d[i] = 255;
  }
  oc.putImageData(imgData, 0, 0);

  const sprite = { canvas: off, offset: dim / 2, dim };
  spriteCache[key] = sprite;
  return sprite;
}

function drawSprite(emoji, size, x, y) {
  const sp = getSprite(emoji, size);
  ctx.drawImage(sp.canvas, 0, 0, sp.canvas.width, sp.canvas.height,
    x - sp.offset, y - sp.offset, sp.dim, sp.dim);
}

// ===== Background Clouds (parallax decoration) =====

function createBgClouds() {
  bgClouds = [];
  for (let layer = 0; layer < 3; layer++) {
    const count = 3 + layer;
    const speed = 0.15 + layer * 0.1;
    const alpha = 0.06 + layer * 0.03;
    const size = 60 - layer * 12;
    for (let i = 0; i < count; i++) {
      bgClouds.push({
        x: Math.random() * W,
        y: 30 + Math.random() * (H * 0.6),
        speed, alpha, size, layer
      });
    }
  }
}

// ===== Parallax Landscape (bottom decoration) =====

function createLandscape() {
  landscapeLayers = [];

  const backItems = [];
  const mountainEmojis = ['\u{1F3D4}\uFE0F', '\u26F0\uFE0F', '\u{1F5FB}', '\u{1F30B}'];
  let bx = 30, mi = 0;
  while (bx < W + 400) {
    backItems.push({
      emoji: mountainEmojis[mi % mountainEmojis.length],
      x: bx, size: 52 + ((mi * 17) % 22),
      yOffset: -((mi * 11) % 16)
    });
    bx += 90 + ((mi * 73) % 50);
    mi++;
  }
  landscapeLayers.push({ speed: 0.08, alpha: 0.25, yBase: H - 30, items: backItems });

  const midItems = [];
  const buildingEmojis = ['\u{1F3E2}', '\u{1F3ED}', '\u{1F3DB}\uFE0F', '\u{1F3DF}\uFE0F', '\u{1F3F0}', '\u{1F3EF}', '\u{1F3E3}'];
  let mx = 50, bi = 0;
  while (mx < W + 400) {
    midItems.push({
      emoji: buildingEmojis[bi % buildingEmojis.length],
      x: mx, size: 34 + ((bi * 13) % 14),
      yOffset: -((bi * 7) % 12)
    });
    mx += 65 + ((bi * 47) % 35);
    bi++;
  }
  landscapeLayers.push({ speed: 0.15, alpha: 0.35, yBase: H - 18, items: midItems });

  const frontItems = [];
  const houseEmojis = ['\u{1F3E1}', '\u{1F334}', '\u{1F3E0}', '\u{1F333}', '\u{1F6D6}', '\u26EA\uFE0F', '\u{1F3D8}\uFE0F', '\u{1F333}'];
  let fx = 20, fi = 0;
  while (fx < W + 400) {
    frontItems.push({
      emoji: houseEmojis[fi % houseEmojis.length],
      x: fx, size: 24 + ((fi * 11) % 12),
      yOffset: -((fi * 5) % 9)
    });
    fx += 45 + ((fi * 37) % 30);
    fi++;
  }
  landscapeLayers.push({ speed: 0.25, alpha: 0.45, yBase: H - 10, items: frontItems });
}

// ===== String Physics =====

function initString() {
  stringPoints = [];
  for (let i = 0; i < 6; i++) {
    stringPoints.push({ x: balloonX, y: balloonY + 40 + i * 12 });
  }
}

function updateString() {
  if (!stringPoints.length) return;
  stringPoints[0].x = balloonX;
  stringPoints[0].y = balloonY + 40;
  for (let i = 1; i < stringPoints.length; i++) {
    const prev = stringPoints[i - 1];
    const curr = stringPoints[i];
    curr.x += (prev.x - curr.x) * 0.15;
    curr.y += (prev.y - curr.y) * 0.15;
    curr.y += 0.3;
  }
}

// ===== Puff Effects =====

function spawnPuff() {
  puffs.push({ x: balloonX, y: balloonY + 42, radius: 8, alpha: 0.5, life: 1.0 });
}

function updatePuffs(dt) {
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i];
    p.life -= dt * 2.5;
    p.radius += dt * 40;
    p.alpha = p.life * 0.4;
    p.y += dt * 20;
    if (p.life <= 0) puffs.splice(i, 1);
  }
}

// ===== Sparkle Effects =====

function spawnSparkles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const speed = 60 + Math.random() * 80;
    sparkles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 1.0, color: color || '#FFD700', size: 3 + Math.random() * 3 });
  }
}

function updateSparkles(dt) {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt * 2.5;
    if (s.life <= 0) sparkles.splice(i, 1);
  }
}

// ===== Pop Particles =====

function spawnPopParticles() {
  const colors = ['#FF6B8A', '#FFB347', '#7C5CFC', '#4ECDC4', '#FF85A1', '#FFC75F'];
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 / 20) * i + Math.random() * 0.3;
    const speed = 100 + Math.random() * 200;
    popParticles.push({
      x: balloonX, y: balloonY,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 50,
      life: 1.0, color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 6, rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 10
    });
  }
}

function updatePopParticles(dt) {
  for (let i = popParticles.length - 1; i >= 0; i--) {
    const p = popParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 200 * dt;
    p.rotation += p.rotSpeed * dt;
    p.life -= dt * 0.8;
    if (p.life <= 0) popParticles.splice(i, 1);
  }
}

// ===== Floating Score Text =====

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.alpha -= dt * 1.2;
    if (ft.alpha <= 0) floatingTexts.splice(i, 1);
  }
}

// ===== Lives System =====

function updateLives() {
  if (!livesEl) return;
  livesEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement('span');
    heart.className = 'balloon-heart';
    heart.textContent = i < lives ? '\u2764\uFE0F' : '\u{1F90D}';
    if (i >= lives) heart.classList.add('lost');
    livesEl.appendChild(heart);
  }
}

function animateHeartLost() {
  if (!livesEl) return;
  const hearts = livesEl.querySelectorAll('.balloon-heart');
  const heartToRemove = hearts[lives];
  if (heartToRemove) {
    heartToRemove.classList.add('balloon-heart-breaking');
    setTimeout(() => {
      heartToRemove.textContent = '\u{1F90D}';
      heartToRemove.classList.add('lost');
      heartToRemove.classList.remove('balloon-heart-breaking');
    }, 500);
  }
}

// ===== Star System =====

function spawnStar() {
  const margin = 60;
  const y = margin + Math.random() * (H - margin * 2);
  const speed = getObstacleSpeed() * (0.5 + Math.random() * 0.2);
  stars.push({
    x: W + 30, y, baseY: y, w: 30, h: 30, speed,
    bobPhase: Math.random() * Math.PI * 2,
    shimmerPhase: Math.random() * Math.PI * 2
  });
}

function updateStars(dt) {
  const magnetActive = activeTimedEffect && activeTimedEffect.type === PU_MAGNET;
  const dtNorm = dt * 60;

  for (let i = stars.length - 1; i >= 0; i--) {
    const star = stars[i];
    star.x -= star.speed * dtNorm;
    star.bobPhase += dt * 3;
    star.shimmerPhase += dt * 5;

    if (magnetActive) {
      const dx = balloonX - star.x;
      const dy = balloonY - star.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MAGNET_RADIUS && dist > 5) {
        const force = MAGNET_STRENGTH * (1 - dist / MAGNET_RADIUS);
        star.x += (dx / dist) * force * dtNorm;
        star.y += (dy / dist) * force * dtNorm;
        star.baseY = star.y;
      }
    } else {
      star.y = star.baseY + Math.sin(star.bobPhase) * 8;
    }

    if (star.x < -40) stars.splice(i, 1);
  }

  if (gameTime > 5 && gameTime - lastStarSpawnTime >= STAR_SPAWN_INTERVAL) {
    lastStarSpawnTime = gameTime;
    spawnStar();
    if (magnetActive && Math.random() < 0.5) spawnStar();
  }
}

// ===== Extra Life System =====

function spawnExtraLife() {
  const margin = 80;
  const y = margin + Math.random() * (H - margin * 2);
  const speed = getObstacleSpeed() * (0.4 + Math.random() * 0.2);
  extraLifeItems.push({
    x: W + 30, y, baseY: y, w: 30, h: 30, speed,
    bobPhase: Math.random() * Math.PI * 2,
    glowPhase: Math.random() * Math.PI * 2
  });
}

function updateExtraLives(dt) {
  const dtNorm = dt * 60;
  for (let i = extraLifeItems.length - 1; i >= 0; i--) {
    const el = extraLifeItems[i];
    el.x -= el.speed * dtNorm;
    el.bobPhase += dt * 2;
    el.glowPhase += dt * 4;
    el.y = el.baseY + Math.sin(el.bobPhase) * 6;
    if (el.x < -40) extraLifeItems.splice(i, 1);
  }

  // Spawn check: very rare, only when lives < 3
  if (lives < 3 && extraLifeItems.length === 0 &&
      gameTime > 10 && gameTime - lastExtraLifeCheck >= EXTRALIFE_SPAWN_INTERVAL) {
    lastExtraLifeCheck = gameTime;
    if (Math.random() < EXTRALIFE_CHANCE) spawnExtraLife();
  }
}

// ===== Power-Up Helpers =====

function pickPowerupType() {
  const totalWeight = POWERUP_WEIGHTS.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.random() * totalWeight;
  for (const entry of POWERUP_WEIGHTS) {
    r -= entry.weight;
    if (r <= 0) return entry.type;
  }
  return PU_RAINBOW;
}

function getPowerupColor(type) {
  switch (type) {
    case PU_SHIELD:  return '#88CCFF';
    case PU_RAINBOW: return '#FF88CC';
    case PU_MAGNET:  return '#CCCC44';
    case PU_SLOWMO:  return '#AAAAFF';
    case PU_MYSTERY: return '#FFAA44';
    default:         return '#FFFFFF';
  }
}

// ===== Power-Up Spawning & Updates =====

function spawnPowerup() {
  if (powerups.length > 0) return;
  const type = pickPowerupType();
  const margin = 80;
  const y = margin + Math.random() * (H - margin * 2);
  const speed = getObstacleSpeed() * 0.5;
  powerups.push({
    type, x: W + 40, y, baseY: y, w: 44, h: 44, speed,
    bobPhase: Math.random() * Math.PI * 2, glowPhase: 0,
    emoji: POWERUP_EMOJIS[type]
  });
}

function updatePowerups(dt) {
  const dtNorm = dt * 60;
  for (let i = powerups.length - 1; i >= 0; i--) {
    const pu = powerups[i];
    pu.x -= pu.speed * dtNorm;
    pu.bobPhase += dt * 2.5;
    pu.glowPhase += dt * 4;
    pu.y = pu.baseY + Math.sin(pu.bobPhase) * 5;
    if (pu.x < -60) powerups.splice(i, 1);
  }

  if (gameTime > POWERUP_SPAWN_START &&
      gameTime - lastPowerupSpawnTime >= nextPowerupInterval) {
    lastPowerupSpawnTime = gameTime;
    nextPowerupInterval = POWERUP_SPAWN_BASE + (Math.random() - 0.5) * POWERUP_SPAWN_VAR * 2;
    spawnPowerup();
  }
}

// ===== Power-Up Effect System =====

function setTimedEffect(type, duration) {
  if (activeTimedEffect) cleanupTimedEffect(activeTimedEffect.type);
  activeTimedEffect = { type, remaining: duration, duration };
}

function cleanupTimedEffect(type) {
  if (type === PU_SLOWMO) slowMoFactor = 1.0;
  if (type === PU_RAINBOW) { rainbowTrail = []; scoreMultiplier = 1; }
}

function updateTimedEffect(dt) {
  if (!activeTimedEffect) return;
  activeTimedEffect.remaining -= dt;
  if (activeTimedEffect.remaining <= 0) {
    cleanupTimedEffect(activeTimedEffect.type);
    activeTimedEffect = null;
  }
}

function activatePowerup(type) {
  score += 5;
  if (type === PU_MYSTERY) { startMysteryReveal(); return; }
  applyPowerupEffect(type);
}

function applyPowerupEffect(type) {
  switch (type) {
    case PU_SHIELD:
      shieldActive = true;
      shieldTimer = SHIELD_DURATION;
      playShieldActivate();
      break;
    case PU_RAINBOW:
      setTimedEffect(PU_RAINBOW, POWERUP_DURATIONS[PU_RAINBOW]);
      rainbowTrail = [];
      scoreMultiplier = 2;
      playRainbowActivate();
      break;
    case PU_MAGNET:
      setTimedEffect(PU_MAGNET, POWERUP_DURATIONS[PU_MAGNET]);
      playMagnetActivate();
      break;
    case PU_SLOWMO:
      setTimedEffect(PU_SLOWMO, POWERUP_DURATIONS[PU_SLOWMO]);
      slowMoFactor = 0.4;
      playSlowMoActivate();
      break;
  }
}

// ===== Rainbow Trail =====

function updateRainbowTrail(dt) {
  if (!activeTimedEffect || activeTimedEffect.type !== PU_RAINBOW) return;
  rainbowTrail.push({ x: balloonX, y: balloonY, age: 0 });
  for (let i = rainbowTrail.length - 1; i >= 0; i--) {
    rainbowTrail[i].age += dt;
    if (rainbowTrail[i].age > 0.8) rainbowTrail.splice(i, 1);
  }
  if (rainbowTrail.length > 40) rainbowTrail.splice(0, rainbowTrail.length - 40);
}

// ===== Mystery Box =====

function startMysteryReveal() {
  const types = [PU_SHIELD, PU_RAINBOW, PU_MAGNET, PU_SLOWMO];
  const finalType = types[Math.floor(Math.random() * types.length)];
  mysteryRevealing = { timer: 1.8, finalType, slotPhase: 0, settled: false };
  playMysteryBoxOpen();
}

function updateMysteryReveal(dt) {
  if (!mysteryRevealing) return;
  mysteryRevealing.timer -= dt;
  const speed = mysteryRevealing.timer > 0.6 ? 12 : 4;
  mysteryRevealing.slotPhase += dt * speed;

  if (mysteryRevealing.timer <= 0 && !mysteryRevealing.settled) {
    mysteryRevealing.settled = true;
    applyPowerupEffect(mysteryRevealing.finalType);
    playMysteryBoxReveal();
    spawnSparkles(W / 2, 80, 10, '#FFAA44');
  }
  if (mysteryRevealing.settled && mysteryRevealing.timer < -0.5) {
    mysteryRevealing = null;
  }
}

// ===== Obstacle Spawning =====

function getObstacleSpeed() {
  return OBS_BASE_SPEED + Math.min(gameTime * 0.015, 2.5);
}

function getSpawnInterval() {
  return Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_START - gameTime * 0.012);
}

function pickRandomY(margin) {
  const minY = margin;
  const maxY = H - margin;
  let y = minY + Math.random() * (maxY - minY);
  for (let attempt = 0; attempt < 5; attempt++) {
    let tooClose = false;
    for (const obs of obstacles) {
      if (obs.x > W * 0.6 && Math.abs(obs.y - y) < MIN_GAP_Y) { tooClose = true; break; }
    }
    if (!tooClose) break;
    y = minY + Math.random() * (maxY - minY);
  }
  return y;
}

function spawnObstacle() {
  const speed = getObstacleSpeed();
  const margin = 60;
  const y = pickRandomY(margin);

  const types = [OBS_KITE];
  if (gameTime > 15) { types.push(OBS_EAGLE); types.push(OBS_PARACHUTE); }
  if (gameTime > 30) { types.push(OBS_SMALL_PLANE); types.push(OBS_BAT); }
  if (gameTime > 50) { types.push(OBS_METEOR); types.push(OBS_PLANE); }

  const type = types[Math.floor(Math.random() * types.length)];
  let obs;
  switch (type) {
    case OBS_KITE:
      obs = { type, x: W + 40, y, w: 50, h: 50, speed: speed * (0.6 + Math.random() * 0.3), emoji: '\u{1FA81}', size: 48, wobble: 0 }; break;
    case OBS_EAGLE:
      obs = { type, x: W + 45, y, w: 60, h: 50, speed: speed * (1.1 + Math.random() * 0.4), emoji: '\u{1F985}', size: 52, wingFrame: 0, chirped: false }; break;
    case OBS_PARACHUTE:
      obs = { type, x: W + 40, y: margin + Math.random() * (H * 0.4), w: 55, h: 60, speed: speed * (0.4 + Math.random() * 0.2), emoji: '\u{1FA82}', size: 54, sinkSpeed: 0.3 + Math.random() * 0.2 }; break;
    case OBS_SMALL_PLANE:
      obs = { type, x: W + 50, y: pickRandomY(margin), w: 58, h: 42, speed: speed * (1.5 + Math.random() * 0.5), emoji: '\u{1F6E9}\uFE0F', size: 48, zoomed: false }; break;
    case OBS_BAT:
      obs = { type, x: W + 35, y, w: 45, h: 40, speed: speed * (1.2 + Math.random() * 0.5), emoji: '\u{1F987}', size: 42, wingFrame: 0, wavePhase: Math.random() * Math.PI * 2, baseY: y }; break;
    case OBS_METEOR:
      obs = { type, x: W + 70, y: margin + Math.random() * (H * 0.5), w: 52, h: 52, speed: speed * 2.5, emoji: '\u2604\uFE0F', size: 50, angle: 0.3 + Math.random() * 0.2, zoomed: false }; break;
    case OBS_PLANE:
      obs = { type, x: W + 60, y: pickRandomY(margin), w: 65, h: 45, speed: speed * 2.0, emoji: '\u2708\uFE0F', size: 52, zoomed: false }; break;
  }
  obstacles.push(obs);
}

function updateObstacles(dtObs) {
  const elapsed = dtObs * 60;

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= obs.speed * elapsed;

    switch (obs.type) {
      case OBS_EAGLE:
        obs.wingFrame += dtObs * 4;
        if (!obs.chirped && obs.x < W - 20) { obs.chirped = true; playBirdChirp(); }
        break;
      case OBS_KITE:
        obs.wobble += dtObs * 3; break;
      case OBS_PARACHUTE:
        obs.y += obs.sinkSpeed * elapsed; break;
      case OBS_BAT:
        obs.wingFrame += dtObs * 6;
        obs.wavePhase += dtObs * 4;
        obs.y = obs.baseY + Math.sin(obs.wavePhase) * 40;
        break;
      case OBS_METEOR:
        obs.y += obs.angle * obs.speed * elapsed * 0.5;
        if (!obs.zoomed && obs.x < W - 30) { obs.zoomed = true; playPlaneZoom(); }
        break;
      case OBS_SMALL_PLANE:
      case OBS_PLANE:
        if (!obs.zoomed && obs.x < W - 30) { obs.zoomed = true; playPlaneZoom(); }
        break;
    }

    if (obs.x < -100 || obs.y > H + 60) obstacles.splice(i, 1);
  }

  if (gameTime - lastSpawnTime >= getSpawnInterval()) {
    lastSpawnTime = gameTime;
    spawnObstacle();
  }
}

// ===== Collision Detection =====

function checkCollisions() {
  const bx = balloonX;
  const by = balloonY;
  const br = BALLOON_RADIUS * HITBOX_SCALE;

  // Obstacle collisions (skip during invincibility)
  if (invincibleTimer <= 0) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      const hw = obs.w / 2 * HITBOX_SCALE;
      const hh = obs.h / 2 * HITBOX_SCALE;
      const dx = Math.abs(bx - obs.x) - (hw + br);
      const dy = Math.abs(by - obs.y) - (hh + br);

      if (dx < 0 && dy < 0) {
        if (shieldActive) {
          // Shield absorbs ALL hits during its duration — bounce obstacle away
          playShieldBreak();
          spawnSparkles(bx, by, 12, '#66CCFF');
          obs.speed *= -0.5;
          obs.x += 30;
          continue;
        }
        triggerPop();
        return;
      }

      const nearDist = Math.max(dx, dy);
      if (nearDist < NEAR_MISS_DIST && nearDist > 0 && nearMissCooldown <= 0) {
        nearMissCooldown = 1.0;
        playNearMiss();
        spawnSparkles(bx, by, 4, '#FFFFFF');
      }
    }
  }

  // Star collisions (always active)
  for (let i = stars.length - 1; i >= 0; i--) {
    const star = stars[i];
    const sdx = Math.abs(bx - star.x) - (star.w / 2 + BALLOON_RADIUS);
    const sdy = Math.abs(by - star.y) - (star.h / 2 + BALLOON_RADIUS);
    if (sdx < 0 && sdy < 0) {
      const pts = 50 * scoreMultiplier;
      starScore += pts;
      floatingTexts.push({ text: '+' + pts, x: star.x, y: star.y, alpha: 1.0, vy: -60 });
      spawnSparkles(star.x, star.y, 6, '#FFD700');
      playStarCollect();
      stars.splice(i, 1);
    }
  }

  // Extra life collisions
  for (let i = extraLifeItems.length - 1; i >= 0; i--) {
    const el = extraLifeItems[i];
    const edx = Math.abs(bx - el.x) - (el.w / 2 + BALLOON_RADIUS);
    const edy = Math.abs(by - el.y) - (el.h / 2 + BALLOON_RADIUS);
    if (edx < 0 && edy < 0) {
      if (lives < 3) {
        lives++;
        updateLives();
      }
      floatingTexts.push({ text: '+\u2764\uFE0F', x: el.x, y: el.y, alpha: 1.0, vy: -60 });
      spawnSparkles(el.x, el.y, 8, '#FF6B8A');
      playStarCollect();
      extraLifeItems.splice(i, 1);
    }
  }

  // Power-up collisions (always active)
  for (let i = powerups.length - 1; i >= 0; i--) {
    const pu = powerups[i];
    const pdx = Math.abs(bx - pu.x) - (pu.w / 2 + BALLOON_RADIUS);
    const pdy = Math.abs(by - pu.y) - (pu.h / 2 + BALLOON_RADIUS);
    if (pdx < 0 && pdy < 0) {
      activatePowerup(pu.type);
      spawnSparkles(pu.x, pu.y, 10, getPowerupColor(pu.type));
      playPowerupCollect();
      powerups.splice(i, 1);
    }
  }
}

// ===== Physics Update =====

function updatePhysics(dt) {
  const dtNorm = dt * 60;

  vy += (GRAVITY - BUOYANCY) * dtNorm;
  vy *= Math.pow(DAMPING, dtNorm);

  if (vy > MAX_VY) vy = MAX_VY;
  if (vy < -MAX_VY * 1.2) vy = -MAX_VY * 1.2;

  balloonY += vy * dtNorm;

  driftPhase += dt;
  const centerX = W * 0.25;
  balloonX = centerX + Math.sin(driftPhase * Math.PI * 2 / DRIFT_PERIOD) * DRIFT_AMPLITUDE;

  bobPhase += BOB_FREQUENCY * dtNorm;
  balloonY += Math.sin(bobPhase) * BOB_AMPLITUDE * 0.1;

  if (balloonY < -BALLOON_RADIUS * 2 || balloonY > H + BALLOON_RADIUS * 2 ||
      balloonX < -BALLOON_RADIUS * 3) {
    triggerPop();
  }

  updateString();
}

// ===== Input =====

function applyPuff() {
  if (gameState === 'ready') {
    gameState = 'playing';
    if (hintEl) hintEl.style.opacity = '0';
    hudEl.style.display = 'flex';
    if (livesEl) livesEl.classList.add('active');
  }
  if (gameState !== 'playing') return;
  vy = TAP_BOOST;
  spawnPuff();
  playWindPuff();
}

// ===== Pop & Game Over =====

function triggerPop() {
  if (gameState === 'popping' || gameState === 'gameover') return;

  lives--;
  animateHeartLost();
  playBalloonPop();
  spawnPopParticles();
  gameState = 'popping';
  popTimer = 1.2;

  if (lives > 0) playLifeLost();
}

function showGameOver() {
  gameState = 'gameover';

  if (livesEl) livesEl.classList.remove('active');

  bestScore = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
  const isNewBest = score > bestScore;
  if (isNewBest) {
    try { localStorage.setItem(LS_KEY, String(score)); } catch (e) {}
    bestScore = score;
  }

  const bestText = isNewBest
    ? '<div class="balloon-endcard-best">\u{1F3C6} New Best!</div>'
    : (bestScore > 0
        ? '<div class="balloon-endcard-best-small">Best: ' + bestScore + '</div>'
        : '');

  const timeSec = Math.floor(gameTime);
  const timeMin = Math.floor(timeSec / 60);
  const timeFmt = timeMin > 0 ? timeMin + 'm ' + (timeSec % 60) + 's' : timeSec + 's';
  const starsCollected = Math.floor(starScore / 50);

  celebrateEl.innerHTML =
    '<div class="balloon-endcard">' +
      '<div class="balloon-endcard-emoji">\u{1F4A5}</div>' +
      '<div class="balloon-endcard-title">POP!</div>' +
      '<div class="balloon-endcard-stats">' +
        '<span>Score: ' + score + '</span>' +
        '<span>\u{23F1} ' + timeFmt + '</span>' +
        (starsCollected > 0 ? '<span>\u{2728} ' + starsCollected + '</span>' : '') +
      '</div>' +
      bestText +
      '<div class="balloon-endcard-actions">' +
        '<button class="balloon-endcard-btn balloon-btn-again">Play Again</button>' +
      '</div>' +
      '<button class="endcard-share-btn" data-share>\u{1F4E4} Share with a parent</button>' +
    '</div>';

  celebrateEl.classList.add('show');

  const againBtn = celebrateEl.querySelector('.balloon-btn-again');
  if (againBtn) againBtn.addEventListener('click', () => resetAndStart());
  wireShare(celebrateEl);

  if (puIndicator) puIndicator.classList.remove('active');
  if (shieldIndEl) shieldIndEl.classList.remove('active');
}

function wireShare(container) {
  const btn = container.querySelector('[data-share]');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const result = await shareOrCopy();
    if (result.method === 'copy' && result.success) {
      btn.textContent = '\u{2705} Link copied!';
      setTimeout(() => { btn.textContent = '\u{1F4E4} Share with a parent'; }, 2500);
    }
  });
  btn.addEventListener('touchend', (e) => e.stopPropagation());
}

// ===== Rendering =====

function render() {
  ctx.clearRect(0, 0, W, H);

  // --- Sky gradient ---
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#C8DCF0');
  skyGrad.addColorStop(0.4, '#D8E8F5');
  skyGrad.addColorStop(0.7, '#E8F0F8');
  skyGrad.addColorStop(1, '#FFECD2');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // --- Slow-mo tint overlay ---
  if (slowMoFactor < 1.0) {
    ctx.fillStyle = 'rgba(180, 180, 255, 0.08)';
    ctx.fillRect(0, 0, W, H);
  }

  // --- Background parallax clouds ---
  for (const c of bgClouds) {
    ctx.globalAlpha = c.alpha;
    ctx.font = c.size + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2601\uFE0F', c.x, c.y);
  }
  ctx.globalAlpha = 1;

  // --- Parallax landscape ---
  if (landscapeLayers) {
    for (const layer of landscapeLayers) {
      ctx.globalAlpha = layer.alpha;
      for (const item of layer.items) {
        drawSprite(item.emoji, item.size, item.x, layer.yBase + item.yOffset);
      }
    }
    ctx.globalAlpha = 1;
  }

  // --- Magnet visual effects ---
  if (activeTimedEffect && activeTimedEffect.type === PU_MAGNET) {
    ctx.save();
    ctx.globalAlpha = 0.08 + Math.sin(gameTime * 3) * 0.04;
    ctx.strokeStyle = '#FFDD44';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(balloonX, balloonY, MAGNET_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineWidth = 2;
    for (const star of stars) {
      const dx = balloonX - star.x;
      const dy = balloonY - star.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MAGNET_RADIUS) {
        const strength = 1 - dist / MAGNET_RADIUS;
        ctx.globalAlpha = 0.3 + strength * 0.5;
        ctx.strokeStyle = '#FFDD44';
        ctx.beginPath();
        ctx.moveTo(balloonX, balloonY);
        ctx.lineTo(star.x, star.y);
        ctx.stroke();
        const midX = (balloonX + star.x) / 2 + (Math.random() - 0.5) * 10;
        const midY = (balloonY + star.y) / 2 + (Math.random() - 0.5) * 10;
        ctx.globalAlpha = 0.6 * strength;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(midX, midY, 2 + strength * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(gameTime * 5) * 0.2;
    ctx.font = 'bold 14px "Fredoka One", cursive';
    ctx.fillStyle = '#FFDD44';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MAGNET!', balloonX, balloonY - BALLOON_RADIUS - 20);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // --- Obstacles (opaque sprites) ---
  for (const obs of obstacles) {
    ctx.save();
    if (obs.type === OBS_KITE) {
      ctx.translate(obs.x, obs.y);
      ctx.rotate(Math.sin(obs.wobble) * 0.15);
      drawSprite(obs.emoji, obs.size, 0, 0);
    } else if (obs.type === OBS_BAT) {
      const throb = 1 + Math.sin(obs.wingFrame * 2) * 0.08;
      ctx.translate(obs.x, obs.y);
      ctx.scale(throb, throb);
      drawSprite(obs.emoji, obs.size, 0, 0);
    } else if (obs.type === OBS_METEOR) {
      ctx.translate(obs.x, obs.y);
      ctx.rotate(-0.4);
      drawSprite(obs.emoji, obs.size, 0, 0);
    } else {
      drawSprite(obs.emoji, obs.size || 48, obs.x, obs.y);
    }
    ctx.restore();
  }

  // --- Stars (with golden glow aura) ---
  for (const star of stars) {
    ctx.save();
    const pulse = 1 + Math.sin(star.shimmerPhase) * 0.1;
    const glowAlpha = 0.2 + Math.sin(star.shimmerPhase) * 0.08;
    ctx.globalAlpha = glowAlpha;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(star.x, star.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(star.x, star.y);
    ctx.scale(pulse, pulse);
    drawSprite('\u{2728}', STAR_SIZE, 0, 0);
    ctx.restore();
  }

  // --- Extra life items (with red glow) ---
  for (const el of extraLifeItems) {
    ctx.save();
    const pulse = 1 + Math.sin(el.glowPhase) * 0.12;
    const glowAlpha = 0.25 + Math.sin(el.glowPhase) * 0.1;
    ctx.globalAlpha = glowAlpha;
    ctx.fillStyle = '#FF6B8A';
    ctx.beginPath();
    ctx.arc(el.x, el.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(el.x, el.y);
    ctx.scale(pulse, pulse);
    drawSprite('\u2764\uFE0F', 32, 0, 0);
    ctx.restore();
  }

  // --- Power-up items ---
  for (const pu of powerups) {
    ctx.save();
    const glowAlpha = 0.15 + Math.sin(pu.glowPhase) * 0.1;
    ctx.globalAlpha = glowAlpha;
    ctx.fillStyle = getPowerupColor(pu.type);
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const pulse = 1 + Math.sin(pu.glowPhase * 2) * 0.08;
    ctx.translate(pu.x, pu.y);
    ctx.scale(pulse, pulse);
    drawSprite(pu.emoji, POWERUP_SIZE, 0, 0);
    ctx.restore();
  }

  // --- Puff effects ---
  for (const p of puffs) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- Sparkles ---
  for (const s of sparkles) {
    ctx.globalAlpha = s.life;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- Pop particles ---
  for (const p of popParticles) {
    ctx.globalAlpha = p.life;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // --- Rainbow trail ---
  if (rainbowTrail.length > 1) {
    for (let i = 0; i < rainbowTrail.length; i++) {
      const pt = rainbowTrail[i];
      const t = i / rainbowTrail.length;
      const hue = t * 360;
      const alpha = (1 - pt.age / 0.8) * 0.6;
      const size = 4 + t * 12;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'hsl(' + hue + ', 90%, 60%)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- Floating score texts ---
  for (const ft of floatingTexts) {
    ctx.globalAlpha = ft.alpha;
    ctx.font = 'bold 22px "Fredoka One", cursive';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;

  // --- Balloon ---
  if (gameState !== 'gameover') {
    // String
    if (stringPoints.length >= 2) {
      ctx.strokeStyle = 'rgba(150, 120, 90, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(stringPoints[0].x, stringPoints[0].y);
      for (let i = 1; i < stringPoints.length; i++) {
        const prev = stringPoints[i - 1];
        const curr = stringPoints[i];
        const cpx = (prev.x + curr.x) / 2;
        const cpy = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
      }
      ctx.stroke();
    }

    // Balloon emoji with rotation
    if (gameState !== 'popping' || popTimer > 0.8) {
      const visible = invincibleTimer <= 0 || Math.floor(invincibleTimer / 0.15) % 2 === 0;
      if (visible) {
        ctx.save();
        ctx.translate(balloonX, balloonY);
        const tilt = Math.max(-0.09, Math.min(0.09, vy * 0.03));
        ctx.rotate(tilt);
        if (gameState === 'popping' && popTimer > 1.0) {
          const popScale = 1 + (1.2 - popTimer) * 3;
          ctx.scale(popScale, popScale);
        }
        drawSprite('\u{1F388}', 80, 0, 0);
        ctx.restore();
      }
    }

    // Shield bubble (fades with timer)
    if (shieldActive && gameState !== 'popping') {
      const shieldFrac = shieldTimer / SHIELD_DURATION;
      const blink = shieldTimer < 2 ? (Math.floor(shieldTimer / 0.2) % 2 === 0) : true;
      if (blink) {
        ctx.save();
        ctx.globalAlpha = (0.2 + Math.sin(gameTime * 4) * 0.1) * shieldFrac;
        ctx.strokeStyle = '#66CCFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(balloonX, balloonY, BALLOON_RADIUS + 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = (0.06 + Math.sin(gameTime * 4) * 0.04) * shieldFrac;
        ctx.fillStyle = '#88DDFF';
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }
  }

  // --- HUD score ---
  if (gameState === 'playing') {
    scoreEl.textContent = score;

    // Power-up timer HUD
    if (puIndicator) {
      if (activeTimedEffect) {
        puIndicator.classList.add('active');
        if (puIconEl) puIconEl.textContent = POWERUP_EMOJIS[activeTimedEffect.type];
        if (puBarEl) {
          const pct = (activeTimedEffect.remaining / activeTimedEffect.duration) * 100;
          puBarEl.style.width = Math.max(0, pct) + '%';
          puBarEl.style.background = getPowerupColor(activeTimedEffect.type);
        }
      } else {
        puIndicator.classList.remove('active');
      }
    }
    if (shieldIndEl) {
      shieldIndEl.classList.toggle('active', shieldActive);
    }
  }

  // --- 2x PTS indicator during rainbow ---
  if (scoreMultiplier > 1 && gameState === 'playing') {
    ctx.save();
    ctx.globalAlpha = 0.8 + Math.sin(gameTime * 6) * 0.2;
    ctx.font = 'bold 18px "Fredoka One", cursive';
    ctx.fillStyle = '#FF88CC';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.strokeText('2x PTS', W - 22, 48);
    ctx.fillText('2x PTS', W - 22, 48);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // --- Mystery box reveal animation ---
  if (mysteryRevealing) {
    const cx = W / 2;
    const cy = 80;
    const allEmojis = ['\u{1F6E1}\uFE0F', '\u{1F308}', '\u{1F9F2}', '\u{231B}'];

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(cx - 40, cy - 35, 80, 70, 12); }
    else { ctx.rect(cx - 40, cy - 35, 80, 70); }
    ctx.fill();
    ctx.strokeStyle = '#FFAA44';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (mysteryRevealing.settled) {
      drawSprite(POWERUP_EMOJIS[mysteryRevealing.finalType], 48, cx, cy);
    } else {
      const idx = Math.floor(mysteryRevealing.slotPhase) % allEmojis.length;
      drawSprite(allEmojis[idx], 48, cx, cy);
    }
    ctx.restore();
  }
}

// ===== Game Loop =====

function gameLoop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  let dt = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  if (dt > 0.05) dt = 0.05;

  if (gameState === 'playing') {
    // Slow-mo only slows obstacles; balloon, stars, powerups at normal speed
    const dtObs = dt * slowMoFactor;

    gameTime += dt;
    score = Math.floor(gameTime * 16 * scoreMultiplier) + starScore;

    updatePhysics(dt);           // balloon at normal speed
    updateObstacles(dtObs);      // obstacles slow down
    updateStars(dt);             // stars at normal speed
    updatePowerups(dt);          // powerups at normal speed
    updateExtraLives(dt);        // extra lives at normal speed
    updateRainbowTrail(dt);

    updateTimedEffect(dt);
    updateMysteryReveal(dt);

    checkCollisions();
    updatePuffs(dt);
    updateSparkles(dt);
    updateFloatingTexts(dt);

    if (nearMissCooldown > 0) nearMissCooldown -= dt;
    if (invincibleTimer > 0) invincibleTimer -= dt;

    // Shield timer countdown
    if (shieldActive) {
      shieldTimer -= dt;
      if (shieldTimer <= 0) shieldActive = false;
    }
  }

  if (gameState === 'ready') {
    bobPhase += BOB_FREQUENCY;
    balloonY = H * 0.45 + Math.sin(bobPhase) * BOB_AMPLITUDE * 2;
    balloonX = W * 0.25 + Math.sin(bobPhase * 0.3) * 10;
    updateString();
  }

  if (gameState === 'popping') {
    popTimer -= dt;
    updatePopParticles(dt);
    updatePuffs(dt);
    updateSparkles(dt);

    for (const sp of stringPoints) { sp.y += 3; }

    if (popTimer <= 0) {
      if (lives <= 0) {
        showGameOver();
      } else {
        balloonY = H * 0.45;
        balloonX = W * 0.25;
        vy = 0;
        driftPhase = 0;
        popParticles = [];
        initString();
        invincibleTimer = 2.0;
        gameState = 'playing';
      }
    }
  }

  for (const c of bgClouds) {
    c.x -= c.speed;
    if (c.x < -80) c.x = W + 80;
  }

  if (landscapeLayers) {
    for (const layer of landscapeLayers) {
      for (const item of layer.items) {
        item.x -= layer.speed;
        if (item.x < -80) {
          let maxX = 0;
          for (const other of layer.items) { if (other.x > maxX) maxX = other.x; }
          item.x = maxX + 60 + ((item.size * 7) % 40);
        }
      }
    }
  }

  render();
  animFrame = requestAnimationFrame(gameLoop);
}

// ===== Reset & Start =====

function resetAndStart() {
  celebrateEl.classList.remove('show');
  celebrateEl.innerHTML = '';

  balloonX = W * 0.25;
  balloonY = H * 0.45;
  vy = 0;
  driftPhase = 0;
  bobPhase = 0;
  gameTime = 0;
  score = 0;
  obstacles = [];
  puffs = [];
  sparkles = [];
  popParticles = [];
  lastSpawnTime = 0;
  popTimer = 0;
  nearMissCooldown = 0;
  lastFrameTime = null;

  lives = 3;
  invincibleTimer = 0;

  stars = [];
  starScore = 0;
  lastStarSpawnTime = 0;
  floatingTexts = [];

  extraLifeItems = [];
  lastExtraLifeCheck = 0;

  powerups = [];
  lastPowerupSpawnTime = 0;
  nextPowerupInterval = POWERUP_SPAWN_BASE + (Math.random() - 0.5) * POWERUP_SPAWN_VAR * 2;
  activeTimedEffect = null;
  shieldActive = false;
  shieldTimer = 0;
  slowMoFactor = 1.0;
  scoreMultiplier = 1;
  rainbowTrail = [];
  mysteryRevealing = null;

  initString();

  scoreEl.textContent = '0';
  hudEl.style.display = 'none';
  if (puIndicator) puIndicator.classList.remove('active');
  if (shieldIndEl) shieldIndEl.classList.remove('active');

  if (livesEl) { livesEl.classList.remove('active'); updateLives(); }

  if (hintEl) hintEl.remove();
  hintEl = document.createElement('div');
  hintEl.className = 'balloon-hint';
  hintEl.textContent = 'Tap to fly! \u{1F388}';
  gameEl.appendChild(hintEl);

  gameState = 'ready';
  bestScore = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
}

// ===== Cleanup =====

function cleanup() {
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = null;
  if (hintEl) { hintEl.remove(); hintEl = null; }
  gameState = 'gameover';
  obstacles = [];
  puffs = [];
  sparkles = [];
  popParticles = [];
  bgClouds = [];
  stringPoints = [];
  stars = [];
  floatingTexts = [];
  extraLifeItems = [];
  powerups = [];
  rainbowTrail = [];
  mysteryRevealing = null;
  activeTimedEffect = null;
  slowMoFactor = 1.0;
  scoreMultiplier = 1;
  lives = 3;
  invincibleTimer = 0;
  shieldActive = false;
  shieldTimer = 0;
  landscapeLayers = null;
  celebrateEl.classList.remove('show');
  celebrateEl.innerHTML = '';
  hudEl.style.display = 'none';
  if (livesEl) livesEl.classList.remove('active');
}

// ===== Exported Game Object =====

export const balloonFloat = {
  id: 'balloon-float',

  start() {
    gameEl.style.display = 'block';
    Object.keys(spriteCache).forEach(k => delete spriteCache[k]);
    initCanvas();
    createBgClouds();
    createLandscape();
    resetAndStart();
    animFrame = requestAnimationFrame(gameLoop);
  },

  stop() {
    gameEl.style.display = 'none';
    cleanup();
  },

  onKey(e) {
    initAudio();
    if (gameState === 'playing' || gameState === 'ready') {
      applyPuff();
    } else if (gameState === 'gameover') {
      if (e.key === ' ' || e.key === 'Enter') resetAndStart();
    }
  },

  onMouse(e) {
    initAudio();
    if (gameState === 'playing' || gameState === 'ready') {
      applyPuff();
    } else if (gameState === 'gameover') {
      if (!e.target.closest('.balloon-endcard-btn') && !e.target.closest('.endcard-share-btn')) resetAndStart();
    }
  },

  onTouch(e) {
    initAudio();
    if (gameState === 'playing' || gameState === 'ready') {
      applyPuff();
    } else if (gameState === 'gameover') {
      if (!e.target.closest('.balloon-endcard-btn') && !e.target.closest('.endcard-share-btn')) resetAndStart();
    }
  }
};
