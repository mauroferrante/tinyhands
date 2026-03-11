/* =========================================================
 *  Parallax Hero — 3-layer mouse-tracking + sparkle particles
 *  BG layer (+depth)  → moves WITH mouse
 *  MID layer (-depth)  → moves slightly opposite
 *  FG layer (-depth)  → moves strongly opposite
 *
 *  CSS heroBob animations run on <img> elements inside layers.
 *  JS translate3d runs on the .hero-layer wrapper divs.
 *  No conflict — different DOM targets.
 * ========================================================= */

const hero = document.getElementById('hero');

if (hero && !window.matchMedia('(pointer: coarse)').matches) {
  // ---- Parallax Engine ----
  const layers = hero.querySelectorAll('.hero-layer[data-depth]');
  let mx = 0, my = 0, ticking = false;

  hero.addEventListener('mousemove', onMouseMove, { passive: true });

  function onMouseMove(e) {
    const rect = hero.getBoundingClientRect();
    mx = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 → +0.5
    my = (e.clientY - rect.top) / rect.height - 0.5;

    if (!ticking) {
      requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }

  function applyParallax() {
    layers.forEach(layer => {
      const depth = parseFloat(layer.dataset.depth);
      // Positive depth → same direction as mouse (BG)
      // Negative depth → opposite direction (MID, FG)
      const x = mx * depth * 100;
      const y = my * depth * 100;
      layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
    ticking = false;
  }

  // ---- Melody Sparkle Particles ----
  const MAX_SPARKLES = 15;
  const SPARKLE_THROTTLE = 120; // ms between spawns
  let lastSparkle = 0;
  let sparkleCount = 0;

  hero.addEventListener('mousemove', onSparkle, { passive: true });

  function onSparkle(e) {
    const now = performance.now();
    if (now - lastSparkle < SPARKLE_THROTTLE) return;
    if (sparkleCount >= MAX_SPARKLES) return;
    lastSparkle = now;

    const span = document.createElement('span');
    span.className = 'hero-sparkle';
    span.textContent = '✨';
    span.style.left = e.clientX - hero.getBoundingClientRect().left + 'px';
    span.style.top = e.clientY - hero.getBoundingClientRect().top + 'px';
    hero.appendChild(span);
    sparkleCount++;

    span.addEventListener('animationend', () => {
      span.remove();
      sparkleCount--;
    }, { once: true });
  }
}
