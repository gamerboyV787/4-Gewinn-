/* =====================================================
   SCHACH – vollständige Implementierung + Multiplayer
   Host = Weiß, Gast = Schwarz
   ===================================================== */
const Chess = (() => {
  const INIT = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R'],
  ];
  const SYM = {
    'K':'♔','Q':'♕','R':'♖','B':'♗','N':'♘','P':'♙',
    'k':'♚','q':'♛','r':'♜','b':'♝','n':'♞','p':'♟',
  };

  let board, player, selected, validMoves, epTarget, castleRights;
  let gameOver, scores, captured, promoPending, _mp, _myColor;

  let boardEl, msgEl, turnLbl, wScoreEl, bScoreEl, wCapEl, bCapEl, promoEl;

  /* ── Helfer ───────────────────────────────────────── */
  const isW   = p => p && p === p.toUpperCase();
  const isB   = p => p && p !== p.toUpperCase();
  const ally  = (p, pl) => pl === 'white' ? isW(p) : isB(p);
  const inBnd = (r,c) => r>=0&&r<8&&c>=0&&c<8;

  /* ── Init ─────────────────────────────────────────── */
  function init(mpConfig = null) {
    _mp      = mpConfig;
    _myColor = !_mp ? null : (_mp.role === 'host' ? 'white' : 'black');

    boardEl  = document.getElementById('chess-board');
    msgEl    = document.getElementById('chess-message');
    turnLbl  = document.getElementById('chess-turn-label');
    wScoreEl = document.getElementById('chess-score-w');
    bScoreEl = document.getElementById('chess-score-b');
    wCapEl   = document.getElementById('chess-cap-w');
    bCapEl   = document.getElementById('chess-cap-b');
    promoEl  = document.getElementById('chess-promotion');

    if (_mp) _mp.setHandler(receiveOpponentMove);

    scores = [0, 0];
    renderScores();
    newGame();
  }

  function newGame() {
    board        = INIT.map(r => [...r]);
    player       = 'white';
    selected     = null;
    validMoves   = [];
    epTarget     = null;
    castleRights = { white:{k:true,q:true}, black:{k:true,q:true} };
    gameOver     = false;
    captured     = { white:[], black:[] };
    promoPending = null;
    msgEl.classList.add('hidden');
    promoEl.classList.add('hidden');
    render();
    updateStatus(false);
  }

  function restart() { scores=[0,0]; renderScores(); newGame(); }

  /* ── Zug-Generierung ─────────────────────────────── */
  function pseudoMoves(r, c, b, ep, cr) {
    const p  = b[r][c]; if (!p) return [];
    const pl = isW(p) ? 'white' : 'black';
    const d  = pl==='white' ? -1 : 1;
    const mvs = [];

    const push = (tr,tc,sp) => {
      if (inBnd(tr,tc) && !ally(b[tr][tc],pl)) mvs.push({r:tr,c:tc,sp});
    };
    const slide = (dr,dc) => {
      for (let i=1;i<8;i++) {
        const tr=r+dr*i, tc=c+dc*i;
        if (!inBnd(tr,tc)) break;
        if (ally(b[tr][tc],pl)) break;
        mvs.push({r:tr,c:tc});
        if (b[tr][tc]) break;
      }
    };
    const t = p.toLowerCase();

    if (t==='p') {
      if (inBnd(r+d,c) && !b[r+d][c]) {
        mvs.push({r:r+d,c});
        const sr = pl==='white'?6:1;
        if (r===sr && !b[r+2*d][c]) mvs.push({r:r+2*d,c,sp:'dp'});
      }
      for (const dc of [-1,1]) {
        const tr=r+d, tc=c+dc;
        if (!inBnd(tr,tc)) continue;
        if (b[tr][tc] && !ally(b[tr][tc],pl)) mvs.push({r:tr,c:tc});
        if (ep && tr===ep.r && tc===ep.c) mvs.push({r:tr,c:tc,sp:'ep'});
      }
    }
    if (t==='n') {
      for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        push(r+dr,c+dc);
    }
    if (t==='b'||t==='q') { slide(1,1);slide(1,-1);slide(-1,1);slide(-1,-1); }
    if (t==='r'||t==='q') { slide(1,0);slide(-1,0);slide(0,1);slide(0,-1); }
    if (t==='k') {
      for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        push(r+dr,c+dc);
      if (cr) {
        const row=pl==='white'?7:0, K=pl==='white'?'K':'k', R=pl==='white'?'R':'r';
        if (r===row&&c===4&&b[r][c]===K) {
          if (cr[pl].k&&!b[row][5]&&!b[row][6]&&b[row][7]===R) mvs.push({r:row,c:6,sp:'ck'});
          if (cr[pl].q&&!b[row][3]&&!b[row][2]&&!b[row][1]&&b[row][0]===R) mvs.push({r:row,c:2,sp:'cq'});
        }
      }
    }
    return mvs;
  }

  function applyMv(b, from, to) {
    const nb=b.map(r=>[...r]);
    const p=nb[from.r][from.c];
    const pl=isW(p)?'white':'black';
    nb[to.r][to.c]=p; nb[from.r][from.c]='';
    if (to.sp==='ep') { const cr=pl==='white'?to.r+1:to.r-1; nb[cr][to.c]=''; }
    if (to.sp==='ck') { const row=pl==='white'?7:0; nb[row][5]=nb[row][7];nb[row][7]=''; }
    if (to.sp==='cq') { const row=pl==='white'?7:0; nb[row][3]=nb[row][0];nb[row][0]=''; }
    if (p==='P'&&to.r===0) nb[to.r][to.c]='Q';
    if (p==='p'&&to.r===7) nb[to.r][to.c]='q';
    return nb;
  }

  function findKing(pl, b) {
    const K=pl==='white'?'K':'k';
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (b[r][c]===K) return {r,c};
    return null;
  }

  function inCheck(pl, b, ep) {
    const kp=findKing(pl,b); if (!kp) return true;
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
      const p=b[r][c]; if (!p) continue;
      if (isW(p)===(pl==='white')) continue;
      if (pseudoMoves(r,c,b,ep,null).some(m=>m.r===kp.r&&m.c===kp.c)) return true;
    }
    return false;
  }

  function legalMoves(r, c) {
    const p=board[r][c]; if (!p) return [];
    const pl=isW(p)?'white':'black';
    if (pl!==player) return [];
    return pseudoMoves(r,c,board,epTarget,castleRights).filter(mv => {
      if (mv.sp==='ck') {
        if (inCheck(player,board,epTarget)) return false;
        const row=player==='white'?7:0;
        if (inCheck(player,applyMv(board,{r,c},{r:row,c:5}),null)) return false;
      }
      if (mv.sp==='cq') {
        if (inCheck(player,board,epTarget)) return false;
        const row=player==='white'?7:0;
        if (inCheck(player,applyMv(board,{r,c},{r:row,c:3}),null)) return false;
      }
      return !inCheck(player,applyMv(board,{r,c},mv),null);
    });
  }

  function allLegal(pl) {
    const ms=[];
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
      if (!board[r][c]) continue;
      if ((pl==='white')!==isW(board[r][c])) continue;
      legalMoves(r,c).forEach(m=>ms.push({from:{r,c},to:m}));
    }
    return ms;
  }

  /* ── Zug ausführen ────────────────────────────────── */
  function executeMove(from, to, fromOpponent=false) {
    const p  = board[from.r][from.c];
    const pl = isW(p)?'white':'black';

    if (board[to.r][to.c]) captured[pl].push(board[to.r][to.c]);
    if (to.sp==='ep') { const cr=pl==='white'?to.r+1:to.r-1; captured[pl].push(board[cr][to.c]); }

    epTarget = to.sp==='dp' ? {r:pl==='white'?to.r+1:to.r-1,c:to.c} : null;

    if (p==='K') { castleRights.white.k=false; castleRights.white.q=false; }
    if (p==='k') { castleRights.black.k=false; castleRights.black.q=false; }
    if (p==='R') { if(from.r===7&&from.c===7) castleRights.white.k=false; if(from.r===7&&from.c===0) castleRights.white.q=false; }
    if (p==='r') { if(from.r===0&&from.c===7) castleRights.black.k=false; if(from.r===0&&from.c===0) castleRights.black.q=false; }
    const cap=board[to.r][to.c];
    if (cap==='R') { if(to.r===7&&to.c===7) castleRights.white.k=false; if(to.r===7&&to.c===0) castleRights.white.q=false; }
    if (cap==='r') { if(to.r===0&&to.c===7) castleRights.black.k=false; if(to.r===0&&to.c===0) castleRights.black.q=false; }

    board = applyMv(board, from, to);

    if (!fromOpponent && _mp) _mp.send({ type:'chess:move', from, to });

    if ((p==='P'&&to.r===0)||(p==='p'&&to.r===7)) {
      promoPending = {r:to.r,c:to.c,pl,fromOpponent};
      render();
      if (!fromOpponent) showPromotion(pl);
      // Opponent's promotion: wait for chess:promote message
      return;
    }
    afterMove();
  }

  function promoteWith(piece, fromOpponent=false) {
    if (!promoPending) return;
    const {r,c,pl} = promoPending;
    board[r][c] = pl==='white' ? piece.toUpperCase() : piece.toLowerCase();
    promoPending = null;
    promoEl.classList.add('hidden');
    if (!fromOpponent && _mp) _mp.send({ type:'chess:promote', piece });
    afterMove();
  }

  function afterMove() {
    player    = player==='white'?'black':'white';
    selected  = null; validMoves = [];
    render();
    const all=allLegal(player);
    const chk=inCheck(player,board,epTarget);
    if (all.length===0) {
      const winner=player==='white'?'black':'white';
      if (chk) { scores[winner==='white'?0:1]++; renderScores(); showMsg(`♟️ Schachmatt! ${winner==='white'?'Weiß':'Schwarz'} gewinnt!`,false); }
      else showMsg('🤝 Patt – Unentschieden!',true);
      gameOver=true;
    }
    updateStatus(chk);
  }

  function receiveOpponentMove(data) {
    if (data.type==='chess:move') {
      if (gameOver) return;
      handleClick(null,null,true); // clear selection
      executeMove(data.from, data.to, true);
    } else if (data.type==='chess:promote') {
      promoteWith(data.piece, true);
    }
  }

  /* ── Klick ────────────────────────────────────────── */
  function handleClick(r, c, clear=false) {
    if (gameOver || promoPending) return;
    if (clear) { selected=null; validMoves=[]; render(); return; }

    // Online: nur eigene Farbe
    if (_mp && player !== _myColor) { selected=null; validMoves=[]; render(); return; }

    if (selected && validMoves.some(m=>m.r===r&&m.c===c)) {
      const mv=validMoves.find(m=>m.r===r&&m.c===c);
      executeMove(selected,mv,false);
      return;
    }
    if (board[r][c] && ally(board[r][c],player)) {
      selected=  {r,c}; validMoves=legalMoves(r,c); render(); return;
    }
    selected=null; validMoves=[]; render();
  }

  /* ── Render ───────────────────────────────────────── */
  function render() {
    boardEl.innerHTML='';
    const vSet=new Set(validMoves.map(m=>`${m.r},${m.c}`));
    const chk=inCheck(player,board,epTarget);

    // Board-Orientierung: Gast sieht schwarze Seite unten
    const flipped = _mp && _mp.role === 'guest';

    for (let ri=0;ri<8;ri++) {
      for (let ci=0;ci<8;ci++) {
        const r = flipped ? 7-ri : ri;
        const c = flipped ? 7-ci : ci;
        const light=(r+c)%2===0;
        const sq=document.createElement('div');
        sq.className=`chess-sq ${light?'light':'dark'}`;
        if (selected&&selected.r===r&&selected.c===c) sq.classList.add('selected');
        if (vSet.has(`${r},${c}`)) { sq.classList.add('valid-move'); if (board[r][c]) sq.classList.add('capture-hint'); }
        if (!gameOver&&chk&&board[r][c]&&board[r][c].toLowerCase()==='k') {
          if ((isW(board[r][c])?'white':'black')===player) sq.classList.add('in-check');
        }
        if (c===0) { const l=document.createElement('span'); l.className='sq-label rank-lbl'; l.textContent=flipped?r+1:8-r; sq.appendChild(l); }
        if (r===(flipped?0:7)) { const l=document.createElement('span'); l.className='sq-label file-lbl'; l.textContent='abcdefgh'[c]; sq.appendChild(l); }
        if (board[r][c]) {
          const pc=document.createElement('div');
          pc.className=`chess-piece ${isW(board[r][c])?'w':'b'}`;
          pc.textContent=SYM[board[r][c]];
          sq.appendChild(pc);
        }
        if (vSet.has(`${r},${c}`)&&!board[r][c]) { const d=document.createElement('div'); d.className='move-dot'; sq.appendChild(d); }
        sq.addEventListener('click',()=>handleClick(r,c));
        boardEl.appendChild(sq);
      }
    }

    const sv=p=>({q:9,r:5,b:3,n:3,p:1}[p.toLowerCase()]||0);
    const sc=a=>[...a].sort((x,y)=>sv(y)-sv(x));
    wCapEl.textContent=sc(captured.white).map(p=>SYM[p]).join('');
    bCapEl.textContent=sc(captured.black).map(p=>SYM[p]).join('');
  }

  function updateStatus(chk) {
    const name=player==='white'?'Weiß':'Schwarz';
    let label;
    if (_mp) {
      const myTurn = player===_myColor;
      label = myTurn ? (chk?'⚠️ Du bist im Schach!':'Dein Zug!') : (chk?`${name} ist im Schach`:'Gegner ist dran…');
    } else {
      label = chk?`${name} – Schach! ⚠️`:`${name} ist dran`;
    }
    turnLbl.textContent=label;
    turnLbl.classList.toggle('in-check',chk&&!gameOver);
    document.getElementById('chess-p-white').classList.toggle('active',player==='white');
    document.getElementById('chess-p-black').classList.toggle('active',player==='black');
  }

  function renderScores() {
    if (wScoreEl) wScoreEl.textContent=scores[0];
    if (bScoreEl) bScoreEl.textContent=scores[1];
  }

  function showPromotion(pl) {
    promoEl.classList.remove('hidden');
    const pieces=['Q','R','B','N'], labels={Q:'Dame',R:'Turm',B:'Läufer',N:'Springer'};
    promoEl.innerHTML=`<div class="promo-title">Bauer umwandeln:</div>
      <div class="promo-choices">${pieces.map(p=>`
        <button class="promo-btn" onclick="Chess.promote('${p}')" title="${labels[p]}">
          ${SYM[pl==='white'?p:p.toLowerCase()]}
        </button>`).join('')}
      </div>`;
  }

  function showMsg(text, isDraw) {
    msgEl.classList.remove('hidden','draw');
    if (isDraw) msgEl.classList.add('draw');
    msgEl.innerHTML=`<div>${text}</div>
      <button onclick="Chess.newGame()">Neues Spiel</button>
      <button class="btn-secondary" onclick="Chess.restart()">Score zurücksetzen</button>`;
  }

  return { init, newGame, restart, promote: promoteWith, receiveOpponentMove };
})();
