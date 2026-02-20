/* =====================================================
   STICKMAN ARENA – Local 1v1 with stylized person animation
   ===================================================== */
const Stickman = (() => {
  const WEAPONS = {
    pistol: {
      speed: 11,
      damage: 16,
      cooldown: 240,
      pellets: 1,
      spread: 0.01,
      color: '#e2e8f0',
      type: 'projectile',
      kick: 0.9,
    },
    shotgun: {
      speed: 8,
      damage: 7,
      cooldown: 620,
      pellets: 7,
      spread: 0.34,
      color: '#fbbf24',
      type: 'projectile',
      kick: 1.2,
    },
    laser: {
      damage: 10,
      cooldown: 120,
      color: '#22d3ee',
      type: 'hitscan',
      length: 780,
      thickness: 4,
      kick: 0.55,
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

  let canvas, ctx, running = false, raf = null, _bound = false, _touchBound = false;
  let bullets = [], particles = [], beams = [];
  const touchState = [
    { left:false, right:false, jump:false, fire:false },
    { left:false, right:false, jump:false, fire:false },
  ];
  let mapId = 'dojo', map = MAPS.dojo;
  let stateEl, hp1El, hp2El;

  const keys = {};
  const players = [
    makePlayer(120, '#38bdf8', 1, {
      left: ['KeyA'],
      right: ['KeyD'],
      jump: ['KeyW'],
      fire: ['KeyF', 'Space'],
    }),
    makePlayer(700, '#fb7185', -1, {
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      jump: ['ArrowUp'],
      fire: ['Slash', 'NumpadDivide', 'Enter'],
    }),
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
      weaponGlow: 0,
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
    bindTouchControls();
    restart();
  }

  function bindControls() {
    if (_bound) return;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    _bound = true;
  }


  function bindTouchControls() {
    if (_touchBound) return;
    const wrap = document.getElementById('stickman-touch');
    if (!wrap) return;

    const mapAction = {
      'p1-left': [0, 'left'],
      'p1-right': [0, 'right'],
      'p1-jump': [0, 'jump'],
      'p1-fire': [0, 'fire'],
      'p2-left': [1, 'left'],
      'p2-right': [1, 'right'],
      'p2-jump': [1, 'jump'],
      'p2-fire': [1, 'fire'],
    };

    const start = (btn) => {
      const key = btn.dataset.touch;
      const cfg = mapAction[key];
      if (!cfg) return;
      touchState[cfg[0]][cfg[1]] = true;
      btn.classList.add('active');
    };
    const stop = (btn) => {
      const key = btn.dataset.touch;
      const cfg = mapAction[key];
      if (!cfg) return;
      touchState[cfg[0]][cfg[1]] = false;
      btn.classList.remove('active');
    };

    wrap.querySelectorAll('button[data-touch]').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); start(btn); });
      btn.addEventListener('pointerup',   (e) => { e.preventDefault(); stop(btn); });
      btn.addEventListener('pointerleave',(e) => { e.preventDefault(); stop(btn); });
      btn.addEventListener('pointercancel',(e)=> { e.preventDefault(); stop(btn); });
      btn.addEventListener('touchstart',  (e) => { e.preventDefault(); start(btn); }, { passive:false });
      btn.addEventListener('touchend',    (e) => { e.preventDefault(); stop(btn); }, { passive:false });
    });

    _touchBound = true;
  }

  function onKeyDown(e) {
    keys[e.code] = true;
    keys[e.key] = true;
    if (e.code.startsWith('Arrow') || e.code === 'Slash' || e.code === 'Space') e.preventDefault();
  }

  function onKeyUp(e) {
    keys[e.code] = false;
    keys[e.key] = false;
  }

  function anyDown(inputs) {
    return inputs.some(k => !!keys[k]);
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
      p.weaponGlow = 0;
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
      const left = anyDown(p.controls.left) || touchState[idx].left;
      const right = anyDown(p.controls.right) || touchState[idx].right;
      const jump = anyDown(p.controls.jump) || touchState[idx].jump;
      const fire = anyDown(p.controls.fire) || touchState[idx].fire;

      const inputX = (left ? -1 : 0) + (right ? 1 : 0);
      p.vx += inputX * 0.58;
      p.vx *= 0.79;
      if (Math.abs(p.vx) < 0.08) p.vx = 0;
      if (Math.abs(p.vx) > 4.5) p.vx = Math.sign(p.vx) * 4.5;
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
      p.x = Math.max(20, Math.min(canvas.width - 20, p.x));

      p.animTime += Math.abs(p.vx) * 0.12 + 0.04;
      p.recoil *= 0.75;
      p.weaponGlow *= 0.88;
      if (p.blink > 0) p.blink -= DT;

      if (p.cd > 0) p.cd -= DT;
      if (fire && p.cd <= 0 && enemy.hp > 0) fireWeapon(idx, enemy);
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

    beams = beams.filter(beam => (beam.life -= DT) > 0);
    particles = particles.filter(p => (p.life -= DT) > 0);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.17;
    });
  }

  function fireWeapon(idx, enemy) {
    const shooter = players[idx];
    const w = WEAPONS[shooter.weapon] || WEAPONS.pistol;

    shooter.cd = w.cooldown;
    shooter.recoil = w.kick;
    shooter.weaponGlow = 1;

    const sx = shooter.x + shooter.facing * 14;
    const sy = shooter.y - 23;
    const baseAngle = Math.atan2(enemy.y - 24 - sy, enemy.x - sx);

    if (w.type === 'hitscan') {
      const tx = sx + Math.cos(baseAngle) * w.length;
      const ty = sy + Math.sin(baseAngle) * w.length;
      const hit = lineHit(enemy, sx, sy, tx, ty);
      if (hit) damagePlayer(enemy, w.damage, idx, hit.x, hit.y);
      beams.push({ x1: sx, y1: sy, x2: tx, y2: ty, color: w.color, life: 90, width: w.thickness });
      burst(sx, sy, w.color, 6, 2.8);
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
    burst(sx, sy, w.color, 6, 2.4);
  }

  function hitPlayer(player, x, y) {
    const head = { x: player.x, y: player.y - 37, r: 11 };
    const body = { x: player.x, y: player.y - 18, w: 18, h: 30 };
    return Math.hypot(x - head.x, y - head.y) <= head.r ||
      (Math.abs(x - body.x) <= body.w && Math.abs(y - body.y) <= body.h);
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
    return Math.hypot(px - cx, py - cy) < 20 ? { x: cx, y: cy } : null;
  }

  function damagePlayer(player, damage, attacker, x, y) {
    player.hp = Math.max(0, player.hp - damage);
    player.blink = 130;
    burst(x, y, player.color, 12, 3.4);
    updateHud();

    if (player.hp <= 0) {
      running = false;
      if (stateEl) stateEl.textContent = attacker === 0 ? '🏆 Spieler 1 gewinnt!' : '🏆 Spieler 2 gewinnt!';
    }
  }

  function burst(x, y, color, amount = 8, force = 3) {
    for (let i = 0; i < amount; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * force,
        vy: (Math.random() - 1.25) * force,
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
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    beams.forEach(beam => {
      ctx.strokeStyle = beam.color;
      ctx.globalAlpha = Math.max(0, beam.life / 90);
      ctx.lineWidth = beam.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    players.forEach((p, i) => drawPerson(p, i));

    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / 320);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 2.6, 2.6);
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

  function drawPerson(p, idx) {
    const moveAmp = Math.min(1, Math.abs(p.vx) / 3.6);
    const step = Math.sin(p.animTime * 1.9 + idx);
    const run = Math.abs(p.vx) > 2.8 ? 1 : 0;
    const lean = p.vx * 0.05 + (p.vy < -1 ? -0.12 : 0) + (p.vy > 2 ? 0.08 : 0);

    const hip = { x: p.x, y: p.y - 10 };
    const neck = { x: p.x + lean * 14 - p.facing * p.recoil * 1.5, y: p.y - 31 };
    const head = { x: neck.x + p.facing * 2, y: neck.y - 10 };

    const leg1 = legPose(hip, step * 0.9 * moveAmp + lean * 0.4, run);
    const leg2 = legPose(hip, -step * 0.9 * moveAmp + lean * 0.4, run);

    const shoulder = { x: neck.x, y: neck.y + 4 };
    const armFire = armPose(shoulder, p.facing * 0.06 - step * 0.5 * moveAmp - p.recoil * 0.8, p.facing, true);
    const armOff = armPose(shoulder, p.facing * -0.1 + step * 0.35 * moveAmp, p.facing, false);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = p.blink > 0 ? '#ffffff' : p.color;
    ctx.fillStyle = p.blink > 0 ? '#ffffff' : p.color;

    // Torso as thick rounded shape (person-like)
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(neck.x, neck.y);
    ctx.stroke();

    // Head (separate)
    ctx.beginPath();
    ctx.arc(head.x, head.y, 10.5, 0, Math.PI * 2);
    ctx.fill();

    // Arms and legs as separate segments
    drawLimb(shoulder, armFire.elbow, armFire.hand, 10);
    drawLimb(shoulder, armOff.elbow, armOff.hand, 9);
    drawLimb(hip, leg1.knee, leg1.foot, 11);
    drawLimb(hip, leg2.knee, leg2.foot, 11);

    // Weapon
    const muzzleX = armFire.hand.x + p.facing * 11;
    const muzzleY = armFire.hand.y - 1;
    ctx.strokeStyle = p.weaponGlow > 0 ? '#fff' : '#dbeafe';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(armFire.hand.x, armFire.hand.y);
    ctx.lineTo(muzzleX, muzzleY);
    ctx.stroke();

    if (p.weaponGlow > 0.2) {
      ctx.globalAlpha = p.weaponGlow;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function legPose(hip, angle, runBoost) {
    const upper = 14 + runBoost * 1.4;
    const lower = 15 + runBoost * 1.8;
    const knee = {
      x: hip.x + Math.sin(angle) * upper,
      y: hip.y + Math.cos(angle) * upper,
    };
    const ankleAngle = angle * 0.6 + 0.35;
    const foot = {
      x: knee.x + Math.sin(ankleAngle) * lower,
      y: knee.y + Math.cos(ankleAngle) * lower,
    };
    return { knee, foot };
  }

  function armPose(shoulder, angle, facing, aiming) {
    const upper = aiming ? 12 : 11;
    const lower = aiming ? 13 : 11;
    const elbow = {
      x: shoulder.x + Math.cos(angle) * upper * facing,
      y: shoulder.y + Math.sin(angle) * upper,
    };
    const fore = aiming ? angle - 0.1 : angle + 0.45;
    const hand = {
      x: elbow.x + Math.cos(fore) * lower * facing,
      y: elbow.y + Math.sin(fore) * lower,
    };
    return { elbow, hand };
  }

  function drawLimb(a, b, c, width) {
    ctx.lineWidth = width;
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
    if (players[0].hp > 0 && players[1].hp > 0) stateEl.textContent = `Map: ${mapId} • Fight!`;
  }

  return { init, restart, applySetup };
})();
