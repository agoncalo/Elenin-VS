// ============================================================
// input.js - Keyboard input and spell combo manager
// Direction + 2-key motion input system
// ============================================================

// Maps (direction, firstKey, secondKey) → spell combo key
const DIRECTION_SPELL_MAP = {
    forward: {
        Z: { Z: 'ZZZ', X: 'ZZX', C: 'ZZC' },   // physical
        X: { Z: 'XXZ', X: 'XXX', C: 'XXC' },     // lanes
        C: { Z: 'XCZ', X: 'XCX', C: 'XCC' },     // vlanes
    },
    back: {
        Z: { Z: 'ZCZ', X: 'ZCX', C: 'ZCC' },     // defensive
        X: { Z: 'ZXZ', X: 'ZXX', C: 'ZXC' },     // enchants
        C: { Z: 'CXZ', X: 'CXX', C: 'CXC' },     // power summons
    },
    neutral: {
        Z: { Z: 'XZZ', X: 'XZX', C: 'XZC' },     // magic proj
        X: { Z: 'CZZ', X: 'CZX', C: 'CZC' },     // support summons
        C: { Z: 'CCZ', X: 'CCX', C: 'CCC' },      // birds
    },
};

// Reverse lookup: spellKey → { dir, k1, k2 }
const SPELL_INPUT_LOOKUP = {};
for (const dir of Object.keys(DIRECTION_SPELL_MAP)) {
    for (const k1 of Object.keys(DIRECTION_SPELL_MAP[dir])) {
        for (const k2 of Object.keys(DIRECTION_SPELL_MAP[dir][k1])) {
            SPELL_INPUT_LOOKUP[DIRECTION_SPELL_MAP[dir][k1][k2]] = { dir, k1, k2 };
        }
    }
}

class InputManager {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this.onSpellCast = null;
        this.enabled = true;

        // Direction + 2-key combo state
        this.direction = null;      // 'forward' | 'back' | 'neutral' (set on first key)
        this.firstKey = null;       // 'Z' | 'X' | 'C'
        this.comboTimer = 0;

        this.locked = false;
        this.lockTimer = 0;
        this.lastDirection = null;  // last cast direction (for UI display)
        this.lastCombo = [];        // last cast combo keys (2 keys)
        this.lastSpellKey = '';     // last cast 3-char spell key
        this.postCastTimer = 0;
        this.postCastMax = 0;
        this.inputBuffer = [];      // buffered keys during post-cast cooldown

        // Configurable direction keys (flipped for multiplayer guest)
        this.forwardKey = 'ArrowRight';
        this.backKey = 'ArrowLeft';

        window.addEventListener('keydown', e => {
            if (!this.enabled) return;
            if (!this.keys[e.code]) this.justPressed[e.code] = true;
            this.keys[e.code] = true;

            if (['KeyZ', 'KeyX', 'KeyC'].includes(e.code)) {
                if (!this.locked) {
                    this._addKey(e.code);
                } else if (this.postCastTimer > 0 && this.inputBuffer.length < 2) {
                    this.inputBuffer.push(e.code);
                }
            }
            e.preventDefault();
        });

        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });
    }

    _getDirection() {
        const fwd = !!this.keys[this.forwardKey];
        const bck = !!this.keys[this.backKey];
        if (fwd && !bck) return 'forward';
        if (bck && !fwd) return 'back';
        return 'neutral';
    }

    _addKey(code) {
        const key = code === 'KeyZ' ? 'Z' : code === 'KeyX' ? 'X' : 'C';

        if (!this.firstKey) {
            // First key: snapshot direction
            this.direction = this._getDirection();
            this.firstKey = key;
            this.comboTimer = CONFIG.SPELL_INPUT_TIMEOUT;
            this.locked = true;
            this.lockTimer = CONFIG.COMBO_LOCKOUT;
        } else {
            // Second key: resolve and fire
            const secondKey = key;
            const map = DIRECTION_SPELL_MAP[this.direction];
            const spellKey = map && map[this.firstKey] && map[this.firstKey][secondKey];

            this.lastDirection = this.direction;
            this.lastCombo = [this.firstKey, secondKey];
            this.lastSpellKey = spellKey || '';
            this.firstKey = null;
            this.direction = null;
            this.comboTimer = 0;
            // Post-cast cooldown
            this.locked = true;
            this.postCastMax = CONFIG.POST_CAST_COOLDOWN;
            this.postCastTimer = this.postCastMax;
            this.lockTimer = this.postCastMax;
            if (spellKey && this.onSpellCast) this.onSpellCast(spellKey);
        }
    }

    update(dt) {
        // Combo timeout (first key entered but second not pressed in time)
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.firstKey = null;
                this.direction = null;
                this.comboTimer = 0;
                this.inputBuffer = [];
            }
        }

        // Post-cast cooldown
        if (this.postCastTimer > 0) {
            this.postCastTimer -= dt;
            if (this.postCastTimer <= 0) {
                this.postCastTimer = 0;
                this.lastCombo = [];
                this.lastDirection = null;
                this.lastSpellKey = '';
            }
        }

        // Key lockout between presses
        if (this.lockTimer > 0) {
            this.lockTimer -= dt;
            if (this.lockTimer <= 0) {
                this.locked = false;
                this.inputBuffer = [];
            }
        }
    }

    lateUpdate() {
        this.justPressed = {};
    }

    isDown(code) { return !!this.keys[code]; }
    wasPressed(code) { return !!this.justPressed[code]; }

    reset() {
        this.keys = {};
        this.justPressed = {};
        this.firstKey = null;
        this.direction = null;
        this.comboTimer = 0;
        this.locked = false;
        this.lastDirection = null;
        this.lastCombo = [];
        this.lastSpellKey = '';
        this.postCastTimer = 0;
        this.postCastMax = 0;
        this.inputBuffer = [];
        this.onSpellCast = null;
    }

    // Returns current combo display state for UI
    // { direction, keys[], spellKey } or post-cast state
    getCombo() {
        if (this.postCastTimer > 0 && this.lastCombo.length === 2) {
            return { direction: this.lastDirection, keys: [...this.lastCombo], spellKey: this.lastSpellKey };
        }
        if (this.firstKey) {
            return { direction: this.direction, keys: [this.firstKey], spellKey: '' };
        }
        return { direction: null, keys: [], spellKey: '' };
    }

    getPostCastProgress() {
        if (this.postCastMax <= 0 || this.postCastTimer <= 0) return 0;
        return this.postCastTimer / this.postCastMax;
    }
}
