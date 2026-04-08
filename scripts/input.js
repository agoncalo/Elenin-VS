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

        window.addEventListener('keydown', e => {
            if (!this.enabled) return;
            if (!this.keys[e.code]) this.justPressed[e.code] = true;
            this.keys[e.code] = true;

            if (['KeyZ', 'KeyX', 'KeyC'].includes(e.code) && !this.locked) {
                this._addOrb(e.code);
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
            this.combo = [];
            this.comboTimer = 0;
            // Post-cast cooldown to prevent misinputs
            this.locked = true;
            this.lockTimer = 300;
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
            }
        }

        // Key lockout between orbs
        if (this.lockTimer > 0) {
            this.lockTimer -= dt;
            if (this.lockTimer <= 0) this.locked = false;
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
        this.onSpellCast = null;
    }

    getCombo() { return [...this.combo]; }
}
