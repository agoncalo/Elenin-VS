// ============================================================
// net.js - PeerJS networking for multiplayer
// ============================================================
class RemoteInput {
    // Mimics InputManager interface, driven by network messages
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this.combo = [];
        this.comboTimer = 0;
        this.onSpellCast = null;
        this.locked = false;
        this.lockTimer = 0;
        this.lastCombo = [];
        this.postCastTimer = 0;
        this.postCastMax = 0;
    }

    // Called when we receive a key message from the remote peer
    remoteKeyDown(code) {
        if (!this.keys[code]) this.justPressed[code] = true;
        this.keys[code] = true;
    }

    remoteKeyUp(code) {
        this.keys[code] = false;
    }

    // Called when we receive a cast message from the remote peer
    remoteCast(comboKey) {
        this.lastCombo = comboKey.split('');
        this.postCastMax = CONFIG.POST_CAST_COOLDOWN;
        this.postCastTimer = this.postCastMax;
        if (this.onSpellCast) this.onSpellCast(comboKey);
    }

    update(dt) {
        if (this.postCastTimer > 0) {
            this.postCastTimer -= dt;
            if (this.postCastTimer <= 0) {
                this.postCastTimer = 0;
                this.lastCombo = [];
            }
        }
    }

    lateUpdate() {
        this.justPressed = {};
    }

    isDown(code) { return !!this.keys[code]; }
    wasPressed(code) { return !!this.justPressed[code]; }

    reset() {
        this.keys = {};
        this.justPressed = {};
        this.combo = [];
        this.lastCombo = [];
        this.postCastTimer = 0;
        this.postCastMax = 0;
        this.onSpellCast = null;
    }

    getCombo() {
        if (this.postCastTimer > 0 && this.lastCombo.length === 3) return [...this.lastCombo];
        return [];
    }

    getPostCastProgress() {
        if (this.postCastMax <= 0 || this.postCastTimer <= 0) return 0;
        return this.postCastTimer / this.postCastMax;
    }
}

class NetManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.roomCode = '';
        this.status = 'idle'; // idle | connecting | ready | error
        this.error = '';
        this.onMessage = null;    // callback(msg)
        this.onConnected = null;  // callback()
        this.onDisconnect = null; // callback()
        this._syncTimer = 0;
    }

    // Generate a 4-character room code
    _genCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    }

    host() {
        this.isHost = true;
        this.roomCode = this._genCode();
        this.status = 'connecting';
        this.error = '';

        // Peer ID = 'eleninvs-' + room code for namespacing
        this.peer = new Peer('eleninvs-' + this.roomCode);

        this.peer.on('open', () => {
            this.status = 'waiting';
        });

        this.peer.on('connection', (conn) => {
            this.conn = conn;
            this._setupConn();
        });

        this.peer.on('error', (err) => {
            this.status = 'error';
            this.error = err.type === 'unavailable-id' ? 'Room code taken, retry' : (err.message || 'Connection failed');
        });
    }

    join(code) {
        this.isHost = false;
        this.roomCode = code.toUpperCase();
        this.status = 'connecting';
        this.error = '';

        this.peer = new Peer();

        this.peer.on('open', () => {
            this.conn = this.peer.connect('eleninvs-' + this.roomCode, { reliable: true });
            this._setupConn();
        });

        this.peer.on('error', (err) => {
            this.status = 'error';
            this.error = err.type === 'peer-unavailable' ? 'Room not found' : (err.message || 'Connection failed');
        });
    }

    _setupConn() {
        this.conn.on('open', () => {
            this.status = 'ready';
            if (this.onConnected) this.onConnected();
        });

        this.conn.on('data', (msg) => {
            if (this.onMessage) this.onMessage(msg);
        });

        this.conn.on('close', () => {
            this.status = 'disconnected';
            if (this.onDisconnect) this.onDisconnect();
        });

        this.conn.on('error', () => {
            this.status = 'error';
            this.error = 'Connection lost';
        });
    }

    send(msg) {
        if (this.conn && this.conn.open) {
            this.conn.send(msg);
        }
    }

    destroy() {
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
        this.peer = null;
        this.conn = null;
        this.status = 'idle';
        this.onMessage = null;
        this.onConnected = null;
        this.onDisconnect = null;
    }
}
