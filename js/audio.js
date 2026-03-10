let audioCtx = null;
let iosUnlocked = false;

export function getAudioCtx() {
  if (!audioCtx) initAudio();
  return audioCtx;
}

// Lightweight helper: every play*() function calls this to
// recover from iOS suspending the AudioContext mid-game.
function ensureAudio() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    iosUnlocked = false;   // allow re-unlock on next user gesture
    audioCtx.resume().then(() => {
      if (audioCtx.state === 'running') iosUnlocked = true;
    }).catch(() => {});
  }
}

export function initAudio() {
  // Create context on very first call
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // iOS Safari can suspend the context at any time (notifications,
    // screen lock, app switch). Reset the unlock flag so the next
    // user-gesture call to initAudio() retries the silent-oscillator trick.
    audioCtx.addEventListener('statechange', () => {
      if (audioCtx.state === 'suspended') iosUnlocked = false;
    });
  }

  // Always try to resume if suspended
  ensureAudio();

  // iOS Safari requires an audio node to be started synchronously
  // inside a user-gesture handler to unlock audio output.
  // Keep retrying on each gesture until the context is confirmed running.
  if (!iosUnlocked) {
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.001;               // near-silent
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(0);
      osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) { /* ignore */ }

    if (audioCtx.state === 'running') {
      iosUnlocked = true;
    }
  }
}

/** True when AudioContext exists and is actively running (unlocked). */
export function isAudioReady() {
  return audioCtx !== null && audioCtx.state === 'running';
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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
  ensureAudio();
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

export function playStreakFanfare(level) {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Progressive fanfare: more notes & richer harmonics at higher levels
  // level 1 = 5-streak (3 notes), level 2 = 10-streak (4 notes + chord), level 3 = 20-streak (5 notes + big chord)
  const notesets = [
    [523, 659, 784],                        // 5-streak: C-E-G
    [523, 659, 784, 1047],                   // 10-streak: C-E-G-C
    [523, 587, 659, 784, 1047]               // 20-streak: C-D-E-G-C
  ];
  const notes = notesets[Math.min(level - 1, 2)];
  const vol = 0.1 + level * 0.02;
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.09);
    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(Math.min(vol, 0.18), now + i * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.35);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.09);
    osc.stop(now + i * 0.09 + 0.35);
  });
  // Add shimmer chord for level 2+
  if (level >= 2) {
    const delay = notes.length * 0.09 + 0.1;
    const chord = level >= 3 ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047];
    chord.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0, now + delay - 0.01);
      gain.gain.linearRampToValueAtTime(0.05, now + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.7);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.7);
    });
  }
}

export function playCrowdRoar() {
  if (!audioCtx) return;
  ensureAudio();
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

// ===== Memory Match Sounds =====

export function playCardFlip() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(1000 + Math.random() * 200, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

export function playMatchChime() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(659, now);
  gain1.gain.setValueAtTime(0.12, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc1.connect(gain1).connect(audioCtx.destination);
  osc1.start(now);
  osc1.stop(now + 0.15);
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880, now + 0.08);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.12, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.25);
}

export function playNoMatchBoop() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
  gain.gain.setValueAtTime(0.09, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

export function playCardSettle() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1500, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

export function playCardSwoosh() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // White noise burst shaped like a card swoosh
  const bufSize = audioCtx.sampleRate * 0.08;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  // Bandpass filter for papery texture
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(3000 + Math.random() * 1500, now);
  filter.Q.value = 0.8;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  noise.connect(filter).connect(gain).connect(audioCtx.destination);
  noise.start(now);
  noise.stop(now + 0.08);
}

export function playBubblePop(pitch = 0) {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  const base = 500 + pitch * 80;
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.exponentialRampToValueAtTime(base * 1.6, now + 0.04);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}

// ===== Balloon Float Sounds =====

export function playWindPuff() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const bufSize = Math.floor(audioCtx.sampleRate * 0.06);
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(4000 + Math.random() * 2000, now);
  filter.Q.value = 0.5;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  noise.connect(filter).connect(gain).connect(audioCtx.destination);
  noise.start(now);
  noise.stop(now + 0.06);
}

export function playStarCollect() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1047, now);
  gain1.gain.setValueAtTime(0.1, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc1.connect(gain1).connect(audioCtx.destination);
  osc1.start(now);
  osc1.stop(now + 0.1);
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1319, now + 0.06);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.1, now + 0.06);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(now + 0.06);
  osc2.stop(now + 0.18);
}

export function playUfoCollect() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Sci-fi warble: two detuned oscillators with vibrato
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = i === 2 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.07);
    // Add slight vibrato for sci-fi feel
    osc.frequency.setValueAtTime(freq * 1.02, now + i * 0.07 + 0.03);
    osc.frequency.setValueAtTime(freq * 0.98, now + i * 0.07 + 0.06);
    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0.08, now + i * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.07);
    osc.stop(now + i * 0.07 + 0.2);
  });
}

export function playNearMiss() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const bufSize = Math.floor(audioCtx.sampleRate * 0.08);
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(800, now + 0.08);
  filter.Q.value = 1.0;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  noise.connect(filter).connect(gain).connect(audioCtx.destination);
  noise.start(now);
  noise.stop(now + 0.08);
}

export function playBalloonPop() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Low thump
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
  // High crackle burst
  const bufSize = Math.floor(audioCtx.sampleRate * 0.1);
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(3500, now);
  filter.Q.value = 0.6;
  const gain2 = audioCtx.createGain();
  gain2.gain.setValueAtTime(0.12, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  noise.connect(filter).connect(gain2).connect(audioCtx.destination);
  noise.start(now);
  noise.stop(now + 0.1);
}

export function playBirdChirp() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2000, now);
  osc.frequency.exponentialRampToValueAtTime(3000, now + 0.03);
  osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
  gain.gain.setValueAtTime(0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

export function playPlaneZoom() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(600, now);
  filter.Q.value = 0.8;
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(filter).connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

// ---- Balloon Float: Power-Up Sounds ----

export function playPowerupCollect() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Rising triangle chime C6→E6
  const notes = [1047, 1319];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    gain.gain.setValueAtTime(0.12, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.15);
  });
}

export function playShieldActivate() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Low sine sweep up + high shimmer
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
  // Shimmer overlay
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1800, now);
  osc2.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
  gain2.gain.setValueAtTime(0.04, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(now);
  osc2.stop(now + 0.12);
}

export function playShieldBreak() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Crystalline shatter: descending sine bursts
  [2000, 1500, 1000, 600].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.03);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + i * 0.03 + 0.06);
    gain.gain.setValueAtTime(0.08, now + i * 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.06);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.03);
    osc.stop(now + i * 0.03 + 0.06);
  });
  // Noise crackle burst
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const filt = audioCtx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = 3000;
  const ng = audioCtx.createGain();
  ng.gain.setValueAtTime(0.06, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  noise.connect(filt).connect(ng).connect(audioCtx.destination);
  noise.start(now);
  noise.stop(now + 0.1);
}

export function playRainbowActivate() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Ascending arpeggio C-E-G-B-C (octave)
  const notes = [523, 659, 784, 988, 1047];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    const t = now + i * 0.05;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

export function playMagnetActivate() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Low electric hum with vibrato
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, now);
  // Vibrato via LFO
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 12;
  lfoGain.gain.value = 15;
  lfo.connect(lfoGain).connect(osc.frequency);
  lfo.start(now);
  lfo.stop(now + 0.2);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

export function playSlowMoActivate() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Descending pitch bend — time slowing
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}

export function playColorChange() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // 3 rapid high-frequency sparkle pings
  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    const freq = 1200 + Math.random() * 800;
    const t = now + i * 0.04;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.06);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }
}

export function playMysteryBoxOpen() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Rapid clicking/ticking — slot machine
  for (let i = 0; i < 8; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    const t = now + i * 0.08;
    osc.frequency.setValueAtTime(1500 + i * 50, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }
}

export function playMysteryBoxReveal() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Triumphant two-note reveal G5→C6
  const notes = [784, 1047];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = i === 0 ? 'sine' : 'triangle';
    const t = now + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

// ---- Rocket Ride ----

export function playRocketBoost() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(70, now);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}

export function playBoostRelease() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const bufferSize = audioCtx.sampleRate * 0.1;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  src.connect(filter).connect(gain).connect(audioCtx.destination);
  src.start(now);
  src.stop(now + 0.1);
}

export function playRocketStarCollect() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, now);
  osc.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

export function playFuelCanCollect() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}

export function playAsteroidNearMiss() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 200;
  filter.Q.value = 1.5;
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(filter).connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

export function playRocketCrash() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Impact thump
  const imp = audioCtx.createOscillator();
  const impG = audioCtx.createGain();
  imp.type = 'sine';
  imp.frequency.setValueAtTime(80, now);
  impG.gain.setValueAtTime(0.15, now);
  impG.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  imp.connect(impG).connect(audioCtx.destination);
  imp.start(now);
  imp.stop(now + 0.12);
  // Descending whistle
  const wh = audioCtx.createOscillator();
  const whG = audioCtx.createGain();
  wh.type = 'sawtooth';
  wh.frequency.setValueAtTime(800, now + 0.08);
  wh.frequency.exponentialRampToValueAtTime(200, now + 0.6);
  whG.gain.setValueAtTime(0.06, now + 0.08);
  whG.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  wh.connect(whG).connect(audioCtx.destination);
  wh.start(now + 0.08);
  wh.stop(now + 0.6);
}

export function playMilestoneChime() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const notes = [523, 659, 784]; // C5 E5 G5
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    const t = now + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

export function playCountdownBeep() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

export function playLaunchRumble() {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  // Low rumble
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(50, now);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.linearRampToValueAtTime(0.07, now + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.45);
  // Noise burst
  const bufferSize = audioCtx.sampleRate * 0.3;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const nGain = audioCtx.createGain();
  nGain.gain.setValueAtTime(0.04, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  src.connect(filter).connect(nGain).connect(audioCtx.destination);
  src.start(now);
  src.stop(now + 0.35);
}
