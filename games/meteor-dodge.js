const MeteorDodge = (() => {
  let canvas, ctx, raf, running=false;
  let player, rocks, score;
  const keys = {};

  function init() {
    canvas = document.getElementById('dodge-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    restart();
  }

  function restart() {
    player = { x: 390, y: 360, vx:0, vy:0 };
    rocks = [];
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
    score += 1;
    const ax = (keys.KeyA?-1:0)+(keys.KeyD?1:0);
    player.vx += ax*0.5; player.vx*=0.85; player.x += player.vx;
    if (keys.KeyW && player.y>=360) player.vy = -10;
    player.vy += 0.6; player.y += player.vy;
    if (player.y>360){ player.y=360; player.vy=0; }
    player.x = Math.max(18, Math.min(802, player.x));

    if (Math.random() < 0.06) rocks.push({ x: Math.random()*800+10, y:-30, r:10+Math.random()*16, vy:3+Math.random()*4, vx:(Math.random()-.5)*1.5 });
    rocks.forEach(r => { r.x += r.vx; r.y += r.vy; });
    rocks = rocks.filter(r => r.y < 470);

    for (const r of rocks) {
      if (Math.hypot(player.x-r.x, (player.y-20)-r.y) < r.r+14) running=false;
    }
  }

  function render() {
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0,0,820,420);
    ctx.fillStyle = '#111827'; ctx.fillRect(0,390,820,30);
    rocks.forEach(r => { ctx.fillStyle='#f97316'; ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,Math.PI*2); ctx.fill(); });
    ctx.strokeStyle='#22d3ee'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.arc(player.x, player.y-32, 10, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(player.x, player.y-22); ctx.lineTo(player.x, player.y-2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(player.x, player.y-14); ctx.lineTo(player.x-12, player.y-6); ctx.moveTo(player.x, player.y-14); ctx.lineTo(player.x+12, player.y-6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(player.x, player.y-2); ctx.lineTo(player.x-10, player.y+12); ctx.moveTo(player.x, player.y-2); ctx.lineTo(player.x+10, player.y+12); ctx.stroke();

    ctx.fillStyle='#e2e8f0'; ctx.font='700 22px Inter';
    ctx.fillText(`Score: ${Math.floor(score/10)}`, 16, 30);
    if (!running) {
      ctx.fillStyle='#f8fafc'; ctx.font='700 30px Inter'; ctx.fillText('Game Over – Neu drücken', 250, 210);
    }
  }

  return { init, restart };
})();
