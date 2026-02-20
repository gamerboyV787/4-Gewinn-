const SkyShooter = (() => {
  let canvas, ctx, raf, running=false;
  let ships, bullets, enemies, score;
  const keys = {};
  let _bound=false;
  let _mp=null, _bot=null, _mySide=0;
  let _remoteInput={left:false,right:false,fire:false};
  let _touch=[{left:false,right:false,fire:false},{left:false,right:false,fire:false}];
  let _lastSend=0,_lastSnap=0;

  function init(mpConfig = null, botDifficulty = null) {
    canvas = document.getElementById('sky-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    _mp = mpConfig; _bot = botDifficulty; _mySide = !_mp ? 0 : (_mp.role==='host'?0:1);
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
    const wrap=document.getElementById('sky-touch'); if(!wrap) return;
    const map={'s1-left':[0,'left'],'s1-right':[0,'right'],'s1-fire':[0,'fire'],'s2-left':[1,'left'],'s2-right':[1,'right'],'s2-fire':[1,'fire']};
    const set=(btn,v)=>{const c=map[btn.dataset.touch]; if(!c) return; _touch[c[0]][c[1]]=v; btn.classList.toggle('active',v);};
    wrap.querySelectorAll('button[data-touch]').forEach(btn=>{
      ['pointerdown','mousedown','touchstart'].forEach(ev=>btn.addEventListener(ev,e=>{e.preventDefault();set(btn,true);},{passive:false}));
      ['pointerup','pointerleave','pointercancel','mouseup','mouseleave','touchend','touchcancel'].forEach(ev=>btn.addEventListener(ev,e=>{e.preventDefault();set(btn,false);},{passive:false}));
    });
  }

  function restart() {
    ships = [ {x:300,y:380,cd:0,color:'#22d3ee'}, {x:520,y:380,cd:0,color:'#f472b6'} ];
    bullets = []; enemies=[]; score=0; running=true;
    cancelAnimationFrame(raf); tick();
  }

  function onNet(msg){
    if(!msg||typeof msg!=='object')return;
    if(msg.type==='ss:input') _remoteInput=msg.input||_remoteInput;
    if(msg.type==='ss:snap' && _mySide===1){ ships=msg.ships||ships; bullets=msg.bullets||bullets; enemies=msg.enemies||enemies; score=msg.score??score; running=!!msg.running; }
  }

  function readInput(side){
    const kb=side===0?{left:!!keys.KeyA,right:!!keys.KeyD,fire:!!keys.Space}:{left:!!keys.ArrowLeft,right:!!keys.ArrowRight,fire:!!keys.Enter||!!keys.Slash};
    return { left: kb.left||_touch[side].left, right: kb.right||_touch[side].right, fire: kb.fire||_touch[side].fire };
  }

  function botInput(){
    const s=ships[1];
    const target=enemies.reduce((a,e)=>!a||e.y>a.y?e:a,null);
    return {
      left: !!target && target.x < s.x-10,
      right: !!target && target.x > s.x+10,
      fire: Math.random() < (_bot==='easy'?0.03:_bot==='medium'?0.05:_bot==='hard'?0.07:0.1),
    };
  }

  function stepShip(i,inp){
    const s=ships[i];
    if(inp.left) s.x -= 5;
    if(inp.right) s.x += 5;
    s.x=Math.max(18,Math.min(802,s.x));
    if(s.cd>0) s.cd--;
    if(inp.fire && s.cd<=0){ bullets.push({x:s.x,y:s.y-14,vy:-8,owner:i}); s.cd=8; }
  }

  function tick(ts=0){ update(ts); render(); if(running) raf=requestAnimationFrame(tick); }

  function update(ts){
    const i0 = _mp && _mySide===1 ? _remoteInput : readInput(0);
    let i1 = readInput(1);
    if(_bot) i1 = botInput();

    if(_mp && _mySide===1){
      if(ts-_lastSend>45){ _mp.send({type:'ss:input', input: readInput(1)}); _lastSend=ts; }
      return;
    }

    score += 1;
    stepShip(0,i0);
    stepShip(1,i1);

    bullets.forEach(b=>b.y+=b.vy);
    bullets=bullets.filter(b=>b.y>-30);

    if(Math.random()<0.06) enemies.push({x:20+Math.random()*780,y:-20,vy:2+Math.random()*2,r:12+Math.random()*10});
    enemies.forEach(e=>e.y+=e.vy);

    for(const e of enemies){ for(const s of ships){ if(Math.hypot(s.x-e.x,(s.y-8)-e.y)<e.r+12) running=false; }}

    bullets=bullets.filter(b=>{
      let hit=false;
      enemies=enemies.filter(e=>{ const touch=Math.hypot(b.x-e.x,b.y-e.y)<e.r+5; if(touch){hit=true;score+=10;} return !touch;});
      return !hit;
    });

    enemies=enemies.filter(e=>e.y<460);

    if(_mp && ts-_lastSnap>70){ _mp.send({type:'ss:snap', ships, bullets, enemies, score, running}); _lastSnap=ts; }
  }

  function render(){
    const grad=ctx.createLinearGradient(0,0,0,420); grad.addColorStop(0,'#020617'); grad.addColorStop(1,'#1e1b4b');
    ctx.fillStyle=grad; ctx.fillRect(0,0,820,420);
    for(let i=0;i<60;i++){ const x=(i*137%820), y=(i*73%420); ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(x,y,2,2); }

    ships.forEach(s=>{ ctx.fillStyle=s.color; ctx.beginPath(); ctx.moveTo(s.x,s.y-14); ctx.lineTo(s.x-12,s.y+12); ctx.lineTo(s.x+12,s.y+12); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle='#f8fafc'; bullets.forEach(b=>ctx.fillRect(b.x-1.4,b.y-7,2.8,10));
    enemies.forEach(e=>{ ctx.fillStyle='#f97316'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill(); });

    ctx.fillStyle='#e2e8f0'; ctx.font='700 22px Inter'; ctx.fillText(`Score: ${score}`,14,28);
    if(!running){ ctx.font='700 30px Inter'; ctx.fillText('Game Over – Neu drücken',250,210); }
  }

  return { init, restart };
})();
