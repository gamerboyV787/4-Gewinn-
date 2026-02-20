const NeonPong = (() => {
  let canvas, ctx, raf;
  let ball, p1, p2, score = [0, 0], running = false;
  const keys = {};

  function init() {
    canvas = document.getElementById('pong-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    restart();
  }

  function restart() {
    p1 = { y: 170 };
    p2 = { y: 170 };
    ball = { x: 410, y: 210, vx: Math.random() < .5 ? -4 : 4, vy: (Math.random()*2-1)*3 };
    running = true;
    cancelAnimationFrame(raf);
    tick();
  }

  function tick() {
    update();
    render();
    if (running) raf = requestAnimationFrame(tick);
  }

  function update() {
    if (keys.KeyW) p1.y -= 5;
    if (keys.KeyS) p1.y += 5;
    if (keys.ArrowUp) p2.y -= 5;
    if (keys.ArrowDown) p2.y += 5;
    p1.y = Math.max(0, Math.min(340, p1.y));
    p2.y = Math.max(0, Math.min(340, p2.y));

    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.y < 8 || ball.y > 412) ball.vy *= -1;

    if (ball.x < 34 && ball.y > p1.y && ball.y < p1.y + 80) { ball.vx = Math.abs(ball.vx) + .15; }
    if (ball.x > 786 && ball.y > p2.y && ball.y < p2.y + 80) { ball.vx = -Math.abs(ball.vx) - .15; }

    if (ball.x < -20) { score[1]++; restart(); }
    if (ball.x > 840) { score[0]++; restart(); }
  }

  function render() {
    ctx.fillStyle = '#060b1a';
    ctx.fillRect(0,0,820,420);
    ctx.strokeStyle = 'rgba(34,211,238,.5)';
    ctx.setLineDash([8,8]);
    ctx.beginPath(); ctx.moveTo(410,0); ctx.lineTo(410,420); ctx.stroke();
    ctx.setLineDash([]);

    glowRect(20,p1.y,12,80,'#38bdf8');
    glowRect(788,p2.y,12,80,'#f472b6');
    glowCircle(ball.x, ball.y, 8, '#22d3ee');

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 26px Inter';
    ctx.fillText(`${score[0]}`, 360, 40);
    ctx.fillText(`${score[1]}`, 445, 40);
  }

  function glowRect(x,y,w,h,c){ ctx.shadowBlur=18; ctx.shadowColor=c; ctx.fillStyle=c; ctx.fillRect(x,y,w,h); ctx.shadowBlur=0; }
  function glowCircle(x,y,r,c){ ctx.shadowBlur=18; ctx.shadowColor=c; ctx.fillStyle=c; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }

  return { init, restart };
})();
