/* =====================================================
   STICKMAN ARENA – Local 1v1 with weapons, maps, animation
   ===================================================== */
const Stickman = (() => {
  const WEAPONS = {
    pistol:  { speed: 8, damage: 12, cooldown: 220, spread: 0, pellets: 1, color: '#f8fafc' },
    shotgun: { speed: 7, damage: 7,  cooldown: 650, spread: 0.22, pellets: 5, color: '#fbbf24' },
    laser:   { speed: 12, damage: 9, cooldown: 120, spread: 0.03, pellets: 1, color: '#22d3ee' },
  };

  const MAPS = {
    dojo: {
      bg: ['#1f2937', '#111827'],
      ground: '#334155',
      platforms: [{ x: 280, y: 290, w: 120, h: 12 }, { x: 420, y: 220, w: 120, h: 12 }],
    },
    desert: {
      bg: ['#7c2d12', '#451a03'],
      ground: '#92400e',
      platforms: [{ x: 180, y: 260, w: 140, h: 12 }, { x: 500, y: 260, w: 140, h: 12 }],
    },
    neon: {
      bg: ['#0f172a', '#312e81'],
      ground: '#1d4ed8',
      platforms: [{ x: 250, y: 230, w: 150, h: 12 }, { x: 430, y: 300, w: 150, h: 12 }],
    },
  };

  let canvas, ctx, running = false, raf = null, _bound = false;
  let bullets = [], particles = [], keys = {};
  let mapId = 'dojo', map = MAPS.dojo;
  let stateEl, hp1El, hp2El;

  const players = [
    { x: 120, y: 340, vx: 0, vy: 0, hp: 100, color: '#38bdf8', facing: 1, weapon: 'pistol', cd: 0, controls: { left:'a', right:'d', jump:'w', fire:'f' } },
    { x: 700, y: 340, vx: 0, vy: 0, hp: 100, color: '#fb7185', facing: -1, weapon: 'pistol', cd: 0, controls: { left:'ArrowLeft', right:'ArrowRight', jump:'ArrowUp', fire:'/' } },
  ];

  const GRAVITY = 0.6;
  const GROUND_Y = 380;

  function init() {
    canvas = document.getElementById('stickman-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    stateEl = document.getElementById('stickman-state');
    hp1El = document.getElementById('stickman-p1-hp');
    hp2El = document.getElementById('stickman-p2-hp');
    applySetup();
    if (!_bound) {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      _bound = true;
    }
    restart();
  }

  function applySetup() {
    mapId = document.getElementById('stickman-map')?.value || 'dojo';
    map = MAPS[mapId] || MAPS.dojo;
    players[0].weapon = document.getElementById('stickman-weapon-p1')?.value || 'pistol';
    players[1].weapon = document.getElementById('stickman-weapon-p2')?.value || 'pistol';
    stateEl.textContent = `Map: ${mapId} • Fight!`;
  }

  function restart() {
    players[0].x = 120; players[0].y = 340; players[0].hp = 100; players[0].vx = players[0].vy = 0; players[0].cd = 0;
    players[1].x = 700; players[1].y = 340; players[1].hp = 100; players[1].vx = players[1].vy = 0; players[1].cd = 0;
    bullets = []; particles = [];
    updateHud();
    running = true;
    cancelAnimationFrame(raf);
    tick();
  }

  function onKeyDown(e) { keys[e.key] = true; }
  function onKeyUp(e) { keys[e.key] = false; }

  function tick() {
    update();
    render();
    if (running) raf = requestAnimationFrame(tick);
  }

  function update() {
    players.forEach((p, idx) => {
      const enemy = players[idx ^ 1];
      const { left, right, jump, fire } = p.controls;
      const moving = (keys[left] ? -1 : 0) + (keys[right] ? 1 : 0);
      p.vx = moving * 3.2;
      if (moving) p.facing = moving;
      if (keys[jump] && onGround(p)) p.vy = -11;

      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      resolveCollision(p);
      p.x = Math.max(14, Math.min(canvas.width - 14, p.x));

      if (p.cd > 0) p.cd -= 16;
      if (keys[fire] && p.cd <= 0) fire(idx, enemy);
    });

    bullets = bullets.filter(b => {
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < -30 || b.x > canvas.width + 30 || b.y < -30 || b.y > canvas.height + 30) return false;
      const enemy = players[b.owner ^ 1];
      if (Math.abs(b.x - enemy.x) < 12 && Math.abs(b.y - (enemy.y - 22)) < 32) {
        enemy.hp = Math.max(0, enemy.hp - b.damage);
        burst(b.x, b.y, enemy.color);
        updateHud();
        if (enemy.hp <= 0) {
          running = false;
          stateEl.textContent = b.owner === 0 ? '🏆 Spieler 1 gewinnt!' : '🏆 Spieler 2 gewinnt!';
        }
        return false;
      }
      return true;
    });

    particles = particles.filter(p => (p.life-- > 0));
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.2; });
  }

  function fire(idx, enemy) {
    const p = players[idx];
    const w = WEAPONS[p.weapon];
    p.cd = w.cooldown;
    const angleBase = Math.atan2((enemy.y - 26) - (p.y - 24), enemy.x - p.x);
    for (let i = 0; i < w.pellets; i++) {
      const spread = (Math.random() - 0.5) * w.spread;
      const ang = angleBase + spread;
      bullets.push({
        x: p.x + p.facing * 12,
        y: p.y - 24,
        vx: Math.cos(ang) * w.speed,
        vy: Math.sin(ang) * w.speed,
        owner: idx,
        damage: w.damage,
        color: w.color,
      });
    }
    burst(p.x + p.facing * 12, p.y - 24, w.color, 4);
  }

  function burst(x, y, color, amount = 8) {
    for (let i = 0; i < amount; i++) {
      particles.push({ x, y, vx:(Math.random()-0.5)*3, vy:(Math.random()-1.2)*3, life: 20 + Math.random()*18, color });
    }
  }

  function onGround(p) {
    if (p.y >= GROUND_Y) return true;
    return map.platforms.some(pl => p.y >= pl.y && p.y <= pl.y + 8 && p.x >= pl.x - 12 && p.x <= pl.x + pl.w + 12 && p.vy >= 0);
  }

  function resolveCollision(p) {
    if (p.y > GROUND_Y) { p.y = GROUND_Y; p.vy = 0; }
    map.platforms.forEach(pl => {
      const insideX = p.x >= pl.x - 12 && p.x <= pl.x + pl.w + 12;
      const crossed = p.y >= pl.y && p.y <= pl.y + 12 && p.vy >= 0;
      if (insideX && crossed) { p.y = pl.y; p.vy = 0; }
    });
  }

  function render() {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, map.bg[0]);
    grad.addColorStop(1, map.bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = map.ground;
    ctx.fillRect(0, 392, canvas.width, 28);

    ctx.fillStyle = 'rgba(255,255,255,.14)';
    map.platforms.forEach(pl => ctx.fillRect(pl.x, pl.y, pl.w, pl.h));

    bullets.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 2, 2);
      ctx.globalAlpha = 1;
    });

    players.forEach((p, i) => drawStickman(p, i));
  }

  function drawStickman(p, idx) {
    const t = performance.now() / 120;
    const walk = Math.sin(t + idx) * (Math.abs(p.vx) > 0.2 ? 8 : 2);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(p.x, p.y - 34, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 26);
    ctx.lineTo(p.x, p.y - 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 20);
    ctx.lineTo(p.x + p.facing * 13, p.y - 16);
    ctx.moveTo(p.x, p.y - 19);
    ctx.lineTo(p.x - p.facing * 8, p.y - 15 + walk * 0.1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 8);
    ctx.lineTo(p.x - 8, p.y + walk * 0.4);
    ctx.moveTo(p.x, p.y - 8);
    ctx.lineTo(p.x + 8, p.y - walk * 0.4);
    ctx.stroke();
  }

  function updateHud() {
    hp1El.textContent = `P1 HP: ${players[0].hp}`;
    hp2El.textContent = `P2 HP: ${players[1].hp}`;
    if (players[0].hp > 0 && players[1].hp > 0) stateEl.textContent = `Map: ${mapId} • Fight!`;
  }

  return { init, restart, applySetup };
})();
