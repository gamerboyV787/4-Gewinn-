/* =====================================================
   PARTY – Persistente Online-Gruppe über mehrere Spiele
   ===================================================== */
const Party = (() => {
  let _role = null; // host | guest
  let _code = null;
  let _connected = false;
  let _status = 'Nicht verbunden';
  let _handler = null;

  function init() {
    _render();
  }

  function create() {
    const code = PeerManager.genCode();
    _role = 'host';
    _code = code;
    _connected = false;
    _status = `Party ${code} wird erstellt…`;
    _render();

    PeerManager.host(code, {
      onRetry: newCode => { _code = newCode; _status = `Neuer Code: ${newCode}`; _render(); },
      onOpen: () => { _connected = true; _status = `✅ Party aktiv (${_code})`; _render(); },
      onMsg: data => _handler && _handler(data),
      onClose: () => { _connected = false; _status = '❌ Party getrennt'; _render(); },
      onError: err => { _connected = false; _status = `❌ ${err}`; _render(); },
    });
  }

  function join(code) {
    _role = 'guest';
    _code = code;
    _connected = false;
    _status = `Verbinde zu ${code}…`;
    _render();

    PeerManager.join(code, {
      onOpen: () => { _connected = true; _status = `✅ Verbunden mit ${_code}`; _render(); },
      onMsg: data => _handler && _handler(data),
      onClose: () => { _connected = false; _status = '❌ Party getrennt'; _render(); },
      onError: err => { _connected = false; _status = `❌ ${err}`; _render(); },
    });
  }

  function leave() {
    PeerManager.destroy();
    _role = null;
    _code = null;
    _connected = false;
    _status = 'Nicht verbunden';
    _render();
  }

  function getMpConfig(gameId) {
    if (!_connected || !_role) return null;
    return {
      role: _role,
      send: payload => PeerManager.send({ gameId, payload }),
      setHandler: fn => {
        _handler = data => {
          if (!data || data.gameId !== gameId) return;
          fn(data.payload);
        };
      },
    };
  }

  function _render() {
    const codeEl = document.getElementById('party-code-view');
    const statusEl = document.getElementById('party-status');
    const createBtn = document.getElementById('party-create-btn');
    const joinBtn = document.getElementById('party-join-btn');
    const leaveBtn = document.getElementById('party-leave-btn');
    if (!codeEl || !statusEl || !createBtn || !joinBtn || !leaveBtn) return;

    codeEl.textContent = _code || '------';
    statusEl.textContent = _status;
    createBtn.disabled = _connected;
    joinBtn.disabled = _connected;
    leaveBtn.disabled = !_connected;
  }

  function handleCreate() { create(); }
  function handleJoin() {
    const inp = document.getElementById('party-code-input');
    const code = inp?.value?.trim()?.toUpperCase()?.slice(0, 6);
    if (!code || code.length < 6) return;
    join(code);
  }

  function isConnected() { return _connected; }
  function role() { return _role; }

  return { init, handleCreate, handleJoin, leave, isConnected, role, getMpConfig };
})();
