/* =====================================================
   TIC-TAC-TOE  –  mit optionalem Online-Multiplayer
   Host = Spieler 1 (✕), Gast = Spieler 2 (○)
   ===================================================== */
const TicTacToe = (() => {
  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];

  let board, current, gameOver, scores, _mp;
  let boardEl, msgEl, turnLbl, p1El, p2El, s1El, s2El;

  function init(mpConfig = null) {
    _mp     = mpConfig;
    boardEl = document.getElementById('ttt-board');
    msgEl   = document.getElementById('ttt-message');
    turnLbl = document.getElementById('ttt-turn-label');
    p1El    = document.getElementById('ttt-p1');
    p2El    = document.getElementById('ttt-p2');
    s1El    = document.getElementById('ttt-score-1');
    s2El    = document.getElementById('ttt-score-2');

    if (_mp) _mp.setHandler(receiveOpponentMove);

    scores = [0, 0]; renderScores(); newGame();
  }

  function newGame() {
    board = Array(9).fill(0); current = 1; gameOver = false;
    msgEl.classList.add('hidden');
    render(); updateStatus();
  }

  function restart() { scores = [0,0]; renderScores(); newGame(); }

  function render() {
    boardEl.innerHTML = '';
    board.forEach((val, i) => {
      const cell = document.createElement('div');
      cell.className = 'ttt-cell';
      if (val === 1) { cell.classList.add('x'); cell.innerHTML = xSvg(); }
      if (val === 2) { cell.classList.add('o'); cell.innerHTML = oSvg(); }
      if (!val && !gameOver) cell.addEventListener('click', () => play(i));
      boardEl.appendChild(cell);
    });
  }

  function play(i, fromOpponent = false) {
    if (gameOver || board[i]) return;

    // Online: Klick nur erlaubt wenn eigener Zug
    if (!fromOpponent && _mp) {
      const myPlayer = _mp.role === 'host' ? 1 : 2;
      if (current !== myPlayer) return;
    }

    board[i] = current;
    if (!fromOpponent && _mp) _mp.send({ type: 'ttt:play', index: i });

    render();
    const winLine = checkWin();
    if (winLine) {
      scores[current-1]++;
      renderScores();
      highlightWin(winLine);
      gameOver = true;
      showMsg(`Spieler ${current} gewinnt! ${current===1?'✕':'○'}`, false);
      return;
    }
    if (board.every(v => v)) { showMsg('🤝 Unentschieden!', true); gameOver = true; return; }
    current = current === 1 ? 2 : 1;
    updateStatus();
  }

  function receiveOpponentMove(data) {
    if (data.type === 'ttt:play') play(data.index, true);
  }

  function checkWin() {
    for (const [a,b,c] of WIN_LINES)
      if (board[a] && board[a]===board[b] && board[b]===board[c]) return [a,b,c];
    return null;
  }

  function highlightWin(line) {
    const cells = boardEl.querySelectorAll('.ttt-cell');
    line.forEach(i => cells[i].classList.add('winner'));
  }

  function updateStatus() {
    const label = _mp
      ? ((_mp.role==='host'&&current===1)||(_mp.role==='guest'&&current===2)
          ? 'Dein Zug!' : 'Gegner ist dran…')
      : `Spieler ${current} ist dran`;
    turnLbl.textContent = label;
    p1El.classList.toggle('active', current===1);
    p2El.classList.toggle('active', current===2);
  }

  function renderScores() { s1El.textContent=scores[0]; s2El.textContent=scores[1]; }

  function showMsg(text, isDraw) {
    msgEl.classList.remove('hidden','draw');
    if (isDraw) msgEl.classList.add('draw');
    msgEl.innerHTML = `<div>${text}</div>
      <button onclick="TicTacToe.newGame()">Nochmal spielen</button>
      <button class="btn-secondary" onclick="TicTacToe.restart()">Score zurücksetzen</button>`;
  }

  function xSvg() {
    return `<svg viewBox="0 0 100 100" class="ttt-svg">
      <line x1="18" y1="18" x2="82" y2="82" class="x-line" style="animation-delay:0s"/>
      <line x1="82" y1="18" x2="18" y2="82" class="x-line" style="animation-delay:.07s"/>
    </svg>`;
  }
  function oSvg() {
    return `<svg viewBox="0 0 100 100" class="ttt-svg">
      <circle cx="50" cy="50" r="32" class="o-circle"/>
    </svg>`;
  }

  return { init, newGame, restart, receiveOpponentMove };
})();
