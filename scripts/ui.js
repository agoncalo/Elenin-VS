// ============================================================
// ui.js - HUD rendering: pip bars, spell info, combo display
// ============================================================
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
    drawComboOrbs(ctx, combo) {
        const cx = CONFIG.WIDTH / 2;
        const cy = CONFIG.HEIGHT - CONFIG.BOTTOM_PANEL + 32;
        const orbR = 18;
        const spacing = 54;
        const colors = { 'Z': CONFIG.C.ORB_Z, 'X': CONFIG.C.ORB_X, 'C': CONFIG.C.ORB_C };

        // Background
        Sprites.roundRect(ctx, cx - 95, cy - 30, 190, 60, 12, 'rgba(0,0,0,0.6)', 'rgba(255,255,255,0.08)');

        for (let i = 0; i < 3; i++) {
            const ox = cx + (i - 1) * spacing;
            const filled = i < combo.length;
            const orbColor = filled ? colors[combo[i]] : null;
            Sprites.orb(ctx, ox, cy, orbR, orbColor || '#333', filled);

            // Letter below orb
            ctx.font = this.font('700', 11);
            ctx.textAlign = 'center';
            if (filled) {
                ctx.fillStyle = orbColor;
                ctx.fillText(combo[i], ox, cy + orbR + 14);
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

        // "VS" centered badge
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = this.font('800', 18);
        ctx.textAlign = 'center';
        ctx.fillText('VS', CONFIG.WIDTH / 2, 24);

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
        ctx.fillText('\u2190 \u2192 \u2191 \u2193 Move    Z X C Cast', CONFIG.WIDTH / 2, 44);

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
    drawHistory(ctx, history, side) {
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
            ctx.fillStyle = AFFINITY_COLORS[spell.affinity] || '#aaa';
            ctx.font = this.font('400', 10);
            ctx.fillText(spell.name.slice(0, 14), panelX + 40, ly);
        }
        ctx.globalAlpha = 1;
    },
};
