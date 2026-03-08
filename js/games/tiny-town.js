import { initAudio, getAudioCtx } from '../audio.js';

// === CONSTANTS ===
const MAP_W = 6000, MAP_H = 4500;
const PLAYER_SIZE = 45, PLAYER_SPEED = 5;
const EMOJI_CURSOR = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><text y='28' font-size='28'>👆</text></svg>") 16 4, pointer`;
const AREA_RADIUS = 80, NODE_STOP = 6;
const CAM_LERP = 0.08, CAM_AHEAD = 60;
const DEST_ORDER = ['garden','pets','forest','pond','orchard','farm','airport','beach','bakery'];

const C = {
  grass: '#8FBF6F', grass2: '#7DB362',
  road: '#A0A0A0', sidewalk: '#C8C0B0', roadLine: '#C0C0C0',
  subRoad: '#B8B0A0', dirtPath: '#C4B099',
  sand: '#F4D799', ocean: '#4A90C4', oceanLight: '#7EC8E3', oceanDeep: '#2B6B9E',
  sky: '#87CEEB',
  farmSoil: '#D4B876', pasture: '#95C97E', meadow: '#A5D48E',
  forestDark: '#4A7A3E', hillGreen: '#7A9A6A',
  boardwalk: '#B8956A',
  runway: '#606060', terminal: '#C0C0C0',
};

// === AUDIO ===
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
function playChime() { synth('sine',880,0.3,1320,0.1); setTimeout(()=>synth('sine',1100,0.3,1320,0.08),120); }
function playChaChing() { synth('square',440,0.05,880,0.08); setTimeout(()=>synth('square',660,0.2,1000,0.1),60); }
function playChord() { synth('sine',523,0.4,523,0.08); synth('sine',659,0.4,659,0.06); synth('sine',784,0.4,784,0.05); }
function playSparkle() { [880,1100,1320,1760].forEach((f,i)=>setTimeout(()=>synth('sine',f,0.15,f*1.2,0.07),i*70)); }
function playBark() { synth('square',220,0.08,110,0.1); setTimeout(()=>synth('square',180,0.06,90,0.08),100); }
function playRustle() { synth('sawtooth',200,0.3,100,0.04); synth('sawtooth',250,0.25,120,0.03); }
function playSplash() { synth('triangle',300,0.4,80,0.08); setTimeout(()=>synth('sine',600,0.2,200,0.05),50); }
function playShake() { synth('sawtooth',150,0.25,200,0.06); setTimeout(()=>synth('sawtooth',180,0.2,150,0.05),80); }
function playMoo() { synth('sawtooth',120,0.5,90,0.12); setTimeout(()=>synth('sawtooth',100,0.4,80,0.1),200); }
function playJet() { synth('sawtooth',80,1.2,400,0.15); synth('sawtooth',100,1.0,300,0.1); }
function playWave() { synth('sine',200,0.6,60,0.08); setTimeout(()=>synth('sine',150,0.5,50,0.06),200); }
function playStep() { synth('triangle',300,0.05,200,0.04); }

const SOUND_MAP = {
  chime: playChime, chaChing: playChaChing, chord: playChord,
  sparkle: playSparkle, bark: playBark, rustle: playRustle,
  splash: playSplash, shake: playShake, moo: playMoo,
  jet: playJet, wave: playWave,
};

// === NODE/EDGE GRAPH ===
const nodeMap = {
  // City grid intersections: cCOL_ROW
  c00: { x:2000, y:2000 }, c10: { x:2600, y:2000 }, c20: { x:3200, y:2000 }, c30: { x:3800, y:2000 },
  c01: { x:2000, y:2400 }, c11: { x:2600, y:2400 }, c21: { x:3200, y:2400 }, c31: { x:3800, y:2400 },
  c02: { x:2000, y:2800 }, c12: { x:2600, y:2800 }, c22: { x:3200, y:2800 }, c32: { x:3800, y:2800 },
  // North suburbs
  s_nw:    { x:1100, y:1400 },
  s_n1:    { x:2000, y:1400 },
  s_n2:    { x:2600, y:1400 },
  s_n3:    { x:3200, y:1400 },
  s_ne:    { x:3800, y:1400 },
  // West/East suburbs
  s_w1:    { x:1100, y:2000 },
  s_w2:    { x:1100, y:2600 },
  s_e1:    { x:4600, y:2000 },
  s_e2:    { x:4600, y:2600 },
  // South suburbs
  s_sw:    { x:1100, y:3000 },
  s_s1:    { x:2000, y:3000 },
  s_s2:    { x:3200, y:3000 },
  s_se:    { x:4000, y:3000 },
  // Suburb destinations
  garden:  { x:700,  y:2000 },
  pets:    { x:1100, y:3200 },
  // Countryside junctions
  cnt_nw:  { x:900,  y:1100 },
  cnt_n1:  { x:1800, y:800  },
  cnt_n2:  { x:2600, y:700  },
  cnt_n3:  { x:3600, y:900  },
  cnt_ne:  { x:4800, y:1000 },
  cnt_w:   { x:400,  y:1700 },
  // Countryside destinations
  forest:  { x:700,  y:700  },
  pond:    { x:2000, y:1000 },
  orchard: { x:3800, y:600  },
  farm:    { x:4400, y:1100 },
  // Airport
  ap_entry:{ x:4800, y:1600 },
  airport: { x:5200, y:1600 },
  // Beach town
  bt_w:    { x:1100, y:3400 },
  bt_c:    { x:2400, y:3400 },
  bt_e:    { x:3800, y:3400 },
  beach:   { x:2400, y:3800 },
  // City destination
  bakery:  { x:2300, y:2100 },
  // Elbow nodes (orthogonal routing)
  elb_ne1: { x:4600, y:1400 },
  elb_ne2: { x:4800, y:1400 },
  elb_se:  { x:4000, y:2600 },
  elb_btc: { x:2400, y:3000 },
  elb_bte: { x:3800, y:3000 },
  elb_cnw: { x:900,  y:1400 },
  elb_cn1: { x:1800, y:1400 },
  elb_cn3: { x:3600, y:1400 },
  elb_cw:  { x:400,  y:2000 },
  elb_nw1: { x:1800, y:1100 },
  elb_n12: { x:2600, y:800  },
  elb_n23: { x:3600, y:700  },
  elb_n3e: { x:4800, y:900  },
  elb_nww: { x:400,  y:1100 },
  elb_for: { x:700,  y:1100 },
  elb_pond:{ x:2000, y:800  },
  elb_orch:{ x:3800, y:900  },
  elb_farm:{ x:4400, y:1000 },
  elb_bak: { x:2300, y:2000 },
};

const edges = [
  // City horizontal (c00→c10 routed through elb_bak, see bakery section)
  { a:'c10',b:'c20',type:'city' }, { a:'c20',b:'c30',type:'city' },
  { a:'c01',b:'c11',type:'city' }, { a:'c11',b:'c21',type:'city' }, { a:'c21',b:'c31',type:'city' },
  { a:'c02',b:'c12',type:'city' }, { a:'c12',b:'c22',type:'city' }, { a:'c22',b:'c32',type:'city' },
  // City vertical
  { a:'c00',b:'c01',type:'city' }, { a:'c01',b:'c02',type:'city' },
  { a:'c10',b:'c11',type:'city' }, { a:'c11',b:'c12',type:'city' },
  { a:'c20',b:'c21',type:'city' }, { a:'c21',b:'c22',type:'city' },
  { a:'c30',b:'c31',type:'city' }, { a:'c31',b:'c32',type:'city' },
  // City to north suburbs (vertical)
  { a:'c00',b:'s_n1',type:'suburban' }, { a:'c10',b:'s_n2',type:'suburban' },
  { a:'c20',b:'s_n3',type:'suburban' }, { a:'c30',b:'s_ne',type:'suburban' },
  // City to west/east (horizontal)
  { a:'c00',b:'s_w1',type:'suburban' },
  { a:'c30',b:'s_e1',type:'suburban' },
  // City to south (vertical)
  { a:'c02',b:'s_s1',type:'suburban' }, { a:'c22',b:'s_s2',type:'suburban' },
  // North suburb ring (horizontal, routed through countryside elbows)
  { a:'s_nw',b:'elb_cn1',type:'suburban' }, { a:'elb_cn1',b:'s_n1',type:'suburban' },
  { a:'s_n1',b:'s_n2',type:'suburban' },
  { a:'s_n2',b:'s_n3',type:'suburban' }, { a:'s_n3',b:'elb_cn3',type:'suburban' },
  { a:'elb_cn3',b:'s_ne',type:'suburban' },
  // West suburbs (vertical)
  { a:'s_nw',b:'s_w1',type:'suburban' }, { a:'s_w1',b:'s_w2',type:'suburban' },
  { a:'s_w2',b:'s_sw',type:'suburban' },
  // East suburbs via elbows
  { a:'s_ne',b:'elb_ne1',type:'suburban' }, { a:'elb_ne1',b:'s_e1',type:'suburban' },
  { a:'s_e1',b:'s_e2',type:'suburban' },
  { a:'s_e2',b:'elb_se',type:'suburban' }, { a:'elb_se',b:'s_se',type:'suburban' },
  // South suburb ring (horizontal, routed through beach elbows)
  { a:'s_sw',b:'s_s1',type:'suburban' },
  { a:'elb_btc',b:'s_s2',type:'suburban' },
  { a:'elb_bte',b:'s_se',type:'suburban' },
  // Suburb destination spurs
  { a:'s_w1',b:'garden',type:'suburban' },
  { a:'s_sw',b:'pets',type:'suburban' },
  // Suburb to countryside via elbows (elbows now shared with suburb ring)
  { a:'s_nw',b:'elb_cnw',type:'dirt' }, { a:'elb_cnw',b:'cnt_nw',type:'dirt' },
  { a:'elb_nw1',b:'elb_cn1',type:'dirt' },
  { a:'elb_cn3',b:'cnt_n3',type:'dirt' },
  { a:'elb_ne1',b:'elb_ne2',type:'suburban' },
  { a:'elb_ne2',b:'cnt_ne',type:'dirt' },
  { a:'garden',b:'elb_cw',type:'dirt' }, { a:'elb_cw',b:'cnt_w',type:'dirt' },
  // Countryside connections (chained through destination elbows to avoid direction collisions)
  { a:'cnt_nw',b:'elb_nw1',type:'dirt' }, { a:'elb_nw1',b:'cnt_n1',type:'dirt' },
  { a:'cnt_n1',b:'elb_pond',type:'dirt' }, { a:'elb_pond',b:'elb_n12',type:'dirt' },
  { a:'elb_n12',b:'cnt_n2',type:'dirt' }, { a:'elb_n12',b:'s_n2',type:'dirt' },
  { a:'cnt_n2',b:'elb_n23',type:'dirt' }, { a:'elb_n23',b:'cnt_n3',type:'dirt' },
  { a:'cnt_n3',b:'elb_orch',type:'dirt' }, { a:'elb_orch',b:'elb_n3e',type:'dirt' },
  { a:'elb_n3e',b:'cnt_ne',type:'dirt' },
  { a:'cnt_nw',b:'elb_for',type:'dirt' }, { a:'elb_for',b:'elb_nww',type:'dirt' },
  { a:'elb_nww',b:'cnt_w',type:'dirt' },
  // Countryside destinations
  { a:'elb_for',b:'forest',type:'dirt' },
  { a:'elb_pond',b:'pond',type:'dirt' },
  { a:'elb_orch',b:'orchard',type:'dirt' },
  { a:'cnt_ne',b:'elb_farm',type:'dirt' }, { a:'elb_farm',b:'farm',type:'dirt' },
  // Airport via elbow chain
  { a:'elb_ne2',b:'ap_entry',type:'airport' },
  { a:'ap_entry',b:'airport',type:'airport' },
  // South suburb to beach town via elbows
  { a:'pets',b:'bt_w',type:'suburban' },
  { a:'s_s1',b:'elb_btc',type:'suburban' }, { a:'elb_btc',b:'bt_c',type:'suburban' },
  { a:'s_s2',b:'elb_bte',type:'suburban' }, { a:'elb_bte',b:'bt_e',type:'suburban' },
  // Beach town
  { a:'bt_w',b:'bt_c',type:'boardwalk' }, { a:'bt_c',b:'bt_e',type:'boardwalk' },
  { a:'bt_c',b:'beach',type:'boardwalk' },
  // City destination via elbow (also chains c00→c10 through elb_bak)
  { a:'c00',b:'elb_bak',type:'city' }, { a:'elb_bak',b:'c10',type:'city' },
  { a:'elb_bak',b:'bakery',type:'city' },
];

// Build adjacency
const adjacency = {};
for (const id of Object.keys(nodeMap)) adjacency[id] = [];
for (const e of edges) {
  adjacency[e.a].push({ node: e.b, edge: e });
  adjacency[e.b].push({ node: e.a, edge: e });
}
function getNodeEdges(nodeId) { return adjacency[nodeId].map(x => x.edge); }
function getOtherNode(nodeId, edge) { return edge.a === nodeId ? edge.b : edge.a; }

// BFS pathfinding
function bfsPath(start, end) {
  if (start === end) return [];
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const cur = path[path.length - 1];
    for (const nb of adjacency[cur]) {
      const n = nb.node;
      if (!visited.has(n)) {
        const np = [...path, n];
        if (n === end) return np.slice(1);
        visited.add(n);
        queue.push(np);
      }
    }
  }
  return [];
}

function nearestNode(wx, wy) {
  let best = null, bestD = Infinity;
  for (const [id, n] of Object.entries(nodeMap)) {
    const d = Math.hypot(n.x - wx, n.y - wy);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}

// === DESTINATIONS ===
const DESTINATIONS = {
  garden:  { emoji:'🌷',  label:'Garden',  reward:'🌹', sound:'sparkle' },
  pets:    { emoji:'🐾',  label:'Pets',    reward:'🐕', sound:'bark' },
  forest:  { emoji:'🌲',  label:'Forest',  reward:'🍄', sound:'rustle' },
  pond:    { emoji:'🐸',  label:'Pond',    reward:'🐟', sound:'splash' },
  orchard: { emoji:'🌳',  label:'Orchard', reward:'🍎', sound:'shake' },
  farm:    { emoji:'🐄',  label:'Farm',    reward:'🥚', sound:'moo' },
  airport: { emoji:'✈️', label:'Airport', reward:'🎫', sound:'jet' },
  beach:   { emoji:'🏖️', label:'Beach',   reward:'🐚', sound:'wave' },
  bakery:  { emoji:'🧁',  label:'Bakery',  reward:'🎂', sound:'chime' },
};

// === STATE ===
let canvas, gameEl, W, H;
let cx = 0, cy = 0;
let running = false, animFrame = null;
let selectingChar = false;
let player = { x:2600, y:2400, node:'c11', sourceNode:null, targetNode:null, path:[], moving:false, keyDriven:false, dir:0, bobT:0, emoji:'🧒' };
let keysDown = {};
let collected = {};
let destAnimations = [];
let collectAnimations = [];
let buildings = [], houses = [], scenery = [];
let streetDetails = [];
let oceanAnims = { boats:[], surfer:null, ship:null, dolphin:null, whale:null };
let airportAnims = { planes:[], takeoffTimer:0 };
let npcs = [];
let frameCount = 0;
let stepTimer = 0;
let pendingTimeouts = [];
let showIntro = false;
let introTimer = 0;

// === SPRITE CACHE ===
const spriteCache = {};
function getSprite(emoji, size) {
  size = Math.round(size);
  const key = emoji + '|' + size;
  if (spriteCache[key]) return spriteCache[key];
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(size * 1.4);
  const x = c.getContext('2d');
  x.font = size + 'px sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(emoji, c.width/2, c.height/2);
  spriteCache[key] = c;
  return c;
}
function drawSprite(c, emoji, x, y, size) {
  const s = getSprite(emoji, size);
  c.drawImage(s, x - s.width/2, y - s.height/2);
}
function drawSpriteFlipped(c, emoji, x, y, size) {
  c.save(); c.scale(-1,1);
  drawSprite(c, emoji, -x, y, size);
  c.restore();
}

// === WORLD GENERATION ===
const BLDG_EMOJIS = ['🏢','🏬','🏪','🏨','🏦','🏥','🏫','🏛️','⛪','🏣','🏤','🏰'];
const HOUSE_EMOJIS = ['🏠','🏡','🏘️'];

function generateBuildings() {
  buildings = [];
  const roadW = 55, sidW = 10;
  const xRoads = [2000, 2600, 3200, 3800];
  const yRoads = [2000, 2400, 2800];
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 2; row++) {
      const bx1 = xRoads[col] + roadW/2 + sidW + 6;
      const bx2 = xRoads[col+1] - roadW/2 - sidW - 6;
      const by1 = yRoads[row] + roadW/2 + sidW + 6;
      const by2 = yRoads[row+1] - roadW/2 - sidW - 6;
      const blockW = bx2 - bx1;
      if (blockW < 40) continue;
      // 2 rows of buildings: top row and bottom row
      const rowYs = [by1 + 55, by2 - 55];
      for (const ry of rowYs) {
        const count = Math.floor(blockW / 80);
        const spacing = blockW / count;
        for (let i = 0; i < count; i++) {
          const size = 58 + Math.floor(Math.random() * 34);
          const ex = bx1 + spacing * i + spacing / 2;
          const emoji = BLDG_EMOJIS[Math.floor(Math.random() * BLDG_EMOJIS.length)];
          buildings.push({ x: ex, y: ry, emoji, size });
        }
      }
    }
  }
}

function generateStreetDetails() {
  streetDetails = [];
  const rng = (a, b) => a + Math.random() * (b - a);
  const vRoads = [2000, 2600, 3200, 3800];
  const hRoads = [2000, 2400, 2800];
  const yStart = 1800, yEnd = 2800;
  const xStart = 1800, xEnd = 4200;
  // Street signs at select intersections
  for (let i = 0; i < vRoads.length; i += 2) {
    for (let j = 0; j < hRoads.length; j += 2) {
      streetDetails.push({ x: vRoads[i] - 32, y: hRoads[j] - 34, emoji: '🪧', size: 18 });
    }
  }
  // Traffic lights at intersections
  for (const vx of vRoads) {
    for (const hy of hRoads) {
      streetDetails.push({ x: vx + 28, y: hy - 28, emoji: '🚦', size: 26 });
    }
  }
  // Parked cars along vertical city roads
  for (const rx of vRoads) {
    for (let y = yStart + 60; y < yEnd; y += 120 + rng(0,60)) {
      streetDetails.push({ x: rx + 40, y, emoji: ['🚗','🚙','🚕'][Math.floor(rng(0,3))], size: 22 });
    }
  }
  // Parked cars along horizontal city roads
  for (const ry of hRoads) {
    for (let x = xStart + 80; x < xEnd; x += 130 + rng(0,70)) {
      streetDetails.push({ x, y: ry + 40, emoji: ['🚗','🚙','🚕'][Math.floor(rng(0,3))], size: 22 });
    }
  }
  // Benches
  for (let i = 0; i < 18; i++) {
    const rx = vRoads[Math.floor(rng(0,4))];
    const y = rng(yStart + 40, yEnd - 40);
    streetDetails.push({ x: rx + 38, y, emoji: '🪑', size: 18 });
  }
  // Trash cans
  for (let i = 0; i < 12; i++) {
    const ry = hRoads[Math.floor(rng(0,3))];
    const x = rng(xStart + 60, xEnd - 60);
    streetDetails.push({ x, y: ry + 38, emoji: '🗑️', size: 16 });
  }
  // Street trees along city roads
  for (const rx of vRoads) {
    for (let y = yStart + 50; y < yEnd; y += 160 + rng(0,80)) {
      streetDetails.push({ x: rx - 40, y, emoji: '🌳', size: 35 });
    }
  }
  // Suburb fences along some edges
  for (const e of edges) {
    if (e.type !== 'suburban') continue;
    if (Math.random() > 0.3) continue;
    const na = nodeMap[e.a], nb = nodeMap[e.b];
    const dist = Math.hypot(nb.x-na.x, nb.y-na.y);
    const steps = Math.floor(dist / 100);
    for (let i = 1; i < steps; i++) {
      const t2 = i / steps;
      const x = na.x + (nb.x-na.x)*t2 + rng(-20,20);
      const y = na.y + (nb.y-na.y)*t2 + rng(-20,20);
      streetDetails.push({ x, y, emoji: '🌿', size: 14 });
    }
  }
}

function generateHouses() {
  houses = [];
  const rng = (a,b) => a + Math.random()*(b-a);
  const subEdges = edges.filter(e => e.type === 'suburban');
  for (const e of subEdges) {
    const na = nodeMap[e.a], nb = nodeMap[e.b];
    const dist = Math.hypot(nb.x-na.x, nb.y-na.y);
    if (dist < 80) continue;
    const steps = Math.floor(dist / 90);
    const perpX = -(nb.y-na.y)/dist, perpY = (nb.x-na.x)/dist;
    for (let i = 1; i < steps; i++) {
      const t2 = i / steps;
      const bx = na.x + (nb.x-na.x)*t2;
      const by = na.y + (nb.y-na.y)*t2;
      const side = Math.random() < 0.5 ? 1 : -1;
      const off = 55 + rng(0,20);
      const hx = bx + perpX*side*off + rng(-5,5);
      const hy = by + perpY*side*off + rng(-5,5);
      if (hx > 1900 && hx < 3900 && hy > 1900 && hy < 2900) continue;
      if (hy > 3800) continue;
      const emoji = HOUSE_EMOJIS[Math.floor(rng(0,3))];
      const size = 50 + Math.floor(rng(0,22));
      const yard = [];
      if (Math.random() < 0.6) {
        const yardEmojis = ['🌷','🌻','🚗','🐕','🌳','🧸'];
        yard.push({ dx: rng(-24,24), dy: rng(-20,20), emoji: yardEmojis[Math.floor(rng(0,6))], size: 18 });
      }
      houses.push({ x: hx, y: hy, emoji, size, yard });
    }
  }
}

function generateCountryside() {
  scenery = [];
  const rng = (a,b) => a + Math.random()*(b-a);
  const phase = () => rng(0, Math.PI*2);

  // === FOREST (700, 700) — Dense trees ===
  for (let i = 0; i < 90; i++) {
    const x = rng(200, 1400), y = rng(200, 1200);
    const emoji = Math.random() < 0.6 ? '🌲' : '🌳';
    scenery.push({ x, y, emoji, size: 42+rng(0,28), layer:'forest' });
  }
  // Forest floor: mushrooms, ferns, logs
  for (let i = 0; i < 20; i++) {
    scenery.push({ x:rng(300,1200), y:rng(300,1100), emoji:'🍄', size:18+rng(0,12), layer:'sway', wobble:phase() });
  }
  for (let i = 0; i < 12; i++) {
    scenery.push({ x:rng(300,1200), y:rng(300,1100), emoji:'🌿', size:16+rng(0,10), layer:'sway', wobble:phase() });
  }
  for (let i = 0; i < 6; i++) {
    scenery.push({ x:rng(300,1200), y:rng(400,1000), emoji:'🪵', size:20+rng(0,8), layer:'forest' });
  }
  // Forest critters
  for (let i = 0; i < 5; i++) {
    scenery.push({ x:rng(400,1100), y:rng(400,1000), emoji:'🐿️', size:18+rng(0,8), layer:'sway', wobble:phase() });
  }
  for (let i = 0; i < 4; i++) {
    scenery.push({ x:rng(400,1100), y:rng(400,1000), emoji:'🦔', size:16+rng(0,6), layer:'sway', wobble:phase() });
  }

  // === GARDEN (700, 2000) — Lush flower garden ===
  const gardenEmojis = ['🌷','🌹','🌻','🌺','🌸','🪻','🌼','💐'];
  for (let i = 0; i < 50; i++) {
    const x = rng(350, 1050), y = rng(1750, 2250);
    const emoji = gardenEmojis[Math.floor(rng(0, gardenEmojis.length))];
    scenery.push({ x, y, emoji, size:20+rng(0,16), layer:'sway', wobble:phase() });
  }
  // Garden hedges and pots
  for (let i = 0; i < 10; i++) {
    scenery.push({ x:rng(400,1000), y:rng(1800,2200), emoji:'🪴', size:24+rng(0,12), layer:'sway', wobble:phase() });
  }
  for (let i = 0; i < 6; i++) {
    scenery.push({ x:rng(400,1000), y:rng(1800,2200), emoji:'🌳', size:36+rng(0,14), layer:'garden' });
  }
  // Garden butterflies
  for (let i = 0; i < 6; i++) {
    scenery.push({ x:rng(400,1000), y:rng(1800,2200), emoji:'🦋', size:16+rng(0,8), layer:'butterfly', wobble:phase() });
  }
  // Garden bees
  for (let i = 0; i < 5; i++) {
    scenery.push({ x:rng(450,950), y:rng(1850,2150), emoji:'🐝', size:14+rng(0,6), layer:'butterfly', wobble:phase() });
  }

  // === PETS (1100, 3200) — Pet park ===
  const petEmojis = ['🐕','🐈','🐩','🐾','🦴','🎾'];
  for (let i = 0; i < 25; i++) {
    const x = rng(800, 1400), y = rng(3000, 3400);
    const emoji = petEmojis[Math.floor(rng(0, petEmojis.length))];
    scenery.push({ x, y, emoji, size:18+rng(0,14), layer:'sway', wobble:phase() });
  }
  // Pet park trees and bushes
  for (let i = 0; i < 8; i++) {
    scenery.push({ x:rng(800,1400), y:rng(3050,3350), emoji:'🌳', size:34+rng(0,14), layer:'pets' });
  }
  // Pet park birds
  for (let i = 0; i < 6; i++) {
    scenery.push({ x:rng(850,1350), y:rng(3050,3300), emoji:'🐦', size:14+rng(0,8), layer:'butterfly', wobble:phase() });
  }
  // Paw print trail
  for (let i = 0; i < 10; i++) {
    scenery.push({ x:rng(850,1350), y:rng(3050,3350), emoji:'🐾', size:12+rng(0,6), layer:'pets' });
  }

  // === POND (2000, 1000) — Rich pond ecosystem ===
  // Water plants
  for (let i = 0; i < 15; i++) {
    scenery.push({ x:rng(1750,2250), y:rng(850,1150), emoji:'🪷', size:18+rng(0,12), layer:'bob', wobble:phase() });
  }
  for (let i = 0; i < 10; i++) {
    scenery.push({ x:rng(1700,2300), y:rng(800,1200), emoji:'🌿', size:16+rng(0,10), layer:'sway', wobble:phase() });
  }
  // Pond creatures
  for (let i = 0; i < 5; i++) {
    scenery.push({ x:rng(1800,2200), y:rng(900,1100), emoji:'🐸', size:18+rng(0,8), layer:'bob', wobble:phase() });
  }
  for (let i = 0; i < 4; i++) {
    scenery.push({ x:rng(1800,2200), y:rng(900,1100), emoji:'🦆', size:20+rng(0,8), layer:'bob', wobble:phase() });
  }
  for (let i = 0; i < 3; i++) {
    scenery.push({ x:rng(1850,2150), y:rng(920,1080), emoji:'🐢', size:16+rng(0,8), layer:'bob', wobble:phase() });
  }
  for (let i = 0; i < 4; i++) {
    scenery.push({ x:rng(1850,2150), y:rng(920,1080), emoji:'🐟', size:14+rng(0,6), layer:'bob', wobble:phase() });
  }
  // Pond dragonflies
  for (let i = 0; i < 5; i++) {
    scenery.push({ x:rng(1800,2200), y:rng(850,1100), emoji:'🪰', size:12+rng(0,6), layer:'butterfly', wobble:phase() });
  }
  // Reeds and cattails around edge
  for (let i = 0; i < 12; i++) {
    const angle = rng(0, Math.PI*2);
    const r = rng(180, 280);
    scenery.push({ x:2000+Math.cos(angle)*r, y:1000+Math.sin(angle)*r, emoji:'🌾', size:22+rng(0,10), layer:'sway', wobble:phase() });
  }

  // === ORCHARD (3800, 600) — Expanded orchard with fruit ===
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      scenery.push({ x: 3450+col*80, y: 380+row*80, emoji:'🌳', size:44+rng(0,10), layer:'orchard' });
    }
  }
  // Fallen fruit and baskets
  const fruitEmojis = ['🍎','🍐','🍊','🍋'];
  for (let i = 0; i < 20; i++) {
    scenery.push({ x:rng(3450,4010), y:rng(380,780), emoji:fruitEmojis[Math.floor(rng(0,4))], size:14+rng(0,8), layer:'sway', wobble:phase() });
  }
  for (let i = 0; i < 4; i++) {
    scenery.push({ x:rng(3500,3950), y:rng(450,700), emoji:'🧺', size:20+rng(0,8), layer:'orchard' });
  }
  // Orchard bees
  for (let i = 0; i < 6; i++) {
    scenery.push({ x:rng(3500,3950), y:rng(400,750), emoji:'🐝', size:12+rng(0,6), layer:'butterfly', wobble:phase() });
  }
  // Orchard birds
  for (let i = 0; i < 4; i++) {
    scenery.push({ x:rng(3500,3950), y:rng(400,700), emoji:'🐦', size:14+rng(0,6), layer:'butterfly', wobble:phase() });
  }

  // === FARM (4400, 1100) — Bustling farm ===
  // Crops
  for (let i = 0; i < 25; i++) {
    scenery.push({ x:4100+rng(0,600), y:900+rng(0,400), emoji:'🌾', size:28+rng(0,10), layer:'sway', wobble:phase() });
  }
  // Farm animals
  for (let i = 0; i < 5; i++) {
    scenery.push({ x:rng(4150,4650), y:rng(950,1300), emoji:'🐄', size:30+rng(0,10), layer:'sway', wobble:phase() });
  }
  for (let i = 0; i < 6; i++) {
    scenery.push({ x:rng(4150,4650), y:rng(950,1300), emoji:'🐔', size:20+rng(0,8), layer:'sway', wobble:phase() });
  }
  for (let i = 0; i < 3; i++) {
    scenery.push({ x:rng(4200,4600), y:rng(1000,1250), emoji:'🐖', size:24+rng(0,8), layer:'sway', wobble:phase() });
  }
  for (let i = 0; i < 4; i++) {
    scenery.push({ x:rng(4200,4600), y:rng(1000,1250), emoji:'🐑', size:22+rng(0,8), layer:'sway', wobble:phase() });
  }
  // Farm structures
  scenery.push({ x:4300, y:1050, emoji:'🚜', size:40, layer:'farm' });
  scenery.push({ x:4550, y:950, emoji:'🏚️', size:44, layer:'farm' });
  for (let x2 = 4100; x2 < 4700; x2 += 50) {
    scenery.push({ x:x2, y:880, emoji:'🪵', size:16+rng(0,4), layer:'farm' });
  }
  // Hay bales
  for (let i = 0; i < 5; i++) {
    scenery.push({ x:rng(4150,4650), y:rng(950,1250), emoji:'🌾', size:36+rng(0,8), layer:'farm' });
  }

  // === AIRPORT (5200, 1600) — Airport surroundings ===
  for (let i = 0; i < 8; i++) {
    scenery.push({ x:rng(4900,5500), y:rng(1400,1800), emoji:'🧳', size:18+rng(0,10), layer:'sway', wobble:phase() });
  }
  for (let i = 0; i < 6; i++) {
    scenery.push({ x:rng(4900,5400), y:rng(1400,1750), emoji:'🏢', size:36+rng(0,14), layer:'airport_s' });
  }
  for (let i = 0; i < 4; i++) {
    scenery.push({ x:rng(4950,5450), y:rng(1450,1750), emoji:'🚐', size:24+rng(0,8), layer:'airport_s' });
  }
  // Wind socks and flags
  for (let i = 0; i < 5; i++) {
    scenery.push({ x:rng(4950,5450), y:rng(1400,1800), emoji:'🪁', size:16+rng(0,8), layer:'butterfly', wobble:phase() });
  }

  // === BEACH (2400, 3800) — Beach decorations ===
  const beachEmojis = ['🐚','🦀','⭐','🪸','🐙'];
  for (let i = 0; i < 25; i++) {
    const x = rng(1800, 3000), y = rng(3600, 4000);
    scenery.push({ x, y, emoji:beachEmojis[Math.floor(rng(0,5))], size:16+rng(0,10), layer:'sway', wobble:phase() });
  }
  // Sand castles
  for (let i = 0; i < 4; i++) {
    scenery.push({ x:rng(1900,2900), y:rng(3650,3950), emoji:'🏖️', size:28+rng(0,12), layer:'beach_s' });
  }
  // Beach umbrellas
  for (let i = 0; i < 5; i++) {
    scenery.push({ x:rng(1800,3000), y:rng(3650,3950), emoji:'⛱️', size:30+rng(0,10), layer:'beach_s' });
  }
  // Seagulls
  for (let i = 0; i < 6; i++) {
    scenery.push({ x:rng(1800,3000), y:rng(3600,3950), emoji:'🕊️', size:16+rng(0,8), layer:'butterfly', wobble:phase() });
  }

  // === BAKERY (2300, 2100) — Bakery surroundings ===
  // Place items between roads (city roads at x=2000,2600 and y=2000,2400)
  const bakeryEmojis = ['🧁','🍞','🥐','🍪','🎂','🍰'];
  for (let i = 0; i < 15; i++) {
    const x = rng(2100, 2500), y = rng(2060, 2340);
    scenery.push({ x, y, emoji:bakeryEmojis[Math.floor(rng(0,6))], size:16+rng(0,10), layer:'sway', wobble:phase() });
  }
  // Cafe tables and chairs
  for (let i = 0; i < 4; i++) {
    scenery.push({ x:rng(2150,2450), y:rng(2080,2320), emoji:'☕', size:18+rng(0,8), layer:'sway', wobble:phase() });
  }
  // Potted plants outside bakery
  for (let i = 0; i < 5; i++) {
    scenery.push({ x:rng(2150,2450), y:rng(2080,2320), emoji:'🪴', size:20+rng(0,8), layer:'sway', wobble:phase() });
  }
  // Bakery aroma swirls (floating)
  for (let i = 0; i < 4; i++) {
    scenery.push({ x:rng(2200,2400), y:rng(2080,2300), emoji:'💨', size:12+rng(0,6), layer:'butterfly', wobble:phase() });
  }

  // === GENERAL COUNTRYSIDE ===
  // Meadow flowers
  for (let i = 0; i < 35; i++) {
    const x = rng(1500, 3500), y = rng(700, 1300);
    const emoji = ['🌸','🌼','🌺','🌻'][Math.floor(rng(0,4))];
    scenery.push({ x, y, emoji, size:20+rng(0,12), layer:'sway', wobble:phase() });
  }
  // Rocks
  for (let i = 0; i < 15; i++) {
    scenery.push({ x:rng(300,5500), y:rng(500,1300), emoji:'🪨', size:22+rng(0,14), layer:'rock' });
  }
  // Butterflies (animated)
  for (let i = 0; i < 8; i++) {
    scenery.push({ x:rng(600,3000), y:rng(600,1400), emoji:'🦋', size:18+rng(0,10), layer:'butterfly', wobble: phase() });
  }
}

function generateNPCs() {
  npcs = [];
  const citySpots = [
    { x:2300, y:2050, e:'🚶'    },
    { x:3100, y:2350, e:'🚶‍♀️' },
    { x:2800, y:2750, e:'🧑‍💼' },
    { x:3500, y:2100, e:'🧑'    },
  ];
  for (const s of citySpots) {
    npcs.push({ x:s.x, y:s.y, emoji:s.e, bobT:Math.random()*Math.PI*2, speed:0.05+Math.random()*0.04 });
  }
  const subSpots = [
    { x:1300, y:1600, e:'🧑‍🌾' },
    { x:1200, y:2700, e:'👧'    },
  ];
  for (const s of subSpots) {
    npcs.push({ x:s.x, y:s.y, emoji:s.e, bobT:Math.random()*Math.PI*2, speed:0.04+Math.random()*0.03 });
  }
}

function initOceanAnims() {
  oceanAnims.boats = [];
  for (let i = 0; i < 3; i++) {
    oceanAnims.boats.push({
      x: 400 + i*1400, y: 3950 + i*60,
      speed: 0.18 + Math.random()*0.12,
      dir: Math.random() < 0.5 ? 1 : -1,
      bobT: Math.random()*Math.PI*2,
    });
  }
  oceanAnims.surfer   = { x:1800, y:3820, t:0, dir:1 };
  oceanAnims.ship     = { x:5500, y:4100, speed:-0.08 };
  oceanAnims.dolphin  = { x:3000, y:4000, t:0 };
  oceanAnims.whale    = { x:4500, y:4200, t:0 };
  oceanAnims.rowboat  = { x:2200, y:3920, t:0, dir:1 };
}

function initAirportAnims() {
  airportAnims.planes = [
    { x:5000, y:1400, size:44, state:'parked' },
    { x:5200, y:1450, size:40, state:'parked' },
    { x:4900, y:1540, size:48, state:'runway' },
  ];
  airportAnims.takeoffTimer = 0;
  airportAnims.activeAnim   = null;
}

// === CAMERA ===
function updateCamera() {
  let tx = player.x - W/2, ty = player.y - H/2;
  if (player.moving && player.targetNode) {
    const target = nodeMap[player.targetNode];
    if (target) {
      const dx = target.x - player.x, dy = target.y - player.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d > 0) { tx += (dx/d)*CAM_AHEAD; ty += (dy/d)*CAM_AHEAD; }
    }
  }
  tx = Math.max(0, Math.min(MAP_W - W, tx));
  ty = Math.max(0, Math.min(MAP_H - H, ty));
  if (isNaN(tx)) tx = 0;
  if (isNaN(ty)) ty = 0;
  cx += (tx - cx) * CAM_LERP;
  cy += (ty - cy) * CAM_LERP;
}

// === RENDERING ===
function drawSky(c) {
  // Sky removed — mountains sit directly on meadow background
}

function drawMountains(c) {
  // --- Back layer: large distant snow-capped peaks ---
  const backPeaks = [
    { x:-60,  y:220, size:260, emoji:'🏔️' },
    { x:350,  y:180, size:300, emoji:'🏔️' },
    { x:800,  y:210, size:270, emoji:'🏔️' },
    { x:1250, y:170, size:310, emoji:'🏔️' },
    { x:1700, y:200, size:280, emoji:'🏔️' },
    { x:2100, y:230, size:250, emoji:'🏔️' },
    { x:2550, y:175, size:300, emoji:'🏔️' },
    { x:3000, y:195, size:290, emoji:'🏔️' },
    { x:3450, y:220, size:260, emoji:'🏔️' },
    { x:3850, y:180, size:305, emoji:'🏔️' },
    { x:4300, y:210, size:275, emoji:'🏔️' },
    { x:4750, y:190, size:295, emoji:'🏔️' },
    { x:5200, y:225, size:265, emoji:'🏔️' },
    { x:5650, y:200, size:280, emoji:'🏔️' },
  ];
  // Distant haze
  c.globalAlpha = 0.5;
  for (const p of backPeaks) drawSprite(c, p.emoji, p.x, p.y, p.size);
  c.globalAlpha = 1.0;

  // --- Mid layer: medium mountains ---
  const midPeaks = [
    { x:100,  y:380, size:220, emoji:'🏔️' },
    { x:550,  y:350, size:240, emoji:'🏔️' },
    { x:1050, y:370, size:230, emoji:'🏔️' },
    { x:1500, y:340, size:250, emoji:'🏔️' },
    { x:1950, y:380, size:220, emoji:'🏔️' },
    { x:2400, y:350, size:240, emoji:'🏔️' },
    { x:2850, y:330, size:260, emoji:'🏔️' },
    { x:3300, y:370, size:225, emoji:'🌋'  },
    { x:3700, y:345, size:250, emoji:'🏔️' },
    { x:4150, y:365, size:235, emoji:'🏔️' },
    { x:4600, y:340, size:255, emoji:'🏔️' },
    { x:5050, y:375, size:225, emoji:'🏔️' },
    { x:5500, y:355, size:240, emoji:'🏔️' },
    { x:5900, y:380, size:220, emoji:'🏔️' },
  ];
  c.globalAlpha = 0.75;
  for (const p of midPeaks) drawSprite(c, p.emoji, p.x, p.y, p.size);
  c.globalAlpha = 1.0;

  // --- Front layer: prominent foreground peaks ---
  const frontPeaks = [
    { x:200,  y:480, size:200, emoji:'🏔️' },
    { x:700,  y:460, size:220, emoji:'🏔️' },
    { x:1200, y:475, size:210, emoji:'🏔️' },
    { x:1650, y:450, size:230, emoji:'🏔️' },
    { x:2100, y:470, size:215, emoji:'🏔️' },
    { x:2600, y:445, size:235, emoji:'🏔️' },
    { x:3100, y:465, size:220, emoji:'🏔️' },
    { x:3550, y:455, size:225, emoji:'🏔️' },
    { x:4000, y:480, size:200, emoji:'🏔️' },
    { x:4500, y:450, size:230, emoji:'🏔️' },
    { x:4950, y:470, size:215, emoji:'🏔️' },
    { x:5400, y:460, size:220, emoji:'🏔️' },
    { x:5850, y:475, size:210, emoji:'🏔️' },
  ];
  for (const p of frontPeaks) drawSprite(c, p.emoji, p.x, p.y, p.size);

  // --- Foothills: small rocky hills along the base ---
  const foothills = [
    {x:80,y:590,s:100},{x:380,y:600,s:85},{x:650,y:595,s:95},
    {x:950,y:605,s:80},{x:1200,y:590,s:100},{x:1500,y:600,s:88},
    {x:1800,y:595,s:92},{x:2100,y:605,s:82},{x:2400,y:590,s:98},
    {x:2700,y:600,s:86},{x:3000,y:595,s:94},{x:3300,y:605,s:80},
    {x:3600,y:590,s:100},{x:3900,y:600,s:88},{x:4200,y:595,s:92},
    {x:4500,y:605,s:82},{x:4800,y:590,s:96},{x:5100,y:600,s:85},
    {x:5400,y:595,s:90},{x:5700,y:605,s:80},
  ];
  for (const f of foothills) drawSprite(c, '⛰️', f.x, f.y, f.s);

  // --- Soft fog transition into meadow ---
  const fog = c.createLinearGradient(0, 520, 0, 650);
  fog.addColorStop(0, 'rgba(255,255,255,0)');
  fog.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  fog.addColorStop(1, 'rgba(165,212,142,0.6)');
  c.fillStyle = fog;
  c.fillRect(0, 520, MAP_W, 130);
}

function drawTerrain(c) {
  // Ocean
  const og = c.createLinearGradient(0, 3800, 0, 4500);
  og.addColorStop(0, C.oceanLight); og.addColorStop(0.4, C.ocean); og.addColorStop(1, C.oceanDeep);
  c.fillStyle = og; c.fillRect(0, 3800, MAP_W, 700);
  // Beach sand
  const sg = c.createLinearGradient(0, 3600, 0, 3820);
  sg.addColorStop(0, '#E8CB80'); sg.addColorStop(1, C.sand);
  c.fillStyle = sg; c.fillRect(0, 3600, MAP_W, 220);
  // Beach town ground
  c.fillStyle = '#D0C8B0'; c.fillRect(0, 3200, MAP_W, 400);
  // South suburbs
  c.fillStyle = C.grass; c.fillRect(0, 2800, MAP_W, 400);
  // City paved
  c.fillStyle = '#B8B0A0'; c.fillRect(1940, 1940, 1920, 920);
  // West/East suburbs
  c.fillStyle = C.grass;
  c.fillRect(0, 1800, 1800, 1000);
  c.fillRect(4200, 1800, 1800, 1000);
  // Industrial zone (east of city)
  c.fillStyle = '#A09888'; c.fillRect(4300, 1900, 600, 700);
  // North suburbs
  c.fillStyle = C.grass; c.fillRect(0, 1400, MAP_W, 400);
  // Countryside meadow base (extends to top of map behind mountains)
  c.fillStyle = C.meadow; c.fillRect(0, 0, MAP_W, 1400);
  // Forest dark zone
  c.fillStyle = C.forestDark; c.fillRect(100, 620, 1300, 780);
  // Garden zone (rich soil/green)
  c.fillStyle = '#7AAF5E'; c.fillRect(300, 1750, 800, 500);
  // Pet park zone (light park green)
  c.fillStyle = '#88BC6E'; c.fillRect(750, 3000, 700, 450);
  // Farm soil
  c.fillStyle = C.farmSoil; c.fillRect(4100, 820, 1600, 600);
  // Orchard pasture
  c.fillStyle = C.pasture; c.fillRect(3400, 380, 900, 600);
  // Pond water
  c.fillStyle = '#6AB8D0';
  c.beginPath(); c.ellipse(2000, 1020, 160, 100, 0, 0, Math.PI*2); c.fill();
  // Mountain-to-meadow transition (subtle green blend)
  const hillGrad = c.createLinearGradient(0, 580, 0, 650);
  hillGrad.addColorStop(0, 'rgba(122,154,106,0.3)');
  hillGrad.addColorStop(1, C.meadow);
  c.fillStyle = hillGrad; c.fillRect(0, 580, MAP_W, 70);
  // Airport tarmac
  c.fillStyle = '#808080'; c.fillRect(4600, 1200, 1200, 800);
}

function drawOcean(c) {
  const t = frameCount * 0.025;
  for (let wave = 0; wave < 4; wave++) {
    const wy = 3805 + wave * 20;
    c.beginPath(); c.moveTo(0, wy);
    for (let x2 = 0; x2 <= MAP_W; x2 += 30) {
      c.lineTo(x2, wy + Math.sin(x2*0.008 + t + wave*1.2)*6);
    }
    c.strokeStyle = `rgba(255,255,255,${0.25 - wave*0.04})`;
    c.lineWidth = 2.5 - wave*0.4;
    c.stroke();
  }
  const fg = c.createLinearGradient(0, 3800, 0, 3835);
  fg.addColorStop(0, 'rgba(255,255,255,0.5)');
  fg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = fg; c.fillRect(0, 3800, MAP_W, 35);
}

function drawBeach(c) {
  const shells = [
    {x:600,y:3720},{x:1100,y:3740},{x:1600,y:3700},{x:2200,y:3730},
    {x:2800,y:3710},{x:3400,y:3740},{x:4100,y:3720},{x:4700,y:3700},
  ];
  for (const s of shells) drawSprite(c, '🐚', s.x, s.y, 18);
  const umbrellas = [{x:800,y:3665},{x:1800,y:3648},{x:2600,y:3658},{x:3500,y:3652}];
  for (const u of umbrellas) drawSprite(c, '⛱️', u.x, u.y, 38);
  drawSprite(c, '🏄', 3000, 3678, 32);
  drawSprite(c, '🏄', 4200, 3658, 30);
}

function drawRoads(c) {
  const vRoads = [2000, 2600, 3200, 3800];
  const hRoads = [2000, 2400, 2800];
  const cityY1 = 2000, cityY2 = 2800;
  const cityX1 = 2000, cityX2 = 3800;
  const rw = 55, sw = 8;
  // City vertical roads
  for (const rx of vRoads) {
    c.fillStyle = C.road;
    c.fillRect(rx - rw/2, cityY1, rw, cityY2 - cityY1);
    c.fillStyle = C.sidewalk;
    c.fillRect(rx - rw/2 - sw, cityY1, sw, cityY2-cityY1);
    c.fillRect(rx + rw/2, cityY1, sw, cityY2-cityY1);
    c.setLineDash([18, 14]); c.strokeStyle = C.roadLine; c.lineWidth = 2;
    c.beginPath(); c.moveTo(rx, cityY1); c.lineTo(rx, cityY2); c.stroke();
    c.setLineDash([]);
  }
  // City horizontal roads
  for (const ry of hRoads) {
    c.fillStyle = C.road;
    c.fillRect(cityX1, ry - rw/2, cityX2-cityX1, rw);
    c.fillStyle = C.sidewalk;
    c.fillRect(cityX1, ry - rw/2 - sw, cityX2-cityX1, sw);
    c.fillRect(cityX1, ry + rw/2, cityX2-cityX1, sw);
    c.setLineDash([18, 14]); c.strokeStyle = C.roadLine; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cityX1, ry); c.lineTo(cityX2, ry); c.stroke();
    c.setLineDash([]);
  }
  // Intersection boxes
  for (const vx of vRoads) {
    for (const hy of hRoads) {
      c.fillStyle = '#9A9A9A';
      c.fillRect(vx - rw/2, hy - rw/2, rw, rw);
    }
  }
  // Suburban edges
  const subW = 38, subSW = 5;
  for (const e of edges) {
    if (e.type !== 'suburban') continue;
    const na = nodeMap[e.a], nb = nodeMap[e.b];
    const dx2 = nb.x-na.x, dy2 = nb.y-na.y;
    const d = Math.sqrt(dx2*dx2+dy2*dy2); if (d < 1) continue;
    const px = -dy2/d, py = dx2/d;
    c.fillStyle = C.subRoad;
    c.beginPath();
    c.moveTo(na.x+px*(subW/2), na.y+py*(subW/2));
    c.lineTo(nb.x+px*(subW/2), nb.y+py*(subW/2));
    c.lineTo(nb.x-px*(subW/2), nb.y-py*(subW/2));
    c.lineTo(na.x-px*(subW/2), na.y-py*(subW/2));
    c.closePath(); c.fill();
    c.fillStyle = C.sidewalk;
    for (const side of [-1, 1]) {
      const o1 = side*(subW/2), o2 = side*(subW/2+subSW);
      c.beginPath();
      c.moveTo(na.x+px*o1, na.y+py*o1); c.lineTo(nb.x+px*o1, nb.y+py*o1);
      c.lineTo(nb.x+px*o2, nb.y+py*o2); c.lineTo(na.x+px*o2, na.y+py*o2);
      c.closePath(); c.fill();
    }
  }
  // Dirt paths
  for (const e of edges) {
    if (e.type !== 'dirt') continue;
    const na = nodeMap[e.a], nb = nodeMap[e.b];
    const dx2 = nb.x-na.x, dy2 = nb.y-na.y;
    const d = Math.sqrt(dx2*dx2+dy2*dy2); if (d < 1) continue;
    const px = -dy2/d, py = dx2/d, dw = 28;
    c.fillStyle = C.dirtPath;
    c.beginPath();
    c.moveTo(na.x+px*(dw/2), na.y+py*(dw/2));
    c.lineTo(nb.x+px*(dw/2), nb.y+py*(dw/2));
    c.lineTo(nb.x-px*(dw/2), nb.y-py*(dw/2));
    c.lineTo(na.x-px*(dw/2), na.y-py*(dw/2));
    c.closePath(); c.fill();
  }
  // Boardwalk
  for (const e of edges) {
    if (e.type !== 'boardwalk') continue;
    const na = nodeMap[e.a], nb = nodeMap[e.b];
    const dx2 = nb.x-na.x, dy2 = nb.y-na.y;
    const d = Math.sqrt(dx2*dx2+dy2*dy2); if (d < 1) continue;
    const px = -dy2/d, py = dx2/d, bw = 30;
    c.fillStyle = C.boardwalk;
    c.beginPath();
    c.moveTo(na.x+px*(bw/2), na.y+py*(bw/2));
    c.lineTo(nb.x+px*(bw/2), nb.y+py*(bw/2));
    c.lineTo(nb.x-px*(bw/2), nb.y-py*(bw/2));
    c.lineTo(na.x-px*(bw/2), na.y-py*(bw/2));
    c.closePath(); c.fill();
    c.strokeStyle = '#9A7050'; c.lineWidth = 1;
    const planks = Math.floor(d / 12);
    for (let i = 0; i <= planks; i++) {
      const t2 = i/planks;
      const bpx = na.x+(nb.x-na.x)*t2, bpy = na.y+(nb.y-na.y)*t2;
      c.beginPath();
      c.moveTo(bpx+px*(bw/2), bpy+py*(bw/2));
      c.lineTo(bpx-px*(bw/2), bpy-py*(bw/2));
      c.stroke();
    }
  }
  // Airport roads
  for (const e of edges) {
    if (e.type !== 'airport') continue;
    const na = nodeMap[e.a], nb = nodeMap[e.b];
    const dx2 = nb.x-na.x, dy2 = nb.y-na.y;
    const d = Math.sqrt(dx2*dx2+dy2*dy2); if (d < 1) continue;
    const px = -dy2/d, py = dx2/d, aw = 40;
    c.fillStyle = '#707070';
    c.beginPath();
    c.moveTo(na.x+px*(aw/2), na.y+py*(aw/2));
    c.lineTo(nb.x+px*(aw/2), nb.y+py*(aw/2));
    c.lineTo(nb.x-px*(aw/2), nb.y-py*(aw/2));
    c.lineTo(na.x-px*(aw/2), na.y-py*(aw/2));
    c.closePath(); c.fill();
  }
  // City spurs (non-grid city roads like bakery)
  for (const e of edges) {
    if (e.type !== 'city') continue;
    if (/^c\d\d$/.test(e.a) && /^c\d\d$/.test(e.b)) continue;
    const na = nodeMap[e.a], nb = nodeMap[e.b];
    const dx2 = nb.x-na.x, dy2 = nb.y-na.y;
    const d = Math.sqrt(dx2*dx2+dy2*dy2); if (d < 1) continue;
    const px = -dy2/d, py = dx2/d;
    c.fillStyle = C.road;
    c.beginPath();
    c.moveTo(na.x+px*(rw/2), na.y+py*(rw/2));
    c.lineTo(nb.x+px*(rw/2), nb.y+py*(rw/2));
    c.lineTo(nb.x-px*(rw/2), nb.y-py*(rw/2));
    c.lineTo(na.x-px*(rw/2), na.y-py*(rw/2));
    c.closePath(); c.fill();
    c.fillStyle = C.sidewalk;
    for (const side of [-1, 1]) {
      const o1 = side*(rw/2), o2 = side*(rw/2+sw);
      c.beginPath();
      c.moveTo(na.x+px*o1, na.y+py*o1); c.lineTo(nb.x+px*o1, nb.y+py*o1);
      c.lineTo(nb.x+px*o2, nb.y+py*o2); c.lineTo(na.x+px*o2, na.y+py*o2);
      c.closePath(); c.fill();
    }
    c.setLineDash([18, 14]); c.strokeStyle = C.roadLine; c.lineWidth = 2;
    c.beginPath(); c.moveTo(na.x, na.y); c.lineTo(nb.x, nb.y); c.stroke();
    c.setLineDash([]);
  }
  // Road junction circles (fill gaps at 90° turns)
  const jTypes = {
    suburban: { r: subW/2, sw: subSW, rc: C.subRoad, sc: C.sidewalk },
    dirt:     { r: 14, sw: 0, rc: C.dirtPath },
    boardwalk:{ r: 15, sw: 0, rc: C.boardwalk },
    airport:  { r: 20, sw: 0, rc: '#707070' },
    city:     { r: rw/2, sw: sw, rc: C.road, sc: C.sidewalk },
  };
  for (const [id, node] of Object.entries(nodeMap)) {
    const tc = {};
    for (const e of edges) {
      if (e.a !== id && e.b !== id) continue;
      tc[e.type] = (tc[e.type] || 0) + 1;
    }
    for (const [type, cnt] of Object.entries(tc)) {
      if (cnt < 2) continue;
      const jt = jTypes[type];
      if (!jt) continue;
      if (type === 'city' && /^c\d\d$/.test(id)) continue;
      if (jt.sw > 0) {
        c.fillStyle = jt.sc;
        c.beginPath(); c.arc(node.x, node.y, jt.r + jt.sw, 0, Math.PI*2); c.fill();
      }
      c.fillStyle = jt.rc;
      c.beginPath(); c.arc(node.x, node.y, jt.r, 0, Math.PI*2); c.fill();
    }
  }
}

function drawBuildings(c) {
  for (const b of buildings) drawSprite(c, b.emoji, b.x, b.y, b.size);
  for (const h of houses) {
    c.fillStyle = 'rgba(80,160,60,0.18)';
    c.beginPath(); c.ellipse(h.x, h.y+h.size*0.3, h.size*0.7, h.size*0.5, 0, 0, Math.PI*2); c.fill();
    drawSprite(c, h.emoji, h.x, h.y, h.size);
    for (const yd of h.yard) drawSprite(c, yd.emoji, h.x+yd.dx, h.y+yd.dy, yd.size);
  }
}

function drawScenery(c) {
  const t = frameCount * 0.03;
  for (const s of scenery) {
    let sx = s.x, sy = s.y, sz = s.size;
    if (s.layer === 'butterfly') {
      // Flying motion: figure-eight drift
      sx += Math.sin(t + s.wobble) * 14;
      sy += Math.cos(t * 0.7 + s.wobble) * 8;
    } else if (s.layer === 'sway') {
      // Gentle side-to-side sway (flowers, mushrooms, animals)
      sx += Math.sin(t * 0.8 + s.wobble) * 3;
      sz *= 1 + Math.sin(t * 1.2 + s.wobble) * 0.04;
    } else if (s.layer === 'bob') {
      // Gentle up-down bob (water items, lily pads)
      sy += Math.sin(t * 0.6 + s.wobble) * 3;
      sx += Math.cos(t * 0.4 + s.wobble) * 1.5;
    }
    drawSprite(c, s.emoji, sx, sy, sz);
  }
}

function drawStreetDetails(c) {
  for (const d of streetDetails) drawSprite(c, d.emoji, d.x, d.y, d.size);
}

function drawBeachTown(c) {
  const btBldgs = [
    {x:900, y:3340,emoji:'🏡',size:52},{x:1050,y:3320,emoji:'☕',size:44},
    {x:1200,y:3340,emoji:'🏠',size:50},{x:1400,y:3320,emoji:'🍦',size:42},
    {x:1600,y:3340,emoji:'🏡',size:52},{x:1800,y:3310,emoji:'🏪',size:58},
    {x:2000,y:3330,emoji:'🎡',size:64},{x:2200,y:3320,emoji:'🏡',size:50},
    {x:2400,y:3340,emoji:'🍹',size:44},{x:2600,y:3330,emoji:'🏖️',size:50},
    {x:2800,y:3320,emoji:'🏠',size:52},{x:3000,y:3340,emoji:'🎠',size:58},
    {x:3200,y:3330,emoji:'🏡',size:50},{x:3500,y:3320,emoji:'🏪',size:54},
    {x:3800,y:3340,emoji:'🏠',size:50},
  ];
  for (const b of btBldgs) drawSprite(c, b.emoji, b.x, b.y, b.size);
  for (let x2 = 700; x2 < 4200; x2 += 70) {
    if (Math.abs(x2 - 2400) < 40) continue;
    drawSprite(c, '🌴', x2, 3420, 36);
  }
  const chairs = [{x:1300,y:3480},{x:2100,y:3490},{x:3000,y:3470},{x:4000,y:3480}];
  for (const ch of chairs) drawSprite(c, '🪑', ch.x, ch.y, 22);
}

function drawIndustrialArea(c) {
  // Factory buildings east of city
  const factories = [
    { x:4380, y:2000, emoji:'🏭', size:72 },
    { x:4520, y:2020, emoji:'🏭', size:80 },
    { x:4680, y:1990, emoji:'🏭', size:68 },
    { x:4450, y:2180, emoji:'🏭', size:74 },
    { x:4600, y:2200, emoji:'🏭', size:82 },
    { x:4750, y:2170, emoji:'🏭', size:70 },
    { x:4400, y:2380, emoji:'🏭', size:66 },
    { x:4560, y:2400, emoji:'🏭', size:76 },
    { x:4720, y:2370, emoji:'🏭', size:72 },
  ];
  for (const f of factories) drawSprite(c, f.emoji, f.x, f.y, f.size);
  // Smokestacks/chimneys (smaller accent buildings)
  drawSprite(c, '🏢', 4830, 2050, 54);
  drawSprite(c, '🏢', 4830, 2250, 50);
  // Trucks and containers
  drawSprite(c, '🚛', 4350, 2500, 32);
  drawSprite(c, '🚛', 4550, 2520, 30);
  drawSprite(c, '📦', 4700, 2510, 28);
  drawSprite(c, '📦', 4750, 2500, 24);
}

function drawAirport(c) {
  // Runway
  c.fillStyle = C.runway; c.fillRect(4700, 1500, 1000, 80);
  c.fillStyle = '#F0F0F0';
  for (let x2 = 4730; x2 < 5680; x2 += 60) c.fillRect(x2, 1535, 30, 10);
  c.fillRect(4700, 1536, 30, 8); c.fillRect(5670, 1536, 30, 8);
  // Terminal buildings (large emojis)
  drawSprite(c, '🏢', 4780, 1300, 80);
  drawSprite(c, '🏣', 4920, 1280, 90);
  drawSprite(c, '🏢', 5060, 1300, 80);
  drawSprite(c, '🏣', 5200, 1280, 90);
  drawSprite(c, '🏢', 5340, 1300, 70);
  // Control tower
  drawSprite(c, '🗼', 5450, 1320, 60);
  // Ground vehicles and details
  drawSprite(c, '🚌', 4820, 1460, 36);
  drawSprite(c, '🚐', 5100, 1460, 32);
  drawSprite(c, '🎐', 5500, 1440, 30);
  // Fence
  c.strokeStyle = '#888'; c.lineWidth = 2;
  c.strokeRect(4660, 1200, 1080, 420);
}

function drawOceanAnimations(c) {
  const t = frameCount * 0.018;
  for (const b of oceanAnims.boats) {
    const bob = Math.sin(t*1.3 + b.bobT) * 5;
    b.x += b.speed * b.dir;
    if (b.x > MAP_W + 100) b.x = -60;
    if (b.x < -100) b.x = MAP_W + 60;
    drawSprite(c, '⛵', b.x, b.y + bob, 38);
  }
  const su = oceanAnims.surfer;
  su.x += 0.6 * su.dir;
  if (su.x > 5000) su.dir = -1;
  if (su.x < 400) su.dir = 1;
  drawSprite(c, '🏄', su.x, su.y + Math.sin(t*2.5)*4, 32);
  const sh = oceanAnims.ship;
  sh.x += sh.speed;
  if (sh.x < -150) sh.x = MAP_W + 100;
  drawSprite(c, '🚢', sh.x, 4100 + Math.sin(t*0.5)*3, 58);
  const dol = oceanAnims.dolphin;
  dol.t += 0.022; dol.x += 0.5;
  if (dol.x > MAP_W + 80) dol.x = -80;
  const jumpY = 4000 + Math.sin(dol.t*3)*30;
  if (Math.sin(dol.t*3) > 0) {
    drawSprite(c, '🐬', dol.x, jumpY, 36);
    if (Math.sin(dol.t*3) > 0.85) drawSprite(c, '💦', dol.x+10, jumpY+10, 20);
  }
  const wh = oceanAnims.whale;
  wh.t += 0.008; wh.x -= 0.18;
  if (wh.x < -120) wh.x = MAP_W + 100;
  if (Math.sin(wh.t) > 0.7) {
    drawSprite(c, '🐋', wh.x, 4220+Math.sin(wh.t)*15, 60);
    drawSprite(c, '💨', wh.x-20, 4195, 22);
  }
  const rb = oceanAnims.rowboat;
  rb.t += 0.01; rb.x += 0.25*rb.dir;
  if (rb.x > 3500) rb.dir = -1;
  if (rb.x < 1000) rb.dir = 1;
  drawSprite(c, '🚣', rb.x, 3930+Math.sin(rb.t*2)*4, 32);
}

function drawAirportAnimations(c) {
  airportAnims.takeoffTimer++;
  for (const p of airportAnims.planes) drawSprite(c, '✈️', p.x, p.y, p.size);
  if (!airportAnims.activeAnim && airportAnims.takeoffTimer > 480) {
    airportAnims.takeoffTimer = 0;
    airportAnims.activeAnim = { x:4720, y:1540, phase:'takeoff', speed:1, size:50 };
  }
  if (airportAnims.activeAnim) {
    const a = airportAnims.activeAnim;
    if (a.phase === 'takeoff') {
      a.x += a.speed; a.speed += 0.04;
      // Plane grows as it climbs toward the viewer
      const dist = a.x - 4720;
      a.size = 50 + dist * 0.06;
      a.y -= 0.3 + dist * 0.001;
      drawSprite(c, '✈️', a.x, a.y, a.size);
      if (a.x > 6100) airportAnims.activeAnim = null;
    }
  }
}

function drawNPCs(c) {
  for (const npc of npcs) {
    npc.bobT += npc.speed;
    drawSprite(c, npc.emoji, npc.x, npc.y + Math.sin(npc.bobT)*3, 36);
  }
}

function drawPlayer(c) {
  const bob = player.moving ? Math.sin(player.bobT*2)*4 : 0;
  if (Math.cos(player.dir) < -0.1) {
    drawSpriteFlipped(c, player.emoji, player.x, player.y+bob, PLAYER_SIZE);
  } else {
    drawSprite(c, player.emoji, player.x, player.y+bob, PLAYER_SIZE);
  }
}

function drawApproachGlow(c) {
  for (const [id, dest] of Object.entries(DESTINATIONS)) {
    if (collected[id]) continue;
    const n = nodeMap[id]; if (!n) continue;
    const dx = player.x-n.x, dy = player.y-n.y;
    const dist = Math.sqrt(dx*dx+dy*dy);
    if (dist < AREA_RADIUS*1.5) {
      const pulse = 0.5 + 0.5*Math.sin(frameCount*0.08);
      const r = AREA_RADIUS + pulse*20;
      const grad = c.createRadialGradient(n.x,n.y,0,n.x,n.y,r);
      grad.addColorStop(0, `rgba(255,240,60,${0.22+pulse*0.1})`);
      grad.addColorStop(0.5, `rgba(255,200,0,${0.1+pulse*0.06})`);
      grad.addColorStop(1, 'rgba(255,200,0,0)');
      c.fillStyle = grad;
      c.beginPath(); c.arc(n.x,n.y,r,0,Math.PI*2); c.fill();
      c.font = 'bold 22px sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fillText(dest.label, n.x+1, n.y-38+1);
      c.fillStyle = '#FFF9C4';
      c.fillText(dest.label, n.x, n.y-38);
    }
  }
}

function drawDestinationMarkers(c) {
  const t = frameCount * 0.04;
  const destKeys = Object.keys(DESTINATIONS);
  for (let i = 0; i < destKeys.length; i++) {
    const id = destKeys[i];
    const dest = DESTINATIONS[id];
    const n = nodeMap[id]; if (!n) continue;
    if (collected[id]) {
      // Collected: dim static marker, no aura
      c.save(); c.globalAlpha = 0.3;
      drawSprite(c, dest.emoji, n.x, n.y - 24, 36);
      c.restore();
      continue;
    }
    // Pulsing aura glow
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 0.8);
    const auraR = 50 + pulse * 20;
    const grad = c.createRadialGradient(n.x, n.y - 20, 8, n.x, n.y - 20, auraR);
    grad.addColorStop(0, `rgba(255,220,60,${0.3 + pulse * 0.15})`);
    grad.addColorStop(0.5, `rgba(255,180,0,${0.15 + pulse * 0.08})`);
    grad.addColorStop(1, 'rgba(255,180,0,0)');
    c.fillStyle = grad;
    c.beginPath(); c.arc(n.x, n.y - 20, auraR, 0, Math.PI * 2); c.fill();
    // Orbiting sparkles
    for (let j = 0; j < 3; j++) {
      const angle = t * 1.5 + j * (Math.PI * 2 / 3) + i;
      const orbitR = 35 + Math.sin(t + j) * 5;
      const sx = n.x + Math.cos(angle) * orbitR;
      const sy = n.y - 20 + Math.sin(angle) * orbitR * 0.6;
      const sAlpha = 0.5 + 0.5 * Math.sin(t * 3 + j * 2);
      c.save(); c.globalAlpha = sAlpha;
      drawSprite(c, '✨', sx, sy, 14 + sAlpha * 4);
      c.restore();
    }
    // Main emoji with bounce and gentle scale pulse
    const bounce = Math.sin(t * 1.8 + i) * 5;
    const scale = 1 + Math.sin(t * 2.5 + i * 0.5) * 0.08;
    drawSprite(c, dest.emoji, n.x, n.y - 24 + bounce, 44 * scale);
  }
}

// === PLAYER MOVEMENT ===
function bestNodeInDir(nodeId, kdx, kdy) {
  const adj = adjacency[nodeId] || [];
  const px = nodeMap[nodeId].x, py = nodeMap[nodeId].y;
  let best = null, bestDot = 0.3, bestDist = Infinity;
  for (const nb of adj) {
    const n = nodeMap[nb.node];
    const ex = n.x - px, ey = n.y - py;
    const d = Math.sqrt(ex*ex + ey*ey);
    if (d < 1) continue;
    const dot = (ex/d)*kdx + (ey/d)*kdy;
    if (dot > bestDot + 0.01 || (dot > bestDot - 0.01 && d < bestDist)) {
      bestDot = dot; best = nb.node; bestDist = d;
    }
  }
  return best;
}

function updatePlayer() {
  if (selectingChar) return;
  // Safety: recover from NaN or missing position
  if (isNaN(player.x) || isNaN(player.y)) {
    const fallback = player.node || player.sourceNode || player.targetNode || 'c11';
    const n = nodeMap[fallback];
    if (n) { player.x = n.x; player.y = n.y; }
    player.node = fallback; player.targetNode = null; player.sourceNode = null;
    player.moving = false; player.keyDriven = false;
    return;
  }
  const right = keysDown['ArrowRight'] || keysDown['d'] || keysDown['D'];
  const left  = keysDown['ArrowLeft']  || keysDown['a'] || keysDown['A'];
  const down  = keysDown['ArrowDown']  || keysDown['s'] || keysDown['S'];
  const up    = keysDown['ArrowUp']    || keysDown['w'] || keysDown['W'];
  const kdx = (right?1:0) - (left?1:0);
  const kdy = (down?1:0) - (up?1:0);
  const hasKeys = kdx !== 0 || kdy !== 0;

  // --- Keyboard takes control (hold-to-move) ---
  if (hasKeys) {
    if (!player.keyDriven) {
      player.path = [];
      player.keyDriven = true;
    }
    if (player.node) {
      // At a node: pick best neighbor
      const next = bestNodeInDir(player.node, kdx, kdy);
      if (next) {
        player.sourceNode = player.node;
        player.targetNode = next;
        player.node = null;
        player.moving = true;
      }
    } else if (player.targetNode && player.sourceNode) {
      // Between nodes: allow reversal
      const target = nodeMap[player.targetNode];
      const tdx = target.x - player.x, tdy = target.y - player.y;
      const dist = Math.sqrt(tdx*tdx + tdy*tdy);
      if (dist > PLAYER_SPEED * 3) {
        const dot = (tdx/dist)*kdx + (tdy/dist)*kdy;
        if (dot < -0.3) {
          const temp = player.targetNode;
          player.targetNode = player.sourceNode;
          player.sourceNode = temp;
        }
      }
    }
  }

  // --- Tap path: start next segment from node ---
  if (!player.keyDriven && player.node && player.path.length > 0) {
    const next = player.path.shift();
    player.sourceNode = player.node;
    player.targetNode = next;
    player.node = null;
    player.moving = true;
  }

  // --- Move toward target ---
  if (player.targetNode) {
    const target = nodeMap[player.targetNode];
    if (!target) {
      player.node = player.sourceNode || 'c11';
      player.targetNode = null;
      player.sourceNode = null;
      player.moving = false;
      return;
    }
    const tdx = target.x - player.x, tdy = target.y - player.y;
    const dist = Math.sqrt(tdx*tdx + tdy*tdy);
    if (dist < NODE_STOP) {
      // Arrived
      player.x = target.x;
      player.y = target.y;
      const arrived = player.targetNode;
      player.node = arrived;
      player.targetNode = null;
      player.sourceNode = null;
      checkAreaTrigger(arrived);
      if (!player.keyDriven && player.path.length > 0) {
        const next = player.path.shift();
        player.sourceNode = arrived;
        player.targetNode = next;
        player.node = null;
      } else {
        player.moving = false;
        player.keyDriven = false;
      }
    } else if (!player.keyDriven || hasKeys) {
      player.x += (tdx/dist) * PLAYER_SPEED;
      player.y += (tdy/dist) * PLAYER_SPEED;
      player.dir = Math.atan2(tdy, tdx);
    } else {
      // Key released mid-edge: freeze in place
      player.moving = false;
    }
    player.bobT += 0.15;
    stepTimer++;
    if (stepTimer % 22 === 0) playStep();
  } else if (!hasKeys) {
    player.moving = false;
    player.keyDriven = false;
  }
}

// === AREA TRIGGER ===
function checkAreaTrigger(nodeId) {
  if (!DESTINATIONS[nodeId]) return;
  if (collected[nodeId]) return;
  triggerDestination(nodeId);
}

function getSlotPos(nodeId) {
  const idx = DEST_ORDER.indexOf(nodeId);
  const slotW = 42, gap = 5, pad = 10;
  const barW = DEST_ORDER.length * slotW + (DEST_ORDER.length - 1) * gap + pad * 2;
  const bx = (W - barW) / 2;
  return { x: bx + pad + idx * (slotW + gap) + slotW / 2, y: H - 30 };
}

function triggerDestination(nodeId) {
  const dest = DESTINATIONS[nodeId]; if (!dest) return;
  collected[nodeId] = true;
  const n = nodeMap[nodeId];
  const reward = dest.reward;
  const count = DEST_ORDER.filter(id => collected[id]).length;
  // Burst particles
  const burstEmojis = ['✨','⭐','🌟','💫','🎉','🎊'];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 1.5 + Math.random() * 2;
    const emoji = burstEmojis[i % burstEmojis.length];
    destAnimations.push({
      x: n.x, y: n.y, emoji, t: 0, maxT: 90, type: 'burst',
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
      startSize: 40 + Math.random() * 30, spin: (Math.random() - 0.5) * 0.1,
    });
  }
  // Sparkle ring
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    destAnimations.push({
      x: n.x, y: n.y, emoji: '✨', t: 0, maxT: 60, type: 'sparkle',
      vx: Math.cos(angle) * 2.5, vy: Math.sin(angle) * 2.5,
      startSize: 20 + Math.random() * 10,
    });
  }
  // Main reward — large rising emoji with "found" message
  destAnimations.push({
    x: n.x, y: n.y, emoji: reward, t: 0, maxT: 140, type: 'reward',
    startSize: 80, label: reward + ' Found!  ' + count + '/' + DEST_ORDER.length,
  });
  // Flash glow
  destAnimations.push({
    x: n.x, y: n.y, emoji: '', t: 0, maxT: 40, type: 'flash',
  });
  // Collect animation flies to the correct slot
  const slot = getSlotPos(nodeId);
  const tid = setTimeout(() => {
    if (!running) return;
    collectAnimations.push({
      x: n.x - cx, y: n.y - cy - 50, emoji: reward, t: 0, maxT: 45,
      tx: slot.x, ty: slot.y, startSize: 50,
    });
    // Check completion after collect animation finishes
    const tid2 = setTimeout(() => {
      if (!running) return;
      if (count === DEST_ORDER.length) triggerCompletion();
    }, 800);
    pendingTimeouts.push(tid2);
  }, 800);
  pendingTimeouts.push(tid);
  const soundFn = SOUND_MAP[dest.sound];
  if (soundFn) soundFn();
}

let completionPlayed = false;
function triggerCompletion() {
  if (completionPlayed) return;
  completionPlayed = true;
  // Play celebratory chord
  playChord();
  setTimeout(() => { if (running) playChime(); }, 300);
  // Burst confetti from center of screen (world coords)
  const wx = player.x, wy = player.y;
  const confetti = ['🎉','🎊','⭐','🌟','✨','🏆','💫','🥳'];
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 2 + Math.random() * 3;
    destAnimations.push({
      x: wx, y: wy, emoji: confetti[i % confetti.length], t: 0, maxT: 120, type: 'burst',
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
      startSize: 50 + Math.random() * 30, spin: (Math.random() - 0.5) * 0.15,
    });
  }
  // "All collected!" banner animation
  destAnimations.push({
    x: wx, y: wy - 40, emoji: '🏆', t: 0, maxT: 180, type: 'reward',
    startSize: 100, label: 'All Collected!',
  });
}

// === INPUT HANDLERS ===
function handleKey(e) {
  if (e.type === 'keydown') {
    keysDown[e.key] = true;
    if (e.key === 'Escape' && selectingChar) selectingChar = false;
  } else {
    keysDown[e.key] = false;
  }
}

function closestRoadNode(wx, wy) {
  // Find the closest point on any road edge, then return the nearest node on that edge
  let bestNode = null, bestDist = Infinity;
  for (const e of edges) {
    const na = nodeMap[e.a], nb = nodeMap[e.b];
    const ex = nb.x-na.x, ey = nb.y-na.y;
    const len2 = ex*ex+ey*ey;
    if (len2 < 1) continue;
    // Project tap point onto edge segment
    let t = ((wx-na.x)*ex + (wy-na.y)*ey) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = na.x + ex*t, py = na.y + ey*t;
    const d = Math.hypot(wx-px, wy-py);
    if (d < bestDist) {
      bestDist = d;
      // Pick whichever end node is closer to the projected point
      bestNode = t < 0.5 ? e.a : e.b;
    }
  }
  return bestNode;
}

function handleTapNav(mx, my) {
  const wx = mx+cx, wy = my+cy;
  const dest = closestRoadNode(wx, wy);
  if (!dest) return;
  const startNode = player.node || player.targetNode;
  if (!startNode) return;
  if (dest === startNode) { checkAreaTrigger(startNode); return; }
  const path = bfsPath(startNode, dest);
  if (path.length > 0) {
    player.path = path;
    player.moving = true;
    player.keyDriven = false;
  }
}

function onMouseHandler(e) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  if (e.type === 'click' || e.type === 'mousedown') {
    if (selectingChar) { handleCharSelect(mx, my); return; }
    handleTapNav(mx, my);
  }
}

function onTouchHandler(e) {
  if (!canvas) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0] || e.changedTouches[0];
  const mx = touch.clientX - rect.left;
  const my = touch.clientY - rect.top;
  if (e.type === 'touchstart') {
    if (selectingChar) { handleCharSelect(mx, my); return; }
    handleTapNav(mx, my);
  }
}

// === CHARACTER SELECTION ===
const CHAR_OPTIONS = ['🦄','🐵','🦁','🐸','🧚'];
const TILE_W = 90, TILE_H = 90, TILE_GAP = 12;

function getCharTiles() {
  const count = CHAR_OPTIONS.length;
  const cols = count;
  const totalW = cols * TILE_W + (cols - 1) * TILE_GAP;
  const startX = (W - totalW) / 2;
  const startY = (H - TILE_H) / 2 + 10;
  const tiles = [];
  for (let i = 0; i < count; i++) {
    tiles.push({
      x: startX + i * (TILE_W + TILE_GAP),
      y: startY,
      w: TILE_W, h: TILE_H,
      emoji: CHAR_OPTIONS[i],
    });
  }
  return tiles;
}

function drawCharSelect(c) {
  c.fillStyle = 'rgba(20,40,80,0.82)';
  c.fillRect(0, 0, W, H);
  const tiles = getCharTiles();
  const pad = 30;
  const gridL = tiles[0].x - pad;
  const gridR = tiles[tiles.length-1].x + TILE_W + pad;
  const gridT = tiles[0].y - 70;
  const gridB = tiles[0].y + TILE_H + 50;
  // Panel background
  c.fillStyle = 'rgba(255,255,255,0.13)';
  c.beginPath(); c.roundRect(gridL-10, gridT-10, gridR-gridL+20, gridB-gridT+20, 24); c.fill();
  c.fillStyle = '#FFFDE7';
  c.beginPath(); c.roundRect(gridL, gridT, gridR-gridL, gridB-gridT, 18); c.fill();
  // Title
  c.font = 'bold 24px sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'top';
  c.fillStyle = '#4A3000';
  c.fillText('Choose your character!', W/2, gridT + 14);
  // Tiles
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const bob = Math.sin(frameCount * 0.06 + i * 1.2) * 3;
    // Tile background
    c.fillStyle = 'rgba(255,220,50,0.15)';
    c.beginPath(); c.roundRect(t.x, t.y, t.w, t.h, 14); c.fill();
    c.strokeStyle = 'rgba(200,170,60,0.3)';
    c.lineWidth = 2;
    c.beginPath(); c.roundRect(t.x, t.y, t.w, t.h, 14); c.stroke();
    drawSprite(c, t.emoji, t.x + t.w/2, t.y + t.h/2 + bob, 52);
  }
  // Subtitle
  c.font = '16px sans-serif';
  c.fillStyle = '#7A6030';
  c.fillText('Tap to pick!', W/2, gridB - 30);
}

function handleCharSelect(mx, my) {
  const tiles = getCharTiles();
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h) {
      player.emoji = CHAR_OPTIONS[i];
      selectingChar = false;
      showIntro = true;
      introTimer = 0;
      canvas.style.cursor = 'none';
      playChime();
      return;
    }
  }
}

// === MINIMAP ===
function drawMinimap(c) {
  const mw=160, mh=120, mmx=W-mw-14, mmy=14;
  c.save(); c.globalAlpha=0.82;
  c.fillStyle='rgba(20,30,60,0.7)';
  c.beginPath(); c.roundRect(mmx-3,mmy-3,mw+6,mh+6,8); c.fill();
  c.fillStyle=C.grass; c.fillRect(mmx,mmy,mw,mh);
  c.fillStyle=C.ocean; c.fillRect(mmx,mmy+mh*0.84,mw,mh*0.16);
  c.fillStyle='#B0A898'; c.fillRect(mmx+mw*0.3,mmy+mh*0.4,mw*0.4,mh*0.22);
  c.fillStyle='#888'; c.fillRect(mmx+mw*0.76,mmy+mh*0.27,mw*0.2,mh*0.17);
  c.fillStyle=C.forestDark; c.fillRect(mmx,mmy,mw*0.22,mh*0.27);
  const pdx=(player.x/MAP_W)*mw, pdy=(player.y/MAP_H)*mh;
  c.fillStyle='#FF3030';
  c.beginPath(); c.arc(mmx+pdx,mmy+pdy,4,0,Math.PI*2); c.fill();
  c.strokeStyle='rgba(255,255,255,0.55)'; c.lineWidth=1.2;
  c.strokeRect(mmx+(cx/MAP_W)*mw,mmy+(cy/MAP_H)*mh,(W/MAP_W)*mw,(H/MAP_H)*mh);
  c.globalAlpha=1; c.restore();
}

// === INVENTORY BAR ===
function drawCollectibleBar(c) {
  const slotW = 42, gap = 5, pad = 10;
  const barW = DEST_ORDER.length * slotW + (DEST_ORDER.length - 1) * gap + pad * 2;
  const bx = (W - barW) / 2, by = H - 56;
  c.save();
  // Bar background
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.beginPath(); c.roundRect(bx, by, barW, slotW + 14, 14); c.fill();
  // Slots
  for (let i = 0; i < DEST_ORDER.length; i++) {
    const id = DEST_ORDER[i];
    const dest = DESTINATIONS[id];
    const sx = bx + pad + i * (slotW + gap);
    const sy = by + 7;
    const cxSlot = sx + slotW / 2;
    const cySlot = sy + slotW / 2;
    if (collected[id]) {
      // Collected: bright slot with glow
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.beginPath(); c.roundRect(sx, sy, slotW, slotW, 8); c.fill();
      const glow = 0.12 + Math.sin(frameCount * 0.04 + i) * 0.06;
      c.fillStyle = `rgba(255,220,80,${glow})`;
      c.beginPath(); c.roundRect(sx, sy, slotW, slotW, 8); c.fill();
      drawSprite(c, dest.reward, cxSlot, cySlot, 26);
    } else {
      // Uncollected: dim slot with question mark
      c.fillStyle = 'rgba(255,255,255,0.06)';
      c.beginPath(); c.roundRect(sx, sy, slotW, slotW, 8); c.fill();
      c.font = 'bold 18px sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.fillText('?', cxSlot, cySlot);
    }
  }
  // Progress counter
  const count = DEST_ORDER.filter(id => collected[id]).length;
  c.font = 'bold 12px sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'top';
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillText(count + '/' + DEST_ORDER.length, W / 2, by - 16);
  c.restore();
}

// === DEST / COLLECT ANIMATIONS ===
function updateDestAnimations(c) {
  for (let i = destAnimations.length - 1; i >= 0; i--) {
    const a = destAnimations[i]; a.t++;
    if (a.t > a.maxT) { destAnimations.splice(i, 1); continue; }
    const prog = a.t / a.maxT;
    const sx = a.x, sy = a.y;
    if (a.type === 'burst') {
      // Burst particles fly outward with gravity, fade and shrink
      const px = sx + a.vx * a.t;
      const py = sy + a.vy * a.t + 0.03 * a.t * a.t; // gravity
      const alpha = prog < 0.6 ? 1 : 1 - (prog - 0.6) / 0.4;
      const size = a.startSize * (1 - prog * 0.6);
      const rot = (a.spin || 0) * a.t;
      c.save(); c.globalAlpha = alpha;
      c.translate(px, py); c.rotate(rot);
      drawSprite(c, a.emoji, 0, 0, size);
      c.restore();
    } else if (a.type === 'sparkle') {
      const px = sx + a.vx * a.t * 0.8;
      const py = sy + a.vy * a.t * 0.8;
      const alpha = prog < 0.5 ? prog * 2 : 2 - prog * 2;
      const size = a.startSize * (1 - prog * 0.5);
      c.save(); c.globalAlpha = alpha * 0.8;
      drawSprite(c, a.emoji, px, py, size);
      c.restore();
    } else if (a.type === 'reward') {
      // Large reward emoji: rises, pulses, then shrinks
      const rise = Math.min(prog * 3, 1) * 70;
      const pulse = 1 + Math.sin(prog * Math.PI * 4) * 0.15;
      const size = prog < 0.7 ? a.startSize * pulse : a.startSize * (1 - (prog - 0.7) / 0.3) * pulse;
      const alpha = prog < 0.8 ? 1 : 1 - (prog - 0.8) / 0.2;
      c.save(); c.globalAlpha = alpha;
      drawSprite(c, a.emoji, sx, sy - rise, Math.max(size, 10));
      // Label under reward
      if (prog < 0.5) {
        c.font = 'bold 20px sans-serif';
        c.textAlign = 'center'; c.fillStyle = `rgba(255,255,255,${1 - prog * 2})`;
        c.fillText(a.label, sx, sy - rise + 50);
      }
      c.restore();
    } else if (a.type === 'flash') {
      // White flash that expands and fades
      c.save();
      const alpha = (1 - prog) * 0.5;
      const r = 40 + prog * 120;
      const grad = c.createRadialGradient(sx, sy, 0, sx, sy, r);
      grad.addColorStop(0, `rgba(255,255,200,${alpha})`);
      grad.addColorStop(0.5, `rgba(255,220,100,${alpha * 0.5})`);
      grad.addColorStop(1, 'rgba(255,200,0,0)');
      c.fillStyle = grad;
      c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.fill();
      c.restore();
    } else {
      // Fallback: simple float
      const ay = sy - 60 * prog;
      const alpha = prog < 0.7 ? 1 : 1 - (prog - 0.7) / 0.3;
      c.save(); c.globalAlpha = alpha;
      drawSprite(c, a.emoji, sx, ay, 44);
      c.restore();
    }
  }
}

function updateCollectAnimations(c) {
  for (let i=collectAnimations.length-1;i>=0;i--) {
    const a=collectAnimations[i]; a.t++;
    if (a.t>a.maxT) { collectAnimations.splice(i,1); continue; }
    const prog=a.t/a.maxT;
    const ex=a.x+(a.tx-a.x)*prog;
    const ey=a.y+(a.ty-a.y)*prog;
    const alpha=prog<0.8?0.9:0.9-(prog-0.8)/0.2*0.9;
    c.save(); c.globalAlpha=alpha;
    drawSprite(c, a.emoji, ex, ey, 26*(1-prog*0.5));
    c.restore();
  }
}

// === INTRO MESSAGE ===
function drawIntroMessage(c) {
  if (!showIntro) return;
  introTimer++;
  const dur = 240; // ~4 seconds
  if (introTimer > dur) { showIntro = false; return; }
  const prog = introTimer / dur;
  let alpha = 1;
  if (prog < 0.1) alpha = prog / 0.1;
  else if (prog > 0.8) alpha = (1 - prog) / 0.2;
  c.save(); c.globalAlpha = alpha;
  // Banner
  const bw = Math.min(400, W - 40), bh = 80;
  const bx = (W - bw) / 2, by = H * 0.25;
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.beginPath(); c.roundRect(bx, by, bw, bh, 16); c.fill();
  c.font = 'bold 18px sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#FFD54F';
  c.fillText('Explore the town!', W/2, by + bh/2 - 14);
  c.font = '15px sans-serif';
  c.fillStyle = 'white';
  c.fillText('Find all ' + DEST_ORDER.length + ' hidden treasures', W/2, by + bh/2 + 14);
  c.restore();
}

// === ZONE LABEL ===
function drawZoneLabel(c) {
  const zones = [
    {x1:100, y1:600, x2:1400,y2:1400,label:'🌲 Forest'},
    {x1:1400,y1:600, x2:3500,y2:1400,label:'🌸 Countryside'},
    {x1:3500,y1:400, x2:4500,y2:1200,label:'🌳 Orchard'},
    {x1:4100,y1:800, x2:5800,y2:1500,label:'🐄 Farm'},
    {x1:4600,y1:1200,x2:5800,y2:2000,label:'✈️ Airport'},
    {x1:1800,y1:1800,x2:4200,y2:2800,label:'🏙️ City Center'},
    {x1:0,   y1:3200,x2:5800,y2:3600,label:'🌊 Beach Town'},
    {x1:0,   y1:3600,x2:5800,y2:4500,label:'🌊 Ocean'},
  ];
  const wx=player.x, wy=player.y;
  let zone='🏘️ Suburbs';
  for (const z of zones) {
    if (wx>=z.x1&&wx<=z.x2&&wy>=z.y1&&wy<=z.y2) { zone=z.label; break; }
  }
  c.save();
  c.font='bold 16px sans-serif';
  c.textAlign='left'; c.textBaseline='top';
  c.fillStyle='rgba(0,0,0,0.35)'; c.fillText(zone,15,15);
  c.fillStyle='white'; c.fillText(zone,14,14);
  c.restore();
}

// === WORLD INIT ===
function initWorld() {
  generateBuildings();
  generateStreetDetails();
  generateHouses();
  generateCountryside();
  generateNPCs();
  initOceanAnims();
  initAirportAnims();
}

// === CANVAS INIT ===
let keyUpHandler = null;
let mouseMoveHandler = null;

function initCanvas() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const c = canvas.getContext('2d');
  c.scale(dpr, dpr);
}

function resetState() {
  player = { x: 2600, y: 2400, node: 'c11', sourceNode: null, targetNode: null, path: [], moving: false, keyDriven: false, dir: 0, bobT: 0, emoji: '🧒' };
  keysDown = {};
  collected = {};
  completionPlayed = false;
  destAnimations = [];
  collectAnimations = [];
  pendingTimeouts.forEach(t => clearTimeout(t));
  pendingTimeouts = [];
  buildings = []; houses = []; scenery = [];
  streetDetails = [];
  oceanAnims = { boats: [], surfer: null, ship: null, dolphin: null, whale: null, rowboat: null };
  airportAnims = { planes: [], takeoffTimer: 0, activeAnim: null };
  npcs = [];
  frameCount = 0;
  stepTimer = 0;
  showIntro = false;
  introTimer = 0;
  cx = player.x - W / 2;
  cy = player.y - H / 2;
  initWorld();
}

// === RENDER ===
function render() {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, W, H);
  c.save();
  c.translate(-cx, -cy);

  // World layers (back to front)
  drawSky(c);
  drawTerrain(c);
  drawMountains(c);
  drawOcean(c);
  drawBeach(c);
  drawRoads(c);
  drawScenery(c);
  drawStreetDetails(c);
  drawBuildings(c);
  drawBeachTown(c);
  drawIndustrialArea(c);
  drawAirport(c);
  drawDestinationMarkers(c);
  drawApproachGlow(c);
  drawNPCs(c);
  drawOceanAnimations(c);
  drawAirportAnimations(c);
  drawPlayer(c);
  updateDestAnimations(c);

  c.restore();

  // HUD (screen-space)
  updateCollectAnimations(c);
  drawCollectibleBar(c);
  drawMinimap(c);
  drawZoneLabel(c);
  drawIntroMessage(c);
}

// === UPDATE ===
function update() {
  frameCount++;
  updatePlayer();
  updateCamera();
}

// === GAME LOOP ===
function gameLoop() {
  if (!running) return;
  try {
    update();
    render();
  } catch (e) {
    console.error('TinyTown frame error:', e);
    // Recover: snap player to nearest valid node
    if (!player.node) player.node = player.sourceNode || player.targetNode || 'c11';
    player.targetNode = null; player.sourceNode = null;
    player.moving = false; player.keyDriven = false;
    const n = nodeMap[player.node];
    if (n) { player.x = n.x; player.y = n.y; }
  }
  animFrame = requestAnimationFrame(gameLoop);
}

function charSelectLoop() {
  if (!running) return;
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, W, H);
  // Draw a preview of the world behind the selection screen
  c.save();
  c.translate(-cx, -cy);
  drawSky(c);
  drawTerrain(c);
  drawMountains(c);
  drawRoads(c);
  drawBuildings(c);
  c.restore();
  drawCharSelect(c);
  if (selectingChar) {
    animFrame = requestAnimationFrame(charSelectLoop);
  } else {
    animFrame = requestAnimationFrame(gameLoop);
  }
}

// === RESIZE HANDLER ===
let resizeHandler = null;

// === EXPORT ===
export const tinyTown = {
  id: 'tiny-town',

  start() {
    initAudio();
    gameEl = document.getElementById('tinyTownGame');
    canvas = gameEl.querySelector('canvas');
    gameEl.style.display = 'block';
    initCanvas();
    resetState();
    running = true;
    selectingChar = true;
    canvas.style.cursor = EMOJI_CURSOR;

    animFrame = requestAnimationFrame(charSelectLoop);

    keyUpHandler = (e) => { delete keysDown[e.key]; };
    document.addEventListener('keyup', keyUpHandler);

    mouseMoveHandler = (e) => {
      if (!selectingChar) return;
    };
    canvas.addEventListener('mousemove', mouseMoveHandler);

    resizeHandler = () => {
      if (!running) return;
      initCanvas();
    };
    window.addEventListener('resize', resizeHandler);
  },

  stop() {
    running = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = null;
    pendingTimeouts.forEach(t => clearTimeout(t));
    pendingTimeouts = [];
    gameEl.style.display = 'none';
    if (keyUpHandler) {
      document.removeEventListener('keyup', keyUpHandler);
      keyUpHandler = null;
    }
    if (mouseMoveHandler) {
      canvas.removeEventListener('mousemove', mouseMoveHandler);
      mouseMoveHandler = null;
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
    Object.keys(spriteCache).forEach(k => delete spriteCache[k]);
  },

  onKey(e) { handleKey(e); },
  onMouse(e) { onMouseHandler(e); },
  onTouch(e) { onTouchHandler(e); },
};
