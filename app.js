/* =====================================================
   APP – View-Router
   ===================================================== */
const App = (() => {
  const views = {};

  function init() {
    document.querySelectorAll('.view').forEach(v => {
      views[v.id] = v;
    });
  }

  function showView(id) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    const v = views[id];
    if (v) v.classList.add('active');
    window.scrollTo(0, 0);
  }

  function openGame(name) {
    if (name === 'connect-four') { showView('view-connect-four'); ConnectFour.init(); }
    if (name === 'tictactoe')    { showView('view-tictactoe');    TicTacToe.init();   }
    if (name === 'chess')        { showView('view-chess');         Chess.init();       }
  }

  function goHub() { showView('view-hub'); }

  document.addEventListener('DOMContentLoaded', init);

  return { openGame, goHub };
})();
