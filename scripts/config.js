// ============================================================
// config.js - Game configuration and constants
// ============================================================
const CONFIG = {
    WIDTH: 960,
    HEIGHT: 640,

    // Layout regions
    TOP_BAR: 50,
    SIDE_PANEL: 70,
    BOTTOM_PANEL: 140,

    // Game field (computed)
    get FIELD_LEFT() { return this.SIDE_PANEL; },
    get FIELD_RIGHT() { return this.WIDTH - this.SIDE_PANEL; },
    get FIELD_TOP() { return this.TOP_BAR; },
    get FIELD_BOTTOM() { return this.HEIGHT - this.BOTTOM_PANEL; },
    get FIELD_WIDTH() { return this.FIELD_RIGHT - this.FIELD_LEFT; },
    get FIELD_HEIGHT() { return this.FIELD_BOTTOM - this.FIELD_TOP; },
    get MIDPOINT() { return this.FIELD_LEFT + this.FIELD_WIDTH / 2; },

    // Lanes
    LANE_COUNT: 5,
    get LANE_HEIGHT() { return this.FIELD_HEIGHT / this.LANE_COUNT; },

    // Sprites
    SPRITE: 48,

    // Gameplay
    BASE_HP: 50,
    BASE_LOYALTY: 50,
    PLAYER_SPEED: 3,
    LANE_SWITCH_TIME: 150,       // ms to jump between lanes
    SPELL_INPUT_TIMEOUT: 1500,   // ms to finish a 3-key combo
    COMBO_LOCKOUT: 80,           // ms between key presses in a combo
    POST_CAST_COOLDOWN: 500,     // ms after casting before new combo input

    // Loyalty drop per minion HP
    LOYALTY_PER_HP: 0.5,

    // Colors
    FONT: "'Exo 2', sans-serif",
    C: {
        BG:          '#1a1a2e',
        PANEL:       '#16213e',
        LANE_A:      '#1a1a3e',
        LANE_B:      '#151530',
        MIDLINE:     '#2a2a5e',
        HP:          '#e74c3c',
        HP_EMPTY:    '#3a1515',
        LOYALTY:     '#f1c40f',
        LOY_EMPTY:   '#3a3515',
        FIRE:        '#ff6b35',
        ICE:         '#00d4ff',
        SHOCK:       '#ffee00',
        POISON:      '#00ff88',
        WIND:        '#88ffcc',
        EARTH:       '#aa8855',
        SHADOW:      '#9b59b6',
        WATER:       '#3498db',
        HEAL:        '#2ecc71',
        TEXT:        '#ffffff',
        TEXT_DIM:    '#667788',
        ACCENT:      '#e94560',
        PLAYER:      '#4a90d9',
        ENEMY:       '#d94a4a',
        SHIELD:      '#aaddff',
        ORB_Z:       '#ff4444',
        ORB_X:       '#4488ff',
        ORB_C:       '#ffcc00',
    },
};

// Enemy roster — all share 50 HP / 30 Loyalty, differ by spell preference & personality

// Player skins — based on the 7 EleNin ninja types + default black
const PLAYER_SKINS = [
    { id: 'default', name: 'Shadow Genin',  color: '#222222', accent: '#666666', detail: 'none',      female: false, face: 'smile',   unlockEnemy: null },
    { id: 'fire',    name: 'Fire Ninja',     color: '#e33333', accent: '#ff9933', detail: 'katana',    female: false, face: 'angry',   unlockEnemy: 'kaen' },
    { id: 'earth',   name: 'Earth Ninja',    color: '#a0622a', accent: '#2e9e2e', detail: 'bracer',    female: false, face: 'calm',    unlockEnemy: 'tsuchi' },
    { id: 'bubble',  name: 'Bubble Kunoichi',color: '#4488ff', accent: '#88ccff', detail: 'flower',    female: true,  face: 'cheerful',unlockEnemy: 'mizu' },
    { id: 'shadow',  name: 'Shadow Ninja',   color: '#772266', accent: '#aa44ee', detail: 'scythe',    female: false, face: 'smirk',   unlockEnemy: 'yami' },
    { id: 'crystal', name: 'Crystal Kunoichi',color:'#22dddd', accent: '#aaffff', detail: 'flower',    female: true,  face: 'cold',    unlockEnemy: 'hyoga' },
    { id: 'wind',    name: 'Wind Kunoichi',  color: '#88dd88', accent: '#bbffbb', detail: 'flower',    female: true,  face: 'cheerful',unlockEnemy: 'kaze' },
    { id: 'storm',   name: 'Storm Ninja',    color: '#2244cc', accent: '#ffdd00', detail: 'lightning', female: false, face: 'fierce',  unlockEnemy: 'raiden' },
    { id: 'dragon',  name: 'Dragon Ninja',   color: '#cc1111', accent: '#ff4444', detail: 'katana',    female: false, face: 'angry',   unlockEnemy: 'ryujin' },
];
const ENEMIES = [
    {
        id: 'kaen',
        name: 'Kaen', title: 'Fire Genin', affinity: 'fire',
        spells: ['ZZZ','ZZX','XZZ','XXX','CZZ','CCC'],
        color: '#ff6b35', aiSpeed: 0.6, castRate: 2500,
        desc: 'Aggressive fire user. Loves Burn Lane and Fire Birds.',
    },
    {
        id: 'hyoga',
        name: 'Hyoga', title: 'Ice Kunoichi', affinity: 'ice',
        spells: ['ZZZ','ZZX','XZX','XXZ','CZX','CZZ','CCZ'],
        color: '#00d4ff', aiSpeed: 0.7, castRate: 2200,
        desc: 'Freezes lanes and hides behind Blockies and Crystal Birds.',
    },
    {
        id: 'kaze',
        name: 'Kaze', title: 'Wind Kunoichi', affinity: 'wind',
        spells: ['ZZZ','ZZC','ZXX','ZCX','XZC','CXC','CZC'],
        color: '#88ffcc', aiSpeed: 0.9, castRate: 1800,
        desc: 'Lightning fast. Samurai and Javelineers hold the line.',
    },
    {
        id: 'raiden',
        name: 'Raiden', title: 'Thunder Jonin', affinity: 'shock',
        spells: ['ZZX','ZXC','XZZ','XCC','CZX','CXC','CCX'],
        color: '#ffee00', aiSpeed: 0.8, castRate: 2000,
        desc: 'Stun-locks with AOE Shock and swarms of summons.',
    },
    {
        id: 'tsuchi',
        name: 'Tsuchi', title: 'Earth Sage', affinity: 'earth',
        spells: ['ZZX','ZCZ','XXC','XCC','CZX','CZC','CXC'],
        color: '#aa8855', aiSpeed: 0.5, castRate: 2800,
        desc: 'Slow but tanky. Quake stuns and walls of summons.',
    },
    {
        id: 'yami',
        name: 'Yami', title: 'Shadow Master', affinity: 'shadow',
        spells: ['ZZX','ZCX','ZCC','XZZ','XZX','CZZ','CXX','CXC'],
        color: '#9b59b6', aiSpeed: 0.85, castRate: 1800,
        desc: 'Unpredictable. Hydras, Samurai, and Lantern heals.',
    },
    {
        id: 'mizu',
        name: 'Mizu', title: 'Water Priestess', affinity: 'water',
        spells: ['ZZC','ZXX','ZCZ','XXZ','CZZ','CZC','CXX'],
        color: '#3498db', aiSpeed: 0.7, castRate: 2000,
        desc: 'Defensive healer. Healing Lamps and deflecting Javelineers.',
    },
    {
        id: 'ryujin',
        name: 'Ryujin', title: 'Dragon Master', affinity: 'fire',
        spells: ['ZZX','ZXZ','ZXC','XZZ','XXX','XCZ','XCC','CXZ','CXX','CXC','CCC'],
        color: '#ff4444', aiSpeed: 1.0, castRate: 1500,
        desc: 'The ultimate test. Fire, thunder, and an army of summons.',
    },
];

function getEnemyById(id) {
    return ENEMIES.find(e => e.id === id);
}
