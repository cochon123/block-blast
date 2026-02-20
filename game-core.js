const gameCore = (function() {
    const rows = 8, cols = 8;
    let board = Array(rows).fill().map(() => Array(cols).fill(0));
    let score = 0;
    let highscore = localStorage.getItem('blockBlastHighScore') || 0;
    let isAnimating = false;
    let currentDropTarget = null;
    let dragPieceData = null;

    const SHAPES = [
        { shape: [[1,1],[1,1]], color: '#f43f5e' },
        { shape: [[1,1,1,1]], color: '#eab308' },
        { shape: [[0,1,0],[1,1,1]], color: '#d946ef' },
        { shape: [[1]], color: '#0ea5e9' },
        { shape: [[1,1]], color: '#0ea5e9' },
        { shape: [[1,1,1]], color: '#0ea5e9' },
        { shape: [[1,1,1,1,1]], color: '#0ea5e9' },
        { shape: [[1],[1],[1],[1],[1]], color: '#0ea5e9' },
        { shape: [[1],[1],[1],[1]], color: '#eab308' },
        { shape: [[1,0],[1,0],[1,1]], color: '#f97316' },
        { shape: [[1,1,1],[1,0,0],[1,0,0]], color: '#22c55e' },
        { shape: [[1,1,1],[1,1,1],[1,1,1]], color: '#ec4899' }
    ];

    function getBoard() { return board; }
    function getRows() { return rows; }
    function getCols() { return cols; }
    function getScore() { return score; }
    function setScore(val) { score = val; }
    function getHighscore() { return highscore; }
    function setHighscore(val) { highscore = val; localStorage.setItem('blockBlastHighScore', highscore); }
    function getShapes() { return SHAPES; }
    function getAnimating() { return isAnimating; }
    function setAnimating(val) { isAnimating = val; }
    function getDropTarget() { return currentDropTarget; }
    function setDropTarget(val) { currentDropTarget = val; }
    function getDragPieceData() { return dragPieceData; }
    function setDragPieceData(val) { dragPieceData = val; }

    function canPlace(shape, row, col, boardState) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    if (row + r < 0 || row + r >= 8 || col + c < 0 || col + c >= 8) return false;
                    if (boardState[row + r][col + c] !== 0) return false;
                }
            }
        }
        return true;
    }

    function cloneBoard(b) { return b.map(row => [...row]); }

    function simulatePlaceAndClear(bState, shape, row, col) {
        let b = cloneBoard(bState);
        for(let r=0; r<shape.length; r++) {
            for(let c=0; c<shape[r].length; c++) {
                if(shape[r][c]) b[row + r][col + c] = 1;
            }
        }
        
        let rowsC = [], colsC = [];
        for(let i=0; i<8; i++) {
            if (b[i].every(x => x !== 0)) rowsC.push(i);
            let cFull = true;
            for(let j=0; j<8; j++) if (b[j][i] === 0) cFull = false;
            if (cFull) colsC.push(i);
        }
        
        rowsC.forEach(r => b[r] = Array(8).fill(0));
        colsC.forEach(c => { for(let i=0; i<8; i++) b[i][c] = 0; });
        
        return { newBoard: b, linesCleared: rowsC.length + colsC.length, rowsC, colsC };
    }

    function addScore(points) { score += points; }
    function resetCell(r, c, cells) {
        board[r][c] = 0;
        cells[r][c].classList.remove('filled', 'blast', 'executing-green');
        cells[r][c].style.backgroundColor = '';
    }

    function resetGame() {
        for (let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                board[r][c] = 0;
            }
        }
        score = 0;
    }

    return {
        getBoard, getRows, getCols, getScore, setScore, getHighscore, setHighscore,
        getShapes, getAnimating, setAnimating, getDropTarget, setDropTarget,
        getDragPieceData, setDragPieceData, canPlace, cloneBoard,
        simulatePlaceAndClear, addScore, resetCell, resetGame
    };
})();