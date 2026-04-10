// ============================================================
// input.js - Keyboard input and spell combo manager
// ============================================================
class InputManager {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this.combo = [];
        this.comboTimer = 0;
        this.onSpellCast = null;

        this.locked = false;
        this.lockTimer = 0;
        this.enabled = true;
        this.lastCombo = [];          // last cast combo keys
        this.postCastTimer = 0;       // post-cast cooldown remaining
        this.postCastMax = 0;         // post-cast cooldown total (for progress)
        this.inputBuffer = [];        // buffered keys during post-cast cooldown

        window.addEventListener('keydown', e => {
            if (!this.enabled) return;
            if (!this.keys[e.code]) this.justPressed[e.code] = true;
            this.keys[e.code] = true;

            if (['KeyZ', 'KeyX', 'KeyC'].includes(e.code)) {
                if (!this.locked) {
                    this._addOrb(e.code);
                } else if (this.postCastTimer > 0 && this.inputBuffer.length < 3) {
                    // Buffer inputs during post-cast cooldown (fighting game input buffer)
                    this.inputBuffer.push(e.code);
                }
            }
            e.preventDefault();
        });

        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });
    }

    _addOrb(code) {
        const orb = code === 'KeyZ' ? 'Z' : code === 'KeyX' ? 'X' : 'C';
        this.combo.push(orb);
        this.comboTimer = CONFIG.SPELL_INPUT_TIMEOUT;
        this.locked = true;
        this.lockTimer = CONFIG.COMBO_LOCKOUT;

        if (this.combo.length >= 3) {
            const key = this.combo.join('');
            this.lastCombo = [...this.combo];
            this.combo = [];
            this.comboTimer = 0;
            // Post-cast cooldown — keeps last orbs visible
            this.locked = true;
            this.postCastMax = CONFIG.POST_CAST_COOLDOWN;
            this.postCastTimer = this.postCastMax;
            this.lockTimer = this.postCastMax;
            if (this.onSpellCast) this.onSpellCast(key);
        }
    }

    update(dt) {
        // Combo timeout
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = [];
                this.comboTimer = 0;
                this.inputBuffer = []; // clear stale buffer on timeout
            }
        }

        // Post-cast cooldown
        if (this.postCastTimer > 0) {
            this.postCastTimer -= dt;
            if (this.postCastTimer <= 0) {
                this.postCastTimer = 0;
                this.lastCombo = [];
            }
        }

        // Key lockout between orbs
        if (this.lockTimer > 0) {
            this.lockTimer -= dt;
            if (this.lockTimer <= 0) {
                this.locked = false;
                // Discard any keys buffered during post-cast cooldown
                // (prevents stale Z bleeding into the next combo)
                this.inputBuffer = [];
            }
        }
    }

    // Call after all scene updates to clear one-frame flags
    lateUpdate() {
        this.justPressed = {};
    }

    isDown(code) { return !!this.keys[code]; }
    wasPressed(code) { return !!this.justPressed[code]; }

    reset() {
        this.keys = {};
        this.justPressed = {};
        this.combo = [];
        this.comboTimer = 0;
        this.locked = false;
        this.lastCombo = [];
        this.postCastTimer = 0;
        this.postCastMax = 0;
        this.inputBuffer = [];
        this.onSpellCast = null;
    }

    getCombo() {
        // During post-cast cooldown, return the last cast combo
        if (this.postCastTimer > 0 && this.lastCombo.length === 3) return [...this.lastCombo];
        return [...this.combo];
    }

    getPostCastProgress() {
        // Returns 0-1 (1 = just cast, 0 = ready)
        if (this.postCastMax <= 0 || this.postCastTimer <= 0) return 0;
        return this.postCastTimer / this.postCastMax;
    }
}
