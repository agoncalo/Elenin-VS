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
        this.options = ['Fight', 'Spells', 'Skins', 'How to Play', 'Stats'];
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

        // Title — ELENIN block-letter logo + VS
        const pulse = Math.sin(this.titlePulse) * 0.08 + 1;
        ctx.save();
        ctx.translate(CONFIG.WIDTH / 2, 140);
        ctx.scale(pulse, pulse);

        // Draw the block-letter logo (from the original Elenin game)
        drawEleninLogo(ctx, 0, 0, 0.7, Date.now());

        // "VS" badge to the right
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.shadowColor = 'rgba(233,69,96,0.4)';
        ctx.shadowBlur = 10;
        ctx.font = menuFont('800', 36);
        ctx.textAlign = 'left';
        ctx.fillText('VS', 130, 12);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#99aabb';
        ctx.font = menuFont('400', 16);
        ctx.textAlign = 'center';
        ctx.fillText('Ninja Spell Combat', 0, 45);
        ctx.restore();

        // Menu options
        this.options.forEach((opt, i) => {
            const y = 270 + i * 48;
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

// ---- How to Play ----
class HowToPlayScene {
    constructor(input) {
        this.input = input;
        this.page = 0;
        this.pages = [
            {
                title: 'BASICS',
                lines: [
                    { icon: '←→', text: 'Move left/right with Arrow Keys' },
                    { icon: '↑↓', text: 'Switch lanes with Up/Down Arrows' },
                    { icon: 'ZXC', text: 'Cast spells by pressing 3-key combos' },
                    { icon: '', text: '' },
                    { icon: '♥', text: 'Reduce enemy HP to 0 to win' },
                    { icon: '★', text: 'Or break their Loyalty to 0' },
                    { icon: '', text: 'Loyalty drops when summons are killed' },
                ],
            },
            {
                title: 'SPELLS',
                lines: [
                    { icon: 'Z..', text: 'Z-starters: Physical attacks & utility' },
                    { icon: 'X..', text: 'X-starters: Magic attacks & lane control' },
                    { icon: 'C..', text: 'C-starters: Summon creatures to fight' },
                    { icon: '', text: '' },
                    { icon: '⚔', text: 'ZZX Sword Slash - instant, high damage' },
                    { icon: '🔥', text: 'XXX Inferno Path - burns enemy lane' },
                    { icon: '❄', text: 'XXZ Frostbite Path - freezes enemy lane' },
                    { icon: '⚡', text: 'XCC Thunder Wrath - stuns all enemies' },
                ],
            },
            {
                title: 'STRATEGY',
                lines: [
                    { icon: '🛡', text: 'ZCZ Shield blocks all damage briefly' },
                    { icon: '👻', text: 'ZCX Mistveil makes you invisible' },
                    { icon: '🔄', text: 'ZCC Deflection reflects projectiles back' },
                    { icon: '', text: '' },
                    { icon: '✨', text: 'Enchantments buff your next attacks' },
                    { icon: '🎯', text: 'Switch lanes to dodge incoming attacks' },
                    { icon: '🔥', text: 'Place lane hazards to deny enemy lanes' },
                    { icon: '💀', text: 'Kill enemy summons to drain their Loyalty' },
                ],
            },
        ];
    }

    update(dt) {
        if (this.input.wasPressed('Escape') || this.input.wasPressed('Backspace')) return 'back';
        if (this.input.wasPressed('ArrowRight') || this.input.wasPressed('Enter') || this.input.wasPressed('KeyZ')) {
            if (this.page < this.pages.length - 1) this.page++;
            else return 'back';
        }
        if (this.input.wasPressed('ArrowLeft')) {
            if (this.page > 0) this.page--;
        }
        return null;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.C.BG;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        // Decorative lines
        ctx.strokeStyle = 'rgba(233,69,96,0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 30 + i * 32); ctx.lineTo(CONFIG.WIDTH, 30 + i * 32);
            ctx.stroke();
        }

        const pg = this.pages[this.page];

        // Title
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = menuFont('800', 32);
        ctx.textAlign = 'center';
        ctx.fillText('HOW TO PLAY', CONFIG.WIDTH / 2, 60);

        // Page subtitle
        ctx.fillStyle = '#fff';
        ctx.font = menuFont('700', 22);
        ctx.fillText(pg.title, CONFIG.WIDTH / 2, 110);

        // Page dots
        for (let i = 0; i < this.pages.length; i++) {
            ctx.beginPath();
            ctx.arc(CONFIG.WIDTH / 2 - 20 + i * 20, 135, i === this.page ? 5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = i === this.page ? CONFIG.C.ACCENT : '#445566';
            ctx.fill();
        }

        // Content lines
        const startY = 175;
        pg.lines.forEach((line, i) => {
            const y = startY + i * 48;
            if (!line.text) return; // spacer

            // Icon/key badge
            if (line.icon) {
                ctx.fillStyle = 'rgba(233,69,96,0.15)';
                const iconW = Math.max(40, ctx.measureText(line.icon).width + 16);
                Sprites.roundRect(ctx, CONFIG.WIDTH / 2 - 280, y - 16, iconW, 32, 6,
                    'rgba(233,69,96,0.12)', 'rgba(233,69,96,0.3)');
                ctx.fillStyle = CONFIG.C.ACCENT;
                ctx.font = menuFont('700', 16);
                ctx.textAlign = 'center';
                ctx.fillText(line.icon, CONFIG.WIDTH / 2 - 280 + iconW / 2, y + 3);
            }

            // Text
            ctx.fillStyle = '#ccddee';
            ctx.font = menuFont('400', 17);
            ctx.textAlign = 'left';
            ctx.fillText(line.text, CONFIG.WIDTH / 2 - 220, y + 3);
        });

        // Combo example panel on last two pages
        if (this.page >= 1) {
            const panelY = startY + pg.lines.length * 48 + 15;
            Sprites.roundRect(ctx, CONFIG.WIDTH / 2 - 200, panelY, 400, 50, 8,
                'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)');
            ctx.fillStyle = '#667788';
            ctx.font = menuFont('400', 13);
            ctx.textAlign = 'center';
            ctx.fillText('Press Z, X, C in any combination of 3 to cast a spell!', CONFIG.WIDTH / 2, panelY + 22);
            // Example orbs
            const orbColors = [CONFIG.C.ORB_Z, CONFIG.C.ORB_X, CONFIG.C.ORB_C];
            const orbLabels = ['Z', 'X', 'C'];
            for (let i = 0; i < 3; i++) {
                const ox = CONFIG.WIDTH / 2 - 30 + i * 30;
                ctx.beginPath();
                ctx.arc(ox, panelY + 40, 8, 0, Math.PI * 2);
                ctx.fillStyle = orbColors[i];
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = menuFont('700', 10);
                ctx.fillText(orbLabels[i], ox, panelY + 44);
            }
        }

        // Navigation footer
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = menuFont('400', 12);
        ctx.textAlign = 'center';
        const navText = this.page < this.pages.length - 1
            ? '← Previous    → Next    ESC Back'
            : '← Previous    → / Z Finish    ESC Back';
        ctx.fillText(navText, CONFIG.WIDTH / 2, CONFIG.HEIGHT - 30);
    }
}

// ---- Stats / Playstyle ----
class StatsScene {
    constructor(input, stats) {
        this.input = input;
        this.stats = stats;
        this.animProgress = 0; // 0→1 for hex graph animation
        this.tab = 0; // 0 = overview + hex, 1 = detailed
    }

    update(dt) {
        this.animProgress = Math.min(1, this.animProgress + dt * 0.002);
        if (this.input.wasPressed('Escape') || this.input.wasPressed('Backspace')) return 'back';
        if (this.input.wasPressed('ArrowRight') || this.input.wasPressed('ArrowLeft')) {
            this.tab = 1 - this.tab;
        }
        return null;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.C.BG;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        // Decorative lines
        ctx.strokeStyle = 'rgba(233,69,96,0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 30 + i * 32); ctx.lineTo(CONFIG.WIDTH, 30 + i * 32);
            ctx.stroke();
        }

        // Title
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = menuFont('800', 32);
        ctx.textAlign = 'center';
        ctx.fillText('PLAYER STATS', CONFIG.WIDTH / 2, 50);

        // Tab indicators
        const tabs = ['Playstyle', 'Details'];
        tabs.forEach((t, i) => {
            const tx = CONFIG.WIDTH / 2 - 80 + i * 160;
            const sel = i === this.tab;
            if (sel) {
                Sprites.roundRect(ctx, tx - 60, 63, 120, 28, 6,
                    'rgba(233,69,96,0.15)', CONFIG.C.ACCENT);
            }
            ctx.fillStyle = sel ? '#fff' : '#556677';
            ctx.font = menuFont(sel ? '700' : '400', 14);
            ctx.textAlign = 'center';
            ctx.fillText(t, tx, 82);
        });

        if (this.tab === 0) {
            this._drawPlaystyleTab(ctx);
        } else {
            this._drawDetailsTab(ctx);
        }

        // Footer
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = menuFont('400', 12);
        ctx.textAlign = 'center';
        ctx.fillText('← → Switch Tab    ESC Back', CONFIG.WIDTH / 2, CONFIG.HEIGHT - 30);
    }

    _drawPlaystyleTab(ctx) {
        const d = this.stats.data;
        const style = this.stats.getPlaystyle();
        const t = this.animProgress;

        // --- Hexagon radar chart (left side) ---
        const cx = 280, cy = 340;
        const radius = 130;
        const axes = [
            { key: 'assault',    label: 'Assault',    color: '#ff6b35' },
            { key: 'control',    label: 'Control',    color: '#9b59b6' },
            { key: 'summoner',   label: 'Summoner',   color: '#2ecc71' },
            { key: 'resilience', label: 'Resilience', color: '#3498db' },
            { key: 'defense',    label: 'Defense',    color: '#f1c40f' },
            { key: 'evasion',    label: 'Evasion',    color: '#1abc9c' },
        ];
        const n = axes.length;

        // Grid rings
        for (let ring = 1; ring <= 4; ring++) {
            const r = radius * ring / 4;
            ctx.beginPath();
            for (let i = 0; i <= n; i++) {
                const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
                const px = cx + Math.cos(angle) * r;
                const py = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.strokeStyle = ring === 4 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Axis lines + labels
        for (let i = 0; i < n; i++) {
            const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
            const edgeX = cx + Math.cos(angle) * radius;
            const edgeY = cy + Math.sin(angle) * radius;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(edgeX, edgeY);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.stroke();

            // Label
            const labelR = radius + 22;
            const lx = cx + Math.cos(angle) * labelR;
            const ly = cy + Math.sin(angle) * labelR;
            ctx.fillStyle = axes[i].color;
            ctx.font = menuFont('700', 12);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(axes[i].label, lx, ly);

            // Value percentage
            const val = style[axes[i].key] || 0;
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = menuFont('400', 10);
            ctx.fillText(Math.round(val * 100) + '%', lx, ly + 14);
        }
        ctx.textBaseline = 'alphabetic';

        // Data polygon (animated)
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
            const idx = i % n;
            const angle = (Math.PI * 2 * idx / n) - Math.PI / 2;
            const val = (style[axes[idx].key] || 0) * t;
            const r = Math.max(radius * 0.04, radius * val);
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.fillStyle = 'rgba(233,69,96,0.2)';
        ctx.fill();
        ctx.strokeStyle = CONFIG.C.ACCENT;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Data points (dots)
        for (let i = 0; i < n; i++) {
            const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
            const val = (style[axes[i].key] || 0) * t;
            const r = Math.max(radius * 0.04, radius * val);
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = axes[i].color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // --- Right side: quick stats ---
        const rx = 520, ry = 115;
        ctx.textAlign = 'left';

        // Record
        ctx.fillStyle = '#fff';
        ctx.font = menuFont('700', 18);
        ctx.fillText('Record', rx, ry);
        ctx.fillStyle = '#aabbcc';
        ctx.font = menuFont('400', 15);
        ctx.fillText(d.wins + 'W / ' + d.losses + 'L  (' + d.totalFights + ' fights)', rx, ry + 22);

        // Favorite element
        const favElem = this.stats.getFavoriteElement();
        ctx.fillStyle = '#fff';
        ctx.font = menuFont('700', 18);
        ctx.fillText('Favorite Element', rx, ry + 60);
        const elemColor = CONFIG.C[favElem.toUpperCase()] || '#aabbcc';
        ctx.fillStyle = elemColor;
        ctx.font = menuFont('600', 15);
        ctx.fillText(favElem === 'none' ? 'Physical' : favElem.charAt(0).toUpperCase() + favElem.slice(1), rx, ry + 82);

        // Favorite spells
        const favSpells = this.stats.getFavoriteSpells(3);
        ctx.fillStyle = '#fff';
        ctx.font = menuFont('700', 18);
        ctx.fillText('Top Spells', rx, ry + 120);
        if (favSpells.length === 0) {
            ctx.fillStyle = '#556677';
            ctx.font = menuFont('400', 14);
            ctx.fillText('No data yet — go fight!', rx, ry + 142);
        }
        favSpells.forEach((s, i) => {
            const sy = ry + 142 + i * 24;
            // Combo key colored
            const combo = s.key;
            let kx = rx;
            ctx.font = menuFont('700', 13);
            for (let c = 0; c < combo.length; c++) {
                const ch = combo[c];
                ctx.fillStyle = ch === 'Z' ? CONFIG.C.ORB_Z : ch === 'X' ? CONFIG.C.ORB_X : CONFIG.C.ORB_C;
                ctx.fillText(ch, kx, sy);
                kx += 12;
            }
            ctx.fillStyle = '#ccddee';
            ctx.font = menuFont('400', 13);
            ctx.fillText(s.name + '  ×' + s.count, kx + 6, sy);
        });

        // Favorite summons
        const favSummons = this.stats.getFavoriteSummons(3);
        const sumY = ry + 142 + Math.max(1, favSpells.length) * 24 + 25;
        ctx.fillStyle = '#fff';
        ctx.font = menuFont('700', 18);
        ctx.fillText('Top Summons', rx, sumY);
        if (favSummons.length === 0) {
            ctx.fillStyle = '#556677';
            ctx.font = menuFont('400', 14);
            ctx.fillText('No summons used yet', rx, sumY + 22);
        }
        favSummons.forEach((s, i) => {
            const sy = sumY + 22 + i * 24;
            const combo = s.key;
            let kx = rx;
            ctx.font = menuFont('700', 13);
            for (let c = 0; c < combo.length; c++) {
                const ch = combo[c];
                ctx.fillStyle = ch === 'Z' ? CONFIG.C.ORB_Z : ch === 'X' ? CONFIG.C.ORB_X : CONFIG.C.ORB_C;
                ctx.fillText(ch, kx, sy);
                kx += 12;
            }
            ctx.fillStyle = '#ccddee';
            ctx.font = menuFont('400', 13);
            ctx.fillText(s.name + '  ×' + s.count, kx + 6, sy);
        });

        // Playstyle label (dominant trait)
        const styleLabel = this._getStyleLabel(style);
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = menuFont('800', 16);
        ctx.textAlign = 'center';
        ctx.fillText(styleLabel, cx, cy - radius - 30);
    }

    _drawDetailsTab(ctx) {
        const d = this.stats.data;
        const total = this.stats.totalSpellsCast || 1;
        const fights = d.totalFights || 1;

        const col1x = 100, col2x = 520;
        let y = 115;

        // Column 1: Combat numbers
        ctx.textAlign = 'left';
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = menuFont('700', 18);
        ctx.fillText('Combat', col1x, y);
        y += 28;

        const combatStats = [
            ['Total Damage Dealt', d.dmgDealt],
            ['Total Damage Taken', d.dmgTaken],
            ['Attacks Blocked', d.dmgBlocked],
            ['Stuns/Freezes Applied', d.stunsFrozes],
            ['Enemy Summons Killed', d.summonKills],
            ['Own Summons Lost', d.ownSummonsLost],
            ['Lane Effects Placed', d.laneEffectsPlaced],
        ];
        combatStats.forEach(([label, val]) => {
            ctx.fillStyle = '#aabbcc';
            ctx.font = menuFont('400', 14);
            ctx.fillText(label, col1x, y);
            ctx.fillStyle = '#fff';
            ctx.font = menuFont('700', 14);
            ctx.textAlign = 'right';
            ctx.fillText('' + val, col1x + 300, y);
            ctx.textAlign = 'left';
            y += 24;
        });

        // Column 1: Movement
        y += 15;
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = menuFont('700', 18);
        ctx.fillText('Movement', col1x, y);
        y += 28;

        const moveStats = [
            ['Lane Switches', d.laneSwitches],
            ['Dodged Projectiles', d.dodgedProjectiles],
            ['Switches/Fight', (d.laneSwitches / fights).toFixed(1)],
        ];
        moveStats.forEach(([label, val]) => {
            ctx.fillStyle = '#aabbcc';
            ctx.font = menuFont('400', 14);
            ctx.fillText(label, col1x, y);
            ctx.fillStyle = '#fff';
            ctx.font = menuFont('700', 14);
            ctx.textAlign = 'right';
            ctx.fillText('' + val, col1x + 300, y);
            ctx.textAlign = 'left';
            y += 24;
        });

        // Column 2: Spell type breakdown
        y = 115;
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = menuFont('700', 18);
        ctx.textAlign = 'left';
        ctx.fillText('Spell Usage', col2x, y);
        y += 28;

        const typeColors = {
            projectile: '#ff6b35', instant: '#e74c3c', enchant: '#f39c12',
            defensive: '#3498db', lane: '#9b59b6', aoe: '#e94560', summon: '#2ecc71'
        };
        const types = ['projectile', 'instant', 'enchant', 'defensive', 'lane', 'aoe', 'summon'];
        types.forEach(type => {
            const count = d.typeCast[type] || 0;
            const pct = total > 0 ? count / total : 0;

            ctx.fillStyle = '#aabbcc';
            ctx.font = menuFont('400', 14);
            ctx.textAlign = 'left';
            ctx.fillText(type.charAt(0).toUpperCase() + type.slice(1), col2x, y);

            // Bar
            const barX = col2x + 100, barW = 180, barH = 12;
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(barX, y - 10, barW, barH);
            ctx.fillStyle = typeColors[type] || '#888';
            ctx.fillRect(barX, y - 10, barW * pct, barH);

            // Count
            ctx.fillStyle = '#fff';
            ctx.font = menuFont('700', 12);
            ctx.textAlign = 'right';
            ctx.fillText(count + ' (' + Math.round(pct * 100) + '%)', col2x + 350, y);
            ctx.textAlign = 'left';
            y += 28;
        });

        // Column 2: Affinity breakdown
        y += 15;
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = menuFont('700', 18);
        ctx.fillText('Elements Used', col2x, y);
        y += 28;

        const affinities = Object.entries(d.affinityCast)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
        const affTotal = affinities.reduce((s, [, v]) => s + v, 0) || 1;
        affinities.forEach(([aff, count]) => {
            const pct = count / affTotal;
            const label = aff === 'none' ? 'Physical' : aff.charAt(0).toUpperCase() + aff.slice(1);
            const color = CONFIG.C[aff.toUpperCase()] || '#aabbcc';

            ctx.fillStyle = color;
            ctx.font = menuFont('600', 14);
            ctx.textAlign = 'left';
            ctx.fillText(label, col2x, y);

            // Bar
            const barX = col2x + 100, barW = 180, barH = 12;
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(barX, y - 10, barW, barH);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(barX, y - 10, barW * pct, barH);
            ctx.globalAlpha = 1;

            ctx.fillStyle = '#fff';
            ctx.font = menuFont('700', 12);
            ctx.textAlign = 'right';
            ctx.fillText(count + '', col2x + 350, y);
            ctx.textAlign = 'left';
            y += 26;
        });
    }

    _getStyleLabel(style) {
        // Find top 1-2 traits and generate a fun label
        const entries = Object.entries(style).sort((a, b) => b[1] - a[1]);
        const top = entries[0];
        const second = entries[1];

        // If no data, generic label
        if (!top || top[1] < 0.05) return '— No Data Yet —';

        const labels = {
            assault:    ['Berserker', 'Blade Master', 'Relentless'],
            defense:    ['Iron Wall', 'Guardian', 'Fortress'],
            evasion:    ['Phantom', 'Shadow Dancer', 'Wind Walker'],
            control:    ['Dominator', 'Puppeteer', 'Zone Master'],
            summoner:   ['Beast Tamer', 'Summoner Lord', 'Pack Leader'],
            resilience: ['Survivor', 'Endurance Master', 'Unbreakable'],
        };

        // Dual-class if second is > 60% of top
        if (second && second[1] > top[1] * 0.6) {
            const combos = {
                'assault+control': 'Spell Blade',
                'assault+evasion': 'Shadow Striker',
                'assault+summoner': 'War Chief',
                'assault+defense': 'Juggernaut',
                'assault+resilience': 'Unstoppable Force',
                'defense+resilience': 'Immovable Object',
                'defense+control': 'Warden',
                'defense+summoner': 'Bastion Lord',
                'evasion+control': 'Trickster',
                'evasion+summoner': 'Phantom Commander',
                'evasion+assault': 'Shadow Striker',
                'control+summoner': 'Grand Tactician',
                'control+resilience': 'Iron Strategist',
                'summoner+resilience': 'Immortal Summoner',
            };
            const comboKey = top[0] + '+' + second[0];
            const reverseKey = second[0] + '+' + top[0];
            if (combos[comboKey]) return '« ' + combos[comboKey] + ' »';
            if (combos[reverseKey]) return '« ' + combos[reverseKey] + ' »';
        }

        // Single-class
        const pool = labels[top[0]] || ['Fighter'];
        const idx = Math.floor(top[1] * (pool.length - 0.01));
        return '« ' + pool[Math.min(idx, pool.length - 1)] + ' »';
    }
}
