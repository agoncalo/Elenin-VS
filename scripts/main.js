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
    const defeated = new Set(JSON.parse(localStorage.getItem('eleninVS_defeated') || '[]'));
    function saveDefeated() {
        localStorage.setItem('eleninVS_defeated', JSON.stringify([...defeated]));
    }
    let playerSkin = PLAYER_SKINS[0];    // current skin (default black)
    const playerStats = new PlayerStats();

    // State machine
    let state = 'menu';
    let scene = new MenuScene(input, defeated);
    let currentEnemy = null;
    let lastSelectedEnemy = 0;
    let combat = null;
    let net = null;           // NetManager for multiplayer
    let lastTime = performance.now();

    function setState(newState, data) {
        // Clean up combat listeners when leaving combat/mpCombat
        if ((state === 'combat' || state === 'mpCombat') && combat) {
            combat.destroy();
        }
        state = newState;
        input.reset();

        // Music
        if (newState === 'combat') {
            AudioEngine.playMusic(data.affinity || 'fire');
        } else if (newState === 'mpCombat') {
            AudioEngine.playMusic('fire');
        } else if (newState === 'defeat') {
            AudioEngine.stopMusic();
            AudioEngine.playSfx('defeat');
        } else {
            AudioEngine.playMusic('menu');
        }

        switch (newState) {
            case 'menu':
                if (net) { net.destroy(); net = null; }
                scene = new MenuScene(input, defeated);
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
            case 'options':
                scene = new OptionsScene(input);
                break;
            case 'enemySelect':
                scene = new EnemySelectScene(input, defeated, data != null ? data : lastSelectedEnemy);
                break;
            case 'combat':
                currentEnemy = data;
                combat = new Combat(data, input, playerSkin, playerStats);
                scene = combat;
                break;
            case 'defeat':
                scene = new DefeatScene(input);
                break;
            // --- Multiplayer states ---
            case 'mpMenu':
                scene = new MPMenuScene(input);
                break;
            case 'mpHost':
                net = new NetManager();
                scene = new MPHostScene(input, net, playerSkin);
                break;
            case 'mpJoin':
                net = new NetManager();
                scene = new MPJoinScene(input, net, playerSkin);
                break;
            case 'mpCombat': {
                // data = { isHost, remoteSkin }
                const dummyEnemy = { id: 'pvp', name: 'Player 2', affinity: 'fire', spells: [], color: '#d94a4a', aiSpeed: 1 };
                combat = new Combat(dummyEnemy, input, playerSkin, null, {
                    net: net,
                    isHost: data.isHost,
                    remoteSkin: data.remoteSkin || null,
                });
                scene = combat;
                break;
            }
        }
    }

    function tick(now) {
        const dt = Math.min(now - lastTime, 50); // cap delta to avoid spiral
        lastTime = now;

        input.update(dt);

        // Mute toggle (M key)
        if (input.wasPressed('KeyM')) {
            AudioEngine.toggleMute();
        }
        // Ensure AudioContext is running after user interaction
        AudioEngine.resume();
        // Start menu music on first interaction
        if (!AudioEngine._menuStarted && Object.keys(input.keys).some(k => input.keys[k])) {
            AudioEngine.playMusic('menu');
            AudioEngine._menuStarted = true;
        }

        let result;
        switch (state) {
            case 'menu':
                result = scene.update(dt);
                if (result === 'Fight') setState('enemySelect');
                else if (result === 'Versus') setState('mpMenu');
                else if (result === 'Spells') setState('spells');
                else if (result === 'Skins') setState('skins');
                else if (result === 'Options') setState('options');
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

            case 'options':
                result = scene.update(dt);
                if (result === 'back') setState('menu');
                break;

            case 'enemySelect':
                result = scene.update(dt);
                if (result === 'back') {
                    lastSelectedEnemy = scene.selected;
                    setState('menu');
                } else if (result && result.action === 'start') {
                    lastSelectedEnemy = scene.selected;
                    setState('combat', result.enemy);
                }
                break;

            case 'combat':
                // Pause toggle
                if (input.wasPressed('Escape')) {
                    combat.paused = !combat.paused;
                    combat.pauseSelected = 0;
                }
                if (combat.paused) {
                    // Pause menu navigation
                    if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
                        combat.pauseSelected = 1 - combat.pauseSelected;
                    }
                    if (input.wasPressed('Enter') || input.wasPressed('KeyZ')) {
                        if (combat.pauseSelected === 0) {
                            combat.paused = false; // Continue
                        } else {
                            setState('menu'); // Quit
                        }
                    }
                } else {
                    result = combat.update(dt);
                    if (result === 'win') {
                        defeated.add(currentEnemy.id);
                        saveDefeated();
                        AudioEngine.stopMusic();
                        AudioEngine.playSfx('victory');
                        // Select newly unlocked enemy, or stay on current
                        const curIdx = ENEMIES.findIndex(e => e.id === currentEnemy.id);
                        const nextIdx = curIdx + 1;
                        if (nextIdx < ENEMIES.length && !defeated.has(ENEMIES[nextIdx].id)) {
                            setState('enemySelect', nextIdx);
                        } else {
                            setState('enemySelect', curIdx);
                        }
                    } else if (result === 'lose') {
                        setState('defeat');
                    }
                }
                break;

            case 'defeat':
                result = scene.update(dt);
                if (result === 'retry') setState('combat', currentEnemy);
                else if (result === 'menu') setState('menu');
                break;

            // --- Multiplayer states ---
            case 'mpMenu':
                result = scene.update(dt);
                if (result === 'Host') setState('mpHost');
                else if (result === 'Join') setState('mpJoin');
                else if (result === 'back' || result === 'Back') setState('menu');
                break;

            case 'mpHost':
                result = scene.update(dt);
                if (result === 'back') setState('menu');
                else if (result && result.action === 'start') {
                    setState('mpCombat', { isHost: true, remoteSkin: result.remoteSkin || null });
                }
                break;

            case 'mpJoin':
                result = scene.update(dt);
                if (result === 'back') setState('menu');
                else if (result && result.action === 'start') {
                    setState('mpCombat', { isHost: false, remoteSkin: result.remoteSkin || null });
                }
                break;

            case 'mpCombat':
                // Pause toggle
                if (input.wasPressed('Escape')) {
                    combat.paused = !combat.paused;
                    combat.pauseSelected = 0;
                }
                if (combat.paused) {
                    if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
                        combat.pauseSelected = 1 - combat.pauseSelected;
                    }
                    if (input.wasPressed('Enter') || input.wasPressed('KeyZ')) {
                        if (combat.pauseSelected === 0) {
                            combat.paused = false;
                        } else {
                            if (net) { net.destroy(); net = null; }
                            setState('menu');
                        }
                    }
                } else {
                    result = combat.update(dt);
                    if (result === 'win') {
                        AudioEngine.stopMusic();
                        AudioEngine.playSfx('victory');
                        if (net) { net.destroy(); net = null; }
                        setState('menu');
                    } else if (result === 'lose') {
                        AudioEngine.stopMusic();
                        AudioEngine.playSfx('defeat');
                        if (net) { net.destroy(); net = null; }
                        setState('menu');
                    }
                }
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
