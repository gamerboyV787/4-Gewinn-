/* =====================================================
   SCHIFFE VERSENKEN – vollständig + Multiplayer
   Host = Spieler 1 (blau), Gast = Spieler 2 (orange)
   Schiffsliste (klassisch DE):
     1× Schlachtschiff (5), 2× Kreuzer (4),
     3× Zerstörer (3),      4× U-Boot (2)
   ===================================================== */
const Battleship = (() => {
  const SIZE  = 10;
  const SHIP_DEFS = [
    { id:1, name:'Schlachtschiff', size:5, total:1 },
    { id:2, name:'Kreuzer',        size:4, total:2 },
    { id:3, name:'Zerstörer',      size:3, total:3 },
    { id:4, name:'U-Boot',         size:2, total:4 },
  ];
  // Zellwerte im internen Grid
  const WATER=0, SHIP=1, HIT=2, MISS=3, SUNK=4;

  /* ── Zustand ──────────────────────────────────────── */
  let _mp, _myIdx;          // Multiplayer-Kontext
  let grids;                // grids[0] = P1-Grid, grids[1] = P2-Grid
  let placements;           // placements[p] = [{id, cells:[{r,c}], sunk:false}]
  let shots;                // shots[p][r][c] = true wenn P(1-p) schon dorthin geschossen hat
  let scores;               // [0,0]
  let phase;                // 'placement' | 'battle' | 'done'
  let currentPlayer;        // 0 oder 1 (Index in grids/placements)
  let placingPlayer;        // wer gerade platziert (0 oder 1), nur local
  let selectedShipId;       // welches Schiff gerade gewählt
  let vertical;             // Ausrichtung beim Platzieren
  let remainingShips;       // [{id,name,size,left}] für aktuellen Platzierer
  let pendingReady;         // online: wer ist schon bereit? {0:bool,1:bool}
  let awaitingResult;       // online: warten auf bs:result vom Gegner

  /* ── DOM ──────────────────────────────────────────── */
  let ownBoardEl, enemyBoardEl, shipListEl, placementEl, msgEl, turnLbl;
  let p1El, p2El, score1El, score2El, confirmBtn, coverEl, coverMsg;

  /* ── Init ─────────────────────────────────────────── */
  function init(mpConfig = null) {
    _mp    = mpConfig;
    _myIdx = !_mp ? 0 : (_mp.role === 'host' ? 0 : 1);

    ownBoardEl   = document.getElementById('bs-board-own');
    enemyBoardEl = document.getElementById('bs-board-enemy');
    shipListEl   = document.getElementById('bs-ship-list');
    placementEl  = document.getElementById('bs-placement');
    msgEl        = document.getElementById('bs-message');
    turnLbl      = document.getElementById('bs-turn-label');
    p1El         = document.getElementById('bs-p1');
    p2El         = document.getElementById('bs-p2');
    score1El     = document.getElementById('bs-score-1');
    score2El     = document.getElementById('bs-score-2');
    confirmBtn   = document.getElementById('bs-confirm-btn');
    coverEl      = document.getElementById('bs-cover');
    coverMsg     = document.getElementById('bs-cover-msg');

    // Spielernamen
    if (_mp) {
      document.getElementById('bs-name-1').textContent = _mp.role==='host' ? 'Du' : 'Gegner';
      document.getElementById('bs-name-2').textContent = _mp.role==='host' ? 'Gegner' : 'Du';
    } else {
      document.getElementById('bs-name-1').textContent = 'Spieler 1';
      document.getElementById('bs-name-2').textContent = 'Spieler 2';
    }

    if (_mp) _mp.setHandler(receiveMessage);

    document.addEventListener('keydown', _onKey);
    scores = [0, 0]; renderScores();
    newGame();
  }

  function newGame() {
    grids      = [_emptyGrid(), _emptyGrid()];
    placements = [[], []];
    shots      = [_emptyGrid(), _emptyGrid()];
    phase      = 'placement';
    currentPlayer = 0;
    placingPlayer = 0;
    selectedShipId = null;
    vertical   = false;
    pendingReady = {0:false, 1:false};
    awaitingResult = false;

    msgEl.classList.add('hidden');
    coverEl.classList.add('hidden');
    placementEl.classList.remove('hidden');

    if (_mp) {
      // Online: eigene Seite platziert sofort, beide gleichzeitig
      _startPlacement(_myIdx);
    } else {
      // Lokal: P1 platziert zuerst
      _startPlacement(0);
    }
  }

  function restart() { scores=[0,0]; renderScores(); newGame(); }

  /* ── Platzierungs-Phase ───────────────────────────── */
  function _startPlacement(pIdx) {
    placingPlayer = pIdx;
    selectedShipId = null;
    vertical = false;
    remainingShips = SHIP_DEFS.flatMap(d => Array.from({length:d.total}, () => ({...d, _placed:false})));
    placements[pIdx] = [];
    grids[pIdx] = _emptyGrid();

    confirmBtn.disabled = true;
    _renderShipList();
    _renderOwnBoard(pIdx);
    // Im online-Modus: Enemy-Board leer zeigen
    _renderEnemyBoard();
    turnLbl.textContent = _mp ? 'Platziere deine Schiffe' : `Spieler ${pIdx+1}: Platziere deine Schiffe`;
  }

  function _renderShipList() {
    shipListEl.innerHTML = '';
    SHIP_DEFS.forEach(def => {
      const placed = placements[placingPlayer].filter(s=>s.id===def.id).length;
      for (let i=0; i<def.total; i++) {
        const btn = document.createElement('button');
        btn.className = 'bs-ship-btn' + (placed > i ? ' placed' : '');
        if (placed <= i && selectedShipId === def.id && i === placed) btn.classList.add('selected');
        btn.innerHTML = `<span style="font-size:.75rem;color:var(--text-dim)">${def.name}</span>
          <div class="bs-ship-cells">${Array(def.size).fill('<div class="bs-ship-cell"></div>').join('')}</div>`;
        if (placed <= i) {
          btn.addEventListener('click', () => { selectedShipId = def.id; _renderShipList(); _renderOwnBoard(placingPlayer); });
        }
        shipListEl.appendChild(btn);
      }
    });
  }

  function rotate() {
    vertical = !vertical;
    const btn = document.getElementById('bs-rotate-btn');
    if (btn) btn.textContent = vertical ? '🔄 Horizontal' : '🔄 Drehen (R)';
    _renderOwnBoard(placingPlayer);
  }

  function _onKey(e) {
    if (e.key === 'r' || e.key === 'R') rotate();
  }

  function randomize() {
    placements[placingPlayer] = [];
    grids[placingPlayer] = _emptyGrid();
    SHIP_DEFS.forEach(def => {
      for (let i=0; i<def.total; i++) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 1000) {
          attempts++;
          const v   = Math.random() < 0.5;
          const row = Math.floor(Math.random() * (v ? SIZE-def.size+1 : SIZE));
          const col = Math.floor(Math.random() * (v ? SIZE : SIZE-def.size+1));
          const cells = _shipCells(row, col, def.size, v);
          if (_canPlace(placingPlayer, cells)) {
            _placeShip(placingPlayer, def.id, cells);
            placed = true;
          }
        }
      }
    });
    selectedShipId = null;
    _renderShipList();
    _renderOwnBoard(placingPlayer);
    confirmBtn.disabled = !_allPlaced(placingPlayer);
  }

  function _shipCells(r, c, size, v) {
    return Array.from({length:size}, (_,i) => v ? {r:r+i,c} : {r,c:c+i});
  }

  function _canPlace(pIdx, cells) {
    return cells.every(({r,c}) =>
      r>=0&&r<SIZE&&c>=0&&c<SIZE&&grids[pIdx][r][c]===WATER
    );
  }

  function _placeShip(pIdx, id, cells) {
    const def = SHIP_DEFS.find(d=>d.id===id);
    placements[pIdx].push({id, name:def.name, size:def.size, cells:[...cells], sunk:false});
    cells.forEach(({r,c}) => grids[pIdx][r][c] = SHIP);
  }

  function _allPlaced(pIdx) {
    const needed = SHIP_DEFS.reduce((s,d)=>s+d.total, 0);
    return placements[pIdx].length === needed;
  }

  /* ── Board-Klick beim Platzieren ─────────────────── */
  function _ownCellClick(r, c) {
    if (phase !== 'placement' || !selectedShipId) return;
    const def  = SHIP_DEFS.find(d=>d.id===selectedShipId);
    const alreadyPlaced = placements[placingPlayer].filter(s=>s.id===selectedShipId).length;
    if (alreadyPlaced >= def.total) return;
    const cells = _shipCells(r, c, def.size, vertical);
    if (!_canPlace(placingPlayer, cells)) return;
    _placeShip(placingPlayer, selectedShipId, cells);
    // Automatisch nächstes unplatziertes Schiff gleicher Art wählen
    const stillNeeded = placements[placingPlayer].filter(s=>s.id===selectedShipId).length < def.total;
    if (!stillNeeded) selectedShipId = null;
    _renderShipList();
    _renderOwnBoard(placingPlayer);
    confirmBtn.disabled = !_allPlaced(placingPlayer);
  }

  function confirmPlacement() {
    if (!_allPlaced(placingPlayer)) return;

    if (_mp) {
      // Online: Signal senden
      pendingReady[_myIdx] = true;
      confirmBtn.disabled = true;
      turnLbl.textContent = '✅ Bereit! Warte auf Gegner…';
      _mp.send({ type:'bs:ready' });
      if (pendingReady[0] && pendingReady[1]) _startBattle();
    } else {
      // Lokal: P1 fertig → Abdeckung → P2 platziert
      if (placingPlayer === 0) {
        coverMsg.textContent = 'Spieler 2 bitte übernehmen! Schau nicht hin.';
        coverEl.classList.remove('hidden');
      } else {
        // Beide bereit → Kampf
        _startBattle();
      }
    }
  }

  function uncover() {
    coverEl.classList.add('hidden');
    if (phase === 'placement') {
      _startPlacement(1);
    } else {
      // Spielerwechsel
      _renderOwnBoard(currentPlayer);
      _renderEnemyBoard();
      _updateTurnLabel();
    }
  }

  /* ── Kampf-Phase ──────────────────────────────────── */
  function _startBattle() {
    phase = 'battle';
    currentPlayer = 0;
    placementEl.classList.add('hidden');
    _renderOwnBoard(0);
    _renderEnemyBoard();
    _updateTurnLabel();
  }

  function _enemyCellClick(r, c) {
    if (phase !== 'battle' || gameOver()) return;

    // Online: nur wenn eigener Zug
    if (_mp && currentPlayer !== _myIdx) return;
    // Online: warte auf Ergebnis
    if (awaitingResult) return;

    const oppIdx = 1 - currentPlayer;
    if (shots[currentPlayer][r][c]) return; // bereits beschossen

    if (_mp) {
      // Online: Schuss senden, warten auf Ergebnis
      awaitingResult = true;
      _mp.send({ type:'bs:shot', row:r, col:c });
      // Eigene Anzeige wird aktualisiert wenn Ergebnis kommt
    } else {
      // Lokal: Ergebnis direkt berechnen
      const hit = grids[oppIdx][r][c] === SHIP;
      let sunkName = null;
      shots[currentPlayer][r][c] = true;
      if (hit) {
        grids[oppIdx][r][c] = HIT;
        const ship = placements[oppIdx].find(s => s.cells.some(cl=>cl.r===r&&cl.c===c));
        if (ship && ship.cells.every(cl => shots[currentPlayer][cl.r][cl.c])) {
          ship.sunk = true;
          sunkName = ship.name;
          ship.cells.forEach(cl => grids[oppIdx][cl.r][cl.c] = SUNK);
        }
      } else {
        grids[oppIdx][r][c] = MISS;
      }
      _afterShot(currentPlayer, r, c, hit, sunkName);
    }
  }

  function _afterShot(shooterIdx, r, c, hit, sunkName) {
    const oppIdx = 1 - shooterIdx;
    shots[shooterIdx][r][c] = true;

    // Gewinn prüfen
    const allSunk = placements[oppIdx].every(s=>s.sunk);
    if (allSunk) {
      scores[shooterIdx]++;
      renderScores();
      _renderOwnBoard(currentPlayer);
      _renderEnemyBoard();
      showMsg(`🎉 ${shooterIdx===0?'Spieler 1':'Spieler 2'} gewinnt! Alle Schiffe versenkt!`, false);
      phase = 'done';
      return;
    }

    if (sunkName) {
      turnLbl.textContent = `💥 ${sunkName} versenkt!`;
      setTimeout(() => {
        _renderOwnBoard(currentPlayer);
        _renderEnemyBoard();
        _updateTurnLabel();
      }, 900);
    }

    if (!hit) {
      // Wechsel
      if (_mp) {
        currentPlayer = oppIdx;
        _renderOwnBoard(currentPlayer);
        _renderEnemyBoard();
        _updateTurnLabel();
      } else {
        // Hot-seat: Abdeckung
        currentPlayer = oppIdx;
        coverMsg.textContent = `${oppIdx===0?'Spieler 1':'Spieler 2'} bitte übernehmen!`;
        coverEl.classList.remove('hidden');
      }
    } else {
      // Treffer: nochmal
      _renderOwnBoard(currentPlayer);
      _renderEnemyBoard();
      _updateTurnLabel();
    }
  }

  /* ── Multiplayer-Nachrichten ──────────────────────── */
  function receiveMessage(data) {
    if (data.type === 'bs:ready') {
      const oppIdx = 1 - _myIdx;
      pendingReady[oppIdx] = true;
      if (pendingReady[0] && pendingReady[1]) _startBattle();

    } else if (data.type === 'bs:shot') {
      // Gegner schießt auf mein Feld → berechnen und Ergebnis senden
      const r = data.row, c = data.col;
      const oppShooterIdx = 1 - _myIdx;
      const hit = grids[_myIdx][r][c] === SHIP;
      let sunkName = null;
      shots[oppShooterIdx][r][c] = true;
      if (hit) {
        grids[_myIdx][r][c] = HIT;
        const ship = placements[_myIdx].find(s=>s.cells.some(cl=>cl.r===r&&cl.c===c));
        if (ship && ship.cells.every(cl => shots[oppShooterIdx][cl.r][cl.c])) {
          ship.sunk = true;
          sunkName = ship.name;
          ship.cells.forEach(cl => grids[_myIdx][cl.r][cl.c] = SUNK);
        }
      } else {
        grids[_myIdx][r][c] = MISS;
      }
      _mp.send({ type:'bs:result', row:r, col:c, hit, sunk:sunkName });
      // Eigenes Board aktualisieren
      _renderOwnBoard(_myIdx);
      if (!hit) {
        currentPlayer = _myIdx; // jetzt bin ich dran
        _updateTurnLabel();
      }

    } else if (data.type === 'bs:result') {
      // Ergebnis meines Schusses empfangen
      awaitingResult = false;
      const r = data.row, c = data.col;
      const oppIdx = 1 - _myIdx;

      if (data.hit) {
        grids[oppIdx][r][c] = HIT;
        if (data.sunk) {
          // Alle Zellen dieses Schiffs als SUNK markieren
          const ship = placements[oppIdx].find(s=>s.cells.some(cl=>cl.r===r&&cl.c===c));
          if (ship) {
            ship.sunk = true;
            ship.cells.forEach(cl => { grids[oppIdx][cl.r][cl.c] = SUNK; });
          }
        }
      } else {
        grids[oppIdx][r][c] = MISS;
      }
      shots[_myIdx][r][c] = true;

      _afterShot(_myIdx, r, c, data.hit, data.sunk);
    }
  }

  /* ── Board-Rendering ──────────────────────────────── */
  function _renderOwnBoard(pIdx) {
    ownBoardEl.innerHTML = '';
    document.getElementById('bs-own-title').textContent =
      _mp ? 'Dein Meer' : `Spieler ${pIdx+1}: Dein Meer`;

    for (let r=0; r<SIZE; r++) {
      for (let c=0; c<SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'bs-cell';
        const v = grids[pIdx][r][c];
        if (v === SHIP) cell.classList.add('ship-cell');
        if (v === HIT)  cell.classList.add('hit');
        if (v === MISS) cell.classList.add('miss');
        if (v === SUNK) cell.classList.add('sunk');

        // Hover-Vorschau beim Platzieren
        if (phase==='placement' && selectedShipId && placingPlayer===pIdx) {
          cell.addEventListener('mouseenter', () => _showPreview(r,c));
          cell.addEventListener('mouseleave', () => { _renderOwnBoard(pIdx); });
          cell.addEventListener('click', () => _ownCellClick(r,c));
        }
        ownBoardEl.appendChild(cell);
      }
    }
  }

  function _showPreview(startR, startC) {
    const def = SHIP_DEFS.find(d=>d.id===selectedShipId);
    if (!def) return;
    const alreadyPlaced = placements[placingPlayer].filter(s=>s.id===def.id).length;
    if (alreadyPlaced >= def.total) return;

    // Render base board first
    _renderOwnBoard(placingPlayer);

    const cells = _shipCells(startR, startC, def.size, vertical);
    const ok = _canPlace(placingPlayer, cells);
    const allCells = ownBoardEl.querySelectorAll('.bs-cell');

    cells.forEach(({r,c}) => {
      if (r<0||r>=SIZE||c<0||c>=SIZE) return;
      const idx = r*SIZE+c;
      allCells[idx].classList.add(ok ? 'preview' : 'preview-bad');
    });
  }

  function _renderEnemyBoard() {
    enemyBoardEl.innerHTML = '';
    document.getElementById('bs-enemy-title').textContent =
      _mp ? 'Gegnerisches Meer' : `Spieler ${(currentPlayer^1)+1}: Meer`;

    const oppIdx = _mp ? 1-_myIdx : 1-currentPlayer;

    for (let r=0; r<SIZE; r++) {
      for (let c=0; c<SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'bs-cell';

        // Nur eigene Schüsse anzeigen (nicht gegnerische Schiffe)
        const shooter = _mp ? _myIdx : currentPlayer;
        if (shots[shooter][r][c]) {
          const v = grids[oppIdx][r][c];
          if (v===SUNK) cell.classList.add('sunk');
          else if (v===HIT) cell.classList.add('hit');
          else cell.classList.add('miss');
        }

        if (phase==='battle') {
          cell.addEventListener('click', () => _enemyCellClick(r,c));
        }
        enemyBoardEl.appendChild(cell);
      }
    }
  }

  function _updateTurnLabel() {
    if (phase === 'battle') {
      const myTurn = _mp ? (currentPlayer===_myIdx) : true;
      if (_mp) {
        turnLbl.textContent = myTurn ? 'Dein Zug! Klicke ins gegnerische Feld.' : 'Gegner ist dran…';
      } else {
        turnLbl.textContent = `Spieler ${currentPlayer+1} schießt!`;
      }
      p1El.classList.toggle('active', currentPlayer===0);
      p2El.classList.toggle('active', currentPlayer===1);
    }
  }

  function renderScores() {
    if (score1El) score1El.textContent = scores[0];
    if (score2El) score2El.textContent = scores[1];
  }

  function gameOver() { return phase==='done'; }

  function showMsg(text, isDraw) {
    msgEl.classList.remove('hidden','draw');
    if (isDraw) msgEl.classList.add('draw');
    msgEl.innerHTML = `<div>${text}</div>
      <button onclick="Battleship.newGame()">Nochmal spielen</button>
      <button class="btn-secondary" onclick="Battleship.restart()">Score zurücksetzen</button>`;
  }

  /* ── Hilfs-Utilities ──────────────────────────────── */
  function _emptyGrid() {
    return Array.from({length:SIZE}, () => Array(SIZE).fill(WATER));
  }

  return { init, newGame, restart, rotate, randomize, confirmPlacement, uncover, receiveOpponentMove: receiveMessage };
})();
