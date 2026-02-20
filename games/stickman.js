/* =====================================================
   STICKMAN ARENA – Local 1v1 with articulated animations
   ===================================================== */
const Stickman = (() => {
  const WEAPONS = {
    pistol: {
      speed: 10,
      damage: 15,
      cooldown: 260,
      pellets: 1,
      spread: 0.02,
      color: '#f8fafc',
      type: 'projectile',
    },
    shotgun: {
      speed: 8,
      damage: 7,
      cooldown: 700,
      pellets: 6,
      spread: 0.32,
      color: '#fbbf24',
      type: 'projectile',
    },
    laser: {
      damage: 11,
      cooldown: 130,
      color: '#22d3ee',
      type: 'hitscan',
      length: 760,
      thickness: 3,
    },
  };

  const MAPS = {
    dojo: {
      bg: ['#1f2937', '#111827'],
      ground: '#334155',
      deco: '#94a3b8',
      platforms: [{ x: 280, y: 290, w: 120, h: 12 }, { x: 420, y: 220, w: 120, h: 12 }],
    },
    desert: {
      bg: ['#7c2d12', '#451a03'],
      ground: '#92400e',
      deco: '#fdba74',
      platforms: [{ x: 180, y: 260, w: 140, h: 12 }, { x: 500, y: 260, w: 140, h: 12 }],
    },
    neon: {
      bg: ['#0f172a', '#312e81'],
      ground: '#1d4ed8',
      deco: '#67e8f9',
      platforms: [{ x: 250, y: 230, w: 150, h: 12 }, { x: 430, y: 300, w: 150, h: 12 }],
    },
  };

  const GRAVITY = 0.62;
  const GROUND_Y = 380;
  const DT = 16;

  let canvas, ctx, running = false, raf = null, _bound = false;
  let bullets = [], particles = [], beams = [];
  let mapId = 'dojo', map = MAPS.dojo;
  let stateEl, hp1El, hp2El;

  const keys = {};
  const players = [
    makePlayer(120, '#38bdf8', 1, { left: 'KeyA', right: 'KeyD', jump: 'KeyW', fire: 'KeyF' }),
    makePlayer(700, '#fb7185', -1, { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', fire: 'Slash' }),
  ];

  function makePlayer(x, color, facing, controls) {
    return {
      x,
      y: 340,
      vx: 0,
      vy: 0,
      hp: 100,
      color,
      facing,
      weapon: 'pistol',
      cd: 0,
      jumpLock: false,
      controls,
      animTime: 0,
      recoil: 0,
      blink: 0,
    };
  }

  function init() {
    canvas = document.getElementById('stickman-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    stateEl = document.getElementById('stickman-state');
    hp1El = document.getElementById('stickman-p1-hp');
    hp2El = document.getElementById('stickman-p2-hp');

    applySetup();
    bindControls();
    restart();
  }

  function bindControls() {
    if (_bound) return;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    _bound = true;
  }

  function onKeyDown(e) {
    keys[e.code] = true;
    if (e.code.startsWith('Arrow') || e.code === 'Slash') e.preventDefault();
  }

  function onKeyUp(e) {
    keys[e.code] = false;
  }

  function keyDown(code) {
    return !!keys[code];
  }

  function applySetup() {
    mapId = document.getElementById('stickman-map')?.value || 'dojo';
    map = MAPS[mapId] || MAPS.dojo;
    players[0].weapon = document.getElementById('stickman-weapon-p1')?.value || 'pistol';
    players[1].weapon = document.getElementById('stickman-weapon-p2')?.value || 'pistol';
    if (stateEl) stateEl.textContent = `Map: ${mapId} • Fight!`;
  }

  function restart() {
    players.forEach((p, idx) => {
      p.x = idx === 0 ? 120 : 700;
      p.y = 340;
      p.vx = 0;
      p.vy = 0;
      p.hp = 100;
      p.cd = 0;
      p.jumpLock = false;
      p.animTime = 0;
      p.recoil = 0;
      p.blink = 0;
    });

    bullets = [];
    particles = [];
    beams = [];

    updateHud();
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
    players.forEach((p, idx) => {
      const enemy = players[idx ^ 1];
      const left = keyDown(p.controls.left);
      const right = keyDown(p.controls.right);
      const jump = keyDown(p.controls.jump);
      const fire = keyDown(p.controls.fire);

      const inputX = (left ? -1 : 0) + (right ? 1 : 0);
      p.vx += inputX * 0.55;
      p.vx *= 0.78;
      if (Math.abs(p.vx) < 0.08) p.vx = 0;
      if (Math.abs(p.vx) > 4.4) p.vx = Math.sign(p.vx) * 4.4;
      if (inputX) p.facing = inputX;

      const grounded = onGround(p);
      if (jump && grounded && !p.jumpLock) {
        p.vy = -11.8;
        p.jumpLock = true;
      }
      if (!jump) p.jumpLock = false;

      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      resolveCollision(p);
      p.x = Math.max(14, Math.min(canvas.width - 14, p.x));

      p.animTime += Math.abs(p.vx) * 0.11 + 0.05;
      p.recoil *= 0.78;
      if (p.blink > 0) p.blink -= DT;

      if (p.cd > 0) p.cd -= DT;
      if (fire && p.cd <= 0 && enemy.hp > 0) {
        fireWeapon(idx, enemy);
      }
    });

    bullets = bullets.filter(b => {
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < -40 || b.x > canvas.width + 40 || b.y < -40 || b.y > canvas.height + 40) return false;

      const enemy = players[b.owner ^ 1];
      if (hitPlayer(enemy, b.x, b.y)) {
        damagePlayer(enemy, b.damage, b.owner, b.x, b.y);
        return false;
      }
      return true;
    });

    beams = beams.filter(beam => {
      beam.life -= DT;
      return beam.life > 0;
    });

    particles = particles.filter(p => (p.life -= DT) > 0);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
    });
  }

  function fireWeapon(idx, enemy) {
    const shooter = players[idx];
    const w = WEAPONS[shooter.weapon] || WEAPONS.pistol;

    shooter.cd = w.cooldown;
    shooter.recoil = 1;

    const sx = shooter.x + shooter.facing * 14;
    const sy = shooter.y - 23;
    const aimY = enemy.y - 24;
    const aimX = enemy.x;
    const baseAngle = Math.atan2(aimY - sy, aimX - sx);

    if (w.type === 'hitscan') {
      const tx = sx + Math.cos(baseAngle) * w.length;
      const ty = sy + Math.sin(baseAngle) * w.length;
      const hit = lineHit(enemy, sx, sy, tx, ty);
      if (hit) {
        damagePlayer(enemy, w.damage, idx, hit.x, hit.y);
      }
      beams.push({ x1: sx, y1: sy, x2: tx, y2: ty, color: w.color, life: 80, width: w.thickness });
      burst(sx, sy, w.color, 5, 2.8);
      return;
    }

    for (let i = 0; i < w.pellets; i++) {
      const ang = baseAngle + (Math.random() - 0.5) * w.spread;
      bullets.push({
        x: sx,
        y: sy,
        vx: Math.cos(ang) * w.speed,
        vy: Math.sin(ang) * w.speed,
        owner: idx,
        damage: w.damage,
        color: w.color,
      });
    }
    burst(sx, sy, w.color, 5, 2.5);
  }

  function hitPlayer(player, x, y) {
    const head = { x: player.x, y: player.y - 34, r: 9 };
    const body = { x: player.x, y: player.y - 16, w: 16, h: 26 };

    const inHead = Math.hypot(x - head.x, y - head.y) <= head.r;
    const inBody = Math.abs(x - body.x) <= body.w && Math.abs(y - body.y) <= body.h;
    return inHead || inBody;
  }

  function lineHit(player, x1, y1, x2, y2) {
    const px = player.x;
    const py = player.y - 24;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    const dist = Math.hypot(px - cx, py - cy);
    return dist < 18 ? { x: cx, y: cy } : null;
  }

  function damagePlayer(player, damage, attacker, x, y) {
    player.hp = Math.max(0, player.hp - damage);
    player.blink = 120;
    burst(x, y, player.color, 9, 3.4);
    updateHud();

    if (player.hp <= 0) {
      running = false;
      stateEl.textContent = attacker === 0 ? '🏆 Spieler 1 gewinnt!' : '🏆 Spieler 2 gewinnt!';
    }
  }

  function burst(x, y, color, amount = 8, force = 3) {
    for (let i = 0; i < amount; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * force,
        vy: (Math.random() - 1.2) * force,
        life: 220 + Math.random() * 120,
        color,
      });
    }
  }

  function onGround(p) {
    if (p.y >= GROUND_Y) return true;
    return map.platforms.some(pl =>
      p.y >= pl.y && p.y <= pl.y + 8 && p.x >= pl.x - 12 && p.x <= pl.x + pl.w + 12 && p.vy >= 0
    );
  }

  function resolveCollision(p) {
    if (p.y > GROUND_Y) {
      p.y = GROUND_Y;
      p.vy = 0;
    }

    map.platforms.forEach(pl => {
      const insideX = p.x >= pl.x - 12 && p.x <= pl.x + pl.w + 12;
      const crossed = p.y >= pl.y && p.y <= pl.y + 12 && p.vy >= 0;
      if (insideX && crossed) {
        p.y = pl.y;
        p.vy = 0;
      }
    });
  }

  function render() {
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, map.bg[0]);
    bg.addColorStop(1, map.bg[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawScenery();

    bullets.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    beams.forEach(beam => {
      ctx.strokeStyle = beam.color;
      ctx.globalAlpha = Math.max(0, beam.life / 80);
      ctx.lineWidth = beam.width;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    players.forEach((p, i) => drawStickman(p, i));

    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / 300);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 2.3, 2.3);
      ctx.globalAlpha = 1;
    });
  }

  function drawScenery() {
    ctx.fillStyle = map.ground;
    ctx.fillRect(0, 392, canvas.width, 28);

    ctx.strokeStyle = `${map.deco}55`;
    ctx.lineWidth = 1.6;
    for (let x = 0; x < canvas.width; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, 392);
      ctx.lineTo(x + 18, 420);
      ctx.stroke();
    }

    map.platforms.forEach(pl => {
      ctx.fillStyle = `${map.deco}44`;
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.strokeStyle = `${map.deco}aa`;
      ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
    });
  }

  function drawStickman(p, idx) {
    const moveAmp = Math.min(1, Math.abs(p.vx) / 3.8);
    const step = Math.sin(p.animTime * 1.8 + idx);
    const jumpTilt = Math.max(-0.35, Math.min(0.35, p.vy * 0.03));

    const hipX = p.x;
    const hipY = p.y - 10;
    const neckX = p.x + p.facing * p.recoil * -1.5;
    const neckY = p.y - 28;
    const headX = neckX + p.facing * 2;
    const headY = neckY - 8;

    const legA = step * 0.7 * moveAmp + jumpTilt;
    const legB = -step * 0.7 * moveAmp + jumpTilt;
    const armA = -step * 0.6 * moveAmp - p.recoil * 0.7;
    const armB = step * 0.45 * moveAmp;

    const shoulder = { x: neckX, y: neckY + 4 };
    const weaponArm = limb(shoulder.x, shoulder.y, 11, 12, p.facing * 0.2 + armA, p.facing);
    const offArm = limb(shoulder.x, shoulder.y, 10, 10, p.facing * 0.05 + armB, p.facing);
    const frontLeg = limb(hipX, hipY, 12, 12, legA, 1);
    const backLeg = limb(hipX, hipY, 12, 12, legB, 1);

    ctx.lineWidth = 3;
    ctx.strokeStyle = p.blink > 0 ? '#ffffff' : p.color;

    // torso
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(neckX, neckY);
    ctx.stroke();

    // head (separate part)
    ctx.beginPath();
    ctx.arc(headX, headY, 8.5, 0, Math.PI * 2);
    ctx.stroke();

    // arms (upper+lower segments)
    drawLimb(shoulder, weaponArm.knee, weaponArm.foot);
    drawLimb(shoulder, offArm.knee, offArm.foot);

    // legs (upper+lower segments)
    drawLimb({ x: hipX, y: hipY }, frontLeg.knee, frontLeg.foot);
    drawLimb({ x: hipX, y: hipY }, backLeg.knee, backLeg.foot);

    // weapon
    const weaponTipX = weaponArm.foot.x + p.facing * 9;
    const weaponTipY = weaponArm.foot.y - 2;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(weaponArm.foot.x, weaponArm.foot.y);
    ctx.lineTo(weaponTipX, weaponTipY);
    ctx.stroke();
  }

  function limb(x, y, upper, lower, angle, dir = 1) {
    const knee = {
      x: x + Math.cos(angle) * upper * dir,
      y: y + Math.sin(angle) * upper,
    };
    const foot = {
      x: knee.x + Math.cos(angle + 0.45 * Math.sign(Math.sin(angle || 1))) * lower * dir,
      y: knee.y + Math.sin(angle + 0.45 * Math.sign(Math.sin(angle || 1))) * lower,
    };
    return { knee, foot };
  }

  function drawLimb(a, b, c) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
  }

  function updateHud() {
    if (!hp1El || !hp2El || !stateEl) return;
    hp1El.textContent = `P1 HP: ${players[0].hp}`;
    hp2El.textContent = `P2 HP: ${players[1].hp}`;
    if (players[0].hp > 0 && players[1].hp > 0) {
      stateEl.textContent = `Map: ${mapId} • Fight!`;
    }
  }

  return { init, restart, applySetup };
})();
