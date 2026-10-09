(function(){
'use strict';

// Наборы вопросов: мақал-мәтелдер (бесконечный забег) и три уровня фразеологизмов
var SETS=[
 {name:'Мақал-мәтелдер',sub:PRV.length+' мақал • шексіз',items:PRV,endless:true,spd:13,key:'mm_best',
  miss:'Қателескен мақалдар:',c:['#7fc8ff','#3a8de0','#22609e'],best:0,stars:0},
 {name:'Жеңіл',sub:F1.length+' фразеологизм',items:F1,endless:false,spd:13,key:'mm_best_f1',
  miss:'Қателескен фразеологизмдер:',c:['#8be07a','#3fae4a','#2a7a32'],best:0,stars:0},
 {name:'Орташа',sub:F2.length+' фразеологизм',items:F2,endless:false,spd:16,key:'mm_best_f2',
  miss:'Қателескен фразеологизмдер:',c:['#ffd166','#ff9f1c','#c96a0a'],best:0,stars:0},
 {name:'Күрделі',sub:F3.length+' фразеологизм',items:F3,endless:false,spd:19,key:'mm_best_f3',
  miss:'Қателескен фразеологизмдер:',c:['#ff8a8a','#e0403a','#9e2420'],best:0,stars:0}
];

/* === 2. СОСТОЯНИЕ И ГЕОМЕТРИЯ ПЕРСПЕКТИВЫ === */
var cv=document.getElementById('c'),g=cv.getContext('2d');
var W=0,H=0,U=0,cx=0,hzY=0,baseY=0,rHalf=0,LW=0,vign=null,T=0;
var mn=Math.min,mx=Math.max,rnd=Math.random,sin=Math.sin,cos=Math.cos,abs=Math.abs,PI=Math.PI;
var DEPTH=10,SPAWN_Z=72,PLR_Z=2,SEG=6,BANDS=42,TAU=6.2832,JUMP=.8,DAYLEN=28;
var SPDUP=.3,SPDMAX=62;   // разгон в секунду и предел скорости (старт — в SETS)
var FONT='Nunito,system-ui,"Segoe UI",Arial,sans-serif';

// Всё изменяемое состояние; объекты не пересоздаются
var S={screen:'start',scrT:0,score:0,dScore:0,best:0,newBest:false,correct:0,lives:3,speed:24,dist:0,dayT:0,
 lane:1,laneF:1,runT:0,shake:0,fb:0,fbOk:false,order:[],oi:0,cur:null,curIdx:-1,mistakes:[],
 ch:0,combo:0,maxCombo:0,comboT:0,cd:0,jump:0,hurt:0,flashT:0,flashC:'255,255,255',hlT:0,dustT:0,
 px:0,py:0,ph:0,land:0,flip:false,starSnd:0,set:0,modeSel:0,asked:0,won:false,earned:0,nextSet:-1,
 coins:0,coinT:0,coinTotal:0,objD:0,deadT:0,help:false,helpT:0,map:0};

// Единственный объект ворот — переиспользуется для каждого вопроса
var gate={on:false,z:0,lane:-1,words:['','','']};

// Пул объектов на дороге: kind 0 — монета (тиын), 1 — камень, 2 — бревно
var ON=40,objs=[],ord=[],OBJ_GAP=17,COIN_GAP=2.4;
for(var i0=0;i0<ON;i0++)objs.push({on:false,z:0,lane:0,kind:0,done:false,p:0,sc:1});

// Кольцевой буфер придорожных объектов (дерево / юрта / куст / фонарь)
var DN=18,DSP=14,decs=[],ring=0,i;
for(i=0;i<DN;i++)decs.push({z:i*DSP,side:(i%2)?1:-1,kind:i%4,sc:.8+((i*37)%50)/100});
var clouds=[];for(i=0;i<5;i++)clouds.push({x:rnd(),y:.04+rnd()*.16,s:.7+rnd()*.6,v:.3+rnd()*.5});
var stars=[];for(i=0;i<70;i++)stars.push({x:rnd(),y:rnd(),s:.6+rnd()*1.4,p:rnd()*TAU});
var PK1=[],PK2=[];
for(i=0;i<10;i++){PK1.push([.55+rnd()*.45,.45+rnd()*.35]);PK2.push([.45+rnd()*.55,.4+rnd()*.4]);}
var SL=[];for(i=0;i<26;i++)SL.push({a:rnd()*TAU,o:rnd(),l:.06+rnd()*.12});

// Интерфейсные зоны нажатия (обновляются при отрисовке)
var R0=function(){return{x:0,y:0,w:0,h:0};};
var ui={btn:R0(),btn2:R0(),cards:[R0(),R0()],modes:[R0(),R0(),R0(),R0()],back:R0(),help:R0(),helpOk:R0(),maps:[R0(),R0()],hx:[0,0,0],hy:0};
var MAPS=['Дала','Түнгі Астана'];
var NAMES=['Батыр','Жүйрік қыз'],ROLES=['ою-өрнекті күртеше','ою-өрнекті күртеше'];

function pz(z){return 1/(1+z/DEPTH);}            // масштаб по расстоянию
function yAt(p){return hzY+(baseY-hzY)*p;}       // экранная Y по масштабу
function F(s,w){return w+' '+Math.round(s)+'px '+FONT;}
function fl(c){g.fillStyle=c;}
function sk(c,w){g.strokeStyle=c;if(w)g.lineWidth=w;}
function fr(x,y,w,h){g.fillRect(x,y,w,h);}
function dot(x,y,r){g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
function rr(x,y,w,h,r){if(r>w/2)r=w/2;if(r>h/2)r=h/2;g.beginPath();g.moveTo(x+r,y);
 g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function cl(v){return v<0?0:v>1?1:v;}
function eob(t){var c=1.70158;t-=1;return 1+(c+1)*t*t*t+c*t*t;}   // easeOutBack
function starPath(x,y,r,ir){g.beginPath();
 for(var k=0;k<10;k++){var q=(k&1)?ir:r,a=-PI/2+k*PI/5;g.lineTo(x+cos(a)*q,y+sin(a)*q);}g.closePath();}
function center(){g.textAlign='center';g.textBaseline='middle';}
// Уменьшает размер шрифта, если текст не влезает в maxW
function fit(text,fs,w,maxW){g.font=F(fs,w);var tw=g.measureText(text).width;return tw>maxW?fs*maxW/tw:fs;}

/* === 3. ПАЛИТРЫ СУТОК: день → закат → ночь → рассвет === */
var PAL=[
 {sT:'#2f8fdc',sM:'#86c9f0',sB:'#e6f6fb',sun:'#fff4b0',cl:'#ffffff',sn:'#ffffff',mF:'#a9bfdc',mN:'#7fa6c9',
  hF:'#93c79a',hN:'#6aae70',gA:'#8fcb68',gB:'#83bf5e',rA:'#d6cfbd',rB:'#cbc4b1',ed:'#fdfbf5',tD:'#3f8f44',tL:'#62b356'},
 {sT:'#3b4c9b',sM:'#f2875e',sB:'#ffd08a',sun:'#ffb25a',cl:'#ffd7c2',sn:'#ffd9c7',mF:'#9b7aa6',mN:'#7b6491',
  hF:'#8c9563',hN:'#5f7d4e',gA:'#89ad58',gB:'#7da150',rA:'#d5b99e',rB:'#c9ad93',ed:'#fff0dc',tD:'#3f6f38',tL:'#6b9a43'},
 {sT:'#070d2b',sM:'#1b2660',sB:'#36488a',sun:'#e8eeff',cl:'#3a4a80',sn:'#c5cdee',mF:'#27325f',mN:'#1d2850',
  hF:'#1f4250',hN:'#183642',gA:'#2c5a45',gB:'#27513e',rA:'#5a5f78',rB:'#52576f',ed:'#c9d2f0',tD:'#1d4434',tL:'#2b5a42'},
 {sT:'#5a8fd6',sM:'#f2b0c4',sB:'#ffe3c0',sun:'#ffd59a',cl:'#fff0f0',sn:'#fff1f4',mF:'#b4a3c9',mN:'#8c8fbf',
  hF:'#90b58e',hN:'#68996a',gA:'#8cc265',gB:'#7fb65b',rA:'#d8cbb9',rB:'#cdc0ad',ed:'#fffaf0',tD:'#3e8442',tL:'#61a956'}
];
var PKEYS=[],PALC=[],P={},PA={},PW=[1,0,0,0],k0;
for(k0 in PAL[0])PKEYS.push(k0);
for(i=0;i<PAL.length;i++){var o={};for(var j=0;j<PKEYS.length;j++){var h=PAL[i][PKEYS[j]];
 o[PKEYS[j]]=[parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)];}PALC.push(o);}
// Карта «Түнгі Астана»: всегда ночь, цвета взяты с картинки img/astana.jpg
var ASTP={sT:'#071443',sM:'#1f2a78',sB:'#5660b2',sun:'#e8eeff',cl:'#3a4a80',sn:'#c5cdee',mF:'#27325f',mN:'#1d2850',
 hF:'#1f4250',hN:'#183642',gA:'#21483a',gB:'#1d4134',rA:'#4e557c',rB:'#484e73',ed:'#b1beed',tD:'#14352a',tL:'#22503b'};
var ASTC={};for(k0 in ASTP){var hx0=ASTP[k0];ASTC[k0]=[parseInt(hx0.substr(1,2),16),parseInt(hx0.substr(3,2),16),parseInt(hx0.substr(5,2),16)];}
var AST=new Image();AST.src='img/astana.jpg';
function updPal(){
 if(S.map===1){PW[0]=PW[1]=PW[3]=0;PW[2]=1;      // фонари и звёзды — как ночью
  for(var n0=0;n0<PKEYS.length;n0++){var nm=PKEYS[n0],C=ASTC[nm],q0=PA[nm]||(PA[nm]=[0,0,0]);
   q0[0]=C[0];q0[1]=C[1];q0[2]=C[2];P[nm]='rgb('+C[0]+','+C[1]+','+C[2]+')';}
  return;}
 var c=(S.dayT/DAYLEN)%PAL.length,a=Math.floor(c),f=c-a,b=(a+1)%PAL.length;
 f=f<.7?0:(f-.7)/.3;f=f*f*(3-2*f);              // 70% времени палитра держится
 PW[0]=PW[1]=PW[2]=PW[3]=0;PW[a]=1-f;PW[b]+=f;
 for(var k=0;k<PKEYS.length;k++){var n=PKEYS[k],A=PALC[a][n],B=PALC[b][n],q=PA[n]||(PA[n]=[0,0,0]);
  q[0]=Math.round(A[0]+(B[0]-A[0])*f);q[1]=Math.round(A[1]+(B[1]-A[1])*f);q[2]=Math.round(A[2]+(B[2]-A[2])*f);
  P[n]='rgb('+q[0]+','+q[1]+','+q[2]+')';}
}
function rgba(n,a){var q=PA[n];return 'rgba('+q[0]+','+q[1]+','+q[2]+','+a.toFixed(3)+')';}

/* === 4. РАЗМЕРЫ ЭКРАНА (портрет и альбом) === */
function resize(){
 var dpr=mn(2,window.devicePixelRatio||1);
 W=window.innerWidth;H=window.innerHeight;
 cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
 g.setTransform(dpr,0,0,dpr,0,0);
 U=mn(W,H);cx=W/2;hzY=H*.34;baseY=H*1.06;
 rHalf=mn(W*.47,H*.62);LW=rHalf*2/3;
 vign=g.createRadialGradient(W/2,H*.5,U*.45,W/2,H*.5,mx(W,H)*.78);
 vign.addColorStop(0,'rgba(5,10,35,0)');vign.addColorStop(1,'rgba(5,10,35,.38)');
 banner.key='';overC.key='';
}
window.addEventListener('resize',resize);
window.addEventListener('orientationchange',function(){setTimeout(resize,120);});

/* === 5. ЗВУК: короткие тоны на осцилляторах === */
var actx=null,snd=true;
function ensureAudio(){ // контекст создаётся только после действия пользователя
 if(!actx){try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){actx=null;}}
 if(actx&&actx.state==='suspended'){try{actx.resume();}catch(e){}}
}
function tone(f1,f2,t0,dur,type,vol){
 if(!snd||!actx)return;
 var t=actx.currentTime+t0,o=actx.createOscillator(),ga=actx.createGain();
 o.type=type;o.frequency.setValueAtTime(f1,t);
 if(f2!==f1)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
 ga.gain.setValueAtTime(.0001,t);
 ga.gain.exponentialRampToValueAtTime(vol,t+.012);
 ga.gain.exponentialRampToValueAtTime(.0001,t+dur);
 o.connect(ga);ga.connect(actx.destination);o.start(t);o.stop(t+dur+.02);
}
function sfxOk(){tone(660,660,0,.1,'triangle',.22);tone(990,990,.09,.16,'triangle',.2);}
function sfxCombo(){tone(660,660,0,.09,'triangle',.2);tone(880,880,.08,.09,'triangle',.2);
 tone(1100,1100,.16,.09,'triangle',.2);tone(1320,1320,.24,.22,'triangle',.2);}
function sfxBad(){tone(200,90,0,.3,'sawtooth',.18);}
function sfxOver(){musicStop();playS('fail');}
function sfxWin(){musicStop();playS('win');           // победная мелодия вместо фона, затем радость героя
 var c=S.ch===0?'bcheer':'zcheer';setTimeout(function(){if(S.screen==='over')playS(c);},450);}
function sfxJump(){playS(S.ch===0?'bjump':'zjump');}
function sfxMove(){tone(420,640,0,.07,'sine',.08);}
function sfxTick(){tone(660,660,0,.1,'square',.08);}
function sfxGo(){tone(880,1320,0,.28,'triangle',.2);}
function sfxSelect(){tone(520,880,0,.13,'triangle',.16);}
function sfxStar(n){tone(880+n*220,880+n*220,0,.18,'triangle',.14);}
function sfxCoin(){playS('coin');}
function sfxHit(){playS('hit');}

/* --- Звуковые файлы (sound/): HTMLAudio работает и при открытии index.html с диска ---
   у каждого эффекта небольшой пул копий, чтобы частые звуки (монеты) накладывались */
var SFX={},MUS=null,MUS_FROM=15;                 // фоновая музыка стартует с 15-й секунды
function mkAudio(f,v){var a=new Audio('sound/'+f);a.preload='auto';a.volume=v;return a;}
function sfxFile(k,f,v,n){var p=[];for(var i=0;i<n;i++)p.push(mkAudio(f,v));SFX[k]={p:p,i:0};}
sfxFile('coin','coin.wav',.45,6);sfxFile('hit','hit.wav',.8,2);sfxFile('fail','fail.wav',.8,1);
sfxFile('win','victory.wav',.75,1);sfxFile('bjump','batyr_jump.wav',.9,2);sfxFile('zjump','zhuyrik_jump.wav',.9,2);
sfxFile('bcheer','batyr_cheer.mp3',.9,1);sfxFile('zcheer','zhuyrik_cheer.mp3',.9,1);
function aPlay(a){try{var pr=a.play();if(pr&&pr.catch)pr.catch(function(){});}catch(e){}}
function aSeek(a,t){try{a.currentTime=t;}catch(e){}}
function playS(k){
 var s=SFX[k];if(!snd||!s)return;
 var a=s.p[s.i];s.i=(s.i+1)%s.p.length;aSeek(a,0);aPlay(a);
}
function stopS(k){var s=SFX[k];if(s)for(var i=0;i<s.p.length;i++)s.p[i].pause();}
MUS=mkAudio('nauai.mp3',.35);
MUS.addEventListener('ended',function(){aSeek(MUS,MUS_FROM);if(snd&&S.screen==='play')aPlay(MUS);});   // по кругу — снова с 15-й
MUS.addEventListener('loadedmetadata',function(){if(MUS.currentTime<MUS_FROM&&MUS.dataset.seek)aSeek(MUS,MUS_FROM);});
function musicStart(){stopS('win');stopS('fail');MUS.dataset.seek='1';aSeek(MUS,MUS_FROM);if(snd)aPlay(MUS);}
function musicStop(){MUS.pause();}
function toggleSnd(){snd=!snd;saveSnd();
 if(!snd){musicStop();for(var k in SFX)stopS(k);}else if(S.screen==='play')aPlay(MUS);}
document.addEventListener('visibilitychange',function(){
 if(document.hidden)musicStop();else if(snd&&S.screen==='play')aPlay(MUS);});

/* === 6. ЧАСТИЦЫ И ВСПЛЫВАЮЩИЙ ТЕКСТ (пулы без аллокаций) === */
var PN=260,parts=[],pIdx=0;
for(i=0;i<PN;i++)parts.push({on:false,x:0,y:0,vx:0,vy:0,l:0,m:1,s:1,c:'#fff',t:0,r:0,vr:0,gr:0,gs:0});
var CONF=['#ff4f8b','#ffd84d','#4dc3ff','#7ad860','#ff8a3d','#b57bff'];
function spawn(x,y,vx,vy,life,size,col,type,grav,grow){
 var p=parts[pIdx];pIdx=(pIdx+1)%PN;
 p.on=true;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.l=p.m=life;p.s=size;p.c=col;p.t=type;
 p.gr=grav;p.gs=grow||0;p.r=rnd()*TAU;p.vr=(rnd()-.5)*12;
}
function burst(x,y,n,cols,spd,type,size,grav){
 for(var k=0;k<n;k++){var a=rnd()*TAU,v=spd*(.35+rnd()*.65);
  spawn(x,y,cos(a)*v,sin(a)*v-spd*.45,.7+rnd()*.6,size*(.6+rnd()*.7),cols[(rnd()*cols.length)|0],type,grav);}
}
function updParts(dt){
 for(var k=0;k<PN;k++){var p=parts[k];if(!p.on)continue;
  p.l-=dt;if(p.l<=0){p.on=false;continue;}
  p.vy+=p.gr*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.vr*dt;p.s+=p.gs*dt;
  p.vx*=1-dt*1.2;}
}
function drawParts(){
 for(var k=0;k<PN;k++){var p=parts[k];if(!p.on)continue;
  g.globalAlpha=cl(p.l/p.m*1.6);fl(p.c);
  if(p.t===0)dot(p.x,p.y,p.s);
  else if(p.t===1)starPath(p.x,p.y,p.s,p.s*.45),g.fill();
  else{g.save();g.translate(p.x,p.y);g.rotate(p.r);fr(-p.s,-p.s*.45,p.s*2,p.s*.9);g.restore();}
 }
 g.globalAlpha=1;
}
var FT=[];for(i=0;i<8;i++)FT.push({on:false,s:'',x:0,y:0,l:0,m:1,c:'#fff',fs:20});
var ftIdx=0;
function floatText(s,x,y,c,fs){var f=FT[ftIdx];ftIdx=(ftIdx+1)%FT.length;
 f.on=true;f.s=s;f.x=x;f.y=y;f.l=f.m=1.1;f.c=c;f.fs=fs;}
function updFloats(dt){for(var k=0;k<FT.length;k++)if(FT[k].on){FT[k].l-=dt;if(FT[k].l<=0)FT[k].on=false;}}
function drawFloats(){
 center();g.lineJoin='round';
 for(var k=0;k<FT.length;k++){var f=FT[k];if(!f.on)continue;
  var q=1-f.l/f.m,sc=eob(cl(q*4)),y=f.y-q*U*.13;
  g.globalAlpha=cl(f.l/f.m/.3);
  g.save();g.translate(f.x,y);g.scale(sc,sc);
  g.font=F(f.fs,900);sk('#14254d',f.fs*.2);g.strokeText(f.s,0,0);fl(f.c);g.fillText(f.s,0,0);
  g.restore();}
 g.globalAlpha=1;
}

/* === 7. ЛОГИКА ИГРЫ === */
function loadSave(){
 try{for(var i=0;i<SETS.length;i++){var st=SETS[i];
   st.best=parseInt(localStorage.getItem(st.key),10)||0;st.stars=parseInt(localStorage.getItem(st.key+'_s'),10)||0;}
  var s=localStorage.getItem('mm_snd');if(s!==null)snd=(s==='1');
  var mp=parseInt(localStorage.getItem('mm_map'),10);if(mp>=0&&mp<MAPS.length)S.map=mp;
  var c=localStorage.getItem('mm_hero');c=parseInt(c,10);if(c>=0&&c<NAMES.length)S.ch=c;
  S.coinTotal=parseInt(localStorage.getItem('mm_coins'),10)||0;
  if(!localStorage.getItem('mm_help'))S.help=true;}catch(e){}   // при первом запуске — сразу инструкция
}
function saveBest(){var st=SETS[S.set];
 try{localStorage.setItem(st.key,String(st.best));localStorage.setItem(st.key+'_s',String(st.stars));}catch(e){}}
function saveCoins(){try{localStorage.setItem('mm_coins',String(S.coinTotal));}catch(e){}}
function saveSnd(){try{localStorage.setItem('mm_snd',snd?'1':'0');}catch(e){}}
function saveChar(){try{localStorage.setItem('mm_hero',String(S.ch));}catch(e){}}
function selectMap(m){if(S.map===m)return;S.map=m;sfxSelect();try{localStorage.setItem('mm_map',String(m));}catch(e){}}

// Перемешивание (Фишер—Йетс): повторов нет, пока список не кончится
function shuffle(){
 var n=SETS[S.set].items.length;
 if(S.order.length!==n){S.order.length=0;for(var i=0;i<n;i++)S.order.push(i);}
 for(var j=S.order.length-1;j>0;j--){var k=(rnd()*(j+1))|0,t=S.order[j];S.order[j]=S.order[k];S.order[k]=t;}
 S.oi=0;
}
function nextQuestion(){
 if(S.oi>=S.order.length)shuffle();
 S.curIdx=S.order[S.oi++];S.cur=SETS[S.set].items[S.curIdx];S.asked++;
 // правильная дорожка всегда другая, чем в прошлый раз
 gate.lane=(gate.lane<0)?((rnd()*3)|0):((gate.lane+1+((rnd()*2)|0))%3);
 var flip=rnd()<.5,wi=0;
 for(var i=0;i<3;i++){
  if(i===gate.lane)gate.words[i]=S.cur.answer;
  else{gate.words[i]=S.cur.wrong[flip?1-wi:wi];wi++;}
 }
 gate.z=mx(SPAWN_Z,S.speed*3);gate.on=true;banner.key='';banner.t0=T;
 for(var k=0;k<ON;k++)if(objs[k].on&&abs(objs[k].z-gate.z)<12)objs[k].on=false;   // перед воротами — свободно
}
function startGame(si){
 if(si>=0&&si<SETS.length)S.set=si;
 var st=SETS[S.set];
 S.best=st.best;S.asked=0;S.won=false;S.modeSel=S.set;
 S.screen='play';S.scrT=0;S.score=0;S.dScore=0;S.correct=0;S.lives=3;S.speed=st.spd;
 S.lane=1;S.laneF=1;S.fb=0;S.shake=0;S.mistakes.length=0;gate.lane=-1;gate.on=false;
 S.combo=0;S.maxCombo=0;S.jump=0;S.land=0;S.flip=false;S.hurt=0;S.hlT=0;S.cur=null;S.cd=2.2;
 S.coins=0;S.coinT=0;S.objD=-6;S.deadT=0;clearObjs();
 shuffle();sfxTick();musicStart();
}
function toMenu(){S.screen='start';S.scrT=0;clearObjs();musicStop();}
function toModes(){S.screen='mode';S.scrT=0;musicStop();}
// Проверка выбора в момент пересечения ворот
function resolveGate(){
 gate.on=false;
 var ok=(Math.round(S.laneF)===gate.lane),hx=S.px,hy=S.py-S.ph*.6;
 S.fb=1.15;S.fbOk=ok;S.flashT=1;
 if(ok){
  S.combo++;S.comboT=.35;if(S.combo>S.maxCombo)S.maxCombo=S.combo;
  var mult=mn(5,1+Math.floor(S.combo/3)),pts=10*mult;
  S.score+=pts;S.correct++;S.speed=mn(SPDMAX,S.speed+1.2);
  S.jump=JUMP;S.flip=(S.combo%3===0);S.flashC='70,230,130';sfxJump();
  burst(hx,hy,46,CONF,U*.9,2,U*.012,U*1.6);
  burst(hx,hy,14,['#fff6a8','#ffd84d'],U*.6,1,U*.018,U*.8);
  floatText('+'+pts,hx,hy-S.ph*.35,'#ffe14d',mn(U*.09,48));
  if(mult>1&&S.combo%3===0){floatText('КОМБО ×'+mult+'!',W/2,H*.45,'#ff8af0',mn(U*.1,56));sfxCombo();}
  else sfxOk();
 }else{
  S.combo=0;S.lives--;S.shake=.45;S.hurt=.9;S.hlT=.7;S.flashC='255,60,60';
  if(S.mistakes.indexOf(S.curIdx)<0)S.mistakes.push(S.curIdx);
  burst(hx,hy,26,['#ff5a5a','#9aa4b5','#6b7385'],U*.55,0,U*.016,U*.9);
  if(S.lives>=0)burst(ui.hx[S.lives],ui.hy,14,['#e23b4e','#ff8a9a'],U*.35,0,U*.01,U*1.2);
  floatText('Қате!',hx,hy-S.ph*.35,'#ff6b6b',mn(U*.08,42));
  sfxBad();
 }
}
// won — уровень фразеологизмов пройден до конца
function gameOver(won){
 var st=SETS[S.set];
 S.screen='over';S.scrT=0;S.starSnd=0;S.won=!!won;
 // звёзды: в уровне — за число оставшихся жизней, в бесконечном — за верные ответы
 S.earned=st.endless?(S.correct>=15?3:S.correct>=8?2:S.correct>=3?1:0):(won?S.lives:0);
 S.nextSet=(won&&!st.endless&&S.set+1<SETS.length)?S.set+1:-1;
 S.coinTotal+=S.coins;saveCoins();
 S.newBest=S.score>st.best;
 if(S.newBest){st.best=S.best=S.score;}
 if(S.earned>st.stars)st.stars=S.earned;
 saveBest();
 overC.key='';
 if(won){sfxWin();for(var k=0;k<4;k++)burst(W*(.2+k*.2),H*.3,30,CONF,U*.9,2,U*.012,U*1.2);}
 else sfxOver();
}
function move(d){
 if(S.screen!=='play')return;
 var n=S.lane+d;if(n>=0&&n<=2){S.lane=n;sfxMove();}
}
function jump(){
 if(S.screen!=='play'||S.cd>0||S.jump>0||S.deadT>0)return;
 S.jump=JUMP;S.flip=false;sfxJump();
}

/* --- Монеты и препятствия --- */
function clearObjs(){for(var k=0;k<ON;k++)objs[k].on=false;}
function addObj(z,lane,kind){
 for(var k=0;k<ON;k++){var o=objs[k];if(o.on)continue;
  o.on=true;o.z=z;o.lane=lane;o.kind=kind;o.done=false;o.p=rnd()*TAU;o.sc=.85+rnd()*.3;return;}
}
function nearGate(z0,z1){return gate.on&&gate.z>z0-12&&gate.z<z1+12;}
// Ряд объектов: цепочка монет или препятствие (хотя бы одна дорожка всегда свободна)
function spawnRow(){
 var z=SPAWN_Z,lane=(rnd()*3)|0,n,k;
 if(rnd()<.45){
  n=3+((rnd()*3)|0);if(nearGate(z,z+n*COIN_GAP))return;
  for(k=0;k<n;k++)addObj(z+k*COIN_GAP,lane,0);
  return;
 }
 if(nearGate(z-COIN_GAP,z+COIN_GAP))return;
 addObj(z,lane,rnd()<.55?1:2);
 var free=(lane+1+((rnd()*2)|0))%3;
 if(S.speed>26&&rnd()<.4)addObj(z,3-lane-free,rnd()<.5?1:2);   // два препятствия на скорости
 if(rnd()<.6)for(k=-1;k<=1;k++)addObj(z+k*COIN_GAP,free,0);
}
function takeCoin(){
 S.coins++;S.coinT=.3;sfxCoin();
 burst(S.px,S.py-S.ph*.35,7,['#ffd84d','#fff6a8','#ffffff'],U*.3,1,U*.009,U*.4);
}
function hitObstacle(){
 if(S.lives<=0)return;
 S.combo=0;S.lives--;S.shake=.45;S.hurt=1.3;S.hlT=.7;S.flashT=1;S.flashC='255,60,60';
 burst(S.px,S.py-S.ph*.2,22,['#9aa4b5','#6b7385','#c9a27a'],U*.5,0,U*.016,U*.9);
 burst(ui.hx[S.lives],ui.hy,14,['#e23b4e','#ff8a9a'],U*.35,0,U*.01,U*1.2);
 floatText('Ой!',S.px,S.py-S.ph*.95,'#ff6b6b',mn(U*.08,42));
 sfxHit();
 if(S.lives<=0){S.deadT=.8;gate.on=false;}
}
function updObjs(step,live){
 for(var k=0;k<ON;k++){var o=objs[k];if(!o.on)continue;
  o.z-=step;
  if(live&&!o.done&&o.z<=PLR_Z+.5){o.done=true;
   if(abs(S.laneF-o.lane)<.55){
    if(o.kind===0){o.on=false;takeCoin();continue;}
    if(S.jump<=0&&S.hurt<=0&&S.deadT<=0)hitObstacle();   // в прыжке — перелетаем
   }}
  if(o.z<-2)o.on=false;
 }
}
function selectChar(c){
 if(S.ch===c)return;
 S.ch=c;saveChar();sfxSelect();
 var r=ui.cards[c];burst(r.x+r.w/2,r.y+r.h*.45,18,['#fff6a8','#ffd84d','#ffffff'],U*.45,1,U*.014,U*.4);
}

/* === 8. ОБНОВЛЕНИЕ СОСТОЯНИЯ === */
function updateDecs(step){
 for(var i=0;i<DN;i++)decs[i].z-=step;
 var n=(ring+DN-1)%DN,d=decs[n];     // ближайший объект уходит в конец кольца
 if(d.z<-4){d.z=decs[ring].z+DSP;d.side=rnd()<.5?-1:1;
  d.kind=(rnd()*4)|0;d.sc=.8+rnd()*.5;ring=n;}
}
function update(dt){
 T+=dt;S.dayT+=dt;S.scrT+=dt;
 S.laneF+=(S.lane-S.laneF)*mn(1,dt*13);   // плавный сдвиг между дорожками
 if(S.shake>0)S.shake-=dt;
 if(S.jump>0){S.jump-=dt;
  if(S.jump<=0){S.land=.16;S.flip=false;                // приземление: пыль и «приседание»
   burst(S.px,S.py,12,['rgba(240,228,200,.85)'],U*.28,0,S.ph*.035,U*.35);}}
 if(S.land>0)S.land-=dt;
 if(S.hurt>0)S.hurt-=dt;
 if(S.flashT>0)S.flashT-=dt*1.8;
 if(S.hlT>0)S.hlT-=dt;
 if(S.comboT>0)S.comboT-=dt;
 if(S.help)S.helpT+=dt;
 if(S.coinT>0)S.coinT-=dt;
 S.dScore+=(S.score-S.dScore)*mn(1,dt*8);
 updParts(dt);updFloats(dt);
 if(S.screen!=='play'){S.dist+=10*dt;S.runT+=dt*7;updateDecs(10*dt);updObjs(10*dt,false);return;}
 S.dist+=S.speed*dt;S.runT+=dt*(7+S.speed*.22);updateDecs(S.speed*dt);updObjs(S.speed*dt,S.cd<=0);
 S.dustT-=dt;                                 // пыль из-под ног
 if(S.dustT<=0&&S.jump<=0){S.dustT=.07;
  spawn(S.px+(rnd()-.5)*S.ph*.15,S.py,(rnd()-.5)*U*.15,U*(.1+rnd()*.1),.5,S.ph*.025,'rgba(240,228,200,.6)',0,0,S.ph*.06);}
 if(S.cd>0){                                  // обратный отсчёт 3-2-1
  var a=Math.ceil((S.cd-.4)/.6);S.cd-=dt;var b=Math.ceil((S.cd-.4)/.6);
  if(b!==a&&a>0){if(b>0)sfxTick();else sfxGo();}
  if(S.cd<=0)nextQuestion();
  return;
 }
 if(S.deadT>0){S.deadT-=dt;if(S.deadT<=0)gameOver(false);return;}   // разбился о препятствие
 S.speed=mn(SPDMAX,S.speed+SPDUP*dt);    // плавный разгон со временем
 S.objD+=S.speed*dt;if(S.objD>=OBJ_GAP){S.objD=-rnd()*6;spawnRow();}
 if(gate.on){gate.z-=S.speed*dt;if(gate.z<=PLR_Z)resolveGate();}
 else if(S.fb>0){S.fb-=dt;if(S.fb<=0){var st=SETS[S.set];
  if(S.lives<=0)gameOver(false);
  else if(!st.endless&&S.asked>=st.items.length)gameOver(true);   // уровень пройден
  else nextQuestion();}}
}

/* === 9. ФОН: небо, горы, холмы === */
function drawSky(){
 var sg=g.createLinearGradient(0,0,0,hzY+10);
 sg.addColorStop(0,P.sT);sg.addColorStop(.6,P.sM);sg.addColorStop(1,P.sB);
 fl(sg);fr(0,0,W,hzY+2);
 var night=PW[2],k,s;
 if(night>.02){                                  // мерцающие звёзды
  fl('#ffffff');
  for(k=0;k<stars.length;k++){s=stars[k];
   g.globalAlpha=night*(.45+.55*sin(T*2+s.p)*sin(T*2+s.p));
   fr(s.x*W,s.y*hzY*.85,s.s,s.s);}
  g.globalAlpha=1;
 }
 var low=PW[1]+PW[3]*.7,sx=W*.78,sy=hzY*(.25+.62*low),sr=U*.055;
 if(night<.98){                                  // солнце с ореолом
  g.globalAlpha=1-night;
  var gl=g.createRadialGradient(sx,sy,sr*.6,sx,sy,sr*4.5);
  gl.addColorStop(0,rgba('sun',.55));gl.addColorStop(1,rgba('sun',0));
  fl(gl);fr(sx-sr*4.5,sy-sr*4.5,sr*9,sr*9);
  fl(P.sun);dot(sx,sy,sr);
  g.globalAlpha=1;
 }
 if(night>.02){                                  // луна
  var mx0=W*.2,my=hzY*.3,mr=U*.042;
  g.globalAlpha=night;
  var ml=g.createRadialGradient(mx0,my,mr*.5,mx0,my,mr*3.5);
  ml.addColorStop(0,'rgba(220,230,255,.35)');ml.addColorStop(1,'rgba(220,230,255,0)');
  fl(ml);fr(mx0-mr*3.5,my-mr*3.5,mr*7,mr*7);
  fl('#f1f4ff');dot(mx0,my,mr);
  fl('rgba(170,180,215,.6)');dot(mx0-mr*.3,my-mr*.2,mr*.2);dot(mx0+mr*.35,my+mr*.25,mr*.15);dot(mx0+mr*.1,my-mr*.45,mr*.1);
  g.globalAlpha=1;
 }
 fl(P.cl);
 for(k=0;k<clouds.length;k++){
  var c=clouds[k],x=((c.x*W+S.dist*c.v+T*6*c.v)%(W+260))-130,y=c.y*H,r=U*.035*c.s;
  g.globalAlpha=.9;
  g.beginPath();g.arc(x,y,r,0,TAU);g.arc(x+r*.9,y-r*.35,r*.85,0,TAU);
  g.arc(x+r*1.8,y,r*.7,0,TAU);g.arc(x+r*.9,y+r*.25,r*.8,0,TAU);g.fill();
 }
 g.globalAlpha=1;
}
function drawAstanaBg(){                      // ночная Астана: небо и силуэт города над горизонтом
 if(!AST.complete||!AST.naturalWidth){drawSky();return;}
 var iw=AST.naturalWidth,ih=AST.naturalHeight,sc=mx(W/iw,(hzY+2)/ih),dw=iw*sc,dh=ih*sc;
 g.drawImage(AST,(W-dw)/2,hzY+2-dh,dw,dh);
 var hg=g.createLinearGradient(0,hzY-U*.05,0,hzY+2);   // мягкий переход к дороге
 hg.addColorStop(0,'rgba(20,28,70,0)');hg.addColorStop(1,'rgba(20,28,70,.45)');
 fl(hg);fr(0,hzY-U*.05,W,U*.05+2);
}
function mountains(arr,par,hgt,col,snow){       // горный хребет с параллаксом
 var n=arr.length,tw=W*.26,o=(S.dist*par)%(tw*n),s0=Math.floor(o/tw),xo=o-s0*tw;
 var base=hzY+2,cnt=Math.ceil(W/tw)+2,k,x,a;
 fl(col);g.beginPath();g.moveTo(-tw,base);
 for(k=0;k<cnt;k++){a=arr[(s0+k)%n];x=k*tw-xo;
  g.lineTo(x,base-hgt*.12);g.lineTo(x+tw*.28,base-hgt*a[0]*a[1]);g.lineTo(x+tw*.5,base-hgt*a[0]);}
 g.lineTo(cnt*tw-xo,base-hgt*.12);g.lineTo(cnt*tw,base);g.closePath();g.fill();
 if(!snow)return;
 fl(P.sn);
 for(k=0;k<cnt;k++){a=arr[(s0+k)%n];x=k*tw-xo;
  var px=x+tw*.5,py=base-hgt*a[0],lx=x+tw*.28,ly=base-hgt*a[0]*a[1],rx=x+tw,ry=base-hgt*.12;
  var Lx=px+(lx-px)*.4,Ly=py+(ly-py)*.4,Rx=px+(rx-px)*.2,Ry=py+(ry-py)*.2;
  g.beginPath();g.moveTo(px,py);g.lineTo(Lx,Ly);g.lineTo(px-(px-Lx)*.3,Ly-(Ly-py)*.15);
  g.lineTo(px+(Rx-px)*.35,Ry+(Ly-Ry)*.2);g.lineTo(Rx,Ry);g.closePath();g.fill();}
}
function hills(step,amp,col){   // ряд холмов с параллаксом
 var o=(S.dist*step)%(W*amp);
 fl(col);g.beginPath();g.moveTo(-10,hzY+2);
 for(var i=-1;i<Math.ceil(2/amp)+2;i++){
  var bx=i*W*amp-o;g.quadraticCurveTo(bx+W*amp*.5,hzY-U*amp*.38,bx+W*amp,hzY+2);
 }
 g.lineTo(W+10,hzY+2);g.closePath();g.fill();
}
function haze(){               // дымка у горизонта
 var hg=g.createLinearGradient(0,hzY-U*.14,0,hzY+2);
 hg.addColorStop(0,rgba('sB',0));hg.addColorStop(1,rgba('sB',.6));
 fl(hg);fr(0,hzY-U*.14,W,U*.14+2);
}

/* === 10. ДОРОГА: трапеции по сегментам + разметка === */
function quad(x1,x2,pN,pF,yN,yF){
 g.beginPath();g.moveTo(cx+x1*pN,yN);g.lineTo(cx+x2*pN,yN);
 g.lineTo(cx+x2*pF,yF);g.lineTo(cx+x1*pF,yF);g.closePath();g.fill();
}
function drawRoad(){
 fl(P.gA);fr(0,hzY,W,H-hzY+2);
 var off=S.dist%SEG,ew=rHalf*.035,dw=LW*.035;
 for(var k=BANDS;k>=0;k--){
  var z0=k*SEG-off;if(z0<0)z0=0;
  var z1=z0+SEG,pN=pz(z0),pF=pz(z1),yN=yAt(pN),yF=yAt(pF);
  if(yN<hzY)continue;
  fl((k&1)?P.gA:P.gB);               // полосы степи дают ощущение скорости
  fr(0,yF,W,yN-yF+1);
  if(S.map===1){fl((k&1)?'#6c698f':'#645f86');quad(-rHalf*1.34,rHalf*1.34,pN,pF,yN,yF);}   // тротуар Астаны
  fl((k&1)?P.rA:P.rB);               // полотно дороги
  quad(-rHalf,rHalf,pN,pF,yN,yF);
  fl(P.ed);                          // боковые линии
  quad(-rHalf-ew,-rHalf+ew,pN,pF,yN,yF);
  quad(rHalf-ew,rHalf+ew,pN,pF,yN,yF);
  if(k&1){                                     // пунктир между дорожками
   var yM=yAt(pz(z0+SEG*.55));
   quad(-LW*.5-dw,-LW*.5+dw,pN,pz(z0+SEG*.55),yN,yM);
   quad(LW*.5-dw,LW*.5+dw,pN,pz(z0+SEG*.55),yN,yM);
  }
 }
}
function drawTree(x,y,s){
 fl('#7a5232');fr(x-s*.04,y-s*.42,s*.08,s*.42);
 fl(P.tD);dot(x,y-s*.56,s*.2);dot(x-s*.13,y-s*.43,s*.14);dot(x+s*.14,y-s*.45,s*.14);
 fl(P.tL);dot(x-s*.05,y-s*.62,s*.12);dot(x+s*.09,y-s*.52,s*.08);
}
function drawYurt(x,y,s){       // киіз үй
 var w=s*.62,hb=s*.2,hd=s*.15;
 fl('rgba(0,0,0,.15)');g.beginPath();g.ellipse(x,y,w*.6,w*.08,0,0,TAU);g.fill();
 fl('#f6f0e2');g.beginPath();g.moveTo(x-w/2,y);g.lineTo(x-w/2,y-hb);
 g.quadraticCurveTo(x,y-hb-hd*2,x+w/2,y-hb);g.lineTo(x+w/2,y);g.closePath();g.fill();
 fl('#c8443a');fr(x-w/2,y-hb,w,hb*.2);
 fl('#e0b04a');fr(x-w/2,y-hb*.12,w,hb*.12);
 fl('#b36a2a');rr(x-w*.1,y-hb*.78,w*.2,hb*.78,w*.04);g.fill();
 fl('#8a5a34');g.beginPath();g.ellipse(x,y-hb-hd*.98,w*.09,hd*.18,0,0,TAU);g.fill();
}
function drawBush(x,y,s){
 fl(P.tD);dot(x-s*.08,y-s*.07,s*.09);dot(x+s*.08,y-s*.07,s*.08);dot(x,y-s*.14,s*.1);
 fl('#ff8fb1');dot(x-s*.05,y-s*.15,s*.022);dot(x+s*.07,y-s*.1,s*.02);
 fl('#ffe066');dot(x+s*.01,y-s*.2,s*.02);dot(x-s*.11,y-s*.08,s*.018);
}
function drawLamp(x,y,s,side){
 var hx=x-side*s*.12,hy=y-s*.7;
 fl('#3d4256');fr(x-s*.015,y-s*.7,s*.03,s*.7);fr(mn(x,hx),hy-s*.012,abs(x-hx),s*.024);
 var night=PW[2];
 if(night>.05){var lg=g.createRadialGradient(hx,hy+s*.02,0,hx,hy+s*.02,s*.35);
  lg.addColorStop(0,'rgba(255,225,140,'+(night*.6).toFixed(3)+')');lg.addColorStop(1,'rgba(255,225,140,0)');
  fl(lg);fr(hx-s*.35,hy-s*.33,s*.7,s*.7);}
 fl(night>.3?'#fff2b8':'#f2f2f2');dot(hx,hy+s*.025,s*.035);
}
function drawCypress(x,y,s){                  // стриженое дерево аллеи
 fl('#3a2a20');fr(x-s*.025,y-s*.12,s*.05,s*.12);
 fl(P.tD);g.beginPath();g.ellipse(x,y-s*.45,s*.14,s*.36,0,0,TAU);g.fill();
 fl(P.tL);g.beginPath();g.ellipse(x-s*.04,y-s*.52,s*.06,s*.24,0,0,TAU);g.fill();
}
function drawBollard(x,y,s){                  // светящийся столбик вдоль тротуара
 var w=s*.07,h=s*.24,ly=y-h*.78;
 var lg=g.createRadialGradient(x,ly,0,x,ly,s*.3);
 lg.addColorStop(0,'rgba(255,214,120,.55)');lg.addColorStop(1,'rgba(255,214,120,0)');
 fl(lg);fr(x-s*.3,ly-s*.3,s*.6,s*.6);
 fl('#2b2e3d');fr(x-w/2,y-h,w,h);
 fl('#ffe7a3');fr(x-w*.38,y-h*.92,w*.76,h*.34);
}
function drawDecs(){
 for(var i=0;i<DN;i++){
  var d=decs[(ring+i)%DN];
  if(d.z<.4||d.z>240)continue;
  var p=pz(d.z),y=yAt(p);if(y<hzY)continue;
  if(S.map===1){var xa=cx+d.side*rHalf*(d.kind===1?1.2:d.kind===3?1.3:1.62)*p,sa=H*.42*p*d.sc;if(sa<2)continue;
   if(d.kind===0)drawCypress(xa,y,sa);else if(d.kind===1)drawBollard(xa,y,sa);
   else if(d.kind===2)drawBush(xa,y,sa);else drawLamp(xa,y,sa,d.side);
   continue;}
  var x=cx+d.side*rHalf*(d.kind===1?1.75:1.35)*p,s=H*.42*p*d.sc;if(s<2)continue;
  if(d.kind===0)drawTree(x,y,s);
  else if(d.kind===1)drawYurt(x,y,s);
  else if(d.kind===2)drawBush(x,y,s);
  else drawLamp(x,y,s,d.side);
 }
}

/* === 10б. МОНЕТЫ И ПРЕПЯТСТВИЯ === */
var COIN=new Image();COIN.src='img/coin.png';     // монета NIS
function coinOk(){return COIN.complete&&COIN.naturalWidth>0;}
function coinIcon(x,y,r){
 if(coinOk()){g.drawImage(COIN,x-r,y-r,r*2,r*2);return;}
 fl('#c98a00');dot(x,y,r);fl('#ffd84d');dot(x,y,r*.76);fl('#fff6a8');dot(x-r*.28,y-r*.28,r*.2);}
function drawCoin(x,y,s,ph){                  // вращающийся тиын над дорогой
 var r=s*.13,cy=y-r*2+sin(T*4+ph)*r*.3,sc=mx(.15,abs(cos(T*4.5+ph)));
 fl('rgba(0,0,0,.16)');g.beginPath();g.ellipse(x,y,r*.75,r*.2,0,0,TAU);g.fill();
 if(coinOk()){var ed=r*.14*(1-sc);                // ребро монеты видно, когда она повёрнута боком
  if(ed>.5){fl('#b97a08');g.beginPath();g.ellipse(x+ed,cy,r*sc,r,0,0,TAU);g.fill();}
  g.drawImage(COIN,x-r*sc,cy-r,r*2*sc,r*2);return;}
 fl('#c98a00');g.beginPath();g.ellipse(x,cy,r*sc,r,0,0,TAU);g.fill();
 fl('#ffd84d');g.beginPath();g.ellipse(x,cy,r*.76*sc,r*.76,0,0,TAU);g.fill();
 if(r>4){fl('#e7a91c');g.beginPath();g.ellipse(x,cy,r*.3*sc,r*.3,0,0,TAU);g.fill();}
 fl('#fff6a8');g.beginPath();g.ellipse(x-r*.3*sc,cy-r*.32,r*.16*sc,r*.2,0,0,TAU);g.fill();
}
function drawRock(x,y,s){                     // серый валун с гранями
 var w=s*.6,h=s*.4;
 fl('rgba(0,0,0,.2)');g.beginPath();g.ellipse(x,y,w*.58,w*.1,0,0,TAU);g.fill();
 fl('#878c99');g.beginPath();g.moveTo(x-w*.5,y);g.lineTo(x-w*.46,y-h*.45);g.lineTo(x-w*.28,y-h*.9);
 g.lineTo(x-w*.02,y-h);g.lineTo(x+w*.26,y-h*.84);g.lineTo(x+w*.47,y-h*.42);g.lineTo(x+w*.5,y);g.closePath();g.fill();
 fl('#a9aebb');g.beginPath();g.moveTo(x-w*.46,y-h*.45);g.lineTo(x-w*.28,y-h*.9);g.lineTo(x-w*.02,y-h);
 g.lineTo(x+w*.06,y-h*.55);g.lineTo(x-w*.2,y-h*.32);g.closePath();g.fill();
 fl('#686d79');g.beginPath();g.moveTo(x-w*.5,y);g.lineTo(x-w*.48,y-h*.2);g.lineTo(x+w*.49,y-h*.24);g.lineTo(x+w*.5,y);g.closePath();g.fill();
 if(w>14){sk('#5d626d',mx(1,w*.018));g.lineCap='round';g.beginPath();
  g.moveTo(x+w*.12,y-h*.78);g.lineTo(x+w*.2,y-h*.55);g.lineTo(x+w*.15,y-h*.38);g.stroke();
  fl('#7fae5a');dot(x-w*.36,y-h*.22,w*.05);dot(x-w*.3,y-h*.18,w*.04);}  // мох
}
function drawLog(x,y,s){                      // бревно поперёк дорожки
 var w=s*.78,h=s*.2;
 fl('rgba(0,0,0,.2)');g.beginPath();g.ellipse(x,y,w*.55,w*.07,0,0,TAU);g.fill();
 fl('#8a5a34');rr(x-w/2,y-h,w,h,h/2);g.fill();
 fl('#a8744a');rr(x-w/2+h*.3,y-h*.9,w-h*.6,h*.28,h*.14);g.fill();
 if(w>16){sk('#6e4426',mx(1,h*.07));g.beginPath();
  g.moveTo(x-w*.2,y-h*.55);g.lineTo(x-w*.05,y-h*.55);g.moveTo(x+w*.08,y-h*.35);g.lineTo(x+w*.25,y-h*.35);g.stroke();}
 fl('#e3bf8f');g.beginPath();g.ellipse(x+w/2-h*.3,y-h/2,h*.3,h*.5,0,0,TAU);g.fill();
 if(w>16){sk('#b98a58',mx(1,h*.06));g.beginPath();g.ellipse(x+w/2-h*.3,y-h/2,h*.15,h*.26,0,0,TAU);g.stroke();}
}
function sortObjs(){                          // дальние рисуются первыми
 ord.length=0;
 for(var k=0;k<ON;k++)if(objs[k].on){var j=ord.length;ord.push(k);
  while(j>0&&objs[ord[j-1]].z<objs[k].z){ord[j]=ord[j-1];j--;}ord[j]=k;}
}
function drawObjs(lo,hi){                     // объекты с lo < z <= hi
 for(var k=0;k<ord.length;k++){var o=objs[ord[k]];
  if(!o.on||o.z<=lo||o.z>hi)continue;
  var p=pz(o.z),y=yAt(p);if(y<hzY)continue;
  var x=cx+(o.lane-1)*LW*p,s=LW*p;if(s<3)continue;
  if(o.kind===0)drawCoin(x,y,s,o.p);else if(o.kind===1)drawRock(x,y,s*o.sc);else drawLog(x,y,s);
 }
}

/* === 11. ВОРОТА С ТРЕМЯ ВАРИАНТАМИ СЛОВ === */
var SCOL=[['#ff8a5c','#e0502e'],['#5ec0f5','#2383c9'],['#7ad860','#3f9e33']];
function drawGate(){
 if(!gate.on||gate.z<.3||gate.z>260)return;
 var p=pz(gate.z),gy=yAt(p);if(gy<hzY)return;
 var half=rHalf*1.1*p,topH=H*.66*p,pw=mx(2,rHalf*.075*p),beam=mx(3,topH*.1);
 var near=cl(1-gate.z/34),me=Math.round(S.laneF);
 fl('#6e4426');fr(cx-half-pw/2,gy-topH,pw,topH);fr(cx+half-pw/2,gy-topH,pw,topH);
 fl('#9a6a3e');fr(cx-half-pw/2,gy-topH,pw*.35,topH);fr(cx+half-pw/2,gy-topH,pw*.35,topH);
 var bx=cx-half-pw*.9,bw=half*2+pw*1.8,byy=gy-topH-beam*.25,k;
 var bg=g.createLinearGradient(0,byy,0,byy+beam);bg.addColorStop(0,'#ffd35a');bg.addColorStop(1,'#d48a1c');
 fl(bg);rr(bx,byy,bw,beam,beam*.3);g.fill();
 if(beam>6){                                   // орнамент на балке
  fl('#b8322a');var n=mx(4,Math.floor(bw/(beam*1.3))),ds=beam*.26;
  for(k=0;k<n;k++){var ox=bx+(k+.5)*bw/n,oy=byy+beam/2;
   g.beginPath();g.moveTo(ox,oy-ds);g.lineTo(ox+ds,oy);g.lineTo(ox,oy+ds);g.lineTo(ox-ds,oy);g.closePath();g.fill();}
 }
 var mr=beam*.9,my=byy-mr*.3;                  // медальон с вопросом
 fl('#1d3557');dot(cx,my,mr);fl('#ffd35a');dot(cx,my,mr*.78);
 if(mr>5){fl('#1d3557');g.font=F(mr*1.2,900);center();g.fillText('?',cx,my+mr*.06);}
 var sh=H*.16*p,sw=LW*.88*p,sy=gy-topH+beam;
 if(sh<4||sw<6)return;
 center();
 for(var i=0;i<3;i++){
  var sel=(i===me),sc=1+(sel?.08*near:0),bob=sin(T*3+i*1.7)*sh*.05;
  g.save();g.translate(cx+(i-1)*LW*p,sy);g.rotate(sin(T*2.3+i)*.035);g.scale(sc,sc);
  var by=sh*.18+bob;
  sk('#5a3a22',mx(1,sw*.02));g.beginPath();
  g.moveTo(-sw*.3,0);g.lineTo(-sw*.3,by);g.moveTo(sw*.3,0);g.lineTo(sw*.3,by);g.stroke();
  if(near>0){g.shadowColor=SCOL[i][0];g.shadowBlur=sh*.7*near;}
  var gg=g.createLinearGradient(0,by,0,by+sh);gg.addColorStop(0,SCOL[i][0]);gg.addColorStop(1,SCOL[i][1]);
  fl(gg);rr(-sw/2,by,sw,sh,sh*.24);g.fill();
  g.shadowBlur=0;
  sk(sel&&near>0?'#ffe14d':'rgba(255,255,255,.95)',mx(1,sh*(sel&&near>0?.09:.06)));g.stroke();
  fl('rgba(255,255,255,.22)');rr(-sw/2+sh*.12,by+sh*.08,sw-sh*.24,sh*.3,sh*.15);g.fill();
  var fs=sh*.5;g.font=F(fs,900);                 // текст ужимается по ширине таблички
  var tw=g.measureText(gate.words[i]).width;
  if(tw>sw*.86){fs=fs*sw*.86/tw;g.font=F(fs,900);}
  if(fs>=5){
   fl('rgba(0,0,0,.25)');g.fillText(gate.words[i],fs*.05,by+sh/2+fs*.1);
   fl('#fff');g.fillText(gate.words[i],0,by+sh/2+fs*.04);
  }
  g.restore();
 }
}

/* === 12. ПЕРСОНАЖИ: спрайт-листы, рост ≈ 1.2 условной единицы, точка привязки — ноги === */
/* --- Батыр: персонаж из спрайт-листа img/batyr.png ---
   Кадры [x,y,w,h] в атласе; рост стоящего героя ≈ 1.2 условной единицы, точка привязки — низ кадра по центру */
var BATYR=new Image(),BF_={front:[2,2,108,268],side1:[112,2,91,266],side2:[205,2,85,263],back:[292,2,107,263],
 run1:[401,2,134,202],run2:[537,2,119,191],run3:[658,2,155,194],jump:[815,2,145,162],win:[962,2,110,234],fall:[1074,2,156,156],
 brun1:[1232,2,109,233],brun2:[1343,2,93,234],brun3:[1438,2,125,235],brun4:[1565,2,99,236],brun5:[1666,2,107,233],brun6:[1775,2,107,235],
 bjump1:[1884,2,145,215],bjump2:[2031,2,172,183],bjump3:[2205,2,167,207]};
var RUNSEQ=['run1','run2','run3','run2'],ZRUN=['brun1','brun2','brun3','brun4','brun5','brun6'],batyrFace=1,jumpQ=0;
BATYR.src='img/batyr.png';
function drawBatyr(ph,mode){
 var n,dy=0,sx=1,sy=1;
 if(mode===1)n=ZRUN[(Math.floor(ph*6/TAU)%6+6)%6];      // в забеге — цикл бега со спины
 else if(mode===2)n=jumpQ<.22?'bjump1':jumpQ<.78?'bjump2':'bjump3';   // взлёт → полёт → приземление
 else if(mode===4)n='fall';
 else if(mode===3){var c=T%4;n=c<2.4?'win':RUNSEQ[Math.floor(T*9)%4];   // на карточке: радуется, потом бежит на месте
  if(n==='win')dy=-abs(sin(T*5))*.06;}
 else{n='front';sy=1+sin(T*2.2)*.012;sx=2-sy;}       // дыхание
 if(!BATYR.complete||!BATYR.naturalWidth){fl('#1f8f8f');rr(-.15,-1.1,.3,1.1,.1);g.fill();return;}
 var f=BF_[n],k=1.2/268,w=f[2]*k,hh=f[3]*k;
 g.save();g.translate(0,dy);g.scale(sx*(mode===4?batyrFace:1),sy);   // вид со спины не зеркалим — сумка на месте
 g.drawImage(BATYR,f[0],f[1],f[2],f[3],-w/2,-hh,w,hh);
 g.restore();
}
/* --- Жүйрік қыз: спрайт-лист img/zhuyrik.png ---
   Свой цикл бега и прыжка со спины (b*); кадры со спины нарисованы мельче — у них свой масштаб */
var ZHUY=new Image(),ZF={front:[2,2,136,298],run1:[507,2,138,244],run2:[647,2,131,226],run3:[780,2,160,235],
 win:[1105,2,136,258],fall:[1243,2,144,173],brun1:[1389,2,109,240],brun2:[1500,2,106,237],brun3:[1608,2,112,241],
 brun4:[1722,2,111,238],brun5:[1835,2,116,241],brun6:[1953,2,121,239],bjump1:[2076,2,144,231],bjump2:[2222,2,175,195],bjump3:[2399,2,148,204]};
ZHUY.src='img/zhuyrik.png';
function drawZhuyrik(ph,mode){
 var n,dy=0,sx=1,sy=1;
 if(mode===1)n=ZRUN[(Math.floor(ph*6/TAU)%6+6)%6];
 else if(mode===2)n=jumpQ<.22?'bjump1':jumpQ<.78?'bjump2':'bjump3';   // взлёт → полёт → приземление
 else if(mode===4)n='fall';
 else if(mode===3){var c=T%4;n=c<2.4?'win':RUNSEQ[Math.floor(T*9)%4];
  if(n==='win')dy=-abs(sin(T*5))*.06;}
 else{n='front';sy=1+sin(T*2.2)*.012;sx=2-sy;}
 if(!ZHUY.complete||!ZHUY.naturalWidth){fl('#1f8f8f');rr(-.15,-1.1,.3,1.1,.1);g.fill();return;}
 var f=ZF[n],k=1.2/(n.charAt(0)==='b'?271:298),w=f[2]*k,hh=f[3]*k;
 g.save();g.translate(0,dy);g.scale(sx*(mode===4?batyrFace:1),sy);
 g.drawImage(ZHUY,f[0],f[1],f[2],f[3],-w/2,-hh,w,hh);
 g.restore();
}
var spinA=0,sq=0;                              // кувырок и сжатие при приземлении
function drawRunner(kind,x,y,h,ph,mode,lean,jy){
 h*=.9;
 var s1=mode===1?sin(ph):(mode===2?.6:0);
 var bob=mode===1?abs(s1)*.045:(mode===2?0:sin(T*2.2+kind)*.008);
 g.save();g.translate(x,y);g.scale(h,h);
 var sh=1/(1+jy/h*3);
 fl('rgba(0,0,0,.22)');g.beginPath();g.ellipse(0,0,.22*sh,.055*sh,0,0,TAU);g.fill();
 if(sq)g.scale(1+sq,1-sq);
 g.translate(0,-jy/h-bob);g.rotate(lean+(mode===1?sin(ph)*.035:0));
 if(spinA){g.translate(0,-.55);g.rotate(spinA);g.translate(0,.55);}
 g.lineCap='round';g.lineJoin='round';
 if(kind===0)drawBatyr(ph,mode);else drawZhuyrik(ph,mode);
 g.restore();
}
function drawPlayer(){
 var pp=pz(PLR_Z),x=cx+(S.laneF-1)*LW*pp,y=yAt(pp),h=H*.33*pp,jy=0;
 S.px=x;S.py=y;S.ph=h;
 spinA=0;sq=0;
 jumpQ=0;
 if(S.jump>0){var q=1-S.jump/JUMP;jumpQ=q;jy=sin(q*PI)*h*.55;
  if(q<.12)sq=.1*(1-q/.12);                         // присед перед толчком
  if(S.flip){var f=cl((q-.1)/.75);spinA=-TAU*f*f*(3-2*f);}}
 if(S.land>0)sq=.14*S.land/.16;
 if(S.hurt>0&&sin(T*38)>0)g.globalAlpha=.4;       // мигание после ошибки
 var lean=(S.lane-S.laneF)*.35;
 if(lean>.03)batyrFace=1;else if(lean<-.03)batyrFace=-1;   // спрайт смотрит в сторону перестроения
 drawRunner(S.ch,x,y,h,S.runT,jy>0?2:((S.deadT>0||S.hurt>.85)?4:1),lean,jy);
 g.globalAlpha=1;
}

/* === 13. ЭФФЕКТЫ ЭКРАНА: линии скорости, вспышка === */
function drawSpeed(){
 if(S.screen!=='play'||S.speed<22)return;
 var a=mn(.32,(S.speed-22)/35),R=mx(W,H);
 g.lineWidth=mx(1.5,U*.004);g.lineCap='round';
 for(var k=0;k<SL.length;k++){var s=SL[k],q=(T*1.7+s.o)%1,r0=R*(.3+q*.75),r1=r0+R*s.l*(.5+q);
  var ca=cos(s.a),sa=sin(s.a);
  g.strokeStyle='rgba(255,255,255,'+(a*q).toFixed(3)+')';
  g.beginPath();g.moveTo(cx+ca*r0,hzY+sa*r0);g.lineTo(cx+ca*r1,hzY+sa*r1);g.stroke();}
}
function drawFlash(){
 if(S.flashT<=0)return;
 var gr=g.createRadialGradient(W/2,H/2,U*.3,W/2,H/2,mx(W,H)*.75);
 gr.addColorStop(0,'rgba('+S.flashC+',0)');gr.addColorStop(1,'rgba('+S.flashC+','+(S.flashT*.55).toFixed(3)+')');
 fl(gr);fr(0,0,W,H);
}

/* === 14. ИНТЕРФЕЙС: пословица, жизни, счёт, экраны === */
var banner={key:'',lines:[],fs:0,t0:0},overC={key:'',lines:[]},sndBtn={x:0,y:0,w:0,h:0};

// Перенос строк; выполняется только при смене текста или размера экрана
function wrap(text,maxW,fs,weight,out){
 g.font=F(fs,weight);out.length=0;
 var words=text.split(' '),line='';
 for(var i=0;i<words.length;i++){
  var t=line?line+' '+words[i]:words[i];
  if(g.measureText(t).width>maxW&&line){out.push(line);line=words[i];}else line=t;
 }
 if(line)out.push(line);
}
function full(p){return p.text.replace('____',p.answer);}

function drawBanner(){
 var top=mx(8,H*.014);
 if(!S.cur)return top;
 var str=(S.fb>0)?full(S.cur):S.cur.text;
 var bw=mn(W-16,860),bx=(W-bw)/2,pad=bw*.045,key=str+'|'+W+'|'+H;
 if(banner.key!==key){
  var fs=mn(W*.052,H*.042,34);
  wrap(str,bw-pad*2,fs,800,banner.lines);
  while(banner.lines.length>3&&fs>11){fs-=2;wrap(str,bw-pad*2,fs,800,banner.lines);}
  banner.fs=fs;banner.key=key;
 }
 var lh=banner.fs*1.26,bh=lh*banner.lines.length+banner.fs*.85;
 var e=eob(cl((T-banner.t0)*3.2)),by=top-(1-e)*(bh+top+10);
 var pop=S.fb>.95?1+(S.fb-.95)*.35:1;
 g.save();g.translate(W/2,by+bh/2);g.scale(pop,pop);g.translate(-W/2,-(by+bh/2));
 fl('rgba(5,15,40,.22)');rr(bx,by+5,bw,bh,bh*.22);g.fill();
 if(S.fb>0){var gg=g.createLinearGradient(0,by,0,by+bh);
  if(S.fbOk){gg.addColorStop(0,'#4fd27a');gg.addColorStop(1,'#239a4f');}
  else{gg.addColorStop(0,'#ff6b6b');gg.addColorStop(1,'#c9303b');}
  fl(gg);}
 else fl('rgba(255,255,255,.94)');
 rr(bx,by,bw,bh,bh*.22);g.fill();
 sk((S.fb>0)?'rgba(255,255,255,.85)':'rgba(40,70,120,.25)',2);g.stroke();
 if(S.fb<=0){fl('#ffb02e');rr(bx,by+bh*.18,mx(4,bw*.008),bh*.64,4);g.fill();}
 fl((S.fb>0)?'#fff':'#1d3557');g.font=F(banner.fs,800);center();
 for(var i=0;i<banner.lines.length;i++)g.fillText(banner.lines[i],W/2,by+banner.fs*.45+lh*(i+.5));
 g.restore();
 return by+bh;
}
function heart(x,y,s,on){
 g.beginPath();g.moveTo(x,y+s*.7);
 g.bezierCurveTo(x-s*1.05,y-s*.1,x-s*.5,y-s*.85,x,y-s*.25);
 g.bezierCurveTo(x+s*.5,y-s*.85,x+s*1.05,y-s*.1,x,y+s*.7);
 g.closePath();fl(on?'#ff3b5c':'rgba(255,255,255,.22)');g.fill();
 if(on){fl('rgba(255,255,255,.55)');dot(x-s*.42,y-s*.25,s*.16);}
}
function pill(x,y,w,h){fl('rgba(12,24,52,.5)');rr(x,y,w,h,h/2);g.fill();sk('rgba(255,255,255,.28)',1.5);g.stroke();}
function drawHUD(){
 var rowY=drawBanner()+mx(8,H*.014),fs=mn(U*.045,22),ph=fs*1.8,m=mx(10,W*.03),i;
 var hs=fs*.62,step=hs*2.5;
 pill(m,rowY,step*3+hs*.9,ph);
 for(i=0;i<3;i++){
  var hx=m+hs*1.7+i*step,hy=rowY+ph/2,on=i<S.lives,sc=1;
  ui.hx[i]=hx;ui.hy=hy;
  if(on&&S.lives===1)sc=1+abs(sin(T*5))*.18;            // последнее сердце бьётся
  heart(hx,hy,hs*sc,on);
  if(!on&&i===S.lives&&S.hlT>0){var q=S.hlT/.7;g.globalAlpha=q;heart(hx,hy,hs*(1+(1-q)*1.6),true);g.globalAlpha=1;}
 }
 // монеты
 var cy2=rowY+ph+fs*.3,cph=ph*.8,ctx2=String(S.coins),cb=1+cl(S.coinT/.3)*.35;
 g.font=F(fs*.95,900);var cpw=g.measureText(ctx2).width+fs*2.2;
 pill(m,cy2,cpw,cph);
 coinIcon(m+fs*.9,cy2+cph/2,fs*.48*cb);
 g.textAlign='left';g.textBaseline='middle';fl('#ffe14d');g.fillText(ctx2,m+fs*1.6,cy2+cph/2+1);
 // счёт
 var st=String(Math.round(S.dScore));g.font=F(fs*1.1,900);
 var tw=g.measureText(st).width,pw=tw+fs*2.6,px=W-m-pw;
 pill(px,rowY,pw,ph);
 fl('#ffd84d');starPath(px+fs*1.05,rowY+ph/2,fs*.55,fs*.24);g.fill();
 g.textAlign='right';g.textBaseline='middle';fl('#fff');g.fillText(st,W-m-fs*.7,rowY+ph/2+1);
 g.font=F(fs*.62,800);fl('rgba(255,255,255,.85)');
 sk('rgba(10,20,45,.6)',fs*.18);g.lineJoin='round';
 g.strokeText('Рекорд: '+S.best,W-m-fs*.3,rowY+ph+fs*.6);g.fillText('Рекорд: '+S.best,W-m-fs*.3,rowY+ph+fs*.6);
 if(!SETS[S.set].endless){                         // прогресс уровня
  var pt='Сұрақ: '+S.asked+'/'+SETS[S.set].items.length;g.textAlign='left';
  g.strokeText(pt,m+fs*.3,cy2+cph+fs*.6);g.fillText(pt,m+fs*.3,cy2+cph+fs*.6);
 }
 // комбо
 if(S.combo>=2){
  var mult=mn(5,1+Math.floor(S.combo/3)),txt='КОМБО '+S.combo+(mult>1?'  ×'+mult:'');
  g.font=F(fs*.85,900);var cw=g.measureText(txt).width+fs*1.6,ch=fs*1.5;
  var cs=1+cl(S.comboT/.35)*.3;
  g.save();g.translate(W/2,rowY+ph/2);g.scale(cs,cs);
  var cg=g.createLinearGradient(-cw/2,0,cw/2,0);cg.addColorStop(0,'#ff8a3d');cg.addColorStop(1,'#ff3d8a');
  fl(cg);rr(-cw/2,-ch/2,cw,ch,ch/2);g.fill();sk('rgba(255,255,255,.7)',1.5);g.stroke();
  fl('#fff');center();g.fillText(txt,0,1);
  g.restore();
 }
}
function drawCountdown(){
 if(S.cd<=0)return;
 var n=Math.ceil((S.cd-.4)/.6),lt=n>0?(S.cd-.4)/.6-(n-1):S.cd/.4;
 var txt=n>0?String(n):'Алға!',fs=n>0?mn(W*.3,H*.22):mn(W*.2,H*.13);
 var sc=eob(cl((1-lt)*3.5));
 g.save();g.translate(W/2,H*.42);g.scale(sc,sc);g.globalAlpha=cl(lt*4);
 g.font=F(fs,900);center();g.lineJoin='round';
 sk('#14254d',fs*.12);g.strokeText(txt,0,0);
 var gg=g.createLinearGradient(0,-fs*.5,0,fs*.5);gg.addColorStop(0,'#fff6a8');gg.addColorStop(1,'#ff9f1c');
 fl(gg);g.fillText(txt,0,0);
 g.restore();g.globalAlpha=1;
}
function drawSndBtn(){
 var r=mx(18,U*.045),m=mx(12,U*.035);
 sndBtn.x=W-m-r*2;sndBtn.y=H-m-r*2;sndBtn.w=r*2;sndBtn.h=r*2;
 var x=sndBtn.x+r,y=sndBtn.y+r;
 fl('rgba(12,24,52,.55)');dot(x,y,r);
 sk('rgba(255,255,255,.35)',1.5);g.stroke();
 x-=r*.15;                                     // рисунок занимает от -0.42r до +0.74r — центрируем в круге
 fl('#fff');g.beginPath();
 g.moveTo(x-r*.42,y-r*.17);g.lineTo(x-r*.18,y-r*.17);g.lineTo(x+r*.06,y-r*.45);
 g.lineTo(x+r*.06,y+r*.45);g.lineTo(x-r*.18,y+r*.17);g.lineTo(x-r*.42,y+r*.17);
 g.closePath();g.fill();
 g.lineWidth=mx(2,r*.12);g.lineCap='round';
 if(snd){sk('#fff');
  g.beginPath();g.arc(x+r*.1,y,r*.33,-.9,.9);g.stroke();
  g.beginPath();g.arc(x+r*.1,y,r*.58,-.9,.9);g.stroke();
 }else{sk('#ff6b6b');
  g.beginPath();g.moveTo(x+r*.22,y-r*.3);g.lineTo(x+r*.66,y+r*.3);
  g.moveTo(x+r*.66,y-r*.3);g.lineTo(x+r*.22,y+r*.3);g.stroke();}
}
// Кнопка: градиент, объём, бегущий блик
function drawBtn(b,label,c1,c2,c3,pulse,sub){
 var s=1+(pulse?sin(T*4)*.035:0),w=b.w,h=b.h,x=-w/2,y=-h/2;
 g.save();g.translate(b.x+w/2,b.y+h/2);g.scale(s,s);
 fl('rgba(0,0,0,.25)');rr(x,y+h*.14,w,h,h/2);g.fill();
 fl(c3);rr(x,y+h*.08,w,h,h/2);g.fill();
 var gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,c1);gr.addColorStop(1,c2);
 fl(gr);rr(x,y,w,h,h/2);g.fill();
 g.save();rr(x,y,w,h,h/2);g.clip();
 var sx=x-h+((T*.55)%1.6)*(w+h*2);
 fl('rgba(255,255,255,.35)');g.beginPath();g.moveTo(sx,y);g.lineTo(sx+h*.45,y);g.lineTo(sx+h*.05,y+h);g.lineTo(sx-h*.4,y+h);g.fill();
 fl('rgba(255,255,255,.22)');rr(x+h*.25,y+h*.08,w-h*.5,h*.3,h*.15);g.fill();
 g.restore();
 g.lineJoin='round';
 if(sub){                                          // название слева, подпись под ним
  var lx=x+h*.45;g.textAlign='left';g.textBaseline='middle';
  g.font=F(fit(label,h*.36,900,w*.55),900);
  sk(c3,h*.09);g.strokeText(label,lx,-h*.1);fl('#fff');g.fillText(label,lx,-h*.1);
  g.font=F(h*.21,800);fl('rgba(255,255,255,.92)');g.fillText(sub,lx,h*.24);
 }else{
  g.font=F(h*.42,900);center();
  sk(c3,h*.1);g.strokeText(label,0,h*.03);fl('#fff');g.fillText(label,0,h*.03);
 }
 g.restore();
}
function titleText(str,y,fs,c1,c2,ph){        // заголовок с «прыгающими» буквами
 g.font=F(fs,900);g.textAlign='left';g.textBaseline='middle';g.lineJoin='round';
 var tw=0,k;for(k=0;k<str.length;k++)tw+=g.measureText(str[k]).width;
 var sx=W/2-tw/2,gr=g.createLinearGradient(0,y-fs*.5,0,y+fs*.5);
 gr.addColorStop(0,c1);gr.addColorStop(1,c2);
 for(k=0;k<str.length;k++){var c=str[k],dy=sin(T*3.2-k*.45+ph)*fs*.06;
  sk('#14254d',fs*.18);g.strokeText(c,sx,y+dy);
  fl(gr);g.fillText(c,sx,y+dy);
  sx+=g.measureText(c).width;}
}
function overlay(a1,a2){
 var og=g.createLinearGradient(0,0,0,H);og.addColorStop(0,'rgba(8,16,42,'+a1+')');og.addColorStop(1,'rgba(8,16,42,'+a2+')');
 fl(og);fr(0,0,W,H);
}
function drawCard(i,x,y,w,h){
 var sel=S.ch===i,r=w*.12,R=ui.cards[i];
 R.x=x;R.y=y;R.w=w;R.h=h;
 var lift=sel?-h*.03-sin(T*3)*h*.012:0;
 g.save();g.translate(0,lift);
 fl('rgba(0,0,0,.28)');rr(x,y+h*.04,w,h,r);g.fill();
 var gr=g.createLinearGradient(0,y,0,y+h);
 if(sel){gr.addColorStop(0,'#fff8de');gr.addColorStop(1,'#ffcf6e');}
 else{gr.addColorStop(0,'rgba(255,255,255,.78)');gr.addColorStop(1,'rgba(205,220,245,.72)');}
 fl(gr);rr(x,y,w,h,r);g.fill();
 if(sel){                                     // вращающиеся лучи за выбранным героем
  g.save();rr(x,y,w,h,r);g.clip();
  var rx=x+w/2,ry=y+h*.42,RR=h;fl('rgba(255,255,255,.45)');
  for(var k=0;k<12;k++){var a=T*.5+k*TAU/12;
   g.beginPath();g.moveTo(rx,ry);g.lineTo(rx+cos(a-.12)*RR,ry+sin(a-.12)*RR);g.lineTo(rx+cos(a+.12)*RR,ry+sin(a+.12)*RR);g.closePath();g.fill();}
  g.restore();
 }
 rr(x,y,w,h,r);sk(sel?'#ff9f1c':'rgba(255,255,255,.7)',sel?mx(3,w*.025):2);g.stroke();
 drawRunner(i,x+w/2,y+h*.72,h*.56,T*7,sel?3:0,0,0);
 center();
 fl('#1d3557');g.font=F(fit(NAMES[i],h*.1,900,w*.9),900);g.fillText(NAMES[i],x+w/2,y+h*.83);
 fl('#5a6b80');g.font=F(h*.065,800);g.fillText(ROLES[i],x+w/2,y+h*.92);
 if(sel){var bx=x+w-w*.1,by=y+w*.1,br=w*.075;
  fl('#2bb35a');dot(bx,by,br);sk('#fff',br*.3);g.lineCap='round';g.lineJoin='round';
  g.beginPath();g.moveTo(bx-br*.45,by);g.lineTo(bx-br*.1,by+br*.38);g.lineTo(bx+br*.5,by-br*.35);g.stroke();}
 g.restore();
}
function drawStart(){
 overlay(.55,.3);
 g.globalAlpha=cl(S.scrT*3);
 var ts=fit('Зерде',mn(W*.16,H*.095,84),900,W*.86),y=mx(ts*.9,H*.1);
 titleText('Зерде',y,ts,'#ffffff','#bfe4ff',0);y+=ts*1.08;
 titleText('Run',y,ts,'#ffe066','#ff7a3d',1);y+=ts*.95;
 center();fl('rgba(255,255,255,.92)');g.font=F(ts*.34,800);
 g.font=F(fit('Дұрыс сөзден өт, тиын жина, тастан секір!',ts*.34,800,W*.92),800);
 g.fillText('Дұрыс сөзден өт, тиын жина, тастан секір!',W/2,y);y+=ts*.72;
 fl('#ffd84d');g.font=F(ts*.3,900);g.fillText('Кейіпкерді таңда',W/2,y);y+=ts*.45;
 // карточки: до трёх героев — в один ряд, больше — в портрете сеткой по 2
 var NC=NAMES.length,cols=W>H*1.1||NC<=3?NC:2,rows=Math.ceil(NC/cols),gap=mn(W*.03,18),k;
 var bh=mn(H*.085,64,U*.15),bw=mn(W*.62,300);
 var fs=fit('Телефон: свайп ← → немесе экранды бас, ↑ — секіру',mn(W*.034,H*.024,16),700,W*.9);
 var mh=mn(H*.1,96,U*.2),mlab=ts*.42;              // ряд выбора карты
 var avail=H-y-(bh*1.6+fs*5.6+mx(16,H*.035)+mh+mlab+mx(10,H*.02));
 var cw=mn((W-gap*(cols+1))/cols,210),chh=mn(cw*1.3,(avail-gap*(rows-1))/rows);
 cw=mn(cw,chh/1.05);
 var gx=W/2-(cols*cw+(cols-1)*gap)/2,slide=(1-eob(cl(S.scrT*2.2)))*H*.15;
 g.save();g.translate(0,slide);
 for(k=0;k<NC;k++)drawCard(k,gx+(k%cols)*(cw+gap),y+Math.floor(k/cols)*(chh+gap),cw,chh);
 g.restore();
 y+=rows*chh+(rows-1)*gap+mx(10,H*.02);
 center();fl('#ffd84d');g.font=F(ts*.26,900);g.fillText('Картаны таңда',W/2,y+mlab*.4);y+=mlab;
 var mw=mn(mh*1.75,(W-gap*3)/2),mx0=W/2-mw-gap/2;
 for(k=0;k<MAPS.length;k++)drawMapCard(k,mx0+k*(mw+gap),y,mw,mh);
 y+=mh+mx(16,H*.035);
 ui.btn.x=(W-bw)/2;ui.btn.y=y;ui.btn.w=bw;ui.btn.h=bh;
 drawBtn(ui.btn,'Бастау','#ffd166','#ff9f1c','#c96a0a',!S.help);
 y+=bh*1.35;
 var hh2=mn(bh*.72,fs*3),hl='?  Қалай ойнау';g.font=F(hh2*.42,900);   // кнопка инструкции
 var hw=g.measureText(hl).width+hh2*1.4,hR=ui.help;hR.x=(W-hw)/2;hR.y=y;hR.w=hw;hR.h=hh2;
 pill(hR.x,hR.y,hw,hh2);center();fl('#fff');g.fillText(hl,W/2,y+hh2/2+1);
 g.globalAlpha=1;
 if(S.help)drawHelp();
}
// Карточка карты: миниатюра + название
function drawMapCard(i,x,y,w,h){
 var sel=S.map===i,r=h*.16,R=ui.maps[i];R.x=x;R.y=y;R.w=w;R.h=h;
 fl('rgba(0,0,0,.28)');rr(x,y+h*.05,w,h,r);g.fill();
 g.save();rr(x,y,w,h,r);g.clip();
 if(i===1&&AST.complete&&AST.naturalWidth){var iw=AST.naturalWidth,ih=AST.naturalHeight,sc=mx(w/iw,h/ih);
  g.drawImage(AST,x+(w-iw*sc)/2,y+h-ih*sc,iw*sc,ih*sc);}
 else{var sg=g.createLinearGradient(0,y,0,y+h);sg.addColorStop(0,'#2f8fdc');sg.addColorStop(.55,'#bfe6f7');sg.addColorStop(.56,'#8fcb68');sg.addColorStop(1,'#6aae70');
  fl(sg);fr(x,y,w,h);fl('#a9bfdc');g.beginPath();g.moveTo(x,y+h*.56);g.lineTo(x+w*.25,y+h*.22);g.lineTo(x+w*.5,y+h*.56);
  g.lineTo(x+w*.72,y+h*.3);g.lineTo(x+w,y+h*.56);g.fill();
  fl('#d6cfbd');g.beginPath();g.moveTo(x+w*.47,y+h*.56);g.lineTo(x+w*.53,y+h*.56);g.lineTo(x+w*.78,y+h);g.lineTo(x+w*.22,y+h);g.fill();
  drawYurt(x+w*.14,y+h*.8,h*.5);}
 var lg=g.createLinearGradient(0,y+h*.55,0,y+h);lg.addColorStop(0,'rgba(0,0,0,0)');lg.addColorStop(1,'rgba(0,0,0,.6)');
 fl(lg);fr(x,y+h*.55,w,h*.45);
 center();fl('#fff');g.font=F(fit(MAPS[i],h*.2,900,w*.9),900);g.fillText(MAPS[i],x+w/2,y+h*.84);
 g.restore();
 rr(x,y,w,h,r);sk(sel?'#ffd84d':'rgba(255,255,255,.5)',sel?mx(3,h*.04):1.5);g.stroke();
 if(sel){var br=h*.1,bx=x+w-br*1.5,by=y+br*1.5;fl('#2bb35a');dot(bx,by,br);sk('#fff',br*.3);g.lineCap='round';g.lineJoin='round';
  g.beginPath();g.moveTo(bx-br*.45,by);g.lineTo(bx-br*.1,by+br*.38);g.lineTo(bx+br*.5,by-br*.35);g.stroke();}
}
/* --- Окно «Қалай ойнау»: правила с иконками --- */
var HELP=[['gate','Сұрақты оқы — дұрыс сөз жазылған қақпадан өт'],
 ['lane','Жолақ ауыстыр: ← → / A D · телефонда солға-оңға свайп'],
 ['jump','Тас пен бөренеден секір: ↑ / Пробел · телефонда жоғары свайп'],
 ['coin','Жолдағы тиындарды жина'],
 ['heart','3 жүрек бар: қате жауап не соқтығысу — бір жүрек кетеді'],
 ['star','Деңгейді аяқта: қалған жүрек саны — жұлдыз саны']];
function helpIcon(k,x,y,s){
 if(k==='gate'){for(var j=0;j<3;j++){var gx=x+(j-1)*s*.34;fl(SCOL[j][0]);rr(gx-s*.15,y-s*.32,s*.3,s*.26,s*.05);g.fill();
   fl(SCOL[j][1]);fr(gx-s*.15,y-s*.06,s*.04,s*.38);fr(gx+s*.11,y-s*.06,s*.04,s*.38);}
  sk('#2bb35a',mx(2,s*.08));g.lineCap='round';g.lineJoin='round';g.beginPath();
  g.moveTo(x+s*.24,y-s*.2);g.lineTo(x+s*.32,y-s*.12);g.lineTo(x+s*.46,y-s*.3);g.stroke();}
 else if(k==='lane'){sk('#2383c9',mx(2,s*.1));g.lineCap='round';g.lineJoin='round';
  for(var d=-1;d<=1;d+=2){g.beginPath();g.moveTo(x+d*s*.1,y);g.lineTo(x+d*s*.42,y);
   g.moveTo(x+d*s*.28,y-s*.15);g.lineTo(x+d*s*.43,y);g.lineTo(x+d*s*.28,y+s*.15);g.stroke();}}
 else if(k==='jump'){drawRock(x,y+s*.38,s*.75);
  sk('#ff9f1c',mx(2,s*.09));g.lineCap='round';g.beginPath();g.moveTo(x-s*.4,y+s*.1);g.quadraticCurveTo(x,y-s*.75,x+s*.4,y+s*.1);g.stroke();
  fl('#ff9f1c');g.beginPath();g.moveTo(x+s*.45,y+s*.18);g.lineTo(x+s*.3,y+s*.08);g.lineTo(x+s*.46,y-s*.02);g.fill();}
 else if(k==='coin')coinIcon(x,y,s*.3);
 else if(k==='heart')heart(x,y,s*.5,true);
 else{fl('#ffc21a');starPath(x,y,s*.36,s*.16);g.fill();sk('#c98a00',mx(1.5,s*.05));g.stroke();}
}
function drawHelp(){
 var a=eob(cl(S.helpT*3));
 g.globalAlpha=cl(S.helpT*4);fl('rgba(6,12,30,.7)');fr(0,0,W,H);
 var w=mn(W*.92,560),fsT=fit('Қалай ойнау керек?',mn(w*.075,40),900,w*.85),fs=mn(w*.042,H*.028,19);
 var row=mx(fs*2.6,mn(H*.075,64)),bh=mn(H*.075,56),h=fsT*2+HELP.length*row+bh*1.9;
 if(h>H*.94){row*=(H*.94-fsT*2-bh*1.9)/(HELP.length*row);h=H*.94;}
 var x=(W-w)/2,y=(H-h)/2;
 g.save();g.translate(W/2,H/2);g.scale(.85+.15*a,.85+.15*a);g.translate(-W/2,-H/2);
 fl('rgba(0,0,0,.3)');rr(x,y+h*.015,w,h,w*.05);g.fill();
 var gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#fffaf0');gr.addColorStop(1,'#ffe9bf');
 fl(gr);rr(x,y,w,h,w*.05);g.fill();sk('#ff9f1c',mx(3,w*.008));g.stroke();
 center();fl('#1d3557');g.font=F(fsT,900);g.fillText('Қалай ойнау керек?',W/2,y+fsT*1.05);
 var iy=y+fsT*2,ic=mn(row*.8,fs*2.4),tx=x+w*.06+ic*1.25;
 for(var i=0;i<HELP.length;i++){var cy=iy+row*(i+.5);
  fl(i%2?'rgba(255,159,28,.08)':'rgba(35,131,201,.08)');rr(x+w*.03,cy-row*.46,w*.94,row*.92,row*.25);g.fill();
  helpIcon(HELP[i][0],x+w*.06+ic*.55,cy,ic);
  fl('#ff9f1c');g.font=F(fs*.9,900);g.textAlign='left';g.textBaseline='middle';
  var t=HELP[i][1],maxW=x+w*.95-tx;g.font=F(fit(t,fs,700,maxW*1.9),700);fl('#2a3b55');
  if(g.measureText(t).width<=maxW)g.fillText(t,tx,cy);
  else{var ws=t.split(' '),l1='',k2=0;              // перенос на две строки
   for(k2=0;k2<ws.length;k2++){var tt=l1?l1+' '+ws[k2]:ws[k2];if(g.measureText(tt).width>maxW)break;l1=tt;}
   var lh=parseFloat(g.font.match(/(\d+)px/)[1])*1.15;
   g.fillText(l1,tx,cy-lh/2);g.fillText(ws.slice(k2).join(' '),tx,cy+lh/2);}
 }
 var bw=mn(w*.6,260),B=ui.helpOk;B.x=(W-bw)/2;B.y=y+h-bh*1.45;B.w=bw;B.h=bh;
 drawBtn(B,'Түсіндім!','#7ad860','#3f9e33','#2c7a24',true);
 g.restore();g.globalAlpha=1;
}
function openHelp(){S.help=true;S.helpT=0;sfxSelect();}
function closeHelp(){S.help=false;sfxTick();try{localStorage.setItem('mm_help','1');}catch(e){}}
// Экран выбора категории и уровня
function drawMode(){
 overlay(.6,.4);
 g.globalAlpha=cl(S.scrT*3);
 var ts=fit('Санатты таңда',mn(W*.1,H*.065,56),900,W*.86),y=mx(ts*.9,H*.09),k,j;
 titleText('Санатты таңда',y,ts,'#ffffff','#bfe4ff',0);y+=ts*.95;
 var bw=mn(W*.88,480),bh=mn(H*.1,72,U*.18),gp=bh*.3,x=(W-bw)/2;
 var need=bh*4+gp*4+bh*.6+bh*.75,room=H-y-mx(12,H*.03);
 if(need>room){var f=room/need;bh*=f;gp*=f;}
 for(k=0;k<SETS.length;k++){
  if(k===1){center();fl('#ffd84d');g.font=F(bh*.32,900);g.fillText('Фразеологизмдер',W/2,y+bh*.28);y+=bh*.6;}
  var st=SETS[k],r=ui.modes[k],e=eob(cl(S.scrT*3.5-k*.2)),sel=k===S.modeSel;
  r.x=x;r.y=y;r.w=bw;r.h=bh;
  g.save();g.translate((1-e)*W*.5,0);
  if(sel){fl('rgba(255,255,255,'+(.55+sin(T*5)*.25).toFixed(3)+')');rr(x-5,y-5,bw+10,bh+10,(bh+10)/2);g.fill();}
  drawBtn(r,st.name,st.c[0],st.c[1],st.c[2],sel,st.sub);
  var rx=x+bw-bh*.45,cy=y+bh/2;
  if(st.endless){
   g.textAlign='right';g.textBaseline='middle';fl('#fff');g.font=F(bh*.2,800);
   g.fillText('Рекорд',rx,cy-bh*.15);g.font=F(bh*.32,900);g.fillText(String(st.best),rx,cy+bh*.17);
  }else{
   var sr=bh*.13;
   for(j=0;j<3;j++){var sx=rx-(2-j)*sr*2.4-sr;
    fl(j<st.stars?'#ffe14d':'rgba(255,255,255,.35)');starPath(sx,cy,sr,sr*.45);g.fill();
    if(j<st.stars){sk('#c98a00',mx(1,sr*.12));g.lineJoin='round';g.stroke();}}
  }
  g.restore();
  y+=bh+gp;
 }
 var b=ui.back;b.w=mn(bw*.45,200);b.h=bh*.72;b.x=(W-b.w)/2;b.y=y+gp*.2;
 drawBtn(b,'← Артқа','#c3cfe0','#8a9bb5','#5d6e88',false);
 g.globalAlpha=1;
}
function drawOver(){
 overlay(.6,.45);
 var w=mn(W*.94,560),h=mn(H*.94,w*1.5),top=(H-h)/2,e=eob(cl(S.scrT*2.8)),k;
 g.save();g.translate(W/2,H/2);g.scale(e,e);g.translate(-W/2,-H/2);
 var x=(W-w)/2;
 fl('rgba(0,0,0,.3)');rr(x,top+8,w,h,U*.05);g.fill();
 var pg=g.createLinearGradient(0,top,0,top+h);pg.addColorStop(0,'#ffffff');pg.addColorStop(1,'#e8f0ff');
 fl(pg);rr(x,top,w,h,U*.05);g.fill();sk('rgba(255,255,255,.9)',3);g.stroke();
 center();
 var y=top+h*.075,st=SETS[S.set];
 fl(S.won?'#2e9d4a':'#e0403a');g.font=F(mn(w*.085,h*.058),900);g.fillText(S.won?'Жарайсың!':'Ойын аяқталды',W/2,y);
 y+=h*.055;fl('#7a8aa0');g.font=F(mn(w*.036,h*.026),800);
 g.fillText(st.endless?st.name:(S.won?'Деңгей өтілді • ':'')+'Фразеологизм • '+st.name,W/2,y);
 y+=h*.085;
 var sr=mn(w*.07,h*.048),earned=S.earned;
 for(k=0;k<3;k++){                                 // звёзды появляются по очереди
  var q=cl((S.scrT-.4-k*.25)*4),big=k===1?1.25:1,sx=W/2+(k-1)*sr*2.7,sy=y-(k===1?sr*.3:0);
  fl('#d5dbe5');starPath(sx,sy,sr*big,sr*big*.45);g.fill();
  if(k<earned&&q>0){
   if(S.starSnd<=k){S.starSnd=k+1;sfxStar(k);burst(sx,sy,12,['#ffd84d','#fff6a8'],U*.4,1,U*.012,U*.5);}
   var sc=eob(q),sgr=g.createLinearGradient(0,sy-sr,0,sy+sr);sgr.addColorStop(0,'#fff176');sgr.addColorStop(1,'#ffb300');
   fl(sgr);starPath(sx,sy,sr*big*sc,sr*big*sc*.45);g.fill();
   sk('#e08a00',mx(1.5,sr*.08));g.lineJoin='round';g.stroke();
  }
 }
 y+=sr*1.9;
 fl('#7a8aa0');g.font=F(mn(w*.035,h*.026),900);g.fillText('ҰПАЙ',W/2,y);y+=h*.055;
 fl('#1d3557');g.font=F(mn(w*.13,h*.085),900);
 g.fillText(String(Math.round(S.score*cl((S.scrT-.3)/1))),W/2,y);y+=h*.075;
 if(S.newBest){
  var bs=1+sin(T*6)*.05,bt='ЖАҢА РЕКОРД!';g.font=F(mn(w*.045,h*.032),900);
  var bw=g.measureText(bt).width+w*.08,bh=mn(w*.045,h*.032)*1.8;
  g.save();g.translate(W/2,y);g.scale(bs,bs);g.rotate(-.03);
  var bg=g.createLinearGradient(-bw/2,0,bw/2,0);bg.addColorStop(0,'#ff3d8a');bg.addColorStop(1,'#ff9f1c');
  fl(bg);rr(-bw/2,-bh/2,bw,bh,bh/2);g.fill();fl('#fff');g.fillText(bt,0,1);
  g.restore();
 }else{fl('#5a6b80');g.font=F(mn(w*.042,h*.03),800);g.fillText('Рекорд: '+S.best,W/2,y);}
 y+=h*.065;
 fl('#2e9d4a');g.font=F(mn(w*.04,h*.03),800);
 g.fillText('Дұрыс: '+S.correct+(st.endless?'':'/'+st.items.length)+'   •   Ең ұзақ комбо: '+S.maxCombo,W/2,y);y+=h*.05;
 var ct='Тиын: '+S.coins+'   •   Барлығы: '+S.coinTotal,cfs=mn(w*.04,h*.03);g.font=F(cfs,800);
 var ctw=g.measureText(ct).width;coinIcon(W/2-ctw/2-cfs*.8,y,cfs*.55);
 fl('#c98a00');g.fillText(ct,W/2+cfs*.1,y);y+=h*.06;
 var bh2=mn(h*.1,58),btnY=top+h-bh2-h*.06,fsI=mn(w*.034,h*.027);
 var key=S.set+':'+S.mistakes.join(',')+'|'+W+'|'+H;
 if(overC.key!==key){                       // список ошибок готовится один раз
  overC.lines.length=0;
  var tmp=[];
  for(var i=0;i<S.mistakes.length&&i<4;i++){
   wrap('• '+full(st.items[S.mistakes[i]]),w*.86,fsI,700,tmp);
   for(var j=0;j<tmp.length&&j<2;j++)overC.lines.push(tmp[j]);
  }
  overC.key=key;
 }
 if(overC.lines.length){
  var room=Math.floor((btnY-y-h*.04)/(fsI*1.3))-1;
  if(room>0){
   fl('#c0661a');g.font=F(mn(w*.038,h*.029),900);
   g.fillText(st.miss,W/2,y);y+=fsI*1.5;
   fl('#3c4a5c');g.font=F(fsI,700);
   for(k=0;k<overC.lines.length&&k<room;k++){g.fillText(overC.lines[k],W/2,y);y+=fsI*1.3;}
  }
 }
 var b1w=w*.54,b2w=w*.32,gx=w*.04,bx0=W/2-(b1w+b2w+gx)/2;
 ui.btn.x=bx0;ui.btn.y=btnY;ui.btn.w=b1w;ui.btn.h=bh2;
 ui.btn2.x=bx0+b1w+gx;ui.btn2.y=btnY;ui.btn2.w=b2w;ui.btn2.h=bh2;
 if(S.nextSet>=0)drawBtn(ui.btn,'Келесі деңгей','#8be07a','#3fae4a','#2a7a32',S.scrT>.8);
 else drawBtn(ui.btn,'Қайта ойнау','#ffd166','#ff9f1c','#c96a0a',S.scrT>.8);
 drawBtn(ui.btn2,'Мәзір','#7fc8ff','#3a8de0','#22609e',false);
 g.restore();
}

/* === 15. КАДР === */
function draw(){
 updPal();
 g.save();
 if(S.shake>0){var m=S.shake*16;g.translate((rnd()-.5)*m,(rnd()-.5)*m);}
 if(S.map===1)drawAstanaBg();
 else{drawSky();
  mountains(PK1,.08,mn(U*.38,hzY*.7),P.mF,true);
  mountains(PK2,.16,mn(U*.26,hzY*.5),P.mN,false);
  hills(.35,.5,P.hF);hills(.6,.34,P.hN);haze();}
 drawRoad();drawDecs();
 sortObjs();var gz=gate.on?gate.z:PLR_Z;
 drawObjs(gz,1e9);drawGate();drawObjs(PLR_Z,gz);
 if(S.screen==='play')drawPlayer();
 drawObjs(-1e9,PLR_Z);
 g.restore();
 drawSpeed();
 fl(vign);fr(0,0,W,H);
 drawFlash();
 if(S.screen==='play'){drawHUD();drawCountdown();}
 else if(S.screen==='start')drawStart();else if(S.screen==='mode')drawMode();else drawOver();
 drawParts();drawFloats();
 drawSndBtn();
}

/* === 16. УПРАВЛЕНИЕ: клавиатура, свайпы, тапы === */
function modeStep(d){S.modeSel=(S.modeSel+d+SETS.length)%SETS.length;sfxMove();}
function inRect(r,x,y,p){return x>=r.x-p&&x<=r.x+r.w+p&&y>=r.y-p&&y<=r.y+r.h+p;}
window.addEventListener('keydown',function(e){
 var k=e.key;ensureAudio();
 if(S.help){if(k==='Escape'||k==='Enter'||k===' '){closeHelp();e.preventDefault();}return;}   // открыта инструкция
 if(S.screen==='start'&&(k==='h'||k==='H'||k==='?'||k==='р'||k==='Р')){openHelp();return;}
 if(k==='ArrowLeft'||k==='a'||k==='A'||k==='ф'||k==='Ф'){if(S.screen==='start')selectChar((S.ch+NAMES.length-1)%NAMES.length);else if(S.screen==='mode')modeStep(-1);else move(-1);e.preventDefault();}
 else if(k==='ArrowRight'||k==='d'||k==='D'||k==='в'||k==='В'){if(S.screen==='start')selectChar((S.ch+1)%NAMES.length);else if(S.screen==='mode')modeStep(1);else move(1);e.preventDefault();}
 else if(k==='ArrowUp'||k==='w'||k==='W'||k==='ц'||k==='Ц'){if(S.screen==='mode')modeStep(-1);else if(S.screen==='start')selectMap((S.map+MAPS.length-1)%MAPS.length);else jump();e.preventDefault();}
 else if(k==='ArrowDown'||k==='s'||k==='S'||k==='ы'||k==='Ы'){if(S.screen==='mode')modeStep(1);else if(S.screen==='start')selectMap((S.map+1)%MAPS.length);e.preventDefault();}
 else if(k>='1'&&k<='4'){if(S.screen==='mode')startGame(+k-1);}
 else if(k===' '||k==='Enter'){
  if(S.screen==='start')toModes();
  else if(S.screen==='mode')startGame(S.modeSel);
  else if(S.screen==='over'&&S.scrT>.5)startGame(S.nextSet>=0?S.nextSet:S.set);
  else jump();
  e.preventDefault();}
 else if(k==='Escape'){if(S.screen==='over')toModes();else if(S.screen==='mode')toMenu();}
 else if(k==='m'||k==='M'||k==='ь'||k==='Ь')toggleSnd();
});
var tx=0,ty=0,track=false;
cv.addEventListener('pointerdown',function(e){tx=e.clientX;ty=e.clientY;track=true;ensureAudio();e.preventDefault();},{passive:false});
cv.addEventListener('pointerup',function(e){
 if(!track)return;
 track=false;
 var x=e.clientX,y=e.clientY,dx=x-tx,dy=y-ty,lim=mx(24,U*.06);
 if(S.help){closeHelp();return;}                  // любой тап закрывает инструкцию
 if(S.screen==='play'&&-dy>lim&&abs(dy)>abs(dx)){jump();return;}   // свайп вверх — прыжок
 if(abs(dx)>lim&&abs(dx)>abs(dy)){if(S.screen==='start')selectChar((S.ch+(dx>0?1:NAMES.length-1))%NAMES.length);else if(S.screen==='play')move(dx>0?1:-1);return;}
 if(inRect(sndBtn,x,y,6)){toggleSnd();return;}   // короткий тап
 if(S.screen==='start'){
  if(inRect(ui.help,x,y,6)){openHelp();return;}
  for(var mi=0;mi<MAPS.length;mi++)if(inRect(ui.maps[mi],x,y,4)){selectMap(mi);return;}
  for(var i=0;i<NAMES.length;i++)if(inRect(ui.cards[i],x,y,4)){selectChar(i);return;}
  toModes();return;
 }
 if(S.screen==='mode'){
  for(var j=0;j<SETS.length;j++)if(inRect(ui.modes[j],x,y,4)){startGame(j);return;}
  if(inRect(ui.back,x,y,6))toMenu();
  return;
 }
 if(S.screen==='over'){
  if(S.scrT<.6)return;
  if(inRect(ui.btn2,x,y,6))toModes();else if(inRect(ui.btn,x,y,6))startGame(S.nextSet>=0?S.nextSet:S.set);
  return;
 }
 move(x<W/2?-1:1);
},{passive:false});
cv.addEventListener('pointercancel',function(){track=false;});
cv.addEventListener('contextmenu',function(e){e.preventDefault();});

/* === 17. ЦИКЛ С DELTA TIME === */
var last=0;
function loop(ts){
 requestAnimationFrame(loop);
 var dt=(ts-last)/1000;last=ts;
 if(!(dt>0))dt=0;
 if(dt>.05)dt=.05;        // защита от скачков после сворачивания вкладки
 update(dt);draw();
}
loadSave();resize();shuffle();
// После загрузки шрифта сбрасываем кэш переносов строк
if(document.fonts&&document.fonts.load){
 Promise.all([document.fonts.load('900 20px Nunito','Әәғқң'),document.fonts.load('800 20px Nunito','Әәғқң'),
  document.fonts.load('700 20px Nunito','Әәғқң')]).then(function(){banner.key='';overC.key='';},function(){});
}
requestAnimationFrame(loop);
})();
