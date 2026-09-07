import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { TRICKS, TRICK_GROUPS } from '../js/games/math-tricks.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let md = `---
title: 20 Mental Math Tricks for Kids, Explained Step by Step
slug: mental-math-tricks-for-kids
seoTitle: 20 Mental Math Tricks for Kids, Explained
description: The twenty mental-arithmetic shortcuts taught in Math Ninja, each with a worked example and the reason it works. For ages 7 to 10.
game: math-ninja
date: 2026-09-07
---

# 20 mental math tricks for kids, explained step by step

Most adults do arithmetic in their heads with a handful of shortcuts they picked up without noticing: rounding to a friendly number, adding ten and taking one back, doubling and halving. Children are rarely taught these on purpose. They are taught the written method, column by column, and left to discover the shortcuts on their own, or not.

This guide lists the twenty tricks taught in [Math Ninja](/games/math-ninja/), a free game on this site, in the order the game teaches them. Each one has a worked example and, more importantly, the reason it works. A trick a child can explain is a trick they will still have at forty. Every example below is the one the game uses in its Watch phase, so a parent reading this and a child playing the game are looking at the same numbers.

> **How to use this with a child.** Pick one trick. Say the steps out loud together three or four times with different numbers. Then ask them to explain it back to you. If they can say *why* it works, move on. If they can only say *what* to do, stay a day longer.

`;
function W() {}
const WHY = {
  friendly: "*Why it works:* adding 2 to one number and taking 2 off the answer cancels out. We just moved the awkward part to the end, where it is a single easy step.",
  'left-right': "*Why it works:* addition can happen in any order. Tens plus tens, then ones plus ones, is the written method turned sideways, and it keeps the big numbers in view so the answer is roughly right from the first step.",
  'make-ten': "*Why it works:* 8 + 7 and 10 + 5 are the same total; we only moved 2 from one pile to the other. Ten is easy to add to anything, so the whole job becomes finding how much a number needs to reach ten.",
  'plus-nine': "*Why it works:* 9 is one less than 10. Adding 10 is a single digit change, so add the easy number and correct by one.",
  'doubles-one': "*Why it works:* neighbouring numbers are a double plus one. Children tend to know their doubles cold, so 7 + 8 becomes a fact they already own plus one.",
  'add-up': "*Why it works:* the gap between two numbers is the same whichever way you walk it. Counting up in friendly jumps avoids borrowing altogether, and it is exactly how a shopkeeper counts change.",
  shift: "*Why it works:* adding the same amount to both numbers leaves the difference unchanged (73 and 40 are as far apart as 72 and 39). We chose the shift that turns the bottom number into a round ten.",
  'from-1000': "*Why it works:* 1000 = 999 + 1. Subtracting from 999 never needs borrowing (every digit is a 9), and the extra 1 is handled by taking the last digit from 10 instead of 9.",
  'minus-nine': "*Why it works:* 9 is one less than 10. Taking 10 is easy, but that removes one too many, so put one back.",
  parts: "*Why it works:* subtracting in two steps is the same as subtracting all at once. The first step lands on a round ten, and taking things away from a round ten is easy.",
  'double-halve': "*Why it works:* halving one factor and doubling the other leaves the product unchanged (14 × 15 and 7 × 30 are both 210). It turns an awkward pair into a pair with a round number in it.",
  eleven: "*Why it works:* 35 × 11 = 35 × 10 + 35 = 350 + 35. Writing that addition digit by digit puts 3 in the hundreds, 3 + 5 in the tens and 5 in the ones. When the two digits add to more than 9, carry the 1 into the first digit.",
  'times-five': "*Why it works:* 5 is half of 10. Halving first and then adding a zero does the same job as multiplying by 5 in one step, without any tables.",
  'times-nine': "*Why it works:* 9 groups is 10 groups minus one group. Times ten is a zero on the end, then take one copy of the number away.",
  'double-double': "*Why it works:* 4 = 2 × 2. Doubling twice multiplies by four, and doubling is something children do without thinking.",
  'times-fifteen': "*Why it works:* 15 = 10 + 5, and 5 is half of 10. So times 15 is times 10 plus half of that.",
  'square-five': "*Why it works:* (10n + 5)² = 100·n·(n+1) + 25. The algebra is for the grown-ups; the child just needs the pattern, and it works for every number ending in 5.",
  'div-five': "*Why it works:* dividing by 5 is the same as dividing by 10 and doubling, because 5 = 10 ÷ 2. Doubling first keeps everything in whole numbers.",
  'half-half': "*Why it works:* 4 = 2 × 2, so dividing by 4 is halving twice. Halving is easier than dividing, even for large numbers.",
  chunking: "*Why it works:* division shares out a total, and the total can be split into any convenient pieces first. Choose a big chunk that is an easy multiple of the divisor, then handle the small remainder."
};

const names = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division' };
let n = 0;
for (const g of TRICK_GROUPS) {
  md += `## ${g.emoji} ${names[g.id]}\n\n`;
  for (const t of TRICKS.filter(t => t.group === g.id)) {
    n++;
    const d = t.gen(t.demo || {});
    md += `### ${n}. ${t.name}\n\n${t.blurb}\n\n**Example: ${d.text} = ${d.answer}**\n\n`;
    d.steps.forEach((s, i) => { md += `${i + 1}. ${s.say} **${s.expr} = ${s.value}**\n`; });
    md += `\n${WHY[t.id]}\n\n`;
  }
}
md += `## Which tricks to teach first

Start with the ones that lean on tens: making tens, plus 9, minus 9, and friendly numbers. They build the single most useful idea in mental arithmetic, that ten is the place to stand. Doubles, times 4 and times 5 come next, because doubling and halving feel like a game. Leave the 11 rule and squaring numbers ending in 5 for last; they are the party tricks, and they land better once a child trusts the others.

Math Ninja teaches each trick three ways: watch a worked example, do one together with each step filled in, then five on your own. Stars are saved per trick, so a child can see the twenty light up over a few weeks.
`;
fs.writeFileSync(path.join(ROOT, 'content/guides/mental-math-tricks-for-kids.md'), md);
console.log('wrote guide with', n, 'tricks');
