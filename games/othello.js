/* =====================================================
   OTHELLO / REVERSI – vollständig + Multiplayer
   1 = Schwarz (zieht zuerst / Host), 2 = Weiß (Gast)
   ===================================================== */
const Othello = (() => {
  const SIZE = 8;
  const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

  let board, current, gameOver, scores, _mp, _myPlayer;

  let boardEl, msgEl, turnLbl, p1El, p2El, sbEl, swEl;

  /* ── Init ─────────────────────────────────────────── */
  function init(mpConfig = null) {
    _mp       = mpConfig;
    _myPlayer = !_mp ? null : (_mp.role === 'host' ? 1 : 2);

    boardEl = document.getElementById('ot-board');
    msgEl   = document.getElementById('ot-message');
    turnLbl = document.getElementById('ot-turn-label');
    p1El    = document.getElementById('ot-p1');
    p2El    = document.getElementById('ot-p2');
    sbEl    = document.getElementById('ot-score-b');
    swEl    = document.getElementById('ot-score-w');

    if (_mp) _mp.setHandler(receiveOpponentMove);

    scores = [0, 0];
    newGame();
  }

  function newGame() {
    board    = Array.from({length:SIZE}, () => Array(SIZE).fill(0));
    current  = 1;  // Schwarz zieht zuerst
    gameOver = false;

    // Startaufstellung
    board[3][3]=2; board[3][4]=1;
    board[4][3]=1; board[4][4]=2;

    msgEl.classList.add('hidden');
    render();
    updateStatus();
    updateScores();
  }

  function restart() { scores=[0,0]; newGame(); }

  /* ── Spiellogik ───────────────────────────────────── */
  function getFlips(b, row, col, player) {
    if (b[row][col] !== 0) return [];
    const opp = player===1 ? 2 : 1;
    const flips = [];

    for (const [dr,dc] of DIRS) {
      const line = [];
      let r=row+dr, c=col+dc;
      while (r>=0&&r<SIZE&&c>=0&&c<SIZE&&b[r][c]===opp) {
        line.push({r,c}); r+=dr; c+=dc;
      }
      if (line.length>0 && r>=0&&r<SIZE&&c>=0&&c<SIZE&&b[r][c]===player) {
        flips.push(...line);
      }
    }
    return flips;
  }

  function validMoves(b, player) {
    const moves = [];
    for (let r=0;r<SIZE;r++)
      for (let c=0;c<SIZE;c++)
        if (getFlips(b,r,c,player).length>0) moves.push({r,c});
    return moves;
  }

  function applyMove(row, col, player, fromOpponent=false) {
    const flips = getFlips(board, row, col, player);
    if (!flips.length) return;

    board[row][col] = player;
    flips.forEach(({r,c}) => board[r][c] = player);

    if (!fromOpponent && _mp) _mp.send({ type:'ot:place', row, col });

    updateScores();

    // Flip-Animation
    render(flips);

    // Nächsten Zug bestimmen
    const opp      = player===1 ? 2 : 1;
    const oppMoves = validMoves(board, opp);
    const myMoves  = validMoves(board, player);

    if (oppMoves.length > 0) {
      current = opp;
    } else if (myMoves.length > 0) {
      // Gegner muss passen
      turnLbl.textContent = `${opp===1?'Schwarz':'Weiß'} muss passen!`;
      setTimeout(() => { render(); updateStatus(); }, 1200);
      return;
    } else {
      // Kein Zug mehr möglich → Spielende
      _endGame();
      return;
    }

    render();
    updateStatus();
  }

  function receiveOpponentMove(data) {
    if (data.type === 'ot:place' && !gameOver) {
      const opp = _myPlayer === 1 ? 2 : 1;
      applyMove(data.row, data.col, opp, true);
    }
  }

  function _endGame() {
    gameOver = true;
    let black=0, white=0;
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
      if (board[r][c]===1) black++;
      if (board[r][c]===2) white++;
    }
    render();
    if (black > white) {
      scores[0]++; _renderScores();
      showMsg(`⚫ Schwarz gewinnt! (${black}:${white})`, false);
    } else if (white > black) {
      scores[1]++; _renderScores();
      showMsg(`⚪ Weiß gewinnt! (${white}:${black})`, false);
    } else {
      showMsg(`🤝 Unentschieden! (${black}:${white})`, true);
    }
  }

  /* ── Render ───────────────────────────────────────── */
  function render(flippedCells = []) {
    boardEl.innerHTML = '';
    const flippedSet = new Set(flippedCells.map(({r,c})=>`${r},${c}`));
    const valid = gameOver ? [] : validMoves(board, current);
    const validSet = new Set(valid.map(({r,c})=>`${r},${c}`));

    // Online: nur eigene Züge zulassen
    const canClick = !_mp || (current === _myPlayer);

    for (let r=0;r<SIZE;r++) {
      for (let c=0;c<SIZE;c++) {
        const cell = document.createElement('div');
        cell.className = 'ot-cell';

        if (board[r][c]) {
          const disc = document.createElement('div');
          disc.className = `ot-disc ${board[r][c]===1?'black':'white'}`;
          if (flippedSet.has(`${r},${c}`)) disc.classList.add('flip');
          cell.appendChild(disc);
        } else if (validSet.has(`${r},${c}`) && canClick) {
          cell.classList.add('valid-hint');
          cell.addEventListener('click', () => {
            if (!gameOver && canClick) applyMove(r, c, current);
          });
        } else {
          cell.classList.add('no-click');
        }

        boardEl.appendChild(cell);
      }
    }
  }

  function updateStatus() {
    const name = current===1 ? 'Schwarz' : 'Weiß';
    let label;
    if (_mp) {
      const myTurn = current === _myPlayer;
      label = myTurn ? 'Dein Zug!' : 'Gegner ist dran…';
    } else {
      label = `${name} ist dran`;
    }
    turnLbl.textContent = label;
    p1El.classList.toggle('active', current===1);
    p2El.classList.toggle('active', current===2);
  }

  function updateScores() {
    let b=0, w=0;
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
      if (board[r][c]===1) b++;
      if (board[r][c]===2) w++;
    }
    if (sbEl) sbEl.textContent = b;
    if (swEl) swEl.textContent = w;
  }

  function _renderScores() {
    // Spieler 1 = Schwarz = scores[0], Spieler 2 = Weiß = scores[1]
    // Die score-Elemente zeigen Spielstand-Siege, updateScores() zeigt Steinanzahl
  }

  function showMsg(text, isDraw) {
    msgEl.classList.remove('hidden','draw');
    if (isDraw) msgEl.classList.add('draw');
    msgEl.innerHTML = `<div>${text}</div>
      <button onclick="Othello.newGame()">Nochmal spielen</button>
      <button class="btn-secondary" onclick="Othello.restart()">Neu starten</button>`;
  }

  return { init, newGame, restart, receiveOpponentMove };
})();
