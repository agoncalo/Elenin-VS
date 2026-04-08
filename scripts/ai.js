// ============================================================
// ai.js - Enemy ninja AI
// ============================================================
class EnemyAI {
    constructor(fighter, levelData) {
        this.fighter = fighter;
        this.spells = levelData.spells || ['ZZZ', 'ZZX'];
        this.castRate = levelData.castRate || 2500;
        this.aiSpeed = levelData.aiSpeed || 0.6;
        this.castTimer = this.castRate + Math.random() * 1000;
        this.moveTimer = 0;
        this.moveDir = 0;
        this.laneTimer = 0;

        // Difficulty scales with enemy position in the roster (0-7)
        const idx = ENEMIES.findIndex(e => e.id === levelData.id);
        this.difficulty = idx >= 0 ? idx : 0;
        // Dodge chance scales: 0% for kaen, up to ~50% for ryujin
        this.dodgeChance = Math.min(0.5, this.difficulty * 0.07);
        // Smarter spell picks for harder enemies
        this.tactical = this.difficulty >= 3;
    }

    update(dt, combat) {
        const f = this.fighter;
        if (f.isStunned()) return;

        // ----- Movement -----
        this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
            this.moveTimer = 400 + Math.random() * 800;
            const r = Math.random();
            if (r < 0.3) {
                this.moveDir = -1;
            } else if (r < 0.5) {
                this.moveDir = 1;
            } else {
                this.moveDir = 0;
            }
        }

        if (this.moveDir !== 0 && !f.isStunned()) {
            const newX = f.x + this.moveDir * f.speed * this.aiSpeed * (dt / 16);
            const minX = CONFIG.MIDPOINT + 10;
            const maxX = CONFIG.FIELD_RIGHT - CONFIG.SPRITE - 10;
            f.x = Math.max(minX, Math.min(maxX, newX));
        }

        // ----- Lane switching / dodging -----
        this.laneTimer -= dt;
        if (this.laneTimer <= 0) {
            this.laneTimer = 600 + Math.random() * 1200;

            // Check for incoming projectiles in current lane
            const dominated = this._laneHasThreats(combat, f.lane);

            if (dominated && Math.random() < this.dodgeChance + 0.2) {
                // Dodge: pick a safe lane
                const safeLane = this._findSafeLane(combat, f.lane);
                if (safeLane > f.lane) f.switchLane(1);
                else if (safeLane < f.lane) f.switchLane(-1);
            } else if (Math.random() < 0.35 * this.aiSpeed) {
                // Aggressive: match player lane
                const playerLane = combat.player.lane;
                if (f.lane < playerLane) f.switchLane(1);
                else if (f.lane > playerLane) f.switchLane(-1);
            } else if (Math.random() < 0.25) {
                f.switchLane(Math.random() < 0.5 ? -1 : 1);
            }
        }

        // ----- Spell casting -----
        this.castTimer -= dt;
        if (this.castTimer <= 0) {
            this.castTimer = this.castRate * (0.7 + Math.random() * 0.6);
            this._castSpell(combat);
        }
    }

    _laneHasThreats(combat, lane) {
        return combat.projectiles.some(p =>
            p.alive && p.owner === 'player' && p.lane === lane && p.x > CONFIG.MIDPOINT - 100
        );
    }

    _findSafeLane(combat, currentLane) {
        // Find a lane with no incoming threats
        for (let offset = 1; offset < CONFIG.LANE_COUNT; offset++) {
            const up = currentLane - offset;
            const down = currentLane + offset;
            if (up >= 0 && !this._laneHasThreats(combat, up)) return up;
            if (down < CONFIG.LANE_COUNT && !this._laneHasThreats(combat, down)) return down;
        }
        return currentLane;
    }

    _castSpell(combat) {
        const f = this.fighter;
        const available = this.spells.filter(key => f.canCast(key));
        if (available.length === 0) return;

        let key;
        if (this.tactical) {
            key = this._pickTactical(available, combat);
        } else {
            key = available[Math.floor(Math.random() * available.length)];
        }

        combat.executeSpell(key, f);
    }

    _pickTactical(available, combat) {
        const f = this.fighter;
        const scored = available.map(key => {
            const spell = SPELL_DATA[key];
            if (!spell) return { key, score: 0 };
            let score = 1 + Math.random() * 2; // base randomness

            const stats = spell.stats;
            const type = spell.type;

            // Prioritize healing when HP low
            if (stats.healAmt && f.hp < f.maxHp * 0.5) {
                score += 4;
            }

            // Prioritize defensive when no shields/enchants
            if (type === 'defensive' && !f.shielded) {
                score += 2;
            }
            if (type === 'enchant' && !f.enchant) {
                score += 2.5;
            }

            // Prefer summons when we have few
            const ownSummons = combat.summons.filter(s => s.alive && s.owner === 'enemy').length;
            if (type === 'summon' && ownSummons < 2) {
                score += 2;
            }

            // Prefer lane effects when player has summons
            const playerSummons = combat.summons.filter(s => s.alive && s.owner === 'player').length;
            if (type === 'lane' && playerSummons > 0) {
                score += 2;
            }

            // Prefer attacks when player is low
            if (stats.dmg && combat.player.hp < combat.player.maxHp * 0.4) {
                score += 3;
            }

            // High-damage spells are generally good
            if (stats.dmg && stats.dmg >= 4) {
                score += 1.5;
            }

            return { key, score };
        });

        // Pick highest scored
        scored.sort((a, b) => b.score - a.score);
        // Small chance to pick 2nd best for variety
        if (scored.length > 1 && Math.random() < 0.25) {
            return scored[1].key;
        }
        return scored[0].key;
    }
}
