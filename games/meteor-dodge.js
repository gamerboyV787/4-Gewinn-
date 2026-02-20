const MeteorDodge = (() => {
  let canvas, ctx, raf, running=false;
  let players, rocks, score;
  let _mp=null,_bot=null,_myIdx=0,_bound=false,remoteInput={left:false,right:false,jump:false},remoteState=null;
  const keys = {};

  function init(mpConfig=null, botDifficulty=null) {
    canvas = document.getElementById('dodge-canvas');
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
    players = [mk(230), mk(590)];
    rocks = []; score = 0; running = true; remoteState=null;
    cancelAnimationFrame(raf); tick();
    if (_mp && _myIdx===0) _mp.send({t:'md:restart'});
  }

  function mk(x){ return {x,y:360,vx:0,vy:0,alive:true}; }

  function onMsg(m){
    if (!m||!m.t) return;
    if (m.t==='md:input'){ remoteInput=m.i; return; }
    if (m.t==='md:state'){ remoteState=m; return; }
    if (m.t==='md:restart') restart();
  }

  function tick(){ update(); render(); if(running) raf=requestAnimationFrame(tick); }

  function update(){
    if (_mp && _myIdx===1) {
      const inp = inputFor(1);
      _mp.send({t:'md:input', i:inp});
      if (remoteState) applyState(remoteState);
      return;
    }

    score += 1;
    const i0 = inputFor(0);
    const i1 = _mp ? remoteInput : (_bot ? botInput() : inputFor(1));
    simPlayer(players[0], i0, 120, 340);
    simPlayer(players[1], i1, 480, 700);

    if (Math.random() < 0.075) {
      const lane = Math.random()<.5 ? 0 : 1;
      rocks.push({ x:(lane===0?230:590)+(Math.random()-0.5)*85, y:-28, r:10+Math.random()*16, vy:3+Math.random()*4, vx:(Math.random()-.5)*1.2 });
    }
    rocks.forEach(r => { r.x += r.vx; r.y += r.vy; });
    rocks = rocks.filter(r => r.y < 470);

    for (const p of players) {
      for (const r of rocks) {
        if (p.alive && Math.hypot(p.x-r.x, (p.y-20)-r.y) < r.r+14) p.alive=false;
      }
    }

    if (!players[0].alive || !players[1].alive) running=false;

    if (_mp && _myIdx===0) {
      _mp.send({t:'md:state', p:players, r:rocks, s:score, run:running});
    }
  }

  function simPlayer(p, inp, minX, maxX){
    const ax=(inp.left?-1:0)+(inp.right?1:0);
    p.vx += ax*0.52; p.vx*=0.84; p.x += p.vx;
    if (inp.jump && p.y>=360) p.vy=-10;
    p.vy += 0.62; p.y += p.vy;
    if (p.y>360){ p.y=360; p.vy=0; }
    p.x = Math.max(minX, Math.min(maxX, p.x));
  }

  function inputFor(idx){
    if (idx===0) return { left:keys.KeyA, right:keys.KeyD, jump:keys.KeyW };
    return { left:keys.ArrowLeft, right:keys.ArrowRight, jump:keys.ArrowUp };
  }

  function botInput(){
    const p=players[1];
    const near = rocks.filter(r=>Math.abs(r.x-p.x)<130 && r.y>220).sort((a,b)=>a.y-b.y)[0];
    if (!near) return {left:false,right:false,jump:false};
    return { left: near.x>p.x, right: near.x<p.x, jump: near.y>300 };
  }

  function applyState(st){
    players = st.p; rocks = st.r; score = st.s; running = st.run;
  }

  function render(){
    ctx.fillStyle='#0b1020'; ctx.fillRect(0,0,820,420);
    ctx.fillStyle='#111827'; ctx.fillRect(0,390,820,30);
    ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(410,0); ctx.lineTo(410,420); ctx.stroke();
    rocks.forEach(r=>{ ctx.fillStyle='#f97316'; ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,Math.PI*2); ctx.fill(); });
    drawP(players[0], '#22d3ee');
    drawP(players[1], _bot?'#fbbf24':'#f472b6');
    ctx.fillStyle='#e2e8f0'; ctx.font='700 22px Inter'; ctx.fillText(`Score: ${Math.floor(score/10)}`,16,30);
    if(!running){ ctx.font='700 28px Inter'; ctx.fillText('Runde vorbei – Neu drücken',240,210); }
  }

  function drawP(p,c){
    ctx.strokeStyle = p.alive?c:'#64748b'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.arc(p.x, p.y-32, 10, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x,p.y-22); ctx.lineTo(p.x,p.y-2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x,p.y-14); ctx.lineTo(p.x-12,p.y-6); ctx.moveTo(p.x,p.y-14); ctx.lineTo(p.x+12,p.y-6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x,p.y-2); ctx.lineTo(p.x-10,p.y+12); ctx.moveTo(p.x,p.y-2); ctx.lineTo(p.x+10,p.y+12); ctx.stroke();
  }

  return { init, restart };
})();
