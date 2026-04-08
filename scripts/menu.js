// ============================================================
// menu.js - Main menu, spell list, enemy select, defeat screen
// ============================================================
function menuFont(weight, size) {
    return weight + ' ' + size + 'px ' + CONFIG.FONT;
}

class MenuScene {
    constructor(input) {
        this.input = input;
        this.selected = 0;
        this.options = ['Fight', 'Spells', 'Skins'];
        this.titlePulse = 0;
    }

    update(dt) {
        this.titlePulse += dt * 0.003;
        if (this.input.wasPressed('ArrowUp')) this.selected = (this.selected - 1 + this.options.length) % this.options.length;
        if (this.input.wasPressed('ArrowDown')) this.selected = (this.selected + 1) % this.options.length;
        if (this.input.wasPressed('Enter') || this.input.wasPressed('KeyZ')) {
            return this.options[this.selected];
        }
        return null;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.C.BG;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        // Decorative background lines
        ctx.strokeStyle = 'rgba(233,69,96,0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            const yy = 30 + i * 32;
            ctx.beginPath();
            ctx.moveTo(0, yy); ctx.lineTo(CONFIG.WIDTH, yy);
            ctx.stroke();
        }

        // Title
        const pulse = Math.sin(this.titlePulse) * 0.08 + 1;
        ctx.save();
        ctx.translate(CONFIG.WIDTH / 2, 150);
        ctx.scale(pulse, pulse);

        // Title shadow
        ctx.fillStyle = 'rgba(233,69,96,0.3)';
        ctx.font = menuFont('800', 52);
        ctx.textAlign = 'center';
        ctx.fillText('ELENIN VS', 2, 2);

        // Title main
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.fillText('ELENIN VS', 0, 0);

        ctx.fillStyle = '#99aabb';
        ctx.font = menuFont('400', 16);
        ctx.fillText('Ninja Spell Combat', 0, 35);
        ctx.restore();

        // Menu options
        this.options.forEach((opt, i) => {
            const y = 290 + i * 56;
            const sel = i === this.selected;

            if (sel) {
                Sprites.roundRect(ctx, CONFIG.WIDTH / 2 - 130, y - 24, 260, 42, 8, 'rgba(233,69,96,0.15)', CONFIG.C.ACCENT);
                // Arrow indicator
                ctx.fillStyle = CONFIG.C.ACCENT;
                ctx.font = menuFont('700', 20);
                ctx.textAlign = 'right';
                ctx.fillText('\u25B6', CONFIG.WIDTH / 2 - 100, y + 2);
            }

            ctx.fillStyle = sel ? '#fff' : '#667788';
            ctx.font = menuFont(sel ? '700' : '400', sel ? 24 : 20);
            ctx.textAlign = 'center';
            ctx.fillText(opt, CONFIG.WIDTH / 2, y + 2);
        });

        // Footer
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = menuFont('400', 12);
        ctx.textAlign = 'center';
        ctx.fillText('\u2191 \u2193 Navigate    Z / Enter Select', CONFIG.WIDTH / 2, CONFIG.HEIGHT - 30);
    }
}

// ---- Spell List ----
class SpellListScene {
    constructor(input) {
        this.input = input;
        this.selected = 0;
        this.scrollY = 0;
    }

    update(dt) {
        if (this.input.wasPressed('ArrowUp')) this.selected = Math.max(0, this.selected - 1);
        if (this.input.wasPressed('ArrowDown')) this.selected = Math.min(ALL_COMBOS.length - 1, this.selected + 1);
        if (this.input.wasPressed('Escape') || this.input.wasPressed('Backspace')) return 'back';

        // Smooth scroll to keep selected visible
        const targetY = this.selected * 52 - 200;
        this.scrollY += (targetY - this.scrollY) * 0.15;

        return null;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.C.BG;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        // Header
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = menuFont('800', 24);
        ctx.textAlign = 'center';
        ctx.fillText('SPELL COMPENDIUM', CONFIG.WIDTH / 2, 35);
        ctx.fillStyle = '#99aabb';
        ctx.font = menuFont('400', 12);
        ctx.fillText('\u2191\u2193 Browse  |  ESC Back', CONFIG.WIDTH / 2, 55);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 70, CONFIG.WIDTH, CONFIG.HEIGHT - 70);
        ctx.clip();
        ctx.translate(0, -this.scrollY);

        const orbColors = { 'Z': CONFIG.C.ORB_Z, 'X': CONFIG.C.ORB_X, 'C': CONFIG.C.ORB_C };

        ALL_COMBOS.forEach((key, i) => {
            const spell = SPELL_DATA[key];
            const stats = spell.stats;
            const y = 80 + i * 52;
            const sel = i === this.selected;

            if (sel) {
                Sprites.roundRect(ctx, 40, y - 4, CONFIG.WIDTH - 80, 46, 8,
                    'rgba(233,69,96,0.12)', CONFIG.C.ACCENT);
            }

            // Combo keys
            for (let k = 0; k < key.length; k++) {
                ctx.fillStyle = orbColors[key[k]] || '#888';
                ctx.font = menuFont('800', 14);
                ctx.textAlign = 'left';
                ctx.fillText(key[k], 55 + k * 16, y + 16);
            }

            // Spell name
            ctx.fillStyle = AFFINITY_COLORS[spell.affinity] || '#fff';
            ctx.font = menuFont('700', 15);
            ctx.fillText(spell.name, 120, y + 16);

            // Type/Category
            ctx.fillStyle = CATEGORY_COLORS[spell.category] || '#888';
            ctx.font = menuFont('400', 11);
            ctx.fillText(spell.type.toUpperCase(), 310, y + 16);

            // Affinity
            if (spell.affinity !== 'none') {
                ctx.fillStyle = AFFINITY_COLORS[spell.affinity];
                ctx.fillText(spell.affinity.toUpperCase(), 420, y + 16);
            }

            // Key stats
            let statStr = '';
            if (stats.dmg) statStr += 'DMG:' + stats.dmg + ' ';
            if (stats.hp) statStr += 'HP:' + stats.hp + ' ';
            if (stats.cd) statStr += 'CD:' + (stats.cd / 1000).toFixed(1) + 's ';
            ctx.fillStyle = '#99aabb';
            ctx.font = menuFont('400', 10);
            ctx.fillText(statStr, 520, y + 16);

            // Description on selected
            if (sel) {
                ctx.fillStyle = '#99aabb';
                ctx.font = menuFont('400', 11);
                ctx.fillText(spell.desc, 55, y + 38);

                let extStr = '';
                if (stats.duration) extStr += 'DUR:' + (stats.duration / 1000).toFixed(1) + 's ';
                if (stats.burnDmg) extStr += 'BURN:' + stats.burnDmg + ' ';
                if (stats.freezeDur) extStr += 'FREEZE:' + (stats.freezeDur / 1000).toFixed(1) + 's ';
                if (stats.stunDur) extStr += 'STUN:' + (stats.stunDur / 1000).toFixed(1) + 's ';
                if (stats.healAmt) extStr += 'HEAL:' + stats.healAmt + ' ';
                if (extStr) {
                    ctx.fillStyle = '#778899';
                    ctx.fillText(extStr, 500, y + 38);
                }
            }
        });

        ctx.restore();
    }
}

// ---- Enemy Select ----
class EnemySelectScene {
    constructor(input) {
        this.input = input;
        this.selected = 0;
    }

    update(dt) {
        if (this.input.wasPressed('ArrowUp')) this.selected = (this.selected - 1 + ENEMIES.length) % ENEMIES.length;
        if (this.input.wasPressed('ArrowDown')) this.selected = (this.selected + 1) % ENEMIES.length;
        if (this.input.wasPressed('Escape') || this.input.wasPressed('Backspace')) return 'back';
        if (this.input.wasPressed('Enter') || this.input.wasPressed('KeyZ')) {
            return { action: 'start', enemy: ENEMIES[this.selected] };
        }
        return null;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.C.BG;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        // Decorative bg
        ctx.strokeStyle = 'rgba(233,69,96,0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 70 + i * 28); ctx.lineTo(CONFIG.WIDTH, 70 + i * 28);
            ctx.stroke();
        }

        // Title
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = menuFont('800', 22);
        ctx.textAlign = 'center';
        ctx.fillText('CHOOSE YOUR OPPONENT', CONFIG.WIDTH / 2, 35);
        ctx.fillStyle = '#99aabb';
        ctx.font = menuFont('400', 12);
        ctx.fillText('\u2191\u2193 Browse    Z/Enter Fight    ESC Back', CONFIG.WIDTH / 2, 55);

        // Enemy list (left side)
        const listX = 30;
        const listW = 360;
        ENEMIES.forEach((enemy, i) => {
            const y = 75 + i * 62;
            const sel = i === this.selected;

            if (sel) {
                Sprites.roundRect(ctx, listX, y, listW, 54, 8,
                    'rgba(233,69,96,0.15)', CONFIG.C.ACCENT);
            }

            // Color bar
            ctx.fillStyle = enemy.color;
            Sprites.roundRect(ctx, listX + 8, y + 8, 4, 38, 2, enemy.color);

            // Name & title
            ctx.fillStyle = sel ? '#fff' : '#778899';
            ctx.font = menuFont(sel ? '700' : '400', 14);
            ctx.textAlign = 'left';
            ctx.fillText(enemy.name, listX + 22, y + 24);
            ctx.fillStyle = sel ? enemy.color : '#556677';
            ctx.font = menuFont('400', 11);
            ctx.fillText(enemy.title, listX + 22, y + 42);

            // Affinity badge
            ctx.fillStyle = AFFINITY_COLORS[enemy.affinity] || '#888';
            ctx.font = menuFont('600', 10);
            ctx.textAlign = 'right';
            ctx.fillText(enemy.affinity.toUpperCase(), listX + listW - 10, y + 24);

            // Spell count
            ctx.fillStyle = '#667788';
            ctx.font = menuFont('400', 10);
            ctx.fillText(enemy.spells.length + ' spells', listX + listW - 10, y + 42);
        });

        // Detail panel (right side)
        const panelX = 420;
        const panelY = 75;
        const panelW = 510;
        const panelH = 510;
        Sprites.roundRect(ctx, panelX, panelY, panelW, panelH, 12, 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.06)');

        const sel = ENEMIES[this.selected];

        // Enemy ninja preview
        const enemySkin = PLAYER_SKINS.find(s => s.unlockEnemy === sel.id);
        Sprites.ninja(ctx, panelX + panelW / 2 - 32, panelY + 20, 64, sel.color, 'left', { face: enemySkin ? enemySkin.face : 'angry', skin: enemySkin || null });

        // Name
        ctx.fillStyle = sel.color;
        ctx.font = menuFont('800', 22);
        ctx.textAlign = 'center';
        ctx.fillText(sel.name, panelX + panelW / 2, panelY + 110);
        ctx.fillStyle = '#99aabb';
        ctx.font = menuFont('400', 13);
        ctx.fillText(sel.title, panelX + panelW / 2, panelY + 130);

        // Description
        ctx.fillStyle = '#bbccdd';
        ctx.font = menuFont('400', 12);
        ctx.fillText(sel.desc, panelX + panelW / 2, panelY + 158);

        // Divider
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.moveTo(panelX + 20, panelY + 172);
        ctx.lineTo(panelX + panelW - 20, panelY + 172);
        ctx.stroke();

        // Stats
        ctx.textAlign = 'left';
        const sx = panelX + 30;
        let sy = panelY + 195;
        ctx.fillStyle = '#ddeeff';
        ctx.font = menuFont('600', 12);
        ctx.fillText('HP: ' + CONFIG.BASE_HP, sx, sy);
        ctx.fillText('Loyalty: ' + CONFIG.BASE_LOYALTY, sx + 120, sy);
        sy += 22;
        ctx.fillStyle = '#99aabb';
        ctx.font = menuFont('400', 12);
        ctx.fillText('Speed: ' + (sel.aiSpeed * 100).toFixed(0) + '%', sx, sy);
        ctx.fillText('Cast Rate: ' + (sel.castRate / 1000).toFixed(1) + 's', sx + 120, sy);
        sy += 22;
        ctx.fillStyle = AFFINITY_COLORS[sel.affinity] || '#888';
        ctx.font = menuFont('600', 12);
        ctx.fillText('Affinity: ' + sel.affinity.toUpperCase(), sx, sy);

        // Spell list header
        sy += 30;
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = menuFont('700', 12);
        ctx.fillText('Known Spells:', sx, sy);
        sy += 5;

        const orbColors = { 'Z': CONFIG.C.ORB_Z, 'X': CONFIG.C.ORB_X, 'C': CONFIG.C.ORB_C };
        sel.spells.forEach((key, i) => {
            const spell = SPELL_DATA[key];
            if (!spell) return;
            sy += 19;

            for (let k = 0; k < key.length; k++) {
                ctx.fillStyle = orbColors[key[k]] || '#888';
                ctx.font = menuFont('800', 11);
                ctx.fillText(key[k], sx + k * 13, sy);
            }

            ctx.fillStyle = AFFINITY_COLORS[spell.affinity] || '#aaa';
            ctx.font = menuFont('400', 11);
            ctx.fillText(spell.name, sx + 48, sy);

            ctx.fillStyle = CATEGORY_COLORS[spell.category] || '#888';
            ctx.fillText(spell.type, sx + 200, sy);
        });
    }
}

// ---- Skin Select ----
class SkinSelectScene {
    constructor(input, defeated, currentSkinId) {
        this.input = input;
        this.defeated = defeated; // Set of defeated enemy IDs
        this.selected = PLAYER_SKINS.findIndex(s => s.id === currentSkinId);
        if (this.selected < 0) this.selected = 0;
    }

    update(dt) {
        if (this.input.wasPressed('ArrowUp')) this.selected = (this.selected - 1 + PLAYER_SKINS.length) % PLAYER_SKINS.length;
        if (this.input.wasPressed('ArrowDown')) this.selected = (this.selected + 1) % PLAYER_SKINS.length;
        if (this.input.wasPressed('Escape') || this.input.wasPressed('Backspace')) return 'back';
        if (this.input.wasPressed('Enter') || this.input.wasPressed('KeyZ')) {
            const skin = PLAYER_SKINS[this.selected];
            if (this._isUnlocked(skin)) {
                return { action: 'select', skin: skin };
            }
        }
        return null;
    }

    _isUnlocked(skin) {
        return !skin.unlockEnemy || this.defeated.has(skin.unlockEnemy);
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.C.BG;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        // Header
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = menuFont('800', 24);
        ctx.textAlign = 'center';
        ctx.fillText('NINJA SKINS', CONFIG.WIDTH / 2, 35);
        ctx.fillStyle = '#99aabb';
        ctx.font = menuFont('400', 12);
        ctx.fillText('\u2191\u2193 Browse    Z/Enter Equip    ESC Back', CONFIG.WIDTH / 2, 55);

        // Skin list (left)
        const listX = 30;
        const listW = 360;
        PLAYER_SKINS.forEach((skin, i) => {
            const y = 75 + i * 60;
            const sel = i === this.selected;
            const unlocked = this._isUnlocked(skin);

            if (sel) {
                Sprites.roundRect(ctx, listX, y, listW, 52, 8,
                    'rgba(233,69,96,0.15)', CONFIG.C.ACCENT);
            }

            // Color bar
            ctx.fillStyle = unlocked ? skin.color : '#333';
            Sprites.roundRect(ctx, listX + 8, y + 8, 4, 36, 2, unlocked ? skin.color : '#333');

            // Name
            ctx.fillStyle = unlocked ? (sel ? '#fff' : '#bbccdd') : '#556677';
            ctx.font = menuFont(sel ? '700' : '400', 14);
            ctx.textAlign = 'left';
            ctx.fillText(unlocked ? skin.name : '???', listX + 22, y + 26);

            // Unlock hint
            if (!unlocked) {
                const enemy = getEnemyById(skin.unlockEnemy);
                ctx.fillStyle = '#556677';
                ctx.font = menuFont('400', 10);
                ctx.fillText('Defeat ' + (enemy ? enemy.name : '???') + ' to unlock', listX + 22, y + 42);
            } else {
                ctx.fillStyle = skin.accent;
                ctx.font = menuFont('400', 10);
                ctx.fillText(skin.id === 'default' ? 'Always available' : 'UNLOCKED', listX + 22, y + 42);
            }
        });

        // Preview panel (right)
        const panelX = 420;
        const panelY = 75;
        const panelW = 510;
        const panelH = 510;
        Sprites.roundRect(ctx, panelX, panelY, panelW, panelH, 12, 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.06)');

        const skin = PLAYER_SKINS[this.selected];
        const unlocked = this._isUnlocked(skin);

        if (unlocked) {
            // Big preview
            Sprites.ninja(ctx, panelX + panelW / 2 - 48, panelY + 30, 96, skin.color, 'right', { skin: skin, face: skin.face });

            // Name
            ctx.fillStyle = skin.accent;
            ctx.font = menuFont('800', 22);
            ctx.textAlign = 'center';
            ctx.fillText(skin.name, panelX + panelW / 2, panelY + 160);

            // Detail type
            const detailLabels = {
                none: 'Basic ninja gear',
                katana: 'Katana scabbard on back',
                bracer: 'Stone bracer on arm',
                flower: 'Flower on kasa hat',
                scythe: 'Scythe silhouette on back',
                lightning: 'Crackling lightning aura',
            };
            ctx.fillStyle = '#99aabb';
            ctx.font = menuFont('400', 13);
            ctx.fillText(detailLabels[skin.detail] || '', panelX + panelW / 2, panelY + 185);

            // Small directional previews
            const previewY = panelY + 220;
            ctx.fillStyle = '#99aabb';
            ctx.font = menuFont('400', 11);
            ctx.fillText('Preview:', panelX + panelW / 2, previewY);
            Sprites.ninja(ctx, panelX + panelW / 2 - 60, previewY + 10, 48, skin.color, 'right', { skin: skin, face: skin.face });
            Sprites.ninja(ctx, panelX + panelW / 2 + 12, previewY + 10, 48, skin.color, 'left', { skin: skin, face: skin.face });
        } else {
            // Locked
            ctx.fillStyle = '#445566';
            ctx.font = menuFont('800', 48);
            ctx.textAlign = 'center';
            ctx.fillText('?', panelX + panelW / 2, panelY + 130);

            ctx.fillStyle = '#778899';
            ctx.font = menuFont('700', 16);
            ctx.fillText('LOCKED', panelX + panelW / 2, panelY + 165);

            const enemy = getEnemyById(skin.unlockEnemy);
            if (enemy) {
                ctx.fillStyle = '#667788';
                ctx.font = menuFont('400', 13);
                ctx.fillText('Defeat ' + enemy.name + ' (' + enemy.title + ')', panelX + panelW / 2, panelY + 195);
            }
        }
    }
}

// ---- Defeat Screen ----
class DefeatScene {
    constructor(input) {
        this.input = input;
        this.selected = 0;
    }

    update(dt) {
        if (this.input.wasPressed('ArrowUp') || this.input.wasPressed('ArrowDown')) {
            this.selected = 1 - this.selected;
        }
        if (this.input.wasPressed('Enter') || this.input.wasPressed('KeyZ')) {
            return this.selected === 0 ? 'retry' : 'menu';
        }
        return null;
    }

    draw(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        ctx.fillStyle = '#ff4444';
        ctx.font = menuFont('800', 40);
        ctx.textAlign = 'center';
        ctx.fillText('DEFEATED', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 60);

        const opts = ['Retry', 'Back to Menu'];
        opts.forEach((opt, i) => {
            const y = CONFIG.HEIGHT / 2 + i * 50;
            const sel = i === this.selected;

            if (sel) {
                Sprites.roundRect(ctx, CONFIG.WIDTH / 2 - 120, y - 22, 240, 38, 8,
                    'rgba(233,69,96,0.15)', CONFIG.C.ACCENT);
            }

            ctx.fillStyle = sel ? '#fff' : '#667788';
            ctx.font = menuFont(sel ? '700' : '400', 20);
            ctx.fillText(opt, CONFIG.WIDTH / 2, y);
        });
    }
}
