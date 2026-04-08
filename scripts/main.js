// ============================================================
// main.js - Entry point, game loop, state machine
// ============================================================
(function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = CONFIG.WIDTH;
    canvas.height = CONFIG.HEIGHT;

    const input = new InputManager();

    // Player state (persists across fights in session)
    const defeated = new Set();          // enemy IDs beaten this session
    let playerSkin = PLAYER_SKINS[0];    // current skin (default black)
    const playerStats = new PlayerStats();

    // State machine
    let state = 'menu';        // menu | spells | skins | howtoplay | stats | enemySelect | combat | defeat
    let scene = new MenuScene(input);
    let currentEnemy = null;
    let combat = null;
    let lastTime = performance.now();

    function setState(newState, data) {
        state = newState;
        input.reset();
        switch (newState) {
            case 'menu':
                scene = new MenuScene(input);
                break;
            case 'spells':
                scene = new SpellListScene(input);
                break;
            case 'skins':
                scene = new SkinSelectScene(input, defeated, playerSkin.id);
                break;
            case 'howtoplay':
                scene = new HowToPlayScene(input);
                break;
            case 'stats':
                scene = new StatsScene(input, playerStats);
                break;
            case 'enemySelect':
                scene = new EnemySelectScene(input);
                break;
            case 'combat':
                currentEnemy = data;
                combat = new Combat(data, input, playerSkin, playerStats);
                scene = combat;
                break;
            case 'defeat':
                scene = new DefeatScene(input);
                break;
        }
    }

    function tick(now) {
        const dt = Math.min(now - lastTime, 50); // cap delta to avoid spiral
        lastTime = now;

        input.update(dt);

        let result;
        switch (state) {
            case 'menu':
                result = scene.update(dt);
                if (result === 'Fight') setState('enemySelect');
                else if (result === 'Spells') setState('spells');
                else if (result === 'Skins') setState('skins');
                else if (result === 'How to Play') setState('howtoplay');
                else if (result === 'Stats') setState('stats');
                break;

            case 'spells':
                result = scene.update(dt);
                if (result === 'back') setState('menu');
                break;

            case 'skins':
                result = scene.update(dt);
                if (result === 'back') setState('menu');
                else if (result && result.action === 'select') {
                    playerSkin = result.skin;
                    setState('menu');
                }
                break;

            case 'howtoplay':
                result = scene.update(dt);
                if (result === 'back') setState('menu');
                break;

            case 'stats':
                result = scene.update(dt);
                if (result === 'back') setState('menu');
                break;

            case 'enemySelect':
                result = scene.update(dt);
                if (result === 'back') setState('menu');
                else if (result && result.action === 'start') {
                    setState('combat', result.enemy);
                }
                break;

            case 'combat':
                result = combat.update(dt);
                if (result === 'win') {
                    defeated.add(currentEnemy.id);
                    setState('enemySelect');
                } else if (result === 'lose') {
                    setState('defeat');
                }
                break;

            case 'defeat':
                result = scene.update(dt);
                if (result === 'retry') setState('combat', currentEnemy);
                else if (result === 'menu') setState('menu');
                break;
        }

        // Clear one-frame input flags after all logic
        input.lateUpdate();

        // Render
        ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        scene.draw(ctx);

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
})();
