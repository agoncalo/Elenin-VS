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

        // Combo planning (difficulty >= 3)
        this.comboQueue = [];       // planned spell keys to cast in sequence
        this.comboDelay = 0;        // ms between combo casts
        this.comboCooldown = 0;     // time until next combo attempt
        this.trapIntent = false;    // wants to match player lane before laying hazard
    }

    update(dt, combat) {
        const f = this.fighter;
        if (f.isStunned()) return;

        // ----- Movement -----
        this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
            this.moveTimer = 400 + Math.random() * 800;
            this._decideMovement(combat);
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
            this._decideLane(combat);
        }

        // ----- Combo queue execution -----
        if (this.comboQueue.length > 0) {
            this.comboDelay -= dt;
            if (this.comboDelay <= 0) {
                const nextKey = this.comboQueue.shift();
                if (f.canCast(nextKey)) {
                    combat.executeSpell(nextKey, f);
                }
                this.comboDelay = 350 + Math.random() * 200; // fast follow-up
            }
            return; // don't do normal casting while executing combo
        }

        // ----- Combo planning -----
        if (this.comboCooldown > 0) this.comboCooldown -= dt;

        // ----- Spell casting -----
        this.castTimer -= dt;
        if (this.castTimer <= 0) {
            this.castTimer = this.castRate * (0.7 + Math.random() * 0.6);
            this._castSpell(combat);
        }
    }

    // ----- Movement decisions -----
    _decideMovement(combat) {
        const f = this.fighter;

        // Tactical: advance to pressure when player is low or we have shield
        if (this.tactical && (combat.player.hp < combat.player.maxHp * 0.3 || f.shielded)) {
            this.moveDir = -1; // advance toward midline
            return;
        }

        // Tactical: retreat when low HP
        if (this.tactical && f.hp < f.maxHp * 0.3) {
            this.moveDir = 1; // retreat
            return;
        }

        const r = Math.random();
        if (r < 0.3) this.moveDir = -1;
        else if (r < 0.5) this.moveDir = 1;
        else this.moveDir = 0;
    }

    // ----- Lane decisions -----
    _decideLane(combat) {
        const f = this.fighter;
        const dominated = this._laneHasThreats(combat, f.lane);
        const laneHazard = this._laneHasHazard(combat, f.lane);

        // Trap intent: aggressively match player lane to set up lane hazards
        if (this.trapIntent && this.difficulty >= 3) {
            const playerLane = combat.player.lane;
            if (f.lane !== playerLane) {
                if (f.lane < playerLane) f.switchLane(1);
                else f.switchLane(-1);
            } else {
                this.trapIntent = false; // in position, ready to cast
            }
            return;
        }

        // Shield through hazards: if we have shield/invis, stay and fight
        if ((laneHazard || dominated) && (f.shielded || f.invisible)) {
            return; // hold lane, we're protected
        }

        // Dodge lane hazards (high priority)
        if (laneHazard && this.difficulty >= 2) {
            // Try to shield first if available at high difficulty
            if (this.difficulty >= 5 && f.canCast('ZCZ') && this.spells.includes('ZCZ')) {
                combat.executeSpell('ZCZ', f);
                return; // shield up, stay in lane
            }
            const safeLane = this._findSafeLane(combat, f.lane);
            if (safeLane > f.lane) f.switchLane(1);
            else if (safeLane < f.lane) f.switchLane(-1);
            return;
        }

        if (dominated && Math.random() < this.dodgeChance + 0.2) {
            const safeLane = this._findSafeLane(combat, f.lane);
            if (safeLane > f.lane) f.switchLane(1);
            else if (safeLane < f.lane) f.switchLane(-1);
        } else if (this.tactical && this._bestSummonLane(combat) !== null && Math.random() < 0.4) {
            // Hunt player summons: match lane with highest-value summon
            const targetLane = this._bestSummonLane(combat);
            if (f.lane < targetLane) f.switchLane(1);
            else if (f.lane > targetLane) f.switchLane(-1);
        } else if (Math.random() < 0.35 * this.aiSpeed) {
            // Aggressive: match player lane
            const playerLane = combat.player.lane;
            if (f.lane < playerLane) f.switchLane(1);
            else if (f.lane > playerLane) f.switchLane(-1);
        } else if (Math.random() < 0.25) {
            f.switchLane(Math.random() < 0.5 ? -1 : 1);
        }
    }

    _laneHasThreats(combat, lane) {
        return combat.projectiles.some(p =>
            p.alive && p.owner === 'player' && p.lane === lane && p.x > CONFIG.MIDPOINT - 100
        );
    }

    _laneHasHazard(combat, lane) {
        return combat.laneEffects.some(le =>
            le.alive && le.owner === 'player' && le.lane === lane
        );
    }

    _findSafeLane(combat, currentLane) {
        for (let offset = 1; offset < CONFIG.LANE_COUNT; offset++) {
            const up = currentLane - offset;
            const down = currentLane + offset;
            if (up >= 0 && !this._laneHasThreats(combat, up) && !this._laneHasHazard(combat, up)) return up;
            if (down < CONFIG.LANE_COUNT && !this._laneHasThreats(combat, down) && !this._laneHasHazard(combat, down)) return down;
        }
        return currentLane;
    }

    // Find the lane with the most valuable player summon to hunt
    _bestSummonLane(combat) {
        const playerSummons = combat.summons.filter(s => s.alive && s.owner === 'player');
        if (playerSummons.length === 0) return null;
        // Prioritize: healers > high-damage > tanks
        let best = null, bestVal = 0;
        for (const s of playerSummons) {
            let val = s.loyaltyVal;
            if (s.healAmt > 0) val += 4;  // healers are high priority targets
            if (s.dmg >= 3) val += 2;     // heavy hitters
            if (s.deflectChance > 0) val += 1.5; // annoying deflectors
            if (val > bestVal) { bestVal = val; best = s; }
        }
        return best ? best.lane : null;
    }

    _castSpell(combat) {
        const f = this.fighter;
        const available = this.spells.filter(key => f.canCast(key));
        if (available.length === 0) return;

        // Try combo planning for difficulty >= 3
        if (this.difficulty >= 3 && this.comboCooldown <= 0 && Math.random() < 0.35 + this.difficulty * 0.05) {
            const combo = this._planCombo(available, combat);
            if (combo && combo.length >= 2) {
                // Cast first spell immediately, queue the rest
                const first = combo.shift();
                combat.executeSpell(first, f);
                this.comboQueue = combo;
                this.comboDelay = 350 + Math.random() * 200;
                this.comboCooldown = 4000 + Math.random() * 2000;
                return;
            }
        }

        let key;
        if (this.tactical) {
            key = this._pickTactical(available, combat);
        } else {
            key = available[Math.floor(Math.random() * available.length)];
        }

        // Trap setup: if casting lane spell, match player lane first
        if (key && SPELL_DATA[key]?.type === 'lane' && f.lane !== combat.player.lane && this.difficulty >= 3) {
            this.trapIntent = true;
            this.castTimer = 300; // retry soon after lane switch
            return;
        }

        combat.executeSpell(key, f);
    }

    // ===== COMBO PLANNING =====
    _planCombo(available, combat) {
        const f = this.fighter;
        const player = combat.player;

        // Check which spells we have access to
        const has = key => available.includes(key);
        const canSoon = key => this.spells.includes(key); // in spell list even if on CD

        // --- Summon-clearing combos: nuke player summons for loyalty damage ---
        const playerSummons = combat.summons.filter(s => s.alive && s.owner === 'player');
        if (playerSummons.length >= 2) {
            // AOE wipes all summons — top priority when player has a swarm
            if (has('XCC') && has('XCZ')) return ['XCC', 'XCZ']; // stun → meteor rain (hits all summons)
            if (has('ZCZ') && has('XCZ')) return ['ZCZ', 'XCZ']; // shield → meteor rain
            // Lane effect under summon cluster
            const summonLanes = [...new Set(playerSummons.map(s => s.lane))];
            if (summonLanes.includes(f.lane)) {
                if (has('XXX')) return has('ZZX') ? ['XXX', 'ZZX'] : has('XZZ') ? ['XXX', 'XZZ'] : null;
                if (has('XXZ')) return has('ZZX') ? ['XXZ', 'ZZX'] : has('XZX') ? ['XXZ', 'XZX'] : null;
            }
        } else if (playerSummons.length === 1 && playerSummons[0].healAmt > 0) {
            // Kill enemy healer ASAP — they sustain everything
            const healerLane = playerSummons[0].lane;
            if (healerLane === f.lane) {
                if (has('ZZX')) return ['ZZX']; // slash it immediately (will still fall through)
            }
        }

        // --- Stun/Freeze → Lane Trap (stun player, lay hazard under them) ---
        const inPlayerLane = f.lane === player.lane;
        if (inPlayerLane || this.difficulty >= 5) {
            if (has('XCC') && has('XXX')) return ['XCC', 'XXX']; // stun → inferno path
            if (has('XCC') && has('XXZ')) return ['XCC', 'XXZ']; // stun → frostbite path
        }

        // --- Stun → heavy attack combos ---
        // Thunder Wrath (XCC) → Sword Slash (ZZX) or Meteor Rain (XCZ)
        if (has('XCC')) {
            if (has('ZZX')) return ['XCC', 'ZZX'];
            if (has('XCZ')) return ['XCC', 'XCZ'];
            if (has('XZZ')) return ['XCC', 'XZZ'];
        }
        // Volt Enchant stun via Ice Shard/Fireball → follow-up
        if (has('ZXC') && (has('ZZX') || has('XXC'))) {
            const followUp = has('ZZX') ? 'ZZX' : 'XXC';
            return ['ZXC', followUp]; // enchant then slash/boulder
        }

        // --- Shield → walk through hazards + attack ---
        const inHazard = this._laneHasHazard(combat, f.lane);
        if (inHazard && has('ZCZ')) {
            // Shield up, then counter-attack
            if (has('ZZX')) return ['ZCZ', 'ZZX'];
            if (has('XZZ')) return ['ZCZ', 'XZZ'];
        }

        // --- Trap combos: lane effect → zone control ---
        // Lane effect → projectile to punish dodge attempts
        if (inPlayerLane) {
            if (has('XXX') && has('XZZ')) return ['XXX', 'XZZ']; // fire path + fireball
            if (has('XXZ') && has('XZX')) return ['XXZ', 'XZX']; // frost path + ice shard
            if (has('XXX') && has('ZZX')) return ['XXX', 'ZZX']; // fire path + sword slash
            if (has('XXZ') && has('ZZX')) return ['XXZ', 'ZZX']; // frost path + sword slash
        }
        // Lay down lane hazard then summon to force player into it
        if (has('XXX') && has('CXC')) return ['XXX', 'CXC']; // Inferno Path + Samurai pressure
        if (has('XXZ') && has('CXC')) return ['XXZ', 'CXC']; // Frostbite Path + Samurai
        if (has('XXX') && has('CCC')) return ['XXX', 'CCC']; // Inferno + Fire Bird
        if (has('XXZ') && has('CCZ')) return ['XXZ', 'CCZ']; // Frost path + Crystal Bird

        // --- Enchant → projectile burst ---
        if (has('ZXZ') && has('XZZ')) return ['ZXZ', 'XZZ']; // fire enchant + fireball (double burn)
        if (has('ZXX') && has('XZX')) return ['ZXX', 'XZX']; // ice enchant + ice shard (double freeze)

        // --- Defensive setup → AOE ---
        if (player.hp < player.maxHp * 0.5) {
            if (has('ZCZ') && has('XCZ')) return ['ZCZ', 'XCZ']; // Shield → Meteor Rain (safe aggression)
            if (has('ZCX') && has('XCZ')) return ['ZCX', 'XCZ']; // Invis → Meteor Rain
        }

        // --- Strategic summon combos ---
        const ownSummons = combat.summons.filter(s => s.alive && s.owner === 'enemy').length;
        const summonSpells = available.filter(k => SPELL_DATA[k]?.type === 'summon');

        if (ownSummons < 2 && summonSpells.length >= 1) {
            // Healer + attacker: Lantern Spirit sustains damage dealers
            if (has('CZZ') && has('CXC')) return ['CZZ', 'CXC']; // healer + samurai
            if (has('CZZ') && has('CXX')) return ['CZZ', 'CXX']; // healer + hydra
            if (has('CZZ') && has('CCC')) return ['CZZ', 'CCC']; // healer + fire bird
            if (has('CZZ') && has('CCX')) return ['CZZ', 'CCX']; // healer + electric bird

            // Tank + attacker: Blocky/Javelineer absorbs hits while bird attacks
            if (has('CZX') && has('CXC')) return ['CZX', 'CXC']; // blocky + samurai
            if (has('CZC') && has('CXC')) return ['CZC', 'CXC']; // javelineer + samurai
            if (has('CZX') && has('CCC')) return ['CZX', 'CCC']; // blocky + fire bird
            if (has('CZC') && has('CCZ')) return ['CZC', 'CCZ']; // javelineer + crystal bird

            // Shield → summon: safe deployment
            if (has('ZCZ')) {
                const bestSummon = summonSpells.find(k => k !== 'CZZ') || summonSpells[0];
                return ['ZCZ', bestSummon];
            }

            // Double summon wave
            if (summonSpells.length >= 2 && this.difficulty >= 3) {
                return [summonSpells[0], summonSpells[1]];
            }
        }

        return null; // no good combo found
    }

    _pickTactical(available, combat) {
        const f = this.fighter;
        const player = combat.player;
        const scored = available.map(key => {
            const spell = SPELL_DATA[key];
            if (!spell) return { key, score: 0 };
            let score = 1 + Math.random() * 2;

            const stats = spell.stats;
            const type = spell.type;

            // Prioritize healing when HP low
            if (stats.healAmt && f.hp < f.maxHp * 0.5) {
                score += 4;
            }

            // Prioritize defensive when no shields/enchants
            if (type === 'defensive' && !f.shielded) {
                score += 2;
                // Extra value if we're in a hazardous lane
                if (this._laneHasHazard(combat, f.lane)) score += 3;
            }
            if (type === 'enchant' && !f.enchant) {
                score += 2.5;
            }

            // Prefer summons — scaling urgency based on how few we have
            const ownSummons = combat.summons.filter(s => s.alive && s.owner === 'enemy').length;
            if (type === 'summon') {
                if (ownSummons === 0) {
                    score += 4; // no summons at all: high priority
                } else if (ownSummons === 1) {
                    score += 2.5; // only one: want a pair
                }
                // Prefer healer if we already have an attacker alive
                const hasAttacker = combat.summons.some(s =>
                    s.alive && s.owner === 'enemy' && s.dmg > 0);
                if (hasAttacker && stats.healAmt) score += 2; // healer to sustain
                // Prefer attacker/tank if we already have a healer
                const hasHealer = combat.summons.some(s =>
                    s.alive && s.owner === 'enemy' && s.healAmt > 0);
                if (hasHealer && stats.dmg > 0) score += 1.5;
                // Counter player summons with our own
                const playerSummonCount = combat.summons.filter(s => s.alive && s.owner === 'player').length;
                if (playerSummonCount > ownSummons) score += 2;
            }

            // Prefer lane effects — much more when in player's lane
            const playerSummons = combat.summons.filter(s => s.alive && s.owner === 'player').length;
            if (type === 'lane') {
                const inPlayerLane = f.lane === player.lane;
                if (inPlayerLane) {
                    score += 4; // great opportunity — cast right under them
                    if (playerSummons > 0) score += 1.5;
                } else if (playerSummons > 0) {
                    score += 2;
                }
                if (this.difficulty >= 5) score += 1;
                // Lane effect in a lane with player summons = burn them out
                const summonInOurLane = combat.summons.some(s =>
                    s.alive && s.owner === 'player' && s.getLanes().includes(f.lane));
                if (summonInOurLane) score += 3;
            }

            // Punish player standing in our lane hazard
            const playerInOurHazard = combat.laneEffects.some(le =>
                le.alive && le.owner === 'enemy' && le.lane === player.lane);
            if (playerInOurHazard && stats.dmg) {
                score += 2.5; // attack while they're trapped
            }

            // AOE to wipe player summons — huge loyalty drain
            if (type === 'aoe' && playerSummons >= 2) {
                score += 3; // AOE hits ALL summons, each death costs loyalty
            }

            // Slash/projectile in lane with player summons
            if ((type === 'attack' || type === 'projectile') && stats.dmg) {
                const summonInLane = combat.summons.some(s =>
                    s.alive && s.owner === 'player' && s.getLanes().includes(f.lane));
                if (summonInLane) score += 2;
            }

            // Stun/freeze spells are very valuable when player is unshielded
            if ((stats.stunDur || stats.freezeDur) && !player.shielded && !player.invisible) {
                score += 2;
            }

            // AOE when player is stunned/frozen (guaranteed hit)
            if (type === 'aoe' && (player.isStunned() || player.freezeTimer > 0)) {
                score += 4;
            }

            // Prefer attacks when player is low
            if (stats.dmg && player.hp < player.maxHp * 0.4) {
                score += 3;
            }

            // High-damage spells are generally good
            if (stats.dmg && stats.dmg >= 4) {
                score += 1.5;
            }

            // Prefer shield if standing in player lane hazard
            if (type === 'defensive' && this._laneHasHazard(combat, f.lane)) {
                score += 4;
            }

            return { key, score };
        });

        scored.sort((a, b) => b.score - a.score);
        if (scored.length > 1 && Math.random() < 0.25) {
            return scored[1].key;
        }
        return scored[0].key;
    }
}
