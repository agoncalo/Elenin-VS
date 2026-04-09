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

    // Draw a vertical Megaman-style pip bar
    drawPipBar(ctx, x, y, w, h, current, max, fillColor, emptyColor, label, showNum) {
        if (max <= 0) return;
        if (showNum === undefined) showNum = true;

        const topMargin = showNum ? 34 : 22;
        const botMargin = 6;
        const availH = h - topMargin - botMargin;
        const gap = 2;
        const maxPips = Math.min(max, Math.floor(availH / (5 + gap)));
        const pipsToShow = Math.max(1, maxPips);
        const pipH = Math.floor((availH - (pipsToShow - 1) * gap) / pipsToShow);
        const startY = y + topMargin;

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

        // Pips
        const filledPips = current <= 0 ? 0 : current >= max ? pipsToShow : Math.round((current / max) * pipsToShow);

        for (let i = 0; i < pipsToShow; i++) {
            const py = y + h - botMargin - (i + 1) * pipH - i * gap;
            const filled = i < filledPips;
            const col = filled ? fillColor : emptyColor;

            ctx.fillStyle = col;
            ctx.fillRect(x + 3, py, w - 6, pipH);

            if (filled) {
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.fillRect(x + 3, py, w - 6, Math.max(1, Math.floor(pipH / 3)));
            }

            if (filled && current <= max * 0.25) {
                ctx.fillStyle = 'rgba(255,0,0,' + (0.3 + Math.sin(Date.now() / 200) * 0.2) + ')';
                ctx.fillRect(x + 3, py, w - 6, pipH);
            }
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + topMargin - 1, w - 4, availH + 2);
    },

    // Draw the combo orb display (bottom center)
    drawComboOrbs(ctx, combo, postCastProgress) {
        const cx = CONFIG.WIDTH / 2;
        const cy = CONFIG.HEIGHT - CONFIG.BOTTOM_PANEL + 32;
        const orbR = 18;
        const spacing = 54;
        const colors = { 'Z': CONFIG.C.ORB_Z, 'X': CONFIG.C.ORB_X, 'C': CONFIG.C.ORB_C };
        const isCooling = postCastProgress > 0;

        // Background
        Sprites.roundRect(ctx, cx - 95, cy - 30, 190, 60, 12, 'rgba(0,0,0,0.6)', 'rgba(255,255,255,0.08)');

        // Post-cast cooldown sweep bar behind orbs
        if (isCooling) {
            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#fff';
            const barW = 170 * postCastProgress;
            Sprites.roundRect(ctx, cx - 85, cy - 24, barW, 48, 8, 'rgba(255,255,255,0.1)', null);
            ctx.restore();
        }

        for (let i = 0; i < 3; i++) {
            const ox = cx + (i - 1) * spacing;
            const filled = i < combo.length;
            const orbColor = filled ? colors[combo[i]] : null;

            if (isCooling && filled) {
                // Fading out the last combo orbs
                ctx.save();
                ctx.globalAlpha = 0.35 + postCastProgress * 0.6;
                Sprites.orb(ctx, ox, cy, orbR, orbColor, true);
                ctx.restore();
            } else {
                Sprites.orb(ctx, ox, cy, orbR, orbColor || '#333', filled);
            }

            // Letter below orb
            ctx.font = this.font('700', 11);
            ctx.textAlign = 'center';
            if (filled) {
                ctx.save();
                if (isCooling) ctx.globalAlpha = 0.3 + postCastProgress * 0.6;
                ctx.fillStyle = orbColor;
                ctx.fillText(combo[i], ox, cy + orbR + 14);
                ctx.restore();
            } else {
                ctx.fillStyle = '#555';
                ctx.fillText('?', ox, cy + orbR + 14);
            }
        }

        // Instruction text
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = this.font('400', 9);
        ctx.textAlign = 'center';
        ctx.fillText('Z  X  C', cx, cy + orbR + 28);
    },

    // Draw spell info panel (after casting)
    drawSpellInfo(ctx, spellInfo) {
        if (!spellInfo) return;
        const x = CONFIG.WIDTH / 2 - 155;
        const y = CONFIG.HEIGHT - 72;

        Sprites.roundRect(ctx, x, y, 310, 56, 10, 'rgba(0,0,0,0.7)', 'rgba(255,255,255,0.08)');

        const spell = SPELL_DATA[spellInfo.comboKey];
        if (!spell) return;

        // Combo key display
        const orbColors = { 'Z': CONFIG.C.ORB_Z, 'X': CONFIG.C.ORB_X, 'C': CONFIG.C.ORB_C };
        const comboStr = spellInfo.comboKey;
        for (let i = 0; i < comboStr.length; i++) {
            const ch = comboStr[i];
            const ox = x + 250 + i * 20;
            ctx.fillStyle = orbColors[ch] || '#fff';
            ctx.font = this.font('800', 15);
            ctx.textAlign = 'center';
            ctx.fillText(ch, ox, y + 20);
        }

        // Spell name
        ctx.fillStyle = AFFINITY_COLORS[spell.affinity] || '#fff';
        ctx.font = this.font('700', 14);
        ctx.textAlign = 'left';
        ctx.fillText(spell.name, x + 12, y + 20);

        // Damage
        const stats = spellInfo.stats;
        if (stats.dmg) {
            ctx.fillStyle = '#ff7777';
            ctx.font = this.font('600', 11);
            ctx.fillText('DMG ' + stats.dmg, x + 12, y + 38);
        }

        // Affinity
        if (spell.affinity !== 'none') {
            ctx.fillStyle = AFFINITY_COLORS[spell.affinity];
            ctx.font = this.font('600', 11);
            ctx.fillText(spell.affinity.toUpperCase(), x + 100, y + 38);
        }

        // Type
        ctx.fillStyle = CATEGORY_COLORS[spell.category] || '#888';
        ctx.font = this.font('400', 10);
        ctx.fillText(spell.type.toUpperCase(), x + 12, y + 51);
    },

    // Draw the top bar (enemy info)
    drawTopBar(ctx, enemyData) {
        // Background with gradient feel
        ctx.fillStyle = CONFIG.C.PANEL;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.TOP_BAR);

        // Subtle gradient overlay
        const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.TOP_BAR);
        grad.addColorStop(0, 'rgba(255,255,255,0.04)');
        grad.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.TOP_BAR);

        // "ELENIN" block-letter logo + "VS" badge centered
        drawEleninLogo(ctx, CONFIG.WIDTH / 2 - 14, 22, 0.32, null);
        // "VS" badge to the right of the logo
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = this.font('800', 16);
        ctx.textAlign = 'left';
        ctx.fillText('VS', CONFIG.WIDTH / 2 + 48, 26);

        // Player side label
        ctx.fillStyle = CONFIG.C.PLAYER;
        ctx.font = this.font('700', 13);
        ctx.textAlign = 'left';
        ctx.fillText('YOU', 80, 20);

        // Enemy name & title
        ctx.fillStyle = AFFINITY_COLORS[enemyData.affinity] || '#fff';
        ctx.font = this.font('700', 14);
        ctx.textAlign = 'right';
        ctx.fillText(enemyData.name, CONFIG.WIDTH - 80, 20);
        ctx.fillStyle = '#99aabb';
        ctx.font = this.font('400', 11);
        ctx.fillText(enemyData.title, CONFIG.WIDTH - 80, 36);

        // Key hints
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = this.font('400', 10);
        ctx.textAlign = 'center';
        ctx.fillText('\u2190 \u2192 \u2191 \u2193 Move    Z X C Cast    M Mute', CONFIG.WIDTH / 2, 44);

        // Mute indicator
        if (typeof AudioEngine !== 'undefined' && AudioEngine.isMuted()) {
            ctx.fillStyle = '#ff5555';
            ctx.font = this.font('700', 11);
            ctx.textAlign = 'right';
            ctx.fillText('\uD83D\uDD07 MUTED', CONFIG.WIDTH - 8, 44);
        }

        // Separator line
        ctx.strokeStyle = CONFIG.C.ACCENT;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, CONFIG.TOP_BAR - 1);
        ctx.lineTo(CONFIG.WIDTH, CONFIG.TOP_BAR - 1);
        ctx.stroke();
        ctx.globalAlpha = 1;
    },

    // Draw cooldown indicators
    drawCooldowns(ctx, fighter, side) {
        const x = side === 'left' ? CONFIG.FIELD_LEFT + 5 : CONFIG.FIELD_RIGHT - 70;
        let y = CONFIG.FIELD_BOTTOM + 5;

        ctx.font = this.font('600', 9);
        ctx.textAlign = 'left';
        let count = 0;
        for (const key in fighter.cooldowns) {
            if (count >= 4) break;
            const remaining = Math.ceil(fighter.cooldowns[key] / 1000);
            const spell = SPELL_DATA[key];
            if (!spell) continue;
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText(spell.name.slice(0, 10) + ' ' + remaining + 's', x, y + count * 13);
            count++;
        }
    },

    // Draw recent cast history
    drawHistory(ctx, history, side, fighter) {
        if (!history || history.length === 0) return;

        const isLeft = side === 'left';
        const panelX = isLeft ? 8 : CONFIG.WIDTH - 200;
        const panelY = CONFIG.HEIGHT - CONFIG.BOTTOM_PANEL + 4;
        const lineH = 16;
        const maxShow = Math.min(history.length, 8);

        // Header
        ctx.fillStyle = isLeft ? CONFIG.C.PLAYER : CONFIG.C.ENEMY;
        ctx.font = this.font('700', 9);
        ctx.textAlign = 'left';
        ctx.fillText(isLeft ? 'YOUR CASTS' : 'ENEMY CASTS', panelX, panelY + 10);

        const orbColors = { 'Z': CONFIG.C.ORB_Z, 'X': CONFIG.C.ORB_X, 'C': CONFIG.C.ORB_C };

        for (let i = 0; i < maxShow; i++) {
            const entry = history[i];
            const spell = SPELL_DATA[entry.comboKey];
            if (!spell) continue;

            const ly = panelY + 20 + i * lineH;
            const alpha = 1 - i * 0.09;
            ctx.globalAlpha = alpha;

            // Combo keys (colored)
            for (let k = 0; k < entry.comboKey.length; k++) {
                const ch = entry.comboKey[k];
                ctx.fillStyle = orbColors[ch] || '#888';
                ctx.font = this.font('800', 10);
                ctx.fillText(ch, panelX + k * 12, ly);
            }

            // Spell name
            const onCd = fighter && fighter.cooldowns[entry.comboKey];
            ctx.fillStyle = onCd ? 'rgba(255,255,255,0.3)' : (AFFINITY_COLORS[spell.affinity] || '#aaa');
            ctx.font = this.font('400', 10);
            ctx.fillText(spell.name.slice(0, 14), panelX + 40, ly);

            // Cooldown bar
            const barX = panelX + 140;
            const barY = ly - 8;
            const barW = 46;
            const barH = 7;
            const r = 3;
            if (onCd) {
                const maxCd = spell.stats.cd || 1000;
                const ratio = Math.min(1, onCd / maxCd);
                // Track
                Sprites.roundRect(ctx, barX, barY, barW, barH, r, 'rgba(255,255,255,0.07)', null);
                // Fill (drains left to right)
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(barX + r, barY);
                ctx.arcTo(barX + barW, barY, barX + barW, barY + barH, r);
                ctx.arcTo(barX + barW, barY + barH, barX, barY + barH, r);
                ctx.arcTo(barX, barY + barH, barX, barY, r);
                ctx.arcTo(barX, barY, barX + barW, barY, r);
                ctx.closePath();
                ctx.clip();
                ctx.fillStyle = ratio > 0.5 ? '#cc4444' : '#dd8833';
                ctx.fillRect(barX, barY, barW * ratio, barH);
                ctx.restore();
            } else {
                // Ready — full green bar
                Sprites.roundRect(ctx, barX, barY, barW, barH, r, 'rgba(80,220,120,0.35)', null);
            }
        }
        ctx.globalAlpha = 1;
    },
};
