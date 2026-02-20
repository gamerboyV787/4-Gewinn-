const MeteorDodge = (() => {
  let canvas, ctx, raf, running = false;
  let players, rocks, score;
  const keys = {};
  let _bound = false;
  let _mp = null, _bot = null, _mySide = 0;
  let _touch = [{left:false,right:false,jump:false},{left:false,right:false,jump:false}];
  let _remoteInput = { left:false, right:false, jump:false };
  let _lastSend = 0, _lastSnap = 0;

  function init(mpConfig = null, botDifficulty = null) {
    canvas = document.getElementById('dodge-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    _mp = mpConfig;
    _bot = botDifficulty;
    _mySide = !_mp ? 0 : (_mp.role === 'host' ? 0 : 1);

    if (!_bound) {
      window.addEventListener('keydown', e => keys[e.code] = true);
      window.addEventListener('keyup', e => keys[e.code] = false);
      bindTouch();
      _bound = true;
    }

    if (_mp) _mp.setHandler(onNet);
    restart();
  }

  function bindTouch() {
    const wrap = document.getElementById('dodge-touch');
    if (!wrap) return;
    const map = {
      'd1-left':[0,'left'], 'd1-right':[0,'right'], 'd1-jump':[0,'jump'],
      'd2-left':[1,'left'], 'd2-right':[1,'right'], 'd2-jump':[1,'jump'],
    };
    const set = (btn,v) => {
      const cfg = map[btn.dataset.touch]; if (!cfg) return;
      _touch[cfg[0]][cfg[1]] = v; btn.classList.toggle('active', v);
    };
    wrap.querySelectorAll('button[data-touch]').forEach(btn => {
      ['pointerdown','mousedown','touchstart'].forEach(ev => btn.addEventListener(ev, e=>{e.preventDefault();set(btn,true);},{passive:false}));
      ['pointerup','pointerleave','pointercancel','mouseup','mouseleave','touchend','touchcancel'].forEach(ev => btn.addEventListener(ev, e=>{e.preventDefault();set(btn,false);},{passive:false}));
    });
  }

  function restart() {
    players = [
      { x: 300, y: 360, vx: 0, vy: 0, color:'#22d3ee' },
      { x: 520, y: 360, vx: 0, vy: 0, color:'#f472b6' },
    ];
    rocks = [];
    score = 0;
    running = true;
    cancelAnimationFrame(raf);
    tick();
  }

  function onNet(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'md:input') _remoteInput = msg.input || _remoteInput;
    if (msg.type === 'md:snap' && _mySide === 1) {
      players = msg.players || players;
      rocks = msg.rocks || rocks;
      score = msg.score ?? score;
      running = !!msg.running;
    }
  }

  function tick(ts=0) {
    update(ts);
    render();
    if (running) raf = requestAnimationFrame(tick);
  }

  function readInput(side) {
    const kb = side === 0
      ? { left: !!keys.KeyA, right: !!keys.KeyD, jump: !!keys.KeyW }
      : { left: !!keys.ArrowLeft, right: !!keys.ArrowRight, jump: !!keys.ArrowUp };
    return {
      left: kb.left || _touch[side].left,
      right: kb.right || _touch[side].right,
      jump: kb.jump || _touch[side].jump,
    };
  }

  function botInput(side) {
    const p = players[side];
    const danger = rocks.find(r => Math.abs(r.x - p.x) < 90 && r.y > 240);
    return {
      left: !!danger && danger.x > p.x,
      right: !!danger && danger.x < p.x,
      jump: !!danger && Math.random() < (_bot==='easy'?0.01:_bot==='medium'?0.02:_bot==='hard'?0.03:0.04),
    };
  }

  function applyPlayer(i, inp) {
    const p = players[i];
    const ax = (inp.left ? -1 : 0) + (inp.right ? 1 : 0);
    p.vx += ax * 0.5; p.vx *= 0.85; p.x += p.vx;
    if (inp.jump && p.y >= 360) p.vy = -10;
    p.vy += 0.6; p.y += p.vy;
    if (p.y > 360) { p.y = 360; p.vy = 0; }
    p.x = Math.max(18, Math.min(802, p.x));
  }

  function update(ts) {
    const p0Input = _mp && _mySide===1 ? _remoteInput : readInput(0);
    let p1Input = readInput(1);

    if (_bot) p1Input = botInput(1);
    if (_mp && _mySide===1) {
      if (ts - _lastSend > 45) {
        _mp.send({ type:'md:input', input: readInput(1) });
        _lastSend = ts;
      }
      return; // guest waits for snapshots
    }

    score += 1;
    applyPlayer(0, p0Input);
    applyPlayer(1, p1Input);

    if (Math.random() < 0.06) rocks.push({ x: Math.random()*800+10, y:-30, r:10+Math.random()*16, vy:3+Math.random()*4, vx:(Math.random()-.5)*1.5 });
    rocks.forEach(r => { r.x += r.vx; r.y += r.vy; });
    rocks = rocks.filter(r => r.y < 470);

    for (const r of rocks) {
      for (const p of players) {
        if (Math.hypot(p.x-r.x, (p.y-20)-r.y) < r.r+14) running = false;
      }
    }

    if (_mp && ts - _lastSnap > 70) {
      _mp.send({ type:'md:snap', players, rocks, score, running });
      _lastSnap = ts;
    }
  }

  function render() {
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0,0,820,420);
    ctx.fillStyle = '#111827'; ctx.fillRect(0,390,820,30);
    rocks.forEach(r => { ctx.fillStyle='#f97316'; ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,Math.PI*2); ctx.fill(); });

    players.forEach(p => {
      ctx.strokeStyle = p.color; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(p.x, p.y-32, 10, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x, p.y-22); ctx.lineTo(p.x, p.y-2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x, p.y-14); ctx.lineTo(p.x-12, p.y-6); ctx.moveTo(p.x, p.y-14); ctx.lineTo(p.x+12, p.y-6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x, p.y-2); ctx.lineTo(p.x-10, p.y+12); ctx.moveTo(p.x, p.y-2); ctx.lineTo(p.x+10, p.y+12); ctx.stroke();
    });

    ctx.fillStyle='#e2e8f0'; ctx.font='700 22px Inter';
    ctx.fillText(`Score: ${Math.floor(score/10)}`, 16, 30);
    if (!running) {
      ctx.fillStyle='#f8fafc'; ctx.font='700 30px Inter'; ctx.fillText('Game Over – Neu drücken', 250, 210);
    }
  }

  return { init, restart };
})();
