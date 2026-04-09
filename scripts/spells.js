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
        stats: { dmg: 3, speed: 9, cd: 250, pierce: true },
    },
    'ZZX': {
        name: 'Sword Slash', type: 'instant', category: 'attack', affinity: 'none',
        icon: 'sword',
        desc: 'Instant blade reaching half the field.',
        stats: { dmg: 7, range: 0.25, cd: 500 },
    },
    'ZZC': {
        name: 'Bow Shot', type: 'projectile', category: 'attack', affinity: 'none',
        icon: 'arrow',
        desc: 'Powerful piercing arrow with brief draw time.',
        stats: { dmg: 6, speed: 12, cd: 600, chargeTime: 250, pierce: true },
    },
    'ZXZ': {
        name: 'Ember Enchant', type: 'enchant', category: 'buff', affinity: 'fire',
        icon: 'enchant_fire',
        desc: 'Coats weapons in fire. Adds burn on hit & resists fire.',
        stats: { duration: 8000, bonusDmg: 3, burnDmg: 1, burnDur: 2000, cd: 3500 },
    },
    'ZXX': {
        name: 'Frost Enchant', type: 'enchant', category: 'buff', affinity: 'ice',
        icon: 'enchant_ice',
        desc: 'Coats weapons in ice. Freezes on hit & resists ice.',
        stats: { duration: 8000, bonusDmg: 3, freezeDur: 800, cd: 3500 },
    },
    'ZXC': {
        name: 'Volt Enchant', type: 'enchant', category: 'buff', affinity: 'shock',
        icon: 'enchant_shock',
        desc: 'Coats weapons in lightning. Stuns on hit & resists shock.',
        stats: { duration: 8000, bonusDmg: 3, stunDur: 600, cd: 3500 },
    },
    'ZCZ': {
        name: 'Shield', type: 'defensive', category: 'buff', affinity: 'none',
        icon: 'shield',
        desc: 'Blocks all damage briefly.',
        stats: { duration: 2500, cd: 2800 },
    },
    'ZCX': {
        name: 'Mistveil', type: 'defensive', category: 'buff', affinity: 'none',
        icon: 'invis',
        desc: "Can't be hit but can step on hazards.",
        stats: { duration: 2000, cd: 3500 },
    },
    'ZCC': {
        name: 'Deflection', type: 'defensive', category: 'buff', affinity: 'none',
        icon: 'deflect',
        desc: 'Deflects projectiles back at enemies.',
        stats: { hits: 3, cd: 3000 },
    },

    // ===== X-starters: Magic Attacks =====
    'XZZ': {
        name: 'Fireball', type: 'projectile', category: 'magic', affinity: 'fire',
        icon: 'fireball',
        desc: 'Quick fireball that burns on hit.',
        stats: { dmg: 4, speed: 7, cd: 500, burnDmg: 1, burnDur: 1500 },
    },
    'XZX': {
        name: 'Ice Shard', type: 'projectile', category: 'magic', affinity: 'ice',
        icon: 'iceshard',
        desc: 'Quick ice shard that freezes on hit.',
        stats: { dmg: 4, speed: 7, cd: 500, freezeDur: 700 },
    },
    'XZC': {
        name: 'Venom Mist', type: 'projectile', category: 'magic', affinity: 'poison',
        icon: 'poison',
        desc: 'Slow-moving toxic cloud. Poisons anything it touches.',
        stats: { dmg: 1, speed: 2.5, cd: 600, poisonDmg: 1, poisonDur: 3000, areaW: 60 },
    },
    'XXZ': {
        name: 'Frostbite Path', type: 'lane', category: 'magic', affinity: 'ice',
        icon: 'freeze_lane',
        desc: 'Freezes the enemy half of the lane.',
        stats: { duration: 3000, freezeDur: 1200, cd: 3500 },
    },
    'XXX': {
        name: 'Inferno Path', type: 'lane', category: 'magic', affinity: 'fire',
        icon: 'burn_lane',
        desc: 'Scorches the enemy half of the lane with flames.',
        stats: { duration: 3000, dmg: 1, tickRate: 500, cd: 3500 },
    },
    'XXC': {
        name: 'Boulder Toss', type: 'projectile', category: 'magic', affinity: 'earth',
        icon: 'boulder',
        desc: 'Big slow boulder with knockback.',
        stats: { dmg: 7, speed: 3.5, cd: 1000, knockback: true },
    },
    'XCZ': {
        name: 'Meteor Rain', type: 'aoe', category: 'ultimate', affinity: 'fire',
        icon: 'aoe_fire',
        desc: 'Rains fire across all lanes. Burns everything.',
        stats: { dmg: 1, hits: 4, burnDmg: 1, burnDur: 2000, cd: 5000 },
    },
    'XCX': {
        name: 'Glacial Wave', type: 'aoe', category: 'ultimate', affinity: 'ice',
        icon: 'aoe_ice',
        desc: 'Massive freeze wave across all lanes.',
        stats: { freezeDur: 2000, dmg: 1, cd: 5000 },
    },
    'XCC': {
        name: 'Thunder Wrath', type: 'aoe', category: 'ultimate', affinity: 'shock',
        icon: 'aoe_shock',
        desc: 'Lightning storm across all lanes.',
        stats: { stunDur: 1200, dmg: 1, cd: 5000 },
    },

    // ===== C-starters: Summons =====
    'CZZ': {
        name: 'Lantern Spirit', type: 'summon', category: 'support', affinity: 'none',
        icon: 'lamp',
        desc: 'Heals nearby allies in the same lane. No attack.',
        stats: { hp: 5, dmg: 0, atkRate: 0, healAmt: 2, healRate: 1800, cd: 4000, loyaltyVal: 3 },
    },
    'CZX': {
        name: 'Blocky', type: 'summon', category: 'tank', affinity: 'none',
        icon: 'blocky',
        desc: 'A living barricade. Lots of HP, slow attack.',
        stats: { hp: 14, dmg: 2, atkRate: 2800, cd: 4500, loyaltyVal: 5 },
    },
    'CZC': {
        name: 'Shield Javelineer', type: 'summon', category: 'tank', affinity: 'none',
        icon: 'javelineer',
        desc: 'Deflects projectiles sometimes.',
        stats: { hp: 8, dmg: 2, atkRate: 2200, cd: 3500, deflectChance: 0.3, loyaltyVal: 4 },
    },
    'CXZ': {
        name: 'Fire Dragon Head', type: 'summon', category: 'magic', affinity: 'fire',
        icon: 'dragon',
        desc: 'Breathes fire across the enemy lane.',
        stats: { hp: 7, dmg: 1, atkRate: 3000, cd: 4500, breathDmg: 1, breathDur: 3000, loyaltyVal: 5 },
    },
    'CXX': {
        name: 'Hydra Head', type: 'summon', category: 'tank', affinity: 'none',
        icon: 'hydra',
        desc: '3 heads with shared HP pool.',
        stats: { hp: 4, dmg: 2, atkRate: 2500, cd: 4500, heads: 3, loyaltyVal: 4 },
    },
    'CXC': {
        name: 'Samurai', type: 'summon', category: 'attack', affinity: 'none',
        icon: 'samurai',
        desc: 'Strong attacker. Throws shurikens.',
        stats: { hp: 7, dmg: 4, atkRate: 2700, cd: 4500, loyaltyVal: 5 },
    },
    'CCZ': {
        name: 'Crystal Bird', type: 'summon', category: 'magic', affinity: 'ice',
        icon: 'bird_ice',
        desc: 'Fires icy shots that freeze enemies.',
        stats: { hp: 4, dmg: 2, atkRate: 2200, cd: 3000, freezeDur: 900, loyaltyVal: 3 },
    },
    'CCX': {
        name: 'Electric Bird', type: 'summon', category: 'magic', affinity: 'shock',
        icon: 'bird_shock',
        desc: 'Fires shocking shots that stun enemies.',
        stats: { hp: 4, dmg: 2, atkRate: 2200, cd: 3000, stunDur: 700, loyaltyVal: 3 },
    },
    'CCC': {
        name: 'Fire Bird', type: 'summon', category: 'magic', affinity: 'fire',
        icon: 'bird_fire',
        desc: 'Fires burning shots.',
        stats: { hp: 4, dmg: 2, atkRate: 2200, cd: 3000, burnDmg: 1, burnDur: 1500, loyaltyVal: 3 },
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
