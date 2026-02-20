const PixelRacer = (() => {
  let canvas, ctx, raf, running=false, score=0;
  let car, obs; const keys={}; let _bound=false;
  function init(){ canvas=document.getElementById('racer-canvas'); if(!canvas) return; ctx=canvas.getContext('2d'); if(!_bound){window.addEventListener('keydown',e=>keys[e.code]=true);window.addEventListener('keyup',e=>keys[e.code]=false);_bound=true;} restart(); }
  function restart(){ car={x:410,y:360}; obs=[]; score=0; running=true; cancelAnimationFrame(raf); tick(); }
  function tick(){ update(); render(); if(running) raf=requestAnimationFrame(tick); }
  function update(){ score++; if(keys.KeyA) car.x-=5; if(keys.KeyD) car.x+=5; car.x=Math.max(30,Math.min(790,car.x)); if(Math.random()<0.06) obs.push({x:30+Math.random()*760,y:-20,s:20+Math.random()*20,vy:3+Math.random()*3}); obs.forEach(o=>o.y+=o.vy); obs=obs.filter(o=>o.y<460); for(const o of obs){ if(Math.abs(car.x-o.x)<(o.s/2+12)&&Math.abs((car.y-8)-o.y)<(o.s/2+16)) running=false; } }
  function render(){ ctx.fillStyle='#111827'; ctx.fillRect(0,0,820,420); ctx.fillStyle='#374151'; ctx.fillRect(260,0,300,420); ctx.fillStyle='#f8fafc'; for(let y=0;y<420;y+=30) ctx.fillRect(408,y,4,18); ctx.fillStyle='#22d3ee'; ctx.fillRect(car.x-12,car.y-20,24,40); obs.forEach(o=>{ctx.fillStyle='#ef4444';ctx.fillRect(o.x-o.s/2,o.y-o.s/2,o.s,o.s)}); ctx.fillStyle='#e5e7eb'; ctx.font='700 22px Inter'; ctx.fillText('Score: '+Math.floor(score/10),20,30); }
  return { init, restart };
})();
