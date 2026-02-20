const uiManager = (function() {
    let isDragging = false, dragPieceEl = null, dragGhost = null, isTouch = false;
    const cells = [];
    let aiWasEnabledBeforeGameOver = false;

    function init() {
        document.getElementById('best-score').innerText = gameCore.getHighscore();
        createBoard();
        fillTray();
        bindGlobalEvents();
        setupAIControls();
        aiParams.init();
        
        document.getElementById('btn-play-again').addEventListener('click', resetGame);
    }

    function createBoard() {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';
        for (let r = 0; r < gameCore.getRows(); r++) {
            cells[r] = [];
            for (let c = 0; c < gameCore.getCols(); c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                boardEl.appendChild(cell);
                cells[r][c] = cell;
            }
        }
    }

    function fillTray() {
        const trayEl = document.getElementById('tray');
        trayEl.innerHTML = '';
        const SHAPES = gameCore.getShapes();
        
        for (let i = 0; i < 3; i++) {
            const shapeDef = SHAPES[Math.floor(Math.random() * SHAPES.length)];
            const blocksCount = shapeDef.shape.flat().filter(x => x).length;
            const pieceObj = { ...shapeDef, blocksCount, originalIndex: i };
            
            const pieceEl = document.createElement('div');
            pieceEl.className = 'tray-piece';
            pieceEl.__pieceData = pieceObj;

            const rCount = pieceObj.shape.length;
            const cCount = Math.max(...pieceObj.shape.map(r => r.length));
            pieceEl.style.gridTemplateColumns = `repeat(${cCount}, 1fr)`;

            for (let r = 0; r < rCount; r++) {
                for (let c = 0; c < cCount; c++) {
                    const block = document.createElement('div');
                    block.className = 'block';
                    if (pieceObj.shape[r] && pieceObj.shape[r][c]) {
                        block.style.backgroundColor = pieceObj.color;
                    } else { block.classList.add('empty'); }
                    pieceEl.appendChild(block);
                }
            }
            bindPieceEvents(pieceEl, pieceObj);
            trayEl.appendChild(pieceEl);
        }
        
        checkPlayability();
        
        if (aiEngine.getEnabled() && !aiEngine.getLoopActive() && document.getElementById('tray').children.length > 0) {
            setTimeout(() => {
                if (aiEngine.getEnabled() && !aiEngine.getLoopActive()) {
                    aiEngine.startAITurn(document.getElementById('tray'), cells);
                }
            }, 100);
        }
    }

    function bindPieceEvents(pieceEl, pieceData) {
        pieceEl.addEventListener('pointerdown', (e) => {
            if (gameCore.getAnimating() || pieceEl.classList.contains('unplayable') || aiEngine.getEnabled()) return;
            isTouch = e.pointerType === 'touch';
            isDragging = true;
            dragPieceEl = pieceEl;
            gameCore.setDragPieceData(pieceData);
            createGhost(e.clientX, e.clientY);
            pieceEl.style.opacity = '0';
        });
    }

    function bindGlobalEvents() {
        document.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            moveGhost(e.clientX, e.clientY);
            checkHighlight();
        });

        document.addEventListener('pointerup', (e) => {
            if (!isDragging) return;
            if (gameCore.getDropTarget()) {
                placePiece();
                dragPieceEl.remove();
                checkLinesAndRefill();
            } else { dragPieceEl.style.opacity = '1'; }
            if(dragGhost) dragGhost.remove();
            clearHighlight();
            isDragging = false; gameCore.setDropTarget(null);
        });
    }

    function createGhost(x, y, isAI = false) {
        if (dragGhost) dragGhost.remove();
        dragGhost = document.createElement('div');
        dragGhost.className = 'ghost';
        const rect = cells[0][0].getBoundingClientRect();
        
        const dragPieceData = gameCore.getDragPieceData();
        const rCount = dragPieceData.shape.length;
        const cCount = Math.max(...dragPieceData.shape.map(r => r.length));

        dragGhost.style.display = 'grid';
        dragGhost.style.gridTemplateColumns = `repeat(${cCount}, ${rect.width}px)`;
        dragGhost.style.gridTemplateRows = `repeat(${rCount}, ${rect.height}px)`;
        dragGhost.style.gap = '2px';

        for (let r = 0; r < rCount; r++) {
            for (let c = 0; c < cCount; c++) {
                const block = document.createElement('div');
                if (dragPieceData.shape[r] && dragPieceData.shape[r][c]) {
                    block.style.backgroundColor = dragPieceData.color;
                    block.className = 'block solid';
                } else { block.className = 'block empty'; }
                dragGhost.appendChild(block);
            }
        }
        document.body.appendChild(dragGhost);
        if(!isAI) moveGhost(x, y);
    }

    function moveGhost(x, y) {
        if (!dragGhost) return;
        const rect = dragGhost.getBoundingClientRect();
        dragGhost.style.left = `${x - rect.width / 2}px`;
        dragGhost.style.top = `${y - (isTouch ? rect.height + 60 : rect.height / 2)}px`;
    }

    function getGridDropPos() {
        if (!dragGhost) return null;
        const solid = dragGhost.querySelector('.block.solid');
        if (!solid) return null;
        const rect = solid.getBoundingClientRect();
        const bx = rect.left + rect.width / 2, by = rect.top + rect.height / 2;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const cRect = cells[r][c].getBoundingClientRect();
                if (bx >= cRect.left && bx <= cRect.right && by >= cRect.top && by <= cRect.bottom) {
                    let rOff=0, cOff=0, found=false;
                    let dragPieceData = gameCore.getDragPieceData();
                    for(let sr=0; sr<dragPieceData.shape.length; sr++) {
                        for(let sc=0; sc<dragPieceData.shape[sr].length; sc++) {
                            if (dragPieceData.shape[sr][sc]) { rOff = sr; cOff = sc; found = true; break; }
                        }
                        if(found) break;
                    }
                    return { row: r - rOff, col: c - cOff };
                }
            }
        }
        return null;
    }

    function checkHighlight() {
        clearHighlight();
        const pos = getGridDropPos();
        if (!pos) return;
        const dragPieceData = gameCore.getDragPieceData();
        if (gameCore.canPlace(dragPieceData.shape, pos.row, pos.col, gameCore.getBoard())) {
            for (let r = 0; r < dragPieceData.shape.length; r++) {
                for (let c = 0; c < dragPieceData.shape[r].length; c++) {
                    if (dragPieceData.shape[r][c]) {
                        const cell = cells[pos.row + r][pos.col + c];
                        cell.classList.add('highlight');
                        cell.style.backgroundColor = dragPieceData.color;
                    }
                }
            }
            gameCore.setDropTarget(pos);
        }
    }

    function clearHighlight() {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                cells[r][c].classList.remove('highlight');
                if (!cells[r][c].classList.contains('filled')) cells[r][c].style.backgroundColor = '';
            }
        }
        gameCore.setDropTarget(null);
    }

    function placePiece() {
        const { row, col } = gameCore.getDropTarget();
        const dragPieceData = gameCore.getDragPieceData();
        const board = gameCore.getBoard();
        
        for (let r = 0; r < dragPieceData.shape.length; r++) {
            for (let c = 0; c < dragPieceData.shape[r].length; c++) {
                if (dragPieceData.shape[r][c]) {
                    board[row + r][col + c] = dragPieceData.color;
                    const cell = cells[row + r][col + c];
                    cell.classList.remove('highlight');
                    cell.classList.add('filled');
                    cell.style.backgroundColor = dragPieceData.color;
                }
            }
        }
        gameCore.addScore(dragPieceData.blocksCount * 10);
        updateScore();
    }

    function checkLinesAndRefill(callback = null, fastModeOverride = null) {
        let board = gameCore.getBoard();
        let rowsToClear = [], colsToClear = [];

        for (let r = 0; r < 8; r++) if (board[r].every(x => x !== 0)) rowsToClear.push(r);
        for (let c = 0; c < 8; c++) {
            let full = true;
            for (let r = 0; r < 8; r++) if (board[r][c] === 0) full = false;
            if (full) colsToClear.push(c);
        }

        if (rowsToClear.length > 0 || colsToClear.length > 0) {
            gameCore.setAnimating(true);
            const fastMode = fastModeOverride !== null ? fastModeOverride : aiParams.get('fastAnimations');
            const animSpeed = aiParams.get('speed');
            
            if (!fastMode) {
                rowsToClear.forEach(r => { for (let c=0; c<8; c++) cells[r][c].classList.add('blast'); });
                colsToClear.forEach(c => { for (let r=0; r<8; r++) cells[r][c].classList.add('blast'); });
            }

            const delay = fastMode ? 1 : 400;
            
            setTimeout(() => {
                rowsToClear.forEach(r => { for (let c=0; c<8; c++) gameCore.resetCell(r, c, cells); });
                colsToClear.forEach(c => { for (let r=0; r<8; r++) gameCore.resetCell(r, c, cells); });
                
                const cleared = rowsToClear.length + colsToClear.length;
                gameCore.addScore(cleared * 100 + (cleared > 1 ? cleared * 100 : 0));
                updateScore();
                gameCore.setAnimating(false);
                
                if (callback) callback(); else manageTrayState();
            }, delay);
        } else {
            if (callback) callback(); else manageTrayState();
        }
    }

    function manageTrayState() {
        const trayEl = document.getElementById('tray');
        if (trayEl.children.length === 0) fillTray();
        else checkPlayability();
    }

    function checkPlayability() {
        const trayEl = document.getElementById('tray');
        let canPlayAny = false;
        Array.from(trayEl.children).forEach(pieceEl => {
            const shape = pieceEl.__pieceData.shape;
            if (canPieceBePlacedAnywhere(shape, gameCore.getBoard())) {
                canPlayAny = true; pieceEl.classList.remove('unplayable');
            } else { pieceEl.classList.add('unplayable'); }
        });
        if (!canPlayAny) gameOver();
    }

    function canPieceBePlacedAnywhere(shape, b) {
        for (let r=0; r<8; r++) for(let c=0; c<8; c++) if (gameCore.canPlace(shape, r, c, b)) return true;
        return false;
    }

    function updateScore() {
        document.getElementById('score').innerText = gameCore.getScore();
        if (gameCore.getScore() > gameCore.getHighscore()) {
            gameCore.setHighscore(gameCore.getScore());
            document.getElementById('best-score').innerText = gameCore.getHighscore();
        }
    }

    function gameOver() {
        aiWasEnabledBeforeGameOver = aiEngine.getEnabled();
        aiEngine.setEnabled(false);
        aiEngine.setLoopActive(false);
        aiEngine.setAbortSignal(true);
        document.getElementById('btn-toggle-ai').classList.remove('active');
        document.getElementById('ai-settings').style.display = 'none';
        document.getElementById('final-score').innerText = gameCore.getScore();
        document.getElementById('game-over').style.display = 'flex';
    }

    function resetGame() {
        gameCore.resetGame();
        gameCore.setAnimating(false);
        gameCore.setDropTarget(null);
        gameCore.setDragPieceData(null);
        
        if (dragGhost) {
            dragGhost.remove();
            dragGhost = null;
        }
        
        isDragging = false;
        dragPieceEl = null;
        
        updateScore();
        for (let r=0; r<8; r++) for(let c=0; c<8; c++) gameCore.resetCell(r, c, cells);
        document.getElementById('game-over').style.display = 'none';
        
        aiEngine.setAbortSignal(false);
        aiEngine.setLoopActive(false);
        
        if (aiWasEnabledBeforeGameOver) {
            aiEngine.setEnabled(true);
            document.getElementById('btn-toggle-ai').classList.add('active');
            document.getElementById('ai-settings').style.display = 'flex';
        }
        
        fillTray();
    }

    function setupAIControls() {
        const btnToggle = document.getElementById('btn-toggle-ai');
        const settings = document.getElementById('ai-settings');
        const playAgainBtn = document.getElementById('btn-play-again');
        
        btnToggle.addEventListener('click', () => {
            let enabled = !aiEngine.getEnabled();
            aiEngine.setEnabled(enabled);
            if (enabled) {
                btnToggle.classList.add('active');
                settings.style.display = 'flex';
                aiEngine.setAbortSignal(false);
                if (!aiEngine.getLoopActive() && document.getElementById('tray').children.length > 0) aiEngine.startAITurn(document.getElementById('tray'), cells);
            } else {
                btnToggle.classList.remove('active');
                settings.style.display = 'none';
                aiEngine.setAbortSignal(true); 
            }
        });

        playAgainBtn.addEventListener('click', () => {
            resetGame();
        });
    }

    return { init, createGhost, checkLinesAndRefill, manageTrayState, updateScore, gameOver, resetGame };
})();

window.onload = uiManager.init;