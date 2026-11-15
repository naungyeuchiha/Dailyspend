/* Google sign-in + Google Sheets storage (auto-create, reuse, patch) */
const SH="https://sheets.googleapis.com/v4/spreadsheets",DRV="https://www.googleapis.com/drive/v3/files";
const SCOPE="https://www.googleapis.com/auth/drive.file openid email profile",FILE="DailySpend Data";
let token,sid,user,tc,booted=false,dirty=new Set(),flushing=false,needAuth=false,ft,retried=false;
const CID=()=>(typeof CLIENT_ID!=="undefined"&&CLIENT_ID)||localStorage.cid||"";

/* ----- auth ----- */
function initAuth(){tc=google.accounts.oauth2.initTokenClient({client_id:CID(),scope:SCOPE,callback:onToken,
 error_callback:()=>{if(booted){needAuth=true;chip("err")}else showLogin()}})}
function gisReady(){if(CID()&&localStorage["ds:last"]){initAuth();tc.requestAccessToken({prompt:"none"})}}
function showLogin(){$("#login").hidden=false;$("#app").hidden=true;$("#cidBox").hidden=!!(typeof CLIENT_ID!=="undefined"&&CLIENT_ID)}
function reconnect(){if(typeof google==="undefined")return toast("You're offline. Your changes are saved on this device.",false,false);if(!tc)initAuth();tc.requestAccessToken({prompt:""})}
async function onToken(r){if(r.error){if(booted){needAuth=true;chip("err")}else showLogin();return}
 token=r.access_token;needAuth=false;setTimeout(()=>tc.requestAccessToken({prompt:"none"}),Math.max(60,(r.expires_in||3600)-120)*1000);
 booted?sync():boot()}
$("#signin").onclick=()=>{const v=$("#cid").value.trim();if(v)localStorage.cid=v;if(!CID())return toast("Enter your Client ID",false,false);reconnect()};
$("#out").onclick=()=>{if(token&&window.google)google.accounts.oauth2.revoke(token,()=>{});["ds:last","ds:user"].forEach(k=>localStorage.removeItem(k));location.reload()};

async function api(url,o={}){const r=await fetch(url,{...o,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"}});
 if(!r.ok){const e=new Error(r.status===401?"auth":await r.text());e.status=r.status;if(r.status===401)needAuth=true;throw e}return r.json()}

/* ----- session ----- */
function loadCache(){const c=JSON.parse(localStorage["ds:"+user.email]||"null");if(c){D=Object.assign(D,c.D);sid=c.sid;(c.dirty||[]).forEach(t=>dirty.add(t))}}
const cacheSave=()=>{try{localStorage["ds:"+user.email]=JSON.stringify({D,sid,dirty:[...dirty]})}catch(e){}};
function showApp(){booted=true;$("#login").hidden=true;$("#app").hidden=false;$("#av").src=user.picture||"";$("#un").textContent=user.name||"";$("#ue").textContent=user.email;go(location.hash.slice(1)||"home")}
async function boot(){user=await api("https://www.googleapis.com/oauth2/v3/userinfo");localStorage["ds:last"]=user.email;localStorage["ds:user"]=JSON.stringify(user);loadCache();showApp();sync()}
function offlineBoot(){try{user=JSON.parse(localStorage["ds:user"]||"null")}catch(e){user=null}
 if(!user||!localStorage["ds:"+user.email]){user=null;return false}loadCache();showApp();needAuth=true;chip("err");return true}

/* ----- Google Sheet: find existing -> reuse; otherwise create; add any missing tabs ----- */
async function ensureSheet(){
 if(!sid){const q=encodeURIComponent(`name='${FILE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const f=await api(`${DRV}?fields=files(id)&orderBy=createdTime&q=${q}`);if(f.files.length)sid=f.files[0].id}
 if(!sid){const s=await api(SH,{method:"POST",body:JSON.stringify({properties:{title:FILE},sheets:Object.keys(TABS).map(title=>({properties:{title,gridProperties:{frozenRowCount:1}}}))})});
  sid=s.spreadsheetId;Object.keys(TABS).forEach(t=>dirty.add(t));return}
 try{const m=await api(`${SH}/${sid}?fields=sheets.properties.title`),have=m.sheets.map(s=>s.properties.title),miss=Object.keys(TABS).filter(t=>!have.includes(t));
  if(miss.length){await api(`${SH}/${sid}:batchUpdate`,{method:"POST",body:JSON.stringify({requests:miss.map(title=>({addSheet:{properties:{title,gridProperties:{frozenRowCount:1}}}}))})});miss.forEach(t=>dirty.add(t))}}
 catch(e){if(e.status===404||e.status===403){sid=null;return ensureSheet()}throw e}}
async function pull(){const ks=Object.keys(TABS),r=await api(`${SH}/${sid}/values:batchGet?`+ks.map(t=>"ranges="+t).join("&"));
 r.valueRanges.forEach((v,i)=>{const t=ks[i],h=TABS[t],vals=v.values||[];
  if(vals.length&&vals[0].join("|")!==h.join("|"))dirty.add(t);   // old header -> patch to new columns
  if(dirty.has(t))return;                                          // local unsynced edits win
  D[t]=vals.slice(1).filter(x=>x[0]).map(x=>{const o={};h.forEach((k,j)=>o[k]=x[j]??"");NUMS.forEach(k=>{if(k in o)o[k]=+o[k]||0});return o})})}
function seed(){if(!D.Categories.length){D.Categories=[...DEF.map(([name,color])=>({id:uid(),name,color})),{id:"loanpay",name:"Loan Payback",color:"#ef4444"}];dirty.add("Categories")}
 if(!S("currency")){setS("currency","$");dirty.add("Settings")}}
async function flush(){if(!token||!sid||flushing)return;flushing=true;let ok=true;
 try{for(const t of [...dirty]){await api(`${SH}/${sid}/values/${t}:clear`,{method:"POST",body:"{}"});
   await api(`${SH}/${sid}/values/${t}!A1?valueInputOption=RAW`,{method:"PUT",body:JSON.stringify({values:[TABS[t],...D[t].map(o=>TABS[t].map(k=>o[k]??""))]})});dirty.delete(t)}
  chip("ok")}catch(e){ok=false;chip("err")}
 flushing=false;cacheSave();if(ok&&dirty.size)flush()}
async function sync(){if(!token){needAuth=true;return chip("err")}chip("busy");
 try{await ensureSheet();await pull();seed();autoBills();cacheSave();if(S("theme")&&S("theme")!==curTheme())applyTheme(S("theme"),0,0,false);render();await flush();retried=false}
 catch(e){if(e.status===404&&!retried){retried=true;sid=null;return sync()}chip("err")}}
function commit(tab,msg,keep){dirty.add(tab);cacheSave();if(!keep)render();if(msg)toast(msg);chip("busy");clearTimeout(ft);ft=setTimeout(flush,450)}
$("#sync").onclick=()=>needAuth?reconnect():sync();
$("#resync").onclick=()=>needAuth?reconnect():sync();
addEventListener("online",()=>{if(token)sync();else if(tc)tc.requestAccessToken({prompt:"none"})});
addEventListener("offline",()=>chip("err"));
