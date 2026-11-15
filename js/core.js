/* Shared helpers, state, animations, theme */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const TABS={
 Transactions:["id","date","type","amount","categoryId","note","loanId","billId"],
 Categories:["id","name","color"],
 Budgets:["id","categoryId","amount"],
 Loans:["id","name","principal","date"],
 Bills:["id","name","amount","categoryId","day","auto","lastPaid"],
 Settings:["key","value"]};
const NUMS=["amount","principal","day"];
const DEF=[["Food","#f97316"],["Transport","#3b82f6"],["Bills","#8b5cf6"],["Shopping","#ec4899"],["Health","#10b981"],["Fun","#eab308"],["Other","#64748b"]];
let D={Transactions:[],Categories:[],Budgets:[],Loans:[],Bills:[],Settings:[]};
const reduced=()=>matchMedia("(prefers-reduced-motion:reduce)").matches;
const esc=t=>String(t??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const S=k=>(D.Settings.find(x=>x.key===k)||{}).value||"";
const setS=(k,v)=>{const r=D.Settings.find(x=>x.key===k);r?r.value=v:D.Settings.push({key:k,value:v})};
const money=n=>(n<0?"-":"")+(S("currency")||"$")+Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const cat=id=>D.Categories.find(c=>c.id===id)||{name:"Other",color:"#64748b"};
const sum=(a,f)=>a.reduce((s,t)=>s+(f(t)?t.amount:0),0);
const mAdd=(m,n)=>{const[y,mo]=m.split("-").map(Number);return iso(new Date(y,mo-1+n,1)).slice(0,7)};
const budOf=id=>(D.Budgets.find(b=>b.categoryId===id)||{}).amount||0;
const curTheme=()=>document.documentElement.dataset.theme;

/* ---------- motion ---------- */
const PAL=["#14b8a6","#6366f1","#f97316","#ec4899","#eab308","#10b981"];
let lastBtn=null,lastClick=0;
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;lastBtn=b;lastClick=Date.now();
 if(!b.matches(".btn,.seg button,.icon-btn,nav button,.mini,.chip")||reduced())return;
 const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*2,p=document.createElement("span");p.className="ripple";
 p.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;b.append(p);p.onanimationend=()=>p.remove()},true);
function burst(el){if(!el||reduced())return;const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
 for(let i=0;i<20;i++){const p=document.createElement("i");p.className="fx";p.style.cssText=`left:${x}px;top:${y}px;background:${PAL[i%6]}`;document.body.append(p);
  const a=Math.random()*Math.PI*2,d=50+Math.random()*90;
  p.animate([{transform:"translate(-50%,-50%) scale(1)",opacity:1},{transform:`translate(calc(-50% + ${Math.cos(a)*d}px),calc(-50% + ${Math.sin(a)*d+45}px)) rotate(${Math.random()*600}deg) scale(.3)`,opacity:0}],{duration:700+Math.random()*450,easing:"cubic-bezier(.1,.7,.3,1)"}).onfinish=()=>p.remove()}}
const _cv={};
function countUp(el,to,key,fmt=money){const from=_cv[key]??0;_cv[key]=to;const id=el._id=(el._id||0)+1;
 if(reduced()||from===to){el.textContent=fmt(to);return}
 const t0=performance.now();(function f(t){if(el._id!==id)return;const k=Math.min(1,(t-t0)/850),e=1-Math.pow(1-k,4);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(f)})(t0)}
const fillBars=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>$$("[data-w]").forEach(i=>{i.style.width=i.dataset.w+"%"})));
const stagger=()=>$$(".page:not([hidden]) .card").forEach((c,i)=>c.style.setProperty("--i",i));
function pill(){const b=$("#nav button.on"),p=$("#nav .pill");if(b&&p){p.style.width=b.offsetWidth+"px";p.style.transform=`translateX(${b.offsetLeft}px)`}}
addEventListener("resize",pill);
function toast(msg,ok=true,fx=true){const t=document.createElement("div");t.className="toast "+(ok?"ok":"bad");
 t.innerHTML=`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="${ok?"M7.5 12.5l3 3 6-6.5":"M8 8l8 8M16 8l-8 8"}"/></svg>${esc(msg)}`;
 document.body.append(t);setTimeout(()=>t.remove(),3000);
 if(ok&&fx&&Date.now()-lastClick<2000)burst(lastBtn&&lastBtn.isConnected?lastBtn:t)}
const flash=el=>{el.classList.remove("flash");void el.offsetWidth;el.classList.add("flash")};
function chip(s){const c=$("#sync");c.className="chip "+s;c.textContent={busy:"Syncing…",ok:"✓ Synced",err:navigator.onLine?"⚠ Tap to retry":"⚠ Offline · saved here"}[s]}

/* ---------- theme (circular reveal) ---------- */
function applyTheme(t,x=innerWidth-40,y=40,animate=true){
 const go=()=>{document.documentElement.dataset.theme=t;localStorage.theme=t;$("#theme").textContent=t==="dark"?"🌙":"☀️";
  document.querySelector('meta[name=theme-color]').content=t==="dark"?"#0a111d":"#eef2f7"};
 if(!animate||reduced()){go();return}
 const r=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y)),kf={clipPath:[`circle(0 at ${x}px ${y}px)`,`circle(${r}px at ${x}px ${y}px)`]};
 if(document.startViewTransition){document.startViewTransition(()=>{go();redrawCharts()}).ready.then(()=>document.documentElement.animate(kf,{duration:700,easing:"cubic-bezier(.65,0,.35,1)",pseudoElement:"::view-transition-new(root)"}))}
 else{const o=document.createElement("div");o.style.cssText="position:fixed;inset:0;z-index:99;pointer-events:none;background:"+(t==="dark"?"#0a111d":"#eef2f7");
  document.body.append(o);o.animate(kf,{duration:700,easing:"cubic-bezier(.65,0,.35,1)"}).onfinish=()=>{go();redrawCharts();o.remove()}}}

/* ---------- bottom sheet ---------- */
function openSheet(title,body,{onSave,onDelete,saveLabel="Save"}={}){
 const s=$("#sheet");$("#sheetBody").innerHTML=`<div class="grab"></div><h3>${esc(title)}</h3>${body}<button class="btn" id="shSave">${saveLabel}</button>${onDelete?'<button class="btn alt" id="shDel">Delete</button>':""}<button class="btn ghost" id="shX">Cancel</button>`;
 s.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>s.classList.add("open")));
 $("#shX").onclick=closeSheet;$("#shSave").onclick=()=>{if(onSave()!==false)closeSheet()};
 if(onDelete)$("#shDel").onclick=()=>{if(confirm("Delete this? This can't be undone.")){closeSheet();onDelete()}}}
function closeSheet(){const s=$("#sheet");s.classList.remove("open");setTimeout(()=>{if(!s.classList.contains("open"))s.hidden=true},500)}
$(".scrim").onclick=closeSheet;addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
