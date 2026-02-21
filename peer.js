/* =====================================================
   PEER MANAGER – PeerJS WebRTC Wrapper
   Raum-Code = 6-stellige alphanumerische ID.
   Verwendet STUN + TURN für zuverlässige Verbindungen.
   ===================================================== */
const PeerManager = (() => {
  let _peer = null;
  let _conn = null;
  let _cbs  = {};

  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  /* STUN + kostenlose TURN-Server für NAT-Traversal */
  const ICE_CFG = {
    iceServers: [
      /* STUN */
      { urls: ['stun:stun.l.google.com:19302',
               'stun:stun1.l.google.com:19302',
               'stun:stun2.l.google.com:19302'] },
      /* TURN – Open Relay (kostenlos, kein Account nötig) */
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      /* TURN – metered.ca Backup */
      {
        urls: [
          'turn:relay.metered.ca:80',
          'turn:relay.metered.ca:443',
          'turns:relay.metered.ca:443',
        ],
        username: 'e94d7e7c0588a4cfb7a6',
        credential: 'OHKTXGkmEatVfRHk',
      },
    ],
  };

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
    _peer = new Peer(code, { config: ICE_CFG, debug: 0 });
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
    _peer = new Peer(undefined, { config: ICE_CFG, debug: 0 });
    _peer.on('open', () => {
      const conn = _peer.connect(code, { reliable: true, serialization: 'json' });
      _bind(conn);
      /* Timeout nach 20 s */
      const t = setTimeout(() => {
        if (!conn.open) {
          _cbs.onError && _cbs.onError(
            'Verbindungs-Timeout. Prüfe den Code und versuche es erneut.'
          );
        }
      }, 20000);
      conn.on('open', () => clearTimeout(t));
    });
    _peer.on('error', e => {
      const msg = e.type === 'peer-unavailable'
        ? 'Raum nicht gefunden. Prüfe den Code und versuche es erneut.'
        : (e.message || String(e));
      _cbs.onError && _cbs.onError(msg);
    });
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

  function isConnected() { return !!(_conn && _conn.open); }

  return { genCode, host, join, send, destroy, isConnected };
})();
