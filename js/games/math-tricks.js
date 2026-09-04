/* =========================================================
 *  Math Ninja — problem data
 *  BASIC_LEVELS: levelled + − × ÷ practice with visual hints
 *  TRICKS: 20 mental-math shortcuts, each with a generator that
 *  only produces numbers the trick applies to, and the list of
 *  intermediate steps the Guided phase asks for.
 * ========================================================= */

const rnd  = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const pickNot = (arr, not) => { let v = pick(arr); while (v === not && arr.length > 1) v = pick(arr); return v; };

// ===== Number Basics =====
// Problem: { text, answer, visual }   visual: {type:'tenframe',a,b} | {type:'takeaway',a,b}
//                                             | {type:'array',rows,cols} | {type:'groups',groups,size} | null

function addTo10() {
  const a = rnd(1, 5), b = rnd(1, 10 - a);
  return { text: `${a} + ${b}`, answer: a + b, visual: { type: 'tenframe', a, b } };
}
function addTo20() {
  const a = rnd(3, 12), b = rnd(2, Math.min(9, 20 - a));
  return { text: `${a} + ${b}`, answer: a + b, visual: { type: 'tenframe', a, b } };
}
function subTo20() {
  const a = rnd(5, 20), b = rnd(1, a - 1);
  return { text: `${a} − ${b}`, answer: a - b, visual: { type: 'takeaway', a, b } };
}
function addTo100() {
  const a = rnd(12, 78), b = rnd(11, 99 - a);
  return { text: `${a} + ${b}`, answer: a + b, visual: null, hint: 'Tens first, then ones.' };
}
function subTo100() {
  const a = rnd(30, 99), b = rnd(11, a - 10);
  return { text: `${a} − ${b}`, answer: a - b, visual: null, hint: 'Count up from the small number.' };
}
function tables(set) {
  return () => {
    const n = rnd(1, 10), t = pick(set);
    const [rows, cols] = Math.random() < 0.5 ? [t, n] : [n, t];
    return { text: `${rows} × ${cols}`, answer: rows * cols, visual: { type: 'array', rows, cols } };
  };
}
function divide() {
  const d = rnd(2, 9), q = rnd(2, 10);
  return { text: `${d * q} ÷ ${d}`, answer: q, visual: { type: 'groups', groups: d, size: q } };
}
function mixed() {
  return pick([addTo100, subTo100, tables([3, 4, 6, 7, 8, 9]), divide])();
}

export const BASIC_LEVELS = [
  { id: 1,  name: 'Count to 10',   emoji: '🔢', sub: 'add',      gen: addTo10,  showVisual: true },
  { id: 2,  name: 'Add to 20',     emoji: '➕', sub: 'add',      gen: addTo20,  showVisual: true },
  { id: 3,  name: 'Take away',     emoji: '➖', sub: 'subtract', gen: subTo20,  showVisual: true },
  { id: 4,  name: 'Add to 100',    emoji: '💯', sub: 'add',      gen: addTo100, showVisual: false },
  { id: 5,  name: 'Big take away', emoji: '🧮', sub: 'subtract', gen: subTo100, showVisual: false },
  { id: 6,  name: '2 · 5 · 10',    emoji: '✖️', sub: 'tables',   gen: tables([2, 5, 10]),  showVisual: false },
  { id: 7,  name: '3 · 4 · 6',     emoji: '✖️', sub: 'tables',   gen: tables([3, 4, 6]),   showVisual: false },
  { id: 8,  name: '7 · 8 · 9',     emoji: '✖️', sub: 'tables',   gen: tables([7, 8, 9]),   showVisual: false },
  { id: 9,  name: 'Sharing out',   emoji: '➗', sub: 'divide',   gen: divide,   showVisual: false },
  { id: 10, name: 'Mixed dojo',    emoji: '🥋', sub: 'mixed',    gen: mixed,    showVisual: false },
];

export const PROBLEMS_PER_LEVEL = 8;

// ===== Ninja Tricks =====
// Each gen(fixed) returns { text, answer, steps: [{ say, expr, value }] }.
// `fixed` lets the Watch phase replay the canonical example from the lesson.

const S = (say, expr, value) => ({ say, expr, value });

export const TRICKS = [
  // ---------- ➕ Addition ----------
  {
    id: 'friendly', group: 'add', name: 'Friendly Numbers', emoji: '🤝',
    blurb: 'Round a tricky number to a ten, add, then give back the extra.',
    demo: { a: 48, b: 35 },
    gen(f = {}) {
      const a = f.a ?? rnd(2, 8) * 10 + pick([7, 8, 9]);
      const b = f.b ?? rnd(12, 45);
      const d = 10 - (a % 10), R = a + d, Ssum = R + b;
      return { text: `${a} + ${b}`, answer: a + b, steps: [
        S(`${a} is so close to ${R}. Round it up by ${d}.`, `${a} + ${d}`, R),
        S(`Now the sum is easy.`, `${R} + ${b}`, Ssum),
        S(`We borrowed ${d} to round up. Give it back.`, `${Ssum} − ${d}`, a + b),
      ] };
    }
  },
  {
    id: 'left-right', group: 'add', name: 'Left to Right', emoji: '👉',
    blurb: 'Add the tens first, then the ones, then join them.',
    demo: { a: 53, b: 36 },
    gen(f = {}) {
      const a = f.a ?? rnd(21, 68);
      const b = f.b ?? rnd(11, 99 - a);
      const ta = Math.floor(a / 10) * 10, tb = Math.floor(b / 10) * 10, oa = a % 10, ob = b % 10;
      return { text: `${a} + ${b}`, answer: a + b, steps: [
        S(`Tens first: ${ta} and ${tb}.`, `${ta} + ${tb}`, ta + tb),
        S(`Now the ones: ${oa} and ${ob}.`, `${oa} + ${ob}`, oa + ob),
        S(`Join them.`, `${ta + tb} + ${oa + ob}`, a + b),
      ] };
    }
  },
  {
    id: 'make-ten', group: 'add', name: 'Making Tens', emoji: '🔟',
    blurb: 'Borrow just enough from one number to make the other a ten.',
    demo: { a: 8, b: 7 },
    gen(f = {}) {
      let a = f.a ?? rnd(6, 9), b = f.b ?? rnd(5, 9);
      while (f.a == null && a + b <= 10) b = rnd(5, 9);
      const k = 10 - a, rest = b - k;
      return { text: `${a} + ${b}`, answer: a + b, steps: [
        S(`${a} needs a little to make 10. How much?`, `10 − ${a}`, k),
        S(`Take ${k} from ${b}.`, `${b} − ${k}`, rest),
        S(`Ten and ${rest}.`, `10 + ${rest}`, a + b),
      ] };
    }
  },
  {
    id: 'plus-nine', group: 'add', name: 'The Plus 9 Slide', emoji: '🛝',
    blurb: 'Adding 9? Add 10 and slide back one.',
    demo: { a: 67 },
    gen(f = {}) {
      const a = f.a ?? rnd(12, 90);
      return { text: `${a} + 9`, answer: a + 9, steps: [
        S(`Add 10 instead, that's easy.`, `${a} + 10`, a + 10),
        S(`Slide back one.`, `${a + 10} − 1`, a + 9),
      ] };
    }
  },
  {
    id: 'doubles-one', group: 'add', name: 'Doubles Plus One', emoji: '👯',
    blurb: 'Neighbours? Double the smaller one and add 1.',
    demo: { a: 7 },
    gen(f = {}) {
      const n = f.a ?? rnd(3, 12);
      return { text: `${n} + ${n + 1}`, answer: 2 * n + 1, steps: [
        S(`Double the smaller number.`, `${n} × 2`, 2 * n),
        S(`Add one more.`, `${2 * n} + 1`, 2 * n + 1),
      ] };
    }
  },

  // ---------- ➖ Subtraction ----------
  {
    id: 'add-up', group: 'sub', name: 'Add Up to Subtract', emoji: '🧗',
    blurb: 'Count up from the small number to the big one, like a shopkeeper giving change.',
    demo: { a: 84 },
    gen(f = {}) {
      let a = f.a ?? rnd(41, 89);
      while (f.a == null && a % 10 === 0) a = rnd(41, 89);
      const x = 10 - (a % 10), T = a + x, y = 100 - T;
      return { text: `100 − ${a}`, answer: 100 - a, steps: [
        S(`From ${a}, jump to the next ten, ${T}. How far?`, `${T} − ${a}`, x),
        S(`From ${T} up to 100.`, `100 − ${T}`, y),
        S(`Add the two jumps.`, `${x} + ${y}`, x + y),
      ] };
    }
  },
  {
    id: 'shift', group: 'sub', name: 'Shift Both Numbers', emoji: '↔️',
    blurb: 'Move both numbers by the same amount so there is no borrowing.',
    demo: { a: 72, b: 39 },
    gen(f = {}) {
      const b = f.b ?? rnd(1, 6) * 10 + pick([7, 8, 9]);
      const a = f.a ?? rnd(b + 12, 99);
      const d = 10 - (b % 10);
      return { text: `${a} − ${b}`, answer: a - b, steps: [
        S(`Add ${d} to both. ${a} becomes…`, `${a} + ${d}`, a + d),
        S(`…and ${b} becomes a round ten.`, `${b} + ${d}`, b + d),
        S(`Same gap, easier numbers.`, `${a + d} − ${b + d}`, a - b),
      ] };
    }
  },
  {
    id: 'from-1000', group: 'sub', name: 'All from 9, Last from 10', emoji: '🎯',
    blurb: 'Taking from 1,000? Each digit from 9, the last one from 10.',
    demo: { a: 436 },
    gen(f = {}) {
      let n = f.a ?? rnd(101, 899);
      while (f.a == null && n % 10 === 0) n = rnd(101, 899);
      const h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, u = n % 10;
      return { text: `1000 − ${n}`, answer: 1000 - n, steps: [
        S(`Hundreds digit from 9.`, `9 − ${h}`, 9 - h),
        S(`Tens digit from 9.`, `9 − ${t}`, 9 - t),
        S(`Last digit from 10.`, `10 − ${u}`, 10 - u),
        S(`Read the three answers as one number.`, `${9 - h} ${9 - t} ${10 - u}`, 1000 - n),
      ] };
    }
  },
  {
    id: 'minus-nine', group: 'sub', name: 'The Minus 9 Loop', emoji: '➿',
    blurb: 'Taking 9? Take 10 and give one back.',
    demo: { a: 54 },
    gen(f = {}) {
      const a = f.a ?? rnd(20, 99);
      return { text: `${a} − 9`, answer: a - 9, steps: [
        S(`Take 10 instead.`, `${a} − 10`, a - 10),
        S(`That was one too many. Give it back.`, `${a - 10} + 1`, a - 9),
      ] };
    }
  },
  {
    id: 'parts', group: 'sub', name: 'Drop to a Ten', emoji: '🪜',
    blurb: 'Take away in two easy pieces: first down to a ten, then the rest.',
    demo: { a: 83, b: 15 },
    gen(f = {}) {
      let a = f.a ?? rnd(31, 99);
      while (f.a == null && a % 10 === 0) a = rnd(31, 99);
      const o = a % 10;
      const b = f.b ?? rnd(o + 1, Math.min(29, a - 1));
      return { text: `${a} − ${b}`, answer: a - b, steps: [
        S(`First take ${o} to land on a ten.`, `${a} − ${o}`, a - o),
        S(`How much is still left to take?`, `${b} − ${o}`, b - o),
        S(`Now take the rest.`, `${a - o} − ${b - o}`, a - b),
      ] };
    }
  },

  // ---------- ✖️ Multiplication ----------
  {
    id: 'double-halve', group: 'mul', name: 'Double and Halve', emoji: '⚖️',
    blurb: 'Halve one number, double the other. Same answer, easier sum.',
    demo: { a: 14, b: 15 },
    gen(f = {}) {
      const a = f.a ?? rnd(6, 12) * 2;
      const b = f.b ?? pick([15, 25, 35]);
      return { text: `${a} × ${b}`, answer: a * b, steps: [
        S(`Halve ${a}.`, `${a} ÷ 2`, a / 2),
        S(`Double ${b}.`, `${b} × 2`, b * 2),
        S(`Multiply the easy pair.`, `${a / 2} × ${b * 2}`, a * b),
      ] };
    }
  },
  {
    id: 'eleven', group: 'mul', name: 'The 11 Rule', emoji: '🪄',
    blurb: 'Two digits times 11: put their sum in the middle.',
    demo: { a: 35 },
    gen(f = {}) {
      let n = f.a;
      if (n == null) { const t = rnd(1, 8), o = rnd(1, 9 - t); n = t * 10 + o; }
      const t = Math.floor(n / 10), o = n % 10;
      return { text: `${n} × 11`, answer: n * 11, steps: [
        S(`Add the two digits, ${t} and ${o}.`, `${t} + ${o}`, t + o),
        S(`Put that in the middle: ${t} _ ${o}.`, `${t} ${t + o} ${o}`, n * 11),
      ] };
    }
  },
  {
    id: 'times-five', group: 'mul', name: 'Times 5', emoji: '⚡',
    blurb: 'Halve the number, then times 10.',
    demo: { a: 24 },
    gen(f = {}) {
      const n = f.a ?? rnd(6, 49) * 2;
      return { text: `${n} × 5`, answer: n * 5, steps: [
        S(`Halve it.`, `${n} ÷ 2`, n / 2),
        S(`Times 10, just add a zero.`, `${n / 2} × 10`, n * 5),
      ] };
    }
  },
  {
    id: 'times-nine', group: 'mul', name: 'Times 9', emoji: '🌟',
    blurb: 'Times 10, then take one group away.',
    demo: { a: 7 },
    gen(f = {}) {
      const n = f.a ?? rnd(3, 12);
      return { text: `${n} × 9`, answer: n * 9, steps: [
        S(`Times 10 first.`, `${n} × 10`, n * 10),
        S(`Take away one ${n}.`, `${n * 10} − ${n}`, n * 9),
      ] };
    }
  },
  {
    id: 'double-double', group: 'mul', name: 'Double-Double (×4)', emoji: '🎊',
    blurb: 'Times 4 is just doubling twice.',
    demo: { a: 18 },
    gen(f = {}) {
      const n = f.a ?? rnd(6, 25);
      return { text: `${n} × 4`, answer: n * 4, steps: [
        S(`Double it.`, `${n} × 2`, n * 2),
        S(`Double it again.`, `${n * 2} × 2`, n * 4),
      ] };
    }
  },
  {
    id: 'times-fifteen', group: 'mul', name: 'Times 15', emoji: '🕒',
    blurb: 'Times 10, add half of that.',
    demo: { a: 22 },
    gen(f = {}) {
      const n = f.a ?? rnd(6, 15) * 2;
      return { text: `${n} × 15`, answer: n * 15, steps: [
        S(`Times 10.`, `${n} × 10`, n * 10),
        S(`Half of that.`, `${n * 10} ÷ 2`, n * 5),
        S(`Add them together.`, `${n * 10} + ${n * 5}`, n * 15),
      ] };
    }
  },
  {
    id: 'square-five', group: 'mul', name: 'Squares ending in 5', emoji: '🟦',
    blurb: 'First digit times the next number, then stick 25 on the end.',
    demo: { a: 3 },
    gen(f = {}) {
      const n = f.a ?? rnd(1, 9), N = n * 10 + 5;
      return { text: `${N} × ${N}`, answer: N * N, steps: [
        S(`Multiply ${n} by the next number up, ${n + 1}.`, `${n} × ${n + 1}`, n * (n + 1)),
        S(`Attach 25 to the end.`, `${n * (n + 1)} 25`, N * N),
      ] };
    }
  },

  // ---------- ➗ Division ----------
  {
    id: 'div-five', group: 'div', name: 'Divide by 5', emoji: '🍕',
    blurb: 'Double the number, then divide by 10.',
    demo: { a: 145 },
    gen(f = {}) {
      const n = f.a ?? rnd(13, 99) * 5;
      return { text: `${n} ÷ 5`, answer: n / 5, steps: [
        S(`Double it.`, `${n} × 2`, n * 2),
        S(`Divide by 10, just drop the zero.`, `${n * 2} ÷ 10`, n / 5),
      ] };
    }
  },
  {
    id: 'half-half', group: 'div', name: 'Half-Half (÷4)', emoji: '🔪',
    blurb: 'Divide by 4 by halving twice.',
    demo: { a: 112 },
    gen(f = {}) {
      const n = f.a ?? rnd(12, 49) * 4;
      return { text: `${n} ÷ 4`, answer: n / 4, steps: [
        S(`Halve it.`, `${n} ÷ 2`, n / 2),
        S(`Halve it again.`, `${n / 2} ÷ 2`, n / 4),
      ] };
    }
  },
  {
    id: 'chunking', group: 'div', name: 'Chunking', emoji: '🧩',
    blurb: 'Split a big number into two friendly chunks and divide each.',
    demo: { d: 6, k: 2, m: 2 },
    gen(f = {}) {
      const d = f.d ?? rnd(3, 9), k = f.k ?? rnd(1, 4), m = f.m ?? rnd(1, 9);
      const big = d * 10 * k, small = d * m, n = big + small;
      return { text: `${n} ÷ ${d}`, answer: 10 * k + m, steps: [
        S(`Split ${n} into ${big} and ${small}. Divide the big chunk.`, `${big} ÷ ${d}`, 10 * k),
        S(`Now the small chunk.`, `${small} ÷ ${d}`, m),
        S(`Add the two answers.`, `${10 * k} + ${m}`, 10 * k + m),
      ] };
    }
  },
];

export const TRICK_GROUPS = [
  { id: 'add', name: 'Addition',       emoji: '➕' },
  { id: 'sub', name: 'Subtraction',    emoji: '➖' },
  { id: 'mul', name: 'Multiplication', emoji: '✖️' },
  { id: 'div', name: 'Division',       emoji: '➗' },
];

export const SOLO_PROBLEMS = 5;
