const aiEngine = (function() {
    let aiEnabled = false;
    let aiLoopActive = false;
    let aiAbortSignal = false;
    let searchIterations = 0;

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function getEnabled() { return aiEnabled; }
    function setEnabled(val) { aiEnabled = val; }
    function getLoopActive() { return aiLoopActive; }
    function setLoopActive(val) { aiLoopActive = val; }
    function setAbortSignal(val) { aiAbortSignal = val; }
    function getAIDelay() { return 102 - aiParams.get('speed'); }
    function isThinkingEnabled() { return aiParams.get('showThinking'); }

    function getComboReward(linesCleared) {
        if (linesCleared === 0) return 0;
        const exp = aiParams.get('comboExponent');
        const mult = aiParams.get('comboMultiplier');
        return Math.pow(linesCleared, exp) * mult * aiParams.get('linesPriority');
    }

    function evaluateBuilderMode(b) {
        let internalEdges = 0;
        let rowDensities = Array(8).fill(0);
        let colDensities = Array(8).fill(0);
        let spaces3x3 = 0, spaces1x5 = 0, spaces5x1 = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (b[r][c]) {
                    rowDensities[r]++;
                    colDensities[c]++;
                    if (r > 0 && !b[r-1][c]) internalEdges++;
                    if (r < 7 && !b[r+1][c]) internalEdges++;
                    if (c > 0 && !b[r][c-1]) internalEdges++;
                    if (c < 7 && !b[r][c+1]) internalEdges++;
                } else {
                    if (r <= 5 && c <= 5) {
                        let fit = true;
                        for(let i=0;i<3;i++) for(let j=0;j<3;j++) if(b[r+i][c+j]) fit=false;
                        if(fit) spaces3x3++;
                    }
                }
            }
        }

        let potentialEnergy = 0;
        for (let i = 0; i < 8; i++) {
            potentialEnergy += Math.pow(rowDensities[i], 2);
            potentialEnergy += Math.pow(colDensities[i], 2);
        }

        const energyFactor = aiParams.get('energyFactor');
        const edgePenalty = aiParams.get('edgePenalty');
        const spaceBonus = aiParams.get('spaceBonus');
        const noSpacePenalty = aiParams.get('noSpacePenalty');

        let score = (potentialEnergy * energyFactor) - (internalEdges * edgePenalty) + (spaces3x3 * spaceBonus);
        if (spaces3x3 === 0) score -= noSpacePenalty; 
        return score;
    }

    function getTopPlacements(bState, shape, maxSpots) {
        let spots = [];
        const shapeHeight = shape.length;
        const shapeWidth = Math.max(...shape.map(r => r.length));
        
        for (let r = 0; r <= 8 - shapeHeight; r++) {
            for (let c = 0; c <= 8 - shapeWidth; c++) {
                if (gameCore.canPlace(shape, r, c, bState)) {
                    let { newBoard, linesCleared } = gameCore.simulatePlaceAndClear(bState, shape, r, c);
                    let score = evaluateBuilderMode(newBoard) + getComboReward(linesCleared);
                    spots.push({ row: r, col: c, score, linesCleared });
                }
            }
        }
        const limit = maxSpots || aiParams.get('maxSpots');
        return spots.sort((a, b) => b.score - a.score).slice(0, limit);
    }

    function drawThinking(shape, row, col, bState, cells) {
        if (!gameCore.canPlace(shape, row, col, bState)) return;
        
        let { rowsC, colsC } = gameCore.simulatePlaceAndClear(bState, shape, row, col);
        rowsC.forEach(r => { for (let c=0; c<8; c++) cells[r][c].classList.add('thinking-gray'); });
        colsC.forEach(c => { for (let r=0; r<8; r++) cells[r][c].classList.add('thinking-gray'); });

        for(let r=0; r<shape.length; r++) {
            for(let c=0; c<shape[r].length; c++) {
                if(shape[r][c] && row + r < 8 && col + c < 8) {
                    const cell = cells[row + r][col + c];
                    cell.classList.remove('thinking-gray');
                    cell.classList.add('thinking-red');
                }
            }
        }
    }

    function clearThinking(cells) {
        for(let r=0; r<8; r++) for(let c=0; c<8; c++) cells[r][c].classList.remove('thinking-red', 'thinking-gray');
    }

    async function searchSequence(bState, piecesLeft, currentSeq, currentComboPoints, cells) {
        if (aiAbortSignal) return null;
        if (piecesLeft.length === 0) {
            return { score: evaluateBuilderMode(bState) + currentComboPoints, sequence: currentSeq };
        }

        let bestScore = -Infinity, bestResult = null;

        for (let i = 0; i < piecesLeft.length; i++) {
            let pieceObj = piecesLeft[i];
            let remaining = piecesLeft.filter((_, idx) => idx !== i);
            let validSpots = getTopPlacements(bState, pieceObj.shape, 8);
            
            if (validSpots.length === 0) {
                if (-999999 > bestScore) { bestScore = -999999; bestResult = { score: -999999, sequence: currentSeq }; }
                continue;
            }

            for (let spot of validSpots) {
                if (aiAbortSignal) return null;
                searchIterations++;

                if (isThinkingEnabled()) {
                    drawThinking(pieceObj.shape, spot.row, spot.col, bState, cells);
                    await sleep(getAIDelay());
                    clearThinking(cells);
                } else if (searchIterations % 100 === 0) await sleep(0);

                let { newBoard, linesCleared } = gameCore.simulatePlaceAndClear(bState, pieceObj.shape, spot.row, spot.col);
                let move = { pieceObj, row: spot.row, col: spot.col };
                let newSeq = [...currentSeq, move];
                let roundCombo = currentComboPoints + getComboReward(linesCleared);

                let result = await searchSequence(newBoard, remaining, newSeq, roundCombo, cells);
                
                if (result && result.score > bestScore) {
                    bestScore = result.score;
                    bestResult = result;
                }
            }
        }
        return bestResult;
    }

    async function executeAIMove(move, trayEl, cells) {
        if (!aiEnabled) return;
        
        let pieceEl = Array.from(trayEl.children).find(el => el.__pieceData.originalIndex === move.pieceObj.originalIndex);
        if(!pieceEl) return;

        const fastMode = aiParams.get('fastAnimations');

        if (fastMode) {
            pieceEl.style.opacity = '0';
        } else {
            pieceEl.style.transform = 'scale(0.8)';
            await sleep(150);
            pieceEl.style.opacity = '0';
        }

        if (!fastMode) {
            gameCore.setDragPieceData(move.pieceObj);
            uiManager.createGhost(0, 0, true);
            
            let pRect = pieceEl.getBoundingClientRect();
            let dragGhost = document.querySelector('.ghost');
            dragGhost.style.left = `${pRect.left}px`;
            dragGhost.style.top = `${pRect.top}px`;
            dragGhost.style.transform = 'scale(0.8)';
            
            await sleep(50);

            let targetCellRect = cells[move.row][move.col].getBoundingClientRect();
            dragGhost.style.transform = 'scale(1)';
            dragGhost.style.left = `${targetCellRect.left}px`;
            dragGhost.style.top = `${targetCellRect.top}px`;
            
            await sleep(250);

            let solidBlocks = dragGhost.querySelectorAll('.block.solid');
            solidBlocks.forEach(b => b.style.backgroundColor = '#10b981');
            
            await sleep(100);

            dragGhost.remove();
            dragGhost = null;
            gameCore.setDragPieceData(null);
        }
        
        for (let r = 0; r < move.pieceObj.shape.length; r++) {
            for (let c = 0; c < move.pieceObj.shape[r].length; c++) {
                if (move.pieceObj.shape[r][c]) {
                    let board = gameCore.getBoard();
                    board[move.row + r][move.col + c] = move.pieceObj.color;
                    const cell = cells[move.row + r][move.col + c];
                    cell.classList.add('filled');
                    if (!fastMode) cell.classList.add('executing-green');
                    cell.style.backgroundColor = move.pieceObj.color;
                }
            }
        }
        gameCore.addScore(move.pieceObj.blocksCount * 10);
        uiManager.updateScore();
        pieceEl.remove();

        await new Promise(resolve => uiManager.checkLinesAndRefill(resolve, fastMode));

        if (!fastMode) {
            for(let r=0; r<8; r++) for(let c=0; c<8; c++) cells[r][c].classList.remove('executing-green');
            await sleep(150);
        } else {
            const fastSpeed = Math.max(1, 102 - aiParams.get('fastSpeed'));
            await sleep(fastSpeed);
        }
    }

    async function startAITurn(trayEl, cells) {
        if (aiLoopActive || !aiEnabled || trayEl.children.length === 0) return;
        aiLoopActive = true; aiAbortSignal = false; searchIterations = 0;

        let piecesLeft = Array.from(trayEl.children)
                              .filter(el => !el.classList.contains('unplayable'))
                              .map(el => el.__pieceData);
        if (piecesLeft.length === 0) { aiLoopActive = false; uiManager.manageTrayState(); return; }

        let board = gameCore.getBoard();
        let bestPlay = await searchSequence(board, piecesLeft, [], 0, cells);

        if (aiAbortSignal) { clearThinking(cells); aiLoopActive = false; return; }

        if (bestPlay && bestPlay.score > -900000 && bestPlay.sequence.length === piecesLeft.length) {
            for (let move of bestPlay.sequence) {
                if (aiAbortSignal) break;
                await executeAIMove(move, trayEl, cells);
            }
        } else {
            uiManager.gameOver();
        }

        aiLoopActive = false;
        if (!aiAbortSignal && document.getElementById('game-over').style.display !== 'flex') uiManager.manageTrayState();
    }

    return {
        getEnabled, setEnabled, getLoopActive, setLoopActive, setAbortSignal,
        startAITurn, clearThinking
    };
})();