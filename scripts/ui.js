// ============================================================
// ui.js - HUD rendering: pip bars, spell info, combo display
// ============================================================

// ELENIN block-letter logo (from the original Elenin game)
// Draws "Elenin" in rectangular block letters at the given position and scale.
function drawEleninLogo(ctx, cx, cy, scale, t) {
    const ninjaColors = [
        { body: '#e33', accent: '#f93' },
        { body: '#a0622a', accent: '#2e9e2e' },
        { body: '#48f', accent: '#8cf' },
        { body: '#726', accent: '#a4e' },
        { body: '#2dd', accent: '#aff' },
        { body: '#8d8', accent: '#bfb' },
    ];

    const letterW = 48;
    const letterH = 64;
    const gap = 14;
    const totalW = 6 * letterW + 5 * gap;
    const startX = -totalW / 2;
    const startY = -letterH / 2;

    const drawE = (x, y, color, accentColor) => {
        const pillar = 12;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, pillar, letterH);
        ctx.fillRect(x + pillar, y, letterW - pillar, 10);
        ctx.fillRect(x + pillar, y + letterH / 2 - 5, (letterW - pillar) * 0.75, 10);
        ctx.fillRect(x + pillar, y + letterH - 10, letterW - pillar, 10);
        ctx.fillStyle = accentColor;
        ctx.fillRect(x + pillar, y, letterW - pillar, 2);
        ctx.fillRect(x + pillar, y + letterH - 2, letterW - pillar, 2);
        ctx.fillRect(x, y, pillar, 2);
    };

    const drawLower_l = (x, y, color, accentColor) => {
        const pillarW = 18;
        const px = x + (letterW - pillarW) / 2;
        ctx.fillStyle = color;
        ctx.fillRect(px, y, pillarW, letterH);
        ctx.fillStyle = accentColor;
        ctx.fillRect(px - 4, y + letterH - 4, pillarW + 8, 4);
        ctx.fillRect(px, y, pillarW, 2);
    };

    const drawLower_e = (x, y, color, accentColor) => {
        const topOff = Math.floor(letterH * 0.28);
        const h = letterH - topOff;
        const yy = y + topOff;
        const pillar = 10;
        ctx.fillStyle = color;
        ctx.fillRect(x, yy, pillar, h);
        ctx.fillRect(x + pillar, yy, letterW - pillar, 8);
        ctx.fillRect(x + pillar, yy + h / 2 - 4, letterW - pillar, 8);
        ctx.fillRect(x + pillar, yy + h - 8, (letterW - pillar) * 0.75, 8);
        ctx.fillRect(x + letterW - pillar, yy, pillar, h / 2 - 4);
        ctx.fillStyle = accentColor;
        ctx.fillRect(x + pillar, yy, letterW - pillar, 2);
        ctx.fillRect(x + pillar, yy + h / 2 - 4, letterW - pillar, 2);
        ctx.fillRect(x, yy, pillar, 2);
    };

    const drawN = (x, y, color, accentColor) => {
        const pillar = 12;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, pillar, letterH);
        ctx.fillRect(x + letterW - pillar, y, pillar, letterH);
        ctx.fillStyle = accentColor;
        const steps = 7;
        for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const bx = x + pillar - 2 + frac * (letterW - pillar * 2 + 4 - 10);
            const by = y + frac * (letterH - 10);
            ctx.fillRect(bx, by, 10, 10);
        }
        ctx.fillRect(x, y, pillar, 2);
        ctx.fillRect(x + letterW - pillar, y + letterH - 2, pillar, 2);
    };

    const drawLower_i = (x, y, color, accentColor) => {
        const topOff = Math.floor(letterH * 0.28);
        const pillarW = 18;
        const px = x + (letterW - pillarW) / 2;
        ctx.fillStyle = color;
        ctx.fillRect(px, y + topOff, pillarW, letterH - topOff);
        ctx.fillStyle = accentColor;
        ctx.fillRect(px - 3, y + letterH - 3, pillarW + 6, 3);
        ctx.fillRect(px, y + topOff, pillarW, 2);
    };

    const drawLower_n = (x, y, color, accentColor) => {
        const topOff = Math.floor(letterH * 0.28);
        const h = letterH - topOff;
        const yy = y + topOff;
        const pillar = 10;
        ctx.fillStyle = color;
        ctx.fillRect(x, yy, pillar, h);
        ctx.fillRect(x + letterW - pillar, yy + 8, pillar, h - 8);
        ctx.fillRect(x + pillar, yy, letterW - pillar * 2, 10);
        ctx.fillStyle = accentColor;
        ctx.fillRect(x + pillar, yy, letterW - pillar * 2, 2);
        ctx.fillRect(x, yy, pillar, 2);
    };

    const letters = [
        { draw: drawE },
        { draw: drawLower_l },
        { draw: drawLower_e },
        { draw: drawN },
        { draw: drawLower_i },
        { draw: drawLower_n },
    ];

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    for (let i = 0; i < 6; i++) {
        const lx = startX + i * (letterW + gap);
        const floatY = t != null ? Math.sin(t * 0.003 + i * 0.8) * 5 : 0;
        const ly = startY + floatY;
        const c = ninjaColors[i];

        // Glow behind each letter
        ctx.save();
        ctx.shadowColor = c.accent;
        ctx.shadowBlur = 15 + (t != null ? Math.sin(t * 0.004 + i) * 5 : 0);
        letters[i].draw(lx, ly, c.body, c.accent);
        ctx.restore();

        // Draw letter again without shadow for clean look
        letters[i].draw(lx, ly, c.body, c.accent);

        // Hat on the "i" (index 4)
        if (i === 4) {
            const hatCx = lx + letterW / 2;
            const hatBaseY = ly + letterH * 0.3 - 4;
            ctx.fillStyle = c.accent;
            ctx.beginPath();
            ctx.moveTo(hatCx - 16, hatBaseY);
            ctx.lineTo(hatCx, hatBaseY - 22);
            ctx.lineTo(hatCx + 16, hatBaseY);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = c.body;
            ctx.fillRect(hatCx - 16, hatBaseY - 2, 32, 4);
        }
    }

    ctx.restore();
}

const UI = {
    // Helper: get font string
    font(weight, size) {
        return weight + ' ' + size + 'px ' + CONFIG.FONT;
    },

    // Draw a vertical smooth bar
    drawPipBar(ctx, x, y, w, h, current, max, fillColor, emptyColor, label, showNum, trailValue) {
        if (max <= 0) return;
        if (showNum === undefined) showNum = true;
        if (trailValue === undefined) trailValue = current;

        const topMargin = showNum ? 34 : 22;
        const botMargin = 6;
        const availH = h - topMargin - botMargin;
        const barX = x + 3;
        const barW = w - 6;
        const barY = y + topMargin;

        // Label
        ctx.fillStyle = '#99aabb';
        ctx.font = this.font('700', 10);
        ctx.textAlign = 'center';
        ctx.fillText(label, x + w / 2, y + 14);

        // Number
        if (showNum) {
            ctx.fillStyle = '#fff';
            ctx.font = this.font('800', 11);
            ctx.fillText(current + '/' + max, x + w / 2, y + 28);
        }

        const frac = Math.max(0, Math.min(1, current / max));
        const trailFrac = Math.max(0, Math.min(1, trailValue / max));
        const fillH = Math.round(availH * frac);
        const trailH = Math.round(availH * trailFrac);

        // Empty background
        ctx.fillStyle = emptyColor;
        ctx.fillRect(barX, barY, barW, availH);

        // Trail (ghost of recent damage)
        if (trailH > fillH) {
            ctx.fillStyle = fillColor === CONFIG.C.HP ? '#ffee55' : '#ff8844';
            ctx.globalAlpha = 0.55;
            ctx.fillRect(barX, barY + availH - trailH, barW, trailH - fillH);
            ctx.globalAlpha = 1;
        }

        // Filled portion (from bottom)
        if (fillH > 0) {
            ctx.fillStyle = fillColor;
            ctx.fillRect(barX, barY + availH - fillH, barW, fillH);

            // Highlight strip on left edge
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(barX, barY + availH - fillH, Math.max(1, Math.floor(barW / 3)), fillH);

            // Low-HP pulsing red overlay
            if (frac <= 0.25) {
                ctx.fillStyle = 'rgba(255,0,0,' + (0.3 + Math.sin(Date.now() / 200) * 0.2) + ')';
                ctx.fillRect(barX, barY + availH - fillH, barW, fillH);
            }
        }

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 1, barY - 1, barW + 2, availH + 2);
    },

    // Draw a small distinct icon for a spell in the slot machine strip
    drawSpellIcon(ctx, x, y, comboKey) {
        const spell = SPELL_DATA[comboKey];
        if (!spell) return;
        const col = AFFINITY_COLORS[spell.affinity] || '#ccc';
        const s = 7;

        ctx.save();
        switch (spell.icon) {
            case 'shuriken':
                Sprites.shuriken(ctx, x - s, y - s, s * 2, Date.now() / 200);
                break;
            case 'sword': {
                // Mini katana — long curved blade
                ctx.translate(x, y);
                ctx.rotate(-0.4);
                // Long blade with slight curve
                ctx.fillStyle = '#ddeeff';
                ctx.beginPath();
                ctx.moveTo(-1, 1);       // base left
                ctx.quadraticCurveTo(-2.5, -8, 0, -16); // curved tip
                ctx.quadraticCurveTo(2.5, -8, 1, 1);    // curved back
                ctx.closePath();
                ctx.fill();
                // Edge highlight
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.quadraticCurveTo(-2.5, -8, 0, -16);
                ctx.stroke();
                // Guard (tsuba) - small oval
                ctx.fillStyle = '#d4a017';
                ctx.beginPath();
                ctx.ellipse(0, 1.5, 4, 1.8, 0, 0, Math.PI * 2);
                ctx.fill();
                // Handle (tsuka)
                ctx.fillStyle = '#442211';
                ctx.fillRect(-1.2, 3, 2.4, 8);
                // Handle wrapping
                ctx.strokeStyle = '#d4a017';
                ctx.lineWidth = 0.8;
                for (let i = 0; i < 3; i++) {
                    const hy = 4 + i * 2.5;
                    ctx.beginPath();
                    ctx.moveTo(-1.2, hy); ctx.lineTo(1.2, hy + 1.2);
                    ctx.stroke();
                }
                break;
            }
            case 'arrow':
                Sprites.arrow(ctx, x - s, y - s, s * 2, 'right');
                break;
            case 'fireball':
                Sprites.fireball(ctx, x - s, y - s, s * 2);
                break;
            case 'iceshard':
                Sprites.iceShard(ctx, x - s, y - s, s * 2);
                break;
            case 'poison':
                Sprites.poisonCloud(ctx, x - s, y - s, s * 2, 0.8);
                break;
            case 'boulder':
                Sprites.boulder(ctx, x - s, y - s, s * 2);
                break;
            case 'enchant_fire':
            case 'enchant_ice':
            case 'enchant_shock': {
                // Colored filled circle with glow
                ctx.shadowColor = col;
                ctx.shadowBlur = 6;
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
            }
            case 'shield': {
                // Pointed kite shield shape
                ctx.fillStyle = '#aaddff';
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(x, y - 8);      // top center
                ctx.lineTo(x + 7, y - 4);  // top-right
                ctx.lineTo(x + 7, y + 1);  // mid-right
                ctx.lineTo(x, y + 9);      // bottom point
                ctx.lineTo(x - 7, y + 1);  // mid-left
                ctx.lineTo(x - 7, y - 4);  // top-left
                ctx.closePath();
                ctx.globalAlpha = 0.6;
                ctx.fill();
                ctx.globalAlpha = 0.9;
                ctx.stroke();
                // Center line
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath();
                ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 7);
                ctx.stroke();
                break;
            }
            case 'invis': {
                // Ghostly faded circle with wisp arcs
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = '#aaccff';
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(200,200,255,0.6)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    const a = (Date.now() / 800 + i * 2.1) % (Math.PI * 2);
                    ctx.beginPath();
                    ctx.arc(x, y, 3 + i * 1.5, a, a + 1);
                    ctx.stroke();
                }
                break;
            }
            case 'deflect': {
                // 3 orbiting mirror shards
                const t = Date.now() / 400;
                for (let i = 0; i < 3; i++) {
                    const a = t + i * (Math.PI * 2 / 3);
                    const dx = Math.cos(a) * 5;
                    const dy = Math.sin(a) * 5;
                    ctx.fillStyle = '#ff69b4';
                    ctx.shadowColor = '#ff69b4';
                    ctx.shadowBlur = 3;
                    ctx.fillRect(x + dx - 1.5, y + dy - 3, 3, 6);
                }
                ctx.shadowBlur = 0;
                break;
            }
            case 'freeze_lane': {
                // 3 small ice shards in a row
                const isz = 8;
                for (let i = -1; i <= 1; i++)
                    Sprites.iceShard(ctx, x + i * 7 - isz / 2, y - isz / 2, isz);
                break;
            }
            case 'burn_lane': {
                // 3 small fireballs in a row
                const fsz = 8;
                for (let i = -1; i <= 1; i++)
                    Sprites.fireball(ctx, x + i * 7 - fsz / 2, y - fsz / 2, fsz);
                break;
            }
            case 'shock_lane': {
                // 3 small lightning bolts in a row
                ctx.strokeStyle = '#ffee00';
                ctx.shadowColor = '#ffee00';
                ctx.shadowBlur = 4;
                ctx.lineWidth = 1.5;
                for (let i = -1; i <= 1; i++) {
                    const bx = x + i * 7;
                    ctx.beginPath();
                    ctx.moveTo(bx, y - 6);
                    ctx.lineTo(bx + 2, y - 1);
                    ctx.lineTo(bx - 1, y + 1);
                    ctx.lineTo(bx + 1, y + 6);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                break;
            }
            case 'vlane_fire':
            case 'vlane_ice':
            case 'vlane_shock': {
                // Vertical bar with element core
                ctx.strokeStyle = col;
                ctx.lineWidth = 2;
                ctx.shadowColor = col;
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.moveTo(x, y - 8);
                ctx.lineTo(x, y + 8);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = col;
                ctx.fill();
                // Small horizontal ticks
                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(x - 3, y + i * 5);
                    ctx.lineTo(x + 3, y + i * 5);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                break;
            }
            default:
                // Summons — use bigger size so details are legible
                Sprites.summon(ctx, x - 10, y - 10, 20, col, spell.icon, 1, 'right');
                break;
        }
        ctx.restore();
    },

    // Draw the combo orb display (overlaid at bottom-center of field)
    drawComboOrbs(ctx, combo, postCastProgress) {
        const cx = CONFIG.WIDTH / 2;
        const cy = CONFIG.FIELD_BOTTOM - 30;
        const orbR = 14;
        const spacing = 44;
        const colors = { 'Z': CONFIG.C.ORB_Z, 'X': CONFIG.C.ORB_X, 'C': CONFIG.C.ORB_C };
        const isCooling = postCastProgress > 0;

        // Compact background pill
        Sprites.roundRect(ctx, cx - 78, cy - 22, 156, 44, 10, 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.06)');

        // Post-cast cooldown sweep bar behind orbs
        if (isCooling) {
            ctx.save();
            ctx.globalAlpha = 0.2;
            const barW = 140 * postCastProgress;
            Sprites.roundRect(ctx, cx - 70, cy - 18, barW, 36, 6, 'rgba(255,255,255,0.08)', null);
            ctx.restore();
        }

        for (let i = 0; i < 3; i++) {
            const ox = cx + (i - 1) * spacing;
            const filled = i < combo.length;
            const orbColor = filled ? colors[combo[i]] : null;

            if (isCooling && filled) {
                ctx.save();
                ctx.globalAlpha = 0.35 + postCastProgress * 0.6;
                Sprites.orb(ctx, ox, cy, orbR, orbColor, true);
                ctx.restore();
            } else {
                Sprites.orb(ctx, ox, cy, orbR, orbColor || '#333', filled);
            }

            // Letter below orb
            ctx.font = this.font('700', 9);
            ctx.textAlign = 'center';
            if (filled) {
                ctx.save();
                if (isCooling) ctx.globalAlpha = 0.3 + postCastProgress * 0.6;
                ctx.fillStyle = orbColor;
                ctx.fillText(combo[i], ox, cy + orbR + 10);
                ctx.restore();
            } else {
                ctx.fillStyle = '#444';
                ctx.fillText('?', ox, cy + orbR + 10);
            }
        }

        // Slot machine hint strip centered above the orbs
        if (!isCooling) {
            const depth = combo.length;
            if (depth < 3) {
                const prefix = combo.join('');
                const keys = ['Z', 'X', 'C'];

                const slotW = 34;
                const slotH = 20;
                const slotGap = 2;
                const totalW = slotW * 3 + slotGap * 2;
                const sx = cx - totalW / 2;
                const sy = cy - orbR - 26;

                // Slot background pill
                Sprites.roundRect(ctx, sx - 2, sy - 1, totalW + 4, slotH + 2, 5, 'rgba(0,0,0,0.45)', 'rgba(255,255,255,0.06)');

                for (let k = 0; k < 3; k++) {
                    const comboKey = prefix + keys[k].repeat(3 - depth);
                    const lx = sx + k * (slotW + slotGap) + slotW / 2;
                    const ly = sy + slotH / 2;

                    ctx.globalAlpha = 0.65;
                    this.drawSpellIcon(ctx, lx, ly, comboKey);
                    ctx.globalAlpha = 1;
                }

                // Divider lines between slots
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                for (let d = 1; d < 3; d++) {
                    const dx = sx + d * (slotW + slotGap) - slotGap / 2;
                    ctx.beginPath(); ctx.moveTo(dx, sy + 2); ctx.lineTo(dx, sy + slotH - 2); ctx.stroke();
                }
            }
        }
    },

    // === FIGHTING GAME TOP BARS (HP, Loyalty, Stamina) ===
    _drawHBar(ctx, x, w, y, h, frac, trailFrac, color, trailColor, fromRight, alpha) {
        const a = alpha !== undefined ? alpha : 1;
        ctx.globalAlpha = a;
        // Empty track
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(x, y, w, h);
        const fillW = Math.round(w * frac);
        const tW = Math.round(w * trailFrac);
        // Trail ghost
        if (tW > fillW) {
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = trailColor;
            if (fromRight) ctx.fillRect(x + w - tW, y, tW - fillW, h);
            else ctx.fillRect(x + fillW, y, tW - fillW, h);
            ctx.globalAlpha = 1;
        }
        // Filled
        if (fillW > 0) {
            ctx.fillStyle = color;
            if (fromRight) ctx.fillRect(x + w - fillW, y, fillW, h);
            else ctx.fillRect(x, y, fillW, h);
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            if (fromRight) ctx.fillRect(x + w - fillW, y, fillW, Math.max(1, h / 3));
            else ctx.fillRect(x, y, fillW, Math.max(1, h / 3));
            // Low pulse
            if (frac <= 0.25) {
                ctx.fillStyle = 'rgba(255,0,0,' + (0.25 + Math.sin(Date.now() / 180) * 0.15) + ')';
                if (fromRight) ctx.fillRect(x + w - fillW, y, fillW, h);
                else ctx.fillRect(x, y, fillW, h);
            }
        }
        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
        ctx.globalAlpha = 1;
    },

    drawFightingBars(ctx, player, enemy, enemyData) {
        // Semi-transparent panel background — overlays the field
        ctx.fillStyle = 'rgba(22, 33, 62, 0.72)';
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.TOP_BAR);
        const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.TOP_BAR);
        grad.addColorStop(0, 'rgba(255,255,255,0.04)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.TOP_BAR);

        const cx = CONFIG.WIDTH / 2;
        const gap = 38;  // center gap for VS badge
        const margin = 6;
        const fullW = cx - gap - margin;  // max bar width

        // Proportionate widths: HP = full, Loyalty = 80%, Stamina = 55%
        const hpW  = fullW;
        const loyW = Math.floor(fullW * 0.80);
        const staW = Math.floor(fullW * 0.40);

        // Player bars fill right-to-left (left side, anchored at right edge toward center)
        const pHpX  = cx - gap - hpW;
        const pLoyX = cx - gap - loyW;
        const pStaX = cx - gap - staW;
        // Enemy bars fill left-to-right (right side, anchored at left edge from center)
        const eX = cx + gap;

        // --- Names at the very top ---
        ctx.font = this.font('800', 11);
        ctx.textAlign = 'left';
        ctx.fillStyle = CONFIG.C.PLAYER;
        ctx.fillText('YOU', pHpX + 2, 11);
        ctx.textAlign = 'right';
        ctx.fillStyle = AFFINITY_COLORS[enemyData.affinity] || '#ff6644';
        ctx.fillText(enemyData.name || 'ENEMY', eX + hpW - 2, 11);

        // --- Center VS badge ---
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = this.font('900', 16);
        ctx.textAlign = 'center';
        ctx.fillText('VS', cx, 12);

        // === Row 1: HP — largest and longest bar ===
        const hpY = 15, hpH = 16;
        const pHpFrac = Math.max(0, Math.min(1, player.hp / player.maxHp));
        const pHpTrail = Math.max(0, Math.min(1, player.trailHp / player.maxHp));
        const eHpFrac = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
        const eHpTrail = Math.max(0, Math.min(1, enemy.trailHp / enemy.maxHp));

        this._drawHBar(ctx, pHpX, hpW, hpY, hpH, pHpFrac, pHpTrail, CONFIG.C.HP, '#ffee55', true, 0.85);
        this._drawHBar(ctx, eX, hpW, hpY, hpH, eHpFrac, eHpTrail, CONFIG.C.HP, '#ffee55', false, 0.85);

        // === Row 2: Loyalty — shorter bar ===
        const loyY = 33, loyH = 10;
        const pLoyFrac = Math.max(0, Math.min(1, player.loyalty / player.maxLoyalty));
        const pLoyTrail = Math.max(0, Math.min(1, player.trailLoyalty / player.maxLoyalty));
        const eLoyFrac = Math.max(0, Math.min(1, enemy.loyalty / enemy.maxLoyalty));
        const eLoyTrail = Math.max(0, Math.min(1, enemy.trailLoyalty / enemy.maxLoyalty));

        this._drawHBar(ctx, pLoyX, loyW, loyY, loyH, pLoyFrac, pLoyTrail, CONFIG.C.LOYALTY, '#ff8844', true, 0.8);
        this._drawHBar(ctx, eX, loyW, loyY, loyH, eLoyFrac, eLoyTrail, CONFIG.C.LOYALTY, '#ff8844', false, 0.8);

        // === Row 3: Stamina — chonky but short ===
        const staY = 44, staH = 7;
        const pStaFrac = Math.max(0, Math.min(1, player.stamina / player.maxStamina));
        const eStaFrac = Math.max(0, Math.min(1, enemy.stamina / enemy.maxStamina));

        const staColor = (frac, blocking) => {
            if (blocking) return '#44aadd';
            if (frac > 0.5) return '#44dd66';
            if (frac > 0.25) return '#ddcc44';
            return '#dd6622';
        };

        this._drawHBar(ctx, pStaX, staW, staY, staH, pStaFrac, pStaFrac, staColor(pStaFrac, player.blocking), staColor(pStaFrac, player.blocking), true, 0.75);
        this._drawHBar(ctx, eX, staW, staY, staH, eStaFrac, eStaFrac, staColor(eStaFrac, false), staColor(eStaFrac, false), false, 0.75);

        // Key hints (bottom of top bar)
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = this.font('400', 9);
        ctx.textAlign = 'center';
        ctx.fillText('\u2190\u2192\u2191\u2193 Move   Z X C Cast   M Mute', cx, CONFIG.TOP_BAR - 6);

        // Mute indicator
        if (typeof AudioEngine !== 'undefined' && AudioEngine.isMuted()) {
            ctx.fillStyle = '#ff5555';
            ctx.font = this.font('700', 10);
            ctx.textAlign = 'right';
            ctx.fillText('\uD83D\uDD07 MUTED', CONFIG.WIDTH - 8, CONFIG.TOP_BAR - 6);
        }

        // Bottom separator (subtle, since bars overlay the field)
        ctx.strokeStyle = CONFIG.C.ACCENT;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, CONFIG.TOP_BAR - 1);
        ctx.lineTo(CONFIG.WIDTH, CONFIG.TOP_BAR - 1);
        ctx.stroke();
        ctx.globalAlpha = 1;
    },

    // Draw cooldown indicators (overlaid at bottom corners of field)
    drawCooldowns(ctx, fighter, side) {
        const x = side === 'left' ? CONFIG.FIELD_LEFT + 5 : CONFIG.FIELD_RIGHT - 70;
        let y = CONFIG.FIELD_BOTTOM - 55;

        ctx.font = this.font('600', 8);
        ctx.textAlign = 'left';
        let count = 0;
        for (const key in fighter.cooldowns) {
            if (count >= 4) break;
            const remaining = Math.ceil(fighter.cooldowns[key] / 1000);
            const spell = SPELL_DATA[key];
            if (!spell) continue;
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillText(spell.name.slice(0, 10) + ' ' + remaining + 's', x, y + count * 12);
            count++;
        }
    },

    // Draw last spell used (small pill overlaid at bottom corners of field)
    drawLastSpell(ctx, lastSpell, side) {
        if (!lastSpell) return;
        const spell = SPELL_DATA[lastSpell.comboKey];
        if (!spell) return;

        const isLeft = side === 'left';
        const alpha = Math.min(1, lastSpell.timer / 500); // fade out in last 500ms
        const px = isLeft ? 8 : CONFIG.WIDTH - 128;
        const py = CONFIG.FIELD_BOTTOM - 28;

        ctx.save();
        ctx.globalAlpha = alpha * 0.85;

        // Background pill
        Sprites.roundRect(ctx, px, py, 120, 24, 6, 'rgba(0,0,0,0.45)', 'rgba(255,255,255,0.04)');

        // Combo keys (colored orbs)
        const orbColors = { 'Z': CONFIG.C.ORB_Z, 'X': CONFIG.C.ORB_X, 'C': CONFIG.C.ORB_C };
        const comboStr = lastSpell.comboKey;
        for (let i = 0; i < comboStr.length; i++) {
            const ch = comboStr[i];
            const ox = px + 9 + i * 15;
            const oy = py + 12;
            // Small orb circle
            ctx.fillStyle = orbColors[ch] || '#888';
            ctx.beginPath();
            ctx.arc(ox, oy, 5, 0, Math.PI * 2);
            ctx.fill();
            // Letter
            ctx.fillStyle = '#fff';
            ctx.font = this.font('800', 7);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ch, ox, oy + 1);
        }

        // Spell name
        ctx.fillStyle = AFFINITY_COLORS[spell.affinity] || '#ddd';
        ctx.font = this.font('700', 9);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(spell.name, px + 52, py + 4);

        // Type label
        ctx.fillStyle = CATEGORY_COLORS[spell.category] || '#888';
        ctx.font = this.font('400', 7);
        ctx.fillText(spell.type.toUpperCase(), px + 52, py + 15);

        ctx.restore();
    },

};
