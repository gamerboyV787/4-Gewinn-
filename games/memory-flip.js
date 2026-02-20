const MemoryFlip = (() => {
  let board, first=null, lock=false, pairs=0;
  function init(){ board=document.getElementById('memory-board'); if(!board) return; restart(); }
  function restart(){ const vals=[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8].sort(()=>Math.random()-.5); pairs=0; first=null; lock=false; board.innerHTML=''; vals.forEach(v=>{ const b=document.createElement('button'); b.className='mem-card'; b.dataset.v=v; b.textContent='?'; b.onclick=()=>flip(b); board.appendChild(b); }); }
  function flip(btn){ if(lock||btn.classList.contains('open')||btn.classList.contains('done')) return; btn.classList.add('open'); btn.textContent=btn.dataset.v; if(!first){ first=btn; return; } if(first.dataset.v===btn.dataset.v){ first.classList.add('done'); btn.classList.add('done'); first=null; pairs++; if(pairs===8) setTimeout(()=>alert('Alle Paare gefunden!'),50); } else { lock=true; const a=first,b=btn; first=null; setTimeout(()=>{a.classList.remove('open');b.classList.remove('open');a.textContent='?';b.textContent='?'; lock=false;},700); } }
  return { init, restart };
})();
