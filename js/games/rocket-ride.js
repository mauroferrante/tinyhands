/* =========================================================
 *  Rocket Ride — Physics-Based Space Flight Game
 *  Arrow keys / WASD to steer, boost, and brake through space
 * ========================================================= */

import {
  initAudio, playRocketBoost, playBoostRelease, playRocketStarCollect,
  playFuelCanCollect, playAsteroidNearMiss, playRocketCrash,
  playMilestoneChime, playCountdownBeep, playLaunchRumble, playWinFanfare
} from '../audio.js';
import { shareOrCopy } from '../share.js';
import { preloadEmojis, getImage, createEmojiImg, getEmojiUrl } from '../emoji.js';
import { EMOJI_REGISTRY } from '../emoji-registry.js';

// ---- Physics constants ----
const GRAVITY            = 1.2;
const BOOST_FORCE        = -6.0;
const BRAKE_FORCE        = 2.0;
const HORIZONTAL_FORCE   = 18.0;
const MAX_HORIZONTAL_VEL = 24.0;
const MAX_VERTICAL_VEL   = 5.5;
const HORIZONTAL_DAMPING = 0.91;
const VERTICAL_DAMPING   = 0.96;
const BRAKE_DAMPING      = 0.85;
const MAX_TILT           = 30 * Math.PI / 180;  // 30 degrees in radians
const TILT_LERP          = 0.18;

// ---- Scroll constants ----
const BASE_SCROLL_SPEED     = 2.0;
const SCROLL_ACCELERATION   = 0.001;
const MAX_SCROLL_SPEED      = 6.0;
const SCROLL_GRAVITY_FACTOR = 0.3;
const PIXELS_PER_METER      = 4;

// ---- Collision ----
const ROCKET_RADIUS  = 24;
const HITBOX_SCALE   = 0.75;
const NEAR_MISS_DIST = 18;

// ---- Obstacle spawning ----
const OBS_SPAWN_START    = 1.4;
const OBS_SPAWN_MIN      = 0.4;
const MIN_GAP_Y          = 110;

// ---- Obstacle types ----
const OBS_ASTEROID_S  = 'asteroid_s';
const OBS_ASTEROID_M  = 'asteroid_m';
const OBS_ASTEROID_L  = 'asteroid_l';
const OBS_SATELLITE   = 'satellite';
const OBS_JUNK        = 'junk';
const OBS_UFO         = 'ufo';

// ---- Collectible constants ----
const STAR_SPAWN_INTERVAL    = 3.0;
const STAR_SIZE              = 32;
const STAR_POINTS            = 10;
const FUEL_SPAWN_INTERVAL    = 30;
const FUEL_SIZE              = 38;
const FUEL_DURATION          = 3.0;
const CLUSTER_SPAWN_INTERVAL = 20;
const CLUSTER_SIZE           = 5;
const CLUSTER_BONUS          = 100;

// ---- Scoring ----
const LS_BEST_KEY = 'tinyhandsplay-rocket-best';
const LS_ALT_KEY  = 'tinyhandsplay-rocket-altitude';

// ---- Milestones ----
const MILESTONES = [
  { alt: 500,  text: 'Nice flying!', emoji: '🚀' },
  { alt: 1000, text: 'Space explorer!', emoji: '🌟' },
  { alt: 2000, text: 'To infinity!', emoji: '✨' },
  { alt: 5000, text: 'Legendary pilot!', emoji: '👨‍🚀' },
];

// ---- DOM refs ----
const gameEl      = document.getElementById('rocketGame');
const canvas      = document.getElementById('rocketCanvas');
const hudEl       = document.getElementById('rocketHud');
const altitudeEl  = document.getElementById('rocketAltitude');
const starsEl     = document.getElementById('rocketStars');
const celebrateEl = document.getElementById('rocketCelebrate');
const livesEl     = document.getElementById('rocketLives');

let ctx = null;
let W = 0;
let H = 0;
let gameScale = 1; // responsive: 1.0 on mobile, scales up on larger screens

// ---- Game state ----
let rocketX, rocketY;
let rocketVX, rocketVY;
let rocketTilt;
let cameraY, scrollSpeed;
let altitude;
let gameTime, score;
let starCount;
let bestScore, bestAltitude;
let lives;
let gameState; // 'ready' | 'countdown' | 'playing' | 'crashing' | 'gameover'
let animFrame, lastFrameTime;
let nearMissCooldown;

// ---- Countdown state ----
let countdownTimer, countdownPhase, launchTextTimer;

// ---- Input state ----
const keysDown = new Set();
let keyUpHandler = null;
let touchBoosting = false;
let touchSteering = 0; // -1 left, 0 center, 1 right
let touchEndHandler = null;
let touchMoveHandler = null;
let lastBoostState = false;
let hasTouchInput = false;

// ---- Touch steering zones (bottom corners) ----
const STEER_ZONE_W_FRAC = 0.28;

function getTouchAction(clientX, clientY) {
  // Steer at any height — left/right edges steer, center boosts
  if (clientX < W * STEER_ZONE_W_FRAC) return 'left';
  if (clientX > W * (1 - STEER_ZONE_W_FRAC)) return 'right';
  return 'boost';
}

function applyAllTouches(touches) {
  let steering = 0;
  let boosting = false;
  for (let i = 0; i < touches.length; i++) {
    const action = getTouchAction(touches[i].clientX, touches[i].clientY);
    if (action === 'left') steering = -1;
    else if (action === 'right') steering = 1;
    else boosting = true;
  }
  touchSteering = steering;
  touchBoosting = boosting;
}

// ---- Obstacles ----
let obstacles;
let lastObstacleSpawn;

// ---- Collectibles ----
let stars;
let lastStarSpawn;
let fuelCans;
let lastFuelSpawn;
let starClusters;
let lastClusterSpawn;

// ---- Power-up state ----
let invincible, invincibleTimer;
let rainbowTrail;

// ---- Effects ----
let sparkles;
let floatingTexts;
let crashFragments;
let shakeIntensity, shakeDuration;
let milestoneText, milestoneEmoji, milestoneTimer;

// ---- Background ----
let starLayers;
let nebulaBlobs;

// ---- Landscape ----
let landscapeLayers;
let landscapeScale;

// ---- Launch boost ----
let autoBoostTimer;

// ---- Launch pad ----
let launchPadY;

// ---- Misc ----
let hintEl;
let milestonesReached;
let resizeHandler;

// ---- Sprite cache (copied from balloon-float) ----
const spriteCache = {};

// ===== Canvas Setup =====

function initCanvas() {
  const dpr = Math.max(2, window.devicePixelRatio || 1);
  W = gameEl.clientWidth;
  H = gameEl.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  // CSS inset:0 + width/height:100% handles display sizing — no style overrides needed
  ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  gameScale = Math.max(1, Math.min(2, W / 800));
}

function onResize() {
  const oldH = H;
  initCanvas();
  if (Math.abs(H - oldH) > 5) {
    createStarfield();
    createNebulae();
    createLandscape();
  }
}

// ===== Sprite Cache =====

function getSprite(emoji, size) {
  const key = emoji + '|' + size;
  if (spriteCache[key]) return spriteCache[key];
  const dpr = Math.max(2, window.devicePixelRatio || 1);
  const pad = Math.ceil(size * 0.3);
  const dim = size + pad * 2;
  const off = document.createElement('canvas');
  off.width = dim * dpr;
  off.height = dim * dpr;
  const oc = off.getContext('2d');
  oc.scale(dpr, dpr);
  const img = getImage(emoji);
  if (img) {
    oc.drawImage(img, pad, pad, size, size);
  } else {
    oc.font = size + 'px serif';
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';
    oc.fillText(emoji, dim / 2, dim / 2);
  }
  const sprite = { canvas: off, offset: dim / 2, dim };
  spriteCache[key] = sprite;
  return sprite;
}

function drawSprite(emoji, size, x, y) {
  const sp = getSprite(emoji, size);
  ctx.drawImage(sp.canvas, 0, 0, sp.canvas.width, sp.canvas.height,
    x - sp.offset, y - sp.offset, sp.dim, sp.dim);
}

// ===== Background Starfield =====

function createStarfield() {
  starLayers = [
    { stars: [], speed: 0.2, size: 1, alpha: 0.3, count: 50 },
    { stars: [], speed: 0.5, size: 1.5, alpha: 0.5, count: 35 },
    { stars: [], speed: 1.0, size: 2, alpha: 0.7, count: 20 },
  ];
  for (const layer of starLayers) {
    layer.stars = [];
    for (let i = 0; i < layer.count; i++) {
      layer.stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 2,
      });
    }
  }
}

function createNebulae() {
  nebulaBlobs = [];
  const colors = [
    'rgba(120, 60, 180, 0.06)',
    'rgba(60, 100, 200, 0.05)',
    'rgba(180, 60, 120, 0.04)',
    'rgba(60, 180, 160, 0.04)',
  ];
  for (let i = 0; i < 4; i++) {
    nebulaBlobs.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 80 + Math.random() * 120,
      color: colors[i % colors.length],
      speedFactor: 0.3 + Math.random() * 0.2,
    });
  }
}

// ===== Earth Landscape (adapted from balloon-float) =====

function createLandscape() {
  landscapeLayers = [];
  const totalW = W + 800;
  landscapeScale = Math.max(H / 500, 1);
  const s = landscapeScale;

  // --- Back layer: tall distant hills with mountains & volcanos ---
  const backHills = [];
  const backClusters = [];
  let bhx = -20;
  while (bhx < totalW + 300) {
    backHills.push({ x: bhx, h: (55 + ((bhx * 7 + 13) % 65)) * s });
    bhx += 70 + ((bhx * 3 + 7) % 50);
  }
  const mtnEmojis = ['\u{1F3D4}\uFE0F', '\u26F0\uFE0F', '\u{1F5FB}'];
  let bcx = 80, bci = 0;
  while (bcx < totalW) {
    const kind = (bci * 37 + 11) % 100;
    if (kind < 25) {
      const count = 2 + ((bci * 13) % 2);
      for (let i = 0; i < count; i++) {
        backClusters.push({
          emoji: mtnEmojis[(bci + i) % mtnEmojis.length],
          x: bcx + i * 45, size: (55 + ((bci * 11 + i * 7) % 20)) * s,
          yOffset: -(45 + ((bci * 7 + i * 13) % 35)) * s
        });
      }
      bcx += 140 + count * 45;
    } else if (kind < 38) {
      backClusters.push({
        emoji: '\u{1F30B}', x: bcx, size: (58 + ((bci * 17) % 16)) * s,
        yOffset: -(55 + ((bci * 11) % 25)) * s
      });
      bcx += 180;
    } else {
      bcx += 120 + ((bci * 53) % 100);
    }
    bci++;
  }
  landscapeLayers.push({
    speed: 0.06, alpha: 0.30, yBase: H + 15,
    hills: backHills, hillColor: '#B8D8A8',
    items: backClusters
  });

  // --- Middle layer: towns, forests on rolling hills ---
  const midHills = [];
  const midClusters = [];
  let mhx = -10;
  while (mhx < totalW + 300) {
    midHills.push({ x: mhx, h: (35 + ((mhx * 11 + 5) % 50)) * s });
    mhx += 50 + ((mhx * 7 + 3) % 40);
  }
  const townEmojis = ['\u{1F3E0}', '\u{1F3E1}', '\u{1F3E2}', '\u26EA\uFE0F', '\u{1F3E3}', '\u{1F3ED}', '\u{1F3EF}'];
  const treeEmojis = ['\u{1F333}', '\u{1F332}', '\u{1F334}', '\u{1F333}'];
  let mcx = 60, mci = 0;
  while (mcx < totalW) {
    const kind = (mci * 43 + 7) % 100;
    if (kind < 28) {
      const count = 3 + ((mci * 11) % 3);
      const baseY = 20 + ((mci * 19) % 30);
      for (let i = 0; i < count; i++) {
        midClusters.push({
          emoji: townEmojis[(mci + i) % townEmojis.length],
          x: mcx + i * 26, size: (28 + ((mci * 7 + i * 5) % 12)) * s,
          yOffset: -(baseY + ((i * 7) % 10)) * s
        });
      }
      mcx += 90 + count * 26;
    } else if (kind < 55) {
      const count = 3 + ((mci * 17) % 4);
      const baseY = 15 + ((mci * 23) % 25);
      for (let i = 0; i < count; i++) {
        midClusters.push({
          emoji: treeEmojis[(mci + i) % treeEmojis.length],
          x: mcx + i * 20, size: (24 + ((mci * 5 + i * 9) % 10)) * s,
          yOffset: -(baseY + ((i * 11) % 12)) * s
        });
      }
      mcx += 70 + count * 20;
    } else {
      mcx += 90 + ((mci * 59) % 80);
    }
    mci++;
  }
  landscapeLayers.push({
    speed: 0.14, alpha: 0.50, yBase: H + 10,
    hills: midHills, hillColor: '#8CC87C',
    items: midClusters
  });

  // --- Front layer: close foreground hills with scattered details ---
  const frontHills = [];
  const frontClusters = [];
  let fhx = -10;
  while (fhx < totalW + 300) {
    frontHills.push({ x: fhx, h: (20 + ((fhx * 13 + 9) % 30)) * s });
    fhx += 35 + ((fhx * 5 + 11) % 30);
  }
  const smallEmojis = ['\u{1F333}', '\u{1F3E1}', '\u{1F332}', '\u{1F334}'];
  let fcx = 80, fci = 0;
  while (fcx < totalW) {
    const kind = (fci * 31 + 19) % 100;
    if (kind < 18) {
      const baseY = 10 + ((fci * 13) % 15);
      frontClusters.push({
        emoji: '\u{1F3E1}', x: fcx, size: 22 * s,
        yOffset: -(baseY + 4) * s
      });
      frontClusters.push({
        emoji: smallEmojis[(fci * 3) % smallEmojis.length],
        x: fcx + 22, size: 20 * s,
        yOffset: -(baseY + 2) * s
      });
      fcx += 90;
    } else if (kind < 32) {
      const baseY = 8 + ((fci * 17) % 12);
      for (let i = 0; i < 2; i++) {
        frontClusters.push({
          emoji: smallEmojis[(fci + i) % smallEmojis.length],
          x: fcx + i * 18, size: (18 + ((fci * 7) % 6)) * s,
          yOffset: -(baseY + ((i * 5) % 6)) * s
        });
      }
      fcx += 70;
    } else {
      fcx += 80 + ((fci * 41) % 70);
    }
    fci++;
  }
  landscapeLayers.push({
    speed: 0.25, alpha: 0.60, yBase: H + 5,
    hills: frontHills, hillColor: '#6BB85A',
    items: frontClusters
  });
}

function drawHillTerrain(layer) {
  if (!layer.hills || layer.hills.length < 2) return;
  layer.hills.sort((a, b) => a.x - b.x);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = layer.hillColor;
  ctx.beginPath();
  ctx.moveTo(-50, H + 10);
  ctx.lineTo(-50, layer.yBase - layer.hills[0].h);
  for (let i = 0; i < layer.hills.length - 1; i++) {
    const curr = layer.hills[i];
    const next = layer.hills[i + 1];
    const cpx = (curr.x + next.x) / 2;
    ctx.quadraticCurveTo(curr.x, layer.yBase - curr.h, cpx, layer.yBase - (curr.h + next.h) / 2);
  }
  const last = layer.hills[layer.hills.length - 1];
  ctx.lineTo(W + 50, layer.yBase - last.h);
  ctx.lineTo(W + 50, H + 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ===== Key Mapping =====

function keyToAction(key) {
  switch (key) {
    case 'ArrowLeft': case 'a': case 'A': return 'left';
    case 'ArrowRight': case 'd': case 'D': return 'right';
    case 'ArrowUp': case 'w': case 'W': case ' ': return 'boost';
    case 'ArrowDown': case 's': case 'S': return 'brake';
    default: return null;
  }
}

// ===== Rocket Physics =====

function updateRocket(dt) {
  const dtNorm = dt * 60;
  const isBoosting = keysDown.has('boost') || touchBoosting || autoBoostTimer > 0;
  if (autoBoostTimer > 0) autoBoostTimer -= dt;
  const isBraking  = keysDown.has('brake');
  const isLeft     = keysDown.has('left') || touchSteering < 0;
  const isRight    = keysDown.has('right') || touchSteering > 0;

  // Vertical physics (scaled to screen size)
  rocketVY += GRAVITY * gameScale * dt;
  rocketVY += scrollSpeed * SCROLL_GRAVITY_FACTOR * dt;
  if (isBoosting) rocketVY += BOOST_FORCE * gameScale * dt;
  if (isBraking)  rocketVY += BRAKE_FORCE * gameScale * dt;
  rocketVY *= Math.pow(VERTICAL_DAMPING, dtNorm);
  rocketVY = Math.max(-MAX_VERTICAL_VEL * gameScale, Math.min(MAX_VERTICAL_VEL * gameScale, rocketVY));

  // Horizontal physics (scaled to screen size)
  if (isLeft)  rocketVX -= HORIZONTAL_FORCE * gameScale * dt;
  if (isRight) rocketVX += HORIZONTAL_FORCE * gameScale * dt;
  rocketVX *= Math.pow(isBraking ? BRAKE_DAMPING : HORIZONTAL_DAMPING, dtNorm);
  rocketVX = Math.max(-MAX_HORIZONTAL_VEL * gameScale, Math.min(MAX_HORIZONTAL_VEL * gameScale, rocketVX));

  // Apply velocity
  rocketX += rocketVX * dtNorm;
  rocketY += rocketVY * dtNorm;

  // Edge bounce (horizontal)
  const margin = 20;
  if (rocketX < margin) {
    rocketX = margin;
    rocketVX = Math.abs(rocketVX) * 0.4;
    spawnEdgeSpark(margin, rocketY);
  } else if (rocketX > W - margin) {
    rocketX = W - margin;
    rocketVX = -Math.abs(rocketVX) * 0.4;
    spawnEdgeSpark(W - margin, rocketY);
  }

  // Top clamp
  if (rocketY < H * 0.08) rocketY = H * 0.08;

  // Bottom = crash
  if (rocketY > H + ROCKET_RADIUS) {
    triggerCrash();
    return;
  }

  // Tilt lerp
  const targetTilt = (rocketVX / MAX_HORIZONTAL_VEL) * MAX_TILT;
  rocketTilt += (targetTilt - rocketTilt) * TILT_LERP * dtNorm;

  // Boost sound
  if (isBoosting && !lastBoostState) playRocketBoost();
  if (!isBoosting && lastBoostState) playBoostRelease();
  lastBoostState = isBoosting;
}

function spawnEdgeSpark(x, y) {
  for (let i = 0; i < 5; i++) {
    sparkles.push({
      x, y: y + (Math.random() - 0.5) * 20,
      vx: (x < W / 2 ? 1 : -1) * (40 + Math.random() * 60),
      vy: (Math.random() - 0.5) * 80,
      life: 0.3, color: '#FFD700',
    });
  }
}

// ===== Camera / Auto-scroll =====

function updateScroll(dt) {
  const dtNorm = dt * 60;
  scrollSpeed = Math.min((BASE_SCROLL_SPEED + gameTime * SCROLL_ACCELERATION * 60) * gameScale, MAX_SCROLL_SPEED * gameScale);
  cameraY += scrollSpeed * dtNorm;
  altitude = Math.floor(cameraY / PIXELS_PER_METER);
}

// ===== Obstacles =====

function getSpawnInterval() {
  const base = Math.max(OBS_SPAWN_MIN, OBS_SPAWN_START - gameTime * 0.01);
  return base / gameScale; // Spawn faster on larger screens
}

function spawnObstacle() {
  const alt = altitude;
  const types = [OBS_ASTEROID_M];

  if (alt > 200) types.push(OBS_ASTEROID_S, OBS_ASTEROID_L);
  if (alt > 500) types.push(OBS_SATELLITE);
  if (alt > 1000) types.push(OBS_JUNK);
  if (alt > 2000) types.push(OBS_UFO);

  const type = types[Math.floor(Math.random() * types.length)];
  const x = 40 + Math.random() * (W - 80);
  let y = -40;
  let w, h, emoji, size, vx = 0;

  switch (type) {
    case OBS_ASTEROID_S:
      size = 36; emoji = '\u{1FAA8}'; w = 30; h = 30; break;
    case OBS_ASTEROID_M:
      size = 50; emoji = '\u{1FAA8}'; w = 42; h = 42; break;
    case OBS_ASTEROID_L:
      size = 72; emoji = '\u{1FAA8}'; w = 60; h = 60; break;
    case OBS_SATELLITE:
      size = 48; emoji = '\u{1F6F0}\uFE0F'; w = 44; h = 40;
      vx = (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.8);
      break;
    case OBS_JUNK:
      size = 28; emoji = '\u{1F529}'; w = 24; h = 24; break;
    case OBS_UFO:
      size = 52; emoji = '\u{1F6F8}'; w = 48; h = 36; break;
  }

  // Ensure minimum gap from existing obstacles
  for (let attempt = 0; attempt < 5; attempt++) {
    let tooClose = false;
    for (const obs of obstacles) {
      if (obs.y < H * 0.4 && Math.abs(obs.x - x) < MIN_GAP_Y * gameScale) {
        tooClose = true; break;
      }
    }
    if (!tooClose) break;
  }

  obstacles.push({
    type, x, y, w, h, emoji, size, vx,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 2,
    sinePhase: Math.random() * Math.PI * 2,
  });

  // Spawn junk cluster (multiple pieces)
  if (type === OBS_JUNK) {
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      obstacles.push({
        type: OBS_JUNK,
        x: x + (Math.random() - 0.5) * 80,
        y: y - Math.random() * 40,
        w: 24, h: 24,
        emoji: Math.random() < 0.5 ? '\u{1F529}' : '\u{1F527}',
        size: 24 + Math.floor(Math.random() * 8),
        vx: (Math.random() - 0.5) * 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 3,
        sinePhase: 0,
      });
    }
  }
}

function updateObstacles(dt) {
  const dtNorm = dt * 60;
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.y += scrollSpeed * dtNorm;
    obs.x += obs.vx * dtNorm;
    obs.rotation += obs.rotSpeed * dt;

    // Satellite patrol bounce
    if (obs.type === OBS_SATELLITE) {
      if (obs.x < 40 || obs.x > W - 40) obs.vx *= -1;
    }

    // UFO sine wave
    if (obs.type === OBS_UFO) {
      obs.sinePhase += dt * 2.5;
      obs.x += Math.sin(obs.sinePhase) * 1.5 * dtNorm;
    }

    // Remove off-screen
    if (obs.y > H + 80) obstacles.splice(i, 1);
  }

  // Spawn check
  if (gameTime - lastObstacleSpawn >= getSpawnInterval()) {
    lastObstacleSpawn = gameTime;
    spawnObstacle();
  }
}

// ===== Stars =====

function spawnStar() {
  stars.push({
    x: 30 + Math.random() * (W - 60),
    y: -20,
    size: STAR_SIZE,
    bobPhase: Math.random() * Math.PI * 2,
  });
}

function updateStars(dt) {
  const dtNorm = dt * 60;
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    s.y += scrollSpeed * dtNorm;
    s.bobPhase += dt * 3;
    if (s.y > H + 40) stars.splice(i, 1);
  }
  if (gameTime > 2 && gameTime - lastStarSpawn >= STAR_SPAWN_INTERVAL) {
    lastStarSpawn = gameTime;
    spawnStar();
    if (Math.random() < 0.3) spawnStar(); // chance for extra
  }
}

// ===== Fuel Cans =====

function spawnFuelCan() {
  fuelCans.push({
    x: 50 + Math.random() * (W - 100),
    y: -30,
    size: FUEL_SIZE,
    bobPhase: Math.random() * Math.PI * 2,
  });
}

function updateFuelCans(dt) {
  const dtNorm = dt * 60;
  for (let i = fuelCans.length - 1; i >= 0; i--) {
    const f = fuelCans[i];
    f.y += scrollSpeed * dtNorm;
    f.bobPhase += dt * 2;
    if (f.y > H + 40) fuelCans.splice(i, 1);
  }
  if (altitude > 500 && gameTime - lastFuelSpawn >= FUEL_SPAWN_INTERVAL) {
    lastFuelSpawn = gameTime;
    spawnFuelCan();
  }
}

// ===== Star Clusters =====

function spawnStarCluster() {
  const cx = 80 + Math.random() * (W - 160);
  const cy = -40;
  const cluster = { items: [], collected: 0 };
  for (let i = 0; i < CLUSTER_SIZE; i++) {
    const angle = (Math.PI * 2 / CLUSTER_SIZE) * i;
    cluster.items.push({
      x: cx + Math.cos(angle) * 40,
      y: cy + Math.sin(angle) * 40,
      alive: true,
    });
  }
  starClusters.push(cluster);
}

function updateStarClusters(dt) {
  const dtNorm = dt * 60;
  for (let i = starClusters.length - 1; i >= 0; i--) {
    const cl = starClusters[i];
    let allGone = true;
    for (const item of cl.items) {
      item.y += scrollSpeed * dtNorm;
      if (item.alive && item.y < H + 40) allGone = false;
    }
    if (allGone) starClusters.splice(i, 1);
  }
  if (altitude > 1000 && gameTime - lastClusterSpawn >= CLUSTER_SPAWN_INTERVAL) {
    lastClusterSpawn = gameTime;
    spawnStarCluster();
  }
}

// ===== Collision Detection =====

function checkCollisions() {
  const bx = rocketX, by = rocketY;
  const br = ROCKET_RADIUS * HITBOX_SCALE;

  // Obstacles
  if (!invincible) {
    for (const obs of obstacles) {
      const hw = obs.w / 2 * HITBOX_SCALE;
      const hh = obs.h / 2 * HITBOX_SCALE;
      const dx = Math.abs(bx - obs.x) - (hw + br);
      const dy = Math.abs(by - obs.y) - (hh + br);
      if (dx < 0 && dy < 0) {
        triggerCrash();
        return;
      }
      // Near miss
      const nearDist = Math.max(dx, dy);
      if (nearDist < NEAR_MISS_DIST && nearDist > 0 && nearMissCooldown <= 0) {
        nearMissCooldown = 1.0;
        playAsteroidNearMiss();
        spawnSparkles(bx, by, 3, '#FFFFFF');
      }
    }
  }

  // Stars
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    const dx = bx - s.x, dy = by - s.y;
    if (dx * dx + dy * dy < (br + 16) * (br + 16)) {
      starCount++;
      score += STAR_POINTS;
      floatingTexts.push({ text: '+' + STAR_POINTS, x: s.x, y: s.y, alpha: 1.0, vy: -60, color: '#FFD700' });
      spawnSparkles(s.x, s.y, 5, '#FFD700');
      playRocketStarCollect();
      stars.splice(i, 1);
    }
  }

  // Star clusters
  for (const cl of starClusters) {
    for (const item of cl.items) {
      if (!item.alive) continue;
      const dx = bx - item.x, dy = by - item.y;
      if (dx * dx + dy * dy < (br + 14) * (br + 14)) {
        item.alive = false;
        cl.collected++;
        starCount++;
        score += STAR_POINTS;
        spawnSparkles(item.x, item.y, 3, '#FFD700');
        playRocketStarCollect();
        if (cl.collected === CLUSTER_SIZE) {
          score += CLUSTER_BONUS;
          floatingTexts.push({ text: '+' + CLUSTER_BONUS + ' BONUS!', x: bx, y: by - 30, alpha: 1.0, vy: -80, color: '#FF66FF' });
          playMilestoneChime();
        }
      }
    }
  }

  // Fuel cans
  for (let i = fuelCans.length - 1; i >= 0; i--) {
    const f = fuelCans[i];
    const dx = bx - f.x, dy = by - f.y;
    if (dx * dx + dy * dy < (br + 20) * (br + 20)) {
      activateFuel();
      playFuelCanCollect();
      spawnSparkles(f.x, f.y, 8, '#00FF88');
      floatingTexts.push({ text: 'SUPER BOOST!', x: f.x, y: f.y, alpha: 1.0, vy: -70, color: '#00FF88' });
      fuelCans.splice(i, 1);
    }
  }
}

// ===== Fuel Can Power-Up =====

function activateFuel() {
  invincible = true;
  invincibleTimer = FUEL_DURATION;
  rocketVY = -MAX_VERTICAL_VEL;  // Surge upward
}

function updateInvincibility(dt) {
  if (invincible) {
    invincibleTimer -= dt;
    // Rainbow trail
    if (rainbowTrail.length < 30) {
      rainbowTrail.push({ x: rocketX, y: rocketY + 25, life: 0.6 });
    }
    if (invincibleTimer <= 0) {
      invincible = false;
      rainbowTrail = [];
    }
  }
  for (let i = rainbowTrail.length - 1; i >= 0; i--) {
    rainbowTrail[i].life -= dt;
    rainbowTrail[i].y += scrollSpeed * dt * 60;
    if (rainbowTrail[i].life <= 0) rainbowTrail.splice(i, 1);
  }
}

// ===== Crash =====

function triggerCrash() {
  if (gameState === 'crashing' || gameState === 'gameover') return;
  lives--;
  animateRocketHeartLost();
  gameState = 'crashing';
  countdownTimer = 2.0;
  shakeIntensity = 12;
  shakeDuration = 0.5;
  spawnCrashFragments();
  playRocketCrash();
}

function spawnCrashFragments() {
  const emojis = ['\u{1F4A5}', '\u2728', '\u{1F525}', '\u{1F4AB}'];
  const colors = ['#FF4444', '#FF8800', '#FFCC00', '#FF6600', '#FF44AA'];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.5;
    const speed = 120 + Math.random() * 180;
    crashFragments.push({
      type: 'emoji',
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: rocketX, y: rocketY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      size: 20 + Math.random() * 20,
      life: 1.0,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 12,
    });
  }
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 150;
    crashFragments.push({
      type: 'debris',
      x: rocketX, y: rocketY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50,
      size: 3 + Math.random() * 5,
      life: 1.0,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 8,
    });
  }
}

function updateCrashFragments(dt) {
  for (let i = crashFragments.length - 1; i >= 0; i--) {
    const f = crashFragments[i];
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vy += 200 * dt; // gravity
    f.rotation += f.rotSpeed * dt;
    f.life -= dt * 0.8;
    if (f.life <= 0) crashFragments.splice(i, 1);
  }
}

// ===== Sparkles & Floating Texts =====

function spawnSparkles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    sparkles.push({
      x, y,
      vx: Math.cos(angle) * (60 + Math.random() * 40),
      vy: Math.sin(angle) * (60 + Math.random() * 40),
      life: 0.4, color,
    });
  }
}

function updateSparkles(dt) {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.life <= 0) sparkles.splice(i, 1);
  }
}

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.y += t.vy * dt;
    t.alpha -= dt * 1.5;
    if (t.alpha <= 0) floatingTexts.splice(i, 1);
  }
}

// ===== Milestones =====

function checkMilestones() {
  for (const m of MILESTONES) {
    if (altitude >= m.alt && !milestonesReached.has(m.alt)) {
      milestonesReached.add(m.alt);
      milestoneText = m.text;
      milestoneEmoji = m.emoji;
      milestoneTimer = 2.0;
      playMilestoneChime();
    }
  }
}

// ===== Scoring & Game Over =====

function wireShare(container) {
  const btn = container.querySelector('[data-share]');
  if (btn) {
    btn.addEventListener('click', async () => {
      const result = await shareOrCopy();
      if (result.method === 'copy' && result.success) {
        btn.innerHTML = '<img src="' + getEmojiUrl('✅') + '" class="emoji-img btn-emoji" alt="✅"> Copied!';
        setTimeout(() => { btn.innerHTML = '<img src="' + getEmojiUrl('📤') + '" class="emoji-img btn-emoji" alt="📤"> Share with a parent'; }, 2500);
      }
    });
  }
}

// ===== Lives System =====

function updateRocketLives() {
  if (!livesEl) return;
  livesEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement('span');
    heart.className = 'rocket-heart';
    heart.appendChild(createEmojiImg(i < lives ? '❤️' : '🤍', 'emoji-img'));
    if (i >= lives) heart.classList.add('lost');
    livesEl.appendChild(heart);
  }
}

function animateRocketHeartLost() {
  if (!livesEl) return;
  const hearts = livesEl.querySelectorAll('.rocket-heart');
  const heartToRemove = hearts[lives];
  if (heartToRemove) {
    heartToRemove.classList.add('rocket-heart-breaking');
    setTimeout(() => {
      heartToRemove.textContent = '';
      heartToRemove.appendChild(createEmojiImg('🤍', 'emoji-img'));
      heartToRemove.classList.add('lost');
      heartToRemove.classList.remove('rocket-heart-breaking');
    }, 500);
  }
}

function showGameOver() {
  gameState = 'gameover';
  if (livesEl) livesEl.classList.remove('active');

  bestScore = parseInt(localStorage.getItem(LS_BEST_KEY) || '0', 10);
  bestAltitude = parseInt(localStorage.getItem(LS_ALT_KEY) || '0', 10);
  const isNewBest = score > bestScore;
  const isNewAlt = altitude > bestAltitude;
  if (isNewBest) { try { localStorage.setItem(LS_BEST_KEY, String(score)); } catch (e) {} bestScore = score; }
  if (isNewAlt) { try { localStorage.setItem(LS_ALT_KEY, String(altitude)); } catch (e) {} bestAltitude = altitude; }

  const altFmt = altitude.toLocaleString() + 'km';
  const titles = [
    'CRASH! <img src="' + getEmojiUrl('💥') + '" class="emoji-img inline-emoji" alt="💥">',
    'Houston, we have a problem!',
    'BOOM! <img src="' + getEmojiUrl('💫') + '" class="emoji-img inline-emoji" alt="💫">'
  ];
  const title = titles[Math.floor(Math.random() * titles.length)];

  celebrateEl.innerHTML =
    '<div class="rocket-endcard">' +
      '<div class="rocket-endcard-emoji"><img src="' + getEmojiUrl('💥') + '" class="emoji-img" alt="💥" style="width:100%;height:100%"></div>' +
      '<div class="rocket-endcard-title">' + title + '</div>' +
      '<div class="rocket-endcard-stats">' +
        '<span><img src="' + getEmojiUrl('📏') + '" class="emoji-img inline-emoji" alt="📏"> ' + altFmt + '</span>' +
        '<span><img src="' + getEmojiUrl('⭐') + '" class="emoji-img inline-emoji" alt="⭐"> × ' + starCount + '</span>' +
        '<span>Score: ' + score + '</span>' +
      '</div>' +
      (isNewBest ? '<div class="rocket-endcard-best"><img src="' + getEmojiUrl('🏆') + '" class="emoji-img inline-emoji" alt="🏆"> New Best!</div>' :
       bestScore > 0 ? '<div class="rocket-endcard-best-small">Best: ' + bestScore + '</div>' : '') +
      (isNewAlt && !isNewBest ? '<div class="rocket-endcard-best"><img src="' + getEmojiUrl('🏆') + '" class="emoji-img inline-emoji" alt="🏆"> New altitude record!</div>' : '') +
      '<div class="rocket-endcard-actions">' +
        '<button class="rocket-endcard-btn rocket-btn-again">Launch Again</button>' +
      '</div>' +
      '<button class="endcard-share-btn" data-share><img src="' + getEmojiUrl('📤') + '" class="emoji-img btn-emoji" alt="📤"> Share with a parent</button>' +
    '</div>';

  celebrateEl.classList.add('show');
  wireShare(celebrateEl);

  const againBtn = celebrateEl.querySelector('.rocket-btn-again');
  if (againBtn) {
    againBtn.addEventListener('click', () => {
      resetAndStart();
      animFrame = requestAnimationFrame(gameLoop);
    });
  }
}

// ===== Launch Countdown =====

function startCountdown() {
  gameState = 'countdown';
  countdownTimer = 3.0;
  countdownPhase = 3;
  launchTextTimer = 0;
  if (hintEl) hintEl.style.opacity = '0';
  playCountdownBeep();
}

function updateCountdown(dt) {
  countdownTimer -= dt;
  const newPhase = Math.ceil(countdownTimer);
  if (newPhase > 0 && newPhase < countdownPhase) {
    countdownPhase = newPhase;
    playCountdownBeep();
  }
  if (countdownTimer <= 0 && launchTextTimer === 0) {
    launchTextTimer = 1.0;
    playLaunchRumble();
  }
  if (launchTextTimer > 0) {
    launchTextTimer -= dt;
    if (launchTextTimer <= 0) {
      gameState = 'playing';
      hudEl.style.display = 'flex';
      if (livesEl) livesEl.classList.add('active');
      rocketVY = -MAX_VERTICAL_VEL; // Full launch surge
      autoBoostTimer = 2.0; // 2 seconds of free boost
    }
  }
}

// ===== Render =====

function render() {
  // Sky gradient — light blue (Earth) → deep blue → black (space)
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (altitude < 200) {
    const t = Math.min(altitude / 200, 1);
    grad.addColorStop(0, lerpColor('#87CEEB', '#5B9BD5', t));
    grad.addColorStop(1, lerpColor('#B0E0FF', '#7AB8E0', t));
  } else if (altitude < 800) {
    const t = Math.min((altitude - 200) / 600, 1);
    grad.addColorStop(0, lerpColor('#5B9BD5', '#1B3A6B', t));
    grad.addColorStop(1, lerpColor('#7AB8E0', '#0D1B3A', t));
  } else if (altitude < 1500) {
    const t = Math.min((altitude - 800) / 700, 1);
    grad.addColorStop(0, lerpColor('#1B3A6B', '#060818', t));
    grad.addColorStop(1, lerpColor('#0D1B3A', '#020010', t));
  } else {
    grad.addColorStop(0, '#060818');
    grad.addColorStop(1, '#020010');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Screen shake
  let shakeX = 0, shakeY = 0;
  if (shakeDuration > 0) {
    const t = shakeDuration / 0.5;
    const intensity = shakeIntensity * t;
    shakeX = (Math.random() - 0.5) * intensity * 2;
    shakeY = (Math.random() - 0.5) * intensity * 2;
  }
  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Earth landscape (fades out as we leave atmosphere)
  if (landscapeLayers && altitude < 1500) {
    const landAlpha = Math.max(0, 1 - altitude / 1200);
    ctx.save();
    for (const layer of landscapeLayers) {
      ctx.globalAlpha = landAlpha;
      drawHillTerrain(layer);
      ctx.globalAlpha = landAlpha * layer.alpha;
      for (const item of layer.items) {
        drawSprite(item.emoji, item.size, item.x, layer.yBase + item.yOffset);
      }
    }
    ctx.restore();
  }

  // Launch pad (crane + NASA buildings) — scrolls with landscape
  if (launchPadY < H + 200 && altitude < 1500) {
    const padAlpha = Math.max(0, 1 - altitude / 1200);
    ctx.save();
    ctx.globalAlpha = padAlpha;
    const padX = W * 0.5;
    // Ground level = front layer base (where hills sit)
    const groundY = landscapeLayers ? landscapeLayers[2].yBase - 15 * (landscapeScale || 1) : launchPadY;
    // Crane (launch tower) — base on ground, tower extends up next to rocket
    drawSprite('\u{1F3D7}\uFE0F', 120, padX + 55, groundY - 25 * (landscapeScale || 1));
    // NASA office buildings — on the ground, flanking the pad
    drawSprite('\u{1F3E2}', 40, padX - 80, groundY);
    drawSprite('\u{1F3E2}', 34, padX - 115, groundY + 4);
    drawSprite('\u{1F3E2}', 36, padX + 115, groundY + 2);
    ctx.restore();
  }

  // Stars fade in as sky darkens
  const starAlpha = Math.min(Math.max((altitude - 200) / 400, 0), 1);

  // Far star layer
  if (starLayers && starAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = starAlpha;
    drawStarLayer(0);
    ctx.restore();
  }

  // Nebulae (above 800m)
  if (altitude > 800 && nebulaBlobs) {
    const nebAlpha = Math.min((altitude - 800) / 400, 1);
    for (const nb of nebulaBlobs) {
      ctx.save();
      ctx.globalAlpha = nebAlpha;
      const gradient = ctx.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, nb.r);
      gradient.addColorStop(0, nb.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(nb.x - nb.r, nb.y - nb.r, nb.r * 2, nb.r * 2);
      ctx.restore();
    }
  }

  // Mid star layer
  if (starLayers && starAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = starAlpha;
    drawStarLayer(1);
    ctx.restore();
  }

  // Obstacles
  for (const obs of obstacles) {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    ctx.rotate(obs.rotation);
    drawSprite(obs.emoji, obs.size, 0, 0);
    ctx.restore();
  }

  // Stars (collectible)
  for (const s of stars) {
    const bob = Math.sin(s.bobPhase) * 3;
    // Glow
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(s.bobPhase * 2) * 0.1;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(s.x, s.y + bob, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawSprite('\u2B50', s.size, s.x, s.y + bob);
  }

  // Star clusters
  for (const cl of starClusters) {
    for (const item of cl.items) {
      if (!item.alive) continue;
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(item.x, item.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawSprite('\u{1F31F}', 26, item.x, item.y);
    }
  }

  // Fuel cans
  for (const f of fuelCans) {
    const bob = Math.sin(f.bobPhase) * 4;
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#00FF88';
    ctx.beginPath();
    ctx.arc(f.x, f.y + bob, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawSprite('\u{1F50B}', f.size, f.x, f.y + bob);
  }

  // Near star layer
  if (starLayers && starAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = starAlpha;
    drawStarLayer(2);
    ctx.restore();
  }

  // Rainbow trail
  if (rainbowTrail.length > 0) {
    const hueStep = 360 / rainbowTrail.length;
    for (let i = 0; i < rainbowTrail.length; i++) {
      const rt = rainbowTrail[i];
      ctx.save();
      ctx.globalAlpha = rt.life * 0.6;
      ctx.fillStyle = 'hsl(' + (i * hueStep) + ', 100%, 60%)';
      ctx.beginPath();
      ctx.arc(rt.x, rt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Rocket
  if (gameState !== 'gameover') {
    if (gameState !== 'crashing') {
      // Thrust flames
      drawThrustFlames();

      // Rocket emoji
      const visible = !invincible || Math.floor(invincibleTimer / 0.1) % 2 === 0;
      if (visible) {
        ctx.save();
        ctx.translate(rocketX, rocketY);
        ctx.rotate(rocketTilt);
        drawSprite('\u{1F680}', 60, 0, 0);
        ctx.restore();
      }

      // Invincibility aura
      if (invincible) {
        ctx.save();
        ctx.globalAlpha = 0.2 + Math.sin(gameTime * 6) * 0.1;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rocketX, rocketY, ROCKET_RADIUS + 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Crashing: tumbling rocket (fading)
      const crashAlpha = Math.max(0, countdownTimer / 2.0);
      if (crashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = crashAlpha;
        ctx.translate(rocketX, rocketY);
        const tumble = (2.0 - countdownTimer) * 15;
        ctx.rotate(tumble);
        drawSprite('\u{1F680}', 60, 0, 0);
        ctx.restore();
      }
    }
  }

  // Crash fragments
  for (const f of crashFragments) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rotation);
    if (f.type === 'emoji') {
      drawSprite(f.emoji, f.size, 0, 0);
    } else {
      ctx.fillStyle = f.color;
      ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size);
    }
    ctx.restore();
  }

  // Sparkles
  for (const s of sparkles) {
    ctx.save();
    ctx.globalAlpha = s.life / 0.4;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Floating texts
  for (const t of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.alpha);
    ctx.font = 'bold ' + Math.round(W * 0.03) + 'px "Fredoka One", cursive';
    ctx.textAlign = 'center';
    ctx.fillStyle = t.color || '#FFD700';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }

  // Milestone text
  if (milestoneTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(milestoneTimer, 1);
    ctx.font = 'bold ' + Math.round(W * 0.05) + 'px "Fredoka One", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 4;
    ctx.strokeText(milestoneText, W / 2, H * 0.3);
    ctx.fillText(milestoneText, W / 2, H * 0.3);
    if (milestoneEmoji) {
      const tw = ctx.measureText(milestoneText).width;
      const es = Math.round(W * 0.05);
      drawSprite(milestoneEmoji, es, W / 2 + tw / 2 + es * 0.7, H * 0.3);
    }
    ctx.restore();
  }

  // Vignette
  const vigGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.restore(); // shake

  // Countdown overlay (outside shake)
  if (gameState === 'countdown' || (gameState === 'playing' && launchTextTimer > 0)) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = Math.round(W * 0.15);
    ctx.font = 'bold ' + fontSize + 'px "Fredoka One", cursive';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 6;

    let text;
    let scale = 1;
    if (gameState === 'countdown' && countdownTimer > 0) {
      text = String(Math.ceil(countdownTimer));
      const frac = countdownTimer % 1.0;
      scale = 1 + Math.max(0, 0.5 - (1 - frac)) * 3;
    } else {
      text = 'LAUNCH!';
      scale = 1 + Math.max(0, launchTextTimer - 0.5) * 2;
    }

    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // Touch steering zone overlays
  if (hasTouchInput && (gameState === 'playing' || gameState === 'countdown')) {
    const zw = W * STEER_ZONE_W_FRAC;
    const zh = H;
    const zy = 0;
    const pad = 8;
    const rad = 14;
    const arrowSize = Math.min(zw, zh) * 0.28;

    // Left zone
    const lActive = touchSteering < 0;
    ctx.fillStyle = lActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.roundRect(pad, zy + pad, zw - pad * 2, zh - pad * 2, rad);
    ctx.fill();
    // Left arrow
    ctx.fillStyle = lActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)';
    const lcx = zw / 2, lcy = zy + zh / 2;
    ctx.beginPath();
    ctx.moveTo(lcx - arrowSize * 0.5, lcy);
    ctx.lineTo(lcx + arrowSize * 0.3, lcy - arrowSize * 0.45);
    ctx.lineTo(lcx + arrowSize * 0.3, lcy + arrowSize * 0.45);
    ctx.closePath();
    ctx.fill();

    // Center boost zone
    const czx = zw;
    const czw = W - zw * 2;
    const bActive = touchBoosting;
    ctx.fillStyle = bActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.roundRect(czx + pad, zy + pad, czw - pad * 2, zh - pad * 2, rad);
    ctx.fill();
    // Up arrow
    ctx.fillStyle = bActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)';
    const ccx = czx + czw / 2, ccy = zy + zh / 2;
    ctx.beginPath();
    ctx.moveTo(ccx, ccy - arrowSize * 0.5);
    ctx.lineTo(ccx + arrowSize * 0.45, ccy + arrowSize * 0.3);
    ctx.lineTo(ccx - arrowSize * 0.45, ccy + arrowSize * 0.3);
    ctx.closePath();
    ctx.fill();

    // Right zone
    const rActive = touchSteering > 0;
    ctx.fillStyle = rActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.roundRect(W - zw + pad, zy + pad, zw - pad * 2, zh - pad * 2, rad);
    ctx.fill();
    // Right arrow
    ctx.fillStyle = rActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)';
    const rcx = W - zw / 2, rcy = zy + zh / 2;
    ctx.beginPath();
    ctx.moveTo(rcx + arrowSize * 0.5, rcy);
    ctx.lineTo(rcx - arrowSize * 0.3, rcy - arrowSize * 0.45);
    ctx.lineTo(rcx - arrowSize * 0.3, rcy + arrowSize * 0.45);
    ctx.closePath();
    ctx.fill();
  }

  // HUD update
  if (gameState === 'playing' || gameState === 'crashing') {
    altitudeEl.textContent = altitude.toLocaleString() + 'km';
    if (!starsEl._countSpan) {
      starsEl.textContent = '';
      const img = createEmojiImg('⭐', 'emoji-img inline-emoji');
      starsEl.appendChild(img);
      const sp = document.createElement('span');
      starsEl.appendChild(sp);
      starsEl._countSpan = sp;
    }
    starsEl._countSpan.textContent = ' ' + starCount;
  }
}

function drawStarLayer(layerIdx) {
  const layer = starLayers[layerIdx];
  for (const s of layer.stars) {
    const twinkle = Math.sin(s.twinklePhase) * 0.2;
    ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, layer.alpha + twinkle) + ')';
    ctx.fillRect(s.x, s.y, layer.size, layer.size);
  }
}

function drawThrustFlames() {
  const isBoosting = keysDown.has('boost') || touchBoosting || autoBoostTimer > 0;
  const isBraking  = keysDown.has('brake');
  const isLeft     = keysDown.has('left') || touchSteering < 0;
  const isRight    = keysDown.has('right') || touchSteering > 0;

  ctx.save();
  ctx.translate(rocketX, rocketY);
  ctx.rotate(rocketTilt);

  // Main thruster
  if (isBoosting || invincible) {
    const flameLen = 22 + Math.random() * 14;
    const grad = ctx.createLinearGradient(0, 24, 0, 24 + flameLen);
    if (invincible) {
      const hue = (gameTime * 200) % 360;
      grad.addColorStop(0, 'hsla(' + hue + ', 100%, 70%, 0.9)');
      grad.addColorStop(0.5, 'hsla(' + ((hue + 60) % 360) + ', 100%, 50%, 0.6)');
      grad.addColorStop(1, 'hsla(' + ((hue + 120) % 360) + ', 100%, 40%, 0)');
    } else {
      grad.addColorStop(0, 'rgba(255, 200, 50, 0.9)');
      grad.addColorStop(0.4, 'rgba(255, 120, 20, 0.7)');
      grad.addColorStop(1, 'rgba(255, 50, 0, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-7, 24);
    ctx.quadraticCurveTo(-3, 24 + flameLen * 0.6, 0, 24 + flameLen);
    ctx.quadraticCurveTo(3, 24 + flameLen * 0.6, 7, 24);
    ctx.closePath();
    ctx.fill();
  } else {
    // Small idle flame
    const flameLen = 8 + Math.random() * 4;
    ctx.fillStyle = 'rgba(100, 180, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(-3, 24);
    ctx.quadraticCurveTo(0, 24 + flameLen, 3, 24);
    ctx.closePath();
    ctx.fill();
  }

  // Side thrusters for steering
  if (isRight) drawSideFlame(-16, 4, -1);
  if (isLeft)  drawSideFlame(16, 4, 1);

  // Brake thrusters
  if (isBraking) {
    drawBrakeFlame(-10, -12, -1);
    drawBrakeFlame(10, -12, 1);
  }

  ctx.restore();
}

function drawSideFlame(x, y, dir) {
  const len = 7 + Math.random() * 5;
  ctx.fillStyle = 'rgba(255, 150, 50, 0.65)';
  ctx.beginPath();
  ctx.moveTo(x, y - 2);
  ctx.quadraticCurveTo(x + dir * len, y, x, y + 2);
  ctx.closePath();
  ctx.fill();
}

function drawBrakeFlame(x, y, dir) {
  const len = 5 + Math.random() * 4;
  ctx.fillStyle = 'rgba(255, 80, 50, 0.5)';
  ctx.beginPath();
  ctx.moveTo(x - 2, y);
  ctx.quadraticCurveTo(x, y - len, x + 2, y);
  ctx.closePath();
  ctx.fill();
}

// ===== Color Helpers =====

function lerpColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ===== Game Loop =====

function gameLoop(timestamp) {
  if (!lastFrameTime) { lastFrameTime = timestamp; animFrame = requestAnimationFrame(gameLoop); return; }
  let dt = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  if (dt > 0.05) dt = 0.05;

  // Update background stars
  if (starLayers) {
    const dtNorm = dt * 60;
    for (const layer of starLayers) {
      for (const s of layer.stars) {
        s.y += layer.speed * scrollSpeed * dtNorm * 0.3;
        s.twinklePhase += s.twinkleSpeed * dt;
        if (s.y > H + 5) { s.y = -5; s.x = Math.random() * W; }
      }
    }
  }
  // Nebulae scroll
  if (nebulaBlobs) {
    const dtNorm = dt * 60;
    for (const nb of nebulaBlobs) {
      nb.y += nb.speedFactor * scrollSpeed * dtNorm * 0.2;
      if (nb.y > H + nb.r) { nb.y = -nb.r; nb.x = Math.random() * W; }
    }
  }

  if (gameState === 'ready') {
    // Idle bob
    // Anchor to landscape mid-layer hills
    const midBase = landscapeLayers ? landscapeLayers[1].yBase : H + 10;
    rocketY = midBase - 55 * (landscapeScale || 1) + Math.sin(gameTime * 2) * 3;
    gameTime += dt;
  }

  if (gameState === 'countdown') {
    updateCountdown(dt);
    gameTime += dt;
  }

  if (gameState === 'playing') {
    gameTime += dt;
    updateScroll(dt);
    updateRocket(dt);
    updateObstacles(dt);
    updateStars(dt);
    updateFuelCans(dt);
    updateStarClusters(dt);
    updateInvincibility(dt);
    checkCollisions();
    checkMilestones();
    updateSparkles(dt);
    updateFloatingTexts(dt);
    score = altitude + starCount * STAR_POINTS;
    if (nearMissCooldown > 0) nearMissCooldown -= dt;
    if (milestoneTimer > 0) milestoneTimer -= dt;

    // Scroll landscape + launch pad downward as rocket ascends
    if (landscapeLayers) {
      const dtNorm = dt * 60;
      for (const layer of landscapeLayers) {
        layer.yBase += scrollSpeed * dtNorm * (0.5 + layer.speed * 6);
      }
      launchPadY += scrollSpeed * dtNorm * (0.5 + 0.25 * 6);
    }
  }

  if (gameState === 'crashing') {
    countdownTimer -= dt;
    updateCrashFragments(dt);
    updateSparkles(dt);
    updateFloatingTexts(dt);
    rocketY += 1.5 * dt * 60; // falling
    if (shakeDuration > 0) shakeDuration -= dt;
    if (countdownTimer <= 0) {
      if (lives <= 0) {
        showGameOver();
      } else {
        // Respawn in place
        rocketX = W * 0.5;
        rocketY = H * 0.4;
        rocketVX = 0;
        rocketVY = 0;
        rocketTilt = 0;
        crashFragments = [];
        invincible = true;
        invincibleTimer = 3.0;
        gameState = 'playing';
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

  lives = 3;
  updateRocketLives();
  rocketX = W * 0.5 + 55;  // Under the crane hook
  rocketVX = 0;
  rocketVY = 0;
  rocketTilt = 0;
  cameraY = 0;
  scrollSpeed = BASE_SCROLL_SPEED * gameScale;
  altitude = 0;
  gameTime = 0;
  score = 0;
  starCount = 0;
  lastBoostState = false;
  nearMissCooldown = 0;
  autoBoostTimer = 0;

  createLandscape();

  // Anchor rocket + launch pad to actual landscape (mid-layer hill tops)
  const midBase = landscapeLayers[1].yBase;
  rocketY = midBase - 55 * landscapeScale;
  launchPadY = rocketY;

  obstacles = [];
  lastObstacleSpawn = 0;
  stars = [];
  lastStarSpawn = 0;
  fuelCans = [];
  lastFuelSpawn = 0;
  starClusters = [];
  lastClusterSpawn = 0;

  invincible = false;
  invincibleTimer = 0;
  rainbowTrail = [];

  sparkles = [];
  floatingTexts = [];
  crashFragments = [];
  shakeIntensity = 0;
  shakeDuration = 0;
  milestoneText = '';
  milestoneEmoji = '';
  milestoneTimer = 0;

  countdownTimer = 0;
  countdownPhase = 3;
  launchTextTimer = 0;

  milestonesReached = new Set();
  keysDown.clear();
  touchBoosting = false;

  hudEl.style.display = 'none';
  altitudeEl.textContent = '0km';
  starsEl.textContent = '';
  starsEl._countSpan = null;

  if (hintEl) hintEl.remove();
  hintEl = document.createElement('div');
  hintEl.className = 'rocket-hint';
  hintEl.innerHTML = 'Press any key to launch! <img src="' + getEmojiUrl('🚀') + '" class="emoji-img inline-emoji" alt="🚀">';
  gameEl.appendChild(hintEl);

  gameState = 'ready';
  bestScore = parseInt(localStorage.getItem(LS_BEST_KEY) || '0', 10);
  bestAltitude = parseInt(localStorage.getItem(LS_ALT_KEY) || '0', 10);
  lastFrameTime = null;
}

// ===== Cleanup =====

function cleanup() {
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = null;
  if (hintEl) { hintEl.remove(); hintEl = null; }
  gameState = 'gameover';
  obstacles = [];
  stars = [];
  fuelCans = [];
  starClusters = [];
  sparkles = [];
  floatingTexts = [];
  crashFragments = [];
  rainbowTrail = [];
  keysDown.clear();
  touchBoosting = false;

  if (keyUpHandler) {
    document.removeEventListener('keyup', keyUpHandler);
    keyUpHandler = null;
  }
  if (touchEndHandler) {
    document.removeEventListener('touchend', touchEndHandler);
    touchEndHandler = null;
  }
  if (touchMoveHandler) {
    document.removeEventListener('touchmove', touchMoveHandler);
    touchMoveHandler = null;
  }
  touchSteering = 0;
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }

  gameEl.style.display = 'none';
  celebrateEl.classList.remove('show');
  hudEl.style.display = 'none';
  if (livesEl) livesEl.classList.remove('active');
}

// ===== Exported Game Object =====

export const rocketRide = {
  id: 'rocket-ride',

  start() {
    gameEl.style.display = 'block';
    Object.keys(spriteCache).forEach(k => delete spriteCache[k]);
    initCanvas();
    createStarfield();
    createNebulae();
    // Register keyup handler (game-manager only dispatches keydown)
    keyUpHandler = (e) => {
      const action = keyToAction(e.key);
      if (action) keysDown.delete(action);
    };
    document.addEventListener('keyup', keyUpHandler);

    // Touch handlers for boost + steering
    touchEndHandler = () => { touchBoosting = false; touchSteering = 0; };
    document.addEventListener('touchend', touchEndHandler);
    touchMoveHandler = (e) => {
      if (!e.touches.length) return;
      applyAllTouches(e.touches);
    };
    document.addEventListener('touchmove', touchMoveHandler, { passive: true });

    resizeHandler = onResize;
    window.addEventListener('resize', resizeHandler);

    // Wait for emoji preload before starting game loop (prevents black screen)
    preloadEmojis(EMOJI_REGISTRY['rocket-ride']).then(() => {
      resetAndStart();
      animFrame = requestAnimationFrame(gameLoop);
    });
  },

  stop() {
    cleanup();
  },

  onKey(e) {
    // game-manager calls this on keydown
    const action = keyToAction(e.key);
    if (action) keysDown.add(action);

    if (gameState === 'ready') {
      startCountdown();
      return;
    }
    if (gameState === 'gameover') {
      if (e.key === ' ' || e.key === 'Enter') {
        resetAndStart();
        animFrame = requestAnimationFrame(gameLoop);
      }
    }
  },

  onMouse(e) {
    if (gameState === 'ready') {
      startCountdown();
      return;
    }
    if (gameState === 'gameover') {
      // Let button clicks propagate
      return;
    }
    if (gameState === 'playing' || gameState === 'countdown') {
      // Click = momentary boost
      keysDown.add('boost');
      setTimeout(() => keysDown.delete('boost'), 150);
    }
  },

  onTouch(e) {
    hasTouchInput = true;
    if (gameState === 'ready') {
      startCountdown();
      return;
    }
    if (gameState === 'gameover') return;
    if (gameState === 'playing' || gameState === 'countdown') {
      if (e.touches && e.touches.length) {
        applyAllTouches(e.touches);
      }
    }
  },
};
