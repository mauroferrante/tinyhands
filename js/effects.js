import { preloadEmojis, createEmojiImg } from './emoji.js';
import { EMOJI_REGISTRY } from './emoji-registry.js';

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

const BG_EMOJIS = ['😀','🍕','🍩','🎈','🐸','🦁','🦄','🐝','🎲','🐱','🚀'];

export function createBgEmojis(landingEl) {
  // Preload BG emojis, then place them
  preloadEmojis(BG_EMOJIS).then(() => {
    const shuffled = [...BG_EMOJIS].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i++) {
      const el = document.createElement('span');
      el.className = 'bg-emoji';
      const emojiSize = (1.8 + Math.random() * 1.5);
      const img = createEmojiImg(shuffled[i], 'emoji-img');
      img.style.width = emojiSize + 'rem';
      img.style.height = emojiSize + 'rem';
      el.appendChild(img);
      const onLeft = i % 2 === 0;
      el.style.left = onLeft
        ? (2 + Math.random() * 10) + '%'
        : (88 + Math.random() * 10) + '%';
      el.style.top  = (5 + Math.random() * 85) + '%';
      el.style.animationDuration = (4 + Math.random() * 4) + 's';
      el.style.animationDelay    = (Math.random() * 4) + 's';
      document.body.appendChild(el);
    }
  });
}
