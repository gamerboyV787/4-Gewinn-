const SkyShooter = (() => {
  let canvas, ctx, raf, running=false;
  let ships, bullets, enemies, score;
  let _mp=null,_bot=null,_myIdx=0,_bound=false,remoteInput={left:false,right:false,fire:false},remoteState=null;
  const keys = {};

  function init(mpConfig=null, botDifficulty=null) {
    canvas = document.getElementById('sky-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    _mp=mpConfig; _bot=botDifficulty; _myIdx=!_mp?0:(_mp.role==='host'?0:1);
    if (_mp) _mp.setHandler(onMsg);
    if (!_bound) {
      window.addEventListener('keydown', e => keys[e.code] = true);
      window.addEventListener('keyup', e => keys[e.code] = false);
      _bound=true;
    }
    restart();
  }

  function restart() {
    ships = [mk(250), mk(570)];
    bullets=[]; enemies=[]; score=0; running=true; remoteState=null;
    cancelAnimationFrame(raf); tick();
    if (_mp && _myIdx===0) _mp.send({t:'ss:restart'});
  }

  function mk(x){ return {x,y:380,cd:0,alive:true}; }

  function onMsg(m){
    if (!m||!m.t) return;
    if (m.t==='ss:input'){ remoteInput=m.i; return; }
    if (m.t==='ss:state'){ remoteState=m; return; }
    if (m.t==='ss:restart') restart();
  }

  function tick(){ update(); render(); if(running) raf=requestAnimationFrame(tick); }

  function update(){
    if (_mp && _myIdx===1) {
      const i=inputFor(1);
      _mp.send({t:'ss:input', i});
      if (remoteState) { ships=remoteState.s; bullets=remoteState.b; enemies=remoteState.e; score=remoteState.sc; running=remoteState.run; }
      return;
    }

    score += 0.25;
    const i0 = inputFor(0);
    const i1 = _mp ? remoteInput : (_bot ? botInput() : inputFor(1));
    moveShip(ships[0], i0, 80, 390);
    moveShip(ships[1], i1, 430, 740);

    bullets.forEach(b => b.y += b.vy);
    bullets = bullets.filter(b => b.y > -40);

    if (Math.random() < 0.07) enemies.push({ x: 30 + Math.random()*760, y: -20, vy: 1.8 + Math.random()*2.2, r: 10 + Math.random()*10 });
    enemies.forEach(e => e.y += e.vy);

    for (const e of enemies) {
      ships.forEach(s => { if (s.alive && Math.hypot(s.x-e.x, (s.y-8)-e.y) < e.r+13) s.alive=false; });
    }

    bullets = bullets.filter(b => {
      let hit=false;
      enemies = enemies.filter(e => {
        const touch=Math.hypot(b.x-e.x,b.y-e.y) < e.r+5;
        if (touch){ hit=true; score += 8; }
        return !touch;
      });
      return !hit;
    });

    enemies = enemies.filter(e => e.y < 460);
    if (!ships[0].alive && !ships[1].alive) running=false;

    if (_mp && _myIdx===0) _mp.send({t:'ss:state', s:ships, b:bullets, e:enemies, sc:score, run:running});
  }

  function moveShip(s, inp, minX, maxX){
    if (!s.alive) return;
    if (inp.left) s.x -= 4.8;
    if (inp.right) s.x += 4.8;
    s.x = Math.max(minX, Math.min(maxX, s.x));
    if (s.cd > 0) s.cd--;
    if (inp.fire && s.cd <= 0) {
      bullets.push({ x:s.x, y:s.y-14, vy:-8 });
      s.cd = 10;
    }
  }

  function inputFor(idx){
    if (idx===0) return { left:keys.KeyA, right:keys.KeyD, fire:keys.Space };
    return { left:keys.ArrowLeft, right:keys.ArrowRight, fire:keys.Enter || keys.Slash };
  }

  function botInput(){
    const s=ships[1];
    const near=enemies.filter(e=>e.y>80).sort((a,b)=>a.y-b.y)[0];
    if(!near) return {left:false,right:false,fire:Math.random()<0.2};
    return { left: near.x < s.x-8, right: near.x > s.x+8, fire: Math.abs(near.x-s.x)<40 };
  }

  function render(){
    const grad = ctx.createLinearGradient(0,0,0,420);
    grad.addColorStop(0,'#020617'); grad.addColorStop(1,'#1e1b4b');
    ctx.fillStyle=grad; ctx.fillRect(0,0,820,420);
    ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(410,0); ctx.lineTo(410,420); ctx.stroke();

    drawShip(ships[0], '#22d3ee');
    drawShip(ships[1], _bot?'#fbbf24':'#f472b6');

    ctx.fillStyle='#f8fafc'; bullets.forEach(b => ctx.fillRect(b.x-1.4,b.y-7,2.8,10));
    enemies.forEach(e=>{ ctx.fillStyle='#f97316'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill(); });

    ctx.fillStyle='#e2e8f0'; ctx.font='700 22px Inter'; ctx.fillText(`Score: ${Math.floor(score)}`, 14, 28);
    if(!running){ ctx.font='700 30px Inter'; ctx.fillText('Game Over – Neu drücken', 250, 210); }
  }

  function drawShip(s,c){
    ctx.fillStyle = s.alive?c:'#64748b';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y-14); ctx.lineTo(s.x-12,s.y+12); ctx.lineTo(s.x+12,s.y+12); ctx.closePath(); ctx.fill();
  }

  return { init, restart };
})();
