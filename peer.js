/* =====================================================
   PEER MANAGER – PeerJS WebRTC Wrapper
   Raum-Code = 6-stellige alphanumerische ID,
   die direkt als PeerJS Peer-ID verwendet wird.
   ===================================================== */
const PeerManager = (() => {
  let _peer = null;
  let _conn = null;
  let _cbs  = {};

  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function genCode() {
    return Array.from({ length: 6 },
      () => CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join('');
  }

  function _bind(conn) {
    _conn = conn;
    conn.on('open',  ()    => _cbs.onOpen  && _cbs.onOpen());
    conn.on('data',  data  => _cbs.onMsg   && _cbs.onMsg(data));
    conn.on('close', ()    => _cbs.onClose && _cbs.onClose());
    conn.on('error', e     => _cbs.onError && _cbs.onError(e.message || String(e)));
  }

  /* ── Host: Raum erstellen ─────────────────────────── */
  function host(code, callbacks) {
    destroy();
    _cbs = callbacks;
    _peer = new Peer(code);
    _peer.on('connection', conn => _bind(conn));
    _peer.on('error', e => {
      if (e.type === 'unavailable-id') {
        const newCode = genCode();
        callbacks.onRetry && callbacks.onRetry(newCode);
        host(newCode, callbacks);
      } else {
        _cbs.onError && _cbs.onError(e.message || String(e));
      }
    });
  }

  /* ── Gast: Raum beitreten ─────────────────────────── */
  function join(code, callbacks) {
    destroy();
    _cbs = callbacks;
    _peer = new Peer();
    _peer.on('open', () => {
      const conn = _peer.connect(code, { reliable: true });
      _bind(conn);
    });
    _peer.on('error', e => _cbs.onError && _cbs.onError(e.message || String(e)));
  }

  /* ── Nachricht senden ─────────────────────────────── */
  function send(data) {
    if (_conn && _conn.open) _conn.send(data);
  }

  /* ── Verbindung trennen ───────────────────────────── */
  function destroy() {
    if (_conn) { try { _conn.close(); } catch (_) {} _conn = null; }
    if (_peer) { try { _peer.destroy(); } catch (_) {} _peer = null; }
    _cbs = {};
  }

  function isConnected() { return !!(  _conn && _conn.open); }

  return { genCode, host, join, send, destroy, isConnected };
})();
