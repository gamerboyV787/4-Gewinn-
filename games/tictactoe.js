/* =====================================================
   TIC-TAC-TOE – Multiplayer + Bot (perfekter Minimax)
   Host = Spieler 1 (✕), Gast = Spieler 2 (○)
   Bot spielt als Spieler 2 (○)
   ===================================================== */
const TicTacToe = (() => {
  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];

  /* Win-line SVG coordinates [x1%,y1%,x2%,y2%] */
  const WIN_COORDS = [
    [16.7,16.7,83.3,16.7], // row 0
    [16.7,50,  83.3,50  ], // row 1
    [16.7,83.3,83.3,83.3], // row 2
    [16.7,16.7,16.7,83.3], // col 0
    [50,  16.7,50,  83.3], // col 1
    [83.3,16.7,83.3,83.3], // col 2
    [16.7,16.7,83.3,83.3], // diag \
    [83.3,16.7,16.7,83.3], // diag /
  ];

  let board, current, gameOver, scores, _mp, _bot, _botTimer;
  let boardEl, msgEl, turnLbl, p1El, p2El, s1El, s2El;

  function init(mpConfig = null, botDifficulty = null) {
    _mp  = mpConfig;
    _bot = botDifficulty;
    if (_botTimer) { clearTimeout(_botTimer); _botTimer = null; }

    boardEl = document.getElementById('ttt-board');
    msgEl   = document.getElementById('ttt-message');
    turnLbl = document.getElementById('ttt-turn-label');
    p1El    = document.getElementById('ttt-p1');
    p2El    = document.getElementById('ttt-p2');
    s1El    = document.getElementById('ttt-score-1');
    s2El    = document.getElementById('ttt-score-2');

    const n1 = document.getElementById('ttt-name-1');
    const n2 = document.getElementById('ttt-name-2');
    if (n1 && n2) {
      if (_mp) {
        n1.textContent = _mp.role === 'host' ? 'Du (✕)' : 'Gegner (✕)';
        n2.textContent = _mp.role === 'host' ? 'Gegner (○)' : 'Du (○)';
      } else if (_bot) {
        n1.textContent = 'Du (✕)'; n2.textContent = '🤖 Bot (○)';
      } else {
        n1.textContent = 'Spieler 1 (✕)'; n2.textContent = 'Spieler 2 (○)';
      }
    }

    if (_mp) _mp.setHandler(receiveOpponentMove);

    scores = [0, 0]; renderScores(); newGame();
  }

  function newGame() {
    board = Array(9).fill(0); current = 1; gameOver = false;
    if (_botTimer) { clearTimeout(_botTimer); _botTimer = null; }
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

    if (!fromOpponent && _bot && current === 2) return;
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
      const who = _bot
        ? (current === 1 ? '🎉 Du gewinnst!' : '🤖 Bot gewinnt!')
        : `${current===1?'✕':'○'} Spieler ${current} gewinnt!`;
      setTimeout(() => showMsg(who, false), 350);
      return;
    }
    if (board.every(v => v)) { showMsg('🤝 Unentschieden!', true); gameOver = true; return; }
    current = current === 1 ? 2 : 1;
    updateStatus();
    if (_bot && current === 2 && !gameOver) scheduleBotMove();
  }

  function receiveOpponentMove(data) {
    if (data.type === 'ttt:play') play(data.index, true);
  }

  /* ── Bot ──────────────────────────────────────────── */
  function scheduleBotMove() {
    const delay = _bot === 'easy' ? 400 : 550;
    _botTimer = setTimeout(() => {
      if (gameOver || current !== 2) return;
      const i = chooseBotCell();
      if (i !== -1) play(i);
    }, delay);
  }

  function chooseBotCell() {
    const empty = board.map((v,i)=>v===0?i:-1).filter(i=>i!==-1);
    if (!empty.length) return -1;
    if (_bot === 'easy') return empty[Math.floor(Math.random()*empty.length)];
    if (_bot === 'medium') return mediumCell(empty);
    return minimaxRoot();
  }

  function mediumCell(empty) {
    for (const i of empty) {
      board[i] = 2; if (checkWinFor(2)) { board[i] = 0; return i; } board[i] = 0;
    }
    for (const i of empty) {
      board[i] = 1; if (checkWinFor(1)) { board[i] = 0; return i; } board[i] = 0;
    }
    if (board[4] === 0) return 4;
    const corners = [0,2,6,8].filter(c => board[c] === 0);
    if (corners.length) return corners[Math.floor(Math.random()*corners.length)];
    return empty[Math.floor(Math.random()*empty.length)];
  }

  function minimaxRoot() {
    const empty = board.map((v,i)=>v===0?i:-1).filter(i=>i!==-1);
    let best = -Infinity, bestI = empty[0];
    for (const i of empty) {
      board[i] = 2;
      const score = tttMinimax(false, -Infinity, Infinity);
      board[i] = 0;
      if (score > best) { best = score; bestI = i; }
    }
    return bestI;
  }

  function tttMinimax(maximizing, alpha, beta) {
    if (checkWinFor(2)) return 10;
    if (checkWinFor(1)) return -10;
    const empty = board.map((v,i)=>v===0?i:-1).filter(i=>i!==-1);
    if (!empty.length) return 0;

    if (maximizing) {
      let best = -Infinity;
      for (const i of empty) {
        board[i] = 2;
        best = Math.max(best, tttMinimax(false, alpha, beta));
        board[i] = 0;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const i of empty) {
        board[i] = 1;
        best = Math.min(best, tttMinimax(true, alpha, beta));
        board[i] = 0;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function checkWinFor(p) {
    return WIN_LINES.some(([a,b,c]) => board[a]===p && board[b]===p && board[c]===p);
  }

  function checkWin() {
    for (const [a,b,c] of WIN_LINES)
      if (board[a] && board[a]===board[b] && board[b]===board[c]) return [a,b,c];
    return null;
  }

  function highlightWin(line) {
    const cells = boardEl.querySelectorAll('.ttt-cell');
    line.forEach(i => cells[i].classList.add('winner'));

    // Draw animated win line
    const lineIdx = WIN_LINES.findIndex(l => l[0]===line[0] && l[1]===line[1] && l[2]===line[2]);
    if (lineIdx !== -1) {
      const [x1,y1,x2,y2] = WIN_COORDS[lineIdx];
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class','ttt-win-line-svg');
      svg.setAttribute('viewBox','0 0 100 100');
      svg.setAttribute('preserveAspectRatio','none');
      const line2 = document.createElementNS('http://www.w3.org/2000/svg','line');
      line2.setAttribute('x1',x1); line2.setAttribute('y1',y1);
      line2.setAttribute('x2',x2); line2.setAttribute('y2',y2);
      line2.setAttribute('class','ttt-win-line');
      svg.appendChild(line2);
      boardEl.appendChild(svg);
    }
  }

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
      <line x1="18" y1="18" x2="82" y2="82" class="x-line"/>
      <line x1="82" y1="18" x2="18" y2="82" class="x-line" style="animation-delay:.09s"/>
    </svg>`;
  }
  function oSvg() {
    return `<svg viewBox="0 0 100 100" class="ttt-svg">
      <circle cx="50" cy="50" r="32" class="o-circle"/>
    </svg>`;
  }

  return { init, newGame, restart, receiveOpponentMove };
})();
