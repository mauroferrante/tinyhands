#!/usr/bin/env node
/* =========================================================
 *  Build the local emoji set.
 *
 *  Downloads every emoji the site actually references from the Fluent 3D
 *  set on jsDelivr, re-encodes it to WebP at the same 256px resolution and
 *  writes it to assets/emoji/fluent/. Serving these ourselves instead of
 *  hot-linking the CDN is ~87% fewer bytes (35 KB -> ~4.6 KB per emoji),
 *  same-origin, and immune to that third-party repo changing or vanishing.
 *
 *  Run locally after changing any emoji, then commit the output:
 *      npm run emoji
 *
 *  Needs `sharp`, which is a devDependency and never runs on Vercel.
 * ========================================================= */
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { EMOJI_REGISTRY } from '../js/emoji-registry.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = join(ROOT, 'assets', 'emoji', 'fluent');
const CDN  = 'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/';
const SIZE = 256, QUALITY = 82;

// Emoji the Fluent 3D set genuinely does not contain, but that we have our own
// artwork for. Without this the site logo would render as a flat system glyph.
const LOCAL_SOURCES = { '270c_3d': 'assets/emoji/cursors/victory.png' };

const toName = (e) => [...e].map(c => c.codePointAt(0)).filter(cp => cp !== 0xFE0F)
  .map(cp => cp.toString(16)).join('-') + '_3d';

// Every emoji the registries declare, plus any filename hardcoded in markup.
const names = new Set(Object.values(EMOJI_REGISTRY).flat().map(toName));
const scan = (rel) => {
  const t = readFileSync(join(ROOT, rel), 'utf8');
  for (const m of t.matchAll(/([0-9a-f][0-9a-f-]*_3d)\.(?:png|webp)/g)) names.add(m[1]);
};
scan('index.html');
scan('scripts/build-site.mjs');
for (const f of readdirSync(join(ROOT, 'js', 'games'))) scan(join('js', 'games', f));

mkdirSync(OUT, { recursive: true });
const missing = [];
let bytesIn = 0, bytesOut = 0, made = 0;

await Promise.all([...names].map(async (name) => {
  let buf = null;
  for (const candidate of [name, name.split('-')[0] + '_3d']) {   // exact, then base codepoint
    const r = await fetch(CDN + candidate + '.png');
    if (r.ok) { buf = Buffer.from(await r.arrayBuffer()); break; }
  }
  if (!buf && LOCAL_SOURCES[name]) buf = readFileSync(join(ROOT, LOCAL_SOURCES[name]));
  if (!buf) { missing.push(name); return; }
  const webp = await sharp(buf).resize(SIZE, SIZE, { fit: 'inside' }).webp({ quality: QUALITY }).toBuffer();
  writeFileSync(join(OUT, name + '.webp'), webp);
  bytesIn += buf.length; bytesOut += webp.length; made++;
}));

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
console.log(`${made} emoji written to assets/emoji/fluent/`);
console.log(`  source PNG ${mb(bytesIn)}  ->  local WebP ${mb(bytesOut)}   (${((1 - bytesOut / bytesIn) * 100).toFixed(0)}% smaller)`);
if (missing.length) {
  console.log(`\n${missing.length} not available on the CDN at all — these fall back to the system emoji:`);
  for (const m of missing.sort()) console.log('   ' + m);
}
