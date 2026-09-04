/* =========================================================
 *  Math Ninja — number basics + mental-math tricks
 *
 *  Two doors: Number Basics (levelled + − × ÷ with visual
 *  hints) and Ninja Tricks (20 shortcuts taught as
 *  Watch → Guided → Solo). Answers come from an on-screen
 *  number pad or the keyboard. Never a game over.
 * ========================================================= */

import {
  initAudio, playCorrectDing, playWrongBoop, playPerfectDing, playStreakChime,
  playWinFanfare, playBubblePop, playCardSwoosh
} from '../audio.js';
import { spawnParticles } from '../effects.js';
import { preloadEmojis, createEmojiImg, getEmojiUrl } from '../emoji.js';
import { EMOJI_REGISTRY } from '../emoji-registry.js';
import { createTimerPool } from '../timers.js';
import { local } from '../storage.js';
import { shareOrCopy } from '../share.js';
import { BASIC_LEVELS, PROBLEMS_PER_LEVEL, TRICKS, TRICK_GROUPS, SOLO_PROBLEMS } from './math-tricks.js';

const NINJA = '🥷';
const MAX_DIGITS = 4;
const WATCH_STEP_MS = 1500;

// ===== State =====
const timers = createTimerPool();
let sessionId = 0;
let gameEl = null;
let titleEl, backBtn, trackerEl, bubbleEl, contentEl, padEl, celebrateEl;
let screen = 'idle';          // idle | loading | mode | basics | tricks | play | lesson | end
let buffer = '';
let locked = false;           // input ignored while feedback plays
let streak = 0;
let endPrimary = null;        // data-action for Enter/Space on the end card

// Number Basics
let level = null, problems = [], pIdx = 0, misses = 0, attempts = 0, visualOn = false;

// Ninja Tricks
let trick = null, phase = 'watch', demo = null, stepIdx = 0, watchTimer = null;
let guided = null, solo = [], sIdx = 0, soloCorrect = 0, peeks = 0, peekIdx = 0, peekedThis = false;

// ===== Helpers =====
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const emoji = (ch, cls) => createEmojiImg(ch, cls || 'emoji-img');
const starsKeyBasics = id => 'thp-math-basics-' + id;
const starsKeyTrick  = id => 'thp-math-trick-' + id;

function starsHtml(n) {
  let h = '<span class="mn-stars">';
  for (let i = 0; i < 3; i++) h += `<img src="${getEmojiUrl('⭐')}" class="emoji-img mn-star${i < n ? '' : ' mn-star-off'}" alt="${i < n ? '⭐' : '☆'}">`;
  return h + '</span>';
}

function say(text) {
  if (!bubbleEl) return;
  bubbleEl.textContent = text;
  bubbleEl.classList.remove('mn-pop'); void bubbleEl.offsetWidth; bubbleEl.classList.add('mn-pop');
}

function setTitle(text) { titleEl.textContent = text; }
function setTracker(html) { trackerEl.innerHTML = html || ''; }
function showBack(on) { backBtn.style.display = on ? '' : 'none'; }
function showPad(on) { padEl.classList.toggle('mn-pad-on', !!on); gameEl.classList.toggle('mn-has-pad', !!on); }

function burstAt(node, count = 1) {
  if (!node || !gameEl) return;
  const r = node.getBoundingClientRect(), g = gameEl.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    timers.later(() => spawnParticles(r.left - g.left + r.width / 2 + (Math.random() - 0.5) * 60, r.top - g.top + r.height / 2, gameEl), i * 120);
  }
}

function shake(node) { if (!node) return; node.classList.remove('mn-shake'); void node.offsetWidth; node.classList.add('mn-shake'); }

function answerBox() { return contentEl.querySelector('.mn-answer.mn-live'); }
function renderBuffer() {
  const box = answerBox();
  if (!box) return;
  box.textContent = buffer || '?';
  box.classList.toggle('mn-empty', !buffer);
}

// ===== Shell =====

function buildDOM() {
  gameEl.innerHTML = '';
  const top = el('div', 'mn-top');
  backBtn = el('button', 'mn-back', '← Back'); backBtn.type = 'button'; backBtn.dataset.action = 'back';
  titleEl = el('div', 'mn-title');
  trackerEl = el('div', 'mn-tracker');
  top.append(backBtn, titleEl, trackerEl);

  const ninja = el('div', 'mn-ninja');
  const face = el('span', 'mn-ninja-emoji'); face.appendChild(emoji(NINJA));
  bubbleEl = el('div', 'mn-bubble');
  ninja.append(face, bubbleEl);

  const main = el('div', 'mn-main');
  contentEl = el('div', 'mn-content');
  padEl = el('div', 'mn-pad');
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'].forEach(k => {
    const b = el('button', 'mn-key' + (k === 'ok' ? ' mn-key-ok' : k === 'back' ? ' mn-key-back' : ''));
    b.type = 'button'; b.dataset.key = k;
    b.textContent = k === 'back' ? '⌫' : k === 'ok' ? '✓' : k;
    b.setAttribute('aria-label', k === 'back' ? 'Delete' : k === 'ok' ? 'Check answer' : k);
    padEl.appendChild(b);
  });
  main.append(contentEl, padEl);

  celebrateEl = el('div', 'mn-celebrate');
  gameEl.append(top, ninja, main, celebrateEl);
}

function clearContent() {
  contentEl.innerHTML = '';
  contentEl.className = 'mn-content';
  buffer = '';
  locked = false;
  timers.cancel(watchTimer); watchTimer = null;
}

function hideEndcard() { celebrateEl.classList.remove('mn-show'); celebrateEl.innerHTML = ''; endPrimary = null; }

// ===== Mode select =====

function showMode() {
  screen = 'mode';
  hideEndcard(); clearContent(); showPad(false); showBack(false);
  setTitle('Math Ninja'); setTracker('');
  say('Welcome to the dojo! Pick your training.');
  const wrap = el('div', 'mn-modes');
  wrap.append(modeBtn('mode-basics', '🧮', 'Number Basics', 'Count, add, take away, times and share'),
              modeBtn('mode-tricks', NINJA, 'Ninja Tricks', '20 sneaky shortcuts for fast maths'));
  contentEl.appendChild(wrap);
}

function modeBtn(action, icon, label, sub) {
  const b = el('button', 'mn-mode'); b.type = 'button'; b.dataset.action = action;
  const i = el('span', 'mn-mode-icon'); i.appendChild(emoji(icon));
  b.append(i, el('span', 'mn-mode-label', label), el('span', 'mn-mode-sub', sub));
  return b;
}

// ===== Number Basics: level grid =====

function showBasicsGrid() {
  screen = 'basics';
  hideEndcard(); clearContent(); showPad(false); showBack(true);
  setTitle('Number Basics'); setTracker('');
  say('Pick a belt. Every level is 8 questions.');
  const grid = el('div', 'mn-grid');
  BASIC_LEVELS.forEach(lv => {
    const stars = local.getInt(starsKeyBasics(lv.id));
    const t = el('button', 'mn-tile' + (stars ? ' mn-tile-done' : '')); t.type = 'button'; t.dataset.action = 'level:' + lv.id;
    const ic = el('span', 'mn-tile-icon'); ic.appendChild(emoji(lv.emoji));
    t.append(el('span', 'mn-tile-num', String(lv.id)), ic, el('span', 'mn-tile-name', lv.name), el('span', 'mn-tile-stars', starsHtml(stars)));
    grid.appendChild(t);
  });
  contentEl.appendChild(grid);
}

// ===== Number Basics: play =====

function startLevel(lv) {
  level = lv;
  problems = Array.from({ length: PROBLEMS_PER_LEVEL }, () => lv.gen());
  pIdx = 0; misses = 0; streak = 0;
  screen = 'play';
  hideEndcard(); showBack(true); showPad(true);
  setTitle(lv.name);
  say(lv.sub === 'tables' ? 'Times tables! You can do this.' : lv.sub === 'divide' ? 'Share them out evenly.' : 'Type the answer, then tap ✓.');
  renderProblem();
}

function progressHtml(n, i, correctMask) {
  let h = '<span class="mn-dots">';
  for (let k = 0; k < n; k++) h += `<span class="mn-dot${k < i ? ' mn-dot-done' : k === i ? ' mn-dot-now' : ''}"></span>`;
  return h + '</span>';
}

function renderProblem() {
  clearContent();
  attempts = 0;
  visualOn = !!level.showVisual;
  const p = problems[pIdx];
  setTracker(progressHtml(problems.length, pIdx));

  const row = el('div', 'mn-problem');
  row.append(el('span', 'mn-expr', p.text), el('span', 'mn-eq', '='), Object.assign(el('span', 'mn-answer mn-live mn-empty', '?'), {}));
  contentEl.appendChild(row);

  const vis = el('div', 'mn-visual');
  contentEl.appendChild(vis);
  if (p.visual) {
    if (visualOn) drawVisual(vis, p.visual);
    else {
      const b = el('button', 'mn-showme', '👀 Show me'); b.type = 'button'; b.dataset.action = 'showme';
      vis.appendChild(b);
    }
  }
  contentEl.appendChild(el('div', 'mn-hint'));
}

function drawVisual(container, v) {
  container.innerHTML = '';
  container.classList.add('mn-visual-on');
  if (v.type === 'tenframe' || v.type === 'takeaway') {
    const total = v.type === 'tenframe' ? v.a + v.b : v.a;
    const frames = Math.ceil(total / 10);
    for (let f = 0; f < frames; f++) {
      const frame = el('div', 'mn-frame');
      for (let i = 0; i < 10; i++) {
        const idx = f * 10 + i;
        const d = el('span', 'mn-fdot');
        if (idx < total) {
          if (v.type === 'tenframe') d.classList.add(idx < v.a ? 'mn-fdot-a' : 'mn-fdot-b');
          else d.classList.add('mn-fdot-a', idx >= v.a - v.b ? 'mn-fdot-gone' : 'mn-fdot-keep');
        }
        frame.appendChild(d);
      }
      container.appendChild(frame);
    }
  } else if (v.type === 'array') {
    const grid = el('div', 'mn-array');
    grid.style.gridTemplateColumns = `repeat(${v.cols}, 1fr)`;
    for (let i = 0; i < v.rows * v.cols; i++) grid.appendChild(el('span', 'mn-adot' + (Math.floor(i / v.cols) % 2 ? ' mn-adot-alt' : '')));
    container.appendChild(grid);
    container.appendChild(el('div', 'mn-visual-label', `${v.rows} rows of ${v.cols}`));
  } else if (v.type === 'groups') {
    const wrap = el('div', 'mn-groups');
    for (let g = 0; g < v.groups; g++) {
      const grp = el('div', 'mn-group');
      for (let i = 0; i < v.size; i++) grp.appendChild(el('span', 'mn-gdot'));
      wrap.appendChild(grp);
    }
    container.appendChild(wrap);
    container.appendChild(el('div', 'mn-visual-label', `${v.groups} equal groups. How many in each?`));
  }
}

function submitBasics() {
  if (locked || !buffer) return;
  const p = problems[pIdx];
  const value = parseInt(buffer, 10);
  const box = answerBox();
  if (value === p.answer) {
    locked = true;
    streak++;
    box.classList.add('mn-ok');
    if (streak >= 3 && streak % 3 === 0) { playStreakChime(); say(pick(['Three in a row!', 'Ninja streak!', 'Unstoppable!'])); }
    else { playCorrectDing(); say(pick(['Yes!', 'Nice one!', 'Exactly.', 'Ninja fast!'])); }
    burstAt(box, 2);
    timers.later(nextProblem, 900);
  } else {
    attempts++;
    if (attempts === 1) misses++;
    streak = 0;
    playWrongBoop();
    shake(box);
    const hint = contentEl.querySelector('.mn-hint');
    if (attempts >= 2) {
      locked = true;
      box.textContent = String(p.answer);
      box.classList.remove('mn-empty'); box.classList.add('mn-reveal');
      say(`It's ${p.answer}. On to the next one.`);
      timers.later(nextProblem, 1600);
    } else {
      buffer = ''; renderBuffer();
      const vis = contentEl.querySelector('.mn-visual');
      if (p.visual && !visualOn) { visualOn = true; drawVisual(vis, p.visual); }
      hint.textContent = p.hint || (p.visual ? 'Count the dots and try again.' : 'Have another go.');
      say('Not quite. Try again!');
    }
  }
}

function nextProblem() {
  pIdx++;
  if (pIdx >= problems.length) { endLevel(); return; }
  renderProblem();
}

function endLevel() {
  const stars = misses <= 1 ? 3 : misses <= 3 ? 2 : 1;
  const key = starsKeyBasics(level.id);
  if (stars > local.getInt(key)) local.set(key, stars);
  screen = 'end'; showPad(false);
  playWinFanfare();
  burstAt(contentEl, 5);
  say(stars === 3 ? 'Perfect belt! You are a number ninja.' : stars === 2 ? 'Great work! One more run for three stars?' : 'Level done! Practice makes ninjas.');
  const next = BASIC_LEVELS.find(l => l.id === level.id + 1);
  showEndcard({
    title: level.name + ' complete!',
    stats: `${problems.length - misses} of ${problems.length} first try`,
    stars,
    primary: next ? { action: 'level:' + next.id, label: 'Next level →' } : { action: 'level:' + level.id, label: 'Play again' },
    secondary: { action: 'mode-basics', label: 'All levels' }
  });
}

// ===== Ninja Tricks: grid =====

function showTricksGrid() {
  screen = 'tricks';
  hideEndcard(); clearContent(); showPad(false); showBack(true);
  setTitle('Ninja Tricks'); setTracker('');
  say('Watch a trick, try it with help, then go solo!');
  const nextUp = TRICKS.find(t => !local.getInt(starsKeyTrick(t.id)));
  TRICK_GROUPS.forEach(g => {
    const head = el('div', 'mn-group-head');
    head.appendChild(emoji(g.emoji, 'emoji-img inline-emoji'));
    head.appendChild(document.createTextNode(' ' + g.name));
    contentEl.appendChild(head);
    const grid = el('div', 'mn-grid mn-grid-tricks');
    TRICKS.filter(t => t.group === g.id).forEach(t => {
      const stars = local.getInt(starsKeyTrick(t.id));
      const tile = el('button', 'mn-tile mn-tile-trick' + (stars ? ' mn-tile-done' : '') + (t === nextUp ? ' mn-tile-next' : ''));
      tile.type = 'button'; tile.dataset.action = 'trick:' + t.id;
      const ic = el('span', 'mn-tile-icon'); ic.appendChild(emoji(t.emoji));
      tile.append(ic, el('span', 'mn-tile-name', t.name), el('span', 'mn-tile-stars', starsHtml(stars)));
      grid.appendChild(tile);
    });
    contentEl.appendChild(grid);
  });
}

// ===== Ninja Tricks: lesson =====

function phaseTracker(current) {
  const names = [['watch', '👀 Watch'], ['guided', '🤝 Together'], ['solo', NINJA + ' Solo']];
  return '<span class="mn-phases">' + names.map(([id, label]) =>
    `<span class="mn-phase${id === current ? ' mn-phase-now' : ''}">${label}</span>`).join('') + '</span>';
}

function startLesson(t) {
  trick = t;
  screen = 'lesson';
  hideEndcard(); showBack(true);
  setTitle(t.name);
  startWatch();
}

function stepNode(step, revealValue) {
  const s = el('div', 'mn-step');
  s.append(el('div', 'mn-step-say', step.say));
  const line = el('div', 'mn-step-line');
  line.append(el('span', 'mn-step-expr', step.expr), el('span', 'mn-eq', '='));
  const box = el('span', 'mn-answer mn-step-answer' + (revealValue ? '' : ' mn-live mn-empty'), revealValue ? String(step.value) : '?');
  line.appendChild(box);
  s.appendChild(line);
  return s;
}

function startWatch() {
  phase = 'watch';
  clearContent(); showPad(false);
  setTracker(phaseTracker('watch'));
  demo = trick.gen(trick.demo || {});
  stepIdx = 0;
  say(trick.blurb);
  contentEl.dataset.action = 'skip';
  contentEl.classList.add('mn-watching');
  contentEl.appendChild(el('div', 'mn-problem mn-problem-big', `<span class="mn-expr">${demo.text}</span>`));
  contentEl.appendChild(el('div', 'mn-steps'));
  contentEl.appendChild(el('div', 'mn-tap-hint', 'tap to hurry'));
  watchTimer = timers.later(revealStep, 900);
}

function revealStep() {
  timers.cancel(watchTimer); watchTimer = null;
  const steps = demo.steps, list = contentEl.querySelector('.mn-steps');
  if (!list) return;
  if (stepIdx < steps.length) {
    const node = stepNode(steps[stepIdx], true);
    node.classList.add('mn-step-in');
    if (stepIdx === steps.length - 1) node.classList.add('mn-step-final');
    list.appendChild(node);
    playBubblePop(stepIdx + 2);
    stepIdx++;
    watchTimer = timers.later(revealStep, WATCH_STEP_MS);
  } else {
    delete contentEl.dataset.action;
    contentEl.classList.remove('mn-watching');
    const hint = contentEl.querySelector('.mn-tap-hint'); if (hint) hint.remove();
    say(`${demo.text} = ${demo.answer}. Now you try, I'll help.`);
    const ctl = el('div', 'mn-controls');
    ctl.append(actionBtn('replay', '🔄 Watch again', 'mn-btn-ghost'), actionBtn('guided', 'Now you try →', 'mn-btn-main'));
    contentEl.appendChild(ctl);
  }
}

function actionBtn(action, label, cls) {
  const b = el('button', 'mn-btn ' + (cls || '')); b.type = 'button'; b.dataset.action = action; b.textContent = label; return b;
}

function startGuided() {
  phase = 'guided';
  clearContent(); showPad(true);
  setTracker(phaseTracker('guided'));
  guided = trick.gen();
  stepIdx = 0; attempts = 0;
  contentEl.appendChild(el('div', 'mn-problem mn-problem-big', `<span class="mn-expr">${guided.text}</span>`));
  contentEl.appendChild(el('div', 'mn-steps'));
  showGuidedStep();
}

function showGuidedStep() {
  const step = guided.steps[stepIdx];
  const list = contentEl.querySelector('.mn-steps');
  const node = stepNode(step, false);
  node.classList.add('mn-step-in');
  list.appendChild(node);
  attempts = 0; buffer = ''; locked = false;
  say(step.say);
  node.scrollIntoView({ block: 'nearest' });
}

function submitGuided() {
  if (locked || !buffer) return;
  const step = guided.steps[stepIdx];
  const value = parseInt(buffer, 10);
  const box = answerBox();
  const finish = () => {
    box.classList.remove('mn-live', 'mn-empty');
    stepIdx++;
    if (stepIdx < guided.steps.length) timers.later(showGuidedStep, 700);
    else {
      locked = true;
      timers.later(() => {
        say(`${guided.text} = ${guided.answer}. You did the trick yourself!`);
        const ctl = el('div', 'mn-controls');
        ctl.append(actionBtn('solo', 'Solo time →', 'mn-btn-main'));
        contentEl.appendChild(ctl);
        ctl.scrollIntoView({ block: 'nearest' });
        showPad(false);
      }, 500);
    }
  };
  if (value === step.value) {
    locked = true;
    box.textContent = String(value); box.classList.add('mn-ok');
    playCorrectDing(); burstAt(box, 1);
    finish();
  } else {
    attempts++;
    playWrongBoop(); shake(box);
    if (attempts >= 2) {
      locked = true;
      box.textContent = String(step.value); box.classList.add('mn-reveal');
      say(`${step.expr} = ${step.value}. Keep going!`);
      finish();
    } else {
      buffer = ''; renderBuffer();
      say(`Work out ${step.expr}.`);
    }
  }
}

function startSolo() {
  phase = 'solo';
  solo = Array.from({ length: SOLO_PROBLEMS }, () => trick.gen());
  sIdx = 0; soloCorrect = 0; peeks = 0;
  showPad(true);
  renderSolo();
}

function renderSolo() {
  clearContent();
  attempts = 0; peekIdx = 0; peekedThis = false;
  setTracker(phaseTracker('solo') + progressHtml(solo.length, sIdx));
  const p = solo[sIdx];
  say(sIdx === 0 ? 'Your turn. Use the trick!' : pick(['Next one!', 'Keep it up.', 'Ninja focus.']));
  const row = el('div', 'mn-problem');
  row.append(el('span', 'mn-expr', p.text), el('span', 'mn-eq', '='), el('span', 'mn-answer mn-live mn-empty', '?'));
  contentEl.appendChild(row);
  const ctl = el('div', 'mn-controls mn-controls-left');
  ctl.appendChild(actionBtn('peek', '👀 Show a step', 'mn-btn-ghost'));
  contentEl.appendChild(ctl);
  contentEl.appendChild(el('div', 'mn-steps mn-steps-peek'));
}

function peekStep() {
  const p = solo[sIdx];
  if (peekIdx >= p.steps.length - 1) return;   // never reveal the final answer by peeking
  if (!peekedThis) { peekedThis = true; peeks++; }
  const list = contentEl.querySelector('.mn-steps-peek');
  const node = stepNode(p.steps[peekIdx], true);
  node.classList.add('mn-step-in');
  list.appendChild(node);
  playBubblePop(3);
  peekIdx++;
  if (peekIdx >= p.steps.length - 1) { const b = contentEl.querySelector('[data-action="peek"]'); if (b) b.disabled = true; }
}

function submitSolo() {
  if (locked || !buffer) return;
  const p = solo[sIdx];
  const value = parseInt(buffer, 10);
  const box = answerBox();
  if (value === p.answer) {
    locked = true;
    if (attempts === 0 && !peekedThis) soloCorrect++;
    box.classList.add('mn-ok');
    playCorrectDing(); burstAt(box, 2);
    say(pick(['Yes!', 'Sneaky and fast.', 'That is the trick!']));
    timers.later(nextSolo, 900);
  } else {
    attempts++;
    playWrongBoop(); shake(box);
    if (attempts >= 2) {
      locked = true;
      box.textContent = String(p.answer); box.classList.add('mn-reveal');
      const list = contentEl.querySelector('.mn-steps-peek');
      list.innerHTML = '';
      p.steps.forEach(s => list.appendChild(stepNode(s, true)));
      say(`It's ${p.answer}. Here is how the trick goes.`);
      timers.later(nextSolo, 2600);
    } else {
      buffer = ''; renderBuffer();
      say('Almost. Try the trick step by step.');
    }
  }
}

function nextSolo() {
  sIdx++;
  if (sIdx >= solo.length) { endLesson(); return; }
  renderSolo();
}

function endLesson() {
  const stars = (soloCorrect === solo.length && peeks === 0) ? 3 : soloCorrect >= 3 ? 2 : 1;
  const key = starsKeyTrick(trick.id);
  if (stars > local.getInt(key)) local.set(key, stars);
  screen = 'end'; showPad(false);
  playWinFanfare();
  burstAt(contentEl, 5);
  say(stars === 3 ? 'Flawless! That trick is yours forever.' : stars === 2 ? 'Great! Try once more for three stars.' : 'Trick learned. Practice makes it fast.');
  const i = TRICKS.indexOf(trick);
  const next = TRICKS[i + 1];
  showEndcard({
    title: trick.name,
    stats: `${soloCorrect} of ${solo.length} solo, ${peeks ? peeks + ' peek' + (peeks > 1 ? 's' : '') : 'no peeks'}`,
    stars,
    primary: next ? { action: 'trick:' + next.id, label: 'Next trick →' } : { action: 'mode-tricks', label: 'All tricks' },
    secondary: { action: 'trick:' + trick.id, label: 'Try again' }
  });
}

// ===== End card =====

function showEndcard({ title, stats, stars, primary, secondary }) {
  endPrimary = primary.action;
  celebrateEl.innerHTML = '';
  const card = el('div', 'mn-endcard');
  const trophy = el('div', 'mn-endcard-emoji'); trophy.appendChild(emoji(stars === 3 ? '🏆' : '🌟'));
  card.append(trophy, el('div', 'mn-endcard-title', title), el('div', 'mn-endcard-stars', starsHtml(stars)), el('div', 'mn-endcard-stats', stats));
  const actions = el('div', 'mn-endcard-actions');
  actions.append(actionBtn(primary.action, primary.label, 'mn-btn-main'), actionBtn(secondary.action, secondary.label, 'mn-btn-ghost'));
  card.appendChild(actions);
  const share = el('button', 'endcard-share-btn', `<img src="${getEmojiUrl('📤')}" class="emoji-img btn-emoji" alt="📤"> Share with a parent`);
  share.type = 'button'; share.dataset.share = '';
  card.appendChild(share);
  wireEndcardShare(card);
  celebrateEl.appendChild(card);
  timers.later(() => celebrateEl.classList.add('mn-show'), 20);
}

function wireEndcardShare(container) {
  const btn = container.querySelector('[data-share]');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const result = await shareOrCopy();
    if (result.method === 'copy' && result.success) {
      btn.innerHTML = '<img src="' + getEmojiUrl('✅') + '" class="emoji-img btn-emoji" alt="✅"> Copied!';
      timers.later(() => { btn.innerHTML = '<img src="' + getEmojiUrl('📤') + '" class="emoji-img btn-emoji" alt="📤"> Share with a parent'; }, 2500);
    }
  });
  btn.addEventListener('touchend', (e) => e.stopPropagation());
}

// ===== Input =====

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function padWanted() {
  return screen === 'play' || (screen === 'lesson' && (phase === 'guided' || phase === 'solo'));
}

function onDigit(d) {
  if (!padWanted() || locked) return;
  if (buffer.length >= MAX_DIGITS) return;
  if (buffer === '0') buffer = '';
  buffer += d;
  renderBuffer();
  playBubblePop(6);
}
function onBackspace() {
  if (!padWanted() || locked) return;
  buffer = buffer.slice(0, -1);
  renderBuffer();
}
function onSubmit() {
  if (!padWanted() || locked) return;
  if (screen === 'play') submitBasics();
  else if (phase === 'guided') submitGuided();
  else if (phase === 'solo') submitSolo();
}

function doAction(action) {
  initAudio();
  if (action === 'back') {
    if (screen === 'mode') return;
    if (screen === 'basics' || screen === 'tricks') showMode();
    else if (screen === 'play') showBasicsGrid();
    else if (screen === 'lesson') showTricksGrid();
    else if (screen === 'end') (level && !trick ? showBasicsGrid : showTricksGrid)();
    playCardSwoosh();
    return;
  }
  if (action === 'mode-basics') { trick = null; showBasicsGrid(); return; }
  if (action === 'mode-tricks') { level = null; showTricksGrid(); return; }
  if (action.startsWith('level:')) { trick = null; const lv = BASIC_LEVELS.find(l => l.id === +action.slice(6)); if (lv) startLevel(lv); return; }
  if (action.startsWith('trick:')) { level = null; const t = TRICKS.find(x => x.id === action.slice(6)); if (t) startLesson(t); return; }
  if (action === 'showme') { const p = problems[pIdx]; const vis = contentEl.querySelector('.mn-visual'); if (p && vis) { visualOn = true; drawVisual(vis, p.visual); } return; }
  if (action === 'skip') { if (screen === 'lesson' && phase === 'watch') revealStep(); return; }
  if (action === 'replay') { startWatch(); return; }
  if (action === 'guided') { startGuided(); return; }
  if (action === 'solo') { startSolo(); return; }
  if (action === 'peek') { peekStep(); return; }
}

function onPointer(e) {
  if (screen === 'idle' || screen === 'loading') return;
  const t = e.target;
  if (!t || !t.closest) return;
  if (t.closest('.endcard-share-btn')) return;          // uses click
  const key = t.closest('[data-key]');
  if (key) { e.preventDefault(); const k = key.dataset.key; if (k === 'back') onBackspace(); else if (k === 'ok') onSubmit(); else onDigit(k); return; }
  const act = t.closest('[data-action]');
  if (act) { e.preventDefault(); doAction(act.dataset.action); }
}

// ===== Cleanup =====

function cleanup() {
  timers.clearAll();
  watchTimer = null;
  if (gameEl) {
    gameEl.removeEventListener('pointerdown', onPointer);
    gameEl.innerHTML = '';
    gameEl.classList.remove('mn-has-pad');
  }
  titleEl = backBtn = trackerEl = bubbleEl = contentEl = padEl = celebrateEl = null;
  screen = 'idle'; buffer = ''; locked = false; streak = 0; endPrimary = null;
  level = null; problems = []; pIdx = 0; misses = 0; attempts = 0; visualOn = false;
  trick = null; phase = 'watch'; demo = null; stepIdx = 0;
  guided = null; solo = []; sIdx = 0; soloCorrect = 0; peeks = 0; peekIdx = 0; peekedThis = false;
}

// ===== Exported Game Module =====

export const mathNinja = {
  id: 'math-ninja',

  start() {
    gameEl = document.getElementById('mathGame');
    gameEl.style.display = 'flex';
    screen = 'loading';
    gameEl.addEventListener('pointerdown', onPointer);   // bound before the preload so stop() can always remove it
    const mySession = ++sessionId;
    preloadEmojis(EMOJI_REGISTRY['math-ninja'] || []).then(() => {
      if (mySession !== sessionId || screen !== 'loading') return;   // stopped while loading
      buildDOM();
      showMode();
    });
  },

  stop() {
    if (gameEl) gameEl.style.display = 'none';
    cleanup();
  },

  onKey(e) {
    if (e.repeat) return;
    if (screen === 'idle' || screen === 'loading') return;
    if (screen === 'end') {
      if ((e.key === 'Enter' || e.key === ' ') && endPrimary) doAction(endPrimary);
      return;
    }
    if (screen === 'lesson' && phase === 'watch') {
      if (e.key === ' ' || e.key === 'Enter') revealStep();
      return;
    }
    if (/^[0-9]$/.test(e.key)) onDigit(e.key);
    else if (e.key === 'Backspace') onBackspace();
    else if (e.key === 'Enter') onSubmit();
  },

  // Pointer input is handled by the delegated pointerdown in start()
  onMouse() {},
  onTouch() {}
};
