// ============================================================
// effects.js - Particle system and visual effects
// ============================================================
class Particle {
    constructor(x, y, vx, vy, life, color, size, opts) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.life = life; this.maxLife = life;
        this.color = color; this.size = size;
        this.round = opts && opts.round;
        this.glow = opts && opts.glow;
        this.noGravity = opts && opts.noGravity;
        this.fadeSize = opts && opts.fadeSize;
        this.spark = opts && opts.spark;
    }
    update(dt) {
        const t = dt / 16;
        this.x += this.vx * t;
        this.y += this.vy * t;
        if (!this.noGravity) this.vy += 0.1 * t;
        this.life -= dt;
    }
    draw(ctx) {
        const a = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = this.color;

        const sz = this.fadeSize ? this.size * a : this.size;

        if (this.glow) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
        }

        if (this.round) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, sz / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.spark) {
            // Elongated spark in direction of velocity
            const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (len > 0.1) {
                ctx.strokeStyle = this.color;
                ctx.lineWidth = sz * 0.7;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.vx * 2, this.y - this.vy * 2);
                ctx.stroke();
            } else {
                ctx.fillRect(this.x - sz / 2, this.y - sz / 2, sz, sz);
            }
        } else {
            ctx.fillRect(this.x - sz / 2, this.y - sz / 2, sz, sz);
        }

        if (this.glow) ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
    get dead() { return this.life <= 0; }
}

class EffectsManager {
    constructor() {
        this.particles = [];
        this.flashes = [];       // { x, y, r, life, maxLife, color }
        this.shakes = [];        // { duration, magnitude, elapsed }
        this.texts = [];         // { x, y, text, life, maxLife, color, vy }
    }

    update(dt) {
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => !p.dead);

        this.flashes.forEach(f => { f.life -= dt; });
        this.flashes = this.flashes.filter(f => f.life > 0);

        this.shakes.forEach(s => { s.elapsed += dt; });
        this.shakes = this.shakes.filter(s => s.elapsed < s.duration);

        this.texts.forEach(t => {
            t.life -= dt;
            t.y += t.vy * (dt / 16);
        });
        this.texts = this.texts.filter(t => t.life > 0);
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));

        this.flashes.forEach(f => {
            const a = f.life / f.maxLife;
            const expand = 1 + (1 - a) * 0.8;
            // Outer ring
            ctx.globalAlpha = a * 0.3;
            ctx.strokeStyle = f.color;
            ctx.lineWidth = 3 * a;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r * expand * 1.3, 0, Math.PI * 2);
            ctx.stroke();
            // Inner glow
            ctx.globalAlpha = a * 0.5;
            ctx.fillStyle = f.color;
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 12 * a;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r * expand * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        });

        this.texts.forEach(t => {
            const a = Math.max(0, t.life / t.maxLife);
            ctx.globalAlpha = a;
            ctx.fillStyle = t.color;
            ctx.font = (t.big ? '800 18px' : '600 14px') + ' ' + CONFIG.FONT;
            ctx.textAlign = 'center';
            ctx.fillText(t.text, t.x, t.y);
            ctx.globalAlpha = 1;
        });
    }

    getShakeOffset() {
        let ox = 0, oy = 0;
        this.shakes.forEach(s => {
            const prog = 1 - s.elapsed / s.duration;
            const mag = s.magnitude * prog;
            ox += (Math.random() - 0.5) * mag * 2;
            oy += (Math.random() - 0.5) * mag * 2;
        });
        return { x: ox, y: oy };
    }

    // Spawn helpers
    burst(x, y, color, count, speed, life, size, opts) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (0.5 + Math.random()) * speed;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * spd, Math.sin(angle) * spd,
                life + Math.random() * life * 0.5,
                color, size || (2 + Math.random() * 3),
                opts
            ));
        }
    }

    hit(x, y, color) {
        // Intense impact burst — round glowing particles
        this.burst(x, y, color || '#fff', 14, 5, 400, 5, { round: true, glow: true, fadeSize: true });
        // White spark ring — fast outward
        this.burst(x, y, '#ffffff', 10, 7, 200, 3, { spark: true });
        // Element-colored spark ring
        this.burst(x, y, color || '#ffaa44', 6, 5, 300, 2.5, { spark: true });
        // Lingering embers that float up
        this.burst(x, y, color || '#ffaa44', 8, 1.2, 600, 3, { round: true, noGravity: true, fadeSize: true });
        // Impact flash — triple ring
        this.flashes.push({ x, y, r: 25, life: 100, maxLife: 100, color: '#ffffff' });
        this.flashes.push({ x, y, r: 35, life: 180, maxLife: 180, color: color || '#fff' });
        this.flashes.push({ x, y, r: 50, life: 300, maxLife: 300, color: color || '#fff' });
    }

    elementBurst(x, y, element) {
        const color = AFFINITY_COLORS[element] || '#fff';
        const secondary = this._elementSecondary(element);
        this.burst(x, y, color, 12, 5, 450, 5, { round: true, glow: true, fadeSize: true });
        this.burst(x, y, secondary, 8, 3.5, 350, 3.5, { round: true, fadeSize: true });
        // Hot sparks ring
        this.burst(x, y, '#fff', 6, 6, 200, 2, { spark: true });
        this.flashes.push({ x, y, r: 30, life: 200, maxLife: 200, color });
    }

    _elementSecondary(element) {
        const map = { fire: '#ff4400', ice: '#aaeeff', shock: '#ffffff', poison: '#44ff44',
            wind: '#ccffee', earth: '#665533', shadow: '#660066', water: '#aaccff' };
        return map[element] || '#aaaaaa';
    }

    damageNumber(x, y, amount, color) {
        this.texts.push({
            x: x + (Math.random() - 0.5) * 20,
            y,
            text: '-' + amount,
            life: 1000, maxLife: 1000,
            color: color || '#ff4444',
            vy: -2,
            big: amount >= 2,
        });
        // Outline version for readability
        this.texts.push({
            x: x + (Math.random() - 0.5) * 20 + 1,
            y: y + 1,
            text: '-' + amount,
            life: 1000, maxLife: 1000,
            color: '#000000',
            vy: -2,
            big: amount >= 2,
        });
    }

    healNumber(x, y, amount) {
        this.texts.push({
            x, y,
            text: '+' + amount,
            life: 800, maxLife: 800,
            color: CONFIG.C.HEAL,
            vy: -1.5,
            big: false,
        });
    }

    statusText(x, y, text, color) {
        this.texts.push({
            x, y: y - 10,
            text,
            life: 1000, maxLife: 1000,
            color: color || '#ffcc00',
            vy: -1,
            big: true,
        });
    }

    shake(duration, magnitude) {
        this.shakes.push({ duration, magnitude, elapsed: 0 });
    }

    // Naruto-style summoning poof cloud
    poofCloud(x, y, size) {
        const s = size || 30;
        // Ring of expanding smoke puffs
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = 2.5 + Math.random() * 1.5;
            this.particles.push(new Particle(
                x + Math.cos(angle) * 4, y + Math.sin(angle) * 4,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                500 + Math.random() * 200,
                '#f0ead6',
                s * (0.3 + Math.random() * 0.2),
                { round: true, fadeSize: true, noGravity: true }
            ));
        }
        // Inner dense white puffs
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random();
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                400 + Math.random() * 150,
                '#ffffff',
                s * (0.25 + Math.random() * 0.15),
                { round: true, fadeSize: true, noGravity: true }
            ));
        }
        // Upward wisps (classic poof rises)
        for (let i = 0; i < 6; i++) {
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * s * 0.5,
                y + (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 1.5,
                -1.5 - Math.random() * 2,
                350 + Math.random() * 200,
                '#e8e0d0',
                s * (0.2 + Math.random() * 0.15),
                { round: true, fadeSize: true, noGravity: true }
            ));
        }
        // Central flash
        this.flashes.push({ x, y, r: s * 0.8, life: 200, maxLife: 200, color: '#ffffff' });
    }

    clear() {
        this.particles = [];
        this.flashes = [];
        this.shakes = [];
        this.texts = [];
    }
}
