const LineRunner = (() => {
  let canvas,ctx,raf,running=false,score=0;
  let p, obs; const keys={}; let _bound=false;
  function init(){ canvas=document.getElementById('runner-canvas'); if(!canvas) return; ctx=canvas.getContext('2d'); if(!_bound){window.addEventListener('keydown',e=>keys[e.code]=true);window.addEventListener('keyup',e=>keys[e.code]=false);_bound=true;} restart(); }
  function restart(){ p={x:120,y:340,vy:0}; obs=[]; score=0; running=true; cancelAnimationFrame(raf); tick(); }
  function tick(){ update(); render(); if(running) raf=requestAnimationFrame(tick); }
  function update(){ score++; if((keys.Space||keys.KeyW)&&p.y>=340) p.vy=-12; p.vy+=0.7; p.y+=p.vy; if(p.y>340){p.y=340;p.vy=0;} if(Math.random()<0.05) obs.push({x:840,w:18+Math.random()*24,h:20+Math.random()*35,vx:5+Math.random()*2}); obs.forEach(o=>o.x-=o.vx); obs=obs.filter(o=>o.x>-40); for(const o of obs){ if(p.x+20>o.x&&p.x-10<o.x+o.w&&p.y+8>380-o.h) running=false; } }
  function render(){ ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,820,420); ctx.strokeStyle='#22d3ee'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(p.x,p.y-28,10,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x,p.y-18); ctx.lineTo(p.x,p.y+2); ctx.moveTo(p.x,p.y-8); ctx.lineTo(p.x-12,p.y); ctx.moveTo(p.x,p.y-8); ctx.lineTo(p.x+12,p.y); ctx.moveTo(p.x,p.y+2); ctx.lineTo(p.x-10,p.y+18); ctx.moveTo(p.x,p.y+2); ctx.lineTo(p.x+10,p.y+18); ctx.stroke(); ctx.fillStyle='#1f2937'; ctx.fillRect(0,380,820,40); obs.forEach(o=>{ctx.fillStyle='#f97316';ctx.fillRect(o.x,380-o.h,o.w,o.h)}); ctx.fillStyle='#e5e7eb'; ctx.font='700 22px Inter'; ctx.fillText('Score: '+Math.floor(score/8),20,30); }
  return { init, restart };
})();
