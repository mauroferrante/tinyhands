let audioCtx = null;

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playPop(now) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600 + Math.random() * 400, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

function playBoing(now) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  const base = 300 + Math.random() * 200;
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.exponentialRampToValueAtTime(base * 2, now + 0.05);
  osc.frequency.exponentialRampToValueAtTime(base * 0.8, now + 0.15);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}

function playChime(now) {
  const notes = [523, 587, 659, 698, 784, 880];
  const freq = notes[Math.floor(Math.random() * notes.length)];
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

function playBubble(now) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  const base = 200 + Math.random() * 300;
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.exponentialRampToValueAtTime(base * 1.8, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(base * 1.2, now + 0.15);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

export function playRandomSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const type = Math.floor(Math.random() * 4);
  switch (type) {
    case 0: playPop(now); break;
    case 1: playBoing(now); break;
    case 2: playChime(now); break;
    case 3: playBubble(now); break;
  }
}

export function playFanfare() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    gain.gain.setValueAtTime(0, now + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.4);
  });
  setTimeout(() => {
    [523, 659, 784, 1047, 1319].forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.6);
    });
  }, 400);
}

export function playThud() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120 + Math.random() * 60, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(80, now);
  gain2.gain.setValueAtTime(0.05, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(now);
  osc2.stop(now + 0.08);
}

export function playCrash() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  for (let i = 0; i < 5; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(400 - i * 60 + Math.random() * 50, now + i * 0.05);
    osc.frequency.exponentialRampToValueAtTime(60, now + i * 0.05 + 0.3);
    gain.gain.setValueAtTime(0.06, now + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.05);
    osc.stop(now + i * 0.05 + 0.3);
  }
}

export function playSnap() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

export function playPerfectDing() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.setValueAtTime(0.15, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

export function playStreakChime() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0.12, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.2);
  });
}

export function playWinFanfare() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0.15, now + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.4);
  });
  setTimeout(() => {
    if (!audioCtx) return;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.8);
    });
  }, 500);
}

export function playWhoosh() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.18);
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(400, now);
  osc2.frequency.exponentialRampToValueAtTime(100, now + 0.12);
  gain2.gain.setValueAtTime(0.04, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(now);
  osc2.stop(now + 0.12);
}

export function playCreak() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  const base = 80 + Math.random() * 40;
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.setValueAtTime(base * 1.3, now + 0.05);
  osc.frequency.setValueAtTime(base * 0.9, now + 0.1);
  osc.frequency.setValueAtTime(base * 1.1, now + 0.15);
  gain.gain.setValueAtTime(0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

export function playPerfectClick() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(2000, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

export function playHeightPing(height) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const baseFreq = 300 + height * 40;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, now + 0.1);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

export function playDangerBuzz() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(60, now);
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.setValueAtTime(0.04, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

export function playBounce() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(250, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.03);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

// ===== Crowd Sounds (Stack It Up Audience) =====

export function playCrowdCheer() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const voices = [
    { type: 'sawtooth', freq: 200, wobble: 15 },
    { type: 'sine',     freq: 350, wobble: 20 },
    { type: 'triangle', freq: 500, wobble: 25 }
  ];
  voices.forEach(v => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = v.type;
    osc.frequency.setValueAtTime(v.freq, now);
    osc.frequency.setValueAtTime(v.freq + v.wobble, now + 0.05);
    osc.frequency.setValueAtTime(v.freq - v.wobble, now + 0.1);
    osc.frequency.setValueAtTime(v.freq + v.wobble * 0.5, now + 0.15);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.setValueAtTime(0.05, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  });
}

export function playCrowdGasp() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const freqs = [400, 500, 600];
  freqs.forEach(f => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.5, now + 0.25);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  });
}

// ===== Spell It Out Sounds =====

export function playCorrectDing() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  // Bright ascending two-note: satisfying reward
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(600, now);
  gain1.gain.setValueAtTime(0.14, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc1.connect(gain1).connect(audioCtx.destination);
  osc1.start(now);
  osc1.stop(now + 0.15);
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(800, now + 0.1);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.14, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(now + 0.1);
  osc2.stop(now + 0.3);
}

export function playWrongBoop() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  // Gentle descending two-note: soft "oops"
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(400, now);
  gain1.gain.setValueAtTime(0.1, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc1.connect(gain1).connect(audioCtx.destination);
  osc1.start(now);
  osc1.stop(now + 0.12);
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(300, now + 0.08);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.1, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.22);
}

export function playLifeLost() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  // Low triangle wave with downward pitch bend: subtle "wah"
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.25);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

export function playSpellWhoosh() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  // Short filtered noise-like burst: subtle transition
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

export function playCrowdRoar() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const voices = [
    { type: 'sawtooth', base: 180 },
    { type: 'sine',     base: 300 },
    { type: 'triangle', base: 450 },
    { type: 'sine',     base: 600 }
  ];
  voices.forEach((v, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = v.type;
    osc.frequency.setValueAtTime(v.base, now + i * 0.05);
    osc.frequency.linearRampToValueAtTime(v.base * 1.3, now + 0.5);
    osc.frequency.linearRampToValueAtTime(v.base * 1.1, now + 0.8);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + i * 0.05 + 0.1);
    gain.gain.setValueAtTime(0.05, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.05);
    osc.stop(now + 1.0);
  });
}
