const aiParams = (function() {
    const defaults = {
        maxSpots: 8,
        speed: 85,
        showThinking: true,
        fastAnimations: false,
        fastSpeed: 50,
        linesPriority: 1.0,
        aggressiveness: 1.0,
        energyFactor: 1.5,
        edgePenalty: 5.0,
        spaceBonus: 50,
        noSpacePenalty: 8000,
        comboExponent: 2.8,
        comboMultiplier: 60
    };

    let params = { ...defaults };

    function get(name) { return params[name]; }
    function set(name, value) { 
        params[name] = value;
        if (name === 'fastAnimations') {
            updateFastAnimationsClass();
        }
    }
    function getAll() { return { ...params }; }
    function reset() { 
        params = { ...defaults }; 
        updateFastAnimationsClass();
    }

    function updateFastAnimationsClass() {
        if (params.fastAnimations) {
            document.body.classList.add('fast-animations');
        } else {
            document.body.classList.remove('fast-animations');
        }
    }

    function updateFromUI() {
        params.maxSpots = parseInt(document.getElementById('ai-max-spots').value);
        params.speed = parseInt(document.getElementById('ai-speed-panel').value);
        params.showThinking = document.getElementById('chk-thinking-panel').checked;
        params.fastAnimations = document.getElementById('chk-fast-anim-panel').checked;
        params.fastSpeed = parseInt(document.getElementById('ai-fast-speed-panel').value);
        params.linesPriority = parseInt(document.getElementById('ai-lines-priority').value) / 100;
        params.aggressiveness = parseInt(document.getElementById('ai-aggressiveness').value) / 100;
        params.energyFactor = parseInt(document.getElementById('ai-energy').value) / 100;
        params.edgePenalty = parseInt(document.getElementById('ai-edge').value) / 10;
        params.spaceBonus = parseInt(document.getElementById('ai-space').value);
        params.noSpacePenalty = parseInt(document.getElementById('ai-no-space').value);
        params.comboExponent = parseInt(document.getElementById('ai-combo-exp').value) / 10;
        params.comboMultiplier = parseInt(document.getElementById('ai-combo-mult').value);

        document.getElementById('fast-speed-row-panel').style.display = params.fastAnimations ? 'block' : 'none';
        updateFastAnimationsClass();
        updateValuesDisplay();
        syncMainPanel();
    }

    function syncMainPanel() {
        document.getElementById('ai-speed').value = params.speed;
        document.getElementById('chk-thinking').checked = params.showThinking;
        document.getElementById('chk-fast-anim').checked = params.fastAnimations;
        document.getElementById('ai-fast-speed').value = params.fastSpeed;
        document.getElementById('fast-speed-row').style.display = params.fastAnimations ? 'flex' : 'none';
    }

    function updateValuesDisplay() {
        document.getElementById('val-max-spots').textContent = params.maxSpots;
        document.getElementById('val-speed').textContent = params.speed;
        document.getElementById('val-thinking').textContent = params.showThinking ? 'ON' : 'OFF';
        document.getElementById('val-fast-anim').textContent = params.fastAnimations ? 'ON' : 'OFF';
        document.getElementById('val-fast-speed').textContent = params.fastSpeed;
        document.getElementById('val-lines-priority').textContent = params.linesPriority.toFixed(1);
        document.getElementById('val-aggressiveness').textContent = params.aggressiveness.toFixed(1);
        document.getElementById('val-energy').textContent = params.energyFactor.toFixed(1);
        document.getElementById('val-edge').textContent = params.edgePenalty.toFixed(1);
        document.getElementById('val-space').textContent = params.spaceBonus;
        document.getElementById('val-no-space').textContent = params.noSpacePenalty;
        document.getElementById('val-combo-exp').textContent = params.comboExponent.toFixed(1);
        document.getElementById('val-combo-mult').textContent = params.comboMultiplier;
    }

    function syncUI() {
        document.getElementById('ai-max-spots').value = params.maxSpots;
        document.getElementById('val-max-spots').textContent = params.maxSpots;
        
        document.getElementById('ai-speed-panel').value = params.speed;
        document.getElementById('ai-speed').value = params.speed;
        document.getElementById('val-speed').textContent = params.speed;
        
        document.getElementById('chk-thinking-panel').checked = params.showThinking;
        document.getElementById('chk-thinking').checked = params.showThinking;
        document.getElementById('val-thinking').textContent = params.showThinking ? 'ON' : 'OFF';
        
        document.getElementById('chk-fast-anim-panel').checked = params.fastAnimations;
        document.getElementById('chk-fast-anim').checked = params.fastAnimations;
        document.getElementById('val-fast-anim').textContent = params.fastAnimations ? 'ON' : 'OFF';
        document.getElementById('fast-speed-row-panel').style.display = params.fastAnimations ? 'block' : 'none';
        document.getElementById('fast-speed-row').style.display = params.fastAnimations ? 'flex' : 'none';
        
        document.getElementById('ai-fast-speed-panel').value = params.fastSpeed;
        document.getElementById('ai-fast-speed').value = params.fastSpeed;
        document.getElementById('val-fast-speed').textContent = params.fastSpeed;
        
        document.getElementById('ai-lines-priority').value = Math.round(params.linesPriority * 100);
        document.getElementById('val-lines-priority').textContent = params.linesPriority.toFixed(1);
        
        document.getElementById('ai-aggressiveness').value = Math.round(params.aggressiveness * 100);
        document.getElementById('val-aggressiveness').textContent = params.aggressiveness.toFixed(1);
        
        document.getElementById('ai-energy').value = Math.round(params.energyFactor * 100);
        document.getElementById('val-energy').textContent = params.energyFactor.toFixed(1);
        
        document.getElementById('ai-edge').value = Math.round(params.edgePenalty * 10);
        document.getElementById('val-edge').textContent = params.edgePenalty.toFixed(1);
        
        document.getElementById('ai-space').value = params.spaceBonus;
        document.getElementById('val-space').textContent = params.spaceBonus;
        
        document.getElementById('ai-no-space').value = params.noSpacePenalty;
        document.getElementById('val-no-space').textContent = params.noSpacePenalty;
        
        document.getElementById('ai-combo-exp').value = Math.round(params.comboExponent * 10);
        document.getElementById('val-combo-exp').textContent = params.comboExponent.toFixed(1);
        
        document.getElementById('ai-combo-mult').value = params.comboMultiplier;
        document.getElementById('val-combo-mult').textContent = params.comboMultiplier;

        updateFastAnimationsClass();
    }

    function init() {
        const panel = document.getElementById('advanced-settings-panel');
        const toggleBtn = document.getElementById('ai-settings-toggle');
        const closeBtn = document.getElementById('close-settings');
        const resetBtn = document.getElementById('reset-settings');

        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('open');
        });

        closeBtn.addEventListener('click', () => {
            panel.classList.remove('open');
        });

        resetBtn.addEventListener('click', () => {
            reset();
            syncUI();
        });

        const sliders = panel.querySelectorAll('.setting-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', () => {
                updateFromUI();
            });
        });

        const checkboxes = panel.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateFromUI();
            });
        });

        // Main panel controls
        const mainSpeedSlider = document.getElementById('ai-speed');
        const mainThinkingCheckbox = document.getElementById('chk-thinking');
        const mainFastAnimCheckbox = document.getElementById('chk-fast-anim');
        const mainFastSpeedSlider = document.getElementById('ai-fast-speed');

        mainSpeedSlider.addEventListener('input', () => {
            params.speed = parseInt(mainSpeedSlider.value);
            document.getElementById('ai-speed-panel').value = params.speed;
            document.getElementById('val-speed').textContent = params.speed;
        });

        mainThinkingCheckbox.addEventListener('change', () => {
            params.showThinking = mainThinkingCheckbox.checked;
            document.getElementById('chk-thinking-panel').checked = params.showThinking;
            document.getElementById('val-thinking').textContent = params.showThinking ? 'ON' : 'OFF';
        });

        mainFastAnimCheckbox.addEventListener('change', () => {
            params.fastAnimations = mainFastAnimCheckbox.checked;
            document.getElementById('chk-fast-anim-panel').checked = params.fastAnimations;
            document.getElementById('val-fast-anim').textContent = params.fastAnimations ? 'ON' : 'OFF';
            document.getElementById('fast-speed-row').style.display = params.fastAnimations ? 'flex' : 'none';
            document.getElementById('fast-speed-row-panel').style.display = params.fastAnimations ? 'block' : 'none';
            updateFastAnimationsClass();
        });

        mainFastSpeedSlider.addEventListener('input', () => {
            params.fastSpeed = parseInt(mainFastSpeedSlider.value);
            document.getElementById('ai-fast-speed-panel').value = params.fastSpeed;
            document.getElementById('val-fast-speed').textContent = params.fastSpeed;
        });

        syncUI();
    }

    return { get, set, getAll, reset, init };
})();