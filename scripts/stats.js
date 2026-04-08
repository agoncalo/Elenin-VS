// ============================================================
// stats.js - Player stats tracking & persistence (localStorage)
// Rolling window: only the last N fights count for playstyle.
// ============================================================
class PlayerStats {
    constructor() {
        this._key = 'eleninVS_stats';
        this._maxHistory = 10; // rolling window size
        this.data = this._load();
        // Per-fight accumulator (reset each fight)
        this._fight = this._fightDefaults();
    }

    _fightDefaults() {
        return {
            won: false,
            dmgDealt: 0, dmgTaken: 0, dmgBlocked: 0,
            spellsCast: {},
            typeCast: { projectile: 0, instant: 0, enchant: 0, defensive: 0, lane: 0, aoe: 0, summon: 0 },
            affinityCast: {},
            summonsSpawned: {},
            summonKills: 0,
            ownSummonsLost: 0,
            laneSwitches: 0,
            dodgedProjectiles: 0,
            laneEffectsPlaced: 0,
            stunsFrozes: 0,
        };
    }

    _defaults() {
        return {
            totalFights: 0,
            wins: 0,
            losses: 0,
            history: [], // array of per-fight snapshots (most recent last)
        };
    }

    _load() {
        try {
            const raw = localStorage.getItem(this._key);
            if (raw) {
                const d = JSON.parse(raw);
                const def = this._defaults();
                for (const k in def) {
                    if (d[k] === undefined) d[k] = def[k];
                }
                // Migrate old cumulative format into a single history entry
                if (d.history.length === 0 && d.totalFights > 0 && d.spellsCast) {
                    d.history.push({
                        won: false,
                        dmgDealt: d.dmgDealt || 0,
                        dmgTaken: d.dmgTaken || 0,
                        dmgBlocked: d.dmgBlocked || 0,
                        spellsCast: d.spellsCast || {},
                        typeCast: d.typeCast || this._fightDefaults().typeCast,
                        affinityCast: d.affinityCast || {},
                        summonsSpawned: d.summonsSpawned || {},
                        summonKills: d.summonKills || 0,
                        ownSummonsLost: d.ownSummonsLost || 0,
                        laneSwitches: d.laneSwitches || 0,
                        dodgedProjectiles: d.dodgedProjectiles || 0,
                        laneEffectsPlaced: d.laneEffectsPlaced || 0,
                        stunsFrozes: d.stunsFrozes || 0,
                    });
                }
                return d;
            }
        } catch (e) { /* ignore corrupt data */ }
        return this._defaults();
    }

    save() {
        try {
            localStorage.setItem(this._key, JSON.stringify(this.data));
        } catch (e) { /* storage full, ignore */ }
    }

    // --- Recent history (rolling window) ---
    _recent() {
        return this.data.history.slice(-this._maxHistory);
    }

    // Aggregate a numeric field across recent fights
    _sum(field) {
        let t = 0;
        for (const f of this._recent()) t += (f[field] || 0);
        return t;
    }

    // Aggregate an object-of-counts field across recent fights
    _sumObj(field) {
        const out = {};
        for (const f of this._recent()) {
            const obj = f[field];
            if (!obj) continue;
            for (const k in obj) out[k] = (out[k] || 0) + obj[k];
        }
        return out;
    }

    // Aggregate typeCast across recent fights
    _sumTypeCast() {
        const out = { projectile: 0, instant: 0, enchant: 0, defensive: 0, lane: 0, aoe: 0, summon: 0 };
        for (const f of this._recent()) {
            if (!f.typeCast) continue;
            for (const k in out) out[k] += (f.typeCast[k] || 0);
        }
        return out;
    }

    // --- Tracking methods (called from combat, accumulate into _fight) ---
    recordSpellCast(comboKey) {
        const spell = SPELL_DATA[comboKey];
        if (!spell) return;
        this._fight.spellsCast[comboKey] = (this._fight.spellsCast[comboKey] || 0) + 1;
        this._fight.typeCast[spell.type] = (this._fight.typeCast[spell.type] || 0) + 1;
        const aff = spell.affinity || 'none';
        this._fight.affinityCast[aff] = (this._fight.affinityCast[aff] || 0) + 1;
        if (spell.type === 'summon') {
            this._fight.summonsSpawned[comboKey] = (this._fight.summonsSpawned[comboKey] || 0) + 1;
        }
        if (spell.type === 'lane') {
            this._fight.laneEffectsPlaced++;
        }
    }

    recordDmgDealt(amount) { this._fight.dmgDealt += amount; }
    recordDmgTaken(amount) { this._fight.dmgTaken += amount; }
    recordDmgBlocked() { this._fight.dmgBlocked++; }
    recordLaneSwitch(dodged) {
        this._fight.laneSwitches++;
        if (dodged) this._fight.dodgedProjectiles++;
    }
    recordStunFreeze() { this._fight.stunsFrozes++; }
    recordSummonKill() { this._fight.summonKills++; }
    recordOwnSummonLost() { this._fight.ownSummonsLost++; }
    recordFightEnd(won) {
        this._fight.won = won;
        this.data.totalFights++;
        if (won) this.data.wins++; else this.data.losses++;
        // Push fight snapshot into history, trim to max
        this.data.history.push({ ...this._fight });
        if (this.data.history.length > this._maxHistory * 2) {
            this.data.history = this.data.history.slice(-this._maxHistory);
        }
        this.save();
        // Reset accumulator for next fight
        this._fight = this._fightDefaults();
    }

    // --- Computed stats for display (from rolling window) ---
    get totalSpellsCast() {
        let t = 0;
        const sc = this._sumObj('spellsCast');
        for (const k in sc) t += sc[k];
        return t;
    }

    getFavoriteSpells(n) {
        return Object.entries(this._sumObj('spellsCast'))
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([k, v]) => ({ key: k, name: SPELL_DATA[k]?.name || k, count: v }));
    }

    getFavoriteSummons(n) {
        return Object.entries(this._sumObj('summonsSpawned'))
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([k, v]) => ({ key: k, name: SPELL_DATA[k]?.name || k, count: v }));
    }

    getFavoriteElement() {
        const entries = Object.entries(this._sumObj('affinityCast')).filter(([k]) => k !== 'none');
        if (entries.length === 0) return 'none';
        entries.sort((a, b) => b[1] - a[1]);
        return entries[0][0];
    }

    // --- Hexagon playstyle axes (0-1 each) ---
    getPlaystyle() {
        const tc = this._sumTypeCast();
        const total = this.totalSpellsCast || 1;
        const fights = Math.max(1, this._recent().length);

        // ASSAULT: attack casts ratio. Expected: ~55%
        const attackCasts = (tc.projectile || 0) + (tc.instant || 0) + (tc.aoe || 0);
        const assault = Math.min(1, (attackCasts / total) / 0.55);

        // DEFENSE: defensive casts ratio. Expected: ~10%
        const defense = Math.min(1, ((tc.defensive || 0) / total) / 0.10);

        // EVASION: lane switches per fight + dodge rate
        const switchesPerFight = this._sum('laneSwitches') / fights;
        const totalSwitches = this._sum('laneSwitches') || 1;
        const dodgeBonus = this._sum('dodgedProjectiles') / totalSwitches;
        const evasion = Math.min(1, (switchesPerFight / 15) * 0.7 + dodgeBonus * 0.3);

        // CONTROL: lane/enchant casts + stuns per fight
        const controlCasts = (tc.lane || 0) + (tc.enchant || 0);
        const stunsPerFight = this._sum('stunsFrozes') / fights;
        const control = Math.min(1, ((controlCasts / total) / 0.12) * 0.5 + (stunsPerFight / 3) * 0.5);

        // SUMMONER: summon casts ratio. Expected: ~15%
        const summoner = Math.min(1, ((tc.summon || 0) / total) / 0.15);

        // RESILIENCE: survival efficiency
        const dmgPerFight = this._sum('dmgTaken') / fights;
        const blocksPerFight = this._sum('dmgBlocked') / fights;
        const resilience = Math.min(1,
            (1 - Math.min(1, dmgPerFight / 25)) * 0.6 +
            Math.min(1, blocksPerFight / 5) * 0.4
        );

        return { assault, defense, evasion, control, summoner, resilience };
    }

    reset() {
        this.data = this._defaults();
        this._fight = this._fightDefaults();
        this.save();
    }
}
