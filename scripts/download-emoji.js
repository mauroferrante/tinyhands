#!/usr/bin/env node
/* =========================================================
 *  Download Fluent 3D Emoji PNGs from jsDelivr CDN
 *  Saves to assets/emoji/{codepoints}.png
 *
 *  Usage: node scripts/download-emoji.js
 * ========================================================= */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'emoji');

// CDN base — shuding/fluentui-emoji-unicode on GitHub via jsDelivr
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/';

/* ------------------------------------------------------------------
 *  Master emoji list — every unique emoji used across the project
 * ------------------------------------------------------------------ */
const ALL_EMOJI = [
  '⌛', '⏰', '⏱', '☀️', '☁️', '☄️', '☕', '⚡',
  '⚽', '⛈️', '⛪', '⛰️', '⛱️', '⛵', '⛺',
  '✅', '✈️', '✌️', '✏️', '✨', '❄️', '❤️', '⭐',
  '🃏', '🌀', '🌈', '🌊', '🌋', '🌙', '🌟', '🌧️',
  '🌮', '🌱', '🌲', '🌳', '🌴', '🌷', '🌸', '🌹',
  '🌺', '🌻', '🌼', '🌾', '🌿', '🍀', '🍄', '🍇',
  '🍉', '🍊', '🍋', '🍌', '🍎', '🍐', '🍑', '🍕',
  '🍞', '🍦', '🍩', '🍪', '🍭', '🍰', '🍹', '🍽️',
  '🎁', '🎂', '🎃', '🎅', '🎆', '🎇', '🎈', '🎉',
  '🎊', '🎐', '🎒', '🎠', '🎡', '🎩', '🎪', '🎫',
  '🎯', '🎱', '🎲', '🎵', '🎶', '🎸', '🎹', '🎾',
  '🏀', '🏃', '🏄', '🏆', '🏈', '🏔️', '🏕️', '🏖️',
  '🏗️', '🏘️', '🏙️', '🏚️', '🏛️', '🏠', '🏡', '🏢',
  '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏬',
  '🏭', '🏯', '🏰', '🏺', '🐀', '🐄', '🐈', '🐉',
  '🐊', '🐋', '🐌', '🐍', '🐎', '🐐', '🐑', '🐔',
  '🐕', '🐕‍🦺', '🐖', '🐘', '🐙', '🐚', '🐛', '🐜',
  '🐝', '🐞', '🐟', '🐠', '🐢', '🐦', '🐧', '🐨',
  '🐩', '🐬', '🐮', '🐯', '🐰', '🐱', '🐲', '🐳',
  '🐴', '🐵', '🐶', '🐷', '🐸', '🐹', '🐻', '🐼',
  '🐾', '🐿️', '👁️', '👆', '👑', '👧', '👨‍✈️', '👨‍🍳',
  '👨‍🚀', '👨🏻‍🌾', '👩‍🎨', '👩‍🦳', '👩🏻', '👩🏻‍🌾', '👱‍♀️', '👲🏽',
  '👵', '👻', '👼', '💎', '💐', '💚', '💛', '💜',
  '💥', '💦', '💨', '💫', '📏', '📚', '📤', '📦',
  '🔄', '🔋', '🔔', '🔥', '🔧', '🔩', '🔮', '🕊️',
  '🗑️', '🗝️', '🗻', '🗼', '😀', '😃', '😄', '😅',
  '😊', '😬', '😰', '😱', '😺', '🙈', '🙏', '🚀',
  '🚁', '🚂', '🚌', '🚐', '🚕', '🚗', '🚙', '🚛',
  '🚜', '🚢', '🚣', '🚦', '🚩', '🚪', '🚲', '🚶',
  '🚶‍♀️', '🛡️', '🛩️', '🛰️', '🛸', '🤍', '🤠', '🤩',
  '🤴', '🥁', '🥐', '🥚', '🥛', '🥜', '🥧', '🥳',
  '🦀', '🦁', '🦄', '🦅', '🦆', '🦇', '🦈', '🦉',
  '🦊', '🦋', '🦌', '🦒', '🦓', '🦔', '🦚', '🦜',
  '🦩', '🦮', '🦸‍♀️', '🧀', '🧁', '🧑', '🧑‍🌾', '🧑‍🍳',
  '🧑‍💼', '🧒', '🧔', '🧘‍♀️', '🧙‍♂️', '🧚', '🧛', '🧜‍♀️',
  '🧜‍♂️', '🧝‍♀️', '🧝‍♂️', '🧞', '🧠', '🧢', '🧩', '🧲',
  '🧳', '🧸', '🧺', '🪀', '🪁', '🪂', '🪑', '🪧',
  '🪨', '🪰', '🪴', '🪵', '🪷', '🪸', '🪻', '🪾',
  '🪿', '🫣'
];

/* ------------------------------------------------------------------
 *  Helpers
 * ------------------------------------------------------------------ */

/** Convert emoji char → codepoint filename (strip FE0F variation selector). */
function emojiToFilename(emoji) {
  const cps = [...emoji]
    .map(c => c.codePointAt(0))
    .filter(cp => cp !== 0xFE0F)
    .map(cp => cp.toString(16))
    .join('-');
  return cps + '.png';
}

/** Download a URL to a local file path. Returns a promise. */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', err => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

/** Sleep for ms milliseconds. */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ------------------------------------------------------------------
 *  Main
 * ------------------------------------------------------------------ */

async function main() {
  // Ensure output dir exists
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Downloading ${ALL_EMOJI.length} Fluent 3D emoji PNGs…\n`);

  let ok = 0;
  let fail = 0;
  const failed = [];

  for (let i = 0; i < ALL_EMOJI.length; i++) {
    const emoji = ALL_EMOJI[i];
    const filename = emojiToFilename(emoji);
    const dest = path.join(OUT_DIR, filename);

    // Skip if already downloaded
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      ok++;
      process.stdout.write(`\r  [${i + 1}/${ALL_EMOJI.length}] ${emoji}  (cached)`);
      continue;
    }

    const cdnFilename = filename.replace('.png', '_3d.png');
    const url = CDN_BASE + cdnFilename;

    try {
      await download(url, dest);
      ok++;
      process.stdout.write(`\r  [${i + 1}/${ALL_EMOJI.length}] ${emoji}  ✅ ${filename}`);
    } catch (err) {
      fail++;
      failed.push({ emoji, filename, error: err.message });
      process.stdout.write(`\r  [${i + 1}/${ALL_EMOJI.length}] ${emoji}  ❌ ${err.message}`);
    }

    // Small delay to be nice to the CDN
    if (i % 10 === 9) await sleep(100);
  }

  console.log(`\n\n✅ Downloaded: ${ok}`);
  if (fail > 0) {
    console.log(`❌ Failed: ${fail}`);
    for (const f of failed) {
      console.log(`   ${f.emoji} → ${f.filename}: ${f.error}`);
    }
  }

  // Calculate total size
  let totalBytes = 0;
  const files = fs.readdirSync(OUT_DIR);
  for (const f of files) {
    totalBytes += fs.statSync(path.join(OUT_DIR, f)).size;
  }
  console.log(`\n📦 Total asset size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB (${files.length} files)`);
}

main().catch(err => { console.error(err); process.exit(1); });
