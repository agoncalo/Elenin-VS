// ============================================================
// audio.js — Procedural music & SFX via Web Audio API
// Eastern-flavored groovy battle tracks per enemy affinity
// ============================================================

const AudioEngine = (() => {
    let ctx = null;
    let masterGain = null;
    let musicGain = null;
    let sfxGain = null;
    let muted = false;
    let currentTrack = null;
    let trackId = null;
    let _initialized = false;

    function init() {
        if (_initialized) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 1.0;
        masterGain.connect(ctx.destination);

        musicGain = ctx.createGain();
        musicGain.gain.value = 0.35;
        musicGain.connect(masterGain);

        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.5;
        sfxGain.connect(masterGain);

        _initialized = true;
    }

    function resume() {
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    function toggleMute() {
        muted = !muted;
        if (masterGain) masterGain.gain.value = muted ? 0 : 1;
        return muted;
    }

    function isMuted() { return muted; }

    // =========================================================
    // SFX — short one-shot sounds
    // =========================================================

    // Utility: play a tone burst
    function _tone(freq, dur, type, vol, detune) {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        if (detune) osc.detune.value = detune;
        g.gain.setValueAtTime(vol || 0.3, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(g); g.connect(sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur);
    }

    // Noise burst for impacts
    function _noise(dur, vol) {
        if (!ctx) return;
        const bufSize = ctx.sampleRate * dur;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        src.connect(g); g.connect(sfxGain);
        src.start(ctx.currentTime);
    }

    const sfx = {
        cast() {
            _tone(800, 0.08, 'square', 0.15);
            _tone(1200, 0.12, 'sine', 0.1);
        },
        slash() {
            _noise(0.15, 0.25);
            _tone(200, 0.1, 'sawtooth', 0.15);
            _tone(150, 0.2, 'sawtooth', 0.1);
        },
        projectile() {
            _tone(600, 0.06, 'sine', 0.12);
            _tone(900, 0.1, 'triangle', 0.08);
        },
        hit() {
            _noise(0.1, 0.2);
            _tone(150, 0.15, 'square', 0.12);
            _tone(100, 0.2, 'sine', 0.08);
        },
        bigHit() {
            _noise(0.2, 0.3);
            _tone(80, 0.3, 'sawtooth', 0.2);
            _tone(120, 0.2, 'square', 0.15);
        },
        block() {
            _tone(1000, 0.06, 'square', 0.15);
            _tone(1500, 0.08, 'sine', 0.1);
        },
        deflect() {
            _tone(1200, 0.05, 'sine', 0.15);
            _tone(1800, 0.08, 'triangle', 0.12);
            _tone(2400, 0.1, 'sine', 0.08);
        },
        shield() {
            _tone(400, 0.15, 'sine', 0.15);
            _tone(600, 0.2, 'sine', 0.1);
            _tone(800, 0.25, 'sine', 0.06);
        },
        enchant() {
            _tone(500, 0.1, 'sine', 0.12);
            _tone(750, 0.15, 'triangle', 0.1);
            _tone(1000, 0.2, 'sine', 0.08);
        },
        summon() {
            _noise(0.15, 0.1);
            _tone(200, 0.2, 'sine', 0.15);
            _tone(300, 0.3, 'sine', 0.12);
            _tone(400, 0.35, 'sine', 0.08);
        },
        aoe() {
            _noise(0.3, 0.2);
            _tone(100, 0.4, 'sawtooth', 0.15);
            _tone(60, 0.5, 'square', 0.1);
            _tone(200, 0.3, 'sine', 0.12);
        },
        lane() {
            _tone(300, 0.15, 'triangle', 0.1);
            _tone(450, 0.2, 'sine', 0.08);
        },
        heal() {
            _tone(600, 0.15, 'sine', 0.1);
            _tone(800, 0.2, 'sine', 0.08);
            _tone(1000, 0.25, 'sine', 0.06);
        },
        stun() {
            _tone(200, 0.1, 'square', 0.15);
            _tone(100, 0.15, 'square', 0.1);
            _noise(0.08, 0.12);
        },
        freeze() {
            _tone(2000, 0.08, 'sine', 0.1);
            _tone(2500, 0.12, 'sine', 0.08);
            _tone(3000, 0.15, 'sine', 0.05);
        },
        death() {
            _tone(300, 0.1, 'sawtooth', 0.15);
            _tone(200, 0.2, 'sawtooth', 0.12);
            _tone(100, 0.35, 'sawtooth', 0.1);
            _noise(0.15, 0.1);
        },
        victory() {
            if (!ctx) return;
            const notes = [523, 659, 784, 1047];
            notes.forEach((f, i) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = f;
                g.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
                g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.05);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
                osc.connect(g); g.connect(sfxGain);
                osc.start(ctx.currentTime + i * 0.15);
                osc.stop(ctx.currentTime + i * 0.15 + 0.4);
            });
        },
        defeat() {
            if (!ctx) return;
            const notes = [400, 350, 300, 200];
            notes.forEach((f, i) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = f;
                g.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
                g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.2 + 0.05);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.5);
                osc.connect(g); g.connect(sfxGain);
                osc.start(ctx.currentTime + i * 0.2);
                osc.stop(ctx.currentTime + i * 0.2 + 0.5);
            });
        },
        notReady() {
            _tone(200, 0.08, 'square', 0.1);
            _tone(150, 0.1, 'square', 0.08);
        },
    };

    // =========================================================
    // MUSIC — Procedural loop-based tracks
    // =========================================================

    // Eastern pentatonic & related scales (MIDI-ish note numbers → Hz)
    function midiHz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

    // Scale definitions (semitone offsets from root)
    const SCALES = {
        minPent:  [0, 3, 5, 7, 10],       // minor pentatonic
        majPent:  [0, 2, 4, 7, 9],        // major pentatonic
        japanese: [0, 1, 5, 7, 8],        // in-sen / japanese
        hirajoshi:[0, 2, 3, 7, 8],        // hirajoshi
        chinese:  [0, 4, 6, 7, 11],       // chinese
        phrygian: [0, 1, 3, 5, 7, 8, 10], // phrygian mode (dark)
        mixo:     [0, 2, 4, 5, 7, 9, 10], // mixolydian (groovy)
        blues:    [0, 3, 5, 6, 7, 10],    // blues
    };

    function scaleNote(root, scale, degree) {
        const oct = Math.floor(degree / scale.length);
        const idx = ((degree % scale.length) + scale.length) % scale.length;
        return root + oct * 12 + scale[idx];
    }

    // Track class — manages a looping procedural composition
    class Track {
        constructor(affinity) {
            this.affinity = affinity;
            this.alive = true;
            this.bpm = 120;
            this.root = 48; // C3
            this.scale = SCALES.minPent;
            this.beat = 0;
            this.bar = 0;
            this.phrase = 0;
            this.swing = 0;
            this.timerID = null;
            this.nodes = [];
            this._configure(affinity);
        }

        _configure(aff) {
            switch (aff) {
                case 'fire':
                    this.bpm = 140; this.root = 48; this.scale = SCALES.minPent;
                    this.swing = 0.06;
                    this.drumPattern = 'fire'; this.bassStyle = 'driving';
                    this.melodyStyle = 'aggressive'; this.flavor = 'fire';
                    break;
                case 'ice':
                    this.bpm = 105; this.root = 52; this.scale = SCALES.hirajoshi;
                    this.swing = 0;
                    this.drumPattern = 'sparse'; this.bassStyle = 'sustained';
                    this.melodyStyle = 'ethereal'; this.flavor = 'ice';
                    break;
                case 'wind':
                    this.bpm = 150; this.root = 55; this.scale = SCALES.majPent;
                    this.swing = 0.08;
                    this.drumPattern = 'light'; this.bassStyle = 'bouncy';
                    this.melodyStyle = 'playful'; this.flavor = 'wind';
                    break;
                case 'shock':
                    this.bpm = 155; this.root = 50; this.scale = SCALES.blues;
                    this.swing = 0.04;
                    this.drumPattern = 'hard'; this.bassStyle = 'syncopated';
                    this.melodyStyle = 'sharp'; this.flavor = 'shock';
                    break;
                case 'earth':
                    this.bpm = 85; this.root = 43; this.scale = SCALES.phrygian;
                    this.swing = 0.03;
                    this.drumPattern = 'heavy'; this.bassStyle = 'slow';
                    this.melodyStyle = 'solemn'; this.flavor = 'earth';
                    break;
                case 'shadow':
                    this.bpm = 115; this.root = 47; this.scale = SCALES.japanese;
                    this.swing = 0.05;
                    this.drumPattern = 'shadow'; this.bassStyle = 'stalking';
                    this.melodyStyle = 'mysterious'; this.flavor = 'shadow';
                    break;
                case 'water':
                    this.bpm = 118; this.root = 53; this.scale = SCALES.majPent;
                    this.swing = 0.07;
                    this.drumPattern = 'shuffle'; this.bassStyle = 'flowing';
                    this.melodyStyle = 'floaty'; this.flavor = 'water';
                    break;
                case 'menu':
                    this.bpm = 110; this.root = 50; this.scale = SCALES.hirajoshi;
                    this.swing = 0.05;
                    this.drumPattern = 'gentle'; this.bassStyle = 'sustained';
                    this.melodyStyle = 'contemplative'; this.flavor = 'menu';
                    break;
                default:
                    this.bpm = 130; this.root = 48; this.scale = SCALES.minPent;
                    this.swing = 0.05;
                    this.drumPattern = 'fire'; this.bassStyle = 'driving';
                    this.melodyStyle = 'aggressive'; this.flavor = 'fire';
            }
        }

        start() {
            if (!ctx) return;
            this.alive = true;
            this.beat = 0; this.bar = 0; this.phrase = 0;
            this._scheduleNext();
        }

        stop() {
            this.alive = false;
            if (this.timerID) { clearTimeout(this.timerID); this.timerID = null; }
            // Fade out any lingering nodes
            this.nodes.forEach(n => {
                try { n.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); } catch (e) {}
            });
            this.nodes = [];
        }

        _scheduleNext() {
            if (!this.alive || !ctx) return;
            const beatDur = 60 / this.bpm;
            const sixteenth = beatDur / 4;

            // Process this sixteenth note
            this._tick();

            this.beat++;
            if (this.beat >= 64) { // 4 bars of 16 sixteenths
                this.beat = 0;
                this.bar += 4;
                this.phrase++;
            }

            // Swing: slightly delay off-beat sixteenths
            let delay = sixteenth;
            if (this.beat % 2 === 1 && this.swing > 0) {
                delay += sixteenth * this.swing;
            }

            this.timerID = setTimeout(() => this._scheduleNext(), delay * 1000);
        }

        _tick() {
            const b = this.beat;       // 0–63 sixteenth in 4 bars
            const quarter = b % 4 === 0;
            const eighth  = b % 2 === 0;
            const barBeat = b % 16;     // 0–15 within a bar
            const barIdx  = Math.floor(b / 16); // 0–3 bar index

            this._playDrums(b, barBeat, barIdx, quarter, eighth);
            this._playBass(b, barBeat, barIdx, quarter, eighth);
            this._playMelody(b, barBeat, barIdx, quarter, eighth);
        }

        // --- Drums (noise-based taiko / percussion) ---
        _playDrums(b, bb, bar, quarter, eighth) {
            const p = this.drumPattern;
            const t = ctx.currentTime;

            if (p === 'fire') {
                // Driving taiko: kick on 1,3 + ghost hits
                if (bb === 0 || bb === 8) this._kick(t, 0.25);
                if (bb === 4 || bb === 12) this._snare(t, 0.15);
                if (eighth) this._hihat(t, 0.06);
                if (bb === 6 || bb === 14) this._kick(t, 0.1); // ghost kick
            } else if (p === 'heavy') {
                // Earth: slow, heavy thuds
                if (bb === 0) this._kick(t, 0.35);
                if (bb === 8) this._kick(t, 0.25);
                if (bb === 4 || bb === 12) this._snare(t, 0.2);
                if (bb === 0 || bb === 8) this._taiko(t, 0.15);
            } else if (p === 'sparse') {
                // Ice: minimal, atmospheric
                if (bb === 0) this._kick(t, 0.15);
                if (bb === 8) this._snare(t, 0.08);
                if (bb === 0 || bb === 4 || bb === 8 || bb === 12) this._hihat(t, 0.03);
            } else if (p === 'light') {
                // Wind: light and fast
                if (bb === 0 || bb === 8) this._kick(t, 0.12);
                if (bb === 4 || bb === 12) this._snare(t, 0.08);
                if (eighth) this._hihat(t, 0.05);
                if (bb === 6 || bb === 10) this._hihat(t, 0.07); // extra shuffle
            } else if (p === 'hard') {
                // Shock: aggressive double-time feel
                if (bb === 0 || bb === 4 || bb === 8 || bb === 12) this._kick(t, 0.2);
                if (bb === 2 || bb === 6 || bb === 10 || bb === 14) this._snare(t, 0.15);
                if (eighth) this._hihat(t, 0.07);
                if (bb === 3 || bb === 11) this._kick(t, 0.08); // ghost
            } else if (p === 'shadow') {
                // Shadow: off-beat emphasis, mysterious
                if (bb === 0) this._kick(t, 0.18);
                if (bb === 6) this._kick(t, 0.12);
                if (bb === 10) this._snare(t, 0.12);
                if (bb === 3 || bb === 7 || bb === 11 || bb === 15) this._hihat(t, 0.04);
                if (bb === 0 && bar === 3) this._taiko(t, 0.15);
            } else if (p === 'shuffle') {
                // Water: relaxed shuffle groove
                if (bb === 0 || bb === 8) this._kick(t, 0.15);
                if (bb === 4 || bb === 12) this._snare(t, 0.1);
                if (bb === 0 || bb === 3 || bb === 4 || bb === 8 || bb === 11 || bb === 12) this._hihat(t, 0.05);
                if (bb === 6) this._kick(t, 0.06); // ghost
            } else if (p === 'gentle') {
                // Menu: soft & atmospheric
                if (bb === 0 && (bar === 0 || bar === 2)) this._kick(t, 0.08);
                if (bb === 8 && bar === 1) this._snare(t, 0.05);
                if (bb === 0 || bb === 8) this._hihat(t, 0.02);
            }
        }

        _kick(t, vol) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(g); g.connect(musicGain);
            osc.start(t); osc.stop(t + 0.2);
        }

        _snare(t, vol) {
            // Noise burst + tone
            const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
            const src = ctx.createBufferSource(); src.buffer = buf;
            const g = ctx.createGain();
            g.gain.setValueAtTime(vol * 0.7, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            const filt = ctx.createBiquadFilter();
            filt.type = 'highpass'; filt.frequency.value = 2000;
            src.connect(filt); filt.connect(g); g.connect(musicGain);
            src.start(t);
            // Tone body
            const osc = ctx.createOscillator();
            const g2 = ctx.createGain();
            osc.type = 'triangle'; osc.frequency.value = 180;
            g2.gain.setValueAtTime(vol * 0.5, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            osc.connect(g2); g2.connect(musicGain);
            osc.start(t); osc.stop(t + 0.08);
        }

        _hihat(t, vol) {
            const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
            const src = ctx.createBufferSource(); src.buffer = buf;
            const g = ctx.createGain();
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
            const filt = ctx.createBiquadFilter();
            filt.type = 'highpass'; filt.frequency.value = 6000;
            src.connect(filt); filt.connect(g); g.connect(musicGain);
            src.start(t);
        }

        _taiko(t, vol) {
            // Deep taiko drum
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.connect(g); g.connect(musicGain);
            osc.start(t); osc.stop(t + 0.5);
        }

        // --- Bass line ---
        _playBass(b, bb, bar, quarter, eighth) {
            const s = this.bassStyle;
            const t = ctx.currentTime;
            const root = this.root;
            const sc = this.scale;

            // Chord progression: mostly i → iv → v → i patterns using scale degrees
            const chordMap = [0, 0, 3, 4]; // scale degrees per bar
            const chordDeg = chordMap[bar] || 0;
            const bassNote = scaleNote(root, sc, chordDeg);

            if (s === 'driving') {
                // Fire: steady driving eighths with octave alternation
                if (eighth) {
                    const oct = (bb === 0 || bb === 8) ? 0 : -12;
                    this._bass(t, midiHz(bassNote + oct), 0.12, 0.12);
                }
            } else if (s === 'slow') {
                // Earth: whole notes, deep and resonant
                if (bb === 0) this._bass(t, midiHz(bassNote - 12), 0.5, 0.18);
                if (bb === 8) this._bass(t, midiHz(bassNote - 12 + (bar === 2 ? 2 : 0)), 0.4, 0.12);
            } else if (s === 'sustained') {
                // Ice/Menu: long tones with gentle movement
                if (bb === 0) this._bass(t, midiHz(bassNote - 5), 0.6, 0.1);
            } else if (s === 'bouncy') {
                // Wind: syncopated bouncy pattern
                if (bb === 0 || bb === 3 || bb === 6 || bb === 10) {
                    const deg = (bb === 6) ? chordDeg + 2 : chordDeg;
                    this._bass(t, midiHz(scaleNote(root, sc, deg) - 12), 0.1, 0.1);
                }
            } else if (s === 'syncopated') {
                // Shock: jagged offbeat bass
                if (bb === 0 || bb === 3 || bb === 8 || bb === 11) {
                    this._bass(t, midiHz(bassNote - 12), 0.08, 0.14);
                }
                if (bb === 6) this._bass(t, midiHz(bassNote - 12 + 7), 0.06, 0.08);
            } else if (s === 'stalking') {
                // Shadow: sparse, ominous
                if (bb === 0) this._bass(t, midiHz(bassNote - 12), 0.35, 0.12);
                if (bb === 10) this._bass(t, midiHz(bassNote - 12 + 1), 0.15, 0.08);
            } else if (s === 'flowing') {
                // Water: smooth arpeggiated feel
                if (bb === 0) this._bass(t, midiHz(bassNote - 12), 0.2, 0.1);
                if (bb === 4) this._bass(t, midiHz(scaleNote(root - 12, sc, chordDeg + 2)), 0.15, 0.07);
                if (bb === 8) this._bass(t, midiHz(scaleNote(root - 12, sc, chordDeg + 4)), 0.15, 0.07);
                if (bb === 12) this._bass(t, midiHz(scaleNote(root - 12, sc, chordDeg + 2)), 0.12, 0.06);
            }
        }

        _bass(t, freq, dur, vol) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = Math.max(30, freq);
            g.gain.setValueAtTime(vol, t);
            g.gain.setValueAtTime(vol * 0.8, t + dur * 0.5);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(g); g.connect(musicGain);
            osc.start(t); osc.stop(t + dur + 0.05);
        }

        // --- Melody ---
        _playMelody(b, bb, bar, quarter, eighth) {
            const m = this.melodyStyle;
            const t = ctx.currentTime;
            const root = this.root + 12; // melody one octave up
            const sc = this.scale;
            const phrase = this.phrase % 8;

            // Solo melody every other phrase (phrases 2,3,6,7)
            const isSolo = phrase >= 2 && phrase <= 3 || phrase >= 6;
            // Rhythmic comping on non-solo phrases
            const isComp = !isSolo;

            if (m === 'aggressive') {
                if (isComp) {
                    // Staccato rhythmic hits
                    if (bb === 0 || bb === 6 || bb === 8 || bb === 14) {
                        const deg = [0, 2, 4, 3][bar];
                        this._melody(t, midiHz(scaleNote(root, sc, deg)), 0.06, 0.1, 'sawtooth');
                    }
                } else {
                    // Solo: fast pentatonic runs
                    this._soloNote(t, root, sc, bb, bar, 'sawtooth', 0.08);
                }
            } else if (m === 'solemn') {
                if (isComp) {
                    if (bb === 0) {
                        const deg = [0, 1, 3, 2][bar];
                        this._melody(t, midiHz(scaleNote(root, sc, deg)), 0.4, 0.08, 'sine');
                    }
                } else {
                    // Solo: slow, deliberate phrases
                    if (bb === 0 || bb === 6 || bb === 12) {
                        const degSeq = [0, 2, 4, 5, 3, 1, 2, 0, 4, 3, 1, 0];
                        const idx = (bar * 3 + Math.floor(bb / 5)) % degSeq.length;
                        this._melody(t, midiHz(scaleNote(root, sc, degSeq[idx])), 0.3, 0.09, 'triangle');
                    }
                }
            } else if (m === 'ethereal') {
                if (isComp) {
                    if (bb === 0 || bb === 8) {
                        const deg = [0, 3, 2, 4][bar];
                        this._melody(t, midiHz(scaleNote(root, sc, deg)), 0.35, 0.06, 'sine');
                    }
                } else {
                    if (bb % 4 === 0) {
                        const degSeq = [0, 4, 3, 2, 4, 3, 1, 0];
                        const idx = (bar * 2 + bb / 4) % degSeq.length;
                        this._melody(t, midiHz(scaleNote(root, sc, degSeq[idx])), 0.25, 0.06, 'sine');
                    }
                }
            } else if (m === 'playful') {
                if (isComp) {
                    if (bb === 0 || bb === 3 || bb === 8 || bb === 11) {
                        const deg = [0, 2, 4, 2][bar];
                        this._melody(t, midiHz(scaleNote(root, sc, deg)), 0.08, 0.08, 'triangle');
                    }
                } else {
                    this._soloNote(t, root, sc, bb, bar, 'triangle', 0.07);
                }
            } else if (m === 'sharp') {
                if (isComp) {
                    if (bb === 0 || bb === 4 || bb === 8 || bb === 12) {
                        const deg = [0, 3, 5, 4][bar];
                        this._melody(t, midiHz(scaleNote(root, sc, deg)), 0.05, 0.1, 'square');
                    }
                } else {
                    this._soloNote(t, root, sc, bb, bar, 'square', 0.07);
                }
            } else if (m === 'mysterious') {
                if (isComp) {
                    if (bb === 0 || bb === 6 || bb === 10) {
                        const deg = [0, 1, 4, 3][bar];
                        this._melody(t, midiHz(scaleNote(root, sc, deg)), 0.15, 0.06, 'sine');
                    }
                } else {
                    if (eighth && Math.random() < 0.4) {
                        const deg = Math.floor(Math.random() * 5);
                        this._melody(t, midiHz(scaleNote(root, sc, deg)), 0.12, 0.05, 'sine');
                    }
                }
            } else if (m === 'floaty') {
                if (isComp) {
                    // Arpeggiated chords
                    if (bb === 0 || bb === 4 || bb === 8 || bb === 12) {
                        const deg = bar;
                        this._melody(t, midiHz(scaleNote(root, sc, deg)), 0.2, 0.06, 'sine');
                        this._melody(t + 0.05, midiHz(scaleNote(root, sc, deg + 2)), 0.15, 0.04, 'sine');
                    }
                } else {
                    if (bb % 3 === 0 || bb === 5 || bb === 11) {
                        const degSeq = [0, 2, 4, 3, 1, 4, 2, 0];
                        const idx = (bar * 2 + Math.floor(bb / 4)) % degSeq.length;
                        this._melody(t, midiHz(scaleNote(root, sc, degSeq[idx])), 0.15, 0.06, 'sine');
                    }
                }
            } else if (m === 'contemplative') {
                // Menu: sparse, beautiful
                if (bb === 0 && (bar === 0 || bar === 2)) {
                    const deg = [0, 3][bar / 2];
                    this._melody(t, midiHz(scaleNote(root, sc, deg)), 0.5, 0.05, 'sine');
                    this._melody(t + 0.1, midiHz(scaleNote(root, sc, deg + 2)), 0.4, 0.03, 'sine');
                }
                if (isSolo && bb === 0) {
                    const degSeq = [0, 2, 4, 3];
                    this._melody(t, midiHz(scaleNote(root, sc, degSeq[bar])), 0.6, 0.05, 'sine');
                }
            }

            // Pad layer for atmosphere (every 4 bars)
            if (bb === 0 && bar === 0) {
                this._pad(t, midiHz(scaleNote(this.root, sc, 0)), 0.04);
                this._pad(t, midiHz(scaleNote(this.root, sc, 2)), 0.02);
            }
        }

        _soloNote(t, root, sc, bb, bar, type, vol) {
            // Generate melodic solo lines based on sixteenth position
            // Pattern: 8 notes per bar, alternating runs and rests
            const noteSlots = [0, 2, 3, 4, 6, 8, 10, 12, 13, 14];
            if (!noteSlots.includes(bb)) return;

            // Stepwise motion with occasional leaps
            const baseSeq = [0, 1, 2, 3, 4, 3, 2, 1, 4, 5, 4, 3, 2, 1, 0, -1];
            const idx = (bar * 4 + Math.floor(bb / 4)) % baseSeq.length;
            const deg = baseSeq[idx] + (bar >= 2 ? 2 : 0); // shift up in bars 3-4

            this._melody(t, midiHz(scaleNote(root, sc, deg)), 0.08, vol, type);
        }

        _melody(t, freq, dur, vol, type) {
            if (!this.alive) return;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = type || 'triangle';
            osc.frequency.value = Math.max(60, freq);
            // Slight vibrato for eastern feel
            const lfo = ctx.createOscillator();
            const lfoG = ctx.createGain();
            lfo.frequency.value = 5;
            lfoG.gain.value = freq * 0.008;
            lfo.connect(lfoG); lfoG.connect(osc.frequency);
            lfo.start(t);

            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(vol, t + 0.015);
            g.gain.setValueAtTime(vol * 0.7, t + dur * 0.4);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(g); g.connect(musicGain);
            osc.start(t); osc.stop(t + dur + 0.05);
            lfo.stop(t + dur + 0.05);
        }

        _pad(t, freq, vol) {
            // Long ambient pad tone
            if (!this.alive) return;
            const dur = 60 / this.bpm * 4 * 3; // ~3 bars
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(vol, t + 1);
            g.gain.linearRampToValueAtTime(vol * 0.5, t + dur - 1);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(g); g.connect(musicGain);
            osc.start(t); osc.stop(t + dur + 0.1);
        }
    }

    // =========================================================
    // Public music control
    // =========================================================

    function playMusic(affinity) {
        init();
        resume();
        if (trackId === affinity && currentTrack && currentTrack.alive) return; // already playing
        stopMusic();
        trackId = affinity;
        currentTrack = new Track(affinity);
        currentTrack.start();
    }

    function stopMusic() {
        if (currentTrack) { currentTrack.stop(); currentTrack = null; }
        trackId = null;
    }

    function playSfx(name) {
        init();
        resume();
        if (sfx[name]) sfx[name]();
    }

    return {
        init,
        resume,
        toggleMute,
        isMuted,
        playMusic,
        stopMusic,
        playSfx,
    };
})();
