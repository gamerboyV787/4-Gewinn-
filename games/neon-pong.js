const NeonPong = (() => {
  let canvas, ctx, raf;
  let ball, p1, p2, score = [0, 0], running = false;
  const keys = {};
  let _bound = false;
  let _mp = null, _bot = null;
  let _mySide = 0;
  let _netReady = true;
  let _lastSend = 0;

  function init(mpConfig = null, botDifficulty = null) {
    canvas = document.getElementById('pong-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    _mp = mpConfig;
    _bot = botDifficulty;
    _mySide = !_mp ? 0 : (_mp.role === 'host' ? 0 : 1);
    _netReady = !_mp || _mp.role === 'host';

    if (!_bound) {
      window.addEventListener('keydown', e => keys[e.code] = true);
      window.addEventListener('keyup', e => keys[e.code] = false);
      _bound = true;
    }

    if (_mp) _mp.setHandler(onNetMsg);
    restart();
  }

  function restart(fromNet = false) {
    p1 = { y: 170 };
    p2 = { y: 170 };
    if (_mp && _mp.role === 'guest' && !fromNet) {
      _netReady = false;
      ball = { x: 410, y: 210, vx: 0, vy: 0 };
      _mp.send({ type: 'pong:restart-request' });
    } else {
      const serve = { vx: Math.random() < .5 ? -4 : 4, vy: (Math.random() * 2 - 1) * 3 };
      ball = { x: 410, y: 210, vx: serve.vx, vy: serve.vy };
      if (_mp && !fromNet) _mp.send({ type: 'pong:serve', ...serve, score });
      _netReady = true;
    }

    running = true;
    cancelAnimationFrame(raf);
    tick();
  }

  function onNetMsg(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'pong:serve') {
      ball = { x: 410, y: 210, vx: msg.vx, vy: msg.vy };
      if (Array.isArray(msg.score)) score = msg.score.slice(0, 2);
      _netReady = true;
    }
    if (msg.type === 'pong:restart-request' && _mp?.role === 'host') {
      restart();
    }
    if (msg.type === 'pong:paddle') {
      if (msg.side === 0) p1.y = msg.y;
      if (msg.side === 1) p2.y = msg.y;
    }
    if (msg.type === 'pong:score') {
      if (Array.isArray(msg.score)) score = msg.score.slice(0, 2);
    }
  }

  function tick(ts = 0) {
    update(ts);
    render();
    if (running) raf = requestAnimationFrame(tick);
  }

  function botMove() {
    const speed = _bot === 'easy' ? 2.2 : _bot === 'medium' ? 3.3 : _bot === 'hard' ? 4.2 : 5;
    const center = p2.y + 40;
    const target = ball.y + Math.sin(ball.x / 50) * (_bot === 'easy' ? 28 : 12);
    if (target < center - 4) p2.y -= speed;
    if (target > center + 4) p2.y += speed;
  }

  function update(ts) {
    if (_mp && !_netReady) return;

    const myPaddle = _mySide === 0 ? p1 : p2;
    if (!_mp || _mySide === 0) {
      if (keys.KeyW) p1.y -= 5;
      if (keys.KeyS) p1.y += 5;
    }
    if (!_mp && !_bot) {
      if (keys.ArrowUp) p2.y -= 5;
      if (keys.ArrowDown) p2.y += 5;
    }
    if (_mp && _mySide === 1) {
      if (keys.ArrowUp) p2.y -= 5;
      if (keys.ArrowDown) p2.y += 5;
    }
    if (_bot) botMove();

    p1.y = Math.max(0, Math.min(340, p1.y));
    p2.y = Math.max(0, Math.min(340, p2.y));

    if (_mp && ts - _lastSend > 45) {
      _mp.send({ type: 'pong:paddle', side: _mySide, y: myPaddle.y });
      _lastSend = ts;
    }

    // host authoritative physics in online mode
    if (_mp && _mySide !== 0) return;

    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.y < 8 || ball.y > 412) ball.vy *= -1;

    if (ball.x < 34 && ball.y > p1.y && ball.y < p1.y + 80) { ball.vx = Math.abs(ball.vx) + .15; }
    if (ball.x > 786 && ball.y > p2.y && ball.y < p2.y + 80) { ball.vx = -Math.abs(ball.vx) - .15; }

    if (ball.x < -20) {
      score[1]++;
      if (_mp) _mp.send({ type: 'pong:score', score });
      restart();
    }
    if (ball.x > 840) {
      score[0]++;
      if (_mp) _mp.send({ type: 'pong:score', score });
      restart();
    }
  }

  function render() {
    ctx.fillStyle = '#060b1a';
    ctx.fillRect(0, 0, 820, 420);
    ctx.strokeStyle = 'rgba(34,211,238,.5)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(410, 0); ctx.lineTo(410, 420); ctx.stroke();
    ctx.setLineDash([]);

    glowRect(20, p1.y, 12, 80, '#38bdf8');
    glowRect(788, p2.y, 12, 80, '#f472b6');
    glowCircle(ball.x, ball.y, 8, '#22d3ee');

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 26px Inter';
    ctx.fillText(`${score[0]}`, 360, 40);
    ctx.fillText(`${score[1]}`, 445, 40);

    if (_mp && !_netReady) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 18px Inter';
      ctx.fillText('Warte auf Host…', 332, 390);
    }
  }

  function glowRect(x, y, w, h, c) {
    ctx.shadowBlur = 18; ctx.shadowColor = c; ctx.fillStyle = c; ctx.fillRect(x, y, w, h); ctx.shadowBlur = 0;
  }
  function glowCircle(x, y, r, c) {
    ctx.shadowBlur = 18; ctx.shadowColor = c; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }

  return { init, restart };
})();
