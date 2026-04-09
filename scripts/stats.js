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
            endHpRatio: 0,
            endLoyaltyRatio: 0,
            enemyProjsFired: 0,
            projsHitBy: 0,
            enemyMaxPool: 0,
            playerProjsFired: 0,
            playerProjsHit: 0,
            lanePeakEnemies: [0,0,0,0,0],
            laneMaxHits: [0,0,0,0,0],
            globalPeakEnemies: 0,
            globalMaxHits: 0,
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
    recordEnemyProjFired() { this._fight.enemyProjsFired++; }
    recordProjHitBy() { this._fight.projsHitBy++; }
    recordPlayerProjFired() { this._fight.playerProjsFired++; }
    recordPlayerProjHit() { this._fight.playerProjsHit++; }
    recordLaneSwitch(dodged) {
        this._fight.laneSwitches++;
        if (dodged) this._fight.dodgedProjectiles++;
    }
    recordStunFreeze() { this._fight.stunsFrozes++; }
    recordSummonKill() { this._fight.summonKills++; }
    recordOwnSummonLost() { this._fight.ownSummonsLost++; }
    updateLanePeak(lane, count) {
        if (count > this._fight.lanePeakEnemies[lane]) this._fight.lanePeakEnemies[lane] = count;
    }
    updateGlobalPeak(count) {
        if (count > this._fight.globalPeakEnemies) this._fight.globalPeakEnemies = count;
    }
    recordLaneHits(lane, count) {
        if (count > this._fight.laneMaxHits[lane]) this._fight.laneMaxHits[lane] = count;
    }
    recordGlobalHits(count) {
        if (count > this._fight.globalMaxHits) this._fight.globalMaxHits = count;
    }
    recordFightEnd(won, player, enemy) {
        this._fight.won = won;
        if (player) {
            this._fight.endHpRatio = Math.max(0, player.hp / player.maxHp);
            this._fight.endLoyaltyRatio = Math.max(0, player.loyalty / player.maxLoyalty);
        }
        if (enemy) {
            this._fight.enemyMaxPool = enemy.maxHp + enemy.maxLoyalty;
        }
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
        const recent = this._recent();
        const fights = Math.max(1, recent.length);

        // WRATH: tactical targeting — did you use AOE/lane spells at the right time?
        // Average of (best hits / peak enemies) per lane + global
        let wrathNum = 0, wrathDen = 0;
        for (let i = 0; i < 5; i++) {
            let peak = 0, best = 0;
            for (const f of recent) {
                peak += (f.lanePeakEnemies ? f.lanePeakEnemies[i] : 0);
                best += (f.laneMaxHits ? f.laneMaxHits[i] : 0);
            }
            if (peak > 0) { wrathNum += Math.min(1, best / peak); wrathDen++; }
        }
        let gPeak = 0, gBest = 0;
        for (const f of recent) {
            gPeak += (f.globalPeakEnemies || 0);
            gBest += (f.globalMaxHits || 0);
        }
        if (gPeak > 0) { wrathNum += Math.min(1, gBest / gPeak); wrathDen++; }
        const wrath = wrathDen > 0 ? wrathNum / wrathDen : 0;

        // DEFENSE: how much of your own life and loyalty you preserved at fight's end
        let hpSum = 0, loySum = 0;
        for (const f of recent) {
            hpSum += (f.endHpRatio || 0);
            loySum += (f.endLoyaltyRatio || 0);
        }
        const defense = (hpSum + loySum) / (fights * 2);

        // EVASION: how many enemy projectiles you avoided — 1 minus your hit rate
        const enemyProjs = this._sum('enemyProjsFired');
        const hitBy = this._sum('projsHitBy');
        const evasion = enemyProjs > 0 ? 1 - (hitBy / enemyProjs) : 0;

        // HARMONY: how much of your kit you use vs repeating the same opener
        // unique 2-letter prefixes / totalCasts averaged across recent fights
        let harmonySum = 0;
        for (const f of recent) {
            const sc = f.spellsCast || {};
            const prefixes = new Set();
            let castTotal = 0;
            for (const [key, count] of Object.entries(sc)) {
                prefixes.add(key.slice(0, 2));
                castTotal += count;
            }
            if (castTotal > 0) harmonySum += prefixes.size / castTotal;
        }
        const harmony = harmonySum / fights;

        // SUMMON: the army exchange — of all summons felled on both sides, how many were theirs?
        const kills = this._sum('summonKills');
        const lost = this._sum('ownSummonsLost');
        const summon = (kills + lost) > 0 ? kills / (kills + lost) : 0;

        // FOCUS: accuracy — how many of your projectiles actually hit
        const playerFired = this._sum('playerProjsFired');
        const playerHit = this._sum('playerProjsHit');
        const focus = playerFired > 0 ? Math.min(1, playerHit / playerFired) : 0;

        return { wrath, defense, evasion, harmony, summon, focus };
    }

    reset() {
        this.data = this._defaults();
        this._fight = this._fightDefaults();
        this.save();
    }
}
