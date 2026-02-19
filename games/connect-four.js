/* =====================================================
   CONNECT FOUR (4-GEWINNT)
   6 Reihen × 7 Spalten
   Spieler 1 = rot (1), Spieler 2 = gelb (2)
   ===================================================== */
const ConnectFour = (() => {
  const ROWS = 6;
  const COLS = 7;

  // Spielzustand
  let board    = [];   // [row][col]  0=leer, 1=rot, 2=gelb
  let current  = 1;   // aktiver Spieler
  let gameOver = false;
  let scores   = [0, 0];
  let animating = false;

  // DOM-Referenzen
  let boardEl, messageEl, turnLabel, p1El, p2El, score1El, score2El;

  /* ── Init ─────────────────────────────────────────── */
  function init() {
    boardEl   = document.getElementById('cf-board');
    messageEl = document.getElementById('cf-message');
    turnLabel = document.getElementById('cf-turn-label');
    p1El      = document.getElementById('cf-player-1');
    p2El      = document.getElementById('cf-player-2');
    score1El  = document.getElementById('cf-score-1');
    score2El  = document.getElementById('cf-score-2');

    scores   = [0, 0];
    renderScores();
    startNewRound();
  }

  function startNewRound() {
    board    = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    current  = 1;
    gameOver = false;
    animating = false;
    messageEl.classList.add('hidden');
    renderBoard();
    updateStatus();
  }

  function restart() {
    scores = [0, 0];
    renderScores();
    startNewRound();
  }

  /* ── Board rendering ──────────────────────────────── */
  function renderBoard() {
    boardEl.innerHTML = '';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.classList.add('cf-cell');
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Klick → Zug in Spalte c
        cell.addEventListener('click', () => handleColumnClick(c));

        // Hover-Vorschau über ganze Spalte
        cell.addEventListener('mouseenter', () => highlightColumn(c, true));
        cell.addEventListener('mouseleave', () => highlightColumn(c, false));

        const piece = document.createElement('div');
        piece.classList.add('piece');
        cell.appendChild(piece);

        boardEl.appendChild(cell);
      }
    }
    syncPieces();
  }

  // Aktualisiert alle Piece-Divs anhand des board-Arrays
  function syncPieces(skipRow = -1, skipCol = -1) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === skipRow && c === skipCol) continue;
        const cell  = getCell(r, c);
        const piece = cell.querySelector('.piece');
        piece.className = 'piece';
        if (board[r][c] === 1) { piece.classList.add('red',    'placed'); }
        if (board[r][c] === 2) { piece.classList.add('yellow', 'placed'); }
      }
    }
  }

  function getCell(r, c) {
    return boardEl.querySelector(`.cf-cell[data-row="${r}"][data-col="${c}"]`);
  }

  /* ── Hover Vorschau ───────────────────────────────── */
  function highlightColumn(col, on) {
    if (gameOver) return;
    for (let r = 0; r < ROWS; r++) {
      const cell = getCell(r, col);
      cell.classList.toggle('hover-preview', on);
    }
  }

  /* ── Spielzug ─────────────────────────────────────── */
  function handleColumnClick(col) {
    if (gameOver || animating) return;

    const row = dropRow(col);
    if (row === -1) return; // Spalte voll

    animating = true;
    board[row][col] = current;

    // Fall-Animation
    const cell  = getCell(row, col);
    const piece = cell.querySelector('.piece');
    const color = current === 1 ? 'red' : 'yellow';
    piece.classList.add(color);

    // Fallhöhe berechnen: row+1 Zellen fallen
    const cellH = cell.offsetHeight + 8; // 8 = gap
    piece.style.transition = 'none';
    piece.style.transform  = `translateY(-${(row + 1) * cellH}px)`;

    // Einzel-Frame-Pause, dann Animation starten
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const duration = 80 + row * 40; // ms – länger je tiefer
        piece.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        piece.style.transform  = 'translateY(0)';
        piece.addEventListener('transitionend', () => {
          piece.classList.add('placed');
          piece.style.transition = '';
          piece.style.transform  = '';
          animating = false;
          afterDrop(row, col);
        }, { once: true });
      });
    });
  }

  function afterDrop(row, col) {
    const winning = checkWin(row, col);

    if (winning) {
      scores[current - 1]++;
      renderScores();
      highlightWinners(winning);
      showMessage(
        `🎉 Spieler ${current} (${current === 1 ? '🔴' : '🟡'}) gewinnt!`,
        false
      );
      gameOver = true;
      return;
    }

    if (isBoardFull()) {
      showMessage('🤝 Unentschieden!', true);
      gameOver = true;
      return;
    }

    current = current === 1 ? 2 : 1;
    updateStatus();
  }

  /* ── Logik ────────────────────────────────────────── */
  function dropRow(col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) return r;
    }
    return -1;
  }

  function isBoardFull() {
    return board[0].every(cell => cell !== 0);
  }

  // Gibt Array von {r,c} zurück wenn gewonnen, sonst null
  function checkWin(row, col) {
    const player = board[row][col];
    const directions = [
      [0, 1],  // horizontal
      [1, 0],  // vertikal
      [1, 1],  // diagonal ↘
      [1, -1], // diagonal ↙
    ];

    for (const [dr, dc] of directions) {
      const cells = getCells(row, col, dr, dc, player);
      if (cells.length >= 4) return cells;
    }
    return null;
  }

  function getCells(row, col, dr, dc, player) {
    const cells = [{ r: row, c: col }];

    for (let step = 1; step <= 3; step++) {
      const r = row + dr * step, c = col + dc * step;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
      cells.push({ r, c });
    }
    for (let step = 1; step <= 3; step++) {
      const r = row - dr * step, c = col - dc * step;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
      cells.push({ r, c });
    }
    return cells;
  }

  function highlightWinners(cells) {
    cells.forEach(({ r, c }) => {
      getCell(r, c).classList.add('winner');
    });
  }

  /* ── UI Updates ───────────────────────────────────── */
  function updateStatus() {
    const name = `Spieler ${current}`;
    turnLabel.textContent = `${name} ist dran`;
    p1El.classList.toggle('active', current === 1);
    p2El.classList.toggle('active', current === 2);
  }

  function renderScores() {
    score1El.textContent = scores[0];
    score2El.textContent = scores[1];
  }

  function showMessage(text, isDraw) {
    messageEl.classList.remove('hidden', 'draw');
    if (isDraw) messageEl.classList.add('draw');
    messageEl.innerHTML = `
      <div>${text}</div>
      <button onclick="ConnectFour.newRound()">Nochmal spielen</button>
      <button class="btn-secondary" onclick="ConnectFour.restart()">Neu starten (Score reset)</button>
    `;
  }

  /* ── Public API ───────────────────────────────────── */
  function newRound() { startNewRound(); }

  return { init, restart, newRound };
})();
