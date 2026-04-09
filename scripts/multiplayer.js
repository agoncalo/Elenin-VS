// ============================================================
// multiplayer.js - Lobby scenes for hosting and joining
// ============================================================
class MPHostScene {
    constructor(input, net, playerSkin) {
        this.input = input;
        this.net = net;
        this.playerSkin = playerSkin;
        this.pulse = 0;
        this.startTimer = 0;
        this.remoteSkin = null;

        // Start hosting
        this.net.host();
        this.net.onConnected = () => {
            // Send our skin info to the guest
            this.net.send({ t: 'i', skin: this.playerSkin });
            // Listen for guest's skin
            this.net.onMessage = (msg) => {
                if (msg.t === 'i') this.remoteSkin = msg.skin;
            };
            this.startTimer = 1500; // brief delay before starting
        };
    }

    update(dt) {
        this.pulse += dt * 0.004;

        if (this.input.wasPressed('Escape')) {
            this.net.destroy();
            return 'back';
        }

        // If guest connected, count down and start
        if (this.net.status === 'ready' && this.startTimer > 0) {
            this.startTimer -= dt;
            if (this.startTimer <= 0) {
                this.net.send({ t: 'go' });
                return { action: 'start', isHost: true, remoteSkin: this.remoteSkin };
            }
        }

        return null;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.C.BG;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        const cx = CONFIG.WIDTH / 2;
        const font = CONFIG.FONT;

        // Title
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = '800 28px ' + font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HOST MATCH', cx, 80);

        if (this.net.status === 'error') {
            ctx.fillStyle = '#ff4444';
            ctx.font = '400 16px ' + font;
            ctx.fillText(this.net.error, cx, 200);
            ctx.fillStyle = '#667788';
            ctx.font = '400 14px ' + font;
            ctx.fillText('Press ESC to go back', cx, 240);
            return;
        }

        if (this.net.status === 'connecting') {
            ctx.fillStyle = '#667788';
            ctx.font = '400 16px ' + font;
            ctx.fillText('Creating room...', cx, 200);
            return;
        }

        // Show room code
        ctx.fillStyle = '#99aabb';
        ctx.font = '400 16px ' + font;
        ctx.fillText('Share this code with your opponent:', cx, 180);

        // Big room code
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 64px ' + font;
        ctx.fillText(this.net.roomCode, cx, 260);

        // Waiting or connected
        if (this.net.status === 'ready') {
            ctx.fillStyle = '#44ff88';
            ctx.font = '700 20px ' + font;
            ctx.fillText('OPPONENT CONNECTED!', cx, 340);
            ctx.fillStyle = '#667788';
            ctx.font = '400 14px ' + font;
            ctx.fillText('Starting...', cx, 370);
        } else {
            const dots = '.'.repeat(1 + Math.floor(this.pulse) % 3);
            ctx.fillStyle = '#667788';
            ctx.font = '400 16px ' + font;
            ctx.fillText('Waiting for opponent' + dots, cx, 340);
        }

        // Footer
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '400 12px ' + font;
        ctx.fillText('ESC  Back', cx, CONFIG.HEIGHT - 40);
    }
}

class MPJoinScene {
    constructor(input, net, playerSkin) {
        this.input = input;
        this.net = net;
        this.playerSkin = playerSkin;
        this.code = '';
        this.maxLen = 4;
        this.pulse = 0;
        this.connected = false;
        this.remoteSkin = null;
        this.startTimer = 0;

        // Listen for messages once connected
        this.net.onConnected = () => {
            this.connected = true;
            // Send our skin info to the host
            this.net.send({ t: 'i', skin: this.playerSkin });
            // Set handler immediately so we don't miss the host's skin message
            this.net.onMessage = (msg) => {
                if (msg.t === 'i') {
                    this.remoteSkin = msg.skin;
                }
                if (msg.t === 'go') {
                    this.startTimer = 100; // brief delay
                }
            };
        };
    }

    update(dt) {
        this.pulse += dt * 0.004;

        if (this.input.wasPressed('Escape')) {
            this.net.destroy();
            return 'back';
        }

        if (this.startTimer > 0) {
            this.startTimer -= dt;
            if (this.startTimer <= 0) {
                return { action: 'start', isHost: false, remoteSkin: this.remoteSkin };
            }
        }

        // Code entry (only when not yet connecting)
        if (this.net.status === 'idle') {
            // Letter input (A-Z and 2-9)
            for (const code of Object.keys(this.input.justPressed)) {
                if (this.code.length >= this.maxLen) break;
                let ch = '';
                if (code.startsWith('Key')) ch = code.slice(3).toUpperCase();
                else if (code.startsWith('Digit') && code !== 'Digit0' && code !== 'Digit1') ch = code.slice(5);
                if (ch.length === 1) this.code += ch;
            }
            // Backspace
            if (this.input.wasPressed('Backspace') && this.code.length > 0) {
                this.code = this.code.slice(0, -1);
            }
            // Submit
            if (this.code.length === this.maxLen && (this.input.wasPressed('Enter') || this.input.wasPressed('KeyZ'))) {
                this.net.join(this.code);
            }
        }

        return null;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.C.BG;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        const cx = CONFIG.WIDTH / 2;
        const font = CONFIG.FONT;

        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = '800 28px ' + font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('JOIN MATCH', cx, 80);

        if (this.net.status === 'error') {
            ctx.fillStyle = '#ff4444';
            ctx.font = '400 16px ' + font;
            ctx.fillText(this.net.error, cx, 200);
            ctx.fillStyle = '#667788';
            ctx.font = '400 14px ' + font;
            ctx.fillText('Press ESC to go back', cx, 240);
            return;
        }

        if (this.net.status === 'connecting') {
            ctx.fillStyle = '#667788';
            ctx.font = '400 16px ' + font;
            ctx.fillText('Connecting to ' + this.code + '...', cx, 200);
            return;
        }

        if (this.connected) {
            ctx.fillStyle = '#44ff88';
            ctx.font = '700 20px ' + font;
            ctx.fillText('CONNECTED!', cx, 200);
            ctx.fillStyle = '#667788';
            ctx.font = '400 14px ' + font;
            ctx.fillText('Waiting for host to start...', cx, 240);
            return;
        }

        // Code entry UI
        ctx.fillStyle = '#99aabb';
        ctx.font = '400 16px ' + font;
        ctx.fillText('Enter room code:', cx, 180);

        // Code boxes
        const boxW = 60, boxH = 72, gap = 16;
        const totalW = this.maxLen * boxW + (this.maxLen - 1) * gap;
        const startX = cx - totalW / 2;

        for (let i = 0; i < this.maxLen; i++) {
            const bx = startX + i * (boxW + gap);
            const by = 220;
            const hasChar = i < this.code.length;
            const isActive = i === this.code.length;

            // Box background
            ctx.fillStyle = hasChar ? 'rgba(233,69,96,0.15)' : 'rgba(255,255,255,0.05)';
            ctx.fillRect(bx, by, boxW, boxH);

            // Box border
            ctx.strokeStyle = isActive ? CONFIG.C.ACCENT : (hasChar ? '#445566' : '#2a2a4e');
            ctx.lineWidth = isActive ? 2 : 1;
            ctx.strokeRect(bx, by, boxW, boxH);

            // Character
            if (hasChar) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '800 40px ' + font;
                ctx.fillText(this.code[i], bx + boxW / 2, by + boxH / 2 + 2);
            }

            // Cursor blink
            if (isActive) {
                const blink = Math.sin(this.pulse * 3) > 0;
                if (blink) {
                    ctx.fillStyle = CONFIG.C.ACCENT;
                    ctx.fillRect(bx + boxW / 2 - 1, by + boxH - 14, 2, 10);
                }
            }
        }

        // Instructions
        ctx.fillStyle = '#667788';
        ctx.font = '400 14px ' + font;
        if (this.code.length < this.maxLen) {
            ctx.fillText('Type the 4-character room code', cx, 320);
        } else {
            ctx.fillText('Press Z / Enter to connect', cx, 320);
        }

        // Footer
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '400 12px ' + font;
        ctx.fillText('ESC  Back    Backspace  Delete', cx, CONFIG.HEIGHT - 40);
    }
}

class MPMenuScene {
    constructor(input) {
        this.input = input;
        this.selected = 0;
        this.options = ['Host', 'Join', 'Back'];
    }

    update(dt) {
        if (this.input.wasPressed('ArrowUp')) this.selected = (this.selected - 1 + this.options.length) % this.options.length;
        if (this.input.wasPressed('ArrowDown')) this.selected = (this.selected + 1) % this.options.length;
        if (this.input.wasPressed('Escape')) return 'back';
        if (this.input.wasPressed('Enter') || this.input.wasPressed('KeyZ')) {
            return this.options[this.selected];
        }
        return null;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.C.BG;
        ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        const cx = CONFIG.WIDTH / 2;
        const font = CONFIG.FONT;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Title
        ctx.fillStyle = CONFIG.C.ACCENT;
        ctx.font = '800 28px ' + font;
        ctx.fillText('VERSUS MODE', cx, 120);

        ctx.fillStyle = '#99aabb';
        ctx.font = '400 14px ' + font;
        ctx.fillText('Play against another ninja online', cx, 158);

        // Options
        this.options.forEach((opt, i) => {
            const y = 250 + i * 56;
            const sel = i === this.selected;

            if (sel) {
                Sprites.roundRect(ctx, cx - 120, y - 22, 240, 44, 8, 'rgba(233,69,96,0.15)', CONFIG.C.ACCENT);
                ctx.fillStyle = CONFIG.C.ACCENT;
                ctx.font = '700 20px ' + font;
                ctx.textAlign = 'right';
                ctx.fillText('\u25B6', cx - 90, y + 2);
            }

            ctx.fillStyle = sel ? '#fff' : '#667788';
            ctx.font = sel ? '700 22px ' + font : '400 20px ' + font;
            ctx.textAlign = 'center';
            ctx.fillText(opt, cx, y + 2);
        });

        // Footer
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '400 12px ' + font;
        ctx.textAlign = 'center';
        ctx.fillText('\u2191 \u2193 Navigate    Z / Enter Select    ESC Back', cx, CONFIG.HEIGHT - 40);
    }
}
