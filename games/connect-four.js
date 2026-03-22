/* =====================================================
   4-GEWINNT – Multiplayer + Bot (Minimax α-β)
   Host = Spieler 1 (Rot), Gast = Spieler 2 (Gelb)
   Bot spielt immer als Spieler 2 (Gelb)
   ===================================================== */
const ConnectFour = (() => {
  const ROWS = 6, COLS = 7;

  let board, current, gameOver, scores, animating;
  let _mp   = null;
  let _bot  = null;   // null | 'easy'|'medium'|'hard'|'hacker'
  let _botTimer = null;

  let boardEl, msgEl, turnLbl, p1El, p2El, score1El, score2El;

  /* ── Init ─────────────────────────────────────────── */
  function init(mpConfig = null, botDifficulty = null) {
    _mp  = mpConfig;
    _bot = botDifficulty;
    if (_botTimer) { clearTimeout(_botTimer); _botTimer = null; }

    boardEl  = document.getElementById('cf-board');
    msgEl    = document.getElementById('cf-message');
    turnLbl  = document.getElementById('cf-turn-label');
    p1El     = document.getElementById('cf-player-1');
    p2El     = document.getElementById('cf-player-2');
    score1El = document.getElementById('cf-score-1');
    score2El = document.getElementById('cf-score-2');

    const n1 = document.getElementById('cf-name-1');
    const n2 = document.getElementById('cf-name-2');
    if (_mp) {
      if (_mp.role === 'host') { n1.textContent = 'Du'; n2.textContent = 'Gegner'; }
      else                     { n1.textContent = 'Gegner'; n2.textContent = 'Du'; }
      _mp.setHandler(receiveOpponentMove);
    } else if (_bot) {
      n1.textContent = 'Du'; n2.textContent = '🤖 Bot';
    } else {
      n1.textContent = 'Spieler 1'; n2.textContent = 'Spieler 2';
    }

    scores = [0, 0];
    renderScores();
    newRound();
  }

  function newRound(fromOpponent = false) {
    board     = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    current   = 1;
    gameOver  = false;
    animating = false;
    if (_botTimer) { clearTimeout(_botTimer); _botTimer = null; }
    msgEl.classList.add('hidden');
    renderBoard();
    updateStatus();

    if (!fromOpponent && _mp) _mp.send({ type: 'cf:new-round' });
  }

  function restart(fromOpponent = false) {
    scores = [0, 0];
    renderScores();
    newRound(true);
    if (!fromOpponent && _mp) _mp.send({ type: 'cf:restart' });
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
    if (gameOver || (_bot && current === 2)) return;
    const cls = current === 1 ? 'hover-red' : 'hover-yellow';
    for (let r = 0; r < ROWS; r++) {
      const cell = getCell(r, col);
      if (on) cell.classList.add(cls);
      else { cell.classList.remove('hover-red', 'hover-yellow'); }
    }
  }

  /* ── Klick-Handler ────────────────────────────────── */
  function handleColumnClick(col) {
    if (gameOver || animating) return;
    if (_bot && current === 2) return;        // Bot ist dran
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
    if (!data || typeof data !== 'object') return;

    if (data.type === 'cf:new-round') { newRound(true); return; }
    if (data.type === 'cf:restart')   { restart(true); return; }

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

    const cellH = cell.offsetHeight + 10;
    const dropH  = (row + 1) * cellH;
    piece.style.transition = 'none';
    piece.style.transform  = `translateY(-${dropH}px)`;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const dur = 80 + row * 38;
      // Fall down with overshoot then settle
      piece.style.transition = `transform ${dur}ms cubic-bezier(.22,.61,.36,1)`;
      piece.style.transform  = 'translateY(0)';
      piece.addEventListener('transitionend', () => {
        // Tiny bounce
        piece.style.transition = 'transform 80ms ease-out';
        piece.style.transform  = 'translateY(-6px)';
        setTimeout(() => {
          piece.style.transition = 'transform 70ms ease-in';
          piece.style.transform  = 'translateY(0)';
          setTimeout(() => {
            piece.classList.add('placed');
            piece.style.transition = piece.style.transform = '';
            animating = false;
            _afterDrop(row, col);
          }, 70);
        }, 80);
      }, { once: true });
    }));
  }

  function _afterDrop(row, col) {
    const winning = checkWin(row, col);
    if (winning) {
      scores[current - 1]++;
      renderScores();
      highlightWinners(winning);
      const who = _bot
        ? (current === 1 ? '🎉 Du gewinnst!' : '🤖 Bot gewinnt!')
        : `🎉 ${current === 1 ? '🔴 Spieler 1' : '🟡 Spieler 2'} gewinnt!`;
      showMsg(who, false);
      gameOver = true;
      return;
    }
    if (isFull()) { showMsg('🤝 Unentschieden!', true); gameOver = true; return; }
    current = current === 1 ? 2 : 1;
    updateStatus();
    if (_bot && current === 2 && !gameOver) scheduleBotMove();
  }

  /* ── Bot-Logik ────────────────────────────────────── */
  function scheduleBotMove() {
    const delay = _bot === 'easy' ? 350 : _bot === 'medium' ? 500 : 700;
    _botTimer = setTimeout(() => {
      if (gameOver || animating || current !== 2) return;
      const col = chooseBotCol();
      if (col === -1) return;
      const row = dropRow(col);
      if (row === -1) return;
      _doMove(col, row);
    }, delay);
  }

  function chooseBotCol() {
    const valid = [];
    for (let c = 0; c < COLS; c++) if (dropRow(c) !== -1) valid.push(c);
    if (!valid.length) return -1;

    if (_bot === 'easy') return valid[Math.floor(Math.random() * valid.length)];
    if (_bot === 'medium') return mediumMove(valid);
    // hard / hacker
    const depth = _bot === 'hacker' ? 9 : 6;
    return minimaxRoot(board, depth);
  }

  function mediumMove(valid) {
    // Win immediately
    for (const c of valid) {
      const r = dropRow(c);
      board[r][c] = 2;
      if (checkWinBoard(board, r, c, 2)) { board[r][c] = 0; return c; }
      board[r][c] = 0;
    }
    // Block opponent win
    for (const c of valid) {
      const r = dropRow(c);
      board[r][c] = 1;
      if (checkWinBoard(board, r, c, 1)) { board[r][c] = 0; return c; }
      board[r][c] = 0;
    }
    // Prefer center
    const pref = [3, 2, 4, 1, 5, 0, 6];
    for (const c of pref) if (valid.includes(c)) return c;
    return valid[0];
  }

  /* ── Minimax mit Alpha-Beta ───────────────────────── */
  function minimaxRoot(b, depth) {
    const valid = getValid(b);
    let best = -Infinity, bestCol = valid[0];
    const ORDER = [3,2,4,1,5,0,6]; // center-first
    const orderedValid = ORDER.filter(c => valid.includes(c));

    for (const c of orderedValid) {
      const r = dropRow2(b, c);
      b[r][c] = 2;
      const score = minimax(b, depth - 1, -Infinity, Infinity, false);
      b[r][c] = 0;
      if (score > best) { best = score; bestCol = c; }
    }
    return bestCol;
  }

  function minimax(b, depth, alpha, beta, maximizing) {
    const valid = getValid(b);
    if (valid.length === 0) return 0; // draw
    if (depth === 0) return evalBoard(b);

    // Check terminal
    for (const c of valid) {
      const r = dropRow2(b, c);
      if (r === -1) continue;
      b[r][c] = maximizing ? 2 : 1;
      if (checkWinBoard(b, r, c, maximizing ? 2 : 1)) {
        b[r][c] = 0;
        return maximizing ? 100000 + depth : -100000 - depth;
      }
      b[r][c] = 0;
    }

    if (maximizing) {
      let best = -Infinity;
      for (const c of valid) {
        const r = dropRow2(b, c);
        b[r][c] = 2;
        const score = minimax(b, depth - 1, alpha, beta, false);
        b[r][c] = 0;
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const c of valid) {
        const r = dropRow2(b, c);
        b[r][c] = 1;
        const score = minimax(b, depth - 1, alpha, beta, true);
        b[r][c] = 0;
        best = Math.min(best, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function evalBoard(b) {
    let score = 0;
    // Center preference
    for (let r = 0; r < ROWS; r++) {
      if (b[r][3] === 2) score += 6;
      if (b[r][3] === 1) score -= 6;
      if (b[r][2] === 2 || b[r][4] === 2) score += 3;
      if (b[r][2] === 1 || b[r][4] === 1) score -= 3;
    }
    // Score windows
    const DIRS = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (const [dr,dc] of DIRS) {
          const win = [];
          for (let i = 0; i < 4; i++) {
            const nr = r+dr*i, nc = c+dc*i;
            if (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS) win.push(b[nr][nc]);
          }
          if (win.length === 4) score += scoreWindow(win);
        }
      }
    }
    return score;
  }

  function scoreWindow(w) {
    const bots = w.filter(x=>x===2).length;
    const opps = w.filter(x=>x===1).length;
    const empty = w.filter(x=>x===0).length;
    if (bots === 4) return 500;
    if (bots === 3 && empty === 1) return 12;
    if (bots === 2 && empty === 2) return 4;
    if (opps === 3 && empty === 1) return -20;
    if (opps === 4) return -500;
    return 0;
  }

  function getValid(b) {
    const v = [];
    for (let c = 0; c < COLS; c++) if (b[0][c] === 0) v.push(c);
    return v;
  }

  function dropRow2(b, col) {
    for (let r = ROWS - 1; r >= 0; r--) if (b[r][col] === 0) return r;
    return -1;
  }

  /* ── Gewinn-Check ─────────────────────────────────── */
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

  function checkWinBoard(b, row, col, p) {
    for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
      let count = 1;
      for (let s = 1; s <= 3; s++) {
        const r = row+dr*s, c = col+dc*s;
        if (r<0||r>=ROWS||c<0||c>=COLS||b[r][c]!==p) break;
        count++;
      }
      for (let s = 1; s <= 3; s++) {
        const r = row-dr*s, c = col-dc*s;
        if (r<0||r>=ROWS||c<0||c>=COLS||b[r][c]!==p) break;
        count++;
      }
      if (count >= 4) return true;
    }
    return false;
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
    let label;
    if (_bot) {
      label = current === 1 ? 'Dein Zug!' : '🤖 Bot denkt…';
    } else if (_mp) {
      label = ((_mp.role==='host'&&current===1)||(_mp.role==='guest'&&current===2))
        ? 'Dein Zug!' : 'Gegner ist dran…';
    } else {
      label = `Spieler ${current} ist dran`;
    }
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
