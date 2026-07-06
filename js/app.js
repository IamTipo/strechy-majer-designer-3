const TILE_W=700,TILE_H=420,MIN_SLOPE=17,SEP_MAX=25,MIN_CUT=120,CONS=3.4;
const colors={komin:'#c75b36',okno:'#0871b9',vikyr:'#8d55ad',prostup:'#4f9655'};
let state={project:'Demo projekt',baseShift:0,selectedRow:null,hoverRow:null,selectedTile:null,hoverTile:null,tileClickLock:0,selectedObstacle:null,hoverObstacle:null,editing:null,obstacles:[{id:1,name:'Komín',type:'komin',x:3300,y:5200,w:1200,h:800},{id:2,name:'Střešní okno',type:'okno',x:7800,y:5200,w:780,h:1180},{id:3,name:'Vikýř',type:'vikyr',x:5200,y:1500,w:2400,h:1500},{id:4,name:'Odvětrání',type:'prostup',x:9500,y:3000,w:300,h:300}],rows:[],cuts:[]};
function N(id){return document.getElementById(id)} function val(id){return +N(id).value||0}
['roofW','roofH','slope'].forEach(id=>setTimeout(()=>N(id).addEventListener('input',recalc),0));
let resizeTimer=null;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>renderSvg(),120)});
function mm(n){return Math.round(n)+' mm'} function fmt(n){return n.toLocaleString('cs-CZ')}
function getParams(){return {W:val('roofW'),H:val('roofH'),slope:val('slope')}}
function rectsOverlap(a,b){return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y}
function findObstacleOverlap(candidate,ignoreIndex=null){for(let i=0;i<state.obstacles.length;i++){if(i===ignoreIndex)continue;let other=state.obstacles[i];if(rectsOverlap(candidate,other))return {index:i,obstacle:other};}return null}
function getOverlapPairs(){let pairs=[];for(let i=0;i<state.obstacles.length;i++){for(let j=i+1;j<state.obstacles.length;j++){if(rectsOverlap(state.obstacles[i],state.obstacles[j]))pairs.push([i,j]);}}return pairs}
function rowOffset(r){return (state.baseShift + (r%2===0?350:0))%TILE_W}
function rowTiles(W,r){let off=rowOffset(r), arr=[]; let first=Math.floor((-off)/TILE_W)-2; let last=Math.ceil((W-off)/TILE_W)+2; for(let k=first;k<=last;k++){let x=off+k*TILE_W; let a=Math.max(0,x), b=Math.min(W,x+TILE_W); if(b>a) arr.push({x,a,b,w:b-a,full:(b-a)>TILE_W-1})} return arr}
function analyzeRows(){let {W,H}=getParams(); let rows=Math.ceil(H/TILE_H); let out=[],cuts=[]; for(let r=1;r<=rows;r++){let tiles=rowTiles(W,r); let full=tiles.filter(t=>t.full).length; let left=tiles[0]?.w||0, right=tiles[tiles.length-1]?.w||0; let y0=(r-1)*TILE_H,y1=Math.min(H,r*TILE_H); let note=(r%2===0?'1/2 na začátku':'Celá taška'); if(left<MIN_CUT||right<MIN_CUT) note+=' – úzký kraj'; for(const o of state.obstacles){if(o.y<y1 && o.y+o.h>y0){let lt=tiles.find(t=>t.a<=o.x && t.b>o.x), rt=tiles.find(t=>t.a<o.x+o.w && t.b>=o.x+o.w); let lc=lt?o.x-lt.a:0, rc=rt?rt.b-(o.x+o.w):0; let ok=lc>=MIN_CUT&&rc>=MIN_CUT; cuts.push({row:r,obs:o.name,left:lc,right:rc,ok}); if(!ok) note+=' – řešit lemování/posun';}}
 out.push({row:r,measureOkap:Math.min(H,r*TILE_H),measureHreben:Math.max(0,H-Math.min(H,r*TILE_H)),offset:rowOffset(r),tiles,full,left,right,note,bad:left<MIN_CUT||right<MIN_CUT})} state.rows=out; state.cuts=cuts;}
function scoreShift(shift){let old=state.baseShift; state.baseShift=shift; analyzeRows(); let score=0; for(const row of state.rows){if(row.left<MIN_CUT)score+=10000+(MIN_CUT-row.left)*10;if(row.right<MIN_CUT)score+=10000+(MIN_CUT-row.right)*10; score+=Math.abs(row.left-row.right)/20} for(const c of state.cuts){if(!c.ok)score+=5000+(Math.max(0,MIN_CUT-c.left)+Math.max(0,MIN_CUT-c.right))*20} state.baseShift=old; return score}
function flashActionButton(doneText){
 const button=document.activeElement;
 if(!button || button.tagName!=='BUTTON') return;
 const original=button.dataset.originalLabel || button.textContent;
 button.dataset.originalLabel=original;
 button.textContent=doneText;
 button.disabled=true;
 window.setTimeout(()=>{
  button.textContent=original;
  button.disabled=false;
 },1100);
}
function optimize(){let best=0,b=1e99,tested=0; for(let s=0;s<TILE_W;s+=10){let sc=scoreShift(s);tested++; if(sc<b){b=sc;best=s}} state.baseShift=best; N('optInfo').innerHTML='Optimalizace posunu: <b>AKTIVNÍ</b><br>Testováno variant: '+tested+'<br>Vybraný posun: '+mm(best); recalc(); flashActionButton('✓ Optimalizováno');}
function recalc(){let p=getParams(); let slope=N('slopeStatus'); if(p.slope<MIN_SLOPE){slope.className='status bad';slope.textContent='Nevyhovuje – min. sklon PREFA R.16 je 17°';}else{slope.className='status';slope.textContent='Vyhovuje (min. 17°)';} let sep=N('sepStatus'); if(p.slope>=MIN_SLOPE&&p.slope<=SEP_MAX){sep.className='status warn';sep.textContent='Povinná při sklonu 17–25° dle pokynů PREFA';}else if(p.slope<MIN_SLOPE){sep.className='status bad';sep.textContent='Nejdříve ověřit vhodnost krytiny pro daný sklon';}else{sep.className='status';sep.textContent='Běžný rozsah – ověřte dle skladby střechy';}
 analyzeRows(); validateSelectedTile(); validateSelectedObstacle(); renderObstacles(); renderTables(); renderSvg(); updateTileInfo(); updateObstacleInfo(); let area=p.W*p.H/1e6; let tiles=Math.ceil(area*CONS); let obsArea=state.obstacles.reduce((a,o)=>a+o.w*o.h/1e6,0); N('areaSum').textContent=area.toLocaleString('cs-CZ',{maximumFractionDigits:2})+' m²'; N('tileSum').textContent=fmt(tiles)+' ks'; N('wasteSum').textContent=obsArea.toLocaleString('cs-CZ',{maximumFractionDigits:2})+' m²'; N('obsSum').textContent=state.obstacles.length; let min=999999; state.cuts.forEach(c=>{min=Math.min(min,c.left,c.right)}); let overlaps=getOverlapPairs(); if(overlaps.length){N('cutControl').className='warnbox';N('cutControl').innerHTML='<b>Kontrola detailů: překryv.</b><br>Detaily se nesmí navzájem překrývat. Upravte polohu nebo rozměr označených detailů.'}else if(min<MIN_CUT){N('cutControl').className='warnbox';N('cutControl').innerHTML='<b>Pozor na úzké dořezy.</b><br>Min. dořez: '+mm(min)+'. Zvažte širší lemování překážky nebo optimalizaci posunu.'}else{N('cutControl').className='okbox';N('cutControl').innerHTML='<b>Min. dořez vyhovuje (≥ '+MIN_CUT+' mm).</b><br>Min. dořez: '+(min<999999?mm(min):'bez překážek')}
 let activeButton=document.activeElement;
 if(activeButton && activeButton.tagName==='BUTTON' && /přepočítat plán/i.test(activeButton.textContent)){
  flashActionButton('✓ Přepočítáno');
 }
}
function sx(x,scale,ox){return ox+x*scale} function sy(y,scale,oy,H){return oy+(H-y)*scale}

function getTileAt(rowNo,tileIndex){
 const row=state.rows.find(r=>r.row===Number(rowNo));
 if(!row || !row.tiles || !row.tiles[tileIndex-1]) return null;
 const t=row.tiles[tileIndex-1];
 return {row:row.row,index:tileIndex,x:t.a,y:(row.row-1)*TILE_H,w:t.w,h:Math.min(TILE_H,getParams().H-(row.row-1)*TILE_H),offset:row.offset,full:t.full,a:t.a,b:t.b};
}
function getDetailCutsForTile(tile){
 if(!tile) return [];
 const rowTop=tile.y, rowBottom=tile.y+tile.h;
 const eps=0.001;
 const out=[];
 state.obstacles.forEach((o,idx)=>{
  const obsTop=o.y, obsBottom=o.y+o.h;
  const rowHit=o.y < rowBottom && o.y + o.h > rowTop;
  const xHit=o.x < tile.x + tile.w && o.x + o.w > tile.x;
  if(!rowHit || !xHit) return;
  const cuts=[];
  // Levý díl tašky mezi levým okrajem tašky a levým okrajem detailu.
  // Počítáme jen skutečný díl, ne plných 700 mm.
  if(o.x > tile.x + eps && o.x < tile.x + tile.w - eps){
   cuts.push({side:'Levý díl',width:Math.max(0,o.x-tile.x)});
  }
  // Pravý díl tašky mezi pravým okrajem detailu a pravým okrajem tašky.
  if(o.x + o.w > tile.x + eps && o.x + o.w < tile.x + tile.w - eps){
   cuts.push({side:'Pravý díl',width:Math.max(0,(tile.x+tile.w)-(o.x+o.w))});
  }
  // Pokud detail překryje jen část již krajní seříznuté tašky nebo leží na hraně modulu,
  // doplníme viditelný zbytek, aby informační buňka nikdy neukazovala plnou šířku 700 mm.
  if(!cuts.length){
   const visibleLeft=Math.max(0, Math.min(tile.x+tile.w,o.x)-tile.x);
   const visibleRight=Math.max(0, (tile.x+tile.w)-Math.max(tile.x,o.x+o.w));
   if(visibleLeft>eps) cuts.push({side:'Levý díl',width:visibleLeft});
   if(visibleRight>eps) cuts.push({side:'Pravý díl',width:visibleRight});
  }
  if(cuts.length) out.push({obstacle:o,index:idx,cuts});
 });
 return out;
}
function validateSelectedTile(){
 if(!state.selectedTile) return;
 const t=getTileAt(state.selectedTile.row,state.selectedTile.index);
 if(!t) state.selectedTile=null;
}

function validateSelectedObstacle(){
 if(state.selectedObstacle==null) return;
 if(!state.obstacles[state.selectedObstacle]) state.selectedObstacle=null;
}
function selectObstacle(i){
 state.selectedObstacle=Number(i);
 updateObstacleInfo(state.selectedObstacle,'Vybraný detail');
 renderSvg();
}
function hoverObstacle(i){
 state.hoverObstacle=i==null?null:Number(i);
 if(state.hoverObstacle!=null){
  updateObstacleInfo(state.hoverObstacle,'Detail pod kurzorem');
 }else{
  updateObstacleInfo();
 }
 renderSvg();
}
function updateObstacleInfo(index=null,label='Kontrola detailu'){
 const box=N('obstacleInfo'); if(!box) return;
 const idx = index!=null ? Number(index) : state.selectedObstacle;
 if(idx==null || !state.obstacles[idx]){box.innerHTML='<b>Kontrola detailu</b><span>Najeďte nebo klikněte na překážku v grafickém návrhu.</span>'; return;}
 const o=state.obstacles[idx];
 const p=getParams();
 const typeName={komin:'Komín',okno:'Střešní okno',vikyr:'Vikýř',prostup:'Prostup'}[o.type]||'Detail';
 box.innerHTML='<b>'+label+'</b><div class="big">'+o.name+'</div><div class="grid"><span>Detail</span><strong>'+typeName+'</strong><span>Rozměr Š × V</span><strong>'+mm(o.w)+' × '+mm(o.h)+'</strong><span>Šířka</span><strong>'+mm(o.w)+'</strong><span>Výška</span><strong>'+mm(o.h)+'</strong><span>Kóta od okapu</span><strong>'+mm(o.y)+'</strong><span>Kóta od levého štítu</span><strong>'+mm(o.x)+'</strong><span>Od hřebene</span><strong>'+mm(Math.max(0,p.H-o.y-o.h))+'</strong><span>Od pravého štítu</span><strong>'+mm(Math.max(0,p.W-o.x-o.w))+'</strong></div>';
}

function setSelectedTile(row,index){
 const t=getTileAt(row,index);
 if(!t) return false;
 state.selectedTile={row:t.row,index:t.index};
 state.selectedRow=t.row;
 state.hoverTile=null;
 state.tileClickLock=Date.now();
 return true;
}
function selectTile(row,index){
 if(!setSelectedTile(row,index)) return;
 // Nejdřív zapišeme informační buňku, aby byla odezva okamžitá.
 updateTileInfo();
 renderTables();
 renderSvg();
 updateTileInfo();
 updateRowVisualState();
 // Pojistka proti následnému kliknutí celé řady / překreslení SVG.
 requestAnimationFrame(()=>{ setSelectedTile(row,index); updateTileInfo(); updateRowVisualState(); });
 setTimeout(()=>{ setSelectedTile(row,index); updateTileInfo(); updateRowVisualState(); },60);
}

function hoverTile(row,index){
 if(row==null || index==null){state.hoverTile=null; renderSvg(); return;}
 const t=getTileAt(row,index);
 state.hoverTile=t?{row:t.row,index:t.index}:null;
 renderSvg();
}
function updateTileInfo(){
 const box=N('tileInfo'); if(!box) return;
 const sel=state.selectedTile;
 if(!sel){box.innerHTML='<b>Kontrola tašky</b><span>Klikněte na tašku v grafickém návrhu.</span>'; return;}
 const t=getTileAt(sel.row,sel.index);
 if(!t){state.selectedTile=null; box.innerHTML='<b>Kontrola tašky</b><span>Klikněte na tašku v grafickém návrhu.</span>'; return;}
 const p=getParams();
 const yOkap=Math.min(p.H,t.row*TILE_H);
 const yHreben=Math.max(0,p.H-yOkap);
 const xRight=Math.max(0,p.W-t.x-t.w);
 const detailCuts=getDetailCutsForTile(t);
 let cutHtml='';
 if(detailCuts.length){
  const lines=[];
  detailCuts.forEach(dc=>{
   dc.cuts.forEach(c=>lines.push(dc.obstacle.name+': '+c.side+' '+mm(c.width)));
  });
  cutHtml='<span>Dořez u detailu</span><strong>'+lines.join('<br>')+'</strong>';
 }else{
  cutHtml='<span>Šířka dílu</span><strong>'+mm(t.w)+'</strong>';
 }
 box.innerHTML='<b>Kontrola tašky</b><div class="big">R'+String(t.row).padStart(2,'0')+' / S'+String(t.index).padStart(2,'0')+'</div><div class="grid"><span>Kóta od okapu</span><strong>'+mm(yOkap)+'</strong><span>Kóta od levého štítu</span><strong>'+mm(t.x)+'</strong><span>Kóta od hřebene</span><strong>'+mm(yHreben)+'</strong><span>Od pravého štítu</span><strong>'+mm(xRight)+'</strong>'+cutHtml+'<span>Výška řady</span><strong>'+mm(t.h)+'</strong></div>';
}

function renderSvg(){let svg=N('planSvg'),p=getParams(); let W=p.W,H=p.H;
 // Stabilní adaptivní pracovní plocha: velikost SVG držíme podle dostupného prostoru,
 // nikoliv podle poměru střechy. Osy X/Y se škálují samostatně,
 // aby grafický návrh maximálně vyplnil pracovní plochu bez smrštění do výšky.
 const wrap=svg.closest('.canvasWrap');
 const showDims=N('showDims').checked;
 const wrapW=Math.max(920, Math.floor((wrap?.clientWidth||1320)-56));
 const targetH=Math.round((window.innerHeight||900)*0.68);
 let vw=wrapW;
 let vh=Math.max(660, Math.min(940, targetH));
 let marginL=showDims?112:52, marginR=showDims?178:58, marginT=70, marginB=showDims?190:104;
 // Dole jsou tři samostatné pásy: OKAP, kóty sloupců a interaktivní čísla řad.
 // Vyšší spodní okraj zabrání přepisování textů pod grafickým návrhem.
 if(showDims && Math.ceil(H/TILE_H)>18){ marginR=190; marginB=166; }
 svg.setAttribute('viewBox',`0 0 ${vw} ${vh}`);
 svg.setAttribute('width',vw);
 svg.setAttribute('height',vh);
 svg.style.aspectRatio=`${vw} / ${vh}`;
 let scaleX=(vw-marginL-marginR)/W;
 let scaleY=(vh-marginT-marginB)/H;
 // Uživatel požaduje maximální využití prostoru i bez zachování proporcionality.
 // Proto se osa X a Y škálují samostatně: šířka i výška vždy vyplní pracovní oblast.
 if(!isFinite(scaleX)||scaleX<=0) scaleX=0.05;
 if(!isFinite(scaleY)||scaleY<=0) scaleY=0.05;
 let rw=W*scaleX,rh=H*scaleY, ox=marginL, oy=marginT; let s=[]; s.push(`<defs><filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity=".25"/></filter><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 L8 0" stroke="#000" stroke-opacity=".25"/></pattern><pattern id="edgeCutHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="#b91c1c" stroke-width="3"/></pattern><pattern id="detailCutHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="#d97706" stroke-width="3"/></pattern></defs>`); s.push(`<rect x="0" y="0" width="${vw}" height="${vh}" fill="#ffffff"/>`);
 // roof base
 s.push(`<rect x="${ox}" y="${oy}" width="${rw}" height="${rh}" fill="#e1e5e9" stroke="#30363d" stroke-width="2.2" filter="url(#shadow)"/>`);
 s.push(`<text x="${ox+rw/2}" y="${oy-14}" text-anchor="middle" font-size="17" font-weight="800">HŘEBEN</text><text x="${ox+rw/2}" y="${oy+rh+30}" text-anchor="middle" font-size="17" font-weight="800">OKAP</text>`);
 s.push(`<g opacity=".92"><rect x="${ox-158}" y="${oy+rh/2-28}" width="42" height="56" rx="10" fill="#ffffff" stroke="#d6dee8"/><text x="${ox-137}" y="${oy+rh/2+5}" transform="rotate(-90 ${ox-137} ${oy+rh/2+5})" text-anchor="middle" font-size="13" font-weight="900" fill="#64748b">ŠTÍT</text></g>`);
 // tiles rows – kliknutí = trvalý modrý výběr, najetí = dočasné zelené zvýraznění
 for(const row of state.rows){
  let yTop=sy(Math.min(H,row.row*TILE_H),scaleY,oy,H), yBot=sy((row.row-1)*TILE_H,scaleY,oy,H);
  s.push(`<g class="roof-row ${row.row===state.selectedRow?'selected':''} ${row.row===state.hoverRow?'hover':''}" data-row="${row.row}" onclick="if(!(event.target&&event.target.closest&&event.target.closest('[data-tile-row]'))) selectRow(${row.row})" onmouseenter="hoverRow(${row.row})" onmouseleave="hoverRow(null)" style="cursor:pointer">`);
  row.tiles.forEach((t,idx)=>{
   let x=sx(t.a,scaleX,ox), w=(t.b-t.a)*scaleX, h=yBot-yTop;
   let tileNo=idx+1;
   let selTile=state.selectedTile&&state.selectedTile.row===row.row&&state.selectedTile.index===tileNo;
   let roofCut=(!t.full)||(Math.min(TILE_H,H-(row.row-1)*TILE_H)<TILE_H);
   s.push(`<rect x="${x}" y="${yTop}" width="${w}" height="${h}" fill="${t.full?'var(--tile2)':'#f4c6c6'}" stroke="${selTile?'#005bbb':'#77808a'}" stroke-width="${selTile?3:0.8}" opacity=".96" data-tile-row="${row.row}" data-tile-index="${tileNo}" onpointerdown="selectTile(${row.row},${tileNo});event.preventDefault();event.stopPropagation();" onclick="selectTile(${row.row},${tileNo});event.stopPropagation();" onmouseenter="hoverTile(${row.row},${tileNo})" onmouseleave="hoverTile(null,null)" style="cursor:pointer"></rect>`);
   if(roofCut){
    s.push(`<rect x="${x}" y="${yTop}" width="${w}" height="${h}" fill="url(#edgeCutHatch)" opacity=".42" stroke="#b91c1c" stroke-width="1.6" pointer-events="none"/>`);
   }
  });
  s.push(`<rect class="row-hover-overlay" data-row-hover="${row.row}" x="${ox}" y="${yTop}" width="${rw}" height="${yBot-yTop}" fill="#16a34a" opacity=".16" stroke="#16a34a" stroke-width="3" pointer-events="none" display="${row.row===state.hoverRow?'block':'none'}"/>`);
  s.push(`</g>`);
  if(row.row%2===0){let x=sx(row.offset,scaleX,ox); s.push(`<line x1="${x}" x2="${x}" y1="${oy}" y2="${oy+rh}" stroke="#d58b30" stroke-dasharray="8 7" stroke-width="1.3"/>`)}
 }
 // trvalé modré označení vybrané řady
 if(state.selectedRow){
  let r=state.rows.find(x=>x.row===state.selectedRow);
  if(r){let yTop=sy(Math.min(H,r.row*TILE_H),scaleY,oy,H), yBot=sy((r.row-1)*TILE_H,scaleY,oy,H); s.push(`<rect x="${ox}" y="${yTop}" width="${rw}" height="${yBot-yTop}" fill="#0871b9" opacity=".10" pointer-events="none"/><rect x="${ox}" y="${yTop}" width="${rw}" height="${yBot-yTop}" fill="none" stroke="#0871b9" stroke-width="4" pointer-events="none"/>`)}
 }
 // vybraná / najetá taška – pouze zvýraznění v grafice, hodnoty jsou v samostatném boxu
 if(state.selectedTile){
  const t=getTileAt(state.selectedTile.row,state.selectedTile.index);
  if(t){
   const x=sx(t.x,scaleX,ox), y=sy(t.y+t.h,scaleY,oy,H), w=t.w*scaleX, h=t.h*scaleY;
   s.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0871b9" opacity=".18" stroke="#005bbb" stroke-width="3.5" pointer-events="none"/>`);
  }
 }
 if(state.hoverTile){
  const ht=getTileAt(state.hoverTile.row,state.hoverTile.index);
  if(ht){
   const hx=sx(ht.x,scaleX,ox), hy=sy(ht.y+ht.h,scaleY,oy,H), hw=ht.w*scaleX, hh=ht.h*scaleY;
   s.push(`<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" fill="#16a34a" opacity=".14" stroke="#16a34a" stroke-width="3" pointer-events="none"/>`);
   // Číslo tašky počítané od levého štítu – zobrazuje se pouze při najetí myší.
   const label=String(ht.index);
   const lw=Math.max(24,label.length*8+14);
   const lx=hx+hw/2;
   const ly=(hw>=28 && hh>=24) ? hy+hh/2 : Math.max(oy+12,hy-13);
   s.push(`<g class="tile-hover-number" pointer-events="none">`);
   s.push(`<rect x="${lx-lw/2}" y="${ly-12}" width="${lw}" height="24" rx="12" fill="#ffffff" stroke="#16a34a" stroke-width="2.2" filter="url(#shadow)"/>`);
   s.push(`<text x="${lx}" y="${ly+4}" text-anchor="middle" font-size="13" font-weight="900" fill="#166534">${label}</text>`);
   s.push(`</g>`);
  }
 }
 // spodní popisy grafiky – oddělené pásy, aby se texty nepřepisovaly
 const bottomOkapY=oy+rh+30;
 const bottomTickY=oy+rh+56;
 const bottomAxisY=oy+rh+110;
 const bottomRowsY=oy+rh+(showDims?144:58);
 // row numbers bottom
 for(let i=0;i<state.rows.length;i++){let r=i+1, x=(ox + (rw*(i+0.5)/Math.max(1,state.rows.length))); if(x<ox+rw+20){let active=r===state.selectedRow, hov=r===state.hoverRow; let fill=hov?'#e9f8ef':(active?'#0871b9':'#fff'); let stroke=hov?'#16a34a':(active?'#0871b9':'#8190a3'); let color=hov?'#166534':(active?'#fff':'#243447'); s.push(`<g class="row-number ${active?'selected':''} ${hov?'hover':''}" data-row="${r}" onclick="selectRow(${r})" onmouseenter="hoverRow(${r})" onmouseleave="hoverRow(null)" style="cursor:pointer"><circle cx="${x}" cy="${bottomRowsY}" r="12" fill="${fill}" stroke="${stroke}" stroke-width="${active||hov?2:1}"/><text x="${x}" y="${bottomRowsY+4}" text-anchor="middle" font-size="11" font-weight="800" fill="${color}">${r}</text></g>`);}}
 // dimensions roof
 if(N('showDims').checked){dimH(s,ox,oy-40,ox+rw,oy-40,fmt(W),true); dimV(s,ox-64,oy,ox-64,oy+rh,fmt(H),true); const tilePx=TILE_W*scaleX; const colStep=Math.max(3,Math.ceil(82/Math.max(1,tilePx))); for(let x=0;x<=W;x+=TILE_W){let xx=sx(x,scaleX,ox); let col=Math.round(x/TILE_W); let showLabel=(col>0 && (col%colStep===0 || x+TILE_W>W)); s.push(`<line x1="${xx}" x2="${xx}" y1="${oy+rh}" y2="${oy+rh+18}" stroke="#d58b30"/>`); if(showLabel){s.push(`<rect x="${xx-24}" y="${bottomTickY-14}" width="48" height="18" rx="9" fill="#fff" stroke="#e2e8f0"/><text x="${xx}" y="${bottomTickY}" text-anchor="middle" font-size="10" font-weight="800" fill="#64748b">${Math.round(x)}</text>`)} } s.push(`<text x="${ox+rw/2}" y="${bottomAxisY}" text-anchor="middle" font-size="11" font-weight="900" fill="#64748b">Kóta od levého štítu (mm)</text>`); renderTileMeasureLabels(s,scaleX,ox,oy,rw,rh,bottomTickY,bottomAxisY); renderRowMeasureLabels(s,scaleY,ox,oy,rw,rh,H)}
 // obstacles and dims
 let overlapSet=new Set(getOverlapPairs().flat());
 state.obstacles.forEach((o,oi)=>{
  let x=sx(o.x,scaleX,ox), y=sy(o.y+o.h,scaleY,oy,H), w=o.w*scaleX,h=o.h*scaleY;
  let selected=state.selectedObstacle===oi, hovered=state.hoverObstacle===oi;
  let baseColor=overlapSet.has(oi)?'#ed1c24':(colors[o.type]||'#555');
  let c=hovered?'#16a34a':(selected?'#0871b9':baseColor);
  let sw=hovered?6:(selected?6:5);
  s.push(`<g class="obstacle-shape ${selected?'selected':''} ${hovered?'hover':''}" data-obstacle="${oi}" onpointerdown="selectObstacle(${oi});event.stopPropagation();" onclick="selectObstacle(${oi});event.stopPropagation();" onmouseenter="hoverObstacle(${oi})" onmouseleave="hoverObstacle(null)" style="cursor:pointer">`);
  if(o.type==='vikyr'){
    let cx=x+w/2;
    s.push(`<path d="M${x-120*scaleX},${y+h} L${cx},${y-900*scaleY} L${x+w+120*scaleX},${y+h} Z" fill="#ffffff66" stroke="${c}" stroke-width="${sw}"/>`)
  }
  s.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.type==='komin'?'url(#hatch)':'#eaf4fb'}" stroke="${c}" stroke-width="${sw}"/>`);
  if(o.type==='prostup') s.push(`<circle cx="${x+w/2}" cy="${y+h/2}" r="${Math.max(w,h)/2}" fill="#b6dfbf" stroke="${c}" stroke-width="${sw}"/>`);
  s.push(`<text x="${x+w/2}" y="${y+h/2+5}" text-anchor="middle" font-size="13" font-weight="800" fill="#111" pointer-events="none">${o.name}</text>`);
  if(overlapSet.has(oi)) s.push(`<text x="${x+w/2}" y="${y-10}" text-anchor="middle" font-size="12" font-weight="900" fill="#ed1c24" pointer-events="none">PŘEKRYV</text>`);
  s.push(`</g>`);
  if(N('showDims').checked){
    // U detailů necháváme pouze dvě základní kontrolní kóty:
    // od levého štítu a od okapní hrany. Ostatní hodnoty jsou v informační buňce vpravo.
    dimH(s,ox,y+h/2,x,y+h/2,fmt(o.x),selected||hovered);
    dimV(s,x+w/2,y+h, x+w/2, oy+rh, fmt(o.y),selected||hovered);
  }
});
 // Řezané tašky u překážek – oranžové šrafování a obrys se kreslí až nad detail,
 // aby byly jasně viditelné i přes komín, okno, vikýř nebo prostup.
 state.rows.forEach(row=>{
  const tileY=(row.row-1)*TILE_H;
  const tileH=Math.min(TILE_H,H-tileY);
  row.tiles.forEach(t=>{
   const hit=state.obstacles.some(o=>o.x<t.b&&o.x+o.w>t.a&&o.y<tileY+tileH&&o.y+o.h>tileY);
   if(!hit)return;
   const x=sx(t.a,scaleX,ox), y=sy(tileY+tileH,scaleY,oy,H), w=(t.b-t.a)*scaleX, h=tileH*scaleY;
   s.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#detailCutHatch)" opacity=".38" stroke="#d97706" stroke-width="2.6" stroke-dasharray="7 4" pointer-events="none"/>`);
  });
 });
 svg.innerHTML=s.join('');}


function renderTileMeasureLabels(s,scaleX,ox,oy,rw,rh,bottomTickY,bottomAxisY){
 const items=[];
 if(state.selectedTile){const t=getTileAt(state.selectedTile.row,state.selectedTile.index); if(t) items.push({t,kind:'selected'});}
 if(state.hoverTile){const ht=getTileAt(state.hoverTile.row,state.hoverTile.index); if(ht && !items.some(i=>i.t.row===ht.row && i.t.index===ht.index)) items.push({t:ht,kind:'hover'});}
 items.forEach((it,idx)=>{
  const t=it.t;
  const x=ox+t.x*scaleX;
  const yBase=oy+rh;
  const selected=it.kind==='selected';
  const stroke=selected?'#0871b9':'#16a34a';
  const fill=selected?'#0871b9':'#e9f8ef';
  const color=selected?'#ffffff':'#166534';
  const yLabel=bottomTickY+(idx*26);
  const label=mm(t.x);
  const w=Math.max(72,String(label).length*7.2+22);
  s.push(`<g class="tile-measure ${selected?'selected':'hover'}" pointer-events="none">`);
  s.push(`<line x1="${x}" y1="${yBase}" x2="${x}" y2="${yLabel-14}" stroke="${stroke}" stroke-width="${selected?3:2}" stroke-dasharray="${selected?'':'4 4'}"/>`);
  s.push(`<circle cx="${x}" cy="${yBase}" r="${selected?5:4}" fill="${stroke}"/>`);
  s.push(`<rect x="${x-w/2}" y="${yLabel-14}" width="${w}" height="22" rx="11" fill="${fill}" stroke="${stroke}" stroke-width="${selected?2:1.7}"/>`);
  s.push(`<text x="${x}" y="${yLabel+1}" text-anchor="middle" font-size="11" font-weight="900" fill="${color}">${label}</text>`);
  s.push(`</g>`);
 });
}

function renderRowMeasureLabels(s,scaleY,ox,oy,rw,rh,H){
 const guideX=ox+rw+22;
 const labelX=ox+rw+102;
 const rowPx=TILE_H*scaleY;
 // Pokud je řad hodně nebo je střecha nízká v pixelech, popisky řad automaticky proředíme.
 // Vybraná a právě najetá řada se ale zobrazí vždy.
 const minLabelGap=30;
 const step=Math.max(1, Math.ceil(minLabelGap/Math.max(1,rowPx)));
 s.push(`<g class="row-measure-column" opacity=".98">`);
 s.push(`<line x1="${guideX}" y1="${oy}" x2="${guideX}" y2="${oy+rh}" stroke="#d8e0ea" stroke-width="1" stroke-dasharray="3 6"/>`);
 state.rows.forEach(row=>{
  const y=sy(row.measureOkap,scaleY,oy,H);
  if(y<oy-2 || y>oy+rh+2)return;
  const hov=row.row===state.hoverRow, sel=row.row===state.selectedRow;
  const force=hov||sel||row.row===1||row.row===state.rows.length;
  if(!force && ((row.row-1)%step!==0)){
    s.push(`<line x1="${ox+rw}" y1="${y}" x2="${guideX}" y2="${y}" stroke="#e5ebf2" stroke-width="1" opacity=".55"/>`);
    return;
  }
  const stroke=hov?'#16a34a':(sel?'#0871b9':'#cbd5e1');
  const fill=hov?'#e9f8ef':(sel?'#0871b9':'#ffffff');
  const color=hov?'#166534':(sel?'#ffffff':'#475569');
  const sw=hov||sel?2.2:1.3;
  const r=hov||sel?5:3;
  s.push(`<line x1="${ox+rw}" y1="${y}" x2="${guideX}" y2="${y}" stroke="${stroke}" stroke-width="${sw}"/>`);
  s.push(`<circle cx="${guideX}" cy="${y}" r="${r}" fill="${stroke}"/>`);
  s.push(`<g class="row-measure ${sel?'selected':''} ${hov?'hover':''}" data-row="${row.row}" onclick="selectRow(${row.row})" onmouseenter="hoverRow(${row.row})" onmouseleave="hoverRow(null)" style="cursor:pointer">`);
  s.push(`<rect x="${labelX-48}" y="${y-12}" width="96" height="24" rx="12" fill="${fill}" stroke="${stroke}"/>`);
  s.push(`<text x="${labelX}" y="${y+4}" text-anchor="middle" font-size="11" font-weight="900" fill="${color}">${Math.round(row.measureOkap)} mm</text>`);
  s.push(`</g>`);
 });
 s.push(`</g>`);
}
function dimLabel(s,x,y,text,vertical=false,accent=false){
 const w=Math.max(46,String(text).length*7.2+18), h=20;
 const fill=accent?'#fff5f5':'#ffffff', stroke=accent?'#ed1c24':'#c9d4e0', col=accent?'#d3151c':'#334155';
 if(vertical){s.push(`<g transform="translate(${x} ${y}) rotate(-90)"><rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}"/><text x="0" y="4" text-anchor="middle" font-size="12" font-weight="800" fill="${col}">${text}</text></g>`)}
 else{s.push(`<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="12" font-weight="800" fill="${col}">${text}</text>`)}
}
function dimH(s,x1,y1,x2,y2,text,accent=false){
 const mid=(x1+x2)/2; s.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="6" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${accent?'#ed1c24':'#64748b'}" stroke-width="1.4" stroke-linecap="round"/>`);
 s.push(`<path d="M${x1} ${y1} l10 -5 v10 z" fill="${accent?'#ed1c24':'#64748b'}"/><path d="M${x2} ${y2} l-10 -5 v10 z" fill="${accent?'#ed1c24':'#64748b'}"/>`);
 dimLabel(s,mid,y1,text,false,accent)
}
function dimV(s,x1,y1,x2,y2,text,accent=false){
 const mid=(y1+y2)/2; s.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="6" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${accent?'#ed1c24':'#64748b'}" stroke-width="1.4" stroke-linecap="round"/>`);
 s.push(`<path d="M${x1} ${y1} l-5 10 h10 z" fill="${accent?'#ed1c24':'#64748b'}"/><path d="M${x2} ${y2} l-5 -10 h10 z" fill="${accent?'#ed1c24':'#64748b'}"/>`);
 dimLabel(s,x1,mid,text,true,accent)
}
function renderTables(){
 if(N('tabRows'))N('tabRows').textContent=state.selectedRow?'ŘADY – řada '+state.selectedRow:'ŘADY';
 if(N('tabCuts'))N('tabCuts').textContent=state.selectedRow?'DOŘEZY U DETAILŮ – řada '+state.selectedRow:'DOŘEZY U DETAILŮ';
 let tb=N('rowTbody');tb.innerHTML='';
 state.rows.forEach(r=>{
  let tr=document.createElement('tr');
  tr.dataset.row=r.row;
  if(r.row===state.selectedRow)tr.classList.add('sel');
  if(r.row===state.hoverRow)tr.classList.add('hoverRow');
  if(r.bad)tr.classList.add('badCut');
  tr.onclick=()=>selectRow(r.row);
  tr.onmouseenter=()=>hoverRow(r.row);
  tr.onmouseleave=()=>hoverRow(null);
  tr.title='Kliknutím zvýrazníte řadu '+r.row+' v grafickém návrhu';
  tr.innerHTML=`<td>${r.row}</td><td><b>${mm(r.measureOkap)}</b></td><td>${mm(r.measureHreben)}</td><td>${mm(r.offset)}</td><td>${r.full}</td><td>${mm(r.left)}</td><td>${mm(r.right)}</td>`;
  tb.appendChild(tr)
 });
 let cb=N('cutTbody');cb.innerHTML='';
 state.cuts.forEach(c=>{
  let tr=document.createElement('tr');
  tr.dataset.row=c.row;
  if(c.row===state.selectedRow)tr.classList.add('sel');
  if(c.row===state.hoverRow)tr.classList.add('hoverRow');
  if(!c.ok)tr.classList.add('badCut');
  tr.onclick=()=>selectRow(c.row);
  tr.onmouseenter=()=>hoverRow(c.row);
  tr.onmouseleave=()=>hoverRow(null);
  tr.title='Kliknutím zvýrazníte řadu '+c.row+' v grafickém návrhu';
  tr.innerHTML=`<td>${c.row}</td><td>${c.obs}</td><td><b>${mm(c.left)}</b></td><td><b>${mm(c.right)}</b></td><td>${c.ok?'OK':'Lemování / posun'}</td>`;
  cb.appendChild(tr)
 })
}
function updateRowVisualState(){
 document.querySelectorAll('.roof-row,.row-number,.row-measure,#rowTbody tr,#cutTbody tr').forEach(el=>{
  const r=Number(el.dataset.row);
  el.classList.toggle('selected', r===state.selectedRow);
  el.classList.toggle('sel', r===state.selectedRow && el.tagName.toLowerCase()==='tr');
  el.classList.toggle('hover', r===state.hoverRow);
  el.classList.toggle('hoverRow', r===state.hoverRow && el.tagName.toLowerCase()==='tr');
 });
}
function hoverRow(r){
 const next=r==null?null:Number(r);
 if(state.hoverRow===next)return;
 state.hoverRow=next;
 document.querySelectorAll('[data-row-hover]').forEach(el=>{
  el.setAttribute('display',Number(el.dataset.rowHover)===next?'block':'none');
 });
 updateRowVisualState();
}
function selectRow(r,clearTile=true){
 const rowNo=Number(r);
 // Po kliknutí na tašku může v některých prohlížečích ještě doběhnout click celé řady.
 // Krátký zámek zabrání tomu, aby řada hned zrušila vybranou tašku a vyprázdnila info buňku.
 if(state.tileClickLock && Date.now()-state.tileClickLock<2000 && state.selectedTile && state.selectedTile.row===rowNo) clearTile=false;
 state.selectedRow=rowNo;
 if(clearTile) state.selectedTile=null;
 state.hoverTile=null;
 renderTables();
 renderSvg();
 updateTileInfo();
 updateRowVisualState();
 const activePanel=N('cutsPanel').style.display==='none' ? '#rowTbody' : '#cutTbody';
 let tr=document.querySelector(activePanel+' tr.sel') || document.querySelector('#rowTbody tr.sel, #cutTbody tr.sel');
 if(tr) tr.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function setTab(t){N('rowsPanel').style.display=t==='rows'?'block':'none';N('cutsPanel').style.display=t==='cuts'?'block':'none';N('tabRows').classList.toggle('active',t==='rows');N('tabCuts').classList.toggle('active',t==='cuts')}
function renderObstacles(){let el=N('obstacleList');el.innerHTML=''; let overlapSet=new Set(getOverlapPairs().flat()); state.obstacles.forEach((o,i)=>{let d=document.createElement('div');d.className='obsItem'+(overlapSet.has(i)?' overlap':'');d.innerHTML=`<span class="swatch" style="background:${colors[o.type]}"></span><div><b>${o.name}</b><span>${o.w} × ${o.h} mm &nbsp; X:${o.x} Y:${o.y}</span></div><button class="small" onclick="editObstacle(${i})">✎</button><button class="small danger" onclick="delObstacle(${i})">×</button>`;el.appendChild(d)})}
function showHelp(){N('helpModal').classList.add('show')}
function hideHelp(){N('helpModal').classList.remove('show')}
function clearObstacleInteraction(){
 state.editing=null;
 state.selectedRow=null;
 state.hoverRow=null;
 state.selectedTile=null;
 state.hoverTile=null;
 state.tileClickLock=0;
 state.selectedObstacle=null;
 state.hoverObstacle=null;
}
function showObstacle(i=null){
 state.editing=i==null?null:Number(i);
 state.hoverRow=null;
 state.hoverTile=null;
 document.querySelectorAll('[data-row-hover]').forEach(el=>el.setAttribute('display','none'));
 updateRowVisualState();
 let o=state.editing==null?{name:'Komín',type:'komin',x:1000,y:1000,w:800,h:800}:state.obstacles[state.editing];
 if(!o){clearObstacleInteraction();return;}
 N('obsName').value=o.name;
 N('obsType').value=o.type;
 N('obsX').value=o.x;
 N('obsY').value=o.y;
 N('obsW').value=o.w;
 N('obsH').value=o.h;
 N('modal').classList.add('show');
}
function hideObstacle(){
 N('modal').classList.remove('show');
 clearObstacleInteraction();
 recalc();
}
function editObstacle(i){showObstacle(Number(i))}
function delObstacle(i){
 const index=Number(i);
 if(!Number.isInteger(index)||index<0||index>=state.obstacles.length)return;
 state.obstacles.splice(index,1);
 clearObstacleInteraction();
 recalc();
}
function saveObstacle(){
 const editIndex=state.editing;
 let o={
  id:Number.isInteger(editIndex)&&state.obstacles[editIndex]?state.obstacles[editIndex].id:Date.now(),
  name:N('obsName').value.trim()||'Překážka',
  type:N('obsType').value,
  x:val('obsX'),
  y:val('obsY'),
  w:val('obsW'),
  h:val('obsH')
 };
 if(o.w<=0||o.h<=0){alert('Detail musí mít kladnou šířku i výšku.');return;}
 let p=getParams();
 if(o.x<0||o.y<0||o.x+o.w>p.W||o.y+o.h>p.H){alert('Detail musí být celý uvnitř střešní roviny.');return;}
 let overlap=findObstacleOverlap(o,Number.isInteger(editIndex)?editIndex:null);
 if(overlap){alert('Detail se překrývá s položkou „'+overlap.obstacle.name+'“. Upravte polohu nebo rozměr – detaily se nesmí navzájem překrývat.');return;}
 if(Number.isInteger(editIndex)&&editIndex>=0&&editIndex<state.obstacles.length)state.obstacles[editIndex]=o;
 else state.obstacles.push(o);
 N('modal').classList.remove('show');
 clearObstacleInteraction();
 recalc();
}
function newProject(){if(confirm('Smazat aktuální projekt?')){state.baseShift=0;state.selectedRow=null;state.hoverRow=null;state.selectedTile=null;state.hoverTile=null;state.selectedObstacle=null;state.hoverObstacle=null;state.obstacles=[];recalc()}}
function saveProject(){let data={params:getParams(),baseShift:state.baseShift,obstacles:state.obstacles,project:state.project}; let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='strechy-majer-prefa-r16.smr16';a.click()}
function openProject(){N('fileOpen').click()} N('fileOpen').addEventListener('change',e=>{let f=e.target.files[0]; if(!f)return; let r=new FileReader(); r.onload=()=>{let d=JSON.parse(r.result); N('roofW').value=d.params.W;N('roofH').value=d.params.H;N('slope').value=d.params.slope;state.baseShift=d.baseShift||0;state.obstacles=d.obstacles||[];state.selectedObstacle=null;state.hoverTile=null;state.hoverObstacle=null;state.project=d.project||'Projekt';recalc()}; r.readAsText(f)});

// Záložní delegované ovládání SVG: zajišťuje aktualizaci informační buňky i v prohlížečích,
// kde inline SVG onclick nemusí spolehlivě probublat přes překážku.
function closestSvgData(target,selector){
 if(!target) return null;
 if(target.closest) return target.closest(selector);
 let n=target;
 while(n && n!==N('planSvg')){ if(n.matches && n.matches(selector)) return n; n=n.parentNode; }
 return null;
}
function handlePlanPick(e){
 const obs=closestSvgData(e.target,'[data-obstacle]');
 if(obs){ selectObstacle(Number(obs.dataset.obstacle)); e.preventDefault(); e.stopPropagation(); return true; }
 const tile=closestSvgData(e.target,'[data-tile-row]');
 if(tile){ selectTile(Number(tile.dataset.tileRow),Number(tile.dataset.tileIndex)); e.preventDefault(); e.stopPropagation(); return true; }
 const row=closestSvgData(e.target,'[data-row]');
 if(row){ selectRow(Number(row.dataset.row)); e.preventDefault(); e.stopPropagation(); return true; }
 return false;
}
N('planSvg').addEventListener('pointerdown',handlePlanPick,true);
N('planSvg').addEventListener('click',handlePlanPick,true);
function exportCsv(){let csv='Rada;Kota od okapu;Kota od hrebene;Odsazeni;Kusu;Levy kraj;Pravy kraj\n'+state.rows.map(r=>[r.row,Math.round(r.measureOkap),Math.round(r.measureHreben),Math.round(r.offset),r.full,Math.round(r.left),Math.round(r.right)].join(';')).join('\n'); let blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='rozpis_rad_prefa_r16.csv';a.click()}
function printPdf(){window.print()}

/* ZPĚTNÁ VAZBA TLAČÍTEK
   Zvýraznění se spouští už při stisku myši/prstu (pointerdown),
   tedy ještě před vlastním synchronním přepočtem. */
(function bindGreenClickFeedback(){
  const GREEN_STYLE={
    'background-color':'#16a34a',
    'border-color':'#15803d',
    'color':'#ffffff',
    'box-shadow':'0 0 0 3px rgba(22,163,74,.30)',
    'transition':'background-color .10s ease, border-color .10s ease, color .10s ease, box-shadow .10s ease'
  };

  function isActionButton(button){
    if(!button) return false;
    const handler=button.getAttribute('onclick') || '';
    return handler.includes('optimize()') || handler.includes('recalc()');
  }

  function flashGreen(button){
    if(!button || !isActionButton(button)) return;

    if(button._greenFlashTimer){
      window.clearTimeout(button._greenFlashTimer);
    }

    if(!button._greenOriginalStyle){
      button._greenOriginalStyle={};
      Object.keys(GREEN_STYLE).forEach(property=>{
        button._greenOriginalStyle[property]={
          value:button.style.getPropertyValue(property),
          priority:button.style.getPropertyPriority(property)
        };
      });
    }

    Object.entries(GREEN_STYLE).forEach(([property,value])=>{
      button.style.setProperty(property,value,'important');
    });

    button._greenFlashTimer=window.setTimeout(()=>{
      const original=button._greenOriginalStyle || {};

      Object.keys(GREEN_STYLE).forEach(property=>{
        const item=original[property];
        if(item && item.value){
          button.style.setProperty(property,item.value,item.priority || '');
        }else{
          button.style.removeProperty(property);
        }
      });

      button._greenOriginalStyle=null;
      button._greenFlashTimer=null;
    },1000);
  }

  /* Capture fáze + pointerdown = prohlížeč má možnost stav vykreslit
     ještě před následným clickem a přepočtem. */
  document.addEventListener('pointerdown',function(e){
    const button=e.target && e.target.closest ? e.target.closest('button') : null;
    flashGreen(button);
  },true);

  /* Záloha pro ovládání klávesnicí. */
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter' && e.key!==' ') return;
    const button=document.activeElement;
    flashGreen(button);
  },true);
})();

optimize(); recalc();
