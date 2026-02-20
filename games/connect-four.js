/* =====================================================
   4-GEWINNT  –  mit optionalem Online-Multiplayer
   mpConfig = { role:'host'|'guest', send(data), setHandler(fn) }
   Host = Spieler 1 (Rot), Gast = Spieler 2 (Gelb)
   ===================================================== */
const ConnectFour = (() => {
  const ROWS = 6, COLS = 7;

  let board, current, gameOver, scores, animating;
  let _mp = null;  // mpConfig oder null

  let boardEl, msgEl, turnLbl, p1El, p2El, score1El, score2El;

  /* ── Init ─────────────────────────────────────────── */
  function init(mpConfig = null) {
    _mp = mpConfig;
    boardEl  = document.getElementById('cf-board');
    msgEl    = document.getElementById('cf-message');
    turnLbl  = document.getElementById('cf-turn-label');
    p1El     = document.getElementById('cf-player-1');
    p2El     = document.getElementById('cf-player-2');
    score1El = document.getElementById('cf-score-1');
    score2El = document.getElementById('cf-score-2');

    // Namen
    const n1 = document.getElementById('cf-name-1');
    const n2 = document.getElementById('cf-name-2');
    if (_mp) {
      if (_mp.role === 'host') { n1.textContent = 'Du'; n2.textContent = 'Gegner'; }
      else                     { n1.textContent = 'Gegner'; n2.textContent = 'Du'; }
      _mp.setHandler(receiveOpponentMove);
    } else {
      n1.textContent = 'Spieler 1'; n2.textContent = 'Spieler 2';
    }

    scores = [0, 0];
    renderScores();
    newRound();
  }

  function newRound() {
    board     = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    current   = 1;
    gameOver  = false;
    animating = false;
    msgEl.classList.add('hidden');
    renderBoard();
    updateStatus();
  }

  function restart() {
    scores = [0, 0]; renderScores(); newRound();
  }

  /* ── Board ────────────────────────────────────────── */
  function renderBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.classList.add('cf-cell');
        cell.dataset.row = r; cell.dataset.col = c;
        cell.addEventListener('click', () => handleColumnClick(c));
        cell.addEventListener('mouseenter', () => hoverCol(c, true));
        cell.addEventListener('mouseleave', () => hoverCol(c, false));
        const piece = document.createElement('div');
        piece.classList.add('piece');
        cell.appendChild(piece);
        boardEl.appendChild(cell);
      }
    }
    syncPieces();
  }

  function syncPieces(skipR = -1, skipC = -1) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === skipR && c === skipC) continue;
        const p = getCell(r, c).querySelector('.piece');
        p.className = 'piece';
        if (board[r][c] === 1) p.classList.add('red',    'placed');
        if (board[r][c] === 2) p.classList.add('yellow', 'placed');
      }
    }
  }

  function getCell(r, c) {
    return boardEl.querySelector(`.cf-cell[data-row="${r}"][data-col="${c}"]`);
  }

  function hoverCol(col, on) {
    if (gameOver) return;
    for (let r = 0; r < ROWS; r++) getCell(r, col).classList.toggle('hover-preview', on);
  }

  /* ── Klick-Handler ────────────────────────────────── */
  function handleColumnClick(col) {
    if (gameOver || animating) return;

    // Online: nur eigener Zug
    if (_mp) {
      const myPlayer = _mp.role === 'host' ? 1 : 2;
      if (current !== myPlayer) return;
    }

    const row = dropRow(col);
    if (row === -1) return;

    _doMove(col, row);
    if (_mp) _mp.send({ type: 'cf:drop', col });
  }

  function receiveOpponentMove(data) {
    if (data.type !== 'cf:drop' || gameOver || animating) return;
    const row = dropRow(data.col);
    if (row === -1) return;
    _doMove(data.col, row);
  }

  function _doMove(col, row) {
    animating = true;
    board[row][col] = current;

    const cell  = getCell(row, col);
    const piece = cell.querySelector('.piece');
    const color = current === 1 ? 'red' : 'yellow';
    piece.classList.add(color);

    const cellH  = cell.offsetHeight + 8;
    piece.style.transition = 'none';
    piece.style.transform  = `translateY(-${(row + 1) * cellH}px)`;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const dur = 80 + row * 40;
      piece.style.transition = `transform ${dur}ms cubic-bezier(.25,.46,.45,.94)`;
      piece.style.transform  = 'translateY(0)';
      piece.addEventListener('transitionend', () => {
        piece.classList.add('placed');
        piece.style.transition = piece.style.transform = '';
        animating = false;
        _afterDrop(row, col);
      }, { once: true });
    }));
  }

  function _afterDrop(row, col) {
    const winning = checkWin(row, col);
    if (winning) {
      scores[current - 1]++;
      renderScores();
      highlightWinners(winning);
      showMsg(`🎉 ${current === 1 ? '🔴 Spieler 1' : '🟡 Spieler 2'} gewinnt!`, false);
      gameOver = true;
      return;
    }
    if (isFull()) { showMsg('🤝 Unentschieden!', true); gameOver = true; return; }
    current = current === 1 ? 2 : 1;
    updateStatus();
  }

  /* ── Logik ────────────────────────────────────────── */
  function dropRow(col) {
    for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === 0) return r;
    return -1;
  }

  function isFull() { return board[0].every(c => c !== 0); }

  function checkWin(row, col) {
    const p = board[row][col];
    for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
      const cells = getCells(row, col, dr, dc, p);
      if (cells.length >= 4) return cells;
    }
    return null;
  }

  function getCells(row, col, dr, dc, p) {
    const cells = [{ r: row, c: col }];
    for (let s = 1; s <= 3; s++) {
      const r = row+dr*s, c = col+dc*s;
      if (r<0||r>=ROWS||c<0||c>=COLS||board[r][c]!==p) break;
      cells.push({r,c});
    }
    for (let s = 1; s <= 3; s++) {
      const r = row-dr*s, c = col-dc*s;
      if (r<0||r>=ROWS||c<0||c>=COLS||board[r][c]!==p) break;
      cells.push({r,c});
    }
    return cells;
  }

  function highlightWinners(cells) {
    cells.forEach(({ r, c }) => getCell(r, c).classList.add('winner'));
  }

  /* ── UI ───────────────────────────────────────────── */
  function updateStatus() {
    const label = _mp
      ? ((_mp.role === 'host' && current === 1) || (_mp.role === 'guest' && current === 2)
          ? 'Dein Zug!' : 'Gegner ist dran…')
      : `Spieler ${current} ist dran`;
    turnLbl.textContent = label;
    p1El.classList.toggle('active', current === 1);
    p2El.classList.toggle('active', current === 2);
  }

  function renderScores() {
    score1El.textContent = scores[0]; score2El.textContent = scores[1];
  }

  function showMsg(text, isDraw) {
    msgEl.classList.remove('hidden', 'draw');
    if (isDraw) msgEl.classList.add('draw');
    msgEl.innerHTML = `<div>${text}</div>
      <button onclick="ConnectFour.newRound()">Nochmal spielen</button>
      <button class="btn-secondary" onclick="ConnectFour.restart()">Score zurücksetzen</button>`;
  }

  return { init, newRound, restart, receiveOpponentMove };
})();
