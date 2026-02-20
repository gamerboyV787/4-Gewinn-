const SkyShooter = (() => {
  let canvas, ctx, raf, running=false;
  let ship, bullets, enemies, score;
  const keys = {};
  let _bound=false;

  function init() {
    canvas = document.getElementById('sky-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    if (!_bound) {
      window.addEventListener('keydown', e => keys[e.code] = true);
      window.addEventListener('keyup', e => keys[e.code] = false);
      _bound = true;
    }
    restart();
  }

  function restart() {
    ship = { x: 410, y: 380, cd: 0 };
    bullets = [];
    enemies = [];
    score = 0;
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
    if (keys.KeyA) ship.x -= 5;
    if (keys.KeyD) ship.x += 5;
    ship.x = Math.max(18, Math.min(802, ship.x));
    if (ship.cd > 0) ship.cd--;
    if (keys.Space && ship.cd <= 0) {
      bullets.push({ x: ship.x, y: ship.y - 14, vy: -8 });
      ship.cd = 8;
    }

    bullets.forEach(b => b.y += b.vy);
    bullets = bullets.filter(b => b.y > -30);

    if (Math.random() < 0.06) enemies.push({ x: 20 + Math.random()*780, y: -20, vy: 2 + Math.random()*2, r: 12 + Math.random()*10 });
    enemies.forEach(e => e.y += e.vy);

    for (const e of enemies) {
      if (Math.hypot(ship.x - e.x, (ship.y - 8) - e.y) < e.r + 12) running = false;
    }

    bullets = bullets.filter(b => {
      let hit = false;
      enemies = enemies.filter(e => {
        const touch = Math.hypot(b.x - e.x, b.y - e.y) < e.r + 5;
        if (touch) { hit = true; score += 10; }
        return !touch;
      });
      return !hit;
    });

    enemies = enemies.filter(e => e.y < 460);
  }

  function render() {
    const grad = ctx.createLinearGradient(0,0,0,420);
    grad.addColorStop(0, '#020617');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,820,420);

    for (let i=0;i<60;i++) {
      const x = (i*137 % 820);
      const y = (i*73 % 420);
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(x,y,2,2);
    }

    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y-14);
    ctx.lineTo(ship.x-12, ship.y+12);
    ctx.lineTo(ship.x+12, ship.y+12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    bullets.forEach(b => ctx.fillRect(b.x-1.4, b.y-7, 2.8, 10));

    enemies.forEach(e => {
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill();
    });

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 22px Inter';
    ctx.fillText(`Score: ${score}`, 14, 28);
    if (!running) {
      ctx.font = '700 30px Inter';
      ctx.fillText('Game Over – Neu drücken', 250, 210);
    }
  }

  return { init, restart };
})();
