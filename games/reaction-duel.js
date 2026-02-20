const ReactionDuel = (() => {
  let canvas, ctx, raf, running=false;
  let state='wait', timer=0, winner='';
  const keys={}; let _bound=false;

  function init(){ canvas=document.getElementById('reaction-canvas'); if(!canvas) return; ctx=canvas.getContext('2d'); if(!_bound){window.addEventListener('keydown',e=>keys[e.code]=true);window.addEventListener('keyup',e=>keys[e.code]=false);_bound=true;} restart(); }
  function restart(){ state='wait'; timer=60+Math.random()*180; winner=''; running=true; cancelAnimationFrame(raf); tick(); }
  function tick(){ update(); render(); if(running) raf=requestAnimationFrame(tick); }
  function update(){
    if(state==='wait'){ timer--; if(timer<=0) state='go'; }
    const p1=keys.KeyF, p2=keys.Enter||keys.Slash;
    if(state==='wait'&&(p1||p2)){ winner=p1&&p2?'Beide zu früh!':(p1?'P1 zu früh!':'P2 zu früh!'); state='end'; }
    if(state==='go'&&(p1||p2)){ winner=p1&&p2?'Gleichstand!':(p1?'P1 gewinnt!':'P2 gewinnt!'); state='end'; }
  }
  function render(){
    ctx.fillStyle='#0f172a'; ctx.fillRect(0,0,820,420);
    ctx.fillStyle= state==='go' ? '#22c55e' : '#ef4444'; ctx.fillRect(280,90,260,180);
    ctx.fillStyle='#e2e8f0'; ctx.font='700 40px Inter'; ctx.fillText(state==='go'?'JETZT!':'WARTEN',300,195);
    ctx.font='700 28px Inter'; if(state==='end') ctx.fillText(winner,280,300);
    ctx.font='500 18px Inter'; ctx.fillText('P1: F  |  P2: Enter oder /',260,350);
  }
  return { init, restart };
})();
