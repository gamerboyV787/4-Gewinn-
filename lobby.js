/* =====================================================
   LOBBY – Modal-Controller
   Verwaltet Spielmodus-Auswahl, Online-Verbindung und Bot
   ===================================================== */
const Lobby = (() => {
  const GAME_INFO = {
    'connect-four': { name: '4-Gewinnt',         icon: '🔴' },
    'tictactoe':    { name: 'Tic-Tac-Toe',        icon: '✕○' },
    'chess':        { name: 'Schach',              icon: '♟️' },
    'battleship':   { name: 'Schiffe versenken',   icon: '🚢' },
    'othello':      { name: 'Othello',             icon: '⚫' },
  };

  let _gameId     = null;
  let _code       = null;
  let _role       = null;
  let _onStart    = null;   // fn(gameId, mpConfig|null, botDifficulty|null)
  let _msgHandler = null;

  /* ── Öffnen ───────────────────────────────────────── */
  function open(gameId, onStart) {
    _gameId     = gameId;
    _onStart    = onStart;
    _code       = null;
    _role       = null;
    _msgHandler = null;
    PeerManager.destroy();

    const info = GAME_INFO[gameId] || { name: gameId, icon: '🎮' };
    document.getElementById('lobby-game-icon').textContent = info.icon;
    document.getElementById('lobby-game-name').textContent = info.name;

    document.getElementById('lobby-code-input').value = '';
    document.getElementById('lobby-join-error').classList.add('hidden');
    showStep('mode');
    document.getElementById('lobby-overlay').classList.remove('hidden');
  }

  /* ── Pre-filled join from URL ─────────────────────── */
  function openJoin(code, gameId, onStart) {
    open(gameId, onStart);
    document.getElementById('lobby-code-input').value = code;
    showStep('join');
  }

  function close() {
    document.getElementById('lobby-overlay').classList.add('hidden');
    PeerManager.destroy();
    _gameId = _code = _role = _onStart = _msgHandler = null;
  }

  /* ── Schritt anzeigen ─────────────────────────────── */
  function showStep(name) {
    document.querySelectorAll('.lobby-step')
      .forEach(s => s.classList.add('hidden'));
    const el = document.getElementById(`lobby-step-${name}`);
    if (el) el.classList.remove('hidden');
  }

  /* ── Lokal spielen ────────────────────────────────── */
  function chooseLocal() {
    showStep('local-menu');
  }

  /* ── Lokal: 2 Spieler ─────────────────────────────── */
  function chooseLocalTwo() {
    const gId = _gameId;
    const cb  = _onStart;
    close();
    cb(gId, null, null);
  }

  /* ── Bot-Schwierigkeit wählen ─────────────────────── */
  function chooseBotMode() {
    showStep('bot-difficulty');
  }

  function chooseDifficulty(diff) {
    const gId = _gameId;
    const cb  = _onStart;
    close();
    cb(gId, null, diff);
  }

  /* ── Online-Warnung wenn file:// ─────────────────── */
  function showOnlineMenu() {
    if (location.protocol === 'file:') {
      showStep('file-warning');
    } else {
      showStep('online-menu');
    }
  }

  /* ── Online – Raum erstellen ──────────────────────── */
  function chooseHost() {
    _role = 'host';
    _code = PeerManager.genCode();
    _updateCodeDisplay(_code);
    document.getElementById('lobby-step-host-status').textContent =
      '⏳ Warte auf Mitspieler…';
    showStep('host');

    PeerManager.host(_code, {
      onRetry: newCode => {
        _code = newCode;
        _updateCodeDisplay(newCode);
      },
      onOpen: () => {
        document.getElementById('lobby-step-host-status').textContent =
          '✅ Verbunden! Spiel startet…';
        setTimeout(() => _launch('host'), 900);
      },
      onMsg:   data => _msgHandler && _msgHandler(data),
      onClose: ()   => _handleDisconnect(),
      onError: err  => {
        document.getElementById('lobby-step-host-status').textContent =
          `❌ Fehler: ${err}`;
      },
    });
  }

  /* ── Online – Beitreten ───────────────────────────── */
  function chooseJoin() { showStep('join'); }

  function confirmJoin() {
    const input = document.getElementById('lobby-code-input');
    const code  = input.value.trim().toUpperCase().slice(0, 6);
    const errEl = document.getElementById('lobby-join-error');

    if (code.length < 6) {
      errEl.textContent = 'Bitte einen 6-stelligen Code eingeben.';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');
    showStep('connecting');
    _role = 'guest';
    _code = code;

    PeerManager.join(code, {
      onOpen: ()   => { setTimeout(() => _launch('guest'), 600); },
      onMsg:  data => _msgHandler && _msgHandler(data),
      onClose: ()  => _handleDisconnect(),
      onError: err => {
        errEl.textContent = `❌ ${err}`;
        errEl.classList.remove('hidden');
        showStep('join');
      },
    });
  }

  /* ── Interne Helfer ───────────────────────────────── */
  function _launch(role) {
    const gId = _gameId;
    const cb  = _onStart;

    const mpConfig = {
      role,
      send: data => PeerManager.send(data),
      setHandler: fn => { _msgHandler = fn; },
    };

    document.getElementById('lobby-overlay').classList.add('hidden');
    _gameId = _code = _role = _onStart = null;
    cb(gId, mpConfig, null);
  }

  function _handleDisconnect() {
    document.getElementById('mp-disconnect-modal').classList.remove('hidden');
  }

  function _updateCodeDisplay(code) {
    document.getElementById('lobby-room-code').textContent = code;
    const link = `${location.origin}${location.pathname}?join=${code}&game=${_gameId}`;
    const inp  = document.getElementById('lobby-link-input');
    if (inp) inp.value = link;
  }

  /* ── Kopier-Buttons ───────────────────────────────── */
  function copyCode() {
    if (!_code) return;
    navigator.clipboard.writeText(_code).catch(() => {});
    const btn = document.getElementById('lobby-btn-copy-code');
    const orig = btn.textContent;
    btn.textContent = '✅ Kopiert!';
    setTimeout(() => (btn.textContent = orig), 2000);
  }

  function copyLink() {
    const val = document.getElementById('lobby-link-input')?.value;
    if (!val) return;
    navigator.clipboard.writeText(val).catch(() => {});
    const btn = document.getElementById('lobby-btn-copy-link');
    const orig = btn.textContent;
    btn.textContent = '✅ Kopiert!';
    setTimeout(() => (btn.textContent = orig), 2000);
  }

  return {
    open, openJoin, close, showStep, showOnlineMenu,
    chooseLocal, chooseLocalTwo, chooseBotMode, chooseDifficulty,
    chooseHost, chooseJoin, confirmJoin,
    copyCode, copyLink,
  };
})();
