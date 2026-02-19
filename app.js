/* =====================================================
   APP – View-Router & globale Hilfsfunktionen
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
  }

  function openGame(name) {
    if (name === 'connect-four') {
      showView('view-connect-four');
      ConnectFour.init();
    }
  }

  function goHub() {
    showView('view-hub');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { openGame, goHub };
})();
