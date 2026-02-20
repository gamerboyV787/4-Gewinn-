/* =====================================================
   APP – View-Router + Lobby-Bridge + URL-Params
   ===================================================== */
const App = (() => {
  const views = {};

  function init() {
    document.querySelectorAll('.view').forEach(v => { views[v.id] = v; });

    // URL-Parameter: ?join=CODE&game=GAMEID
    const params = new URLSearchParams(location.search);
    if (params.has('join')) {
      const code   = params.get('join').toUpperCase().slice(0, 6);
      const gameId = params.get('game') || null;
      history.replaceState({}, '', location.pathname);
      if (gameId) {
        Lobby.openJoin(code, gameId, (gId, mpCfg) => startGame(gId, mpCfg));
      }
    }
  }

  /* ── View wechseln ────────────────────────────────── */
  function showView(id) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    if (views[id]) views[id].classList.add('active');
    window.scrollTo(0, 0);
  }

  /* ── Spiel aus Hub öffnen → Lobby ────────────────── */
  function openGame(name) {
    Lobby.open(name, (gameId, mpConfig) => startGame(gameId, mpConfig));
  }

  /* ── Spiel tatsächlich starten ─────────────────────── */
  function startGame(gameId, mpConfig) {
    const viewId = 'view-' + gameId.replace('connect-four', 'connect-four');
    // Map gameId → view ID (connect-four maps as-is, others too)
    const VIEW_MAP = {
      'connect-four': 'view-connect-four',
      'tictactoe':    'view-tictactoe',
      'chess':        'view-chess',
      'battleship':   'view-battleship',
      'othello':      'view-othello',
    };
    const MOD_MAP = {
      'connect-four': () => ConnectFour,
      'tictactoe':    () => TicTacToe,
      'chess':        () => Chess,
      'battleship':   () => Battleship,
      'othello':      () => Othello,
    };

    const view = VIEW_MAP[gameId];
    const mod  = MOD_MAP[gameId]?.();
    if (!view || !mod) return;

    // MP-Bar anzeigen
    const barEl   = document.getElementById(gameId.replace('-','') + '-mp-bar') ||
                    document.getElementById(gameId.replace('connect-four','cf') + '-mp-bar') ||
                    document.getElementById(gameId.split('-')[0] + '-mp-bar');

    // Alle MP-Bars verstecken, dann richtigen zeigen
    document.querySelectorAll('.mp-bar').forEach(b => b.classList.add('hidden'));
    if (mpConfig) {
      // Korrekte Bar-ID ermitteln
      const barIds = {
        'connect-four': 'cf-mp-bar',
        'tictactoe':    'ttt-mp-bar',
        'chess':        'chess-mp-bar',
        'battleship':   'bs-mp-bar',
        'othello':      'ot-mp-bar',
      };
      const bar = document.getElementById(barIds[gameId]);
      if (bar) {
        bar.classList.remove('hidden');
        const lbl = bar.querySelector('span:last-child');
        if (lbl) lbl.textContent = `Online – ${mpConfig.role === 'host' ? 'Host' : 'Gast'}`;
      }
    }

    showView(view);
    mod.init(mpConfig || null);
  }

  /* ── Zurück zum Hub ───────────────────────────────── */
  function goHub() {
    PeerManager.destroy();
    document.querySelectorAll('.mp-bar').forEach(b => b.classList.add('hidden'));
    document.getElementById('mp-disconnect-modal').classList.add('hidden');
    showView('view-hub');
  }

  document.addEventListener('DOMContentLoaded', init);
  return { openGame, goHub, startGame };
})();
