// ============================================================
// combat.js - Battle scene: game logic, collision, rendering
// ============================================================
class Combat {
    constructor(enemyData, input, playerSkin, stats) {
        this.enemyData = enemyData;
        this.input = input;
        this.stats = stats || null;
        this.effects = new EffectsManager();

        // Player
        const px = CONFIG.FIELD_LEFT + 30;
        this.player = new Fighter(px, 2, 'player', CONFIG.BASE_HP, CONFIG.BASE_LOYALTY);
        this.player.speed = CONFIG.PLAYER_SPEED;
        this.player.color = playerSkin ? playerSkin.color : CONFIG.C.PLAYER;
        this.player.skin = playerSkin || null;

        // Enemy
        const ex = CONFIG.FIELD_RIGHT - CONFIG.SPRITE - 30;
        this.enemy = new Fighter(ex, 2, 'enemy', CONFIG.BASE_HP, CONFIG.BASE_LOYALTY);
        this.enemy.color = enemyData.color || CONFIG.C.ENEMY;
        this.enemy.speed = CONFIG.PLAYER_SPEED * (enemyData.aiSpeed || 0.6);
        // Find matching skin for this enemy
        const enemySkin = PLAYER_SKINS.find(s => s.unlockEnemy === enemyData.id);
        this.enemy.skin = enemySkin || null;

        this.ai = new EnemyAI(this.enemy, enemyData);

        // Entity lists
        this.projectiles = [];
        this.summons = [];
        this.laneEffects = [];

        // UI state
        this.spellInfo = null;
        this.spellInfoTimer = 0;
        this.result = null; // null | 'win' | 'lose'
        this.resultTimer = 0;
        this.paused = false;
        this.pauseSelected = 0; // 0 = Continue, 1 = Quit

        // Cast history for HUD
        this.castHistory = [];
        this.enemyCastHistory = [];

        // Tutorial overlay
        this.showTutorial = !localStorage.getItem('eleninVS_tutorialSeen');
        this.tutorialCasted = false;
        this.tutorialDelay = this.showTutorial ? 1000 : 0;

        // Windup / telegraph system
        this.windups = [];
        // Lingering kanji floaters after windups
        this._kanjiFloaters = [];

        // Battlefield theme based on enemy affinity
        this.theme = this._getTheme(enemyData.affinity);
        this.ambientTimer = 0;
        this.ambientParticles = [];

        // Hook up spell casting
        this.input.onSpellCast = (key) => this._onPlayerCast(key);

        // Wrap takeDamage for stats tracking
        if (this.stats) {
            const origPlayerTD = this.player.takeDamage.bind(this.player);
            const stats = this.stats;
            this.player.takeDamage = function(amount, effects, attacker) {
                const actual = origPlayerTD(amount, effects, attacker);
                if (actual === 0 && this.shielded) stats.recordDmgBlocked();
                else if (actual > 0) stats.recordDmgTaken(actual);
                return actual;
            };
            const origEnemyTD = this.enemy.takeDamage.bind(this.enemy);
            this.enemy.takeDamage = function(amount, effects, attacker) {
                const actual = origEnemyTD(amount, effects, attacker);
                if (actual > 0) stats.recordDmgDealt(actual);
                return actual;
            };
        }
    }

    _onPlayerCast(comboKey) {
        if (this.result) return;
        // Tutorial: block casting during delay, then mark first cast
        if (this.showTutorial) {
            if (this.tutorialDelay > 0) return;
            if (!this.tutorialCasted) this.tutorialCasted = true;
        }
        const spell = SPELL_DATA[comboKey];
        if (!spell) return;
        if (!this.player.canCast(comboKey)) {
            this.effects.statusText(this.player.cx, this.player.y - 15, 'NOT READY', '#ff4444');
            AudioEngine.playSfx('notReady');
            return;
        }
        this.executeSpell(comboKey, this.player);
    }

    executeSpell(comboKey, caster) {
        const spell = SPELL_DATA[comboKey];
        if (!spell) return;
        const stats = getSpellStats(comboKey);
        if (!stats) return;

        caster.startCooldown(comboKey, stats.cd || 1000);
        const isPlayer = caster.owner === 'player';

        // Show spell info (player only)
        if (isPlayer) {
            this.spellInfo = { comboKey, stats };
            this.spellInfoTimer = 2500;
            this.castHistory.unshift({ comboKey });
            if (this.castHistory.length > 8) this.castHistory.length = 8;
            if (this.stats) this.stats.recordSpellCast(comboKey);
        } else {
            this.enemyCastHistory.unshift({ comboKey });
            if (this.enemyCastHistory.length > 8) this.enemyCastHistory.length = 8;
        }

        if (spell.type === 'projectile' && spell.affinity === 'none') {
            // Non-elemental projectiles fire immediately
            this._spawnProjectile(comboKey, caster, stats);
            AudioEngine.playSfx('projectile');
        } else {
            // All non-projectile spells AND elemental projectiles go through the windup telegraph system
            this._startWindup(spell.type, comboKey, caster, stats);
        }
    }

    _spawnProjectile(comboKey, caster, stats) {
        const proj = new Projectile(
            caster.cx - 8, caster.lane, caster.owner,
            comboKey, 1, stats, caster.facing
        );
        this.projectiles.push(proj);
        caster.spellOnScreen[comboKey] = true;
        if (caster.owner === 'enemy' && this.stats) this.stats.recordEnemyProjFired();
        if (caster.owner === 'player' && this.stats) this.stats.recordPlayerProjFired();
    }

    _instantAttack(comboKey, caster, stats) {
        // Sword slash: hits everything in lane within range
        const range = (stats.range || 0.5) * CONFIG.FIELD_WIDTH;
        const isPlayer = caster.owner === 'player';
        const target = isPlayer ? this.enemy : this.player;

        // Visual
        this.effects.burst(caster.cx + (isPlayer ? 30 : -30), caster.cy, '#ffffff', 6, 5, 200, 3);

        // Hit enemy if in range and same lane
        if (target.lane === caster.lane) {
            const dist = Math.abs(target.cx - caster.cx);
            if (dist <= range) {
                const dmg = this._calcDamage(stats.dmg, caster, target, SPELL_DATA[comboKey]);
                target.takeDamage(dmg, this.effects, caster);
                this._addCutLine(target.cx, target.cy);
            }
        }

        // Hit summons in lane
        const enemySummons = this.summons.filter(s => s.owner !== caster.owner && s.getLanes().includes(caster.lane));
        enemySummons.forEach(s => {
            const dist = Math.abs(s.cx - caster.cx);
            if (dist <= range) {
                const dmg = this._calcDamage(stats.dmg, caster, s, SPELL_DATA[comboKey]);
                const died = s.takeDamage(dmg, this.effects);
                if (died === true) this._onSummonKilled(s, caster);
                else if (died === 'regrow') this._onHydraRegrow(s);
                this._addCutLine(s.cx, s.cy);
            }
        });

        // Sword slash visual
        const slashX = caster.cx;
        const slashY = caster.cy;
        this._addSlashEffect(slashX, slashY, range, caster.facing);
    }

    _addSlashEffect(x, y, range, facing) {
        // Animated slash stored as a temporary visual
        this._slashEffects = this._slashEffects || [];
        this._slashEffects.push({ x, y, range, facing, timer: 300, maxTimer: 300 });
    }

    _addCutLine(x, y) {
        // Diagonal flash line on hit targets
        this._cutLines = this._cutLines || [];
        this._cutLines.push({ x, y, timer: 350, maxTimer: 350 });
    }

    // ===== WINDUP / TELEGRAPH SYSTEM =====
    // ~20 frames at 60fps per spell type for reactable telegraphs
    _windupDuration(type) {
        const durations = { projectile: 333, instant: 333, enchant: 333, defensive: 300, lane: 333, aoe: 400, summon: 250 };
        return durations[type] || 333;
    }

    _startWindup(type, comboKey, caster, stats) {
        const dur = this._windupDuration(type);
        this.windups.push({
            type, comboKey, caster, stats,
            timer: dur, maxDuration: dur,
            executed: false,
            // Snapshot lane at cast time so lane switching doesn't move the telegraph
            // (sword slash is the exception — it tracks the caster live)
            castLane: caster.lane,
            castX: caster.cx,
            castY: caster.cy,
        });
    }

    _updateWindups(dt) {
        // Clear IAI eyes-closed flag on all fighters
        this.player._eyesClosed = false;
        this.enemy._eyesClosed = false;

        this.windups.forEach(w => {
            if (w.executed) return;
            // Cancel if caster died
            if (w.caster.hp <= 0) { w.executed = true; return; }
            // Close eyes during IAI windup
            if (w.type === 'instant') w.caster._eyesClosed = true;
            w.timer -= dt;
            if (w.timer <= 0) {
                w.executed = true;
                this._executeWindupEffect(w);
            }
        });
        this.windups = this.windups.filter(w => !w.executed);
    }

    _executeWindupEffect(w) {
        const sfxMap = { projectile: 'projectile', instant: 'slash', enchant: 'enchant', defensive: 'shield', lane: 'lane', aoe: 'aoe', summon: 'summon' };
        AudioEngine.playSfx(sfxMap[w.type] || 'projectile');
        // For lane/summon, use the snapshotted lane so switching lanes during windup doesn't move the effect
        const needsSnap = w.type === 'lane' || w.type === 'summon';
        const origLane = w.caster.lane;
        if (needsSnap) w.caster.lane = w.castLane;
        switch (w.type) {
            case 'projectile': this._spawnProjectile(w.comboKey, w.caster, w.stats); break;
            case 'instant':   this._instantAttack(w.comboKey, w.caster, w.stats); break;
            case 'enchant':   this._applyEnchant(w.comboKey, w.caster, w.stats); break;
            case 'defensive': this._applyDefensive(w.comboKey, w.caster, w.stats); break;
            case 'lane':      this._spawnLaneEffect(w.comboKey, w.caster, w.stats); break;
            case 'aoe':       this._aoeAttack(w.comboKey, w.caster, w.stats); break;
            case 'summon':    this._spawnSummon(w.comboKey, w.caster, w.stats); break;
        }
        if (needsSnap) w.caster.lane = origLane;

        // Spawn lingering kanji floater for elemental spells
        const spell = SPELL_DATA[w.comboKey];
        if (spell && spell.affinity !== 'none') {
            const dir = w.caster.facing === 'right' ? 1 : -1;
            const kx = w.castX + dir * (CONFIG.SPRITE * 0.6);
            const ky = w.castY;
            const kanjiMap = { fire: '\u706B', ice: '\u6C37', shock: '\u96F7', poison: '\u6BD2', earth: '\u571F' };
            this._kanjiFloaters.push({
                x: kx, y: ky,
                kanji: kanjiMap[spell.affinity] || '\u8853',
                color: AFFINITY_COLORS[spell.affinity] || '#fff',
                timer: 600, maxTimer: 600,
                driftX: dir * (0.6 + Math.random() * 0.3),
                driftY: 0,
            });
        }
    }

    _drawWindups(ctx) {
        this.windups.forEach(w => {
            if (w.executed) return;
            const progress = 1 - w.timer / w.maxDuration;
            switch (w.type) {
                case 'projectile': this._drawProjectileKanji(ctx, w, progress); break;
                case 'instant':   this._drawIAIWindup(ctx, w, progress); break;
                case 'enchant':   this._drawKanjiWindup(ctx, w, progress); break;
                case 'defensive': this._drawDefensiveWindup(ctx, w, progress); break;
                case 'lane':      this._drawLaneWindup(ctx, w, progress); break;
                case 'aoe':       this._drawAOEWindup(ctx, w, progress); break;
                case 'summon':    this._drawSummonWindup(ctx, w, progress); break;
            }
        });
    }

    // --- Shared: Elemental kanji in front of caster during any windup ---
    _drawCasterKanji(ctx, w, progress) {
        const c = w.caster;
        const dir = c.facing === 'right' ? 1 : -1;
        const spell = SPELL_DATA[w.comboKey];
        if (!spell || spell.affinity === 'none') return;
        const color = AFFINITY_COLORS[spell.affinity] || '#fff';
        const kanjiMap = { fire: '\u706B', ice: '\u6C37', shock: '\u96F7', poison: '\u6BD2', earth: '\u571F' };
        const kanji = kanjiMap[spell.affinity] || '\u8853';
        const t = Date.now();

        const kx = c.cx + dir * (CONFIG.SPRITE * 0.6);
        const ky = c.cy;
        const ringR = 14 + progress * 10;
        ctx.globalAlpha = 0.1 + progress * 0.3;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12 + progress * 10;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(kx, ky, ringR, 0, Math.PI * 2 * progress);
        ctx.stroke();

        // Orbiting element sparkles converging inward
        const sparkCount = 5;
        for (let i = 0; i < sparkCount; i++) {
            const angle = (i / sparkCount) * Math.PI * 2 + t / 220;
            const dist = (30 + Math.sin(t / 150 + i) * 5) * (1 - progress * 0.7);
            const sx = kx + Math.cos(angle) * dist;
            const sy = ky + Math.sin(angle) * dist;
            ctx.globalAlpha = 0.25 + progress * 0.5;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.2 + progress * 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Kanji scaling in
        const scale = 0.2 + progress * 0.8;
        const fontSize = Math.floor(24 * scale);
        const kanjiAlpha = progress * progress;
        ctx.globalAlpha = kanjiAlpha * 0.9;
        ctx.fillStyle = color;
        ctx.shadowBlur = 18 + progress * 12;
        ctx.font = fontSize + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(kanji, kx, ky);

        // Flash burst at the end
        if (progress > 0.85) {
            const burstAlpha = (progress - 0.85) / 0.15;
            ctx.globalAlpha = burstAlpha * 0.5;
            ctx.fillStyle = '#fff';
            ctx.shadowColor = color;
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(kx, ky, 6 + burstAlpha * 14, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // --- Elemental Projectile Kanji Telegraph ---
    _drawProjectileKanji(ctx, w, progress) {
        this._drawCasterKanji(ctx, w, progress);
    }

    // --- IAI Slash Telegraph ---
    _drawIAIWindup(ctx, w, progress) {
        const c = w.caster;
        const dir = c.facing === 'right' ? 1 : -1;
        const t = Date.now();
        ctx.save();

        // --- Sheathed katana in front of caster ---
        const swordX = c.cx + dir * (CONFIG.SPRITE * 0.45);
        const swordY = c.cy + 4;
        const swordLen = 26;
        const swordAngle = dir > 0 ? -0.3 : Math.PI + 0.3;

        // Scabbard (dark)
        ctx.globalAlpha = 0.5 + progress * 0.4;
        ctx.strokeStyle = '#334';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(swordX, swordY);
        ctx.lineTo(swordX + Math.cos(swordAngle) * swordLen, swordY + Math.sin(swordAngle) * swordLen);
        ctx.stroke();

        // Blade peeking out — slides further with progress (drawing the sword)
        const bladeReveal = progress * 0.85;
        const bladeLen = swordLen * bladeReveal;
        const bladeEndX = swordX + Math.cos(swordAngle) * bladeLen;
        const bladeEndY = swordY + Math.sin(swordAngle) * bladeLen;
        ctx.strokeStyle = '#ddeeff';
        ctx.shadowColor = '#aaddff';
        ctx.shadowBlur = 6 + progress * 10;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(swordX, swordY);
        ctx.lineTo(bladeEndX, bladeEndY);
        ctx.stroke();

        // Tsuba (guard) at the hilt
        ctx.fillStyle = '#aa8844';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        const tsubaX = swordX + Math.cos(swordAngle) * 2;
        const tsubaY = swordY + Math.sin(swordAngle) * 2;
        ctx.arc(tsubaX, tsubaY, 3, 0, Math.PI * 2);
        ctx.fill();

        // --- Star flash blinking intensifies as windup progresses ---
        const blinkSpeed = 120 - progress * 80;
        const blinkAlpha = (Math.sin(t / blinkSpeed) * 0.5 + 0.5);
        const starAlpha = blinkAlpha * (0.3 + progress * 0.7);
        const starSize = 4 + progress * 8;
        const starX = bladeEndX;
        const starY = bladeEndY;

        if (starAlpha > 0.05) {
            ctx.globalAlpha = starAlpha;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#aaddff';
            ctx.shadowBlur = 14 + progress * 10;

            // 4-point star shape
            ctx.beginPath();
            ctx.moveTo(starX, starY - starSize);
            ctx.lineTo(starX + starSize * 0.22, starY - starSize * 0.22);
            ctx.lineTo(starX + starSize, starY);
            ctx.lineTo(starX + starSize * 0.22, starY + starSize * 0.22);
            ctx.lineTo(starX, starY + starSize);
            ctx.lineTo(starX - starSize * 0.22, starY + starSize * 0.22);
            ctx.lineTo(starX - starSize, starY);
            ctx.lineTo(starX - starSize * 0.22, starY - starSize * 0.22);
            ctx.closePath();
            ctx.fill();

            // Inner hot-white core
            ctx.globalAlpha = starAlpha * 0.9;
            const coreS = starSize * 0.35;
            ctx.beginPath();
            ctx.moveTo(starX, starY - coreS);
            ctx.lineTo(starX + coreS * 0.22, starY - coreS * 0.22);
            ctx.lineTo(starX + coreS, starY);
            ctx.lineTo(starX + coreS * 0.22, starY + coreS * 0.22);
            ctx.lineTo(starX, starY + coreS);
            ctx.lineTo(starX - coreS * 0.22, starY + coreS * 0.22);
            ctx.lineTo(starX - coreS, starY);
            ctx.lineTo(starX - coreS * 0.22, starY - coreS * 0.22);
            ctx.closePath();
            ctx.fill();
        }

        // Secondary smaller star at tsuba
        if (progress > 0.35) {
            const blink2 = Math.sin(t / (90 - progress * 50) + 1.8) * 0.5 + 0.5;
            const s2a = blink2 * ((progress - 0.35) / 0.65) * 0.6;
            const s2 = 2.5 + progress * 3;
            ctx.globalAlpha = s2a;
            ctx.beginPath();
            ctx.moveTo(tsubaX, tsubaY - s2);
            ctx.lineTo(tsubaX + s2 * 0.2, tsubaY - s2 * 0.2);
            ctx.lineTo(tsubaX + s2, tsubaY);
            ctx.lineTo(tsubaX + s2 * 0.2, tsubaY + s2 * 0.2);
            ctx.lineTo(tsubaX, tsubaY + s2);
            ctx.lineTo(tsubaX - s2 * 0.2, tsubaY + s2 * 0.2);
            ctx.lineTo(tsubaX - s2, tsubaY);
            ctx.lineTo(tsubaX - s2 * 0.2, tsubaY - s2 * 0.2);
            ctx.closePath();
            ctx.fill();
        }

        // Subtle aura glow around caster
        ctx.globalAlpha = 0.06 + progress * 0.12;
        ctx.fillStyle = '#aaddff';
        ctx.shadowColor = '#aaddff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, CONFIG.SPRITE * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // --- Elemental Kanji Telegraph (Enchants) ---
    _drawKanjiWindup(ctx, w, progress) {
        const wcx = w.castX;
        const wcy = w.castY;
        const castTopY = wcy - CONFIG.SPRITE / 2;
        const spell = SPELL_DATA[w.comboKey];
        const color = AFFINITY_COLORS[spell.affinity] || '#fff';
        const kanjiMap = { fire: '\u706B', ice: '\u6C37', shock: '\u96F7' };
        const kanji = kanjiMap[spell.affinity] || '\u8853';
        const t = Date.now();
        ctx.save();

        // Kanji rising above caster
        const scale = 0.4 + progress * 0.6;
        const alpha = 0.2 + progress * 0.8;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 22;
        ctx.font = Math.floor(28 * scale) + 'px serif';
        ctx.textAlign = 'center';
        ctx.fillText(kanji, wcx, castTopY - 8 - progress * 18);

        // Orbiting element particles gathering inward
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + t / 280;
            const dist = 28 * (1 - progress * 0.55);
            const px = wcx + Math.cos(angle) * dist;
            const py = wcy + Math.sin(angle) * dist;
            ctx.globalAlpha = 0.3 + progress * 0.4;
            ctx.beginPath();
            ctx.arc(px, py, 1.5 + progress * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // --- Defensive Spell Telegraphs ---
    _drawDefensiveWindup(ctx, w, progress) {
        const wcx = w.castX;
        const wcy = w.castY;
        const t = Date.now();
        ctx.save();

        if (w.comboKey === 'ZCZ') {
            // Shield forming — hexagonal outline expanding
            const alpha = 0.15 + progress * 0.5;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = CONFIG.C.SHIELD;
            ctx.shadowColor = CONFIG.C.SHIELD;
            ctx.shadowBlur = 14;
            ctx.lineWidth = 2;
            const r = CONFIG.SPRITE * 0.35 + progress * CONFIG.SPRITE * 0.35;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const px = wcx + Math.cos(a) * r;
                const py = wcy + Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        } else if (w.comboKey === 'ZCX') {
            // Mist gathering — swirling wisps converging
            const alpha = 0.08 + progress * 0.25;
            ctx.globalAlpha = alpha;
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + t / 400;
                const dist = 22 + Math.sin(t / 180 + i) * 6;
                ctx.fillStyle = '#aaaaff';
                ctx.beginPath();
                ctx.arc(wcx + Math.cos(a) * dist, wcy + Math.sin(a) * dist,
                    3 + progress * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (w.comboKey === 'ZCC') {
            // Mirror shards orbiting
            const alpha = 0.25 + progress * 0.5;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffaaff';
            ctx.shadowColor = '#ffaaff';
            ctx.shadowBlur = 8;
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2 + t / 180;
                const dist = 18 + progress * 6;
                const px = wcx + Math.cos(a) * dist;
                const py = wcy + Math.sin(a) * dist;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(a + t / 90);
                ctx.fillRect(-2.5, -5, 5, 10);
                ctx.restore();
            }
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // --- Lane Effect Telegraph ---
    _drawLaneWindup(ctx, w, progress) {
        const c = w.caster;
        const spell = SPELL_DATA[w.comboKey];
        const color = AFFINITY_COLORS[spell.affinity] || '#fff';
        const isPlayer = c.owner === 'player';
        const isBurn = w.comboKey === 'XXX';
        const t = Date.now();

        const laneY = CONFIG.FIELD_TOP + w.castLane * CONFIG.LANE_HEIGHT;
        const laneH = CONFIG.LANE_HEIGHT;
        const laneMidY = laneY + laneH / 2;
        let x, width;
        if (isPlayer) {
            x = CONFIG.MIDPOINT;
            width = CONFIG.FIELD_RIGHT - CONFIG.MIDPOINT;
        } else {
            x = CONFIG.FIELD_LEFT;
            width = CONFIG.MIDPOINT - CONFIG.FIELD_LEFT;
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, laneY, width, laneH);
        ctx.clip();

        // Pulsing lane overlay
        const pulse = Math.sin(t / 70) * 0.5 + 0.5;
        const alpha = (0.04 + progress * 0.14) * (0.7 + pulse * 0.3);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x, laneY, width, laneH);

        // Warning border dashes scrolling
        ctx.globalAlpha = 0.25 + progress * 0.45;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 8]);
        ctx.lineDashOffset = -(t / 18) % 22;
        ctx.strokeRect(x + 2, laneY + 2, width - 4, laneH - 4);
        ctx.setLineDash([]);

        // Sweeping wave from caster side across the lane
        const waveX = x + width * progress;
        const waveW = 20 + progress * 30;
        const waveGrad = ctx.createLinearGradient(waveX - waveW, 0, waveX + waveW, 0);
        waveGrad.addColorStop(0, 'transparent');
        waveGrad.addColorStop(0.5, color);
        waveGrad.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.2 + progress * 0.35;
        ctx.fillStyle = waveGrad;
        ctx.fillRect(waveX - waveW, laneY, waveW * 2, laneH);

        // Element-specific flair
        if (isBurn) {
            // Rising heat columns along the lane
            ctx.globalAlpha = 0.15 + progress * 0.35;
            for (let i = 0; i < 8; i++) {
                const fx = x + (i / 8) * width + ((t / 12 + i * 37) % (width / 8));
                const flicker = Math.sin(t / 60 + i * 1.7) * 6;
                const fh = (12 + progress * 22) * (0.6 + Math.sin(t / 80 + i * 2.3) * 0.4);
                const fGrad = ctx.createLinearGradient(0, laneMidY + 10, 0, laneMidY + 10 - fh);
                fGrad.addColorStop(0, '#ff4400');
                fGrad.addColorStop(0.4, color);
                fGrad.addColorStop(1, '#ffcc00');
                ctx.fillStyle = fGrad;
                ctx.beginPath();
                ctx.moveTo(fx - 3 + flicker * 0.3, laneMidY + 10);
                ctx.quadraticCurveTo(fx + flicker * 0.5, laneMidY + 10 - fh * 0.6, fx + 1, laneMidY + 10 - fh);
                ctx.quadraticCurveTo(fx - flicker * 0.3, laneMidY + 10 - fh * 0.4, fx + 4 - flicker * 0.2, laneMidY + 10);
                ctx.fill();
            }
            // Ember sparkles
            ctx.fillStyle = '#ffcc44';
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 6;
            for (let i = 0; i < 6; i++) {
                const ex = x + ((t / 8 + i * 73) % width);
                const ey = laneY + 8 + ((t / 14 + i * 41) % (laneH - 16));
                const ea = 0.3 + Math.sin(t / 90 + i) * 0.3;
                ctx.globalAlpha = ea * progress;
                ctx.beginPath();
                ctx.arc(ex, ey, 1.5 + Math.sin(t / 70 + i) * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Frost: creeping ice crystals and mist
            ctx.globalAlpha = 0.1 + progress * 0.3;
            for (let i = 0; i < 10; i++) {
                const cx = x + ((i / 10) * width + (t / 30 + i * 47) % 40);
                const cy = laneY + 6 + ((i * 31 + 7) % (laneH - 12));
                const cSize = 3 + progress * 5 + Math.sin(t / 100 + i) * 2;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                // Crystal: 6-point star shape
                for (let j = 0; j < 3; j++) {
                    const ca = j * Math.PI / 3 + t / 800;
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(ca) * cSize, cy + Math.sin(ca) * cSize);
                    ctx.lineTo(cx - Math.cos(ca) * cSize, cy - Math.sin(ca) * cSize);
                    ctx.stroke();
                }
            }
            // Cold mist layer at bottom
            const mistGrad = ctx.createLinearGradient(0, laneY + laneH, 0, laneY + laneH - 20);
            mistGrad.addColorStop(0, color);
            mistGrad.addColorStop(1, 'transparent');
            ctx.globalAlpha = 0.08 + progress * 0.15;
            ctx.fillStyle = mistGrad;
            ctx.fillRect(x, laneY + laneH - 20, width, 20);
        }

        // Kanji in center of the affected zone
        if (progress > 0.3) {
            const kanjiLabel = isBurn ? '\u706B' : '\u6C37';
            const ka = (progress - 0.3) / 0.7;
            ctx.globalAlpha = ka * 0.4;
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 16;
            ctx.font = Math.floor(20 + progress * 10) + 'px serif';
            ctx.textAlign = 'center';
            ctx.fillText(kanjiLabel, x + width / 2, laneMidY + 7);
        }

        ctx.shadowBlur = 0;
        ctx.restore();

        // Elemental kanji in front of caster
        this._drawCasterKanji(ctx, w, progress);
    }

    // --- AOE / Ultimate Field-Wide Telegraph ---
    _drawAOEWindup(ctx, w, progress) {
        const spell = SPELL_DATA[w.comboKey];
        const color = AFFINITY_COLORS[spell.affinity] || '#fff';
        const t = Date.now();

        ctx.save();

        // Full field color pulse
        const pulse = Math.sin(t / 55) * 0.5 + 0.5;
        const alpha = (0.02 + progress * 0.1) * (0.6 + pulse * 0.4);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(CONFIG.FIELD_LEFT, CONFIG.FIELD_TOP, CONFIG.FIELD_WIDTH, CONFIG.FIELD_HEIGHT);

        // Thickening border
        ctx.globalAlpha = 0.25 + progress * 0.55;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 + progress * 4;
        ctx.strokeRect(CONFIG.FIELD_LEFT, CONFIG.FIELD_TOP, CONFIG.FIELD_WIDTH, CONFIG.FIELD_HEIGHT);

        // Energy orbs converging toward field center
        const fcx = CONFIG.FIELD_LEFT + CONFIG.FIELD_WIDTH / 2;
        const fcy = CONFIG.FIELD_TOP + CONFIG.FIELD_HEIGHT / 2;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        const ratio = CONFIG.FIELD_HEIGHT / CONFIG.FIELD_WIDTH;
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + t / 350;
            const maxD = CONFIG.FIELD_WIDTH * 0.48;
            const dist = maxD * (1 - progress * 0.65);
            const px = fcx + Math.cos(angle) * dist;
            const py = fcy + Math.sin(angle) * dist * ratio;
            ctx.globalAlpha = 0.25 + progress * 0.5;
            ctx.beginPath();
            ctx.arc(px, py, 2 + progress * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Elemental kanji at center
        if (progress > 0.35) {
            const kanjiMap = { fire: '\u968E\u77F3', ice: '\u6C37\u6CB3', shock: '\u96F7\u795E' };
            const kanji = kanjiMap[spell.affinity] || '\u8853';
            const ka = (progress - 0.35) / 0.65;
            ctx.globalAlpha = ka * 0.55;
            ctx.fillStyle = color;
            ctx.font = Math.floor(24 + progress * 14) + 'px serif';
            ctx.textAlign = 'center';
            ctx.fillText(kanji, fcx, fcy + 10);
        }

        ctx.shadowBlur = 0;
        ctx.restore();

        // Elemental kanji in front of caster
        this._drawCasterKanji(ctx, w, progress);
    }

    // --- Summon Telegraph (summoning circle) ---
    _drawSummonWindup(ctx, w, progress) {
        const c = w.caster;
        const isPlayer = c.owner === 'player';
        const sx = isPlayer ? w.castX + CONFIG.SPRITE / 2 + 40 : w.castX - CONFIG.SPRITE / 2 - 40;
        const sy = w.castY;
        const t = Date.now();

        ctx.save();
        const alpha = 0.15 + progress * 0.5;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffcc88';
        ctx.shadowColor = '#ffcc88';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.5;

        // Outer circle
        const r = 14 + progress * 10;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner rotating arc
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.55, t / 180, t / 180 + Math.PI * 1.5);
        ctx.stroke();

        // Seal marks
        ctx.fillStyle = '#ffcc88';
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + t / 260;
            ctx.fillRect(sx + Math.cos(a) * r * 0.75 - 2, sy + Math.sin(a) * r * 0.75 - 2, 4, 4);
        }

        ctx.shadowBlur = 0;
        ctx.restore();

        // Elemental kanji in front of caster (if elemental summon)
        this._drawCasterKanji(ctx, w, progress);
    }

    _applyEnchant(comboKey, caster, stats) {
        const affinity = SPELL_DATA[comboKey].affinity;
        caster.enchant = {
            type: affinity,
            timer: stats.duration,
            bonusDmg: stats.bonusDmg || 0,
            burnDmg: stats.burnDmg || 0,
            burnDur: stats.burnDur || 0,
            freezeDur: stats.freezeDur || 0,
            stunDur: stats.stunDur || 0,
        };
        this.effects.elementBurst(caster.cx, caster.cy, affinity);
        this.effects.statusText(caster.cx, caster.y - 15,
            affinity.toUpperCase() + ' ENCHANT', AFFINITY_COLORS[affinity]);
    }

    _applyDefensive(comboKey, caster, stats) {
        switch (comboKey) {
            case 'ZCZ': // Shield
                caster.shielded = true;
                caster.shieldTimer = stats.duration;
                this.effects.statusText(caster.cx, caster.y - 15, 'SHIELD', CONFIG.C.SHIELD);
                break;
            case 'ZCX': // Invisibility
                caster.invisible = true;
                caster.invisTimer = stats.duration;
                this.effects.statusText(caster.cx, caster.y - 15, 'INVISIBLE', '#aaaaff');
                break;
            case 'ZCC': // Deflection
                caster.deflecting = true;
                caster.deflectHits = stats.hits;
                this.effects.statusText(caster.cx, caster.y - 15, 'DEFLECT x' + stats.hits, '#ffaaff');
                break;
        }
    }

    _spawnLaneEffect(comboKey, caster, stats) {
        const isPlayer = caster.owner === 'player';
        const side = isPlayer ? 'enemy' : 'player'; // affects enemy side
        const type = comboKey === 'XXX' ? 'burn' : 'freeze';
        const le = new LaneEffect(caster.lane, side, type, stats.duration, stats, caster.owner);
        this.laneEffects.push(le);
        caster.spellOnScreen[comboKey] = true;
        this.effects.statusText(
            CONFIG.MIDPOINT + (isPlayer ? 100 : -100),
            CONFIG.FIELD_TOP + caster.lane * CONFIG.LANE_HEIGHT + CONFIG.LANE_HEIGHT / 2,
            type.toUpperCase() + '!', AFFINITY_COLORS[SPELL_DATA[comboKey].affinity]
        );
    }

    _aoeAttack(comboKey, caster, stats) {
        const spell = SPELL_DATA[comboKey];
        const isPlayer = caster.owner === 'player';
        const target = isPlayer ? this.enemy : this.player;

        // Hit main target
        target.takeDamage(stats.dmg, this.effects, caster);

        // Hit all enemy summons
        const enemySummons = this.summons.filter(s => s.owner !== caster.owner);
        enemySummons.forEach(s => {
            const died = s.takeDamage(stats.dmg, this.effects);
            if (died === true) this._onSummonKilled(s, caster);
            else if (died === 'regrow') this._onHydraRegrow(s);
        });

        // Record global AOE hits for Wrath stat
        if (isPlayer && this.stats) {
            this.stats.recordGlobalHits(1 + enemySummons.length);
        }

        // Apply status based on type (reduced by element resist)
        if (stats.burnDmg && stats.burnDur) {
            const dur = stats.burnDur * this._elementResist(target, 'fire');
            target.burnTimer = dur;
            target.burnDmg = stats.burnDmg;
            target.burnTick = 500;
            enemySummons.forEach(s => {
                s.burnTimer = stats.burnDur;
                s.burnDmg = stats.burnDmg;
                s.burnTick = 500;
            });
        }
        if (stats.freezeDur) {
            const dur = stats.freezeDur * this._elementResist(target, 'ice');
            target.freezeTimer = Math.max(target.freezeTimer, dur);
            enemySummons.forEach(s => { s.freezeTimer = Math.max(s.freezeTimer, stats.freezeDur); });
            if (isPlayer && this.stats) this.stats.recordStunFreeze();
            AudioEngine.playSfx('freeze');
        }
        if (stats.stunDur) {
            const dur = stats.stunDur * this._elementResist(target, 'shock');
            target.stunTimer = Math.max(target.stunTimer, dur);
            enemySummons.forEach(s => { s.stunTimer = Math.max(s.stunTimer, stats.stunDur); });
            if (isPlayer && this.stats) this.stats.recordStunFreeze();
            AudioEngine.playSfx('stun');
        }

        // Big visual
        this.effects.shake(300, 8);
        for (let i = 0; i < 20; i++) {
            this.effects.burst(
                CONFIG.FIELD_LEFT + Math.random() * CONFIG.FIELD_WIDTH,
                CONFIG.FIELD_TOP + Math.random() * CONFIG.FIELD_HEIGHT,
                AFFINITY_COLORS[spell.affinity], 5, 4, 500, 5
            );
        }
        this.effects.statusText(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 40,
            spell.name + '!', AFFINITY_COLORS[spell.affinity]);
    }

    _spawnSummon(comboKey, caster, stats) {
        const isPlayer = caster.owner === 'player';
        let sx = isPlayer
            ? caster.x + CONFIG.SPRITE + 10 + Math.random() * 60
            : caster.x - CONFIG.SPRITE - 10 - Math.random() * 60;

        // Clamp to own half
        if (isPlayer) {
            sx = Math.max(CONFIG.FIELD_LEFT + 5, Math.min(sx, CONFIG.MIDPOINT - CONFIG.SPRITE - 5));
        } else {
            sx = Math.max(CONFIG.MIDPOINT + 5, Math.min(sx, CONFIG.FIELD_RIGHT - CONFIG.SPRITE - 5));
        }

        const summon = new Summon(sx, caster.lane, caster.owner, comboKey, 1, stats);
        this.summons.push(summon);
        caster.spellOnScreen[comboKey] = true;

        // Naruto-style summoning poof!
        this.effects.poofCloud(summon.cx, summon.cy, summon.twoLane ? 40 : 28);
    }

    _calcDamage(baseDmg, attacker, target, spell) {
        let dmg = baseDmg;

        // Enchant bonus
        if (attacker.enchant) {
            dmg += attacker.enchant.bonusDmg;
        }

        // Elemental resistance — enchant halves matching element damage
        if (spell && target.enchant && spell.affinity !== 'none' && target.enchant.type === spell.affinity) {
            dmg = Math.ceil(dmg * 0.5);
            this.effects.statusText(target.cx, target.y - 20, 'RESIST', AFFINITY_COLORS[spell.affinity]);
        }

        return Math.max(1, dmg);
    }

    // Check if a fighter resists an element via enchant, returns duration multiplier
    _elementResist(target, affinity) {
        if (target.enchant && affinity && target.enchant.type === affinity) return 0.5;
        return 1;
    }

    _hasIncomingProjectile(lane) {
        return this.projectiles.some(p =>
            p.alive && p.owner === 'enemy' && p.lane === lane && p.x < CONFIG.MIDPOINT + 100
        );
    }

    _onHydraRegrow(summon) {
        // Each hydra head regrow costs its owner loyalty
        const loyDrop = Math.ceil(summon.loyaltyVal * CONFIG.LOYALTY_PER_HP * 0.5);
        const owner = summon.owner === 'player' ? this.player : this.enemy;
        owner.loyalty -= loyDrop;
        if (owner.loyalty < 0) owner.loyalty = 0;
        this.effects.statusText(summon.cx, summon.y - 20, 'LOYALTY -' + loyDrop, CONFIG.C.LOYALTY);
    }

    _onSummonKilled(summon, killer) {
        // Reduce the owning fighter's loyalty when their summon dies
        if (summon.owner === 'enemy') {
            const loyDrop = Math.ceil(summon.loyaltyVal * CONFIG.LOYALTY_PER_HP);
            this.enemy.loyalty -= loyDrop;
            if (this.enemy.loyalty < 0) this.enemy.loyalty = 0;
            this.effects.statusText(summon.cx, summon.y - 20, 'LOYALTY -' + loyDrop, CONFIG.C.LOYALTY);
            if (this.stats) this.stats.recordSummonKill();
            AudioEngine.playSfx('death');
        } else if (summon.owner === 'player') {
            const loyDrop = Math.ceil(summon.loyaltyVal * CONFIG.LOYALTY_PER_HP);
            this.player.loyalty -= loyDrop;
            if (this.player.loyalty < 0) this.player.loyalty = 0;
            this.effects.statusText(summon.cx, summon.y - 20, 'LOYALTY -' + loyDrop, CONFIG.C.LOYALTY);
            if (this.stats) this.stats.recordOwnSummonLost();
            AudioEngine.playSfx('death');
        }
        // Clean up spellOnScreen
        const owner = summon.owner === 'player' ? this.player : this.enemy;
        // Check if any other summon of same key exists
        const sameKey = this.summons.filter(s => s.alive && s.comboKey === summon.comboKey && s.owner === summon.owner);
        if (sameKey.length <= 1) { // the dying one is still in list
            delete owner.spellOnScreen[summon.comboKey];
        }
    }

    _applyEnchantEffects(target, attacker) {
        if (!attacker.enchant) return;
        const e = attacker.enchant;
        if (e.burnDmg && e.burnDur) {
            const dur = e.burnDur * this._elementResist(target, 'fire');
            target.burnTimer = dur;
            target.burnDmg = e.burnDmg;
            target.burnTick = 500;
        }
        if (e.freezeDur) {
            const dur = e.freezeDur * this._elementResist(target, 'ice');
            target.freezeTimer = Math.max(target.freezeTimer, dur);
        }
        if (e.stunDur) {
            const dur = e.stunDur * this._elementResist(target, 'shock');
            target.stunTimer = Math.max(target.stunTimer, dur);
        }
    }

    update(dt) {
        // Tutorial overlay: freeze combat until player casts their first spell
        if (this.showTutorial) {
            if (this.tutorialDelay > 0) this.tutorialDelay -= dt;
            if (this.tutorialCasted) {
                this.showTutorial = false;
                localStorage.setItem('eleninVS_tutorialSeen', '1');
            }
            return null;
        }

        if (this.result) {
            this.resultTimer -= dt;
            return this.resultTimer <= 0 ? this.result : null;
        }

        // Input: player movement
        const p = this.player;
        if (!p.isStunned()) {
            if (this.input.isDown('ArrowLeft')) {
                p.x = Math.max(CONFIG.FIELD_LEFT + 5, p.x - p.speed * (dt / 16));
            }
            if (this.input.isDown('ArrowRight')) {
                p.x = Math.min(CONFIG.MIDPOINT - CONFIG.SPRITE - 5, p.x + p.speed * (dt / 16));
            }
            if (this.input.wasPressed('ArrowUp')) {
                const dodged = this._hasIncomingProjectile(p.lane);
                p.switchLane(-1);
                if (this.stats) this.stats.recordLaneSwitch(dodged);
            }
            if (this.input.wasPressed('ArrowDown')) {
                const dodged = this._hasIncomingProjectile(p.lane);
                p.switchLane(1);
                if (this.stats) this.stats.recordLaneSwitch(dodged);
            }
        }

        // Update fighters
        p.update(dt);
        this.enemy.update(dt);

        // Update AI
        this.ai.update(dt, this);

        // Update projectiles
        this.projectiles.forEach(proj => {
            proj.update(dt);
            if (!proj.alive) return;
            if (!proj.charged) return;
            // Trailing particles for projectiles
            this._spawnProjectileTrail(proj, dt);
            this._checkProjectileCollisions(proj);
        });

        // Projectile-vs-projectile collisions
        this._checkProjectileVsProjectile();

        // Clean dead projectiles and free spellOnScreen
        this.projectiles = this.projectiles.filter(proj => {
            if (!proj.alive) {
                const owner = proj.owner === 'player' ? this.player : this.enemy;
                const sameKey = this.projectiles.filter(p => p.alive && p.comboKey === proj.comboKey && p.owner === proj.owner);
                if (sameKey.length <= 0) delete owner.spellOnScreen[proj.comboKey];

                // Backline loyalty penalty: unblocked summon projectile reached the far wall
                if (!proj.hitSomething && !proj.isStatic && proj.charged && proj.fromSummon) {
                    const hitBackline = (proj.dirX > 0 && proj.x >= CONFIG.FIELD_RIGHT - 10)
                                     || (proj.dirX < 0 && proj.x <= CONFIG.FIELD_LEFT + 10);
                    if (hitBackline) {
                        const victim = proj.dirX > 0 ? this.enemy : this.player;
                        const drop = 2;
                        victim.loyalty -= drop;
                        if (victim.loyalty < 0) victim.loyalty = 0;
                        this.effects.statusText(
                            proj.dirX > 0 ? CONFIG.FIELD_RIGHT - 30 : CONFIG.FIELD_LEFT + 30,
                            CONFIG.FIELD_TOP + proj.lane * CONFIG.LANE_HEIGHT + CONFIG.LANE_HEIGHT / 2,
                            'LOYALTY -' + drop, CONFIG.C.LOYALTY
                        );
                    }
                }

                return false;
            }
            return true;
        });

        // Update summons
        this.summons.forEach(s => {
            s.update(dt);
            if (!s.alive) return;
            // Summon attacks
            if (s.canAttack()) this._summonAttack(s);
            // Summon healing
            if (s.canHeal()) this._summonHeal(s);
        });
        this.summons = this.summons.filter(s => s.alive);

        // Snapshot per-lane enemy counts for Wrath stat
        if (this.stats) {
            const laneCounts = [0,0,0,0,0];
            laneCounts[this.enemy.lane]++;
            const enemySummons = this.summons.filter(s => s.owner === 'enemy');
            enemySummons.forEach(s => {
                s.getLanes().forEach(l => { laneCounts[l]++; });
            });
            let total = 0;
            for (let i = 0; i < 5; i++) {
                this.stats.updateLanePeak(i, laneCounts[i]);
                total += laneCounts[i];
            }
            // Global counts enemy fighter once (not per-lane)
            this.stats.updateGlobalPeak(1 + enemySummons.length);
        }

        // Update lane effects
        this.laneEffects.forEach(le => {
            le.update(dt);
            if (le.canTick()) this._laneEffectTick(le);
        });
        this.laneEffects = this.laneEffects.filter(le => {
            if (!le.alive) {
                const owner = le.owner === 'player' ? this.player : this.enemy;
                // Find if there's another lane effect of the same key
                const relatedKey = le.type === 'burn' ? 'XXX' : 'XXZ';
                const others = this.laneEffects.filter(l => l.alive && l.owner === le.owner && l.type === le.type);
                if (others.length <= 0) delete owner.spellOnScreen[relatedKey];
                return false;
            }
            return true;
        });

        // Update windups / telegraphs
        this._updateWindups(dt);

        // Update effects
        this.effects.update(dt);

        // Update ambient battlefield particles
        this._updateAmbient(dt);

        // Slash effects
        if (this._slashEffects) {
            this._slashEffects.forEach(s => { s.timer -= dt; });
            this._slashEffects = this._slashEffects.filter(s => s.timer > 0);
        }

        // Cut lines
        if (this._cutLines) {
            this._cutLines.forEach(c => { c.timer -= dt; });
            this._cutLines = this._cutLines.filter(c => c.timer > 0);
        }

        // Kanji floaters
        this._kanjiFloaters.forEach(f => {
            f.timer -= dt;
            f.x += f.driftX;
            f.y += f.driftY;
        });
        this._kanjiFloaters = this._kanjiFloaters.filter(f => f.timer > 0);

        // Clash effects
        if (this._clashEffects) {
            this._clashEffects.forEach(c => { c.timer -= dt; });
            this._clashEffects = this._clashEffects.filter(c => c.timer > 0);
        }

        // Spell info timer
        if (this.spellInfoTimer > 0) {
            this.spellInfoTimer -= dt;
            if (this.spellInfoTimer <= 0) this.spellInfo = null;
        }

        // Win/lose check
        if (this.enemy.hp <= 0 || this.enemy.loyalty <= 0) {
            this.result = 'win';
            this.resultTimer = 2000;
            this.effects.shake(500, 10);
            this.effects.statusText(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'VICTORY!', '#ffcc00');
            if (this.stats) this.stats.recordFightEnd(true, this.player, this.enemy);
        } else if (this.player.hp <= 0 || this.player.loyalty <= 0) {
            this.result = 'lose';
            this.resultTimer = 2000;
            this.effects.shake(500, 8);
            const reason = this.player.hp <= 0 ? 'DEFEATED' : 'LOYALTY BROKEN';
            this.effects.statusText(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, reason, '#ff4444');
            if (this.stats) this.stats.recordFightEnd(false, this.player, this.enemy);
        }

        return null;
    }

    _spawnProjectileTrail(proj, dt) {
        if (proj.isStatic) return;
        // Throttle to every ~40ms
        if (!proj._trailTimer) proj._trailTimer = 0;
        proj._trailTimer -= dt;
        if (proj._trailTimer > 0) return;
        proj._trailTimer = 40;

        const spell = SPELL_DATA[proj.comboKey];
        const px = proj.x + 8;
        const py = proj.cy;
        const icon = spell?.icon;

        if (icon === 'fireball') {
            // Flame trail — orange/yellow wisps drifting back
            for (let i = 0; i < 3; i++) {
                this.effects.particles.push(new Particle(
                    px - proj.dirX * 4, py + (Math.random() - 0.5) * 8,
                    -proj.dirX * (0.5 + Math.random()), (Math.random() - 0.5) * 1.5 - 0.5,
                    250 + Math.random() * 150,
                    Math.random() > 0.5 ? '#ff8800' : '#ffcc00',
                    3 + Math.random() * 2,
                    { round: true, glow: true, fadeSize: true, noGravity: true }
                ));
            }
        } else if (icon === 'iceshard') {
            // Frost sparkle trail
            this.effects.particles.push(new Particle(
                px - proj.dirX * 6, py + (Math.random() - 0.5) * 6,
                -proj.dirX * 0.3, (Math.random() - 0.5) * 0.5,
                200 + Math.random() * 100,
                '#bbedff', 2 + Math.random(),
                { round: true, glow: true, fadeSize: true, noGravity: true }
            ));
        } else if (icon === 'arrow') {
            // Faint wind streak
            if (Math.random() < 0.4) {
                this.effects.particles.push(new Particle(
                    px - proj.dirX * 8, py + (Math.random() - 0.5) * 4,
                    -proj.dirX * 1, 0, 120,
                    'rgba(200,200,200,0.5)', 1.5,
                    { spark: true, noGravity: true }
                ));
            }
        } else if (icon === 'boulder') {
            // Dust trail behind
            if (Math.random() < 0.5) {
                this.effects.particles.push(new Particle(
                    px - proj.dirX * 10, py + 6 + Math.random() * 4,
                    -proj.dirX * 0.5 + (Math.random() - 0.5), -0.3 - Math.random() * 0.5,
                    300 + Math.random() * 200,
                    '#aa9070', 3 + Math.random() * 2,
                    { round: true, fadeSize: true, noGravity: true }
                ));
            }
        } else if (icon === 'poison') {
            // Toxic drip trail
            if (Math.random() < 0.3) {
                this.effects.particles.push(new Particle(
                    px + (Math.random() - 0.5) * proj.width * 0.6,
                    py + (Math.random() - 0.5) * 8,
                    (Math.random() - 0.5) * 0.5, 0.3,
                    300, '#44ff66', 2 + Math.random(),
                    { round: true, fadeSize: true, noGravity: true }
                ));
            }
        } else if (icon === 'shuriken' && !proj.isStatic) {
            // Metallic glint
            if (Math.random() < 0.3) {
                this.effects.particles.push(new Particle(
                    px + (Math.random() - 0.5) * 6, py + (Math.random() - 0.5) * 6,
                    0, 0, 100,
                    '#ffffff', 1.5,
                    { round: true, glow: true, fadeSize: true, noGravity: true }
                ));
            }
        }
    }

    _checkProjectileCollisions(proj) {
        const isPlayerProj = proj.owner === 'player';
        const target = isPlayerProj ? this.enemy : this.player;
        const targetSummons = this.summons.filter(s => s.owner !== proj.owner);

        // For static projectiles, use tick damage
        if (proj.isStatic) {
            if (!proj.canTickDamage()) return;
        }

        // Check against main target
        if (target.lane === proj.lane && Math.abs(target.cx - proj.cx) < CONFIG.SPRITE * 0.7) {
            // Skip if piercing and already hit this target
            if (proj.isPiercing && proj.hitTargets.has('main')) {
                // do nothing
            } else {
            // Deflection check
            if (target.deflecting && target.deflectHits > 0) {
                target.deflectHits--;
                if (target.deflectHits <= 0) target.deflecting = false;
                // Reverse projectile
                proj.dirX *= -1;
                proj.owner = target.owner;
                proj.facing = target.facing;
                proj.hitTargets.clear();
                this.effects.statusText(target.cx, target.y - 15, 'DEFLECT!', '#ffaaff');
                AudioEngine.playSfx('deflect');
                return;
            }

            if (proj.isPiercing) proj.hitTargets.add('main');

            const spell = SPELL_DATA[proj.comboKey];
            const dmg = this._calcDamage(proj.dmg, isPlayerProj ? this.player : this.enemy, target, spell);
            target.takeDamage(dmg, this.effects, isPlayerProj ? this.player : this.enemy);
            if (!proj.hitSomething && this.stats) {
                if (!isPlayerProj) this.stats.recordProjHitBy();
                if (isPlayerProj) this.stats.recordPlayerProjHit();
            }
            proj.hitSomething = true;
            AudioEngine.playSfx('hit');

            // Apply enchant effects from caster
            const caster = isPlayerProj ? this.player : this.enemy;
            this._applyEnchantEffects(target, caster);

            // Apply projectile-specific effects (reduced by element resist)
            if (proj.stats.burnDmg) {
                const dur = (proj.stats.burnDur || 1000) * this._elementResist(target, 'fire');
                target.burnTimer = dur;
                target.burnDmg = proj.stats.burnDmg;
                target.burnTick = 500;
            }
            if (proj.stats.freezeDur) {
                const dur = proj.stats.freezeDur * this._elementResist(target, 'ice');
                target.freezeTimer = Math.max(target.freezeTimer, dur);
                if (isPlayerProj && this.stats) this.stats.recordStunFreeze();
                AudioEngine.playSfx('freeze');
            }
            if (proj.stats.stunDur) {
                const dur = proj.stats.stunDur * this._elementResist(target, 'shock');
                target.stunTimer = Math.max(target.stunTimer, dur);
                if (isPlayerProj && this.stats) this.stats.recordStunFreeze();
                AudioEngine.playSfx('stun');
            }
            if (proj.stats.poisonDmg) {
                const dur = (proj.stats.poisonDur || 3000) * this._elementResist(target, 'poison');
                target.poisonTimer = dur;
                target.poisonDmg = proj.stats.poisonDmg;
                target.poisonTick = 500;
                this.effects.statusText(target.cx, target.y - 15, 'POISONED', CONFIG.C.POISON);
            }

            if (!proj.isStatic && !proj.isPiercing) proj.alive = false;
            } // end piercing check
        }

        // Check against summons
        targetSummons.forEach(s => {
            if (!s.getLanes().includes(proj.lane)) return;
            if (Math.abs(s.cx - proj.cx) < CONFIG.SPRITE * 0.6) {
                // Skip if piercing and already hit this summon
                if (proj.isPiercing && proj.hitTargets.has(s)) return;
                // Javelineer deflect
                if (s.deflectChance > 0 && Math.random() < s.deflectChance) {
                    proj.dirX *= -1;
                    proj.owner = s.owner;
                    this.effects.statusText(s.cx, s.y - 10, 'DEFLECT!', '#aaddff');
                    AudioEngine.playSfx('deflect');
                    return;
                }

                if (proj.isPiercing) proj.hitTargets.add(s);

                const died = s.takeDamage(proj.dmg, this.effects);
                if (died === true) this._onSummonKilled(s, isPlayerProj ? this.player : this.enemy);
                else if (died === 'regrow') this._onHydraRegrow(s);
                proj.hitSomething = true;
                if (proj.stats.poisonDmg) {
                    s.poisonTimer = proj.stats.poisonDur || 3000;
                    s.poisonDmg = proj.stats.poisonDmg;
                    s.poisonTick = 500;
                }

                if (!proj.isStatic && !proj.isPiercing) proj.alive = false;
            }
        });
    }

    _checkProjectileVsProjectile() {
        const projs = this.projectiles;
        for (let i = 0; i < projs.length; i++) {
            const a = projs[i];
            if (!a.alive || !a.charged || a.isStatic || a.isCloud) continue;
            for (let j = i + 1; j < projs.length; j++) {
                const b = projs[j];
                if (!b.alive || !b.charged || b.isStatic || b.isCloud) continue;
                if (a.owner === b.owner) continue; // same side, no collision
                if (a.lane !== b.lane) continue;
                const dist = Math.abs(a.cx - b.cx);
                if (dist > CONFIG.SPRITE * 0.7) continue;

                // Collision! Determine type
                const aIsPlayer = a.owner === 'player';

                // Summon-vs-summon projectiles don't interact
                if (a.fromSummon && b.fromSummon) continue;

                const playerProj = aIsPlayer ? a : b;
                const enemyProj = aIsPlayer ? b : a;

                // Only main-cast projectiles destroy summon projectiles
                const playerIsSummonProj = playerProj.fromSummon;
                const enemyIsSummonProj = enemyProj.fromSummon;

                const cx = (a.cx + b.cx) / 2;
                const cy = (a.cy + b.cy) / 2;

                if (enemyIsSummonProj && !playerIsSummonProj) {
                    // Player main projectile destroys enemy summon projectile
                    enemyProj.alive = false;
                    enemyProj.hitSomething = true;
                    this.effects.burst(cx, cy, '#ffaa44', 5, 3, 200, 3);
                    this.effects.statusText(cx, cy - 15, 'BLOCKED', '#ffcc66');
                    AudioEngine.playSfx('hit');
                } else if (playerIsSummonProj && !enemyIsSummonProj) {
                    // Enemy main projectile destroys player summon projectile
                    playerProj.alive = false;
                    playerProj.hitSomething = true;
                    this.effects.burst(cx, cy, '#ffaa44', 5, 3, 200, 3);
                    this.effects.statusText(cx, cy - 15, 'BLOCKED', '#ffcc66');
                    AudioEngine.playSfx('hit');
                } else if (playerIsSummonProj && enemyIsSummonProj) {
                    // Both summon — already filtered above, but safety pass-through
                    continue;
                } else {
                    // Two main projectiles cancel each other — fancy clash effect
                    a.alive = false;
                    b.alive = false;
                    a.hitSomething = true;
                    b.hitSomething = true;

                    // Determine clash color from both affinities
                    const spellA = SPELL_DATA[a.comboKey];
                    const spellB = SPELL_DATA[b.comboKey];
                    const colorA = spellA ? (AFFINITY_COLORS[spellA.affinity] || '#fff') : '#fff';
                    const colorB = spellB ? (AFFINITY_COLORS[spellB.affinity] || '#fff') : '#fff';

                    // Big clash burst
                    this.effects.burst(cx, cy, colorA, 8, 5, 400, 5);
                    this.effects.burst(cx, cy, colorB, 8, 5, 400, 5);
                    this.effects.burst(cx, cy, '#ffffff', 6, 3, 300, 4);
                    this.effects.shake(150, 4);

                    // Clash flash ring
                    this._clashEffects = this._clashEffects || [];
                    this._clashEffects.push({
                        x: cx, y: cy,
                        colorA, colorB,
                        timer: 400, maxTimer: 400,
                    });

                    this.effects.statusText(cx, cy - 20, 'CLASH!', '#ffffff');
                    AudioEngine.playSfx('deflect');
                }
            }
        }
    }

    _summonAttack(summon) {
        const isPlayer = summon.owner === 'player';
        const target = isPlayer ? this.enemy : this.player;

        // Dragon head: spawn lane burn effect
        if (summon.breathDmg > 0) {
            const side = isPlayer ? 'enemy' : 'player';
            const le = new LaneEffect(summon.lane, side, 'burn', summon.breathDur, {
                dmg: summon.breathDmg,
                tickRate: 600,
            }, summon.owner);
            this.laneEffects.push(le);
            this.effects.burst(summon.cx + (isPlayer ? 30 : -30), summon.cy, CONFIG.C.FIRE, 6, 3, 300, 3);
            return;
        }

        // Regular attack: fire a projectile
        if (summon.dmg > 0) {
            const projStats = {
                dmg: summon.dmg,
                speed: 5,
                freezeDur: summon.freezeDur || 0,
                stunDur: summon.stunDur || 0,
                burnDmg: summon.burnDmg || 0,
                burnDur: summon.burnDur || 0,
            };
            const px = summon.cx + (isPlayer ? 20 : -20);
            const proj = new Projectile(px, summon.lane, summon.owner,
                summon.comboKey, summon.level, projStats, summon.facing);
            proj.charged = true;
            proj.fromSummon = true;
            this.projectiles.push(proj);
            if (!isPlayer && this.stats) this.stats.recordEnemyProjFired();
        }
    }

    _summonHeal(summon) {
        // Heal nearby entities in same lane(s)
        const lanes = summon.getLanes();
        const allies = [
            summon.owner === 'player' ? this.player : this.enemy,
            ...this.summons.filter(s => s.owner === summon.owner && s !== summon),
        ];
        allies.forEach(a => {
            if (lanes.includes(a.lane) && Math.abs(a.cx - summon.cx) < 200) {
                if (a.hp < a.maxHp) {
                    a.hp = Math.min(a.maxHp, a.hp + summon.healAmt);
                    this.effects.healNumber(a.cx, a.y, summon.healAmt);
                    AudioEngine.playSfx('heal');
                }
            }
        });
    }

    _laneEffectTick(le) {
        const isPlayerOwned = le.owner === 'player';
        // Determine who gets hit
        const target = isPlayerOwned ? this.enemy : this.player;
        const targetSummons = this.summons.filter(s => s.owner !== le.owner);
        let laneHits = 0;

        // Hit main target if in this lane and on affected side
        if (target.lane === le.lane) {
            const inSide = le.side === 'enemy'
                ? target.cx > CONFIG.MIDPOINT
                : target.cx < CONFIG.MIDPOINT;
            if (inSide) {
                laneHits++;
                if (le.type === 'burn' && le.stats.dmg) {
                    const resist = this._elementResist(target, 'fire');
                    target.takeDamage(Math.max(1, Math.ceil(le.stats.dmg * resist)), this.effects, null);
                }
                if (le.type === 'freeze' && le.stats.freezeDur) {
                    const dur = le.stats.freezeDur * this._elementResist(target, 'ice');
                    target.freezeTimer = Math.max(target.freezeTimer, dur);
                }
            }
        }

        // Hit summons in lane on affected side
        targetSummons.forEach(s => {
            if (!s.getLanes().includes(le.lane)) return;
            const inSide = le.side === 'enemy'
                ? s.cx > CONFIG.MIDPOINT
                : s.cx < CONFIG.MIDPOINT;
            if (!inSide) return;
            laneHits++;

            if (le.type === 'burn' && le.stats.dmg) {
                const died = s.takeDamage(le.stats.dmg, this.effects);
                if (died === true) this._onSummonKilled(s, isPlayerOwned ? this.player : this.enemy);
                else if (died === 'regrow') this._onHydraRegrow(s);
            }
            if (le.type === 'freeze' && le.stats.freezeDur) {
                s.freezeTimer = Math.max(s.freezeTimer, le.stats.freezeDur);
            }
        });

        // Record lane hits for Wrath stat
        if (isPlayerOwned && this.stats && laneHits > 0) {
            this.stats.recordLaneHits(le.lane, laneHits);
        }
    }

    draw(ctx) {
        const shake = this.effects.getShakeOffset();
        ctx.save();
        ctx.translate(shake.x, shake.y);

        // Background — themed gradient
        const bgGrad = ctx.createLinearGradient(0, CONFIG.FIELD_TOP, 0, CONFIG.FIELD_BOTTOM);
        bgGrad.addColorStop(0, this.theme.bgGrad[0]);
        bgGrad.addColorStop(1, this.theme.bgGrad[1]);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        // Draw lanes with affinity tint
        for (let i = 0; i < CONFIG.LANE_COUNT; i++) {
            const ly = CONFIG.FIELD_TOP + i * CONFIG.LANE_HEIGHT;
            ctx.fillStyle = i % 2 === 0 ? CONFIG.C.LANE_A : CONFIG.C.LANE_B;
            ctx.fillRect(CONFIG.FIELD_LEFT, ly, CONFIG.FIELD_WIDTH, CONFIG.LANE_HEIGHT);

            // Affinity tint overlay
            ctx.fillStyle = this.theme.laneTint;
            ctx.fillRect(CONFIG.FIELD_LEFT, ly, CONFIG.FIELD_WIDTH, CONFIG.LANE_HEIGHT);

            // Lane line
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.beginPath();
            ctx.moveTo(CONFIG.FIELD_LEFT, ly);
            ctx.lineTo(CONFIG.FIELD_RIGHT, ly);
            ctx.stroke();
        }

        // Battlefield scenery (behind everything)
        this._drawBattlefield(ctx);

        // Ambient particles (behind entities)
        this._drawAmbientParticles(ctx);

        // Midpoint line — themed
        ctx.strokeStyle = this.theme.midline;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(CONFIG.MIDPOINT, CONFIG.FIELD_TOP);
        ctx.lineTo(CONFIG.MIDPOINT, CONFIG.FIELD_BOTTOM);
        ctx.stroke();
        ctx.setLineDash([]);

        // Lane effects (behind entities)
        this.laneEffects.forEach(le => le.draw(ctx));

        // Summons
        this.summons.forEach(s => s.draw(ctx));

        // Projectiles
        this.projectiles.forEach(p => p.draw(ctx));

        // Lingering kanji floaters (on top of entities)
        this._kanjiFloaters.forEach(f => {
            const life = f.timer / f.maxTimer;
            const alpha = life < 0.4 ? life / 0.4 : 1;
            ctx.save();
            ctx.globalAlpha = alpha * 0.75;
            ctx.fillStyle = f.color;
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 14 * life;
            ctx.font = Math.floor(34 + (1 - life) * 10) + 'px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(f.kanji, f.x, f.y);
            ctx.shadowBlur = 0;
            ctx.restore();
        });

        // Slash effects
        if (this._slashEffects) {
            this._slashEffects.forEach(s => {
                const progress = 1 - s.timer / s.maxTimer;
                Sprites.swordSlash(ctx, s.x, s.y, s.range, CONFIG.LANE_HEIGHT * 0.6, progress, s.facing);
            });
        }

        // Cut lines on hit targets
        if (this._cutLines) {
            this._cutLines.forEach(c => {
                const p = 1 - c.timer / c.maxTimer;
                const alpha = p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.15) / 0.85);
                const len = CONFIG.SPRITE * 0.7;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = '#ffffff';
                ctx.shadowColor = '#aaddff';
                ctx.shadowBlur = 10;
                ctx.lineWidth = 2.5 - p * 1.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(c.x - len, c.y - len);
                ctx.lineTo(c.x + len, c.y + len);
                ctx.stroke();
                // Thinner bright inner line
                ctx.globalAlpha = alpha * 0.7;
                ctx.strokeStyle = '#aaddff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(c.x - len * 0.8, c.y - len * 0.8);
                ctx.lineTo(c.x + len * 0.8, c.y + len * 0.8);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();
            });
        }

        // Fighters
        this.player.drawLane(ctx);
        this.enemy.drawLane(ctx);

        // Bow charge (on top of player)
        this.projectiles.forEach(p => p.drawBowCharge(ctx));

        // Windup telegraphs (on top of entities)
        this._drawWindups(ctx);

        // Clash effects (expanding ring + cross spark)
        if (this._clashEffects) {
            this._clashEffects.forEach(c => {
                const p = 1 - c.timer / c.maxTimer;
                const alpha = p < 0.1 ? p / 0.1 : Math.max(0, 1 - (p - 0.1) / 0.9);
                const r = 8 + p * 40;
                ctx.save();

                // Outer ring — color A
                ctx.globalAlpha = alpha * 0.7;
                ctx.strokeStyle = c.colorA;
                ctx.shadowColor = c.colorA;
                ctx.shadowBlur = 15;
                ctx.lineWidth = 3 - p * 2;
                ctx.beginPath();
                ctx.arc(c.x, c.y, r, 0, Math.PI);
                ctx.stroke();

                // Outer ring — color B
                ctx.strokeStyle = c.colorB;
                ctx.shadowColor = c.colorB;
                ctx.beginPath();
                ctx.arc(c.x, c.y, r, Math.PI, Math.PI * 2);
                ctx.stroke();

                // Inner white flash
                ctx.globalAlpha = alpha * 0.9;
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(c.x, c.y, Math.max(1, 6 * (1 - p)), 0, Math.PI * 2);
                ctx.fill();

                // Cross spark lines
                const sparkLen = 12 + p * 20;
                ctx.globalAlpha = alpha * 0.6;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5 - p;
                ctx.shadowBlur = 8;
                for (let i = 0; i < 4; i++) {
                    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
                    ctx.beginPath();
                    ctx.moveTo(c.x, c.y);
                    ctx.lineTo(c.x + Math.cos(a) * sparkLen, c.y + Math.sin(a) * sparkLen);
                    ctx.stroke();
                }

                ctx.shadowBlur = 0;
                ctx.restore();
            });
        }

        // Effects (particles, flashes, text)
        this.effects.draw(ctx);

        // Tutorial overlay — drawn UNDER UI so bars/orbs/history are visible on top
        if (this.showTutorial) {
            this._drawTutorial(ctx);
        }

        // --- UI ---
        // Side panels background
        ctx.fillStyle = CONFIG.C.PANEL;
        ctx.fillRect(0, CONFIG.TOP_BAR, CONFIG.SIDE_PANEL, CONFIG.HEIGHT - CONFIG.TOP_BAR);
        ctx.fillRect(CONFIG.WIDTH - CONFIG.SIDE_PANEL, CONFIG.TOP_BAR, CONFIG.SIDE_PANEL, CONFIG.HEIGHT - CONFIG.TOP_BAR);

        // Player HP bar (left)
        UI.drawPipBar(ctx, 5, CONFIG.TOP_BAR + 5, (CONFIG.SIDE_PANEL - 10) / 2,
            CONFIG.FIELD_HEIGHT - 10, this.player.hp, this.player.maxHp,
            CONFIG.C.HP, CONFIG.C.HP_EMPTY, 'HP', false);

        // Player Loyalty bar (left, second column)
        UI.drawPipBar(ctx, CONFIG.SIDE_PANEL / 2 + 2, CONFIG.TOP_BAR + 5,
            (CONFIG.SIDE_PANEL - 10) / 2, CONFIG.FIELD_HEIGHT - 10,
            this.player.loyalty, this.player.maxLoyalty,
            CONFIG.C.LOYALTY, CONFIG.C.LOY_EMPTY, 'LOY', false);

        // Enemy HP bar (right)
        UI.drawPipBar(ctx, CONFIG.WIDTH - CONFIG.SIDE_PANEL + 5, CONFIG.TOP_BAR + 5,
            (CONFIG.SIDE_PANEL - 10) / 2, CONFIG.FIELD_HEIGHT - 10,
            this.enemy.hp, this.enemy.maxHp,
            CONFIG.C.HP, CONFIG.C.HP_EMPTY, 'HP', false);

        // Enemy Loyalty bar (right, second column)
        UI.drawPipBar(ctx, CONFIG.WIDTH - CONFIG.SIDE_PANEL / 2 + 2, CONFIG.TOP_BAR + 5,
            (CONFIG.SIDE_PANEL - 10) / 2, CONFIG.FIELD_HEIGHT - 10,
            this.enemy.loyalty, this.enemy.maxLoyalty,
            CONFIG.C.LOYALTY, CONFIG.C.LOY_EMPTY, 'LOY', false);

        // Bottom panel
        ctx.fillStyle = CONFIG.C.PANEL;
        ctx.fillRect(0, CONFIG.HEIGHT - CONFIG.BOTTOM_PANEL, CONFIG.WIDTH, CONFIG.BOTTOM_PANEL);

        // Separator
        ctx.strokeStyle = CONFIG.C.ACCENT;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, CONFIG.HEIGHT - CONFIG.BOTTOM_PANEL);
        ctx.lineTo(CONFIG.WIDTH, CONFIG.HEIGHT - CONFIG.BOTTOM_PANEL);
        ctx.stroke();

        // Combo orbs
        UI.drawComboOrbs(ctx, this.input.getCombo(), this.input.getPostCastProgress());

        // Spell info
        UI.drawSpellInfo(ctx, this.spellInfo);

        // Cooldowns
        UI.drawCooldowns(ctx, this.player, 'left');

        // Cast history (player on left, enemy on right)
        UI.drawHistory(ctx, this.castHistory, 'left', this.player);

        // Enemy cast history
        UI.drawHistory(ctx, this.enemyCastHistory, 'right', this.enemy);

        // Top bar
        UI.drawTopBar(ctx, this.enemyData);

        ctx.restore();

        // Pause menu overlay (drawn outside shake transform)
        if (this.paused) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

            ctx.fillStyle = '#ffffff';
            ctx.font = '800 36px ' + CONFIG.FONT;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('PAUSED', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 70);

            const opts = ['Continue', 'Quit'];
            opts.forEach((opt, i) => {
                const y = CONFIG.HEIGHT / 2 + i * 52;
                const sel = i === this.pauseSelected;
                // Selection box
                if (sel) {
                    ctx.fillStyle = 'rgba(233,69,96,0.15)';
                    ctx.strokeStyle = CONFIG.C.ACCENT;
                    ctx.lineWidth = 2;
                    const bx = CONFIG.WIDTH / 2 - 110, by = y - 20, bw = 220, bh = 40, br = 8;
                    ctx.beginPath();
                    ctx.moveTo(bx + br, by);
                    ctx.arcTo(bx + bw, by, bx + bw, by + bh, br);
                    ctx.arcTo(bx + bw, by + bh, bx, by + bh, br);
                    ctx.arcTo(bx, by + bh, bx, by, br);
                    ctx.arcTo(bx, by, bx + bw, by, br);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.fillStyle = sel ? '#ffffff' : '#667788';
                ctx.font = (sel ? '700' : '400') + ' 22px ' + CONFIG.FONT;
                ctx.fillText(opt, CONFIG.WIDTH / 2, y);
            });

            ctx.fillStyle = '#556677';
            ctx.font = '400 14px ' + CONFIG.FONT;
            ctx.fillText('Press ESC to resume', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 140);
            ctx.restore();
        }
    }

    _drawTutorial(ctx) {
        ctx.save();
        const font = CONFIG.FONT;
        const fl = CONFIG.FIELD_LEFT;
        const fr = CONFIG.FIELD_RIGHT;
        const ft = CONFIG.FIELD_TOP;
        const fb = CONFIG.FIELD_BOTTOM;
        const fw = CONFIG.FIELD_WIDTH;
        const fh = CONFIG.FIELD_HEIGHT;
        const cx = fl + fw / 2;
        const cy = ft + fh / 2;

        // Dim the battlefield area
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(fl, ft, fw, fh);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // --- Controls at center ---
        let y = cy - 80;
        ctx.fillStyle = '#ffcc44';
        ctx.font = '700 18px ' + font;
        ctx.fillText('CONTROLS', cx, y);
        y += 30;

        const controls = [
            ['\u2190 \u2192', 'Move'],
            ['\u2191 \u2193', 'Switch lanes'],
            ['Z  X  C', 'Cast spells (3 keys = 1 spell)'],
        ];
        controls.forEach(([key, desc]) => {
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 14px ' + font;
            ctx.textAlign = 'right';
            ctx.fillText(key, cx - 12, y);
            ctx.fillStyle = '#99aabb';
            ctx.font = '400 14px ' + font;
            ctx.textAlign = 'left';
            ctx.fillText(desc, cx + 12, y);
            y += 24;
        });

        // --- Bar highlight annotations ---
        ctx.textAlign = 'left';
        ctx.font = '700 13px ' + font;
        // Player side: arrow pointing left toward bars
        const barLabelX = fl + 10;
        ctx.fillStyle = CONFIG.C.HP;
        ctx.fillText('\u2190 HP', barLabelX, ft + 30);
        ctx.fillStyle = '#99aabb';
        ctx.font = '400 11px ' + font;
        ctx.fillText('Hit by attacks', barLabelX, ft + 46);

        ctx.font = '700 13px ' + font;
        ctx.fillStyle = CONFIG.C.LOYALTY;
        ctx.fillText('\u2190 Loyalty', barLabelX, ft + 72);
        ctx.fillStyle = '#99aabb';
        ctx.font = '400 11px ' + font;
        ctx.fillText('Summons killed or', barLabelX, ft + 88);
        ctx.fillText('unblocked summon shots', barLabelX, ft + 102);

        // Enemy side: arrow pointing right toward bars
        ctx.textAlign = 'right';
        const barRightX = fr - 10;
        ctx.font = '700 13px ' + font;
        ctx.fillStyle = CONFIG.C.HP;
        ctx.fillText('HP \u2192', barRightX, ft + 30);
        ctx.fillStyle = '#99aabb';
        ctx.font = '400 11px ' + font;
        ctx.fillText('Hit the ninja!', barRightX, ft + 46);

        ctx.font = '700 13px ' + font;
        ctx.fillStyle = CONFIG.C.LOYALTY;
        ctx.fillText('Loyalty \u2192', barRightX, ft + 72);
        ctx.fillStyle = '#99aabb';
        ctx.font = '400 11px ' + font;
        ctx.fillText('Kill their summons', barRightX, ft + 88);
        ctx.fillText('Let summon projectiles through', barRightX, ft + 102);

        // --- Cast prompt ---
        ctx.textAlign = 'center';
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = '700 16px ' + font;
        ctx.fillText('Cast a spell to begin  (Z, X, or C \u00D7 3)', cx, fb - 30);
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    // ===== BATTLEFIELD SCENERY =====
    _drawBattlefield(ctx) {
        const fl = CONFIG.FIELD_LEFT;
        const fr = CONFIG.FIELD_RIGHT;
        const ft = CONFIG.FIELD_TOP;
        const fb = CONFIG.FIELD_BOTTOM;
        const fw = CONFIG.FIELD_WIDTH;
        const fh = CONFIG.FIELD_HEIGHT;

        ctx.save();
        ctx.beginPath();
        ctx.rect(fl, ft, fw, fh);
        ctx.clip();

        switch (this.theme.ambient) {
            case 'ember': this._bgFire(ctx, fl, ft, fw, fh, fb); break;
            case 'snow':  this._bgIce(ctx, fl, ft, fw, fh, fb); break;
            case 'leaf':  this._bgWind(ctx, fl, ft, fw, fh, fb); break;
            case 'spark': this._bgStorm(ctx, fl, ft, fw, fh, fb); break;
            case 'dust':  this._bgEarth(ctx, fl, ft, fw, fh, fb); break;
            case 'wisp':  this._bgShadow(ctx, fl, ft, fw, fh, fb); break;
            case 'bubble':this._bgWater(ctx, fl, ft, fw, fh, fb); break;
            case 'spore': this._bgPoison(ctx, fl, ft, fw, fh, fb); break;
        }

        ctx.restore();
    }

    // --- Fire: Lava floor with cracked rock pillars ---
    _bgFire(ctx, fl, ft, fw, fh, fb) {
        // Lava glow at bottom
        const lavaGrad = ctx.createLinearGradient(0, fb - 40, 0, fb);
        lavaGrad.addColorStop(0, 'rgba(255,60,0,0)');
        lavaGrad.addColorStop(1, 'rgba(255,80,0,0.15)');
        ctx.fillStyle = lavaGrad;
        ctx.fillRect(fl, fb - 40, fw, 40);

        // Jagged rock pillars (silhouettes)
        ctx.fillStyle = 'rgba(40,15,5,0.35)';
        const pillars = [0.05, 0.2, 0.45, 0.7, 0.88];
        pillars.forEach((p, i) => {
            const px = fl + fw * p;
            const h = 50 + (i % 3) * 25;
            ctx.beginPath();
            ctx.moveTo(px - 12, fb);
            ctx.lineTo(px - 6, fb - h);
            ctx.lineTo(px + 2, fb - h + 10);
            ctx.lineTo(px + 8, fb - h - 5);
            ctx.lineTo(px + 14, fb);
            ctx.closePath();
            ctx.fill();
        });

        // Ember cracks on ground
        ctx.strokeStyle = 'rgba(255,100,20,0.12)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const x = fl + 60 + i * 90;
            ctx.beginPath();
            ctx.moveTo(x, fb - 5);
            ctx.lineTo(x + 15, fb - 15);
            ctx.lineTo(x + 30, fb - 8);
            ctx.stroke();
        }
    }

    // --- Ice: Frozen mountains with icicles ---
    _bgIce(ctx, fl, ft, fw, fh, fb) {
        // Distant mountains
        ctx.fillStyle = 'rgba(60,80,120,0.2)';
        ctx.beginPath();
        ctx.moveTo(fl, fb);
        ctx.lineTo(fl + fw * 0.1, ft + 30);
        ctx.lineTo(fl + fw * 0.22, ft + 80);
        ctx.lineTo(fl + fw * 0.35, ft + 10);
        ctx.lineTo(fl + fw * 0.5, ft + 60);
        ctx.lineTo(fl + fw * 0.65, ft + 20);
        ctx.lineTo(fl + fw * 0.78, ft + 70);
        ctx.lineTo(fl + fw * 0.9, ft + 25);
        ctx.lineTo(fl + fw, fb);
        ctx.closePath();
        ctx.fill();

        // Snow caps
        ctx.fillStyle = 'rgba(200,220,255,0.12)';
        const peaks = [[0.1, 30], [0.35, 10], [0.65, 20], [0.9, 25]];
        peaks.forEach(([p, off]) => {
            const px = fl + fw * p;
            const py = ft + off;
            ctx.beginPath();
            ctx.moveTo(px - 20, py + 15);
            ctx.lineTo(px, py);
            ctx.lineTo(px + 20, py + 15);
            ctx.closePath();
            ctx.fill();
        });

        // Icicles from top
        ctx.fillStyle = 'rgba(150,200,255,0.15)';
        for (let i = 0; i < 12; i++) {
            const x = fl + 40 + i * 65;
            const h = 15 + (i % 3) * 12;
            ctx.beginPath();
            ctx.moveTo(x - 3, ft);
            ctx.lineTo(x, ft + h);
            ctx.lineTo(x + 3, ft);
            ctx.closePath();
            ctx.fill();
        }

        // Frost on floor
        ctx.fillStyle = 'rgba(180,220,255,0.06)';
        ctx.fillRect(fl, fb - 8, fw, 8);
    }

    // --- Wind: Bamboo forest with misty layers ---
    _bgWind(ctx, fl, ft, fw, fh, fb) {
        // Mist layers
        ctx.fillStyle = 'rgba(100,180,140,0.04)';
        ctx.fillRect(fl, ft + fh * 0.3, fw, fh * 0.15);
        ctx.fillStyle = 'rgba(100,180,140,0.03)';
        ctx.fillRect(fl, ft + fh * 0.6, fw, fh * 0.15);

        // Bamboo stalks
        const bambooX = [0.04, 0.12, 0.25, 0.4, 0.55, 0.68, 0.8, 0.92, 0.97];
        bambooX.forEach((p, i) => {
            const bx = fl + fw * p;
            const h = fh * (0.6 + (i % 3) * 0.15);
            // Stalk
            ctx.fillStyle = 'rgba(60,120,60,0.18)';
            ctx.fillRect(bx - 2, fb - h, 4, h);
            // Nodes
            ctx.fillStyle = 'rgba(40,90,40,0.15)';
            for (let n = 1; n < 4; n++) {
                const ny = fb - h + n * (h / 4);
                ctx.fillRect(bx - 4, ny, 8, 3);
            }
            // Leaf tufts at top
            ctx.fillStyle = 'rgba(80,160,80,0.12)';
            ctx.beginPath();
            ctx.ellipse(bx + 8, fb - h + 5, 14, 5, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(bx - 6, fb - h + 12, 12, 4, -0.2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Grass at bottom
        ctx.fillStyle = 'rgba(60,130,60,0.08)';
        ctx.fillRect(fl, fb - 6, fw, 6);
    }

    // --- Storm: Dark clouds with lightning veins ---
    _bgStorm(ctx, fl, ft, fw, fh, fb) {
        // Storm clouds at top
        ctx.fillStyle = 'rgba(30,30,50,0.25)';
        const clouds = [0.1, 0.3, 0.55, 0.75, 0.9];
        clouds.forEach((p, i) => {
            const cx = fl + fw * p;
            const cy = ft + 15 + (i % 2) * 20;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 60 + i * 10, 18, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // Periodic lightning vein (uses time to flicker)
        const t = Date.now();
        if (t % 3000 < 100 || (t % 5000 > 2000 && t % 5000 < 2080)) {
            ctx.strokeStyle = 'rgba(255,238,100,0.25)';
            ctx.lineWidth = 2;
            const lx = fl + fw * (0.2 + (Math.floor(t / 3000) % 5) * 0.15);
            ctx.beginPath();
            ctx.moveTo(lx, ft + 5);
            ctx.lineTo(lx + 10, ft + 40);
            ctx.lineTo(lx - 5, ft + 60);
            ctx.lineTo(lx + 8, ft + 100);
            ctx.stroke();
        }

        // Dark ground
        ctx.fillStyle = 'rgba(20,20,30,0.15)';
        ctx.fillRect(fl, fb - 10, fw, 10);
    }

    // --- Earth: Rocky terrain with boulders ---
    _bgEarth(ctx, fl, ft, fw, fh, fb) {
        // Distant mesa/cliff
        ctx.fillStyle = 'rgba(80,60,35,0.2)';
        ctx.beginPath();
        ctx.moveTo(fl, fb);
        ctx.lineTo(fl, ft + 60);
        ctx.lineTo(fl + fw * 0.15, ft + 50);
        ctx.lineTo(fl + fw * 0.2, ft + 80);
        ctx.lineTo(fl + fw * 0.8, ft + 80);
        ctx.lineTo(fl + fw * 0.85, ft + 50);
        ctx.lineTo(fl + fw, ft + 60);
        ctx.lineTo(fl + fw, fb);
        ctx.closePath();
        ctx.fill();

        // Boulders scattered
        ctx.fillStyle = 'rgba(100,80,50,0.2)';
        const boulders = [[0.08, 0.8, 18], [0.3, 0.9, 14], [0.52, 0.75, 20], [0.72, 0.85, 16], [0.93, 0.7, 12]];
        boulders.forEach(([px, py, r]) => {
            ctx.beginPath();
            ctx.ellipse(fl + fw * px, ft + fh * py, r, r * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // Highlight on boulders
        ctx.fillStyle = 'rgba(150,120,70,0.08)';
        boulders.forEach(([px, py, r]) => {
            ctx.beginPath();
            ctx.ellipse(fl + fw * px - 3, ft + fh * py - 3, r * 0.5, r * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // Dirt floor
        ctx.fillStyle = 'rgba(100,75,40,0.1)';
        ctx.fillRect(fl, fb - 6, fw, 6);
    }

    // --- Shadow: Floating ruins with dark mist ---
    _bgShadow(ctx, fl, ft, fw, fh, fb) {
        // Dark fog layers
        ctx.fillStyle = 'rgba(40,15,60,0.1)';
        ctx.fillRect(fl, ft + fh * 0.2, fw, fh * 0.2);
        ctx.fillStyle = 'rgba(30,10,50,0.08)';
        ctx.fillRect(fl, ft + fh * 0.55, fw, fh * 0.2);

        // Floating ruin pillars
        ctx.fillStyle = 'rgba(60,30,80,0.2)';
        const ruins = [[0.08, 0.15, 14, 60], [0.3, 0.25, 10, 45], [0.6, 0.1, 12, 55], [0.85, 0.2, 11, 50]];
        ruins.forEach(([px, py, w, h]) => {
            const rx = fl + fw * px;
            const ry = ft + fh * py;
            ctx.fillRect(rx - w / 2, ry, w, h);
            // Cap
            ctx.fillStyle = 'rgba(80,40,110,0.15)';
            ctx.fillRect(rx - w / 2 - 3, ry, w + 6, 5);
            ctx.fillRect(rx - w / 2 - 3, ry + h - 5, w + 6, 5);
            ctx.fillStyle = 'rgba(60,30,80,0.2)';
        });

        // Eerie eye-shaped markings on ruins
        ctx.fillStyle = 'rgba(180,80,255,0.08)';
        ruins.forEach(([px, py, w, h]) => {
            const rx = fl + fw * px;
            const ry = ft + fh * py + h * 0.4;
            ctx.beginPath();
            ctx.ellipse(rx, ry, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // --- Water: Underwater look with coral and light rays ---
    _bgWater(ctx, fl, ft, fw, fh, fb) {
        // Light rays from top
        ctx.fillStyle = 'rgba(80,160,220,0.04)';
        for (let i = 0; i < 5; i++) {
            const rx = fl + fw * (0.1 + i * 0.2);
            const rw = 30 + i * 10;
            ctx.beginPath();
            ctx.moveTo(rx - 8, ft);
            ctx.lineTo(rx - rw, fb);
            ctx.lineTo(rx + rw, fb);
            ctx.lineTo(rx + 8, ft);
            ctx.closePath();
            ctx.fill();
        }

        // Coral silhouettes at bottom
        ctx.fillStyle = 'rgba(40,80,120,0.2)';
        const corals = [0.05, 0.18, 0.35, 0.55, 0.72, 0.9];
        corals.forEach((p, i) => {
            const cx = fl + fw * p;
            const h = 20 + (i % 3) * 15;
            // Branch coral shape
            ctx.beginPath();
            ctx.moveTo(cx, fb);
            ctx.lineTo(cx - 5, fb - h * 0.6);
            ctx.lineTo(cx - 12, fb - h);
            ctx.lineTo(cx - 8, fb - h + 5);
            ctx.lineTo(cx, fb - h * 0.8);
            ctx.lineTo(cx + 8, fb - h + 5);
            ctx.lineTo(cx + 12, fb - h * 0.9);
            ctx.lineTo(cx + 5, fb - h * 0.5);
            ctx.lineTo(cx, fb);
            ctx.closePath();
            ctx.fill();
        });

        // Seaweed
        ctx.strokeStyle = 'rgba(30,100,80,0.15)';
        ctx.lineWidth = 2;
        const t = Date.now() * 0.001;
        for (let i = 0; i < 6; i++) {
            const sx = fl + 50 + i * 130;
            ctx.beginPath();
            ctx.moveTo(sx, fb);
            for (let s = 1; s <= 5; s++) {
                const sy = fb - s * 12;
                const sway = Math.sin(t + i + s * 0.5) * 5;
                ctx.lineTo(sx + sway, sy);
            }
            ctx.stroke();
        }

        // Sand floor
        ctx.fillStyle = 'rgba(180,160,100,0.06)';
        ctx.fillRect(fl, fb - 5, fw, 5);
    }

    // --- Poison: Swamp with dead trees and fog ---
    _bgPoison(ctx, fl, ft, fw, fh, fb) {
        // Swamp water at bottom
        ctx.fillStyle = 'rgba(20,60,20,0.12)';
        ctx.fillRect(fl, fb - 15, fw, 15);

        // Fog layers
        ctx.fillStyle = 'rgba(40,80,30,0.05)';
        ctx.fillRect(fl, ft + fh * 0.35, fw, fh * 0.15);
        ctx.fillStyle = 'rgba(30,60,25,0.04)';
        ctx.fillRect(fl, ft + fh * 0.65, fw, fh * 0.1);

        // Dead trees
        ctx.fillStyle = 'rgba(40,30,20,0.22)';
        const trees = [0.07, 0.28, 0.52, 0.78, 0.95];
        trees.forEach((p, i) => {
            const tx = fl + fw * p;
            const h = 70 + (i % 3) * 20;
            // Trunk
            ctx.fillRect(tx - 3, fb - h, 6, h);
            // Bare branches
            ctx.strokeStyle = 'rgba(40,30,20,0.18)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tx, fb - h);
            ctx.lineTo(tx - 18, fb - h - 15);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(tx, fb - h + 15);
            ctx.lineTo(tx + 20, fb - h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(tx, fb - h + 30);
            ctx.lineTo(tx - 14, fb - h + 18);
            ctx.stroke();
        });

        // Mushroom clusters
        ctx.fillStyle = 'rgba(100,200,60,0.1)';
        const shrooms = [[0.15, 8], [0.4, 6], [0.65, 9], [0.88, 7]];
        shrooms.forEach(([p, r]) => {
            const mx = fl + fw * p;
            ctx.beginPath();
            ctx.ellipse(mx, fb - r, r, r * 0.6, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(60,40,20,0.1)';
            ctx.fillRect(mx - 2, fb - r, 4, r);
            ctx.fillStyle = 'rgba(100,200,60,0.1)';
        });
    }

    // ===== BATTLEFIELD THEMES =====
    _getTheme(affinity) {
        const themes = {
            fire:   { laneTint: 'rgba(255,60,20,0.06)', bgGrad: ['#1a1008','#2a1510'], particle: '#ff6633', particle2: '#ffaa00', ambient: 'ember', midline: '#553322' },
            ice:    { laneTint: 'rgba(100,200,255,0.06)', bgGrad: ['#0a1520','#101a2e'], particle: '#88ddff', particle2: '#ffffff', ambient: 'snow', midline: '#334466' },
            shock:  { laneTint: 'rgba(255,238,0,0.04)', bgGrad: ['#14140a','#1a1a10'], particle: '#ffee44', particle2: '#ffffff', ambient: 'spark', midline: '#444422' },
            poison: { laneTint: 'rgba(0,255,100,0.05)', bgGrad: ['#0a1a0a','#102010'], particle: '#44ff66', particle2: '#88ffaa', ambient: 'spore', midline: '#224422' },
            wind:   { laneTint: 'rgba(136,255,200,0.05)', bgGrad: ['#0a1a14','#101e18'], particle: '#aaffcc', particle2: '#ffffff', ambient: 'leaf', midline: '#225544' },
            earth:  { laneTint: 'rgba(170,120,60,0.06)', bgGrad: ['#1a1408','#201a10'], particle: '#bb8844', particle2: '#665533', ambient: 'dust', midline: '#554433' },
            shadow: { laneTint: 'rgba(155,89,182,0.06)', bgGrad: ['#100a18','#18102a'], particle: '#aa66dd', particle2: '#6622aa', ambient: 'wisp', midline: '#332244' },
            water:  { laneTint: 'rgba(52,152,219,0.06)', bgGrad: ['#0a1020','#101828'], particle: '#55aaee', particle2: '#aaddff', ambient: 'bubble', midline: '#223355' },
            avatar: { laneTint: 'rgba(255,255,255,0.04)', bgGrad: ['#0a0a14','#181828'], particle: '#ffffff', particle2: '#ffcc44', ambient: 'wisp', midline: '#444455' },
        };
        return themes[affinity] || { laneTint: 'rgba(255,255,255,0.02)', bgGrad: [CONFIG.C.BG, CONFIG.C.BG], particle: '#555', particle2: '#333', ambient: 'dust', midline: CONFIG.C.MIDLINE };
    }

    _updateAmbient(dt) {
        this.ambientTimer -= dt;
        if (this.ambientTimer <= 0) {
            this.ambientTimer = this.theme.ambient === 'snow' ? 60 : 120;
            this._spawnAmbientParticle();
        }
        // Update existing
        this.ambientParticles.forEach(p => {
            p.x += p.vx * (dt / 16);
            p.y += p.vy * (dt / 16);
            p.life -= dt;
            if (p.wobble) p.x += Math.sin(Date.now() * p.wobble) * 0.3;
        });
        this.ambientParticles = this.ambientParticles.filter(p => p.life > 0);
    }

    _spawnAmbientParticle() {
        const t = this.theme;
        const fx = CONFIG.FIELD_LEFT;
        const fw = CONFIG.FIELD_WIDTH;
        const fy = CONFIG.FIELD_TOP;
        const fh = CONFIG.FIELD_HEIGHT;
        const color = Math.random() < 0.6 ? t.particle : t.particle2;

        switch (t.ambient) {
            case 'ember': {
                this.ambientParticles.push({
                    x: fx + Math.random() * fw, y: fy + fh + 5,
                    vx: (Math.random() - 0.5) * 0.5, vy: -(0.5 + Math.random() * 1.5),
                    life: 2500 + Math.random() * 2000, maxLife: 4500,
                    size: 2 + Math.random() * 3, color, glow: true, wobble: 0.002 + Math.random() * 0.003
                });
                break;
            }
            case 'snow': {
                this.ambientParticles.push({
                    x: fx + Math.random() * fw, y: fy - 5,
                    vx: (Math.random() - 0.5) * 0.3, vy: 0.3 + Math.random() * 0.8,
                    life: 4000 + Math.random() * 3000, maxLife: 7000,
                    size: 1.5 + Math.random() * 2.5, color: '#ffffff', glow: false, wobble: 0.003 + Math.random() * 0.003
                });
                break;
            }
            case 'spark': {
                if (Math.random() < 0.3) {
                    this.ambientParticles.push({
                        x: fx + Math.random() * fw, y: fy + Math.random() * fh,
                        vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
                        life: 200 + Math.random() * 300, maxLife: 500,
                        size: 1 + Math.random() * 2, color, glow: true, spark: true
                    });
                }
                break;
            }
            case 'spore': {
                this.ambientParticles.push({
                    x: fx + Math.random() * fw, y: fy + fh * Math.random(),
                    vx: (Math.random() - 0.5) * 0.2, vy: -(0.1 + Math.random() * 0.4),
                    life: 3000 + Math.random() * 3000, maxLife: 6000,
                    size: 2 + Math.random() * 3, color, glow: true, wobble: 0.004 + Math.random() * 0.004
                });
                break;
            }
            case 'leaf': {
                this.ambientParticles.push({
                    x: fx - 10, y: fy + Math.random() * fh,
                    vx: 1 + Math.random() * 2, vy: 0.2 + Math.random() * 0.5,
                    life: 3000 + Math.random() * 2000, maxLife: 5000,
                    size: 3 + Math.random() * 3, color, glow: false, wobble: 0.005 + Math.random() * 0.005
                });
                break;
            }
            case 'dust': {
                this.ambientParticles.push({
                    x: fx + Math.random() * fw, y: fy + fh - 10,
                    vx: (Math.random() - 0.5) * 0.3, vy: -(0.1 + Math.random() * 0.5),
                    life: 2000 + Math.random() * 2000, maxLife: 4000,
                    size: 2 + Math.random() * 2, color, glow: false
                });
                break;
            }
            case 'wisp': {
                this.ambientParticles.push({
                    x: fx + Math.random() * fw, y: fy + Math.random() * fh,
                    vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
                    life: 2500 + Math.random() * 2500, maxLife: 5000,
                    size: 3 + Math.random() * 4, color, glow: true, wobble: 0.003 + Math.random() * 0.004
                });
                break;
            }
            case 'bubble': {
                this.ambientParticles.push({
                    x: fx + Math.random() * fw, y: fy + fh + 5,
                    vx: (Math.random() - 0.5) * 0.3, vy: -(0.3 + Math.random() * 0.7),
                    life: 3500 + Math.random() * 2500, maxLife: 6000,
                    size: 3 + Math.random() * 4, color, glow: false, wobble: 0.003, bubble: true
                });
                break;
            }
        }
    }

    _drawAmbientParticles(ctx) {
        this.ambientParticles.forEach(p => {
            const a = Math.max(0, p.life / p.maxLife) * 0.6;
            ctx.globalAlpha = a;

            if (p.glow) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;
            }

            ctx.fillStyle = p.color;
            if (p.bubble) {
                // Hollow circle for bubbles
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.stroke();
                // Shine dot
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.25, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.spark) {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size * 0.8;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }

            if (p.glow) ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;
    }
}
