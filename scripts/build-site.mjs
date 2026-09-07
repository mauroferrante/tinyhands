#!/usr/bin/env node
/* =========================================================
 *  Tiny Hands Play — static site generator (zero dependencies)
 *
 *  Reads  content/games.json, content/guides/*.md, content/pages/*.md
 *  Writes games/<path>/index.html, guides/index.html, guides/<slug>/index.html,
 *         about/index.html, teachers/index.html, sitemap.xml, llms.txt,
 *         llms-full.txt, css/games.bundle.css, and the homepage card grid
 *         between <!-- games:start --> and <!-- games:end --> in index.html.
 *
 *  Run:   npm run build        (then commit the output)
 *         npm run check        (validate only, no writes)
 * ========================================================= */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   // handles spaces in the path
const SITE = 'https://tinyhandsplay.com';
const CDN  = 'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/';
const AUTHOR = 'Mauro Ferrante';
const CHECK_ONLY = process.argv.includes('--check');
const TODAY = new Date().toISOString().slice(0, 10);

const read  = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const writes = [];
function write(rel, content) {
  writes.push(rel);
  if (CHECK_ONLY) return;
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}
function lastmod(rel) {
  try { return execSync(`git log -1 --format=%cs -- "${rel}"`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || TODAY; }
  catch { return TODAY; }
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const emojiImg = (file, alt, cls = 'emoji-img', extra = '') => `<img src="${CDN}${file}.png" class="${cls}" alt="${esc(alt)}"${extra}>`;
const cp = ch => [...ch].map(c => c.codePointAt(0)).filter(c => c !== 0xFE0F).map(c => c.toString(16)).join('-') + '_3d';

// ===== Content =====

const games = JSON.parse(read('content/games.json'));
const gameBySlug = Object.fromEntries(games.map(g => [g.slug, g]));
const gameUrl = g => `/games/${g.path}/`;

function parseFrontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  if (m) {
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1');
    }
  }
  return { meta, body: m ? src.slice(m[0].length) : src };
}

// Minimal Markdown: #/##/###, paragraphs, - lists, 1. lists, > quotes, **bold**, *em*, `code`, [text](url)
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => `<a href="${u}"${/^https?:/.test(u) ? ' rel="noopener"' : ''}>${t}</a>`);
}
function markdown(src) {
  const lines = src.replace(/\r/g, '').split('\n');
  let html = '', para = [], list = null, quote = [], table = null;
  const flushTable = () => {
    if (!table) return;
    const [head, ...rows] = table;
    const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    html += '<div class="pg-table-wrap"><table><thead><tr>' + cells(head).map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + cells(r).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>\n';
    table = null;
  };
  const flushPara = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>\n`; para = []; } };
  const flushList = () => { if (list) { html += `</${list}>\n`; list = null; } };
  const flushQuote = () => { if (quote.length) { html += `<blockquote><p>${inline(quote.join(' '))}</p></blockquote>\n`; quote = []; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); flushQuote(); flushTable(); continue; }
    let m;
    if (/^\|/.test(line)) {
      flushPara(); flushList(); flushQuote();
      if (/^\|[\s:|-]+\|$/.test(line)) continue;   // header separator row
      (table = table || []).push(line);
      continue;
    }
    flushTable();
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flushPara(); flushList(); flushQuote(); const lv = m[1].length; html += `<h${lv}>${inline(m[2])}</h${lv}>\n`; continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); continue; }
    if ((m = line.match(/^[-*]\s+(.*)$/))) { flushPara(); flushQuote(); if (list !== 'ul') { flushList(); list = 'ul'; html += '<ul>\n'; } html += `<li>${inline(m[1])}</li>\n`; continue; }
    if ((m = line.match(/^\d+\.\s+(.*)$/))) { flushPara(); flushQuote(); if (list !== 'ol') { flushList(); list = 'ol'; html += '<ol>\n'; } html += `<li>${inline(m[1])}</li>\n`; continue; }
    if (list && /^\s{2,}/.test(raw)) { html = html.replace(/<\/li>\n$/, ' ' + inline(line.trim()) + '</li>\n'); continue; }
    flushList(); flushQuote(); para.push(line.trim());
  }
  flushPara(); flushList(); flushQuote(); flushTable();
  return html;
}
const plainText = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const words = s => plainText(s).split(' ').filter(Boolean).length;

function loadMd(rel) {
  const { meta, body } = parseFrontMatter(read(rel));
  return { ...meta, body, html: markdown(body), src: rel, lastmod: lastmod(rel) };
}
const guides = exists('content/guides')
  ? fs.readdirSync(path.join(ROOT, 'content/guides')).filter(f => f.endsWith('.md')).sort().map(f => {
      const g = loadMd('content/guides/' + f);
      g.slug = g.slug || f.replace(/\.md$/, '');
      g.url = `/guides/${g.slug}/`;
      g.draft = String(g.draft) === 'true';
      return g;
    }).filter(g => !g.draft)
  : [];
const guideByGame = Object.fromEntries(guides.filter(g => g.game).map(g => [g.game, g]));
const pages = {};
for (const name of ['about', 'teachers']) if (exists(`content/pages/${name}.md`)) pages[name] = loadMd(`content/pages/${name}.md`);

// ===== Shared layout =====

const analyticsSnippet = `
<script>
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
  var host = window.location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' ||
      /^192\\.168\\./.test(host) || /^10\\./.test(host) || /^172\\.(1[6-9]|2\\d|3[01])\\./.test(host) ||
      /\\.local$/.test(host) || /\\.vercel\\.app$/.test(host);
  var hideMe = false;
  try { hideMe = localStorage.getItem('hide_me') === 'true'; } catch (e) {}
  if (!isLocal && !hideMe) {
    ['/_vercel/insights/script.js'].forEach(function(src) {
      var s = document.createElement('script'); s.src = src; s.defer = true; document.head.appendChild(s);
    });
  }
</script>`;

function nav() {
  return `<header class="pg-header">
  <a class="pg-logo" href="/">${emojiImg('270c', '✌️', 'emoji-img inline-emoji')} Tiny Hands Play</a>
  <nav class="pg-nav" aria-label="Site">
    <a href="/#games">Games</a>
    <a href="/guides/">Guides</a>
    <a href="/teachers/">For teachers</a>
    <a href="/about/">About</a>
  </nav>
</header>`;
}

function footer() {
  const gameLinks = games.map(g => `<a href="${gameUrl(g)}">${esc(g.name)}</a>`).join('');
  const guideLinks = guides.slice(0, 8).map(g => `<a href="${g.url}">${esc(g.title)}</a>`).join('');
  return `<footer class="pg-footer">
  <div class="pg-footer-cols">
    <div><h2>Games</h2><div class="pg-links">${gameLinks}</div></div>
    <div><h2>Guides</h2><div class="pg-links">${guideLinks}<a href="/guides/">All guides →</a></div></div>
    <div><h2>Tiny Hands Play</h2><div class="pg-links"><a href="/about/">About</a><a href="/teachers/">For teachers</a><a href="https://donate.stripe.com/bJecN44KTgWlgqNfmQasg02?utm_source=tinyhandsplay&amp;utm_medium=page" rel="noopener">Buy me a coffee · $3</a><a href="https://github.com/mauroferrante/tinyhands" rel="noopener">Source on GitHub</a></div></div>
  </div>
  <p class="pg-footer-note">Free for every family, with no ads, no accounts and no tracking of children. Built with ${emojiImg('2764', '❤️', 'emoji-img inline-emoji')} by a dad. Emoji by <a href="https://github.com/microsoft/fluentui-emoji" rel="noopener">Microsoft Fluent Emoji</a> (MIT).</p>
</footer>`;
}

function layout({ title, description, canonical, ogType = 'website', jsonld = [], body, bodyClass = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${AUTHOR}">
<meta name="theme-color" content="#FFFAF7">
<link rel="canonical" href="${SITE}${canonical}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/og-image.jpg">
<meta property="og:site_name" content="Tiny Hands Play">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/og-image.jpg">
<link rel="icon" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@400;600;700&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/base.css">
<link rel="stylesheet" href="/css/pages.css">
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body class="pg-body ${bodyClass}">
${nav()}
${body}
${footer()}
${analyticsSnippet}
</body>
</html>
`;
}

const person = { '@type': 'Person', name: AUTHOR, url: `${SITE}/about/` };
const breadcrumbs = items => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${url}` }))
});
const faqLd = faq => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
});

// ===== Game pages =====

function miniCard(g) {
  return `<a class="pg-mini" href="${gameUrl(g)}">${emojiImg(g.icon, g.emoji, 'emoji-img pg-mini-icon', ' loading="lazy"')}<span class="pg-mini-name">${esc(g.name)}</span><span class="pg-mini-age">${esc(g.ages.label)}</span></a>`;
}

function gamePage(g) {
  const url = gameUrl(g);
  const guide = guideByGame[g.slug];
  const related = g.related.map(s => gameBySlug[s]).filter(Boolean);
  const body = `<main class="pg">
  <nav class="pg-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/#games">Games</a> › <span>${esc(g.name)}</span></nav>
  <section class="pg-hero">
    <div class="pg-hero-icon">${emojiImg(g.icon, g.emoji, 'emoji-img', ' fetchpriority="high"')}</div>
    <div class="pg-hero-text">
      <span class="age-badge">${esc(g.ages.label)}</span>
      <h1>${esc(g.name)}</h1>
      <p class="pg-tagline">${esc(g.cardDesc)}</p>
      <a class="pg-play" href="/?play=${g.slug}">▶ Play ${esc(g.name)}</a>
      <p class="pg-facts">Free · No ads · No account · Phone, tablet and laptop</p>
    </div>
  </section>
  <section class="pg-section"><h2>What it is</h2><p>${esc(g.intro)}</p></section>
  <section class="pg-section"><h2>How to play</h2>
    <ul class="pg-howto">
      <li><strong>On a laptop or desktop:</strong> ${esc(g.howToPlay.desktop)}</li>
      <li><strong>On a tablet or phone:</strong> ${esc(g.howToPlay.touch)}</li>
    </ul>
  </section>
  <section class="pg-section"><h2>What children learn</h2><ul>${g.learn.map(l => `<li>${esc(l)}</li>`).join('')}</ul></section>
  <section class="pg-section"><h2>Tips for parents</h2><p>${esc(g.tips)}</p></section>
  <section class="pg-section"><h2>Questions parents ask</h2>
    <dl class="pg-faq">${g.faq.map(f => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join('')}</dl>
  </section>
  ${guide ? `<section class="pg-section pg-guide-box"><h2>Read the guide</h2><p><a href="${guide.url}">${esc(guide.title)}</a> — ${esc(guide.description || '')}</p></section>` : ''}
  <section class="pg-section"><h2>More games for ages ${g.ages.min} to ${g.ages.max}</h2><div class="pg-minis">${related.map(miniCard).join('')}</div></section>
  <p class="pg-cta"><a class="pg-play" href="/?play=${g.slug}">▶ Play ${esc(g.name)} now</a></p>
</main>`;
  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'VideoGame',
      name: g.name, url: `${SITE}${url}`, description: g.description, genre: g.genre,
      image: `${CDN}${g.icon}.png`, applicationCategory: 'Game', operatingSystem: 'Any (web browser)',
      gamePlatform: ['Web browser', 'iOS', 'Android', 'Desktop'],
      playMode: 'SinglePlayer', isAccessibleForFree: true, inLanguage: 'en',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      audience: { '@type': 'PeopleAudience', suggestedMinAge: g.ages.min, suggestedMaxAge: g.ages.max },
      author: person, publisher: { '@type': 'Organization', name: 'Tiny Hands Play', url: SITE },
      isPartOf: { '@type': 'WebApplication', name: 'Tiny Hands Play', url: SITE }
    },
    breadcrumbs([['Home', '/'], ['Games', '/#games'], [g.name, url]]),
    faqLd(g.faq)
  ];
  return layout({ title: `${g.title} | Tiny Hands Play`, description: g.description, canonical: url, jsonld, body, bodyClass: 'pg-game' });
}

// ===== Guides =====

function guidePage(gd) {
  const game = gd.game ? gameBySlug[gd.game] : null;
  const related = guides.filter(x => x !== gd && (x.game !== gd.game || !gd.game)).slice(0, 3);
  const body = `<main class="pg pg-article">
  <nav class="pg-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/guides/">Guides</a> › <span>${esc(gd.title)}</span></nav>
  <article>
    <header class="pg-article-head">
      <h1>${esc(gd.title)}</h1>
      <p class="pg-meta">By ${AUTHOR} · Updated <time datetime="${gd.lastmod}">${gd.lastmod}</time> · ${Math.max(1, Math.round(words(gd.html) / 200))} min read</p>
    </header>
    ${gd.html.replace(/^<h1>[^<]*<\/h1>\n?/, '')}
    ${game ? `<aside class="pg-guide-box"><h2>Try it</h2><p><a href="${gameUrl(game)}">${esc(game.name)}</a> is free, has no ads and runs in the browser. Ages ${game.ages.label}.</p><p><a class="pg-play" href="/?play=${game.slug}">▶ Play ${esc(game.name)}</a></p></aside>` : ''}
  </article>
  ${related.length ? `<section class="pg-section"><h2>More guides</h2><ul class="pg-guide-list">${related.map(r => `<li><a href="${r.url}">${esc(r.title)}</a><span>${esc(r.description || '')}</span></li>`).join('')}</ul></section>` : ''}
</main>`;
  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: gd.title, description: gd.description || '', url: `${SITE}${gd.url}`,
      datePublished: gd.date || gd.lastmod, dateModified: gd.lastmod, inLanguage: 'en',
      author: person, publisher: { '@type': 'Organization', name: 'Tiny Hands Play', url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` } },
      mainEntityOfPage: `${SITE}${gd.url}`, image: `${SITE}/og-image.jpg`,
      ...(game ? { about: { '@type': 'VideoGame', name: game.name, url: `${SITE}${gameUrl(game)}` } } : {})
    },
    breadcrumbs([['Home', '/'], ['Guides', '/guides/'], [gd.title, gd.url]])
  ];
  return layout({ title: `${gd.seoTitle || gd.title} | Tiny Hands Play`, description: gd.description || '', canonical: gd.url, ogType: 'article', jsonld, body, bodyClass: 'pg-guide' });
}

function guidesIndex() {
  const body = `<main class="pg">
  <nav class="pg-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>Guides</span></nav>
  <h1>Guides for parents and teachers</h1>
  <p class="pg-lead">Short, practical articles on how young children learn through play, what each Tiny Hands Play game is actually teaching, and how to get the most out of a few minutes of screen time.</p>
  <ul class="pg-guide-list pg-guide-list-big">${guides.map(g => `<li><a href="${g.url}">${esc(g.title)}</a><span>${esc(g.description || '')}</span></li>`).join('')}</ul>
</main>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Guides for parents and teachers', url: `${SITE}/guides/`, hasPart: guides.map(g => ({ '@type': 'Article', headline: g.title, url: `${SITE}${g.url}` })) },
    breadcrumbs([['Home', '/'], ['Guides', '/guides/']])
  ];
  return layout({ title: 'Guides for Parents: How Kids Learn Through Play | Tiny Hands Play', description: 'Practical guides on toddler and kids\' learning through play: keyboard smashing, memory games, early spelling, mental math tricks, screen time and more.', canonical: '/guides/', jsonld, body });
}

function simplePage(name, md, extra = {}) {
  const url = `/${name}/`;
  const body = `<main class="pg pg-article">
  <nav class="pg-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>${esc(md.title)}</span></nav>
  <article>${md.html}</article>
  ${extra.after || ''}
</main>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': extra.type || 'AboutPage', name: md.title, url: `${SITE}${url}`, description: md.description || '', author: person },
    breadcrumbs([['Home', '/'], [md.title, url]])
  ];
  return layout({ title: `${md.title} | Tiny Hands Play`, description: md.description || '', canonical: url, jsonld, body });
}

// ===== Homepage card grid =====

function homeCard(g, i) {
  const lazy = i >= 3 ? ' loading="lazy"' : '';
  return `    <!-- ${g.name} Card -->
    <article class="game-card">
      <div class="card-flipper">
        <div class="card-front">
          <span class="card-icon" aria-hidden="true">${emojiImg(g.icon, g.emoji, 'emoji-img', lazy)}</span>
          <h2>${esc(g.name)}</h2>
          <span class="age-badge">${esc(g.ages.label)}</span>
          <p class="card-desc">${esc(g.cardDesc)}</p>
          <button class="play-btn accent-${g.accent}" data-game="${g.slug}">Play</button>
          <a class="card-more" href="${gameUrl(g)}">About this game →</a>
        </div>
        <div class="card-back">
          <p class="card-info-desc">${esc(g.cardInfo)}</p>
          <p class="card-info-edu">${emojiImg('1f4d6', '📖', 'emoji-img inline-emoji')} <strong>What they learn:</strong> ${esc(g.cardLearn)}</p>
          <span class="card-back-hint">Tap to flip back</span>
        </div>
      </div>
      <button class="card-info-btn" aria-label="Game info">ⓘ</button>
    </article>
`;
}

function updateHomepage() {
  const src = read('index.html');
  const start = src.indexOf('<!-- games:start -->'), end = src.indexOf('<!-- games:end -->');
  if (start < 0 || end < 0) throw new Error('index.html is missing the <!-- games:start --> / <!-- games:end --> markers');
  const cards = games.map(homeCard).join('\n');
  const out = src.slice(0, start) + '<!-- games:start -->\n' + cards + '\n    ' + src.slice(end);
  if (out !== src) write('index.html', out);
}

// ===== CSS bundle =====

function bundleCss() {
  const order = ['splat-keys', 'stack-smash', 'spell-it-out', 'memory-match', 'balloon-float', 'rocket-ride', 'ball-bonanza', 'tiny-town', 'melody-maker', 'dress-up', 'math-ninja'];
  const parts = order.map(n => `/* ===== css/games/${n}.css ===== */\n` + read(`css/games/${n}.css`).replace(/\.\.\/\.\.\//g, '../'));
  write('css/games.bundle.css', `/* Generated by scripts/build-site.mjs — edit css/games/*.css, then npm run build */\n\n` + parts.join('\n\n'));
}

// ===== sitemap, llms.txt =====

function sitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(([loc, mod, pri]) => `  <url>\n    <loc>${SITE}${loc}</loc>\n    <lastmod>${mod}</lastmod>\n    <priority>${pri}</priority>\n  </url>`).join('\n') + '\n</urlset>\n';
}

function llmsTxt() {
  const gameLines = games.map(g => `- [${g.name}](${SITE}${gameUrl(g)}): ${g.description}`).join('\n');
  const guideLines = guides.map(g => `- [${g.title}](${SITE}${g.url}): ${g.description || ''}`).join('\n');
  return `# Tiny Hands Play

> Free, ad-free browser games for babies, toddlers and kids aged 6 months to 10 years. No installs, no accounts, no in-app purchases. Made by a dad; runs on any phone, tablet or laptop and can be added to the home screen as an app.

Tiny Hands Play (tinyhandsplay.com) is a collection of eleven small educational games. Everything is free and there are no ads or sign-ups. The games open instantly in a web browser; nothing is downloaded and no child data is collected (the only analytics are anonymous page views). Most games work with both a keyboard and touch. The site is popular with parents of toddlers looking for a safe keyboard game, and with teachers who share it in class.

Recommended by age: 1–3 years Kaboom Keys (keyboard smashing, ABC mode), Ball Bonanza, Dress-Up Party; 2–5 years Memory Match, Stack It Up; 3–7 years Melody Maker (piano, 30 melodies); 4–7 years Spell It Out; 4–9 years Tiny Town, Balloon Float, Rocket Ride; 6–10 years Math Ninja (number basics and 20 mental-math tricks).

## Games

${gameLines}

## Guides

${guideLines || '- Guides are being written; see https://tinyhandsplay.com/guides/'}

## About

- [About Tiny Hands Play](${SITE}/about/): who makes it, what is collected (nothing personal), how it is funded (optional $3 tips).
- [For teachers](${SITE}/teachers/): classroom use, Chromebooks, no accounts, printable poster.

## Optional

- [Third-party licenses](https://github.com/mauroferrante/tinyhands/blob/main/LICENSES.md): emoji artwork is Microsoft Fluent Emoji (MIT).
- [Source code](https://github.com/mauroferrante/tinyhands)
`;
}

function llmsFull() {
  let out = llmsTxt() + '\n---\n\n';
  for (const g of games) {
    out += `# ${g.name} (${g.ages.label})\n\n> ${g.cardDesc}\n\nURL: ${SITE}${gameUrl(g)}\n\n${g.intro}\n\n## How to play\n\n- Laptop or desktop: ${g.howToPlay.desktop}\n- Tablet or phone: ${g.howToPlay.touch}\n\n## What children learn\n\n${g.learn.map(l => '- ' + l).join('\n')}\n\n## Tips for parents\n\n${g.tips}\n\n## Questions parents ask\n\n${g.faq.map(f => `**${f.q}** ${f.a}`).join('\n\n')}\n\n---\n\n`;
  }
  for (const gd of guides) out += `# ${gd.title}\n\nURL: ${SITE}${gd.url}\n\n${gd.body.trim()}\n\n---\n\n`;
  for (const [name, md] of Object.entries(pages)) out += `# ${md.title}\n\nURL: ${SITE}/${name}/\n\n${md.body.trim()}\n\n---\n\n`;
  return out;
}

// ===== Validation =====

const problems = [];
function validateHtml(rel, html, expectedCanonical) {
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) problems.push(`${rel}: ${h1s} <h1> elements`);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (title.length < 20 || title.length > 72) problems.push(`${rel}: title length ${title.length} ("${title}")`);
  const desc = (html.match(/name="description" content="([^"]*)"/) || [])[1] || '';
  if (desc.length < 70 || desc.length > 165) problems.push(`${rel}: description length ${desc.length}`);
  const canon = (html.match(/rel="canonical" href="([^"]*)"/) || [])[1];
  if (canon !== SITE + expectedCanonical) problems.push(`${rel}: canonical ${canon}`);
  // depth check
  let depth = 0;
  for (const m of html.matchAll(/<(\/?)(div|section|main|article|header|footer|nav|ul|ol|dl|aside)\b[^>]*>/g)) depth += m[1] ? -1 : 1;
  if (depth !== 0) problems.push(`${rel}: unbalanced block tags (${depth})`);
  // internal links
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const href = m[1];
    const file = href.endsWith('/') ? href + 'index.html' : href;
    const rel2 = file.replace(/^\//, '');
    if (!exists(rel2) && !writes.includes(rel2)) problems.push(`${rel}: broken internal link ${href}`);
  }
  return { title, desc };
}

// ===== Build =====

const outputs = [];
const seenTitles = new Map(), seenDescs = new Map();
function emit(rel, html, canonical) {
  const { title, desc } = validateHtml(rel, html, canonical);
  if (seenTitles.has(title)) problems.push(`duplicate title: ${rel} and ${seenTitles.get(title)}`); seenTitles.set(title, rel);
  if (seenDescs.has(desc)) problems.push(`duplicate description: ${rel} and ${seenDescs.get(desc)}`); seenDescs.set(desc, rel);
  write(rel, html);
  outputs.push(rel);
}

// Pre-register outputs so cross-links validate regardless of order
const planned = [
  ...games.map(g => `games/${g.path}/index.html`),
  'guides/index.html', ...guides.map(g => `guides/${g.slug}/index.html`),
  ...Object.keys(pages).map(p => `${p}/index.html`),
  'css/games.bundle.css', 'sitemap.xml', 'llms.txt', 'llms-full.txt'
];
writes.push(...planned);

for (const g of games) emit(`games/${g.path}/index.html`, gamePage(g), gameUrl(g));
emit('guides/index.html', guidesIndex(), '/guides/');
for (const gd of guides) emit(`guides/${gd.slug}/index.html`, guidePage(gd), gd.url);
if (pages.about) emit('about/index.html', simplePage('about', pages.about), '/about/');
if (pages.teachers) emit('teachers/index.html', simplePage('teachers', pages.teachers, { type: 'WebPage' }), '/teachers/');

bundleCss();
updateHomepage();

const urls = [
  ['/', lastmod('index.html'), '1.0'],
  ...games.map(g => [gameUrl(g), lastmod('content/games.json'), '0.9']),
  ['/guides/', guides.length ? guides.map(g => g.lastmod).sort().pop() : TODAY, '0.7'],
  ...guides.map(g => [g.url, g.lastmod, '0.7']),
  ...Object.entries(pages).map(([n, md]) => [`/${n}/`, md.lastmod, '0.6']),
];
write('sitemap.xml', sitemap(urls));
write('llms.txt', llmsTxt());
write('llms-full.txt', llmsFull());

// Report
console.log(`${CHECK_ONLY ? 'Checked' : 'Wrote'} ${outputs.length} pages, ${guides.length} guides, sitemap (${urls.length} URLs), llms.txt, css bundle.`);
for (const g of games) console.log(`  ${gameUrl(g).padEnd(28)} ${words(g.intro + g.tips)} words body copy`);
if (problems.length) { console.log('\nPROBLEMS:'); problems.forEach(p => console.log('  - ' + p)); process.exitCode = 1; }
else console.log('All pages valid: one <h1>, unique titles/descriptions, canonical matches, internal links resolve.');
