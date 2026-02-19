/* =====================================================
   SCHACH – vollständige Implementierung
   Weiß = Großbuchstaben (K Q R B N P)
   Schwarz = Kleinbuchstaben (k q r b n p)
   Reihe 0 = oben (schwarz), Reihe 7 = unten (weiß)
   ===================================================== */
const Chess = (() => {

  /* ── Konstanten ───────────────────────────────────── */
  const INIT_BOARD = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R'],
  ];

  const SYM = {
    'K':'♔','Q':'♕','R':'♖','B':'♗','N':'♘','P':'♙',
    'k':'♚','q':'♛','r':'♜','b':'♝','n':'♞','p':'♟',
  };

  /* ── Spielzustand ─────────────────────────────────── */
  let board, player, selected, validMoves;
  let epTarget;         // {r,c} | null  – En-passant-Zielfeld
  let castleRights;     // { white:{k,q}, black:{k,q} }
  let gameOver, scores, captured, promoPending;

  /* ── DOM ──────────────────────────────────────────── */
  let boardEl, msgEl, turnLbl, wScoreEl, bScoreEl, wCapEl, bCapEl, promoEl;

  /* ── Init ─────────────────────────────────────────── */
  function init() {
    boardEl  = document.getElementById('chess-board');
    msgEl    = document.getElementById('chess-message');
    turnLbl  = document.getElementById('chess-turn-label');
    wScoreEl = document.getElementById('chess-score-w');
    bScoreEl = document.getElementById('chess-score-b');
    wCapEl   = document.getElementById('chess-cap-w');
    bCapEl   = document.getElementById('chess-cap-b');
    promoEl  = document.getElementById('chess-promotion');

    scores = [0, 0]; // [weiß-Siege, schwarz-Siege]
    renderScores();
    newGame();
  }

  function newGame() {
    board        = INIT_BOARD.map(r => [...r]);
    player       = 'white';
    selected     = null;
    validMoves   = [];
    epTarget     = null;
    castleRights = { white:{k:true,q:true}, black:{k:true,q:true} };
    gameOver     = false;
    captured     = { white:[], black:[] };
    promoPending = null;
    msgEl.classList.add('hidden');
    promoEl.classList.add('hidden');
    render();
    updateStatus(false);
  }

  function restart() {
    scores = [0, 0];
    renderScores();
    newGame();
  }

  /* ────────────────────────────────────────────────────
     HILFSFUNKTIONEN
     ──────────────────────────────────────────────────── */
  const isW  = p => p && p === p.toUpperCase();
  const isB  = p => p && p !== p.toUpperCase();
  const ally = (p, pl) => pl === 'white' ? isW(p) : isB(p);
  const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

  /* ── Pseudo-legale Züge (ignoriert Schach) ────────── */
  function pseudoMoves(r, c, b, ep, cr) {
    const p  = b[r][c];
    if (!p) return [];
    const pl = isW(p) ? 'white' : 'black';
    const d  = pl === 'white' ? -1 : 1;   // Bauern-Richtung
    const mvs = [];

    const push = (tr, tc, sp) => {
      if (inBounds(tr, tc) && !ally(b[tr][tc], pl))
        mvs.push({ r: tr, c: tc, sp });
    };

    const slide = (dr, dc) => {
      for (let i = 1; i < 8; i++) {
        const tr = r + dr * i, tc = c + dc * i;
        if (!inBounds(tr, tc)) break;
        if (ally(b[tr][tc], pl)) break;
        mvs.push({ r: tr, c: tc });
        if (b[tr][tc]) break;  // Gegner blockiert
      }
    };

    const t = p.toLowerCase();

    /* Bauer */
    if (t === 'p') {
      if (inBounds(r + d, c) && !b[r + d][c]) {
        mvs.push({ r: r + d, c });
        const startRow = pl === 'white' ? 6 : 1;
        if (r === startRow && !b[r + 2*d][c])
          mvs.push({ r: r + 2*d, c, sp: 'dp' });
      }
      for (const dc of [-1, 1]) {
        const tr = r + d, tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        if (b[tr][tc] && !ally(b[tr][tc], pl)) mvs.push({ r: tr, c: tc });
        if (ep && tr === ep.r && tc === ep.c)   mvs.push({ r: tr, c: tc, sp: 'ep' });
      }
    }

    /* Springer */
    if (t === 'n') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        push(r + dr, c + dc);
    }

    /* Läufer / Dame */
    if (t === 'b' || t === 'q') { slide(1,1); slide(1,-1); slide(-1,1); slide(-1,-1); }

    /* Turm / Dame */
    if (t === 'r' || t === 'q') { slide(1,0); slide(-1,0); slide(0,1); slide(0,-1); }

    /* König */
    if (t === 'k') {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        push(r + dr, c + dc);

      // Rochade
      if (cr) {
        const row  = pl === 'white' ? 7 : 0;
        const K    = pl === 'white' ? 'K' : 'k';
        const R    = pl === 'white' ? 'R' : 'r';
        if (r === row && c === 4 && b[r][c] === K) {
          if (cr[pl].k && !b[row][5] && !b[row][6] && b[row][7] === R)
            mvs.push({ r: row, c: 6, sp: 'ck' });
          if (cr[pl].q && !b[row][3] && !b[row][2] && !b[row][1] && b[row][0] === R)
            mvs.push({ r: row, c: 2, sp: 'cq' });
        }
      }
    }

    return mvs;
  }

  /* ── Zug auf Kopie anwenden ───────────────────────── */
  function applyMove(b, from, to) {
    const nb = b.map(row => [...row]);
    const p  = nb[from.r][from.c];
    const pl = isW(p) ? 'white' : 'black';
    nb[to.r][to.c] = p;
    nb[from.r][from.c] = '';

    if (to.sp === 'ep') {
      const capRow = pl === 'white' ? to.r + 1 : to.r - 1;
      nb[capRow][to.c] = '';
    }
    if (to.sp === 'ck') {
      const row = pl === 'white' ? 7 : 0;
      nb[row][5] = nb[row][7]; nb[row][7] = '';
    }
    if (to.sp === 'cq') {
      const row = pl === 'white' ? 7 : 0;
      nb[row][3] = nb[row][0]; nb[row][0] = '';
    }
    // Auto-Dame für Schachprüfung (echte Umwandlung via UI)
    if (p === 'P' && to.r === 0) nb[to.r][to.c] = 'Q';
    if (p === 'p' && to.r === 7) nb[to.r][to.c] = 'q';

    return nb;
  }

  /* ── König finden ─────────────────────────────────── */
  function findKing(pl, b) {
    const K = pl === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (b[r][c] === K) return { r, c };
    return null;
  }

  /* ── Schachprüfung ────────────────────────────────── */
  function inCheck(pl, b, ep) {
    const kp = findKing(pl, b);
    if (!kp) return true;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (!p) continue;
        if (isW(p) === (pl === 'white')) continue; // eigene Figur
        const ms = pseudoMoves(r, c, b, ep, null);
        if (ms.some(m => m.r === kp.r && m.c === kp.c)) return true;
      }
    }
    return false;
  }

  /* ── Legale Züge für Feld (r,c) ───────────────────── */
  function legalMoves(r, c) {
    const p = board[r][c];
    if (!p) return [];
    const pl = isW(p) ? 'white' : 'black';
    if (pl !== player) return [];

    return pseudoMoves(r, c, board, epTarget, castleRights).filter(mv => {
      // Rochade: König darf nicht durch Schach ziehen
      if (mv.sp === 'ck') {
        if (inCheck(player, board, epTarget)) return false;
        const row = player === 'white' ? 7 : 0;
        const mid = applyMove(board, { r, c }, { r: row, c: 5 });
        if (inCheck(player, mid, null)) return false;
      }
      if (mv.sp === 'cq') {
        if (inCheck(player, board, epTarget)) return false;
        const row = player === 'white' ? 7 : 0;
        const mid = applyMove(board, { r, c }, { r: row, c: 3 });
        if (inCheck(player, mid, null)) return false;
      }
      const nb = applyMove(board, { r, c }, mv);
      return !inCheck(player, nb, null);
    });
  }

  /* ── Alle legalen Züge eines Spielers ─────────────── */
  function allLegal(pl) {
    const result = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (!board[r][c]) continue;
        if ((pl === 'white') !== isW(board[r][c])) continue;
        legalMoves(r, c).forEach(m => result.push({ from: { r, c }, to: m }));
      }
    }
    return result;
  }

  /* ── Zug ausführen ────────────────────────────────── */
  function executeMove(from, to) {
    const p  = board[from.r][from.c];
    const pl = isW(p) ? 'white' : 'black';

    // Schlagen erfassen
    if (board[to.r][to.c]) captured[pl].push(board[to.r][to.c]);
    if (to.sp === 'ep') {
      const capRow = pl === 'white' ? to.r + 1 : to.r - 1;
      captured[pl].push(board[capRow][to.c]);
    }

    // En-passant-Zielfeld aktualisieren
    epTarget = to.sp === 'dp'
      ? { r: pl === 'white' ? to.r + 1 : to.r - 1, c: to.c }
      : null;

    // Rochaderechte
    if (p === 'K') { castleRights.white.k = false; castleRights.white.q = false; }
    if (p === 'k') { castleRights.black.k = false; castleRights.black.q = false; }
    if (p === 'R') {
      if (from.r === 7 && from.c === 7) castleRights.white.k = false;
      if (from.r === 7 && from.c === 0) castleRights.white.q = false;
    }
    if (p === 'r') {
      if (from.r === 0 && from.c === 7) castleRights.black.k = false;
      if (from.r === 0 && from.c === 0) castleRights.black.q = false;
    }
    // Falls ein Turm geschlagen wird
    const capPiece = board[to.r][to.c];
    if (capPiece === 'R') {
      if (to.r === 7 && to.c === 7) castleRights.white.k = false;
      if (to.r === 7 && to.c === 0) castleRights.white.q = false;
    }
    if (capPiece === 'r') {
      if (to.r === 0 && to.c === 7) castleRights.black.k = false;
      if (to.r === 0 && to.c === 0) castleRights.black.q = false;
    }

    board = applyMove(board, from, to);

    // Bauernumwandlung?
    if ((p === 'P' && to.r === 0) || (p === 'p' && to.r === 7)) {
      promoPending = { r: to.r, c: to.c, pl };
      render();
      showPromotion(pl);
      return;
    }

    afterMove();
  }

  /* ── Nach Zug / Umwandlung ────────────────────────── */
  function afterMove() {
    player     = player === 'white' ? 'black' : 'white';
    selected   = null;
    validMoves = [];
    render();

    const all = allLegal(player);
    const chk = inCheck(player, board, epTarget);

    if (all.length === 0) {
      const winner = player === 'white' ? 'black' : 'white';
      if (chk) {
        scores[winner === 'white' ? 0 : 1]++;
        renderScores();
        showMsg(`♟️ Schachmatt! ${winner === 'white' ? 'Weiß' : 'Schwarz'} gewinnt!`, false);
      } else {
        showMsg('🤝 Patt – Unentschieden!', true);
      }
      gameOver = true;
    }

    updateStatus(chk);
  }

  /* ── Bauernumwandlung ─────────────────────────────── */
  function promoteWith(piece) {
    if (!promoPending) return;
    const { r, c, pl } = promoPending;
    board[r][c] = pl === 'white' ? piece.toUpperCase() : piece.toLowerCase();
    promoPending = null;
    promoEl.classList.add('hidden');
    afterMove();
  }

  function showPromotion(pl) {
    promoEl.classList.remove('hidden');
    const pieces = ['Q', 'R', 'B', 'N'];
    const labels  = { Q:'Dame', R:'Turm', B:'Läufer', N:'Springer' };
    promoEl.innerHTML = `
      <div class="promo-title">Bauer umwandeln in:</div>
      <div class="promo-choices">
        ${pieces.map(p => {
          const sym = SYM[pl === 'white' ? p : p.toLowerCase()];
          return `<button class="promo-btn" onclick="Chess.promote('${p}')" title="${labels[p]}">
            ${sym}
          </button>`;
        }).join('')}
      </div>`;
  }

  /* ── Klick-Handler ────────────────────────────────── */
  function handleClick(r, c) {
    if (gameOver || promoPending) return;

    // Klick auf gültiges Zielfeld → Zug ausführen
    if (selected && validMoves.some(m => m.r === r && m.c === c)) {
      const mv = validMoves.find(m => m.r === r && m.c === c);
      executeMove(selected, mv);
      return;
    }

    // Klick auf eigene Figur → auswählen
    if (board[r][c] && ally(board[r][c], player)) {
      selected   = { r, c };
      validMoves = legalMoves(r, c);
      render();
      return;
    }

    // Sonst: Auswahl aufheben
    selected   = null;
    validMoves = [];
    render();
  }

  /* ── Board rendern ────────────────────────────────── */
  function render() {
    boardEl.innerHTML = '';
    const validSet = new Set(validMoves.map(m => `${m.r},${m.c}`));
    const chk      = inCheck(player, board, epTarget);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const light = (r + c) % 2 === 0;
        const sq    = document.createElement('div');
        sq.className = `chess-sq ${light ? 'light' : 'dark'}`;

        if (selected && selected.r === r && selected.c === c)
          sq.classList.add('selected');

        if (validSet.has(`${r},${c}`)) {
          sq.classList.add('valid-move');
          if (board[r][c]) sq.classList.add('capture-hint');
        }

        // König im Schach hervorheben
        if (!gameOver && chk && board[r][c]) {
          const kPl = isW(board[r][c]) ? 'white' : 'black';
          if (kPl === player && board[r][c].toLowerCase() === 'k')
            sq.classList.add('in-check');
        }

        // Zeilen-/Spaltenbeschriftung
        if (c === 0) {
          const lbl = document.createElement('span');
          lbl.className = 'sq-label rank-lbl';
          lbl.textContent = 8 - r;
          sq.appendChild(lbl);
        }
        if (r === 7) {
          const lbl = document.createElement('span');
          lbl.className = 'sq-label file-lbl';
          lbl.textContent = 'abcdefgh'[c];
          sq.appendChild(lbl);
        }

        // Figur
        if (board[r][c]) {
          const piece = document.createElement('div');
          piece.className = `chess-piece ${isW(board[r][c]) ? 'w' : 'b'}`;
          piece.textContent = SYM[board[r][c]];
          sq.appendChild(piece);
        }

        // Gültigkeits-Punkt
        if (validSet.has(`${r},${c}`) && !board[r][c]) {
          const dot = document.createElement('div');
          dot.className = 'move-dot';
          sq.appendChild(dot);
        }

        sq.addEventListener('click', () => handleClick(r, c));
        boardEl.appendChild(sq);
      }
    }

    // Geschlagene Figuren
    const sortVal = p => ({ q:9,r:5,b:3,n:3,p:1 }[p.toLowerCase()] || 0);
    const sortCap = arr => [...arr].sort((a,b) => sortVal(b) - sortVal(a));

    wCapEl.textContent = sortCap(captured.white).map(p => SYM[p]).join('');
    bCapEl.textContent = sortCap(captured.black).map(p => SYM[p]).join('');
  }

  /* ── UI Hilfsfunktionen ───────────────────────────── */
  function updateStatus(chk) {
    const name = player === 'white' ? 'Weiß' : 'Schwarz';
    turnLbl.textContent = chk ? `${name} – Schach! ⚠️` : `${name} ist dran`;
    turnLbl.classList.toggle('in-check', chk && !gameOver);

    document.getElementById('chess-p-white').classList.toggle('active', player === 'white');
    document.getElementById('chess-p-black').classList.toggle('active', player === 'black');
  }

  function renderScores() {
    if (wScoreEl) wScoreEl.textContent = scores[0];
    if (bScoreEl) bScoreEl.textContent = scores[1];
  }

  function showMsg(text, isDraw) {
    msgEl.classList.remove('hidden', 'draw');
    if (isDraw) msgEl.classList.add('draw');
    msgEl.innerHTML = `
      <div>${text}</div>
      <button onclick="Chess.newGame()">Neues Spiel</button>
      <button class="btn-secondary" onclick="Chess.restart()">Score zurücksetzen</button>
    `;
  }

  /* ── Public API ───────────────────────────────────── */
  return { init, newGame, restart, promote: promoteWith };
})();
