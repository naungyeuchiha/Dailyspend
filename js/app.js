/* Pages, editing, loans, recurring bills */
let addType="expense",charts=[],tab="tx",current="";
const ROUTES=["home","dash","tx","set"];
const ymNow=()=>iso(new Date()).slice(0,7);
const dueDay=b=>Math.min(Math.max(1,+b.day||1),new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate());
const unpaid=()=>D.Bills.filter(b=>b.lastPaid!==ymNow());
const loanPaid=id=>sum(D.Transactions,t=>t.loanId===id&&t.type==="expense");
const catOpts=sel=>D.Categories.filter(c=>c.id!=="loanpay"||c.id===sel).map(c=>`<option value="${c.id}"${c.id===sel?" selected":""}>${esc(c.name)}</option>`).join("");
const emptyMsg=t=>`<div class="empty">${t}</div>`;

function daily(){const n=new Date(),tx=D.Transactions.filter(t=>t.date.startsWith(ymNow()));
 const inc=sum(tx,t=>t.type!=="expense"),exp=sum(tx,t=>t.type==="expense"),bud=budOf("ALL"),base=bud||inc,res=sum(unpaid(),()=>true);
 const dim=new Date(n.getFullYear(),n.getMonth()+1,0).getDate(),days=dim-n.getDate()+1,rem=base-exp-res;
 return{rem,days,res,per:rem/days,src:bud?"monthly budget":"this month's income",today:sum(D.Transactions,t=>t.date===iso(n)&&t.type==="expense")}}

/* ----- recurring bills ----- */
function payBill(b,date=iso(new Date())){D.Transactions.push({id:uid(),date,type:"expense",amount:b.amount,categoryId:b.categoryId,note:b.name,loanId:"",billId:b.id});b.lastPaid=ymNow();dirty.add("Bills");dirty.add("Transactions")}
function autoBills(){const d=new Date().getDate();let n=0;
 D.Bills.forEach(b=>{if(String(b.auto)==="1"&&b.lastPaid!==ymNow()&&d>=dueDay(b)){payBill(b,ymNow()+"-"+String(dueDay(b)).padStart(2,"0"));n++}});
 if(n)toast(n+" recurring bill"+(n>1?"s":"")+" added",true,false)}

/* ----- navigation ----- */
function go(p){if(!ROUTES.includes(p))p="home";current=p;location.hash=p;
 $$(".page").forEach(s=>s.hidden=s.id!=="p-"+p);const pg=$("#p-"+p);pg.classList.add("enter");setTimeout(()=>pg.classList.remove("enter"),1400);
 $$("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.p===p));pill();render();stagger();scrollTo({top:0})}
$("#nav").onclick=e=>{const b=e.target.closest("button");if(b)go(b.dataset.p)};
addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(user&&h!==current)go(h)});
function render(){if(!user)return;({home:rHome,dash:rDash,tx:rTx,set:rSet}[current]||rHome)()}
const redrawCharts=()=>{if(current==="dash"&&user)rDash()};

/* ----- home ----- */
function rHome(){const d=daily();
 $("#daily").innerHTML=`<small>Available per day</small><div class="big" id="dbig"></div><small>${money(d.rem)} left of ${d.src}${d.res?` after ${money(d.res)} reserved for bills`:""} ÷ ${d.days} days left (incl. today)<br>Spent today: ${money(d.today)}</small>`;
 countUp($("#dbig"),d.per,"daily");
 const v=$("#cat").value;$("#cat").innerHTML=catOpts("");if(v)$("#cat").value=v;
 if(!$("#dt").value)$("#dt").value=iso(new Date());
 const ub=unpaid().sort((a,b)=>dueDay(a)-dueDay(b)),td=new Date().getDate();
 $("#billsCard").hidden=!ub.length;
 $("#billsDue").innerHTML=ub.map((b,i)=>{const dd=dueDay(b)-td;return`<div class="item" style="--i:${i}"><span class="dot" style="background:${cat(b.categoryId).color}"></span><div>${esc(b.name)}<small>${dd<0?"Overdue by "+-dd+" day"+(dd<-1?"s":""):dd===0?"Due today":"Due in "+dd+" day"+(dd>1?"s":"")} · ${money(b.amount)}</small></div><button class="mini" data-pay="${b.id}">Pay</button></div>`}).join("");
 const open=D.Loans.filter(l=>l.principal-loanPaid(l.id)>0.004);
 $("#pl").innerHTML=open.length?open.map(l=>`<option value="${l.id}">${esc(l.name)} · owe ${money(l.principal-loanPaid(l.id))}</option>`).join(""):'<option value="">No open loans</option>'}
$("#billsDue").onclick=e=>{const b=D.Bills.find(x=>x.id===e.target.dataset.pay);if(!b)return;payBill(b);commit("Bills","Paid "+b.name)};
$("#seg").onclick=e=>{const b=e.target.closest("button");if(!b)return;addType=b.dataset.t;$$("#seg button").forEach(x=>x.classList.toggle("on",x===b));$("#catWrap").hidden=addType==="income"};
$("#add").onclick=()=>{const a=+$("#amt").value;if(!(a>0))return toast("Enter an amount",false);
 D.Transactions.push({id:uid(),date:$("#dt").value||iso(new Date()),type:addType,amount:Math.round(a*100)/100,categoryId:addType==="income"?"":$("#cat").value,note:$("#note").value.trim(),loanId:"",billId:""});
 $("#amt").value="";$("#note").value="";commit("Transactions",addType==="income"?"Income added":"Expense added");flash($("#daily"))};
$("#addLoan").onclick=()=>{const n=$("#ln").value.trim(),a=+$("#la").value;if(!n||!(a>0))return toast("Enter loan name and amount",false);
 const l={id:uid(),name:n,principal:a,date:iso(new Date())};D.Loans.push(l);
 D.Transactions.push({id:uid(),date:l.date,type:"loan_in",amount:a,categoryId:"",note:"Loan: "+n,loanId:l.id,billId:""});
 $("#ln").value="";$("#la").value="";dirty.add("Loans");commit("Transactions","Loan created");flash($("#daily"))};
$("#pay").onclick=()=>{const id=$("#pl").value,a=+$("#pa").value,l=D.Loans.find(x=>x.id===id);
 if(!l)return toast("Pick a loan",false);if(!(a>0))return toast("Enter payment",false);
 if(a>l.principal-loanPaid(id)+0.004)return toast("More than the balance owed",false);
 D.Transactions.push({id:uid(),date:iso(new Date()),type:"expense",amount:a,categoryId:"loanpay",note:"Loan payback: "+l.name,loanId:id,billId:""});
 $("#pa").value="";commit("Transactions","Payment recorded");flash($("#daily"))};

/* ----- dashboard ----- */
function rDash(){const m=$("#dm").value||($("#dm").value=ymNow()),tx=D.Transactions.filter(t=>t.date.startsWith(m));
 const inc=sum(tx,t=>t.type!=="expense"),exp=sum(tx,t=>t.type==="expense");
 $("#kpis").innerHTML=`<div class="card"><small>Income</small><b class="inc" id="k1"></b></div><div class="card"><small>Expenses</small><b id="k2"></b></div><div class="card"><small>Balance</small><b id="k3"></b></div>`;
 countUp($("#k1"),inc,"k1");countUp($("#k2"),exp,"k2");countUp($("#k3"),inc-exp,"k3");
 if(window.Chart){const cs=getComputedStyle(document.documentElement);Chart.defaults.color=cs.getPropertyValue("--mute").trim();Chart.defaults.borderColor=cs.getPropertyValue("--line").trim();Chart.defaults.font.family="Plus Jakarta Sans";
  charts.forEach(c=>c.destroy());const ms=[-5,-4,-3,-2,-1,0].map(n=>mAdd(m,n)),by=f=>ms.map(x=>sum(D.Transactions,t=>t.date.startsWith(x)&&f(t))),an={duration:1100,easing:"easeOutQuart"};
  charts=[new Chart($("#c1"),{type:"bar",data:{labels:ms,datasets:[{label:"Income",data:by(t=>t.type!=="expense"),backgroundColor:"#14b8a6",borderRadius:8},{label:"Expenses",data:by(t=>t.type==="expense"),backgroundColor:"#6366f1",borderRadius:8}]},options:{responsive:true,maintainAspectRatio:false,animation:an}})];
  const g={};tx.filter(t=>t.type==="expense").forEach(t=>g[t.categoryId]=(g[t.categoryId]||0)+t.amount);const ks=Object.keys(g);
  charts.push(new Chart($("#c2"),{type:"doughnut",data:{labels:ks.map(k=>cat(k).name),datasets:[{data:ks.map(k=>g[k]),backgroundColor:ks.map(k=>cat(k).color),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:"62%",animation:{...an,animateRotate:true,animateScale:true}}}))}
 const rows=[];if(budOf("ALL"))rows.push(["All spending",exp,budOf("ALL")]);
 D.Categories.forEach(c=>{const b=budOf(c.id);if(b)rows.push([c.name,sum(tx,t=>t.type==="expense"&&t.categoryId===c.id),b])});
 $("#budRep").innerHTML=rows.length?rows.map(([n,s,b])=>`<div class="row"><b>${esc(n)}</b><span class="mute">${money(s)} / ${money(b)}</span></div><div class="bar ${s>b?"over":""}"><i data-w="${Math.min(100,s/b*100)}"></i></div>`).join(""):emptyMsg("Set budgets in Settings.");
 let tpd=0;D.Loans.forEach(l=>tpd+=loanPaid(l.id));
 const lp=D.Loans.reduce((s,l)=>s+l.principal,0);
 $("#loanRep").innerHTML=D.Loans.length?`<div class="mute" style="margin-bottom:8px">Borrowed ${money(lp)} · Paid ${money(tpd)} · Outstanding <b>${money(lp-tpd)}</b></div>`+D.Loans.map(l=>{const p=loanPaid(l.id);return`<div class="row"><b>${esc(l.name)}</b><span class="mute">${money(p)} / ${money(l.principal)}</span></div><div class="bar"><i data-w="${Math.min(100,p/l.principal*100)}"></i></div>`}).join(""):emptyMsg("No loans yet.");
 const bt=sum(D.Bills,()=>true),bu=sum(unpaid(),()=>true);
 $("#billRep").innerHTML=D.Bills.length?`<div class="mute" style="margin-bottom:8px">Monthly total ${money(bt)} · Paid ${money(bt-bu)} · Still due <b>${money(bu)}</b></div><div class="bar"><i data-w="${bt?(bt-bu)/bt*100:0}"></i></div>`:emptyMsg("No recurring bills yet. Add them under Records → Bills.");
 fillBars()}
$("#dm").onchange=rDash;

/* ----- records: transactions / loans / bills ----- */
$("#txTabs").onclick=e=>{const b=e.target.closest("button");if(!b)return;tab=b.dataset.t;$$("#txTabs button").forEach(x=>x.classList.toggle("on",x===b));
 const l=$("#txList");l.classList.add("enter");setTimeout(()=>l.classList.remove("enter"),1200);rTx()};
function rTx(){$("#txFilters").hidden=tab!=="tx";$("#addBill").hidden=tab!=="bills";const l=$("#txList");
 if(tab==="tx"){const m=$("#tm").value||($("#tm").value=ymNow()),f=$("#tf").value;
  const rows=D.Transactions.filter(t=>t.date.startsWith(m)&&(!f||t.type===f)).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);
  l.innerHTML=rows.length?rows.map((t,i)=>{const c=t.type==="expense"?cat(t.categoryId):{name:t.type==="loan_in"?"Loan received":"Income",color:"#10b981"};
   return`<div class="item tap" data-id="${t.id}" style="--i:${i}"><span class="dot" style="background:${c.color}"></span><div>${esc(t.note||c.name)}<small>${esc(c.name)} · ${t.date}</small></div><span class="${t.type==="expense"?"":"inc"}">${t.type==="expense"?"-":"+"}${money(t.amount)}</span></div>`}).join(""):emptyMsg("No transactions here.")}
 else if(tab==="loans"){l.innerHTML=D.Loans.length?D.Loans.map((x,i)=>{const p=loanPaid(x.id),o=x.principal-p;
   return`<div class="item tap" data-id="${x.id}" style="--i:${i}"><div><b>${esc(x.name)}</b><small>Paid ${money(p)} of ${money(x.principal)} · ${o>0.004?"owe "+money(o):"cleared ✓"}</small><div class="bar"><i data-w="${Math.min(100,p/x.principal*100)}"></i></div></div></div>`}).join(""):emptyMsg("No loans yet. Create one on Home.");fillBars()}
 else{l.innerHTML=D.Bills.length?D.Bills.map((b,i)=>{const paid=b.lastPaid===ymNow();
   return`<div class="item tap" data-id="${b.id}" style="--i:${i}"><span class="dot" style="background:${cat(b.categoryId).color}"></span><div>${esc(b.name)}<small>${money(b.amount)} · day ${dueDay(b)} · ${esc(cat(b.categoryId).name)}${String(b.auto)==="1"?" · auto-add":""}</small></div><span class="tag ${paid?"ok":"warn"}">${paid?"Paid":"Due"}</span></div>`}).join(""):emptyMsg("No recurring bills yet.")}}
$("#tm").onchange=$("#tf").onchange=rTx;
$("#addBill").onclick=()=>editBill();
$("#txList").onclick=e=>{const r=e.target.closest(".item");if(!r)return;({tx:editTx,loans:editLoan,bills:editBill}[tab])(r.dataset.id)};

function editTx(id){const t=D.Transactions.find(x=>x.id===id);if(!t)return;
 if(t.type==="loan_in")return D.Loans.find(l=>l.id===t.loanId)?editLoan(t.loanId):toast("Loan record not found",false,false);
 const pay=t.categoryId==="loanpay";
 openSheet("Edit transaction",`<label for="e_type">Type</label><select id="e_type"${pay?" disabled":""}><option value="expense">Expense</option><option value="income">Income</option></select>
 <div class="two"><div><label for="e_amt">Amount</label><input id="e_amt" type="number" step="0.01" inputmode="decimal" value="${t.amount}"></div><div><label for="e_dt">Date</label><input id="e_dt" type="date" value="${t.date}"></div></div>
 <label for="e_cat">Category</label><select id="e_cat"${pay?" disabled":""}>${catOpts(t.categoryId)}</select>
 <label for="e_note">Note</label><input id="e_note" maxlength="60" value="${esc(t.note)}">`,{
  onSave(){const a=+$("#e_amt").value;if(!(a>0)){toast("Enter an amount",false,false);return false}
   if(!pay){t.type=$("#e_type").value;t.categoryId=t.type==="income"?"":$("#e_cat").value}
   t.amount=Math.round(a*100)/100;t.date=$("#e_dt").value||t.date;t.note=$("#e_note").value.trim();commit("Transactions","Transaction updated")},
  onDelete(){D.Transactions=D.Transactions.filter(x=>x.id!==id);commit("Transactions","Transaction deleted")}});
 $("#e_type").value=t.type}

function editLoan(id){const l=D.Loans.find(x=>x.id===id);if(!l)return;
 openSheet("Edit loan",`<label for="l_name">Loan name</label><input id="l_name" maxlength="40" value="${esc(l.name)}">
 <div class="two"><div><label for="l_amt">Amount received</label><input id="l_amt" type="number" step="0.01" inputmode="decimal" value="${l.principal}"></div><div><label for="l_dt">Date</label><input id="l_dt" type="date" value="${l.date}"></div></div>
 <p class="mute">Paid so far: ${money(loanPaid(id))}. Deleting a loan also removes its payments.</p>`,{
  onSave(){const n=$("#l_name").value.trim(),a=+$("#l_amt").value;if(!n||!(a>0)){toast("Enter name and amount",false,false);return false}
   if(a<loanPaid(id)-0.004){toast("Amount is less than already paid",false,false);return false}
   l.name=n;l.principal=a;l.date=$("#l_dt").value||l.date;
   D.Transactions.forEach(t=>{if(t.loanId===id){if(t.type==="loan_in"){t.amount=a;t.date=l.date;t.note="Loan: "+n}else if(t.categoryId==="loanpay")t.note="Loan payback: "+n}});
   dirty.add("Loans");commit("Transactions","Loan updated")},
  onDelete(){D.Loans=D.Loans.filter(x=>x.id!==id);D.Transactions=D.Transactions.filter(t=>t.loanId!==id);dirty.add("Loans");commit("Transactions","Loan deleted")}});}

function editBill(id){const b=D.Bills.find(x=>x.id===id),n=!b,x=b||{name:"",amount:"",categoryId:"",day:new Date().getDate(),auto:"0"};
 openSheet(n?"New recurring bill":"Edit bill",`<label for="b_name">Bill name</label><input id="b_name" maxlength="40" value="${esc(x.name)}" placeholder="e.g. Rent">
 <div class="two"><div><label for="b_amt">Amount</label><input id="b_amt" type="number" step="0.01" inputmode="decimal" value="${x.amount}"></div><div><label for="b_day">Due day of month</label><input id="b_day" type="number" min="1" max="31" inputmode="numeric" value="${x.day}"></div></div>
 <label for="b_cat">Category</label><select id="b_cat">${catOpts(x.categoryId)}</select>
 <label for="b_auto">Add automatically on due day?</label><select id="b_auto"><option value="0">No – I will tap Pay</option><option value="1">Yes – add as expense</option></select>`,{
  saveLabel:n?"Add bill":"Save",
  onSave(){const nm=$("#b_name").value.trim(),a=+$("#b_amt").value,d=Math.round(+$("#b_day").value);if(!nm||!(a>0)||!(d>=1&&d<=31)){toast("Enter name, amount and a day (1–31)",false,false);return false}
   const o=b||{id:uid(),lastPaid:""};Object.assign(o,{name:nm,amount:a,day:d,categoryId:$("#b_cat").value,auto:$("#b_auto").value});
   if(n){if(o.auto==="1"&&d<new Date().getDate())o.lastPaid=ymNow();D.Bills.push(o)}commit("Bills",n?"Bill added":"Bill updated")},
  onDelete:n?null:()=>{D.Bills=D.Bills.filter(z=>z.id!==id);commit("Bills","Bill deleted")}});
 $("#b_auto").value=String(x.auto)==="1"?"1":"0"}

/* ----- settings ----- */
function rSet(){$("#cur").value=S("currency");$("#ball").value=budOf("ALL")||"";
 $("#cats").innerHTML=D.Categories.map(c=>`<div class="crow"><input type="color" value="${c.color}" data-k="color" data-id="${c.id}" aria-label="Colour"><input value="${esc(c.name)}" data-k="name" data-id="${c.id}"${c.id==="loanpay"?" disabled":""} aria-label="Name"><input type="number" min="0" placeholder="Budget" value="${budOf(c.id)||""}" data-b="${c.id}" aria-label="Monthly budget">${c.id==="loanpay"?"<span></span>":`<button class="x" data-del="${c.id}" aria-label="Delete category">✕</button>`}</div>`).join("")}
function setBudget(id,v){D.Budgets=D.Budgets.filter(b=>b.categoryId!==id);if(v>0)D.Budgets.push({id:uid(),categoryId:id,amount:v});commit("Budgets","Budget saved",true)}
$("#ball").onchange=e=>setBudget("ALL",+e.target.value);
$("#cur").onchange=e=>{setS("currency",e.target.value||"$");commit("Settings","Currency saved",true)};
$("#cats").onchange=e=>{const t=e.target;if(t.dataset.b)return setBudget(t.dataset.b,+t.value);
 const c=D.Categories.find(x=>x.id===t.dataset.id);if(!c)return;if(t.dataset.k==="name"&&!t.value.trim())return rSet();c[t.dataset.k]=t.value.trim();commit("Categories","Category saved",true)};
$("#cats").onclick=e=>{const id=e.target.dataset.del;if(!id||!confirm("Delete this category? Past transactions will show as Other."))return;D.Categories=D.Categories.filter(c=>c.id!==id);D.Budgets=D.Budgets.filter(b=>b.categoryId!==id);dirty.add("Budgets");commit("Categories","Category deleted")};
$("#addCat").onclick=()=>{const n=$("#ncat").value.trim();if(!n)return toast("Enter a name",false);D.Categories.splice(D.Categories.length-1,0,{id:uid(),name:n,color:"#"+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,"0")});$("#ncat").value="";commit("Categories","Category added")};
$("#theme").onclick=e=>{const b=e.currentTarget,r=b.getBoundingClientRect(),t=curTheme()==="dark"?"light":"dark";
 applyTheme(t,r.left+r.width/2,r.top+r.height/2);b.classList.remove("spin");void b.offsetWidth;b.classList.add("spin");setS("theme",t);commit("Settings","",true);toast(t==="dark"?"Dark theme on":"Light theme on")};

/* ----- install as app (PWA) ----- */
let deferred;
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#install").hidden=false});
$("#install").onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;$("#install").hidden=true};
addEventListener("appinstalled",()=>{toast("App installed");$("#install").hidden=true});
$("#iosHint").hidden=!(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!(matchMedia("(display-mode:standalone)").matches||navigator.standalone));

/* ----- start ----- */
applyTheme(localStorage.theme||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"),0,0,false);
if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
$("#cid").value=CID();
if(!offlineBoot())showLogin();
