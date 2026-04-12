// ============================================================
// spells.js - All 27 spell definitions, evolution, categories
// ============================================================

// Spell types: projectile, instant, enchant, defensive, lane, aoe, summon
// All spells have flat stats (no levels). Balanced for 50 HP / 30 Loyalty.
const SPELL_DATA = {
    // ===== Z-starters: Physical / Utility =====
    'ZZZ': {
        name: 'Shuriken', type: 'projectile', category: 'attack', affinity: 'none',
        icon: 'shuriken',
        desc: 'Fast throwing star. Pierces enemies.',
        stats: { dmg: 3, speed: 9, cd: 300, pierce: true, stamina: 15 },
    },
    'ZZX': {
        name: 'Sword Slash', type: 'instant', category: 'attack', affinity: 'none',
        icon: 'sword',
        desc: 'Instant blade reaching half the field.',
        stats: { dmg: 8, range: 0.35, cd: 500, stamina: 18 },
    },
    'ZZC': {
        name: 'Bow Shot', type: 'projectile', category: 'attack', affinity: 'none',
        icon: 'arrow',
        desc: 'Powerful piercing arrow with brief draw time.',
        stats: { dmg: 8, speed: 13, cd: 600, chargeTime: 250, pierce: true, stamina: 20 },
    },
    'ZXZ': {
        name: 'Frost Enchant', type: 'enchant', category: 'buff', affinity: 'ice',
        icon: 'enchant_ice',
        desc: 'Coats weapons in ice. Freezes on hit & your side resists ice.',
        stats: { duration: 7000, bonusDmg: 2, freezeDur: 800, cd: 4000, stamina: 22 },
    },
    'ZXX': {
        name: 'Ember Enchant', type: 'enchant', category: 'buff', affinity: 'fire',
        icon: 'enchant_fire',
        desc: 'Coats weapons in fire. Adds burn on hit & your side resists fire.',
        stats: { duration: 7000, bonusDmg: 2, burnDmg: 1, burnDur: 2000, cd: 4000, stamina: 22 },
    },
    'ZXC': {
        name: 'Volt Enchant', type: 'enchant', category: 'buff', affinity: 'shock',
        icon: 'enchant_shock',
        desc: 'Coats weapons in lightning. Stuns on hit & your side resists shock.',
        stats: { duration: 7000, bonusDmg: 2, stunDur: 500, cd: 4000, stamina: 22 },
    },
    'ZCZ': {
        name: 'Shield', type: 'defensive', category: 'buff', affinity: 'none',
        icon: 'shield',
        desc: 'Blocks all damage to your side briefly.',
        stats: { duration: 2200, cd: 3200, stamina: 18 },
    },
    'ZCX': {
        name: 'Mistveil', type: 'defensive', category: 'buff', affinity: 'none',
        icon: 'invis',
        desc: "Your side can't be hit but can step on hazards.",
        stats: { duration: 1800, cd: 3800, stamina: 16 },
    },
    'ZCC': {
        name: 'Deflection', type: 'defensive', category: 'buff', affinity: 'none',
        icon: 'deflect',
        desc: 'Your side deflects projectiles back at enemies.',
        stats: { hits: 3, cd: 3500, stamina: 14 },
    },

    // ===== X-starters: Summon Commands =====
    'XZZ': {
        name: 'Mend', type: 'utility', category: 'summon_cmd', affinity: 'none',
        icon: 'heal',
        desc: 'Heal all your summons.',
        stats: { healAmt: 8, cd: 4000, stamina: 12, windup: 400 },
    },
    'XZX': {
        name: 'War Drums', type: 'utility', category: 'summon_cmd', affinity: 'none',
        icon: 'drums',
        desc: 'All summons gain bonus move speed and attack speed.',
        stats: { duration: 5000, speedMult: 1.5, atkMult: 1.5, cd: 6000, stamina: 18, windup: 400 },
    },
    'XZC': {
        name: 'Absorption', type: 'utility', category: 'summon_cmd', affinity: 'none',
        icon: 'absorb',
        desc: 'Consume all your summons to restore HP and stamina.',
        stats: { hpPerSummon: 6, staminaPerSummon: 10, cd: 8000, stamina: 8, windup: 500 },
    },
    'XXZ': {
        name: 'Frostbite Path', type: 'lane', category: 'magic', affinity: 'ice',
        icon: 'freeze_lane',
        desc: 'Freezes the enemy half of the lane.',
        stats: { duration: 2800, freezeDur: 1000, cd: 3800, stamina: 24 },
    },
    'XXX': {
        name: 'Inferno Path', type: 'lane', category: 'magic', affinity: 'fire',
        icon: 'burn_lane',
        desc: 'Scorches the enemy half of the lane with flames.',
        stats: { duration: 3000, dmg: 1, tickRate: 500, cd: 3800, stamina: 24 },
    },
    'XXC': {
        name: 'Thunder Path', type: 'lane', category: 'magic', affinity: 'shock',
        icon: 'shock_lane',
        desc: 'Instantly shocks the enemy half of the lane. Stuns and damages.',
        stats: { duration: 1000, dmg: 4, stunDur: 800, instant: true, cd: 4000, stamina: 26 },
    },
    'XCZ': {
        name: 'Glacial Pillar', type: 'vlane', category: 'ultimate', affinity: 'ice',
        icon: 'vlane_ice',
        desc: 'Freezes a vertical column on the enemy side.',
        stats: { duration: 2800, freezeDur: 1000, cd: 5500, stamina: 32 },
    },
    'XCX': {
        name: 'Meteor Rain', type: 'vlane', category: 'ultimate', affinity: 'fire',
        icon: 'vlane_fire',
        desc: 'Rains fire in a vertical column on the enemy side. Burns everything.',
        stats: { duration: 3000, dmg: 1, tickRate: 500, burnDmg: 1, burnDur: 2000, cd: 5500, stamina: 32 },
    },
    'XCC': {
        name: 'Thunder Strike', type: 'vlane', category: 'ultimate', affinity: 'shock',
        icon: 'vlane_shock',
        desc: 'Instant lightning strike in a vertical column. High damage and stun.',
        stats: { duration: 1000, dmg: 4, stunDur: 800, instant: true, cd: 5500, stamina: 35 },
    },

    // ===== C-starters: Summons =====
    'CZZ': {
        name: 'Lantern Spirit', type: 'summon', category: 'support', affinity: 'none',
        icon: 'lamp',
        desc: 'Heals nearby allies in the same lane. No attack.',
        stats: { hp: 4, dmg: 0, atkRate: 0, healAmt: 2, healRate: 2000, cd: 4500, loyaltyVal: 3, stamina: 20 },
        behavior: 'healer',  // drifts toward lowest HP ally, switches lanes
    },
    'CZX': {
        name: 'Blocky', type: 'summon', category: 'tank', affinity: 'none',
        icon: 'blocky',
        desc: 'A living barricade. Lots of HP, slow attack.',
        stats: { hp: 12, dmg: 2, atkRate: 2800, cd: 5000, loyaltyVal: 5, stamina: 26 },
        behavior: 'guardian', // moves to front, switches to threatened lanes
    },
    'CZC': {
        name: 'Shield Javelineer', type: 'summon', category: 'tank', affinity: 'none',
        icon: 'javelineer',
        desc: 'Deflects projectiles sometimes.',
        stats: { hp: 7, dmg: 2, atkRate: 2200, cd: 4000, deflectChance: 0.3, loyaltyVal: 4, stamina: 22 },
        behavior: 'sentinel', // holds mid-position, sidesteps toward incoming projectiles
    },
    'CXZ': {
        name: 'Ice Dragon Head', type: 'summon', category: 'magic', affinity: 'ice',
        icon: 'dragon',
        desc: 'Breathes frost across the enemy lane.',
        stats: { hp: 6, dmg: 1, atkRate: 3000, cd: 5000, breathDmg: 1, breathDur: 3000, freezeDur: 700, loyaltyVal: 5, stamina: 30 },
        behavior: 'artillery', // stays back near backline, attacks from distance
    },
    'CXX': {
        name: 'Hydra Head', type: 'summon', category: 'tank', affinity: 'none',
        icon: 'hydra',
        desc: '3 heads with shared HP pool.',
        stats: { hp: 4, dmg: 2, atkRate: 2500, cd: 5000, heads: 3, loyaltyVal: 4, stamina: 24 },
        behavior: 'brute',    // lurches forward to attack, retreats after
    },
    'CXC': {
        name: 'Samurai', type: 'summon', category: 'attack', affinity: 'none',
        icon: 'samurai',
        desc: 'Strong attacker. Throws shurikens.',
        stats: { hp: 6, dmg: 4, atkRate: 2700, cd: 5000, loyaltyVal: 5, stamina: 26 },
        behavior: 'aggressor', // pushes toward midline aggressively
    },
    'CCZ': {
        name: 'Crystal Bird', type: 'summon', category: 'magic', affinity: 'ice',
        icon: 'bird_ice',
        desc: 'Fires icy shots that freeze enemies.',
        stats: { hp: 3, dmg: 2, atkRate: 2400, cd: 3200, freezeDur: 800, loyaltyVal: 3, stamina: 18 },
        behavior: 'skirmisher', // zig-zags horizontally in lane, evasive
    },
    'CCX': {
        name: 'Fire Bird', type: 'summon', category: 'magic', affinity: 'fire',
        icon: 'bird_fire',
        desc: 'Fires burning shots.',
        stats: { hp: 3, dmg: 3, atkRate: 2400, cd: 3200, burnDmg: 1, burnDur: 1500, loyaltyVal: 3, stamina: 18 },
        behavior: 'skirmisher', // zig-zags horizontally in lane, evasive
    },
    'CCC': {
        name: 'Electric Bird', type: 'summon', category: 'magic', affinity: 'shock',
        icon: 'bird_shock',
        desc: 'Fires shocking shots that stun enemies.',
        stats: { hp: 3, dmg: 2, atkRate: 2400, cd: 3200, stunDur: 600, loyaltyVal: 3, stamina: 18 },
        behavior: 'skirmisher', // zig-zags horizontally in lane, evasive
    },
};

// Ordered list of all combo keys
const ALL_COMBOS = Object.keys(SPELL_DATA);

// Get spell stats (flat, no levels)
function getSpellStats(comboKey) {
    const spell = SPELL_DATA[comboKey];
    if (!spell) return null;
    return spell.stats;
}

// Category colors for UI
const CATEGORY_COLORS = {
    attack:   '#ff6666',
    magic:    '#aa66ff',
    buff:     '#66ccff',
    support:  '#66ff99',
    tank:     '#ffaa44',
    ultimate: '#ff44aa',
};

// Affinity colors
const AFFINITY_COLORS = {
    none:   '#cccccc',
    fire:   CONFIG.C.FIRE,
    ice:    CONFIG.C.ICE,
    shock:  CONFIG.C.SHOCK,
    poison: CONFIG.C.POISON,
    wind:   CONFIG.C.WIND,
    earth:  CONFIG.C.EARTH,
    shadow: CONFIG.C.SHADOW,
    water:  CONFIG.C.WATER,
};
