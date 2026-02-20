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
        Lobby.openJoin(code, gameId, (gId, mpCfg, botDiff) =>
          startGame(gId, mpCfg, botDiff)
        );
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
    Lobby.open(name, (gameId, mpConfig, botDiff) =>
      startGame(gameId, mpConfig, botDiff)
    );
  }

  /* ── Spiel tatsächlich starten ─────────────────────── */
  function startGame(gameId, mpConfig, botDiff) {
    const VIEW_MAP = {
      'connect-four': 'view-connect-four',
      'tictactoe':    'view-tictactoe',
      'chess':        'view-chess',
      'battleship':   'view-battleship',
      'othello':      'view-othello',
      'stickman':     'view-stickman',
      'neon-pong':    'view-neon-pong',
      'meteor-dodge': 'view-meteor-dodge',
      'sky-shooter':  'view-sky-shooter',
    };
    const MOD_MAP = {
      'connect-four': () => ConnectFour,
      'tictactoe':    () => TicTacToe,
      'chess':        () => Chess,
      'battleship':   () => Battleship,
      'othello':      () => Othello,
      'stickman':     () => Stickman,
      'neon-pong':    () => NeonPong,
      'meteor-dodge': () => MeteorDodge,
      'sky-shooter':  () => SkyShooter,
    };

    const view = VIEW_MAP[gameId];
    const mod  = MOD_MAP[gameId]?.();
    if (!view || !mod) return;

    /* Bot-Badge anzeigen */
    const botBadgeIds = {
      'connect-four': 'cf-bot-bar',
      'tictactoe':    'ttt-bot-bar',
      'chess':        'chess-bot-bar',
      'battleship':   'bs-bot-bar',
      'othello':      'ot-bot-bar',
    };
    document.querySelectorAll('.bot-bar').forEach(b => b.classList.add('hidden'));
    if (botDiff) {
      const bb = document.getElementById(botBadgeIds[gameId]);
      if (bb) {
        const labels = {easy:'Einfach',medium:'Mittel',hard:'Schwer',hacker:'Hacker ☠️'};
        bb.querySelector('.bot-diff-label').textContent =
          `🤖 Bot – ${labels[botDiff] || botDiff}`;
        bb.classList.remove('hidden');
      }
    }

    /* MP-Bar */
    document.querySelectorAll('.mp-bar').forEach(b => b.classList.add('hidden'));
    if (mpConfig) {
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
    mod.init(mpConfig || null, botDiff || null);
  }

  /* ── Zurück zum Hub ───────────────────────────────── */
  function goHub() {
    PeerManager.destroy();
    document.querySelectorAll('.mp-bar').forEach(b => b.classList.add('hidden'));
    document.querySelectorAll('.bot-bar').forEach(b => b.classList.add('hidden'));
    document.getElementById('mp-disconnect-modal').classList.add('hidden');
    showView('view-hub');
  }

  document.addEventListener('DOMContentLoaded', init);
  return { openGame, goHub, startGame };
})();
