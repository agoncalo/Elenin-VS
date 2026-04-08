// ============================================================
// stats.js - Player stats tracking & persistence (localStorage)
// ============================================================
class PlayerStats {
    constructor() {
        this._key = 'eleninVS_stats';
        this.data = this._load();
    }

    _defaults() {
        return {
            totalFights: 0,
            wins: 0,
            losses: 0,
            // Damage
            dmgDealt: 0,
            dmgTaken: 0,
            dmgBlocked: 0,
            // Spells cast by type
            spellsCast: {},      // { comboKey: count }
            typeCast: {          // { type: count }
                projectile: 0, instant: 0, enchant: 0,
                defensive: 0, lane: 0, aoe: 0, summon: 0
            },
            // Summons
            summonsSpawned: {},  // { comboKey: count }
            summonKills: 0,      // enemy summons killed
            // Affinity usage
            affinityCast: {},    // { affinity: count }
            // Evasion
            laneSwitches: 0,
            dodgedProjectiles: 0,// switched lane when incoming projectile
            // Control
            laneEffectsPlaced: 0,
            stunsFrozes: 0,      // stun/freeze applied to enemy
            // Summon deaths
            ownSummonsLost: 0,
        };
    }

    _load() {
        try {
            const raw = localStorage.getItem(this._key);
            if (raw) {
                const d = JSON.parse(raw);
                // Merge with defaults for forward-compat
                const def = this._defaults();
                for (const k in def) {
                    if (d[k] === undefined) d[k] = def[k];
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

    // --- Tracking methods (called from combat) ---
    recordSpellCast(comboKey) {
        const spell = SPELL_DATA[comboKey];
        if (!spell) return;
        this.data.spellsCast[comboKey] = (this.data.spellsCast[comboKey] || 0) + 1;
        this.data.typeCast[spell.type] = (this.data.typeCast[spell.type] || 0) + 1;
        const aff = spell.affinity || 'none';
        this.data.affinityCast[aff] = (this.data.affinityCast[aff] || 0) + 1;
        if (spell.type === 'summon') {
            this.data.summonsSpawned[comboKey] = (this.data.summonsSpawned[comboKey] || 0) + 1;
        }
        if (spell.type === 'lane') {
            this.data.laneEffectsPlaced++;
        }
    }

    recordDmgDealt(amount) { this.data.dmgDealt += amount; }
    recordDmgTaken(amount) { this.data.dmgTaken += amount; }
    recordDmgBlocked() { this.data.dmgBlocked++; }
    recordLaneSwitch(dodged) {
        this.data.laneSwitches++;
        if (dodged) this.data.dodgedProjectiles++;
    }
    recordStunFreeze() { this.data.stunsFrozes++; }
    recordSummonKill() { this.data.summonKills++; }
    recordOwnSummonLost() { this.data.ownSummonsLost++; }
    recordFightEnd(won) {
        this.data.totalFights++;
        if (won) this.data.wins++; else this.data.losses++;
        this.save();
    }

    // --- Computed stats for display ---
    get totalSpellsCast() {
        let t = 0;
        for (const k in this.data.spellsCast) t += this.data.spellsCast[k];
        return t;
    }

    getFavoriteSpells(n) {
        return Object.entries(this.data.spellsCast)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([k, v]) => ({ key: k, name: SPELL_DATA[k]?.name || k, count: v }));
    }

    getFavoriteSummons(n) {
        return Object.entries(this.data.summonsSpawned)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([k, v]) => ({ key: k, name: SPELL_DATA[k]?.name || k, count: v }));
    }

    getFavoriteElement() {
        const entries = Object.entries(this.data.affinityCast).filter(([k]) => k !== 'none');
        if (entries.length === 0) return 'none';
        entries.sort((a, b) => b[1] - a[1]);
        return entries[0][0];
    }

    // --- Hexagon playstyle axes (0-1 each) ---
    // Designed so that typical play produces balanced-ish values.
    // Each axis is normalized against "expected" ratios from typical gameplay.
    getPlaystyle() {
        const d = this.data;
        const total = this.totalSpellsCast || 1;
        const fights = d.totalFights || 1;

        // ASSAULT: physical/magic damage output. Expected: ~55% of casts are attacks
        const attackCasts = (d.typeCast.projectile || 0) + (d.typeCast.instant || 0) + (d.typeCast.aoe || 0);
        const assaultRatio = attackCasts / total;
        const assault = Math.min(1, assaultRatio / 0.55); // normalized so 55% = 1.0

        // DEFENSE: shield/defensive usage. Expected: ~10% of casts
        const defCasts = d.typeCast.defensive || 0;
        const defRatio = defCasts / total;
        const defense = Math.min(1, defRatio / 0.10);

        // EVASION: lane switches per fight, with dodged projectiles bonus.
        // Expected: ~15 lane switches per fight
        const switchesPerFight = d.laneSwitches / fights;
        const dodgeBonus = d.dodgedProjectiles / Math.max(1, d.laneSwitches);
        const evasion = Math.min(1, (switchesPerFight / 15) * 0.7 + dodgeBonus * 0.3);

        // CONTROL: lane effects + stuns/freezes. Expected: ~12% of casts + 3 stuns per fight
        const controlCasts = (d.typeCast.lane || 0) + (d.typeCast.enchant || 0);
        const controlRatio = controlCasts / total;
        const stunsPerFight = d.stunsFrozes / fights;
        const control = Math.min(1, controlRatio / 0.12 * 0.5 + (stunsPerFight / 3) * 0.5);

        // SUMMONER: summon usage. Expected: ~15% of casts are summons
        const summonCasts = d.typeCast.summon || 0;
        const summonRatio = summonCasts / total;
        const summoner = Math.min(1, summonRatio / 0.15);

        // RESILIENCE: survival efficiency. Low dmg taken per fight + blocks.
        // Expected: ~25 dmg taken per fight, 5 blocks per fight
        const dmgPerFight = d.dmgTaken / fights;
        const blocksPerFight = d.dmgBlocked / fights;
        const resilience = Math.min(1,
            (1 - Math.min(1, dmgPerFight / 25)) * 0.6 +
            Math.min(1, blocksPerFight / 5) * 0.4
        );

        return { assault, defense, evasion, control, summoner, resilience };
    }

    reset() {
        this.data = this._defaults();
        this.save();
    }
}
