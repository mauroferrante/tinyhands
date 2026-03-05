export const EMOJIS = [
  '😀','😺','🐶','🐱','🌳','🌻','🦋','🐠','🌈','🍎',
  '🚀','⭐','🎈','🐸','🦁','🐧','🎉','🌸','🐝','🍕',
  '🦄','🐢','🐬','🌙','🍩'
];

export const PARTICLE_COLORS = ['#FF6B8A','#7C5CFC','#FFB347','#4ECDC4','#FF85A1','#FFC75F','#845EC2','#00C9A7'];

export function spawnParticles(x, y, container) {
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const angle = (Math.PI * 2 / 8) * i + (Math.random() * 0.5);
    const dist  = 40 + Math.random() * 50;
    p.style.left = x + 'px';
    p.style.top  = y + 'px';
    p.style.setProperty('--px', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--py', Math.sin(angle) * dist + 'px');
    p.style.backgroundColor = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    p.style.width  = (6 + Math.random() * 6) + 'px';
    p.style.height = p.style.width;
    container.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}

export function createBgEmojis(landingEl) {
  const count = 12;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'bg-emoji';
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    el.style.left = Math.random() * 90 + 5 + '%';
    el.style.top  = Math.random() * 90 + 5 + '%';
    el.style.animationDuration = (4 + Math.random() * 4) + 's';
    el.style.animationDelay    = (Math.random() * 4) + 's';
    el.style.fontSize = (1.8 + Math.random() * 1.5) + 'rem';
    landingEl.appendChild(el);
  }
}
