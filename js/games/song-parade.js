/* =========================================================
 *  Song Parade — Waterfall Rhythm Engine
 *  Notes fall from the Whale (🐳) down toward the keyboard.
 *  Kids play along by pressing the matching key as notes land.
 * ========================================================= */

// ===== Song Data =====
// Format: { p: pitch name, b: beat duration, g: gap (rest) }

const PARADE_SONGS = [
  {
    name: 'Old MacDonald',
    emoji: '🐄',
    notes: [
      // 1. Old MacDonald had a farm (C C C G A A G)
      {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Sol',b:1,g:0.1},
      {p:'La',b:1,g:0.1}, {p:'La',b:1,g:0.1}, {p:'Sol',b:2,g:0.4},
      // 2. E-I-E-I-O! (E E D D C)
      {p:'Mi',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Do',b:2,g:0.6},
      // 3. And on his farm he had a cow (G G C C C G A A G)
      {p:'Sol',b:0.5,g:0.05}, {p:'Sol',b:0.5,g:0.05}, {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1},
      {p:'Sol',b:1,g:0.1}, {p:'La',b:1,g:0.1}, {p:'La',b:1,g:0.1}, {p:'Sol',b:2,g:0.4},
      // 4. E-I-E-I-O! (E E D D C)
      {p:'Mi',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Do',b:2,g:0.6},
      // 5. With a moo-moo here, and a moo-moo there (G G C C C | G G C C C)
      {p:'Sol',b:0.5,g:0.05}, {p:'Sol',b:0.5,g:0.05}, {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Do',b:2,g:0.2},
      {p:'Sol',b:0.5,g:0.05}, {p:'Sol',b:0.5,g:0.05}, {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Do',b:2,g:0.2},
      // 6. Here a moo, there a moo, everywhere a moo-moo
      {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.2},
      {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.2},
      {p:'Do',b:0.5,g:0.05}, {p:'Do',b:0.5,g:0.05}, {p:'Do',b:0.5,g:0.05}, {p:'Do',b:0.5,g:0.05}, {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.2},
      // 7. Old MacDonald had a farm, E-I-E-I-O! (Finish + Loop Pause)
      {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Sol',b:1,g:0.1},
      {p:'La',b:1,g:0.1}, {p:'La',b:1,g:0.1}, {p:'Sol',b:2,g:0.1},
      {p:'Mi',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Do',b:3,g:1.5}
    ]
  },
  {
    name: 'Twinkle Twinkle',
    emoji: '⭐',
    notes: [
      // 1. Twinkle, twinkle, little star (C C G G A A G)
      {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Sol',b:1,g:0.1}, {p:'Sol',b:1,g:0.1},
      {p:'La',b:1,g:0.1}, {p:'La',b:1,g:0.1}, {p:'Sol',b:2,g:0.4},
      // 2. How I wonder what you are! (F F E E D D C)
      {p:'Fa',b:1,g:0.1}, {p:'Fa',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Mi',b:1,g:0.1},
      {p:'Re',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Do',b:2,g:0.6},
      // 3. Up above the world so high (G G F F E E D)
      {p:'Sol',b:1,g:0.1}, {p:'Sol',b:1,g:0.1}, {p:'Fa',b:1,g:0.1}, {p:'Fa',b:1,g:0.1},
      {p:'Mi',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Re',b:2,g:0.4},
      // 4. Like a diamond in the sky (G G F F E E D)
      {p:'Sol',b:1,g:0.1}, {p:'Sol',b:1,g:0.1}, {p:'Fa',b:1,g:0.1}, {p:'Fa',b:1,g:0.1},
      {p:'Mi',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Re',b:2,g:0.6},
      // 5. Twinkle, twinkle, little star (Repeat Verse 1)
      {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Sol',b:1,g:0.1}, {p:'Sol',b:1,g:0.1},
      {p:'La',b:1,g:0.1}, {p:'La',b:1,g:0.1}, {p:'Sol',b:2,g:0.4},
      // 6. How I wonder what you are! (Final Finish + Loop Pause)
      {p:'Fa',b:1,g:0.1}, {p:'Fa',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Mi',b:1,g:0.1},
      {p:'Re',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Do',b:3,g:2.0}
    ]
  },
  {
    name: 'London Bridge',
    emoji: '🏰',
    notes: [
      // 1. Lon-don bridge is fal-ling down (Sol-La-Sol-Fa-Mi-Fa-Sol)
      {p:'Sol',b:1.5,g:0.05}, {p:'La',b:0.5,g:0.05}, {p:'Sol',b:1,g:0.1}, {p:'Fa',b:1,g:0.1},
      {p:'Mi',b:0.5,g:0.05}, {p:'Fa',b:0.5,g:0.05}, {p:'Sol',b:2,g:0.4},
      // 2. Fal-ling down (Re-Mi-Fa)
      {p:'Re',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Fa',b:2,g:0.4},
      // 3. Fal-ling down (Mi-Fa-Sol)
      {p:'Mi',b:1,g:0.1}, {p:'Fa',b:1,g:0.1}, {p:'Sol',b:2,g:0.4},
      // 4. Lon-don bridge is fal-ling down (Repeat of line 1)
      {p:'Sol',b:1.5,g:0.05}, {p:'La',b:0.5,g:0.05}, {p:'Sol',b:1,g:0.1}, {p:'Fa',b:1,g:0.1},
      {p:'Mi',b:0.5,g:0.05}, {p:'Fa',b:0.5,g:0.05}, {p:'Sol',b:2,g:0.4},
      // 5. My fair la-dy! (Re - Sol - Mi - Do)
      {p:'Re',b:2,g:0.1}, {p:'Sol',b:2,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Do',b:3,g:2.0}
    ]
  },
  {
    name: 'Wheels on the Bus',
    emoji: '🚌',
    notes: [
      // 1. The wheels on the bus (C F F F F)
      {p:'Do',b:0.5,g:0.05}, {p:'Fa',b:1,g:0.1}, {p:'Fa',b:0.5,g:0.05}, {p:'Fa',b:0.5,g:0.05}, {p:'Fa',b:1,g:0.2},
      // 2. Go round and round (A ^C A F)
      {p:'La',b:1,g:0.1}, {p:'Do2',b:1,g:0.1}, {p:'La',b:1,g:0.1}, {p:'Fa',b:2,g:0.2},
      // 3. Round and round (G E C)
      {p:'Sol',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Do',b:2,g:0.2},
      // 4. Round and round! (A G F)
      {p:'La',b:1,g:0.1}, {p:'Sol',b:1,g:0.1}, {p:'Fa',b:2,g:0.4},
      // 5. The wheels on the bus (Repeat: C F F F F)
      {p:'Do',b:0.5,g:0.05}, {p:'Fa',b:1,g:0.1}, {p:'Fa',b:0.5,g:0.05}, {p:'Fa',b:0.5,g:0.05}, {p:'Fa',b:1,g:0.2},
      // 6. Go round and round (Repeat: A ^C A F)
      {p:'La',b:1,g:0.1}, {p:'Do2',b:1,g:0.1}, {p:'La',b:1,g:0.1}, {p:'Fa',b:2,g:0.2},
      // 7. All through the town! (G C C F + Loop Pause)
      {p:'Sol',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Fa',b:3,g:1.5}
    ]
  },
  {
    name: 'Ode to Joy',
    emoji: '🤩',
    notes: [
      // 1. Phrase A1: Mi-Mi-Fa-Sol-Sol-Fa-Mi-Re
      {p:'Mi',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Fa',b:1,g:0.1}, {p:'Sol',b:1,g:0.1},
      {p:'Sol',b:1,g:0.1}, {p:'Fa',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Re',b:1,g:0.1},
      // 2. Phrase A2: Do-Do-Re-Mi-Mi--Re-Re
      {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Mi',b:1,g:0.1},
      {p:'Mi',b:1.5,g:0.05}, {p:'Re',b:0.5,g:0.1}, {p:'Re',b:2,g:0.4},
      // 3. Phrase A1 (Repeat): Mi-Mi-Fa-Sol-Sol-Fa-Mi-Re
      {p:'Mi',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Fa',b:1,g:0.1}, {p:'Sol',b:1,g:0.1},
      {p:'Sol',b:1,g:0.1}, {p:'Fa',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Re',b:1,g:0.1},
      // 4. Phrase A3: Do-Do-Re-Mi-Re--Do-Do
      {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Mi',b:1,g:0.1},
      {p:'Re',b:1.5,g:0.05}, {p:'Do',b:0.5,g:0.1}, {p:'Do',b:2,g:0.6},
      // 5. Section B: Re-Re-Mi-Do-Re-Mi-Fa-Mi-Do
      {p:'Re',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Do',b:1,g:0.1},
      {p:'Re',b:1,g:0.05}, {p:'Mi',b:0.5,g:0.05}, {p:'Fa',b:0.5,g:0.05}, {p:'Mi',b:1,g:0.1}, {p:'Do',b:1,g:0.1},
      // 6. Section B Cont: Re-Mi-Fa-Mi-Re-Do-Re-Sol
      {p:'Re',b:1,g:0.05}, {p:'Mi',b:0.5,g:0.05}, {p:'Fa',b:0.5,g:0.05}, {p:'Mi',b:1,g:0.1}, {p:'Re',b:1,g:0.1},
      {p:'Do',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Sol',b:2,g:0.6},
      // 7. Phrase A1 (Final): Mi-Mi-Fa-Sol-Sol-Fa-Mi-Re
      {p:'Mi',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Fa',b:1,g:0.1}, {p:'Sol',b:1,g:0.1},
      {p:'Sol',b:1,g:0.1}, {p:'Fa',b:1,g:0.1}, {p:'Mi',b:1,g:0.1}, {p:'Re',b:1,g:0.1},
      // 8. Phrase A3 (Finish): Do-Do-Re-Mi-Re--Do-Do
      {p:'Do',b:1,g:0.1}, {p:'Do',b:1,g:0.1}, {p:'Re',b:1,g:0.1}, {p:'Mi',b:1,g:0.1},
      {p:'Re',b:1.5,g:0.05}, {p:'Do',b:0.5,g:0.1}, {p:'Do',b:3,g:2.0}
    ]
  }
];

// ===== Constants =====

const WHALE_EMOJI = '🐳';
const SPLASH_EMOJI = '💦';
const PARADE_MS_PER_BEAT = 600;    // base tempo: 600ms per beat at 1×
const SONG_REPEATS = 2;            // play song 2 times before celebration
const LOOK_AHEAD_MS = 4000;        // notes visible for 4s before hit zone
const HIT_WINDOW_MS = 250;         // +/- 250ms tolerance (generous for toddlers)
const HINT_GLOW_MS = 500;          // key glows 500ms before note arrives
const LEAD_IN_BEATS = 4;           // empty beats before first note arrives

// ===== SongParadeEngine =====

export class SongParadeEngine {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.keyboardEl = opts.keyboardEl;
    this.notesArray = opts.notesArray;
    this.pitchMap = opts.pitchMap;
    this.baseTempo = opts.baseTempo;
    this.playNote = opts.playNote;
    this.spawnParticles = opts.spawnParticles;
    this.getEmojiUrl = opts.getEmojiUrl;
    this.onPlaying = opts.onPlaying;
    this.onComplete = opts.onComplete;
    this.onBack = opts.onBack;

    // DOM elements (built dynamically)
    this.paradeEl = null;
    this.topBarEl = null;
    this.whaleEl = null;
    this.songNameEl = null;
    this.trackEl = null;
    this.hitZoneEl = null;
    this.tempoLabelEl = null;
    this.songSelectEl = null;

    // State
    this.song = null;
    this.scheduledNotes = [];
    this.activeNotes = [];
    this.nextNoteIdx = 0;
    this.currentBeat = 0;
    this.lastFrameTime = 0;
    this.rafId = null;
    this.isPlaying = false;
    this.tempoMultiplier = 1.0;
    this.trackHeightPx = 0;
    this.stats = { hits: 0, misses: 0, total: 0 };
    this.repeatCount = 0;
    this.whaleTimer = null;
    this.boundTick = this.tick.bind(this);
    this.boundResize = this.onResize.bind(this);
    this.glowingKeys = new Set();
  }

  // ===== Lifecycle =====

  init() {
    this.buildDOM();
    this.showSongSelect();
    window.addEventListener('resize', this.boundResize);
  }

  destroy() {
    this.stopPlaying();
    window.removeEventListener('resize', this.boundResize);
    if (this.whaleTimer) clearTimeout(this.whaleTimer);
    if (this.paradeEl) { this.paradeEl.remove(); this.paradeEl = null; }
    if (this.songSelectEl) { this.songSelectEl.remove(); this.songSelectEl = null; }
  }

  // ===== DOM Building =====

  buildDOM() {
    // Song selector screen
    this.songSelectEl = document.createElement('div');
    this.songSelectEl.className = 'parade-song-select';
    this.songSelectEl.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'melody-mode-title';
    title.textContent = 'Pick a Song!';
    this.songSelectEl.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'parade-song-options';
    PARADE_SONGS.forEach((song, i) => {
      const btn = document.createElement('button');
      btn.className = 'melody-mode-btn';
      btn.dataset.songIndex = i;

      const icon = document.createElement('span');
      icon.className = 'melody-mode-icon';
      const img = document.createElement('img');
      img.src = this.getEmojiUrl(song.emoji);
      img.className = 'emoji-img';
      img.alt = song.emoji;
      icon.appendChild(img);
      btn.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'melody-mode-label';
      label.textContent = song.name;
      btn.appendChild(label);

      grid.appendChild(btn);
    });
    this.songSelectEl.appendChild(grid);

    const backBtn = document.createElement('button');
    backBtn.className = 'parade-back-btn';
    backBtn.textContent = '← Back';
    backBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onBack();
    });
    // Tempo control — shared between song select and top bar
    this.tempoWrap = document.createElement('div');
    this.tempoWrap.className = 'parade-tempo-control';

    const speedLabel = document.createElement('span');
    speedLabel.className = 'parade-speed-label';
    speedLabel.textContent = 'Speed';

    this.tempoLabelEl = document.createElement('span');
    this.tempoLabelEl.className = 'parade-tempo-label';

    const makeTempoBtnImg = (emoji, alt) => {
      const img = document.createElement('img');
      img.src = this.getEmojiUrl(emoji);
      img.className = 'emoji-img';
      img.alt = alt;
      img.style.width = '60%';
      img.style.height = '60%';
      img.style.objectFit = 'contain';
      return img;
    };

    const slowerBtn = document.createElement('button');
    slowerBtn.className = 'parade-tempo-btn';
    slowerBtn.type = 'button';
    slowerBtn.appendChild(makeTempoBtnImg('🐢', 'Slower'));

    const fasterBtn = document.createElement('button');
    fasterBtn.className = 'parade-tempo-btn';
    fasterBtn.type = 'button';
    fasterBtn.appendChild(makeTempoBtnImg('🐇', 'Faster'));

    const TEMPO_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    let tempoIdx = 1;

    const updateTempo = () => {
      this.tempoMultiplier = TEMPO_STEPS[tempoIdx];
      this.tempoLabelEl.textContent = this.tempoMultiplier + '×';
      slowerBtn.disabled = (tempoIdx === 0);
      fasterBtn.disabled = (tempoIdx === TEMPO_STEPS.length - 1);
    };

    slowerBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (tempoIdx > 0) { tempoIdx--; updateTempo(); }
    });

    fasterBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (tempoIdx < TEMPO_STEPS.length - 1) { tempoIdx++; updateTempo(); }
    });

    this.tempoWrap.appendChild(speedLabel);
    this.tempoWrap.appendChild(slowerBtn);
    this.tempoWrap.appendChild(this.tempoLabelEl);
    this.tempoWrap.appendChild(fasterBtn);

    updateTempo();  // apply default 0.5×

    // Place tempo control on song select page initially
    this.songSelectEl.appendChild(this.tempoWrap);

    this.songSelectEl.appendChild(backBtn);

    // Event delegation on song grid
    grid.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.melody-mode-btn');
      if (!btn) return;
      e.preventDefault();
      const idx = parseInt(btn.dataset.songIndex, 10);
      if (!isNaN(idx)) this.pickSong(idx);
    });

    this.containerEl.appendChild(this.songSelectEl);

    // Parade container (track + top bar) — built but hidden until song starts
    this.paradeEl = document.createElement('div');
    this.paradeEl.className = 'parade-container';

    // Top bar — whale centered, song name left, tempo right
    this.topBarEl = document.createElement('div');
    this.topBarEl.className = 'parade-top-bar';

    this.songNameEl = document.createElement('div');
    this.songNameEl.className = 'parade-song-name';
    this.topBarEl.appendChild(this.songNameEl);

    this.whaleEl = document.createElement('div');
    this.whaleEl.className = 'parade-whale';
    const whaleImg = document.createElement('img');
    whaleImg.src = this.getEmojiUrl(WHALE_EMOJI);
    whaleImg.className = 'emoji-img';
    whaleImg.alt = WHALE_EMOJI;
    this.whaleEl.appendChild(whaleImg);
    this.topBarEl.appendChild(this.whaleEl);

    this.paradeEl.appendChild(this.topBarEl);

    // Track — waterfall area between top bar and keyboard
    this.trackEl = document.createElement('div');
    this.trackEl.className = 'parade-track';

    this.hitZoneEl = document.createElement('div');
    this.hitZoneEl.className = 'parade-hit-zone';
    this.trackEl.appendChild(this.hitZoneEl);

    this.paradeEl.appendChild(this.trackEl);
    this.containerEl.appendChild(this.paradeEl);
  }

  // ===== Song Selection =====

  showSongSelect() {
    this.songSelectEl.classList.add('active');
    this.paradeEl.classList.remove('active');
    // Move tempo controls back to song select (before the back button)
    const backBtn = this.songSelectEl.querySelector('.parade-back-btn');
    this.songSelectEl.insertBefore(this.tempoWrap, backBtn);
  }

  hideSongSelect() {
    this.songSelectEl.classList.remove('active');
  }

  pickSong(index) {
    this.song = PARADE_SONGS[index];
    this.repeatCount = 0;
    this.hideSongSelect();
    // Move tempo controls into top bar
    this.topBarEl.appendChild(this.tempoWrap);
    this.songNameEl.innerHTML = '';
    const emojiImg = document.createElement('img');
    emojiImg.src = this.getEmojiUrl(this.song.emoji);
    emojiImg.className = 'emoji-img parade-song-name-icon';
    emojiImg.alt = this.song.emoji;
    this.songNameEl.appendChild(emojiImg);
    this.songNameEl.appendChild(document.createTextNode(' ' + this.song.name));
    this.startCountdown();
  }

  // ===== Countdown =====

  startCountdown() {
    this.paradeEl.classList.add('active');
    this.whaleEl.className = 'parade-whale';
    this.positionTrack();

    let count = 3;
    const countEl = document.createElement('div');
    countEl.className = 'parade-countdown';
    this.trackEl.appendChild(countEl);

    const tick = () => {
      if (count > 0) {
        countEl.textContent = count;
        countEl.classList.remove('parade-countdown-pop');
        void countEl.offsetWidth;
        countEl.classList.add('parade-countdown-pop');
        count--;
        setTimeout(tick, 800);
      } else {
        countEl.remove();
        this.startPlaying();
      }
    };
    tick();
  }

  // ===== Core Game Loop =====

  startPlaying() {
    this.isPlaying = true;
    this.nextNoteIdx = 0;
    this.activeNotes = [];

    // Accumulate stats across repeats; reset only on first play
    if (this.repeatCount === 0) {
      this.stats = { hits: 0, misses: 0, total: this.song.notes.length * SONG_REPEATS };
    }

    this.computeSchedule();
    this.positionTrack();

    this.whaleEl.className = 'parade-whale conducting';
    this.currentBeat = -LEAD_IN_BEATS;
    this.lastFrameTime = performance.now();
    if (this.onPlaying) this.onPlaying();
    this.rafId = requestAnimationFrame(this.boundTick);
  }

  stopPlaying() {
    this.isPlaying = false;
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.activeNotes.forEach(n => { if (n.el && n.el.parentNode) n.el.remove(); });
    this.activeNotes = [];
    this.clearKeyGlows();
  }

  computeSchedule() {
    let cumBeats = 0;
    this.scheduledNotes = this.song.notes.map((note, i) => {
      const beatOffset = cumBeats;
      cumBeats += note.b + note.g;
      return {
        p: note.p,
        b: note.b,
        g: note.g,
        beatOffset,
        index: i,
        pitchIdx: this.pitchMap[note.p]
      };
    });
    this.songDurationBeats = cumBeats;
  }

  msToBeats(ms) {
    const msPerBeat = PARADE_MS_PER_BEAT / this.tempoMultiplier;
    return ms / msPerBeat;
  }

  tick(now) {
    if (!this.isPlaying) return;

    const deltaMs = now - this.lastFrameTime;
    this.lastFrameTime = now;
    const msPerBeat = PARADE_MS_PER_BEAT / this.tempoMultiplier;
    this.currentBeat += deltaMs / msPerBeat;

    const lookAheadBeats = LOOK_AHEAD_MS / msPerBeat;
    const hitWindowBeats = HIT_WINDOW_MS / msPerBeat;

    // 1. Spawn new notes
    while (this.nextNoteIdx < this.scheduledNotes.length) {
      const note = this.scheduledNotes[this.nextNoteIdx];
      const spawnBeat = note.beatOffset - lookAheadBeats;
      if (this.currentBeat < spawnBeat) break;
      this.spawnNoteElement(note);
      this.nextNoteIdx++;
    }

    // 2. Update positions & detect misses (waterfall: top → bottom)
    for (let i = this.activeNotes.length - 1; i >= 0; i--) {
      const an = this.activeNotes[i];
      if (an.state === 'dead') continue;

      // Progress: 0 = just spawned (top), 1 = at hit zone (bottom of track)
      const beatsSinceSpawn = this.currentBeat - (an.beatOffset - lookAheadBeats);
      const progress = beatsSinceSpawn / lookAheadBeats;
      const yPx = progress * this.trackHeightPx;
      an.el.style.transform = 'translate(-50%, ' + yPx + 'px)';

      // Check if missed (past keyboard + tolerance)
      const beatsPastHit = this.currentBeat - an.beatOffset;
      if (an.state === 'active' && beatsPastHit > hitWindowBeats) {
        this.onNoteMissed(an);
      }

      // Remove off-screen notes (below track)
      if (yPx > this.trackHeightPx + 60) {
        an.el.remove();
        an.state = 'dead';
      }
    }

    // 3. Clean up dead notes
    this.activeNotes = this.activeNotes.filter(n => n.state !== 'dead');

    // 4. Key glow hints
    this.updateKeyGlowHints();

    // 5. Check song complete
    if (this.nextNoteIdx >= this.scheduledNotes.length && this.activeNotes.length === 0) {
      this.onSongEnd();
      return;
    }

    this.rafId = requestAnimationFrame(this.boundTick);
  }

  // ===== Note Rendering (Waterfall) =====

  spawnNoteElement(noteData) {
    const el = document.createElement('div');
    el.className = 'parade-note';

    const color = this.notesArray[noteData.pitchIdx].color;
    el.style.setProperty('--note-color', color);

    const label = document.createElement('span');
    label.className = 'parade-note-label';
    label.textContent = this.notesArray[noteData.pitchIdx].label;
    el.appendChild(label);

    // Horizontal position: align with corresponding piano key
    const keyEl = this.keyboardEl.querySelector('[data-note-index="' + noteData.pitchIdx + '"]');
    if (keyEl) {
      const keyRect = keyEl.getBoundingClientRect();
      const trackRect = this.trackEl.getBoundingClientRect();
      const keyCenterX = keyRect.left + keyRect.width / 2 - trackRect.left;
      el.style.left = keyCenterX + 'px';
    }

    // Start at top of track (y=0, will be moved by tick via translateY)
    el.style.transform = 'translate(-50%, 0)';

    this.trackEl.appendChild(el);

    this.activeNotes.push({
      el,
      pitchIdx: noteData.pitchIdx,
      beatOffset: noteData.beatOffset,
      state: 'active'
    });
  }

  positionTrack() {
    const kbRect = this.keyboardEl.getBoundingClientRect();
    const gameRect = this.containerEl.getBoundingClientRect();
    const kbTop = kbRect.top - gameRect.top;
    this.trackEl.style.bottom = (gameRect.height - kbTop) + 'px';
    this.trackHeightPx = this.trackEl.clientHeight;
    this.drawLanes();
  }

  drawLanes() {
    // Remove old lanes
    this.trackEl.querySelectorAll('.parade-lane').forEach(el => el.remove());

    const trackRect = this.trackEl.getBoundingClientRect();

    // Draw a lane as wide as each key
    for (let i = 0; i < this.notesArray.length; i++) {
      const keyEl = this.keyboardEl.querySelector('[data-note-index="' + i + '"]');
      if (!keyEl) continue;
      const keyRect = keyEl.getBoundingClientRect();
      const leftX = keyRect.left - trackRect.left;

      const lane = document.createElement('div');
      lane.className = 'parade-lane';
      lane.style.left = leftX + 'px';
      lane.style.width = keyRect.width + 'px';
      this.trackEl.appendChild(lane);
    }
  }

  onResize() {
    this.positionTrack();
  }

  // ===== Key Glow Hints =====

  updateKeyGlowHints() {
    const hintGlowBeats = this.msToBeats(HINT_GLOW_MS);

    // Clear previous glows
    this.clearKeyGlows();

    // Find notes approaching hit zone and glow their keys
    for (const an of this.activeNotes) {
      if (an.state !== 'active') continue;
      const beatsUntilHit = an.beatOffset - this.currentBeat;
      if (beatsUntilHit >= 0 && beatsUntilHit <= hintGlowBeats) {
        const keyEl = this.keyboardEl.querySelector('[data-note-index="' + an.pitchIdx + '"]');
        if (keyEl && !keyEl.classList.contains('parade-hint-glow')) {
          keyEl.classList.add('parade-hint-glow');
          this.glowingKeys.add(keyEl);
        }
      }
    }
  }

  clearKeyGlows() {
    for (const keyEl of this.glowingKeys) {
      keyEl.classList.remove('parade-hint-glow');
    }
    this.glowingKeys.clear();
  }

  // ===== Hit Detection =====

  handleInput(pitchIndex) {
    if (!this.isPlaying) return;

    const hitWindowBeats = this.msToBeats(HIT_WINDOW_MS);

    let bestNote = null;
    let bestDist = Infinity;

    for (const an of this.activeNotes) {
      if (an.state !== 'active') continue;
      if (an.pitchIdx !== pitchIndex) continue;

      const dist = Math.abs(this.currentBeat - an.beatOffset);
      if (dist <= hitWindowBeats && dist < bestDist) {
        bestNote = an;
        bestDist = dist;
      }
    }

    if (bestNote) {
      this.onNoteHit(bestNote);
    }
  }

  // ===== Feedback =====

  onNoteHit(note) {
    note.state = 'hit';
    this.stats.hits++;

    note.el.classList.add('hit');

    // Spawn sparkle particles at note position
    const noteRect = note.el.getBoundingClientRect();
    const gameRect = this.containerEl.getBoundingClientRect();
    this.spawnParticles(
      noteRect.left - gameRect.left + noteRect.width / 2,
      noteRect.top - gameRect.top + noteRect.height / 2,
      this.containerEl
    );

    this.triggerWhaleSplash();

    setTimeout(() => {
      if (note.el.parentNode) note.el.remove();
      note.state = 'dead';
    }, 400);
  }

  onNoteMissed(note) {
    note.state = 'missed';
    this.stats.misses++;

    note.el.classList.add('missed');

    setTimeout(() => {
      if (note.el.parentNode) note.el.remove();
      note.state = 'dead';
    }, 600);
  }

  // ===== Whale Director =====

  triggerWhaleSplash() {
    this.whaleEl.className = 'parade-whale splash';
    this.spawnWaterDrop();
    if (this.whaleTimer) clearTimeout(this.whaleTimer);
    this.whaleTimer = setTimeout(() => {
      if (this.isPlaying) this.whaleEl.className = 'parade-whale conducting';
    }, 400);
  }

  spawnWaterDrop() {
    const drop = document.createElement('div');
    drop.className = 'parade-splash-drop';
    const img = document.createElement('img');
    img.src = this.getEmojiUrl(SPLASH_EMOJI);
    img.className = 'emoji-img';
    img.alt = SPLASH_EMOJI;
    img.style.width = 'clamp(16px, 3vw, 24px)';
    img.style.height = img.style.width;
    drop.appendChild(img);

    const whaleRect = this.whaleEl.getBoundingClientRect();
    const gameRect = this.containerEl.getBoundingClientRect();
    drop.style.left = (whaleRect.left - gameRect.left + whaleRect.width / 2) + 'px';
    drop.style.top = (whaleRect.top - gameRect.top - 10) + 'px';
    this.containerEl.appendChild(drop);

    setTimeout(() => drop.remove(), 700);
  }

  // ===== Song Complete =====

  onSongEnd() {
    this.isPlaying = false;
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.clearKeyGlows();
    this.repeatCount++;

    if (this.repeatCount < SONG_REPEATS) {
      // Loop: restart the song after a brief pause
      this.whaleEl.className = 'parade-whale happy';
      setTimeout(() => {
        this.startPlaying();
      }, 800);
      return;
    }

    // All repeats done — celebrate
    this.whaleEl.className = 'parade-whale happy';
    if (this.onComplete) this.onComplete();

    setTimeout(() => {
      this.showCelebration();
    }, 500);
  }

  showCelebration() {
    this.paradeEl.classList.remove('active');

    const celebrateEl = this.containerEl.querySelector('.melody-celebrate');
    if (!celebrateEl) return;

    celebrateEl.innerHTML = '';

    const emojiDiv = document.createElement('div');
    emojiDiv.className = 'melody-celebrate-emoji';
    const img = document.createElement('img');
    img.src = this.getEmojiUrl(WHALE_EMOJI);
    img.className = 'emoji-img';
    img.alt = WHALE_EMOJI;
    img.style.width = 'clamp(4rem, 14vw, 7rem)';
    img.style.height = img.style.width;
    emojiDiv.appendChild(img);
    celebrateEl.appendChild(emojiDiv);

    const txt = document.createElement('div');
    txt.className = 'melody-celebrate-text';
    txt.textContent = 'Whale done! You played a whole song!';
    celebrateEl.appendChild(txt);

    const sub = document.createElement('div');
    sub.className = 'melody-celebrate-sub';
    sub.textContent = this.stats.hits + ' out of ' + this.stats.total + ' notes!';
    celebrateEl.appendChild(sub);

    const againBtn = document.createElement('button');
    againBtn.className = 'melody-btn-again';
    againBtn.textContent = 'Play Again';
    againBtn.addEventListener('click', () => {
      celebrateEl.classList.remove('show');
      this.pickSong(PARADE_SONGS.indexOf(this.song));
    });
    celebrateEl.appendChild(againBtn);

    const pickBtn = document.createElement('button');
    pickBtn.className = 'melody-btn-again parade-btn-pick';
    pickBtn.textContent = 'Pick Another Song';
    pickBtn.addEventListener('click', () => {
      celebrateEl.classList.remove('show');
      this.showSongSelect();
    });
    celebrateEl.appendChild(pickBtn);

    requestAnimationFrame(() => celebrateEl.classList.add('show'));

    const gameRect = this.containerEl.getBoundingClientRect();
    for (let wave = 0; wave < 4; wave++) {
      setTimeout(() => {
        for (let i = 0; i < 4; i++) {
          this.spawnParticles(
            Math.random() * gameRect.width,
            Math.random() * gameRect.height * 0.5,
            this.containerEl
          );
        }
      }, wave * 300);
    }
  }
}

/** Expose song list for emoji preloading */
export { PARADE_SONGS };
