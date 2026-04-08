// ============================================================
// entities.js - Game entities: Player, Enemy, Projectile, Summon, LaneEffect
// ============================================================

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

        // Cooldowns
        for (const key in this.cooldowns) {
            this.cooldowns[key] -= dt;
            if (this.cooldowns[key] <= 0) delete this.cooldowns[key];
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
        if (this.cooldowns[comboKey]) return false;
        // One-per-combo on screen check (for projectiles and summons)
        const spell = SPELL_DATA[comboKey];
        if (spell && (spell.type === 'projectile' || spell.type === 'summon' || spell.type === 'lane')) {
            if (this.spellOnScreen[comboKey]) return false;
        }
        return true;
    }

    startCooldown(comboKey, cdMs) {
        this.cooldowns[comboKey] = cdMs;
    }

    takeDamage(amount, effects, attacker) {
        if (this.invisible && !this.shielded) return 0; // invisible dodges (unless it's a hazard)
        if (this.shielded) {
            if (effects) effects.statusText(this.cx, this.y - 10, 'BLOCKED', CONFIG.C.SHIELD);
            return 0;
        }
        this.hp -= amount;
        this.hitFlash = 250;
        if (this.hp <= 0) this.hp = 0;
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
        };

        if (this.hitFlash > 0 && Math.floor(this.hitFlash / 40) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        Sprites.ninja(ctx, this.x, drawY, CONFIG.SPRITE, this.color, this.facing, opts);

        ctx.globalAlpha = 1;

        // Status effect overlays
        const cx = this.x + CONFIG.SPRITE / 2;
        const cy = drawY + CONFIG.SPRITE / 2;
        Sprites.statusOverlays(ctx, cx, cy, CONFIG.SPRITE, {
            burning: this.burnTimer > 0,
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

    draw(ctx) {
        if (!this.charged) {
            // Charging indicator — swirling energy gather
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
        this.hitFlash = 120;
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

    draw(ctx) {
        const size = this.twoLane ? CONFIG.SPRITE * 1.5 : CONFIG.SPRITE;
        const drawY = this.twoLane
            ? this.y - CONFIG.LANE_HEIGHT * 0.25
            : this.y;

        if (this.hitFlash > 0 && Math.floor(this.hitFlash / 30) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        if (this.freezeTimer > 0) {
            ctx.globalAlpha = 0.7;
        }

        Sprites.summon(ctx, this.x, drawY, size,
            AFFINITY_COLORS[SPELL_DATA[this.comboKey]?.affinity] || '#888',
            this.icon, this.hp / this.maxHp, this.facing);

        ctx.globalAlpha = 1;

        // Status effect overlays on summons
        const scx = this.x + size / 2;
        const scy = drawY + size / 2;
        Sprites.statusOverlays(ctx, scx, scy, size, {
            burning: this.burnTimer > 0,
            frozen: this.freezeTimer > 0,
            stunned: this.stunTimer > 0,
        });
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
    constructor(lane, side, type, duration, stats, owner) {
        this.lane = lane;
        this.side = side;    // 'enemy' half or 'player' half
        this.type = type;    // 'burn', 'freeze'
        this.duration = duration;
        this.maxDuration = duration;
        this.stats = stats;
        this.owner = owner;
        this.tickTimer = stats.tickRate || 500;
        this.alive = true;
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

    draw(ctx) {
        const laneY = CONFIG.FIELD_TOP + this.lane * CONFIG.LANE_HEIGHT;
        const laneH = CONFIG.LANE_HEIGHT;
        let x, w;
        if (this.side === 'enemy') {
            x = CONFIG.MIDPOINT;
            w = CONFIG.FIELD_RIGHT - CONFIG.MIDPOINT;
        } else {
            x = CONFIG.FIELD_LEFT;
            w = CONFIG.MIDPOINT - CONFIG.FIELD_LEFT;
        }
        const t = Date.now();
        if (this.type === 'burn') {
            Sprites.laneFlames(ctx, x, laneY, w, laneH, t);
        } else if (this.type === 'freeze') {
            Sprites.laneFrost(ctx, x, laneY, w, laneH, t);
        }
    }
}
