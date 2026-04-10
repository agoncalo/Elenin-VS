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
            // Backward (retreat = +1) is slower than forward (advance = -1)
            const speedMult = this.moveDir > 0 ? CONFIG.BACKWARD_SPEED : 1.0;
            const newX = f.x + this.moveDir * f.speed * this.aiSpeed * speedMult * (dt / 16);
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
                const staCost = SPELL_DATA[nextKey]?.stats?.stamina || 0;
                if (f.canCast(nextKey) && f.hasStamina(staCost)) {
                    f.spendStamina(staCost);
                    combat.executeSpell(nextKey, f);
                } else {
                    this.comboQueue = []; // abort combo if we can't afford it
                }
                this.comboDelay = 350 + Math.random() * 200; // fast follow-up
            }
            return; // don't do normal casting while executing combo
        }

        // ----- Combo planning -----
        if (this.comboCooldown > 0) this.comboCooldown -= dt;

        // ----- Punish stunned/frozen player — immediate follow-up -----
        const player = combat.player;
        if ((player.isStunned() || player.freezeTimer > 0) && this.comboQueue.length === 0) {
            // Rush cast: ignore normal cast timer, hit them while they can't move
            const rushAvail = this.spells.filter(key => {
                const staCost = SPELL_DATA[key]?.stats?.stamina || 0;
                return f.canCast(key) && f.hasStamina(staCost);
            });
            if (rushAvail.length > 0) {
                // Prefer: lane/vlane in their lane > high damage > stun extenders
                const rushScored = rushAvail.map(key => {
                    const spell = SPELL_DATA[key];
                    const st = spell.stats;
                    const tp = spell.type;
                    let s = 1;
                    if (tp === 'lane' && f.lane === player.lane) s += 8;
                    else if (tp === 'lane') s += 3;
                    if (tp === 'vlane') s += 6;
                    if (st.stunDur || st.freezeDur) s += 5; // extend stun lock
                    if (st.dmg && st.dmg >= 3) s += 3;
                    if (tp === 'projectile' && f.lane === player.lane) s += 3;
                    if (tp === 'instant') s += 2;
                    return { key, score: s };
                });
                rushScored.sort((a, b) => b.score - a.score);
                const rushKey = rushScored[0].key;
                const rushSpell = SPELL_DATA[rushKey];

                // Switch lane to player if casting horizontal lane
                if (rushSpell.type === 'lane' && f.lane !== player.lane) {
                    if (f.lane < player.lane) f.switchLane(1);
                    else f.switchLane(-1);
                    this.castTimer = 150;
                } else {
                    const rushCost = rushSpell.stats.stamina || 0;
                    f.spendStamina(rushCost);
                    combat.executeSpell(rushKey, f);
                    this.castTimer = 300 + Math.random() * 200; // fast follow-up
                }
                return;
            }
        }

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
        const hpPct = f.hp / f.maxHp;
        const loyPct = f.loyalty / f.maxLoyalty;
        const playerHpPct = combat.player.hp / combat.player.maxHp;
        const playerLoyPct = combat.player.loyalty / combat.player.maxLoyalty;
        const staPct = f.stamina / f.maxStamina;

        // Distance to midpoint (0 = at midline, 1 = at back wall)
        const fieldDepth = CONFIG.FIELD_RIGHT - CONFIG.MIDPOINT;
        const distFromMid = (f.cx - CONFIG.MIDPOINT) / fieldDepth;

        // Player blocking awareness: player retreating slowly is vulnerable to pressure
        const playerBlocking = combat.player.blocking;
        const playerStaLow = combat.player.stamina < 20;

        // Dodge vlane strip by moving horizontally away from it
        if (this._isInVLane(combat) && this.difficulty >= 2) {
            // Move away from the vlane center
            const vlaneCX = this._getVLaneCenterX(combat);
            if (vlaneCX !== null) {
                this.moveDir = f.cx < vlaneCX ? 1 : -1; // move away from strip center
                return;
            }
        }

        // Tactical: push forward after landing hits (exploit pushback momentum)
        if (this.tactical && combat.player.pushbackVel < -1) {
            this.moveDir = -1; // chase the pushed-back player
            return;
        }

        // Tactical: advance when player is blocking — they can't move, pressure them
        if (this.tactical && playerBlocking && !playerStaLow && staPct > 0.3) {
            this.moveDir = -1; // advance to pressure blocker
            return;
        }

        // Tactical: advance when player stamina is low — they can't block effectively
        if (this.tactical && playerStaLow) {
            this.moveDir = -1;
            return;
        }

        // Tactical: advance to pressure when player is low or we have shield
        if (this.tactical && (playerHpPct < 0.3 || playerLoyPct < 0.25 || f.shielded)) {
            this.moveDir = -1; // advance toward midline
            return;
        }

        // Tactical: position forward for better vlane targeting (deeper hits)
        if (this.tactical && staPct > 0.5 && distFromMid > 0.6) {
            // We're too far back — move forward for better spell reach
            this.moveDir = -1;
            return;
        }

        // Tactical: retreat when low HP to avoid direct damage
        if (this.tactical && hpPct < 0.3) {
            this.moveDir = 1; // retreat
            return;
        }

        // Retreat when being pushed back (ride the pushback rather than fight it)
        if (f.pushbackVel > 1) {
            this.moveDir = 0; // stand still, let pushback carry us
            return;
        }

        // Loyalty-aware posture: if loyalty is low but HP is fine, stay back
        // to intercept backline threats rather than pushing forward
        if (this.tactical && loyPct < 0.4 && hpPct > 0.5) {
            this.moveDir = 1; // retreat to cover more backline
            return;
        }

        // HP is low but loyalty is fine: play aggressive to finish fast
        if (this.tactical && hpPct < 0.4 && loyPct > 0.6) {
            this.moveDir = -1; // push forward for damage
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
        const player = combat.player;
        const dominated = this._laneHasThreats(combat, f.lane);
        const laneHazard = this._laneHasHazard(combat, f.lane);
        const vlaneHazard = this._laneHasVLane(combat, f.lane);

        // Posture check for trade willingness
        const ourStr = (f.hp / f.maxHp + f.loyalty / f.maxLoyalty) / 2;
        const plrStr = (player.hp / player.maxHp + player.loyalty / player.maxLoyalty) / 2;
        const onAdvantage = (ourStr - plrStr) > 0.12;

        // Dodge vlane effects (vertical column hazards) — move sideways since lane switching doesn't help
        if (vlaneHazard && this.difficulty >= 2) {
            // Can't dodge by lane switch — handled in movement instead
            // But avoid lingering, so don't do other lane changes
        }

        // Trap intent: aggressively match player lane to set up lane hazards
        if (this.trapIntent) {
            const playerLane = combat.player.lane;
            if (f.lane !== playerLane) {
                if (f.lane < playerLane) f.switchLane(1);
                else f.switchLane(-1);
            } else {
                this.trapIntent = false; // in position, ready to cast
            }
            return;
        }

        // Defense: intercept unblocked player projectiles heading for our backline
        // Higher urgency when loyalty is low
        if (this.difficulty >= 2) {
            const loyPct = f.loyalty / f.maxLoyalty;
            const interceptUrgency = loyPct < 0.35 ? 1.0 : (loyPct < 0.6 ? 0.7 : 0.4);
            const incoming = this._unguardedIncoming(combat);
            if (incoming !== null && incoming !== f.lane && !laneHazard && Math.random() < interceptUrgency) {
                if (incoming > f.lane) f.switchLane(1);
                else f.switchLane(-1);
                return;
            }
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

        if (dominated && Math.random() < this.dodgeChance + (onAdvantage ? 0 : 0.2)) {
            // On advantage: less likely to dodge — willing to trade hits
            const safeLane = this._findSafeLane(combat, f.lane);
            if (safeLane > f.lane) f.switchLane(1);
            else if (safeLane < f.lane) f.switchLane(-1);
        } else if (this._wantsSummonCoverage(combat) && Math.random() < 0.5) {
            // Summon coverage: move to an uncovered lane to deploy summons there
            const uncovered = this._uncoveredLanes(combat);
            if (uncovered.length > 0 && !uncovered.includes(f.lane)) {
                // Pick nearest uncovered lane
                let nearest = uncovered[0];
                for (const l of uncovered) {
                    if (Math.abs(l - f.lane) < Math.abs(nearest - f.lane)) nearest = l;
                }
                if (nearest > f.lane) f.switchLane(1);
                else if (nearest < f.lane) f.switchLane(-1);
            }
        } else if (this.tactical && this._bestSummonLane(combat) !== null && Math.random() < 0.4) {
            // Hunt player summons: match lane with highest-value summon
            const targetLane = this._bestSummonLane(combat);
            if (f.lane < targetLane) f.switchLane(1);
            else if (f.lane > targetLane) f.switchLane(-1);
        } else if (this.tactical && Math.random() < 0.35) {
            // Lane-aware positioning: move toward best lane for next action
            const targetLane = this._bestLaneForAction(combat);
            if (targetLane !== null && targetLane !== f.lane) {
                if (targetLane > f.lane) f.switchLane(1);
                else f.switchLane(-1);
            }
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

    _laneHasVLane(combat, lane) {
        // Check if fighter is standing in an enemy vlane strip
        return this._isInVLane(combat);
    }

    _isInVLane(combat) {
        const f = this.fighter;
        return combat.laneEffects.some(le => {
            if (!le.alive || le.owner === 'player' || le.orientation !== 'vertical') return false;
            const bounds = le.getXBounds();
            return f.cx >= bounds.x && f.cx <= bounds.x + bounds.w;
        });
    }

    _getVLaneCenterX(combat) {
        const f = this.fighter;
        for (const le of combat.laneEffects) {
            if (!le.alive || le.owner === 'player' || le.orientation !== 'vertical') continue;
            const bounds = le.getXBounds();
            if (f.cx >= bounds.x && f.cx <= bounds.x + bounds.w) {
                return le.centerX;
            }
        }
        return null;
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

    // Find the player lane with the most player entities (player + summons)
    _mostPopulatedPlayerLane(combat) {
        const pop = [0,0,0,0,0];
        pop[combat.player.lane]++;
        combat.summons.forEach(s => {
            if (s.alive && s.owner === 'player') s.getLanes().forEach(l => { pop[l]++; });
        });
        let bestLane = null, bestPop = 0;
        for (let i = 0; i < CONFIG.LANE_COUNT; i++) {
            if (pop[i] > bestPop) { bestPop = pop[i]; bestLane = i; }
        }
        return bestLane;
    }

    // Find the lane our side has no summons covering
    _uncoveredLanes(combat) {
        const covered = new Set();
        combat.summons.forEach(s => {
            if (s.alive && s.owner === 'enemy') s.getLanes().forEach(l => covered.add(l));
        });
        const uncovered = [];
        for (let i = 0; i < CONFIG.LANE_COUNT; i++) {
            if (!covered.has(i)) uncovered.push(i);
        }
        return uncovered;
    }

    // Check if AI should prioritize moving to uncovered lanes for summon deployment
    _wantsSummonCoverage(combat) {
        const f = this.fighter;
        const uncovered = this._uncoveredLanes(combat);
        if (uncovered.length < 2) return false; // good coverage already
        // Must have a summon spell we can afford
        const hasSummonReady = this.spells.some(key => {
            const spell = SPELL_DATA[key];
            if (!spell || spell.type !== 'summon') return false;
            const staCost = spell.stats.stamina || 0;
            return f.canCast(key) && f.hasStamina(staCost);
        });
        return hasSummonReady;
    }

    // Find the lane of the most threatening unblocked incoming projectile
    _unguardedIncoming(combat) {
        const f = this.fighter;
        // Find player projectiles heading toward our backline that nothing is blocking
        const threats = combat.projectiles.filter(p =>
            p.alive && p.owner === 'player' && p.charged && !p.isStatic
            && p.x > CONFIG.MIDPOINT - 80
        );
        if (threats.length === 0) return null;

        // Check which threat lanes have no blocker (us or our summons)
        const ourSummonLanes = new Set();
        combat.summons.forEach(s => {
            if (s.alive && s.owner === 'enemy') s.getLanes().forEach(l => ourSummonLanes.add(l));
        });

        let best = null, bestX = -Infinity;
        for (const p of threats) {
            // Already in our lane — we'll block it
            if (p.lane === f.lane) continue;
            // A friendly summon is in the way
            if (ourSummonLanes.has(p.lane)) continue;
            // Pick the closest (most urgent) one
            if (p.x > bestX) { bestX = p.x; best = p.lane; }
        }
        return best;
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

    // Pick the best lane based on what spells are nearly ready
    _bestLaneForAction(combat) {
        const f = this.fighter;
        const player = combat.player;
        const available = this.spells.filter(key => f.canCast(key));
        const hasSummon = available.some(k => SPELL_DATA[k]?.type === 'summon');
        const hasLane = available.some(k => SPELL_DATA[k]?.type === 'lane');
        const hasPierce = available.some(k => SPELL_DATA[k]?.stats?.pierce);

        // Posture
        const ourStr = (f.hp / f.maxHp + f.loyalty / f.maxLoyalty) / 2;
        const plrStr = (player.hp / player.maxHp + player.loyalty / player.maxLoyalty) / 2;
        const posture = ourStr - plrStr;

        // Count entities per lane
        const playerPop = [0,0,0,0,0];
        const aiPop = [0,0,0,0,0];
        playerPop[player.lane]++;
        combat.summons.forEach(s => {
            if (!s.alive) return;
            const lanes = s.getLanes();
            if (s.owner === 'player') lanes.forEach(l => { playerPop[l]++; });
            else lanes.forEach(l => { aiPop[l]++; });
        });

        // For lane effects or piercing: prefer the most populated lane
        if (hasLane || hasPierce) {
            let bestLane = f.lane, bestPop = playerPop[f.lane];
            for (let i = 0; i < 5; i++) {
                if (playerPop[i] > bestPop) { bestPop = playerPop[i]; bestLane = i; }
            }
            if (bestPop >= 2) return bestLane;
        }

        // For summons: posture-dependent lane choice
        if (hasSummon) {
            if (posture > 0.12) {
                // Advantage: summon in lanes player left undefended (offensive)
                for (let offset = 0; offset <= 2; offset++) {
                    for (const dir of [0, -1, 1]) {
                        const lane = f.lane + dir * offset;
                        if (lane < 0 || lane >= CONFIG.LANE_COUNT) continue;
                        if (playerPop[lane] === 0) return lane;
                    }
                }
            } else if (posture < -0.12) {
                // Disadvantage: summon in lanes WE left undefended (defensive)
                for (let offset = 0; offset <= 2; offset++) {
                    for (const dir of [0, -1, 1]) {
                        const lane = f.lane + dir * offset;
                        if (lane < 0 || lane >= CONFIG.LANE_COUNT) continue;
                        if (aiPop[lane] === 0) return lane;
                    }
                }
            } else {
                // Neutral: prefer undefended by player
                for (let offset = 0; offset <= 2; offset++) {
                    for (const dir of [0, -1, 1]) {
                        const lane = f.lane + dir * offset;
                        if (lane < 0 || lane >= CONFIG.LANE_COUNT) continue;
                        if (playerPop[lane] === 0) return lane;
                    }
                }
            }
        }

        return null;
    }

    _castSpell(combat) {
        const f = this.fighter;
        const available = this.spells.filter(key => {
            if (!f.canCast(key)) return false;
            const staCost = SPELL_DATA[key]?.stats?.stamina || 0;
            return f.hasStamina(staCost);
        });
        if (available.length === 0) return;

        // Try combo planning for difficulty >= 3
        if (this.difficulty >= 3 && this.comboCooldown <= 0 && Math.random() < 0.35 + this.difficulty * 0.05) {
            const combo = this._planCombo(available, combat);
            if (combo && combo.length >= 2) {
                // Cast first spell immediately, queue the rest
                const first = combo.shift();
                const firstCost = SPELL_DATA[first]?.stats?.stamina || 0;
                f.spendStamina(firstCost);
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

        // Horizontal lane spell: aim at the lane with the most player entities
        if (key && SPELL_DATA[key]?.type === 'lane') {
            const bestLane = this._mostPopulatedPlayerLane(combat);
            const targetLane = bestLane !== null ? bestLane : combat.player.lane;
            if (f.lane !== targetLane) {
                if (f.lane < targetLane) f.switchLane(1);
                else f.switchLane(-1);
                this.trapIntent = true;
                this.castTimer = 200;
                return;
            }
        }

        // Vlane spell: push forward for deeper targeting if too far back
        if (key && SPELL_DATA[key]?.type === 'vlane') {
            const fieldDepth = CONFIG.FIELD_RIGHT - CONFIG.MIDPOINT;
            const distFromMid = (f.cx - CONFIG.MIDPOINT) / fieldDepth;
            if (distFromMid > 0.55) {
                this.moveDir = -1; // advance toward midpoint
                this.castTimer = 250; // retry after moving forward
                return;
            }
        }

        const staCost = SPELL_DATA[key]?.stats?.stamina || 0;
        f.spendStamina(staCost);
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
            // Vertical lane to hit summon cluster
            if (has('XCC') && has('XCX')) return ['XCC', 'XCX']; // thunder strike → meteor rain vlane
            if (has('ZCZ') && has('XCX')) return ['ZCZ', 'XCX']; // shield → meteor rain vlane
            // Lane effect under summon cluster
            const summonLanes = [...new Set(playerSummons.map(s => s.lane))];
            if (summonLanes.includes(f.lane)) {
                if (has('XXX')) return has('ZZX') ? ['XXX', 'ZZX'] : has('XZX') ? ['XXX', 'XZX'] : null;
                if (has('XXZ')) return has('ZZX') ? ['XXZ', 'ZZX'] : has('XZZ') ? ['XXZ', 'XZZ'] : null;
                if (has('XXC')) return has('ZZX') ? ['XXC', 'ZZX'] : has('XZX') ? ['XXC', 'XZX'] : null;
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
            if (has('XXC') && has('XXX')) return ['XXC', 'XXX']; // shock path → inferno path
            if (has('XXC') && has('XXZ')) return ['XXC', 'XXZ']; // shock path → frostbite path
            if (has('XCC') && has('XXX')) return ['XCC', 'XXX']; // thunder strike → inferno path
            if (has('XCC') && has('XXZ')) return ['XCC', 'XXZ']; // thunder strike → frostbite path
        }

        // --- Stun → heavy attack combos ---
        // Thunder Strike (XCC) → Sword Slash (ZZX) or Meteor Rain (XCX)
        if (has('XCC')) {
            if (has('ZZX')) return ['XCC', 'ZZX'];
            if (has('XCX')) return ['XCC', 'XCX'];
            if (has('XZX')) return ['XCC', 'XZX'];
        }
        // Thunder Path (XXC) → follow-up
        if (has('XXC')) {
            if (has('ZZX')) return ['XXC', 'ZZX'];
            if (has('XZX')) return ['XXC', 'XZX'];
        }
        // Volt Enchant stun via Ice Shard/Fireball → follow-up
        if (has('ZXC') && (has('ZZX') || has('XXC'))) {
            const followUp = has('ZZX') ? 'ZZX' : 'XXC';
            return ['ZXC', followUp]; // enchant then slash/shock lane
        }

        // --- Shield → walk through hazards + attack ---
        const inHazard = this._laneHasHazard(combat, f.lane);
        if (inHazard && has('ZCZ')) {
            // Shield up, then counter-attack
            if (has('ZZX')) return ['ZCZ', 'ZZX'];
            if (has('XZX')) return ['ZCZ', 'XZX'];
        }

        // --- Trap combos: lane effect → zone control ---
        // Lane effect → projectile to punish dodge attempts
        if (inPlayerLane) {
            if (has('XXX') && has('XZX')) return ['XXX', 'XZX']; // fire path + fireball
            if (has('XXZ') && has('XZZ')) return ['XXZ', 'XZZ']; // frost path + ice shard
            if (has('XXX') && has('ZZX')) return ['XXX', 'ZZX']; // fire path + sword slash
            if (has('XXZ') && has('ZZX')) return ['XXZ', 'ZZX']; // frost path + sword slash
        }
        // Lay down lane hazard then summon to force player into it
        if (has('XXX') && has('CXC')) return ['XXX', 'CXC']; // Inferno Path + Samurai pressure
        if (has('XXZ') && has('CXC')) return ['XXZ', 'CXC']; // Frostbite Path + Samurai
        if (has('XXX') && has('CCX')) return ['XXX', 'CCX']; // Inferno + Fire Bird
        if (has('XXZ') && has('CCZ')) return ['XXZ', 'CCZ']; // Frost path + Crystal Bird

        // --- Enchant → projectile burst ---
        if (has('ZXZ') && has('XZZ')) return ['ZXZ', 'XZZ']; // ice enchant + ice shard (double freeze)
        if (has('ZXX') && has('XZX')) return ['ZXX', 'XZX']; // fire enchant + fireball (double burn)

        // --- Defensive setup → vlane ---
        if (player.hp < player.maxHp * 0.5) {
            if (has('ZCZ') && has('XCX')) return ['ZCZ', 'XCX']; // Shield → Meteor Rain (safe aggression)
            if (has('ZCX') && has('XCX')) return ['ZCX', 'XCX']; // Invis → Meteor Rain
        }

        // --- Strategic summon combos ---
        const ownSummons = combat.summons.filter(s => s.alive && s.owner === 'enemy').length;
        const summonSpells = available.filter(k => SPELL_DATA[k]?.type === 'summon');

        if (ownSummons < 2 && summonSpells.length >= 1) {
            // Healer + attacker: Lantern Spirit sustains damage dealers
            if (has('CZZ') && has('CXC')) return ['CZZ', 'CXC']; // healer + samurai
            if (has('CZZ') && has('CXX')) return ['CZZ', 'CXX']; // healer + hydra
            if (has('CZZ') && has('CCC')) return ['CZZ', 'CCC']; // healer + electric bird
            if (has('CZZ') && has('CCX')) return ['CZZ', 'CCX']; // healer + fire bird

            // Tank + attacker: Blocky/Javelineer absorbs hits while bird attacks
            if (has('CZX') && has('CXC')) return ['CZX', 'CXC']; // blocky + samurai
            if (has('CZC') && has('CXC')) return ['CZC', 'CXC']; // javelineer + samurai
            if (has('CZX') && has('CCX')) return ['CZX', 'CCX']; // blocky + fire bird
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
        const hpPct = f.hp / f.maxHp;
        const loyPct = f.loyalty / f.maxLoyalty;
        const playerHpPct = player.hp / player.maxHp;
        const playerLoyPct = player.loyalty / player.maxLoyalty;

        // Resource posture flags
        const loyaltyThreatened = loyPct < 0.4;          // our loyalty is low
        const hpThreatened = hpPct < 0.35;               // our HP is low
        const playerLoyaltyWeak = playerLoyPct < 0.35;   // player loyalty is exploitable

        // Overall posture: positive = we're winning, negative = we're losing
        const ourStrength = (hpPct + loyPct) / 2;
        const playerStrength = (playerHpPct + playerLoyPct) / 2;
        const posture = ourStrength - playerStrength; // -1..+1
        const onAdvantage = posture > 0.12;
        const onDisadvantage = posture < -0.12;

        // Per-lane info for posture-aware decisions
        const playerPerLane = [0,0,0,0,0];
        const aiPerLane = [0,0,0,0,0];
        combat.summons.forEach(s => {
            if (!s.alive) return;
            const lanes = s.getLanes();
            if (s.owner === 'player') lanes.forEach(l => { playerPerLane[l]++; });
            else lanes.forEach(l => { aiPerLane[l]++; });
        });

        const scored = available.map(key => {
            const spell = SPELL_DATA[key];
            if (!spell) return { key, score: 0 };
            let score = 1 + Math.random() * 2;

            const stats = spell.stats;
            const type = spell.type;

            // === FOCUS: PLAYER HP vs LOYALTY ===
            // Decide whether to focus on direct HP damage or loyalty/summon pressure
            const focusHP = playerHpPct > playerLoyPct;   // player HP is healthier → attack HP
            const focusLoy = playerLoyPct >= playerHpPct;  // player loyalty is healthier → pressure loyalty

            if (focusHP) {
                // Target player HP: prefer direct damage, lane/vlane on player, stuns
                if (stats.dmg && stats.dmg >= 3) score += 3;
                if (type === 'lane' && f.lane === player.lane) score += 4;
                if (type === 'vlane') score += 3;
                if (type === 'instant') score += 2;
                if (type === 'projectile' && f.lane === player.lane) score += 2.5;
                if (stats.stunDur || stats.freezeDur) score += 2; // lock them for damage
            }
            if (focusLoy) {
                // Target loyalty: kill summons, backline projectiles, vlane sweeps
                if (type === 'vlane') score += 4; // hits summons across field
                if (type === 'projectile' && f.lane !== player.lane) {
                    const blockers = combat.summons.some(s =>
                        s.alive && s.owner === 'player' && s.getLanes().includes(f.lane));
                    score += blockers ? 2 : 4; // unblocked = free backline hit
                }
                if (type === 'lane') {
                    // Lane in a lane with player summons burns them out
                    const summonPop = combat.summons.filter(s =>
                        s.alive && s.owner === 'player' && s.getLanes().includes(f.lane)).length;
                    if (summonPop >= 2) score += 5;
                    else if (summonPop >= 1) score += 3;
                }
                if (type === 'instant') score += 1.5; // slash summons
            }

            // === PLAYER STATE AWARENESS ===

            const playerBlocking = player.blocking;
            const playerStaLow = player.stamina < 25;
            const playerStunned = player.isStunned() || player.freezeTimer > 0;

            if (playerBlocking) {
                if (stats.stunDur || stats.freezeDur) score += 4;
                if (type === 'lane') score += 3;
                if (type === 'summon') score += 1.5;
                if (type === 'projectile' && !stats.stunDur && !stats.freezeDur) score -= 2;
                if (type === 'instant' && !stats.stunDur && !stats.freezeDur) score -= 1.5;
            }

            if (playerStaLow && !playerBlocking) {
                if (stats.dmg && stats.dmg >= 3) score += 2;
                if (type === 'vlane') score += 2;
                if (type === 'lane') score += 1.5;
            }

            // === STUN FOLLOW-UP: hit them while they can't move ===
            if (playerStunned) {
                if (type === 'lane' && f.lane === player.lane) score += 6;
                if (type === 'vlane') score += 5;
                if (stats.stunDur || stats.freezeDur) score += 5; // extend the stun lock
                if (stats.dmg && stats.dmg >= 3) score += 3;
                if (type === 'projectile' && f.lane === player.lane) score += 3;
            }

            // === MULTI-TARGET LANE/VLANE: prefer hitting as many enemies as possible ===
            if (type === 'lane') {
                let lanePopulation = (player.lane === f.lane) ? 1 : 0;
                lanePopulation += combat.summons.filter(s =>
                    s.alive && s.owner === 'player' && s.getLanes().includes(f.lane)).length;
                if (lanePopulation >= 3) score += 6;
                else if (lanePopulation >= 2) score += 4;
                else if (lanePopulation >= 1) score += 2;
                // Lane with no targets is weak
                if (lanePopulation === 0) score -= 3;
            }
            if (type === 'vlane') {
                // Vlane hits everything in a vertical strip — more entities in field = more value
                const playerSummonCount = combat.summons.filter(s => s.alive && s.owner === 'player').length;
                score += playerSummonCount * 1.5; // scales with target count
                if (playerSummonCount >= 2) score += 2;
            }

            // === POSITION AWARENESS ===
            const fieldDepth = CONFIG.FIELD_RIGHT - CONFIG.MIDPOINT;
            const distFromMid = (f.cx - CONFIG.MIDPOINT) / fieldDepth;
            if (type === 'vlane' && distFromMid < 0.4) {
                score += 2;
            }

            // === PUSHBACK EXPLOITATION ===
            if (player.pushbackVel < -1) {
                if (stats.dmg) score += 1.5;
                if (type === 'lane' && f.lane === player.lane) score += 2;
            }

            // === STAMINA CONSERVATION ===
            const staPct = f.stamina / f.maxStamina;
            if (staPct < 0.3) {
                const staCost = stats.stamina || 0;
                if (staCost > 25) score -= 2;
                if (staCost <= 15) score += 1;
            }

            // === RESOURCE-AWARE SCORING ===

            if (loyaltyThreatened) {
                if (type === 'summon') score += 3;
                if (type === 'defensive') score += 2;
            }

            if (hpThreatened && !loyaltyThreatened) {
                if (stats.dmg && stats.dmg >= 3) score += 2.5;
                if (type === 'vlane') score += 2;
                if (type === 'enchant') score += 1.5;
                if (type === 'summon') score -= 1;
            }

            if (playerLoyaltyWeak) {
                if (type === 'vlane') score += 3;
                if (type === 'instant') score += 1.5;
                if (type === 'projectile') score += 1.5;
            }

            // === HEALING ===
            if (stats.healAmt && f.hp < f.maxHp * 0.5) {
                score += 4;
            }

            // === DEFENSIVE ===
            if (type === 'defensive' && !f.shielded) {
                score += 2;
                if (this._laneHasHazard(combat, f.lane)) score += 3;
            }
            if (type === 'enchant' && !f.enchant) {
                score += 2.5;
            }

            // === SUMMON LANE COVERAGE (HIGH PRIORITY) ===
            const ownSummons = combat.summons.filter(s => s.alive && s.owner === 'enemy');
            const ownSummonCount = ownSummons.length;
            const uncoveredLanes = this._uncoveredLanes(combat);
            if (type === 'summon') {
                // Base urgency: always want summons out
                if (ownSummonCount === 0) score += 6;
                else if (ownSummonCount === 1) score += 4;
                else if (ownSummonCount === 2) score += 2;

                // Lane coverage: huge bonus if we have uncovered lanes
                if (uncoveredLanes.length >= 4) score += 5;
                else if (uncoveredLanes.length >= 3) score += 4;
                else if (uncoveredLanes.length >= 2) score += 3;
                else if (uncoveredLanes.length >= 1) score += 1.5;

                // Bonus if current lane is uncovered (summon spawns in our lane)
                if (uncoveredLanes.includes(f.lane)) score += 2;

                // Composition bonuses
                const hasAttacker = ownSummons.some(s => s.dmg > 0);
                const hasHealer = ownSummons.some(s => s.healAmt > 0);
                if (hasAttacker && stats.healAmt) score += 2;
                if (hasHealer && stats.dmg > 0) score += 1.5;

                // Counter player summon advantage
                const playerSummonCount = combat.summons.filter(s => s.alive && s.owner === 'player').length;
                if (playerSummonCount > ownSummonCount) score += 3;

                // Loyalty threatened = summons are critical backline defense
                if (loyaltyThreatened) score += 3;
            }

            // Punish player standing in our lane hazard
            const playerInOurHazard = combat.laneEffects.some(le =>
                le.alive && le.owner === 'enemy' && le.lane === player.lane);
            if (playerInOurHazard && stats.dmg) {
                score += 2.5;
            }

            // Stun/freeze when player is unshielded
            if ((stats.stunDur || stats.freezeDur) && !player.shielded && !player.invisible) {
                score += 2;
            }

            // Backline pressure: projectiles in empty lanes = free loyalty damage
            if (type === 'projectile' && f.lane !== player.lane) {
                const summonBlocker = combat.summons.some(s =>
                    s.alive && s.owner === 'player' && s.getLanes().includes(f.lane));
                if (!summonBlocker) score += 3;
                else score += 0.5;
            }

            // === POSTURE-AWARE AGGRESSION ===
            if (onAdvantage) {
                if (stats.dmg) score += 1.5;
                if (type === 'projectile' || type === 'instant') score += 1;
                if (type === 'vlane') score += 1.5;
                if (type === 'defensive' && !this._laneHasHazard(combat, f.lane)) score -= 1.5;
                if (type === 'projectile' && f.lane !== player.lane) score += 1;
            }
            if (onDisadvantage) {
                if (type === 'defensive') score += 2;
                if (type === 'summon') score += 1;
                if (stats.healAmt) score += 2;
                if (type === 'lane' && f.lane !== player.lane) score -= 1;
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
