// ============================================================
// sprites.js - Procedural placeholder sprite drawing
// All sprites are square and easy to swap for real art.
// ============================================================
const Sprites = {
    // Utility: draw a filled rounded rect
    roundRect(ctx, x, y, w, h, r, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
    },

    // ===== NINJA (player or enemy) - Sticker style =====
    ninja(ctx, x, y, size, color, facing, options = {}) {
        const s = size;
        const hs = s / 2;
        const skin = options.skin; // PLAYER_SKINS entry or null
        // If skin provided, override color and headband
        const bodyColor = skin ? skin.color : color;
        const accentColor = skin ? skin.accent : (options.headbandColor || '#ffffff');

        ctx.save();
        ctx.translate(x + hs, y + hs);
        if (facing === 'left') ctx.scale(-1, 1);

        // Invisible alpha
        if (options.invisible) ctx.globalAlpha = 0.3;

        // ----- STICKER OUTLINE (thick white border) -----
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';

        // Head (circle on top)
        const isFemale = skin && skin.female;
        ctx.beginPath();
        ctx.arc(0, -hs + 10, isFemale ? 15 : 14, 0, Math.PI * 2);
        ctx.fillStyle = shadeColor(bodyColor, 20);
        ctx.fill(); ctx.stroke();

        // Kasa hat (wide conical farmer hat) — drawn on top of head (males only)
        if (skin && !isFemale) {
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.moveTo(-24, -hs + 6);
            ctx.lineTo(0, -hs - 18);
            ctx.lineTo(24, -hs + 6);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Brim line
            ctx.fillStyle = shadeColor(accentColor, -30);
            ctx.fillRect(-24, -hs + 3, 48, 4);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
        }

        // Body (rounded torso)
        if (isFemale) {
            // Curvier torso — elliptical with waist
            ctx.fillStyle = bodyColor;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
            ctx.beginPath();
            // Shoulders
            ctx.moveTo(-10, -hs + 22);
            // Bust curve out
            ctx.quadraticCurveTo(-14, -hs + 28, -11, -hs + 32);
            // Waist pinch
            ctx.quadraticCurveTo(-9, -hs + 35, -12, -hs + 40);
            // Hip
            ctx.lineTo(12, -hs + 40);
            ctx.quadraticCurveTo(9, -hs + 35, 11, -hs + 32);
            ctx.quadraticCurveTo(14, -hs + 28, 10, -hs + 22);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else {
            this.roundRect(ctx, -12, -hs + 22, 24, 18, 5, bodyColor, '#ffffff');
        }

        // Legs
        ctx.fillStyle = shadeColor(bodyColor, -40);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
        if (isFemale) {
            // Rounder legs — rounded rects with more radius
            this.roundRect(ctx, -10, hs - 14, 8, 12, 4, shadeColor(bodyColor, -40), '#ffffff');
            this.roundRect(ctx, 2, hs - 14, 8, 12, 4, shadeColor(bodyColor, -40), '#ffffff');
        } else {
            ctx.fillRect(-10, hs - 14, 8, 12); ctx.strokeRect(-10, hs - 14, 8, 12);
            ctx.fillRect(2, hs - 14, 8, 12); ctx.strokeRect(2, hs - 14, 8, 12);
        }

        // Arms
        ctx.fillStyle = shadeColor(bodyColor, -20);
        if (isFemale) {
            // Rounder, slightly thinner arms
            this.roundRect(ctx, -17, -hs + 24, 6, 12, 3, shadeColor(bodyColor, -20), '#ffffff');
            this.roundRect(ctx, 11, -hs + 24, 6, 12, 3, shadeColor(bodyColor, -20), '#ffffff');
        } else {
            ctx.fillRect(-16, -hs + 24, 5, 12); ctx.strokeRect(-16, -hs + 24, 5, 12);
            ctx.fillRect(11, -hs + 24, 5, 12); ctx.strokeRect(11, -hs + 24, 5, 12);
        }

        // Belt / sash (skin accent)
        if (skin) {
            ctx.fillStyle = accentColor;
            ctx.fillRect(-12, hs - 16, 24, 3);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(-12, hs - 15, 24, 1);
        }

        // Headband (wraps around head)
        ctx.fillStyle = accentColor;
        ctx.fillRect(-13, -hs + 6, 26, 5);
        // Headband tail flowing back
        ctx.fillRect(13, -hs + 4, 12, 3);
        ctx.fillRect(20, -hs + 2, 8, 2);

        // Eyes - bigger, more expressive
        ctx.fillStyle = '#ffffff';
        this.roundRect(ctx, -9, -hs + 11, 8, 7, 2, '#ffffff');
        this.roundRect(ctx, 2, -hs + 11, 8, 7, 2, '#ffffff');
        // Pupils
        if (options.eyesClosed) {
            // Closed eyes — horizontal lines
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-7, -hs + 14); ctx.lineTo(-2, -hs + 14);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(4, -hs + 14); ctx.lineTo(9, -hs + 14);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#111111';
            ctx.fillRect(-6, -hs + 13, 4, 4);
            ctx.fillRect(5, -hs + 13, 4, 4);
            // Eye shine
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-5, -hs + 13, 2, 2);
            ctx.fillRect(6, -hs + 13, 2, 2);
        }

        // ----- Expression (brows + mouth) -----
        const face = options.face || 'smile';

        // Brows
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        if (face === 'angry') {
            // V-shaped angry brows
            ctx.beginPath();
            ctx.moveTo(-10, -hs + 9); ctx.lineTo(-3, -hs + 12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(11, -hs + 9); ctx.lineTo(4, -hs + 12);
            ctx.stroke();
        } else if (face === 'fierce') {
            // Intense flat brows, slightly angled inward
            ctx.beginPath();
            ctx.moveTo(-10, -hs + 10); ctx.lineTo(-2, -hs + 11);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(11, -hs + 10); ctx.lineTo(3, -hs + 11);
            ctx.stroke();
        } else if (face === 'cold') {
            // Flat, narrow brows — half-lidded eyes
            ctx.beginPath();
            ctx.moveTo(-10, -hs + 10); ctx.lineTo(-2, -hs + 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(11, -hs + 10); ctx.lineTo(3, -hs + 10);
            ctx.stroke();
        } else if (face === 'smirk') {
            // One raised brow, one flat
            ctx.beginPath();
            ctx.moveTo(-10, -hs + 10); ctx.lineTo(-3, -hs + 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(11, -hs + 8); ctx.lineTo(4, -hs + 10);
            ctx.stroke();
        } else if (face === 'calm') {
            // Gentle, slightly curved brows
            ctx.beginPath();
            ctx.moveTo(-10, -hs + 10); ctx.quadraticCurveTo(-6, -hs + 8, -2, -hs + 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(11, -hs + 10); ctx.quadraticCurveTo(7, -hs + 8, 3, -hs + 10);
            ctx.stroke();
        }
        // cheerful & smile: no brows drawn

        // Mouth
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (face === 'angry') {
            // Jagged frown
            ctx.moveTo(-4, -hs + 22); ctx.lineTo(0, -hs + 20); ctx.lineTo(4, -hs + 22);
        } else if (face === 'fierce') {
            // Gritted teeth line
            ctx.moveTo(-4, -hs + 21); ctx.lineTo(4, -hs + 21);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-2, -hs + 21); ctx.lineTo(-2, -hs + 23);
            ctx.stroke(); ctx.beginPath();
            ctx.moveTo(2, -hs + 21); ctx.lineTo(2, -hs + 23);
        } else if (face === 'cold') {
            // Thin flat line
            ctx.moveTo(-3, -hs + 20); ctx.lineTo(3, -hs + 20);
        } else if (face === 'smirk') {
            // Crooked half-smile
            ctx.moveTo(-3, -hs + 20); ctx.quadraticCurveTo(1, -hs + 20, 4, -hs + 18);
        } else if (face === 'calm') {
            // Small neutral curve
            ctx.arc(0, -hs + 19, 3, 0.2, Math.PI - 0.2);
        } else if (face === 'cheerful') {
            // Wide happy grin
            ctx.arc(0, -hs + 18, 5, 0.1, Math.PI - 0.1);
        } else {
            // Default smile
            ctx.arc(0, -hs + 19, 4, 0.1, Math.PI - 0.1);
        }
        ctx.stroke();

        // ----- Female traits (kunoichi) -----
        if (skin && skin.female) {
            // Eyelashes — small flicks above each eye
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 1.5;
            // Left eye lashes
            ctx.beginPath();
            ctx.moveTo(-9, -hs + 11); ctx.lineTo(-11, -hs + 8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-6, -hs + 10); ctx.lineTo(-7, -hs + 7);
            ctx.stroke();
            // Right eye lashes
            ctx.beginPath();
            ctx.moveTo(10, -hs + 11); ctx.lineTo(12, -hs + 8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(7, -hs + 10); ctx.lineTo(8, -hs + 7);
            ctx.stroke();

            // Ponytail — long flowing hair from back of head
            ctx.fillStyle = shadeColor(bodyColor, 30);
            ctx.beginPath();
            ctx.moveTo(10, -hs + 2);
            ctx.quadraticCurveTo(22, -hs + 6, 20, -hs + 22);
            ctx.quadraticCurveTo(18, -hs + 28, 14, -hs + 26);
            ctx.quadraticCurveTo(16, -hs + 12, 10, -hs + 8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Hair tie
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(12, -hs + 6, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Lip mark — small colored lip instead of plain mouth
            ctx.fillStyle = '#d46a7e';
            ctx.beginPath();
            ctx.arc(0, -hs + 19, 2.5, 0, Math.PI, false);
            ctx.fill();
        }

        // ----- Skin-specific back detail (weapon/accessory) -----
        if (skin) {
            const detail = skin.detail;
            // Flower — on hat for males, on ponytail for females
            if (detail === 'flower') {
                const fx = isFemale ? 14 : 6, fy = isFemale ? -hs + 4 : -hs - 4;
                ctx.fillStyle = accentColor;
                for (let i = 0; i < 5; i++) {
                    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                    ctx.beginPath();
                    ctx.arc(fx + Math.cos(a) * 3, fy + Math.sin(a) * 3, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#ffe844';
                ctx.beginPath();
                ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            // Katana scabbard on back (fire)
            if (detail === 'katana') {
                ctx.save();
                ctx.rotate(-0.4);
                ctx.fillStyle = '#3a2a1a';
                ctx.fillRect(-3, -hs + 14, 4, 28);
                ctx.fillStyle = accentColor;
                ctx.fillRect(-3, -hs + 14, 4, 3); // hilt wrap
                ctx.fillRect(-3, -hs + 38, 4, 3); // end cap
                ctx.restore();
            }
            // Scythe silhouette on back (shadow)
            if (detail === 'scythe') {
                ctx.save();
                ctx.rotate(-0.35);
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(-2, -hs + 10, 3, 30); // handle
                ctx.fillStyle = accentColor;
                ctx.fillRect(-2, -hs + 12, 3, 3); // grip wrap
                // Blade (crescent)
                ctx.fillStyle = '#e0d0f8';
                ctx.beginPath();
                ctx.arc(-2, -hs + 10, 8, Math.PI * 0.8, Math.PI * 1.4);
                ctx.lineTo(-2, -hs + 10);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            // Stone bracer (earth)
            if (detail === 'bracer') {
                ctx.fillStyle = '#8a6a3a';
                ctx.fillRect(11, -hs + 26, 6, 8);
                ctx.fillStyle = accentColor;
                ctx.fillRect(11, -hs + 29, 6, 2); // green accent band
                ctx.fillStyle = '#e8d0b0';
                ctx.fillRect(12, -hs + 26, 2, 2); // knuckle stud
                ctx.fillRect(15, -hs + 26, 2, 2);
            }
            // Lightning crackling (storm)
            if (detail === 'lightning') {
                const t = Date.now() / 100;
                ctx.strokeStyle = accentColor;
                ctx.lineWidth = 1.5;
                ctx.shadowColor = accentColor;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.moveTo(-4, -hs - 6);
                ctx.lineTo(-1, -hs - 1);
                ctx.lineTo(2, -hs - 4);
                ctx.lineTo(5, -hs + 1);
                ctx.stroke();
                // Second bolt flicker
                if (Math.sin(t) > 0) {
                    ctx.beginPath();
                    ctx.moveTo(8, -hs - 3);
                    ctx.lineTo(6, -hs + 2);
                    ctx.lineTo(9, -hs);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }
        }

        // Shield glow
        if (options.shielded) {
            ctx.strokeStyle = CONFIG.C.SHIELD;
            ctx.lineWidth = 3;
            const prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = (0.5 + Math.sin(Date.now() / 150) * 0.3) * prevAlpha;
            ctx.beginPath();
            ctx.arc(0, 0, hs + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = prevAlpha;
        }

        // Enchant glow (aura ring)
        if (options.enchant) {
            const ec = AFFINITY_COLORS[options.enchant] || '#fff';
            ctx.shadowColor = ec;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = ec;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, hs + 3, 0, Math.PI * 2);
            ctx.stroke();
            // small orbiting dot
            const angle = Date.now() / 300;
            ctx.fillStyle = ec;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * (hs + 3), Math.sin(angle) * (hs + 3), 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    },

    // ===== PROJECTILES =====
    shuriken(ctx, x, y, size, rot) {
        ctx.save();
        ctx.translate(x, y);
        // Spin blur ghosts
        ctx.globalAlpha = 0.08;
        for (let g = 1; g <= 3; g++) {
            ctx.save();
            ctx.rotate(rot - g * 0.35);
            ctx.fillStyle = '#555';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-size / 3, -size);
                ctx.lineTo(size / 3, -size);
                ctx.closePath(); ctx.fill();
                ctx.rotate(Math.PI / 2);
            }
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        // Main shuriken
        ctx.rotate(rot);
        ctx.shadowColor = '#aaa';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#2a2a2a';
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-size / 3, -size);
            ctx.lineTo(0, -size * 0.85);
            ctx.lineTo(size / 3, -size);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.rotate(Math.PI / 2);
        }
        // Metallic center
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 3);
        cg.addColorStop(0, '#999');
        cg.addColorStop(0.5, '#666');
        cg.addColorStop(1, '#333');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(0, 0, size / 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    arrow(ctx, x, y, size, facing) {
        ctx.save();
        ctx.translate(x, y);
        if (facing === 'left') ctx.scale(-1, 1);
        // Motion blur trail
        ctx.globalAlpha = 0.12;
        for (let i = 1; i <= 4; i++) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-size - i * 6, -1, size * 2, 3);
        }
        ctx.globalAlpha = 1;
        // Shaft
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-size, -1, size * 2, 3);
        // Arrowhead with gleam
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(size, -5); ctx.lineTo(size + 8, 0); ctx.lineTo(size, 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(size + 1, -2); ctx.lineTo(size + 6, 0); ctx.stroke();
        // Fletching
        ctx.fillStyle = '#777';
        ctx.beginPath(); ctx.moveTo(-size - 4, -4); ctx.lineTo(-size, 0); ctx.lineTo(-size - 4, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
    },

    fireball(ctx, x, y, size) {
        const t = Date.now();
        // Outer flickering flame wisps
        ctx.save();
        for (let i = 0; i < 5; i++) {
            const angle = (t / 120 + i * 1.3) % (Math.PI * 2);
            const dist = size * (0.5 + Math.sin(t / 80 + i * 2) * 0.3);
            const fx = x + Math.cos(angle) * dist;
            const fy = y + Math.sin(angle) * dist;
            const fs = size * (0.3 + Math.sin(t / 60 + i) * 0.1);
            const wg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fs);
            wg.addColorStop(0, 'rgba(255,200,50,0.6)');
            wg.addColorStop(1, 'rgba(255,80,0,0)');
            ctx.fillStyle = wg;
            ctx.beginPath(); ctx.arc(fx, fy, fs, 0, Math.PI * 2); ctx.fill();
        }
        // Main body glow
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = size * 1.5;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, size);
        grd.addColorStop(0, '#ffffcc');
        grd.addColorStop(0.2, '#fff');
        grd.addColorStop(0.45, '#ffaa00');
        grd.addColorStop(0.75, '#ff4400');
        grd.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
        // Hot white core
        const core = ctx.createRadialGradient(x, y, 0, x, y, size * 0.3);
        core.addColorStop(0, 'rgba(255,255,255,0.9)');
        core.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(x, y, size * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },

    iceShard(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        // Frost glow
        ctx.shadowColor = '#66ccff';
        ctx.shadowBlur = 10;
        // Main crystal
        ctx.fillStyle = '#bbedff';
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-size, 0); ctx.lineTo(0, -size / 2);
        ctx.lineTo(size, 0); ctx.lineTo(0, size / 2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // Inner gleam
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(-size * 0.4, 0); ctx.lineTo(0, -size * 0.2);
        ctx.lineTo(size * 0.3, 0); ctx.lineTo(0, size * 0.15);
        ctx.closePath(); ctx.fill();
        // Small trailing crystal fragments behind
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#aaeeff';
        for (let i = 1; i <= 3; i++) {
            const ox = -size * 0.5 * i;
            const s = size * (0.3 - i * 0.07);
            ctx.beginPath();
            ctx.moveTo(ox - s, 0); ctx.lineTo(ox, -s / 2);
            ctx.lineTo(ox + s, 0); ctx.lineTo(ox, s / 2);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    },

    poisonCloud(ctx, x, y, size, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha || 0.6;
        for (let i = 0; i < 5; i++) {
            const ox = Math.sin(i * 1.3 + Date.now() / 300) * size * 0.4;
            const oy = Math.cos(i * 1.7 + Date.now() / 400) * size * 0.3;
            const grd = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, size * 0.5);
            grd.addColorStop(0, 'rgba(0,255,100,0.5)');
            grd.addColorStop(1, 'rgba(0,150,50,0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(x + ox, y + oy, size * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    },

    boulder(ctx, x, y, size) {
        ctx.save();
        ctx.shadowColor = '#5C4033';
        ctx.shadowBlur = 6;
        // Main rock
        ctx.fillStyle = '#8B7355';
        ctx.strokeStyle = '#5C4033';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Cracks
        ctx.strokeStyle = '#554030';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - size * 0.5, y - size * 0.2); ctx.lineTo(x + size * 0.3, y + size * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + size * 0.1, y - size * 0.6); ctx.lineTo(x - size * 0.2, y + size * 0.3); ctx.stroke();
        // Rock texture spots
        ctx.fillStyle = '#705030';
        ctx.beginPath(); ctx.arc(x - 3, y - 3, size * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 5, y + 2, size * 0.2, 0, Math.PI * 2); ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,220,180,0.2)';
        ctx.beginPath(); ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },

    // ===== LANE EFFECTS =====
    laneFlames(ctx, x, y, w, h, t) {
        ctx.save();
        const vertical = h > w;
        // Base heat shimmer
        ctx.globalAlpha = 0.18;
        const heatGrad = ctx.createLinearGradient(x, y + h, x, y);
        heatGrad.addColorStop(0, '#ff4400');
        heatGrad.addColorStop(0.5, '#ff8800');
        heatGrad.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.fillStyle = heatGrad;
        ctx.fillRect(x, y, w, h);

        // Fireball rope along the lane
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 10; i++) {
            let fx, fy;
            if (vertical) {
                fx = x + w / 2 + Math.sin(t / 150 + i * 0.7) * (w * 0.3);
                fy = y + (i / 10) * h + Math.sin(t / 200 + i * 1.7) * 10;
            } else {
                fx = x + (i / 10) * w + Math.sin(t / 200 + i * 1.7) * 10;
                fy = y + h - 8 + Math.sin(t / 150 + i * 0.7) * 8;
            }
            const fs = 10 + Math.sin(t / 100 + i) * 4;
            Sprites.fireball(ctx, fx, fy, fs);
        }

        // Floating ember sparks above flames
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 6; i++) {
            let ex, ey;
            if (vertical) {
                ex = x + w * 0.3 + Math.sin(t / 150 + i * 3) * (w * 0.25);
                ey = y + ((t / 8 + i * 137) % h);
            } else {
                ex = x + ((t / 8 + i * 137) % w);
                ey = y + h * 0.3 + Math.sin(t / 150 + i * 3) * (h * 0.25);
            }
            const es = 1.5 + Math.sin(t / 90 + i * 2) * 0.8;
            ctx.fillStyle = i % 2 === 0 ? '#ffcc44' : '#ff6622';
            ctx.beginPath();
            ctx.arc(ex, ey, es, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    laneFrost(ctx, x, y, w, h, t) {
        ctx.save();
        const vertical = h > w;
        ctx.globalAlpha = 0.25 + Math.sin(t / 400) * 0.1;
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 6; i++) {
            let sx, sy;
            if (vertical) {
                sx = x + w / 2 + Math.sin(t / 300 + i) * (w * 0.25);
                sy = y + (i / 6) * h + 10;
            } else {
                sx = x + (i / 6) * w + 10;
                sy = y + h / 2 + Math.sin(t / 300 + i) * 10;
            }
            Sprites.iceShard(ctx, sx, sy, 8);
        }
        ctx.restore();
    },

    laneShock(ctx, x, y, w, h, t, lifeRatio) {
        ctx.save();
        // Yellow tint flash — brighter at start, fading with lifeRatio
        const fade = Math.min(1, lifeRatio * 2);
        ctx.globalAlpha = (0.15 + fade * 0.2) * (0.7 + Math.sin(t / 40) * 0.3);
        ctx.fillStyle = '#ffee00';
        ctx.fillRect(x, y, w, h);

        // Jagged lightning bolts
        ctx.strokeStyle = '#ffee00';
        ctx.shadowColor = '#ffee00';
        ctx.shadowBlur = 10 + fade * 8;
        ctx.lineWidth = 2 + fade;
        const boltCount = Math.max(2, Math.floor(Math.min(w, h) / 40));
        for (let i = 0; i < boltCount; i++) {
            ctx.globalAlpha = 0.5 + fade * 0.4;
            // Randomized bolt path (re-randomize every ~60ms)
            const seed = Math.floor(t / 60) + i * 7;
            const seededRand = (n) => {
                let s = (seed * 9301 + n * 49297 + 233280) % 233280;
                return s / 233280;
            };
            const vertical = h > w;
            ctx.beginPath();
            if (vertical) {
                const bx = x + seededRand(0) * w;
                ctx.moveTo(bx, y);
                for (let seg = 1; seg <= 5; seg++) {
                    const sy = y + (seg / 5) * h;
                    const sx = bx + (seededRand(seg) - 0.5) * w * 0.7;
                    ctx.lineTo(sx, sy);
                }
            } else {
                const by = y + seededRand(0) * h;
                ctx.moveTo(x, by);
                for (let seg = 1; seg <= 5; seg++) {
                    const sx = x + (seg / 5) * w;
                    const sy = by + (seededRand(seg) - 0.5) * h * 0.7;
                    ctx.lineTo(sx, sy);
                }
            }
            ctx.stroke();
        }

        // Bright spark dots
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffee00';
        ctx.shadowBlur = 6;
        for (let i = 0; i < 8; i++) {
            const seed2 = Math.floor(t / 45) + i * 13;
            const sr = (n) => {
                let s = (seed2 * 9301 + n * 49297 + 233280) % 233280;
                return s / 233280;
            };
            const sx = x + sr(0) * w;
            const sy = y + sr(1) * h;
            ctx.globalAlpha = 0.4 + fade * 0.5;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5 + fade, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    },

    // ===== STATUS EFFECT OVERLAYS =====
    statusOverlays(ctx, cx, cy, size, status) {
        const hs = size / 2;
        const t = Date.now();

        // FROZEN: icy blue tint + ice crystals around edges
        if (status.frozen) {
            ctx.save();
            ctx.globalAlpha = 0.35 + Math.sin(t / 200) * 0.1;
            ctx.fillStyle = '#00d4ff';
            ctx.fillRect(cx - hs, cy - hs, size, size);
            ctx.globalAlpha = 0.8;
            // Ice crystals at corners
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + t / 800;
                const ix = cx + Math.cos(angle) * (hs + 4);
                const iy = cy + Math.sin(angle) * (hs + 4);
                this.iceShard(ctx, ix, iy, 6);
            }
            // Frost border
            ctx.strokeStyle = '#88eeff';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(cx - hs - 2, cy - hs - 2, size + 4, size + 4);
            ctx.setLineDash([]);
            ctx.restore();
        }

        // BURNING: fire licking from below + orange tint
        if (status.burning) {
            ctx.save();
            // Warm tint
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = '#ff4400';
            ctx.fillRect(cx - hs, cy - hs, size, size);

            // Small teardrop flames from bottom
            for (let i = 0; i < 5; i++) {
                const fx = cx - hs + (i / 4) * size;
                const baseY = cy + hs;
                const fh = 8 + Math.sin(t / 80 + i * 2.3) * 4;
                const fw = 3 + Math.sin(t / 60 + i) * 1;

                const grad = ctx.createLinearGradient(fx, baseY, fx, baseY - fh);
                grad.addColorStop(0, 'rgba(255,80,0,0.5)');
                grad.addColorStop(0.5, 'rgba(255,200,60,0.35)');
                grad.addColorStop(1, 'rgba(255,255,150,0)');
                ctx.fillStyle = grad;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.moveTo(fx - fw, baseY);
                ctx.quadraticCurveTo(fx - fw, baseY - fh * 0.5, fx + Math.sin(t / 70 + i) * 2, baseY - fh);
                ctx.quadraticCurveTo(fx + fw, baseY - fh * 0.5, fx + fw, baseY);
                ctx.closePath();
                ctx.fill();
            }

            // Rising ember sparks
            for (let i = 0; i < 3; i++) {
                const ex = cx + Math.sin(t / 200 + i * 2) * hs * 0.6;
                const ey = cy - hs - 6 + Math.sin(t / 150 + i) * 4;
                ctx.fillStyle = i % 2 === 0 ? '#ffcc44' : '#ff6622';
                ctx.globalAlpha = 0.5 + Math.sin(t / 100 + i * 3) * 0.3;
                ctx.beginPath();
                ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // POISONED: toxic bubbles + green tint
        if (status.poisoned) {
            ctx.save();
            // Green tint
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = '#44cc44';
            ctx.fillRect(cx - hs, cy - hs, size, size);

            // Rising toxic bubbles
            for (let i = 0; i < 5; i++) {
                const bx = cx - hs * 0.6 + (i / 4) * size * 0.6;
                const speed = 0.04 + i * 0.01;
                const by = cy + hs - ((t * speed + i * 40) % (size + 10));
                const br = 2 + Math.sin(t / 120 + i * 1.7) * 1;
                ctx.globalAlpha = 0.5 - (cy + hs - by) / (size + 10) * 0.4;
                ctx.fillStyle = i % 2 === 0 ? '#66dd66' : '#33aa55';
                ctx.beginPath();
                ctx.arc(bx, by, br, 0, Math.PI * 2);
                ctx.fill();
                // Bubble highlight
                ctx.fillStyle = 'rgba(200,255,200,0.4)';
                ctx.beginPath();
                ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }

            // Drip particles from bottom
            for (let i = 0; i < 3; i++) {
                const dx = cx + Math.sin(t / 180 + i * 2.5) * hs * 0.5;
                const dy = cy + hs + 2 + Math.sin(t / 130 + i) * 3;
                ctx.fillStyle = '#44bb44';
                ctx.globalAlpha = 0.4 + Math.sin(t / 90 + i * 3) * 0.2;
                ctx.beginPath();
                ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // STUNNED: electric sparks + yellow tint + stars
        if (status.stunned) {
            ctx.save();
            ctx.globalAlpha = 0.15 + Math.sin(t / 100) * 0.1;
            ctx.fillStyle = '#ffee00';
            ctx.fillRect(cx - hs, cy - hs, size, size);
            ctx.globalAlpha = 0.9;
            // Lightning bolts
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2 + t / 200;
                const bx = cx + Math.cos(angle) * hs * 0.7;
                const by = cy + Math.sin(angle) * hs * 0.7;
                ctx.strokeStyle = '#ffee00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(bx, by - 6);
                ctx.lineTo(bx + 3, by - 1);
                ctx.lineTo(bx - 2, by + 1);
                ctx.lineTo(bx + 1, by + 6);
                ctx.stroke();
            }
            // Orbiting stars
            ctx.fillStyle = '#ffee00';
            for (let i = 0; i < 3; i++) {
                const sa = (i / 3) * Math.PI * 2 + t / 400;
                const sx = cx + Math.cos(sa) * (hs + 6);
                const sy = cy - hs - 4 + Math.sin(sa * 2) * 3;
                this._drawStar(ctx, sx, sy, 3, 5);
            }
            ctx.restore();
        }
    },

    // Helper: draw a small star
    _drawStar(ctx, cx, cy, r, points) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
            const radius = i % 2 === 0 ? r : r * 0.4;
            const method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        }
        ctx.closePath();
        ctx.fill();
    },

    // ===== SUMMONS - Unique sticker sprites =====
    summon(ctx, x, y, size, color, iconType, hpRatio, facing) {
        const s = size;
        const hs = s / 2;
        ctx.save();
        ctx.translate(x + hs, y + hs);
        if (facing === 'left') ctx.scale(-1, 1);

        // Sticker drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.arc(3, 3, hs - 2, 0, Math.PI * 2); ctx.fill();

        // HP bar on top
        const barW = s + 4;
        ctx.fillStyle = '#222';
        this.roundRect(ctx, -barW / 2, -hs - 12, barW, 6, 3, '#222');
        if (hpRatio < 1) {
            ctx.fillStyle = hpRatio > 0.3 ? CONFIG.C.HP : '#ff2222';
            this.roundRect(ctx, -barW / 2, -hs - 12, barW * Math.max(0, hpRatio), 6, 3, hpRatio > 0.3 ? CONFIG.C.HP : '#ff2222');
        } else {
            this.roundRect(ctx, -barW / 2, -hs - 12, barW, 6, 3, CONFIG.C.HP);
        }

        // Draw unique shape per summon type
        switch (iconType) {
            case 'lamp': this._drawLamp(ctx, hs, color); break;
            case 'blocky': this._drawBlocky(ctx, hs, color); break;
            case 'javelineer': this._drawJavelineer(ctx, hs, color); break;
            case 'dragon': this._drawDragon(ctx, hs, color); break;
            case 'hydra': this._drawHydra(ctx, hs, color); break;
            case 'samurai': this._drawSamurai(ctx, hs, color); break;
            case 'bird_ice': this._drawBird(ctx, hs, '#00d4ff', '#88eeff'); break;
            case 'bird_shock': this._drawBird(ctx, hs, '#ffee00', '#ffffaa'); break;
            case 'bird_fire': this._drawBird(ctx, hs, '#ff6b35', '#ffaa66'); break;
            default: this._drawGeneric(ctx, hs, color); break;
        }

        ctx.restore();
    },

    // --- LAMP: Floating lantern shape with glow ---
    _drawLamp(ctx, hs, color) {
        const t = Date.now();
        const bob = Math.sin(t / 400) * 3;

        // Lantern body (trapezoid)
        ctx.fillStyle = '#553322';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-10, -2 + bob); ctx.lineTo(-8, 14 + bob);
        ctx.lineTo(8, 14 + bob); ctx.lineTo(10, -2 + bob);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Top hook
        ctx.strokeStyle = '#aa8855';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -8 + bob, 6, Math.PI, Math.PI * 2);
        ctx.stroke();

        // Inner glow
        const grd = ctx.createRadialGradient(0, 6 + bob, 0, 0, 6 + bob, 14);
        grd.addColorStop(0, 'rgba(255,238,100,0.9)');
        grd.addColorStop(0.5, 'rgba(255,200,50,0.4)');
        grd.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(0, 6 + bob, 14, 0, Math.PI * 2); ctx.fill();

        // Cross symbol
        ctx.fillStyle = '#fff';
        ctx.fillRect(-1, 1 + bob, 3, 10);
        ctx.fillRect(-4, 4 + bob, 9, 3);
    },

    // --- BLOCKY: Big stone golem with face ---
    _drawBlocky(ctx, hs, color) {
        // Big stone body
        ctx.fillStyle = '#667788';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        this.roundRect(ctx, -hs + 2, -hs + 4, hs * 2 - 4, hs * 2 - 6, 4, '#667788', '#fff');

        // Cracks
        ctx.strokeStyle = '#445566';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-8, -hs + 6); ctx.lineTo(-3, 0); ctx.lineTo(-10, 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, -hs + 8); ctx.lineTo(10, 4); ctx.stroke();

        // Face - heavy brow
        ctx.fillStyle = '#445566';
        ctx.fillRect(-hs + 4, -6, hs * 2 - 8, 4);

        // Eyes (small, deep set)
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(-8, -2, 5, 4);
        ctx.fillRect(4, -2, 5, 4);

        // Mouth line
        ctx.strokeStyle = '#334';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, 10); ctx.lineTo(6, 10);
        ctx.stroke();
    },

    // --- JAVELINEER: Shield knight with javelin ---
    _drawJavelineer(ctx, hs, color) {
        // Shield (prominent, left side)
        ctx.fillStyle = '#4477aa';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-14, -12); ctx.lineTo(-14, 10);
        ctx.quadraticCurveTo(-14, 18, -4, 18);
        ctx.quadraticCurveTo(2, 18, 2, 10);
        ctx.lineTo(2, -12);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Shield emblem
        ctx.fillStyle = '#aaddff';
        ctx.beginPath(); ctx.arc(-6, 2, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4477aa';
        ctx.beginPath(); ctx.arc(-6, 2, 2, 0, Math.PI * 2); ctx.fill();

        // Javelin (right side, diagonal)
        ctx.strokeStyle = '#aa8855';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(6, 16); ctx.lineTo(12, -18); ctx.stroke();
        // Javelin tip
        ctx.fillStyle = '#cccccc';
        ctx.beginPath();
        ctx.moveTo(10, -18); ctx.lineTo(12, -24); ctx.lineTo(14, -18);
        ctx.closePath(); ctx.fill();

        // Helmet peek over shield
        ctx.fillStyle = '#5588bb';
        ctx.beginPath();
        ctx.arc(-6, -14, 7, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-9, -13, 3, 3);
        ctx.fillRect(-3, -13, 3, 3);
    },

    // --- DRAGON: Serpentine dragon head ---
    _drawDragon(ctx, hs, color) {
        const t = Date.now();
        // Neck
        ctx.strokeStyle = '#cc3300';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-hs, 10);
        ctx.quadraticCurveTo(-5, 5 + Math.sin(t / 300) * 3, 0, -5);
        ctx.stroke();

        // Head (angular)
        ctx.fillStyle = '#ff4400';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-10, -14); ctx.lineTo(16, -6);
        ctx.lineTo(16, 6); ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Snout
        ctx.fillStyle = '#cc3300';
        ctx.beginPath();
        ctx.moveTo(16, -6); ctx.lineTo(22, -2);
        ctx.lineTo(22, 2); ctx.lineTo(16, 6);
        ctx.closePath(); ctx.fill();

        // Eye
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath(); ctx.arc(4, -4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(5, -4, 2, 0, Math.PI * 2); ctx.fill();

        // Horns
        ctx.fillStyle = '#aa5500';
        ctx.beginPath();
        ctx.moveTo(-4, -14); ctx.lineTo(-8, -22); ctx.lineTo(0, -16);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, -14); ctx.lineTo(2, -22); ctx.lineTo(8, -16);
        ctx.closePath(); ctx.fill();

        // Fire breath hint
        if (Math.sin(t / 500) > 0.3) {
            ctx.globalAlpha = 0.5;
            this.fireball(ctx, 26, 0, 8);
            ctx.globalAlpha = 1;
        }
    },

    // --- HYDRA: Three snake heads ---
    _drawHydra(ctx, hs, color) {
        const t = Date.now();
        // Necks
        const heads = [
            { ox: -10, oy: -8, ang: -0.3 },
            { ox: 0, oy: -12, ang: 0 },
            { ox: 10, oy: -8, ang: 0.3 },
        ];
        // Base body
        ctx.fillStyle = '#3a5f2f';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 8, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Scale pattern
        ctx.fillStyle = '#2a4f1f';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(-6 + i * 6, 8, 3, 0, Math.PI * 2); ctx.fill();
        }

        heads.forEach((h, i) => {
            const bob = Math.sin(t / 300 + i * 2) * 3;
            // Neck
            ctx.strokeStyle = '#4a7a3a';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(h.ox * 0.3, 4);
            ctx.quadraticCurveTo(h.ox * 0.6, -2 + bob, h.ox, h.oy + bob);
            ctx.stroke();
            // Head
            ctx.fillStyle = '#5a9a4a';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(h.ox, h.oy + bob, 7, 5, h.ang, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            // Eyes
            ctx.fillStyle = '#ffdd00';
            ctx.beginPath(); ctx.arc(h.ox + 2, h.oy - 2 + bob, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(h.ox + 2.5, h.oy - 2 + bob, 1, 0, Math.PI * 2); ctx.fill();
        });
    },

    // --- SAMURAI: Armored warrior ---
    _drawSamurai(ctx, hs, color) {
        // Helmet (kabuto)
        ctx.fillStyle = '#8b0000';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -8, 12, Math.PI, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // Helmet crest
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(-2, -18); ctx.lineTo(0, -26); ctx.lineTo(2, -18);
        ctx.closePath(); ctx.fill();
        // Helmet wings
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.moveTo(-12, -12); ctx.lineTo(-18, -18); ctx.lineTo(-10, -8);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(12, -12); ctx.lineTo(18, -18); ctx.lineTo(10, -8);
        ctx.closePath(); ctx.fill();

        // Face mask
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(-10, -6); ctx.lineTo(-8, 4);
        ctx.lineTo(8, 4); ctx.lineTo(10, -6);
        ctx.closePath(); ctx.fill();
        // Menpo (face guard slit)
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(6, -2); ctx.stroke();

        // Shoulder armor
        ctx.fillStyle = '#8b0000';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.fillRect(-16, 4, 10, 8); ctx.strokeRect(-16, 4, 10, 8);
        ctx.fillRect(6, 4, 10, 8); ctx.strokeRect(6, 4, 8, 8);

        // Body armor
        ctx.fillStyle = '#444';
        this.roundRect(ctx, -10, 4, 20, 14, 3, '#444', '#fff');

        // Katana
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, 2); ctx.lineTo(20, -16); ctx.stroke();
        // Handle wrap
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(14, 2); ctx.lineTo(13, 10); ctx.stroke();
        // Guard
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(12, 0, 5, 3);
    },

    // --- BIRD: Distinct bird with spread wings ---
    _drawBird(ctx, hs, mainColor, lightColor) {
        const t = Date.now();
        const wingFlap = Math.sin(t / 200) * 0.3;

        // Body (oval)
        ctx.fillStyle = mainColor;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Wings (spread)
        ctx.save();
        ctx.rotate(wingFlap);
        ctx.fillStyle = lightColor;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        // Left wing
        ctx.beginPath();
        ctx.moveTo(-6, -2); ctx.lineTo(-20, -10);
        ctx.lineTo(-18, -2); ctx.lineTo(-6, 4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.rotate(-wingFlap);
        // Right wing
        ctx.beginPath();
        ctx.moveTo(6, -2); ctx.lineTo(20, -10);
        ctx.lineTo(18, -2); ctx.lineTo(6, 4);
        ctx.closePath();
        ctx.fillStyle = lightColor;
        ctx.fill(); ctx.stroke();
        ctx.restore();

        // Tail feathers
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.moveTo(-3, 8); ctx.lineTo(-8, 16); ctx.lineTo(0, 12);
        ctx.lineTo(8, 16); ctx.lineTo(3, 8);
        ctx.closePath(); ctx.fill();

        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(3, -3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(3.5, -3, 1.5, 0, Math.PI * 2); ctx.fill();

        // Beak
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(7, -1); ctx.lineTo(14, 0); ctx.lineTo(7, 2);
        ctx.closePath(); ctx.fill();

        // Element trails
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 3; i++) {
            const tx = -4 + Math.sin(t / 200 + i) * 6;
            const ty = 14 + i * 4;
            ctx.fillStyle = mainColor;
            ctx.beginPath(); ctx.arc(tx, ty, 2 - i * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    // --- GENERIC fallback ---
    _drawGeneric(ctx, hs, color) {
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, hs - 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-4, -4, 4, 4);
        ctx.fillRect(2, -4, 4, 4);
    },

    // ===== EFFECTS =====
    swordSlash(ctx, x, y, w, h, progress, facing) {
        ctx.save();
        ctx.translate(x, y);
        if (facing === 'left') ctx.scale(-1, 1);

        const alpha = 1 - progress * progress;
        const arcRadius = h * 0.5;
        const sweepAngle = Math.PI * 0.85;
        const startAngle = -sweepAngle / 2 - 0.15 + progress * 0.3;
        const endAngle = startAngle + sweepAngle;
        const arcX = w - arcRadius;

        // Outer emphasis lines — top and bottom edges of the slash
        ctx.lineCap = 'round';
        const spread = h * 0.35;
        ctx.globalAlpha = alpha * 0.18;
        ctx.strokeStyle = '#aaddff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(arcX, -spread);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(arcX, spread);
        ctx.stroke();

        // Outer bright slash arc
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#aaddff';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3 - progress * 2;
        ctx.beginPath();
        ctx.arc(arcX, 0, arcRadius, startAngle, endAngle);
        ctx.stroke();

        // Inner thinner blue arc
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = '#aaddff';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1.5 - progress * 0.8;
        ctx.beginPath();
        ctx.arc(arcX, 0, arcRadius * 0.7, startAngle + 0.1, endAngle - 0.1);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();
    },

    // Shield bubble
    shieldBubble(ctx, x, y, size, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = CONFIG.C.SHIELD;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(170,221,255,0.1)';
        ctx.fill();
        ctx.restore();
    },

    // Orb (for combo display)
    orb(ctx, x, y, r, color, filled) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        if (filled) {
            const grd = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, r);
            grd.addColorStop(0, '#fff');
            grd.addColorStop(0.4, color);
            grd.addColorStop(1, shadeColor(color, -40));
            ctx.fillStyle = grd;
            ctx.fill();
        } else {
            ctx.strokeStyle = '#334';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    },

    // Mini icon for spell tree slot machine (12-16px symbols)
    miniIcon(ctx, x, y, s, type, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        const h = s / 2;
        switch (type) {
            case 'sword': // crossed swords — Arms
                ctx.beginPath(); ctx.moveTo(-h, h); ctx.lineTo(h, -h); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(h, h); ctx.lineTo(-h, -h); ctx.stroke();
                ctx.fillRect(-1, -1, 2, 2);
                break;
            case 'magic': // sparkle star — Magic
                for (let i = 0; i < 4; i++) {
                    const a = i * Math.PI / 2;
                    ctx.beginPath(); ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * h, Math.sin(a) * h); ctx.stroke();
                }
                ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
                break;
            case 'summon': // small figure — Summon
                ctx.beginPath(); ctx.arc(0, -h + 2, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(0, -h + 5); ctx.lineTo(0, 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-h + 1, 0); ctx.lineTo(h - 1, 0); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-3, h); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(3, h); ctx.stroke();
                break;
            case 'ranged': // arrow pointing right — Ranged
                ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(h, 0); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(h - 3, -3); ctx.lineTo(h, 0); ctx.lineTo(h - 3, 3); ctx.stroke();
                break;
            case 'enchant': // flame aura — Enchant
                ctx.beginPath();
                ctx.moveTo(0, -h); ctx.quadraticCurveTo(h, -2, 1, h);
                ctx.quadraticCurveTo(0, 2, -1, h);
                ctx.quadraticCurveTo(-h, -2, 0, -h);
                ctx.fill();
                break;
            case 'defend': // shield shape — Defend
                ctx.beginPath();
                ctx.moveTo(0, -h); ctx.lineTo(h, -h + 3);
                ctx.lineTo(h, 1); ctx.lineTo(0, h);
                ctx.lineTo(-h, 1); ctx.lineTo(-h, -h + 3);
                ctx.closePath(); ctx.stroke();
                break;
            case 'projectile': // fireball circle — Projectile
                ctx.beginPath(); ctx.arc(0, 0, h - 1, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath(); ctx.arc(-1, -1, h / 2, 0, Math.PI * 2); ctx.fill();
                break;
            case 'lane': // horizontal dashes — Lane
                ctx.beginPath(); ctx.moveTo(-h, -2); ctx.lineTo(h, -2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-h, 2); ctx.lineTo(h, 2); ctx.stroke();
                ctx.fillRect(-h, -1, s, 1);
                break;
            case 'ultimate': // explosion burst — Ultimate
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI / 3;
                    ctx.beginPath(); ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * h, Math.sin(a) * h); ctx.stroke();
                }
                break;
            case 'support': // heart/cross — Support
                ctx.fillRect(-1, -h + 1, 2, s - 2);
                ctx.fillRect(-h + 1, -1, s - 2, 2);
                break;
            case 'offense': // fist/blade — Offense
                ctx.beginPath(); ctx.moveTo(-h, h); ctx.lineTo(h, -h); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(h - 3, -h); ctx.lineTo(h, -h); ctx.lineTo(h, -h + 3); ctx.stroke();
                break;
            case 'birds': // wing shape — Birds
                ctx.beginPath();
                ctx.moveTo(-h, 2); ctx.quadraticCurveTo(-2, -h, 0, 0);
                ctx.quadraticCurveTo(2, -h, h, 2);
                ctx.stroke();
                break;
            default: // generic dot
                ctx.beginPath(); ctx.arc(0, 0, h - 1, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    },
};

// Helper: darken/lighten a hex color
function shadeColor(color, amount) {
    let col = color.replace('#', '');
    if (col.length === 3) col = col[0]+col[0]+col[1]+col[1]+col[2]+col[2];
    const num = parseInt(col, 16);
    let r = Math.min(255, Math.max(0, (num >> 16) + amount));
    let g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    let b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}
