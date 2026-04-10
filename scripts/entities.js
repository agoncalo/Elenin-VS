// ============================================================
// entities.js - Game entities: Player, Enemy, Projectile, Summon, LaneEffect
// ============================================================

// Shared offscreen canvas for white-flash effect
const _flashCanvas = document.createElement('canvas');
const _flashCtx = _flashCanvas.getContext('2d');

function _drawWhiteFlash(ctx, drawFn, x, y, w, h, flashAlpha) {
    // Ensure offscreen canvas is big enough
    if (_flashCanvas.width < w + 4 || _flashCanvas.height < h + 4) {
        _flashCanvas.width = Math.max(_flashCanvas.width, w + 4);
        _flashCanvas.height = Math.max(_flashCanvas.height, h + 4);
    }
    _flashCtx.clearRect(0, 0, _flashCanvas.width, _flashCanvas.height);
    _flashCtx.save();
    _flashCtx.translate(-x, -y);
    drawFn(_flashCtx);
    _flashCtx.restore();
    // Fill white only on drawn pixels (source-atop)
    _flashCtx.globalCompositeOperation = 'source-atop';
    _flashCtx.fillStyle = '#ffffff';
    _flashCtx.fillRect(0, 0, _flashCanvas.width, _flashCanvas.height);
    _flashCtx.globalCompositeOperation = 'source-over';
    // Stamp the white silhouette onto the main canvas
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.drawImage(_flashCanvas, 0, 0, w + 4, h + 4, x, y, w + 4, h + 4);
    ctx.restore();
}

function _drawColorFlash(ctx, drawFn, x, y, w, h, flashAlpha, color) {
    if (_flashCanvas.width < w + 4 || _flashCanvas.height < h + 4) {
        _flashCanvas.width = Math.max(_flashCanvas.width, w + 4);
        _flashCanvas.height = Math.max(_flashCanvas.height, h + 4);
    }
    _flashCtx.clearRect(0, 0, _flashCanvas.width, _flashCanvas.height);
    _flashCtx.save();
    _flashCtx.translate(-x, -y);
    drawFn(_flashCtx);
    _flashCtx.restore();
    _flashCtx.globalCompositeOperation = 'source-atop';
    _flashCtx.fillStyle = color;
    _flashCtx.fillRect(0, 0, _flashCanvas.width, _flashCanvas.height);
    _flashCtx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.drawImage(_flashCanvas, 0, 0, w + 4, h + 4, x, y, w + 4, h + 4);
    ctx.restore();
}

// ---- Base Entity ----
class Entity {
    constructor(x, lane, owner) {
        this.x = x;
        this.lane = lane;
        this.owner = owner; // 'player' | 'enemy'
        this.alive = true;
        this.stunTimer = 0;
        this.freezeTimer = 0;
        this.burnTimer = 0;
        this.burnDmg = 0;
        this.burnTick = 0;
        this.poisonTimer = 0;
        this.poisonDmg = 0;
        this.poisonTick = 0;
    }
    get y() {
        return CONFIG.FIELD_TOP + this.lane * CONFIG.LANE_HEIGHT + CONFIG.LANE_HEIGHT / 2 - CONFIG.SPRITE / 2;
    }
    get cy() { return this.y + CONFIG.SPRITE / 2; }
    get cx() { return this.x + CONFIG.SPRITE / 2; }
    isStunned() { return this.stunTimer > 0 || this.freezeTimer > 0; }
}

// ---- Fighter (Player or Enemy Ninja) ----
class Fighter extends Entity {
    constructor(x, lane, owner, maxHp, maxLoyalty) {
        super(x, lane, owner);
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.maxLoyalty = maxLoyalty;
        this.loyalty = maxLoyalty;
        this.speed = CONFIG.PLAYER_SPEED;
        this.facing = owner === 'player' ? 'right' : 'left';
        this.laneSwitching = 0;   // ms remaining in lane switch
        this.targetLane = lane;
        this.enchant = null;      // { type: 'fire'|'ice'|'shock', timer, stats }
        this.shielded = false;
        this.shieldTimer = 0;
        this.invisible = false;
        this.invisTimer = 0;
        this.deflecting = false;
        this.deflectHits = 0;
        this.cooldowns = {};      // { comboKey: remainingMs }
        this.spellOnScreen = {};  // { comboKey: true } - limits one per combo
        this.color = owner === 'player' ? CONFIG.C.PLAYER : CONFIG.C.ENEMY;
        this.hitFlash = 0;
        this.parryFlash = 0;
        // Trailing bar values (for damage ghost effect)
        this.trailHp = maxHp;
        this.trailLoyalty = maxLoyalty;
        this.loyHitFlash = 0; // flash timer when loyalty is hit

        // Stamina system
        this.stamina = CONFIG.STAMINA_MAX;
        this.maxStamina = CONFIG.STAMINA_MAX;
        this.staminaRegen = null;    // custom regen rate (null = use default)
        this.staminaRegenDelay = 0;  // ms remaining before regen resumes

        // Blocking (retreat = guard)
        this.blocking = false;
        this.blockLocked = false; // true when blocking an immediate threat (no movement)

        // Parry (Third Strike style — tap forward at the right moment)
        this.parryWindow = 0;    // ms remaining in parry window after tapping forward
        this.parrySuccess = false; // set true when a parry lands (read by combat loop)

        // Pushback velocity (pixels/frame, decays each frame)
        this.pushbackVel = 0;
    }

    update(dt) {
        // Lane switching animation
        if (this.laneSwitching > 0) {
            this.laneSwitching -= dt;
            if (this.laneSwitching <= 0) {
                this.lane = this.targetLane;
                this.laneSwitching = 0;
            }
        }

        // Status timers
        if (this.stunTimer > 0) this.stunTimer -= dt;
        if (this.freezeTimer > 0) this.freezeTimer -= dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;
        if (this.loyHitFlash > 0) this.loyHitFlash -= dt;
        if (this.parryFlash > 0) this.parryFlash -= dt;

        // Trailing bars — hold 400ms then decay fast
        if (this.trailHp > this.hp) {
            if (this.hitFlash > 0) { /* hold while flashing */ }
            else {
                this.trailHp -= dt * 0.02;
                if (this.trailHp < this.hp) this.trailHp = this.hp;
            }
        } else { this.trailHp = this.hp; }

        if (this.trailLoyalty > this.loyalty) {
            if (this.loyHitFlash > 0) { /* hold while flashing */ }
            else {
                this.trailLoyalty -= dt * 0.02;
                if (this.trailLoyalty < this.loyalty) this.trailLoyalty = this.loyalty;
            }
        } else { this.trailLoyalty = this.loyalty; }

        // Burn DoT
        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.burnTick -= dt;
            if (this.burnTick <= 0) {
                this.burnTick = 500;
                this.hp -= this.burnDmg;
                if (this.hp <= 0) this.hp = 0;
            }
        }

        // Poison DoT
        if (this.poisonTimer > 0) {
            this.poisonTimer -= dt;
            this.poisonTick -= dt;
            if (this.poisonTick <= 0) {
                this.poisonTick = 500;
                this.hp -= this.poisonDmg;
                if (this.hp <= 0) this.hp = 0;
            }
        }

        // Enchant timer
        if (this.enchant) {
            this.enchant.timer -= dt;
            if (this.enchant.timer <= 0) this.enchant = null;
        }

        // Shield timer
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) this.shielded = false;
        }

        // Invis timer
        if (this.invisTimer > 0) {
            this.invisTimer -= dt;
            if (this.invisTimer <= 0) this.invisible = false;
        }

        // Stamina regen
        if (this.staminaRegenDelay > 0) {
            this.staminaRegenDelay -= dt;
        } else if (this.stamina < this.maxStamina) {
            const defaultRate = this.owner === 'enemy' ? CONFIG.AI_STAMINA_REGEN : CONFIG.STAMINA_REGEN;
            const rate = this.staminaRegen || defaultRate;
            this.stamina = Math.min(this.maxStamina, this.stamina + rate * dt / 1000);
        }

        // Parry window decay
        if (this.parryWindow > 0) this.parryWindow -= dt;

        // Pushback slide
        if (this.pushbackVel !== 0) {
            this.x += this.pushbackVel * (dt / 16);
            // Clamp to field boundaries
            if (this.owner === 'player') {
                this.x = Math.max(CONFIG.FIELD_LEFT + 5, Math.min(CONFIG.MIDPOINT - CONFIG.SPRITE - 5, this.x));
            } else {
                this.x = Math.max(CONFIG.MIDPOINT + 10, Math.min(CONFIG.FIELD_RIGHT - CONFIG.SPRITE - 10, this.x));
            }
            // Decay toward zero with friction
            this.pushbackVel *= 0.85;
            if (Math.abs(this.pushbackVel) < 0.1) this.pushbackVel = 0;
        }
    }

    switchLane(dir) {
        if (this.laneSwitching > 0) return;
        if (this.isStunned()) return;
        const newLane = this.lane + dir;
        if (newLane < 0 || newLane >= CONFIG.LANE_COUNT) return;
        this.targetLane = newLane;
        this.laneSwitching = CONFIG.LANE_SWITCH_TIME;
    }

    canCast(comboKey) {
        if (this.isStunned()) return false;
        return true;
    }

    startCooldown(comboKey, cdMs) {
        this.cooldowns[comboKey] = cdMs;
    }

    spendStamina(amount) {
        this.stamina -= amount;
        if (this.stamina < 0) this.stamina = 0;
        this.staminaRegenDelay = CONFIG.STAMINA_REGEN_DELAY;
    }

    hasStamina(amount) {
        return this.stamina >= amount;
    }

    takeDamage(amount, effects, attacker) {
        if (this.invisible && !this.shielded) return 0; // invisible dodges (unless it's a hazard)
        if (this.shielded) {
            if (effects) effects.statusText(this.cx, this.y - 10, 'BLOCKED', CONFIG.C.SHIELD);
            return 0;
        }
        // Parry — Third Strike style: tap forward negates ALL damage
        if (this.parryWindow > 0 && this.owner === 'player') {
            this.parryWindow = 0;
            this.parrySuccess = true;
            return 0; // combat.js reads parrySuccess and triggers effects
        }
        // Blocking reduces damage and costs stamina
        if (this.blocking && this.stamina > 0) {
            const reduced = Math.max(1, Math.ceil(amount * (1 - CONFIG.BLOCK_REDUCTION)));
            this.spendStamina(CONFIG.BLOCK_STAMINA_COST);
            this.hp -= reduced;
            this.hitFlash = 400;
            if (this.hp <= 0) this.hp = 0;
            if (effects) {
                effects.statusText(this.cx, this.y - 10, 'GUARD', '#88ccff');
                effects.shake(60, 2);
            }
            return reduced;
        }
        this.hp -= amount;
        this.hitFlash = 1000;
        if (this.hp <= 0) this.hp = 0;
        // trailHp stays high — it will decay in update()
        if (effects) {
            effects.hit(this.cx, this.cy, amount >= 3 ? '#ffaa00' : '#ff4444');
            effects.damageNumber(this.cx, this.y, amount);
            effects.shake(150 + amount * 30, Math.min(12, amount * 2 + 2));
            // Extra burst on big hits
            if (amount >= 4) {
                effects.burst(this.cx, this.cy, '#ffcc00', 10, 5, 500, 5);
                effects.statusText(this.cx, this.y - 30, 'BIG HIT!', '#ffcc00');
            }
        }
        return amount;
    }

    drawLane(ctx) {
        // Draw with lane-switch interpolation
        let drawY;
        if (this.laneSwitching > 0) {
            const progress = 1 - this.laneSwitching / CONFIG.LANE_SWITCH_TIME;
            const fromY = CONFIG.FIELD_TOP + this.lane * CONFIG.LANE_HEIGHT + CONFIG.LANE_HEIGHT / 2 - CONFIG.SPRITE / 2;
            const toY = CONFIG.FIELD_TOP + this.targetLane * CONFIG.LANE_HEIGHT + CONFIG.LANE_HEIGHT / 2 - CONFIG.SPRITE / 2;
            drawY = fromY + (toY - fromY) * progress;
        } else {
            drawY = this.y;
        }

        const opts = {
            headbandColor: this.owner === 'player' ? '#fff' : '#ff4444',
            face: this.skin ? this.skin.face : (this.owner === 'enemy' ? 'angry' : 'smile'),
            shielded: this.shielded,
            invisible: this.invisible,
            enchant: this.enchant ? this.enchant.type : null,
            skin: this.skin || null,
            eyesClosed: this._eyesClosed || false,
        };

        Sprites.ninja(ctx, this.x, drawY, CONFIG.SPRITE, this.color, this.facing, opts);

        // White flash overlay when hit — draws white silhouette of the sprite
        if (this.hitFlash > 0) {
            const pulse = Math.floor(this.hitFlash / 80) % 2 === 0 ? 1 : 0.2;
            const flashAlpha = Math.min(0.85, this.hitFlash / 1000) * pulse;
            const self = this;
            _drawWhiteFlash(ctx, (offCtx) => {
                Sprites.ninja(offCtx, self.x, drawY, CONFIG.SPRITE, self.color, self.facing, opts);
            }, this.x, drawY, CONFIG.SPRITE, CONFIG.SPRITE, flashAlpha);
        }

        // Blue flash overlay on parry — draws blue silhouette
        if (this.parryFlash > 0) {
            const pAlpha = Math.min(0.9, this.parryFlash / 300);
            const self = this;
            _drawColorFlash(ctx, (offCtx) => {
                Sprites.ninja(offCtx, self.x, drawY, CONFIG.SPRITE, self.color, self.facing, opts);
            }, this.x, drawY, CONFIG.SPRITE, CONFIG.SPRITE, pAlpha, '#44bbff');
        }

        ctx.globalAlpha = 1;

        // Status effect overlays
        const cx = this.x + CONFIG.SPRITE / 2;
        const cy = drawY + CONFIG.SPRITE / 2;
        Sprites.statusOverlays(ctx, cx, cy, CONFIG.SPRITE, {
            burning: this.burnTimer > 0,
            poisoned: this.poisonTimer > 0,
            frozen: this.freezeTimer > 0,
            stunned: this.stunTimer > 0,
        });
    }
}

// ---- Projectile ----
class Projectile extends Entity {
    constructor(x, lane, owner, comboKey, level, stats, facing) {
        super(x, lane, owner);
        this.comboKey = comboKey;
        this.level = level;
        this.stats = stats;
        this.speed = stats.speed || 5;
        this.dmg = stats.dmg || 1;
        this.facing = facing || (owner === 'player' ? 'right' : 'left');
        this.dirX = this.facing === 'right' ? 1 : -1;
        this.age = 0;
        this.pierced = false;
        this.isCloud = (comboKey === 'XZC');
        this.isPiercing = !!stats.pierce || this.isCloud;
        this.hitTargets = new Set(); // track what this projectile already hit (for piercing)
        this.isBoulder = (comboKey === 'XXC');
        this.width = stats.areaW || 16;
        this.rotation = 0;

        // Static spin shuriken
        this.isStatic = stats.special === 'static_spin';
        this.staticTimer = stats.duration || 0;
        this.tickTimer = stats.tickRate || 400;
        this.tickCurrent = 0;
        this.hitSomething = false; // track if it connected with anything

        // Charge delay
        this.chargeTime = stats.chargeTime || 0;
        this.maxChargeTime = this.chargeTime;
        this.charged = this.chargeTime <= 0;
    }

    update(dt) {
        this.age += dt;
        this.rotation += dt * 0.01;

        if (!this.charged) {
            this.chargeTime -= dt;
            if (this.chargeTime <= 0) this.charged = true;
            return;
        }

        if (this.isStatic) {
            this.staticTimer -= dt;
            this.tickCurrent -= dt;
            if (this.staticTimer <= 0) this.alive = false;
        } else {
            this.x += this.speed * this.dirX * (dt / 16);
        }

        if (this.x < CONFIG.FIELD_LEFT - 20 || this.x > CONFIG.FIELD_RIGHT + 20) {
            this.alive = false;
        }
    }

    drawBowCharge(ctx) {
        if (this.comboKey !== 'ZZC' || this.charged || this.maxChargeTime <= 0) return;
        const progress = 1 - this.chargeTime / this.maxChargeTime;
        const dir = this.dirX;
        const bx = this.cx;
        const by = this.cy;
        ctx.save();

        // Bow arc — tall longbow
        const bowH = 30;
        ctx.globalAlpha = 0.6 + progress * 0.4;
        ctx.strokeStyle = '#aa7744';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (dir > 0) {
            ctx.arc(bx + dir * 4, by, bowH, -Math.PI * 0.45, Math.PI * 0.45);
        } else {
            ctx.arc(bx + dir * 4, by, bowH, Math.PI * 0.55, -Math.PI * 0.55);
        }
        ctx.stroke();
        // Limb tips
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#997744';
        const tipLen = 4;
        for (const sign of [-1, 1]) {
            const tipAngle = dir > 0 ? sign * Math.PI * 0.45 : Math.PI + sign * Math.PI * 0.45;
            const tx = bx + dir * 4 + Math.cos(tipAngle) * bowH;
            const ty = by + Math.sin(tipAngle) * bowH;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + dir * tipLen, ty + sign * tipLen);
            ctx.stroke();
        }

        // Bowstring — pulls back with progress
        const stringPull = progress * 14;
        ctx.strokeStyle = '#ccccaa';
        ctx.lineWidth = 1;
        const topAngle = dir > 0 ? -Math.PI * 0.45 : Math.PI + Math.PI * 0.45;
        const botAngle = dir > 0 ? Math.PI * 0.45 : Math.PI - Math.PI * 0.45;
        ctx.beginPath();
        ctx.moveTo(bx + dir * 4 + Math.cos(topAngle) * bowH, by + Math.sin(topAngle) * bowH);
        ctx.lineTo(bx - dir * stringPull, by);
        ctx.lineTo(bx + dir * 4 + Math.cos(botAngle) * bowH, by + Math.sin(botAngle) * bowH);
        ctx.stroke();

        // Arrow on string — longer shaft
        const arrowLen = 20;
        const ax = bx - dir * stringPull;
        ctx.strokeStyle = '#ddddcc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax, by);
        ctx.lineTo(ax + dir * arrowLen, by);
        ctx.stroke();
        // Fletching
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ax + dir * 2, by - 3);
        ctx.lineTo(ax, by);
        ctx.lineTo(ax + dir * 2, by + 3);
        ctx.stroke();
        // Arrowhead
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(ax + dir * arrowLen, by);
        ctx.lineTo(ax + dir * (arrowLen - 5), by - 3.5);
        ctx.lineTo(ax + dir * (arrowLen - 5), by + 3.5);
        ctx.closePath();
        ctx.fill();

        // Tension glow at full draw
        if (progress > 0.7) {
            const glow = (progress - 0.7) / 0.3;
            ctx.globalAlpha = glow * 0.4;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(ax + dir * arrowLen, by, 3 + glow * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    draw(ctx) {
        if (!this.charged) {
            if (this.comboKey === 'ZZC' && this.maxChargeTime > 0) {
                // Bow draw rendered on top layer via combat.js
                return;
            }

            // Generic charging indicator — swirling energy gather
            const t = this.age;
            ctx.save();
            for (let i = 0; i < 4; i++) {
                const angle = t / 80 + i * Math.PI / 2;
                const dist = 10 + Math.sin(t / 60 + i) * 3;
                const sx = this.cx + Math.cos(angle) * dist;
                const sy = this.cy + Math.sin(angle) * dist;
                ctx.globalAlpha = 0.3 + Math.sin(t / 100 + i) * 0.2;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            // Central pulse
            const pulse = 4 + Math.sin(t / 80) * 2;
            ctx.globalAlpha = 0.3 + Math.sin(t / 100) * 0.2;
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(this.cx, this.cy, pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        const spell = SPELL_DATA[this.comboKey];
        const px = this.x + 8;
        const py = this.cy;

        switch (spell?.icon) {
            case 'shuriken':
                Sprites.shuriken(ctx, px, py, this.isStatic ? 14 : 10, this.rotation);
                if (this.isStatic) {
                    // Spinning energy field
                    ctx.save();
                    ctx.globalAlpha = 0.2 + Math.sin(this.age / 100) * 0.1;
                    ctx.strokeStyle = '#aaddff';
                    ctx.shadowColor = '#88bbff';
                    ctx.shadowBlur = 8;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(px, py, 18, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
                break;
            case 'arrow':
                Sprites.arrow(ctx, px, py, 12, this.facing);
                break;
            case 'fireball':
                Sprites.fireball(ctx, px, py, 12);
                break;
            case 'iceshard':
                Sprites.iceShard(ctx, px, py, 10);
                break;
            case 'poison':
                Sprites.poisonCloud(ctx, px, py, this.width / 2, 0.5);
                break;
            case 'boulder':
                Sprites.boulder(ctx, px, py, 16);
                break;
            default: {
                // Generic projectile with glow
                const col = AFFINITY_COLORS[spell?.affinity] || '#fff';
                ctx.save();
                ctx.shadowColor = col;
                ctx.shadowBlur = 10;
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, Math.PI * 2);
                ctx.fill();
                // White hot center
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    canTickDamage() {
        if (!this.isStatic && !this.isCloud) return false;
        if (this.tickCurrent <= 0) {
            this.tickCurrent = this.stats.tickRate || 400;
            return true;
        }
        return false;
    }
}

// ---- Summon ----
class Summon extends Entity {
    constructor(x, lane, owner, comboKey, level, stats) {
        super(x, lane, owner);
        this.comboKey = comboKey;
        this.level = level;
        this.stats = stats;
        this.hp = stats.hp;
        this.maxHp = stats.hp;
        this.dmg = stats.dmg || 0;
        this.atkRate = stats.atkRate || 2500;
        this.atkTimer = this.atkRate;
        this.twoLane = stats.twoLane || false;
        this.loyaltyVal = stats.loyaltyVal || 2;
        this.facing = owner === 'player' ? 'right' : 'left';
        this.icon = SPELL_DATA[comboKey]?.icon || 'blocky';

        // Special abilities
        this.healAmt = stats.healAmt || 0;
        this.healRate = stats.healRate || 0;
        this.healTimer = this.healRate;
        this.deflectChance = stats.deflectChance || 0;
        this.breathDmg = stats.breathDmg || 0;
        this.breathDur = stats.breathDur || 0;
        this.freezeDur = stats.freezeDur || 0;
        this.stunDur = stats.stunDur || 0;
        this.burnDmg = stats.burnDmg || 0;
        this.burnDur = stats.burnDur || 0;

        // Hydra
        this.headsLeft = stats.heads || 0;
        this.isHydra = comboKey === 'CXX';

        this.hitFlash = 0;
    }

    update(dt) {
        if (this.stunTimer > 0) this.stunTimer -= dt;
        if (this.freezeTimer > 0) this.freezeTimer -= dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;

        // Burn DoT
        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.burnTick -= dt;
            if (this.burnTick <= 0) {
                this.burnTick = 500;
                this.hp -= this.burnDmg;
                if (this.hp <= 0) this.hp = 0;
            }
        }

        // Poison DoT
        if (this.poisonTimer > 0) {
            this.poisonTimer -= dt;
            this.poisonTick -= dt;
            if (this.poisonTick <= 0) {
                this.poisonTick = 500;
                this.hp -= this.poisonDmg;
                if (this.hp <= 0) this.hp = 0;
            }
        }

        if (!this.isStunned()) {
            this.atkTimer -= dt;
            if (this.healRate > 0) this.healTimer -= dt;
        }
    }

    canAttack() {
        if (this.isStunned()) return false;
        if (this.dmg <= 0 && !this.breathDmg) return false;
        if (this.atkTimer <= 0) {
            this.atkTimer = this.atkRate;
            return true;
        }
        return false;
    }

    canHeal() {
        if (this.healAmt <= 0) return false;
        if (this.healTimer <= 0) {
            this.healTimer = this.healRate;
            return true;
        }
        return false;
    }

    takeDamage(amount, effects) {
        this.hp -= amount;
        this.hitFlash = 1000;
        if (effects) effects.hit(this.cx, this.cy, '#ff8844');
        if (this.hp <= 0) {
            // Hydra respawn
            if (this.isHydra && this.headsLeft > 0) {
                this.headsLeft--;
                this.hp = this.maxHp;
                if (effects) effects.statusText(this.cx, this.y, 'REGROW!', '#88ff88');
                return 'regrow'; // not dead, but costs loyalty
            }
            this.alive = false;
            if (effects) {
                effects.burst(this.cx, this.cy, '#ffaa00', 10, 3, 400, 4);
            }
            return true; // dead
        }
        return false;
    }

    draw(ctx, sideState) {
        const size = this.twoLane ? CONFIG.SPRITE * 1.5 : CONFIG.SPRITE;
        const drawY = this.twoLane
            ? this.y - CONFIG.LANE_HEIGHT * 0.25
            : this.y;

        if (this.freezeTimer > 0) {
            ctx.globalAlpha = 0.7;
        }
        // Side-wide invisibility
        if (sideState && sideState.invisible) {
            ctx.globalAlpha = 0.3;
        }

        // Healing aura (green glow clipped to lane) for healer summons
        if (this.healAmt > 0) {
            const acx = this.x + size / 2;
            const acy = drawY + size / 2;
            const healRadius = 200;
            const ht = Date.now();
            const hpulse = 0.5 + Math.sin(ht / 600) * 0.15;

            // Clip to the summon's lane bounds
            const laneY = CONFIG.FIELD_TOP + this.lane * CONFIG.LANE_HEIGHT;
            const laneH = CONFIG.LANE_HEIGHT;
            ctx.save();
            ctx.beginPath();
            ctx.rect(CONFIG.FIELD_LEFT, laneY, CONFIG.FIELD_WIDTH, laneH);
            ctx.clip();

            // Subtle green fill
            ctx.globalAlpha = 0.04 + hpulse * 0.025;
            ctx.fillStyle = CONFIG.C.HEAL;
            ctx.beginPath();
            ctx.arc(acx, acy, healRadius, 0, Math.PI * 2);
            ctx.fill();

            // Green ring
            ctx.globalAlpha = 0.12 + hpulse * 0.1;
            ctx.strokeStyle = CONFIG.C.HEAL;
            ctx.shadowColor = CONFIG.C.HEAL;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(acx, acy, healRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Small orbiting heal sparkles
            ctx.fillStyle = CONFIG.C.HEAL;
            ctx.shadowBlur = 6;
            for (let i = 0; i < 5; i++) {
                const ha = (i / 5) * Math.PI * 2 + ht / 1200;
                const hd = healRadius * (0.6 + Math.sin(ht / 800 + i) * 0.2);
                ctx.globalAlpha = 0.2 + hpulse * 0.2;
                ctx.beginPath();
                ctx.arc(acx + Math.cos(ha) * hd, acy + Math.sin(ha) * hd, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.shadowBlur = 0;
            ctx.restore();
        }

        const summonColor = AFFINITY_COLORS[SPELL_DATA[this.comboKey]?.affinity] || '#888';
        Sprites.summon(ctx, this.x, drawY, size,
            summonColor, this.icon, this.hp / this.maxHp, this.facing);

        // White flash overlay when hit — draws white silhouette of the sprite
        if (this.hitFlash > 0) {
            const pulse = Math.floor(this.hitFlash / 80) % 2 === 0 ? 1 : 0.2;
            const flashAlpha = Math.min(0.85, this.hitFlash / 1000) * pulse;
            const self = this;
            _drawWhiteFlash(ctx, (offCtx) => {
                Sprites.summon(offCtx, self.x, drawY, size, summonColor, self.icon, self.hp / self.maxHp, self.facing);
            }, this.x, drawY, Math.ceil(size), Math.ceil(size), flashAlpha);
        }

        ctx.globalAlpha = 1;

        const scx = this.x + size / 2;
        const scy = drawY + size / 2;

        // Side-wide shield glow
        if (sideState && sideState.shielded) {
            const hs = size / 2;
            ctx.strokeStyle = CONFIG.C.SHIELD;
            ctx.lineWidth = 2;
            const prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = (0.4 + Math.sin(Date.now() / 150) * 0.25) * prevAlpha;
            ctx.beginPath();
            ctx.arc(scx, scy, hs + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = prevAlpha;
        }

        // Side-wide enchant glow
        if (sideState && sideState.enchant) {
            const ec = AFFINITY_COLORS[sideState.enchant] || '#fff';
            const hs = size / 2;
            ctx.save();
            ctx.shadowColor = ec;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = ec;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(scx, scy, hs + 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Status effect overlays on summons
        Sprites.statusOverlays(ctx, scx, scy, size, {
            burning: this.burnTimer > 0,
            poisoned: this.poisonTimer > 0,
            frozen: this.freezeTimer > 0,
            stunned: this.stunTimer > 0,
        });

        // Combo label below summon
        const label = this.comboKey.split('').join('-');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = '700 10px ' + CONFIG.FONT;
        ctx.textAlign = 'center';
        ctx.fillText(label, scx, drawY + size + 11);
        ctx.fillStyle = '#ddeeff';
        ctx.fillText(label, scx, drawY + size + 10);
    }

    getLanes() {
        if (this.twoLane) {
            const lanes = [this.lane];
            if (this.lane > 0) lanes.push(this.lane - 1);
            else if (this.lane < CONFIG.LANE_COUNT - 1) lanes.push(this.lane + 1);
            return lanes;
        }
        return [this.lane];
    }
}

// ---- Lane Effect ----
class LaneEffect {
    constructor(lane, side, type, duration, stats, owner, orientation, centerX) {
        this.lane = lane;
        this.side = side;         // 'enemy' half or 'player' half
        this.type = type;         // 'burn', 'freeze', 'shock'
        this.duration = duration;
        this.maxDuration = duration;
        this.stats = stats;
        this.owner = owner;
        this.orientation = orientation || 'horizontal'; // 'horizontal' | 'vertical'
        this.centerX = centerX || 0;  // X center for vertical lane effects
        this.stripWidth = 80;         // width of the vertical strip
        this.tickTimer = stats.tickRate || 500;
        this.alive = true;
        this.instantApplied = false;  // for instant (shock) effects — apply once
        this.comboKey = null;         // set after construction for cleanup
    }

    update(dt) {
        this.duration -= dt;
        this.tickTimer -= dt;
        if (this.duration <= 0) this.alive = false;
    }

    canTick() {
        if (this.tickTimer <= 0) {
            this.tickTimer = this.stats.tickRate || 500;
            return true;
        }
        return false;
    }

    // Get the X region this effect covers
    getXBounds() {
        if (this.orientation === 'vertical') {
            return { x: this.centerX - this.stripWidth / 2, w: this.stripWidth };
        }
        if (this.side === 'enemy') {
            return { x: CONFIG.MIDPOINT, w: CONFIG.FIELD_RIGHT - CONFIG.MIDPOINT };
        }
        return { x: CONFIG.FIELD_LEFT, w: CONFIG.MIDPOINT - CONFIG.FIELD_LEFT };
    }

    draw(ctx) {
        const t = Date.now();
        if (this.orientation === 'vertical') {
            const bounds = this.getXBounds();
            const x = bounds.x;
            const w = bounds.w;
            const y = CONFIG.FIELD_TOP;
            const h = CONFIG.FIELD_HEIGHT;
            if (this.type === 'burn') {
                Sprites.laneFlames(ctx, x, y, w, h, t);
            } else if (this.type === 'freeze') {
                Sprites.laneFrost(ctx, x, y, w, h, t);
            } else if (this.type === 'shock') {
                Sprites.laneShock(ctx, x, y, w, h, t, this.duration / this.maxDuration);
            }
        } else {
            const laneY = CONFIG.FIELD_TOP + this.lane * CONFIG.LANE_HEIGHT;
            const laneH = CONFIG.LANE_HEIGHT;
            const bounds = this.getXBounds();
            if (this.type === 'burn') {
                Sprites.laneFlames(ctx, bounds.x, laneY, bounds.w, laneH, t);
            } else if (this.type === 'freeze') {
                Sprites.laneFrost(ctx, bounds.x, laneY, bounds.w, laneH, t);
            } else if (this.type === 'shock') {
                Sprites.laneShock(ctx, bounds.x, laneY, bounds.w, laneH, t, this.duration / this.maxDuration);
            }
        }
    }
}
