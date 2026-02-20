const BrickBlast = (() => {
  let canvas, ctx, raf, running=false;
  let paddle, ball, bricks;
  const keys={}; let _bound=false;
  function init(){ canvas=document.getElementById('brick-canvas'); if(!canvas) return; ctx=canvas.getContext('2d'); if(!_bound){window.addEventListener('keydown',e=>keys[e.code]=true);window.addEventListener('keyup',e=>keys[e.code]=false);_bound=true;} restart(); }
  function restart(){ paddle={x:360}; ball={x:410,y:300,vx:4,vy:-4}; bricks=[]; for(let r=0;r<5;r++) for(let c=0;c<10;c++) bricks.push({x:40+c*74,y:40+r*26,w:64,h:18,alive:true}); running=true; cancelAnimationFrame(raf); tick(); }
  function tick(){ update(); render(); if(running) raf=requestAnimationFrame(tick); }
  function update(){ if(keys.KeyA) paddle.x-=6; if(keys.KeyD) paddle.x+=6; paddle.x=Math.max(0,Math.min(740,paddle.x)); ball.x+=ball.vx; ball.y+=ball.vy; if(ball.x<8||ball.x>812) ball.vx*=-1; if(ball.y<8) ball.vy*=-1; if(ball.y>420) running=false; if(ball.y>372&&ball.x>paddle.x&&ball.x<paddle.x+80) ball.vy=-Math.abs(ball.vy); bricks.forEach(b=>{ if(!b.alive) return; if(ball.x>b.x&&ball.x<b.x+b.w&&ball.y>b.y&&ball.y<b.y+b.h){ b.alive=false; ball.vy*=-1; } }); }
  function render(){ ctx.fillStyle='#0b1020'; ctx.fillRect(0,0,820,420); ctx.fillStyle='#60a5fa'; ctx.fillRect(paddle.x,380,80,10); ctx.fillStyle='#f8fafc'; ctx.beginPath(); ctx.arc(ball.x,ball.y,7,0,Math.PI*2); ctx.fill(); bricks.forEach(b=>{ if(!b.alive) return; ctx.fillStyle='#f97316'; ctx.fillRect(b.x,b.y,b.w,b.h);}); }
  return { init, restart };
})();
