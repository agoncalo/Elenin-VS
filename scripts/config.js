// ============================================================
// config.js - Game configuration and constants
// ============================================================
const CONFIG = {
    WIDTH: 800,
    HEIGHT: 500,

    // Layout regions
    TOP_BAR: 54,          // visual height of bar overlay (drawn on top of field)
    TOP_BAR_FIELD: 20,    // actual field starts here (bars overlay the field)
    SIDE_PANEL: 10,
    BOTTOM_PANEL: 0,      // no dedicated panel — UI overlays inside the field

    // Game field (computed)
    get FIELD_LEFT() { return this.SIDE_PANEL; },
    get FIELD_RIGHT() { return this.WIDTH - this.SIDE_PANEL; },
    get FIELD_TOP() { return this.TOP_BAR_FIELD; },
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
    BASE_LOYALTY: 20,
    PLAYER_SPEED: 3,
    LANE_SWITCH_TIME: 150,       // ms to jump between lanes
    SPELL_INPUT_TIMEOUT: 1500,   // ms to finish a 3-key combo
    COMBO_LOCKOUT: 80,           // ms between key presses in a combo
    POST_CAST_COOLDOWN: 300,     // ms after casting (input clarity, stamina is the real throttle)

    // Stamina
    STAMINA_MAX: 100,
    STAMINA_REGEN: 15,           // per second
    STAMINA_REGEN_DELAY: 500,    // ms pause after spending before regen resumes
    AI_STAMINA_REGEN: 22,        // AI regens faster

    // Movement
    BACKWARD_SPEED: 0.55,        // backward movement multiplier (vs forward = 1.0)

    // Blocking
    BLOCK_REDUCTION: 0.75,       // 75% damage reduction
    BLOCK_STAMINA_COST: 5,       // stamina cost per hit blocked

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
        ORB_Z:       '#4488ff',
        ORB_X:       '#ff4444',
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
    { id: 'avatar',  name: 'Avatar Ninja',   color: '#ffffff', accent: '#ffcc44', detail: 'katana',    female: false, face: 'calm',    unlockEnemy: 'tensei' },
];
const ENEMIES = [
    {
        id: 'kaen',
        name: 'Kaen', title: 'Fire Genin', affinity: 'fire',
        spells: ['ZZZ','ZZX','XZX','XXX','CZZ','CCX'],
        color: '#ff6b35', aiSpeed: 0.6, castRate: 2500,
        stamina: 80, staminaRegen: 18,
        desc: 'Aggressive fire user. Loves Burn Lane and Fire Birds.',
    },
    {
        id: 'hyoga',
        name: 'Hyoga', title: 'Ice Kunoichi', affinity: 'ice',
        spells: ['ZZZ','ZZX','XZZ','XXZ','CZX','CZZ','CCZ'],
        color: '#00d4ff', aiSpeed: 0.7, castRate: 2200,
        stamina: 90, staminaRegen: 20,
        desc: 'Freezes lanes and hides behind Blockies and Crystal Birds.',
    },
    {
        id: 'kaze',
        name: 'Kaze', title: 'Wind Kunoichi', affinity: 'wind',
        spells: ['ZZZ','ZZC','ZXZ','ZCX','XZC','CXC','CZC'],
        color: '#88ffcc', aiSpeed: 0.9, castRate: 1800,
        stamina: 95, staminaRegen: 22,
        desc: 'Lightning fast. Samurai and Javelineers hold the line.',
    },
    {
        id: 'raiden',
        name: 'Raiden', title: 'Thunder Jonin', affinity: 'shock',
        spells: ['ZZX','ZXC','XZX','XCC','CZX','CXC','CCC'],
        color: '#ffee00', aiSpeed: 0.8, castRate: 2000,
        stamina: 100, staminaRegen: 24,
        desc: 'Stun-locks with AOE Shock and swarms of summons.',
    },
    {
        id: 'tsuchi',
        name: 'Tsuchi', title: 'Earth Sage', affinity: 'earth',
        spells: ['ZZX','ZCZ','XXC','XCC','CZX','CZC','CXC'],
        color: '#aa8855', aiSpeed: 0.5, castRate: 2800,
        stamina: 120, staminaRegen: 20,
        desc: 'Slow but tanky. Quake stuns and walls of summons.',
    },
    {
        id: 'yami',
        name: 'Yami', title: 'Shadow Master', affinity: 'shadow',
        spells: ['ZZX','ZCX','ZCC','XZZ','XZX','CZZ','CXX','CXC'],
        color: '#9b59b6', aiSpeed: 0.85, castRate: 1800,
        stamina: 110, staminaRegen: 26,
        desc: 'Unpredictable. Hydras, Samurai, and Lantern heals.',
    },
    {
        id: 'mizu',
        name: 'Mizu', title: 'Water Priestess', affinity: 'water',
        spells: ['ZZC','ZXZ','ZCZ','XXZ','CZZ','CZX','CZC','CXX','CCZ'],
        color: '#3498db', aiSpeed: 0.7, castRate: 2000,
        stamina: 110, staminaRegen: 25,
        desc: 'Defensive healer. Healing Lamps and deflecting Javelineers.',
    },
    {
        id: 'ryujin',
        name: 'Ryujin', title: 'Dragon Master', affinity: 'fire',
        spells: ['ZZX','ZXX','ZXC','XZX','XXX','XCX','XCC','CXZ','CXX','CXC','CCX'],
        color: '#ff4444', aiSpeed: 1.0, castRate: 1500,
        stamina: 130, staminaRegen: 30,
        desc: 'The ultimate test. Fire, thunder, and an army of summons.',
    },
    {
        id: 'tensei',
        name: 'Tensei', title: 'The Avatar', affinity: 'avatar',
        spells: ['ZCZ','ZXZ','ZXC','XZZ','XXZ','XXC','XCZ','XCC','CXZ','CCZ','CCC'],
        color: '#ffffff', aiSpeed: 1.0, castRate: 1400,
        stamina: 140, staminaRegen: 32,
        desc: 'Master of all elements. Fire, ice, thunder — nothing is beyond reach.',
    },
];

function getEnemyById(id) {
    return ENEMIES.find(e => e.id === id);
}
