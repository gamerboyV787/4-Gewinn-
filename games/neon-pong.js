const NeonPong = (() => {
  let canvas, ctx, raf;
  let ball, p1, p2, score, running;
  let _mp=null, _bot=null, _mySide=0, _bound=false;
  let remoteY=170, remoteState=null;
  const keys = {};

  function init(mpConfig=null, botDifficulty=null) {
    canvas = document.getElementById('pong-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    _mp = mpConfig;
    _bot = botDifficulty;
    _mySide = !_mp ? 0 : (_mp.role === 'host' ? 0 : 1);
    if (_mp) _mp.setHandler(onMsg);
    if (!_bound) {
      window.addEventListener('keydown', e => keys[e.code] = true);
      window.addEventListener('keyup', e => keys[e.code] = false);
      _bound = true;
    }
    restart();
  }

  function restart() {
    p1 = { y: 170 };
    p2 = { y: 170 };
    score = [0, 0];
    resetBall();
    running = true;
    remoteState = null;
    cancelAnimationFrame(raf);
    tick();
    if (_mp && _mySide === 0) _mp.send({ t:'np:restart' });
  }

  function resetBall() {
    ball = { x: 410, y: 210, vx: Math.random() < .5 ? -4 : 4, vy: (Math.random()*2-1)*3 };
  }

  function onMsg(m) {
    if (!m || !m.t) return;
    if (m.t === 'np:input') {
      remoteY = m.y;
      return;
    }
    if (m.t === 'np:state') {
      remoteState = m;
      return;
    }
    if (m.t === 'np:restart') restart();
  }

  function tick() {
    update();
    render();
    if (running) raf = requestAnimationFrame(tick);
  }

  function update() {
    const speed = 5;

    if (_mp) {
      if (_mySide === 0) {
        if (keys.KeyW) p1.y -= speed;
        if (keys.KeyS) p1.y += speed;
        p2.y += (remoteY - p2.y) * 0.45;
        simulateBall();
        _mp.send({ t:'np:state', p1:p1.y, p2:p2.y, bx:ball.x, by:ball.y, bvx:ball.vx, bvy:ball.vy, s0:score[0], s1:score[1] });
      } else {
        if (keys.ArrowUp) p2.y -= speed;
        if (keys.ArrowDown) p2.y += speed;
        _mp.send({ t:'np:input', y:p2.y });
        if (remoteState) {
          p1.y = remoteState.p1; p2.y = remoteState.p2;
          ball.x = remoteState.bx; ball.y = remoteState.by;
          ball.vx = remoteState.bvx; ball.vy = remoteState.bvy;
          score[0] = remoteState.s0; score[1] = remoteState.s1;
        }
      }
    } else if (_bot) {
      if (keys.KeyW) p1.y -= speed;
      if (keys.KeyS) p1.y += speed;
      const diff = { easy:.05, medium:.09, hard:.13, hacker:.2 }[_bot] || .08;
      p2.y += (ball.y - 40 - p2.y) * diff;
      simulateBall();
    } else {
      if (keys.KeyW) p1.y -= speed;
      if (keys.KeyS) p1.y += speed;
      if (keys.ArrowUp) p2.y -= speed;
      if (keys.ArrowDown) p2.y += speed;
      simulateBall();
    }

    p1.y = clamp(p1.y,0,340); p2.y = clamp(p2.y,0,340);
  }

  function simulateBall() {
    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.y < 8 || ball.y > 412) ball.vy *= -1;
    if (ball.x < 36 && ball.y > p1.y && ball.y < p1.y + 80) { ball.vx = Math.abs(ball.vx) + .12; }
    if (ball.x > 784 && ball.y > p2.y && ball.y < p2.y + 80) { ball.vx = -Math.abs(ball.vx) - .12; }
    if (ball.x < -20) { score[1]++; resetBall(); }
    if (ball.x > 840) { score[0]++; resetBall(); }
  }

  function render() {
    ctx.fillStyle = '#060b1a'; ctx.fillRect(0,0,820,420);
    ctx.strokeStyle = 'rgba(34,211,238,.5)'; ctx.setLineDash([8,8]);
    ctx.beginPath(); ctx.moveTo(410,0); ctx.lineTo(410,420); ctx.stroke(); ctx.setLineDash([]);

    glowRect(20,p1.y,12,80,'#38bdf8');
    glowRect(788,p2.y,12,80,_bot ? '#fbbf24' : '#f472b6');
    glowCircle(ball.x, ball.y, 8, '#22d3ee');

    ctx.fillStyle = '#e2e8f0'; ctx.font = '700 26px Inter';
    ctx.fillText(`${score[0]}`, 360, 40); ctx.fillText(`${score[1]}`, 445, 40);
  }

  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
  function glowRect(x,y,w,h,c){ ctx.shadowBlur=18; ctx.shadowColor=c; ctx.fillStyle=c; ctx.fillRect(x,y,w,h); ctx.shadowBlur=0; }
  function glowCircle(x,y,r,c){ ctx.shadowBlur=18; ctx.shadowColor=c; ctx.fillStyle=c; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }

  return { init, restart };
})();
