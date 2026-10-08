
(function(){
"use strict";

/* ============ constants ============ */
var LOGO = "logo.jpg";
var TYPES = { play:{label:"To Play", cls:"play", sub:"Studio &middot; open social play"},
              learn:{label:"To Learn", cls:"learn", sub:"Academy &middot; guided instruction"} };
var PAY = [
  {v:"paid", label:"Paid", short:"Paid", cls:"paid"},
  {v:"partial", label:"Partially Paid", short:"Part paid", cls:"part"},
  {v:"unpaid", label:"Unpaid / Pay at Venue", short:"Unpaid", cls:"unpaid"},
  {v:"refunded", label:"Refunded", short:"Refunded", cls:"refund"}
];
var STAGES = ["New Lead","Confirmed","Paid","Checked-In","Completed"];
var LEAD_STAGES = ["New","Contacted","Quoted","Converted"];
var LEAD_LOST = "Lost";
var SERVICES = { play:{label:"To Play", cls:"play"}, learn:{label:"To Learn", cls:"learn"} };
var CLOSED = ["Cancelled","No-Show"];
var ICON = {
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  kan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/></svg>',
  ppl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.5a3 3 0 010 5.6M17.5 14.6c2 .7 3.5 2.6 3.5 5.4"/></svg>',
  dash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 19V11M10 19V5M16 19v-6M22 19H2"/></svg>',
  lead:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h4l2 3h6l2-3h4"/><path d="M5 5h14l2 8v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4z"/></svg>',
  cog:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.6M12 18.8v2.6M21.4 12h-2.6M5.2 12H2.6M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8M18.6 18.6l-1.8-1.8M7.2 7.2L5.4 5.4"/></svg>'
};
var NAV = [
  {id:"schedule", label:"Schedule", icon:"cal"},
  {id:"leads", label:"Leads", icon:"lead"},
  {id:"pipeline", label:"Pipeline", icon:"kan"},
  {id:"customers", label:"Customers", icon:"ppl"},
  {id:"dashboard", label:"Dashboard", icon:"dash"},
  {id:"settings", label:"Settings", icon:"cog", admin:true}
];

/* ============ helpers ============ */
function $(s,r){ return (r||document).querySelector(s); }
function el(tag, attrs, html){ var e=document.createElement(tag); if(attrs) for(var k in attrs){ if(k==="class") e.className=attrs[k]; else e.setAttribute(k,attrs[k]); } if(html!=null) e.innerHTML=html; return e; }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function uid(){ return Math.random().toString(36).slice(2,10); }
function pad(n){ return n<10?"0"+n:""+n; }
function iso(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function parseISO(s){ var p=String(s).split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }
function today(){ return iso(new Date()); }
function addDays(s,n){ var d=parseISO(s); d.setDate(d.getDate()+n); return iso(d); }
var DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
var MONS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function dayName(s){ return DAYS[parseISO(s).getDay()]; }
function fmtDate(s){ var d=parseISO(s); return pad(d.getDate())+" "+MONS[d.getMonth()]+" "+d.getFullYear(); }
function fmtShort(s){ var d=parseISO(s); return pad(d.getDate())+" "+MONS[d.getMonth()]; }
function t2m(t){ var p=String(t).split(":"); return (+p[0])*60 + (+p[1]); }
function m2t(m){ return pad(Math.floor(m/60))+":"+pad(m%60); }
function t12(t){ var p=String(t).split(":"), h=+p[0], ap=h<12?"am":"pm", hh=h%12; if(hh===0)hh=12; return hh+(p[1]==="00"?"":":"+p[1])+ap; }
function inr(n){ n=Math.round(+n||0); var s=String(Math.abs(n)), out; if(s.length>3){ var last3=s.slice(-3), rest=s.slice(0,-3); rest=rest.replace(/\B(?=(\d{2})+(?!\d))/g,","); out=rest+","+last3; } else out=s; return (n<0?"-":"")+"Rs "+out; }
function initials(name){ return String(name||"").trim().split(/\s+/).map(function(w){return w[0];}).join("").slice(0,2).toUpperCase(); }
function payInfo(v){ for(var i=0;i<PAY.length;i++) if(PAY[i].v===v) return PAY[i]; return PAY[2]; }
function isClosed(b){ return CLOSED.indexOf(b.stage)>=0; }

function setHTML(el, html){
  /* Re-rendering a modal destroys every field in it. Without this, leaving
     one field redraws the form and eats the field you just clicked into, so
     your typing goes nowhere. Remember what had focus and where the cursor
     sat, rebuild, then put both back. */
  var fid=null, selA=null, selB=null, scrolled=null;
  try{
    var a=document.activeElement;
    if(a && el.contains(a)){
      fid = a.id || null;
      if(typeof a.selectionStart === "number"){ selA=a.selectionStart; selB=a.selectionEnd; }
      if(a.blur) a.blur();
    }
  }catch(e){}
  try{
    var oldBody = el.querySelector(".modal .body");
    if(oldBody) scrolled = oldBody.scrollTop;
  }catch(e){}

  try{ el.innerHTML = html; }
  catch(e){
    while(el.firstChild) el.removeChild(el.firstChild);
    el.insertAdjacentHTML("beforeend", html);
  }

  try{
    var newBody = el.querySelector(".modal .body");
    if(newBody && scrolled!=null) newBody.scrollTop = scrolled;
  }catch(e){}

  if(fid){
    try{
      var n = document.getElementById(fid);
      if(n && el.contains(n)){
        n.focus({preventScroll:true});
        if(selA!=null && n.setSelectionRange) n.setSelectionRange(selA, selB);
      }
    }catch(e){}
  }
}

function toast(msg){
  var r=$("#toastRoot"); r.innerHTML="";
  var t=el("div",{class:"toast"},esc(msg)); r.appendChild(t);
  setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 2600);
}

/* ============ Supabase store ============ */
var sb = null, booted=false, renderTimer=null, meId=null;
var perm = { name:"", email:"", admin:false, write:true };
var LOCAL = false; /* kept so shared view code can ask; always false here */

function configured(){
  return typeof CONFIG==="object" && CONFIG && CONFIG.url &&
         CONFIG.url.indexOf("YOUR-PROJECT")<0 && CONFIG.anonKey &&
         CONFIG.anonKey.indexOf("YOUR-ANON-KEY")<0;
}

/* ---- row <-> object mapping ---- */
function hhmm(t){ return String(t||"").slice(0,5); }
function bookIn(r){
  return { id:r.id, customerId:r.customer_id, type:r.type, guests:+r.guests,
    date:r.booking_date, start:hhmm(r.start_time), end:hhmm(r.end_time),
    tableId:r.table_id, teacherId:r.teacher_id||"", payment:r.payment,
    amountDue:+r.amount_due, amountPaid:+r.amount_paid, stage:r.stage,
    notes:r.notes||"", createdBy:r.created_by||"" };
}
function bookOut(b){
  return { id:b.id, customer_id:b.customerId, type:b.type, guests:+b.guests,
    booking_date:b.date, start_time:b.start, end_time:b.end,
    table_id:b.tableId, teacher_id:b.teacherId||null, payment:b.payment,
    amount_due:+b.amountDue||0, amount_paid:+b.amountPaid||0, stage:b.stage,
    notes:b.notes||"", created_by:b.createdBy||perm.name||"" };
}
function custIn(r){ return { id:r.id, name:r.name, phone:r.phone||"", email:r.email||"",
                             source:r.source||"Walk-in", notes:r.notes||"" }; }
function leadIn(r){
  return { id:r.id, name:r.name, phone:r.phone||"", email:r.email||"", source:r.source||"Instagram",
    service:r.service,
    playPrice:    r.play_price    == null ? "" : +r.play_price,
    learnClasses: r.learn_classes == null ? "" : +r.learn_classes,
    learnPrice:   r.learn_price   == null ? "" : +r.learn_price,
    notes:r.notes||"", stage:r.stage, customerId:r.customer_id||"",
    paymentState:  r.payment_state||"none",
    amountReceived: r.amount_received==null ? 0 : +r.amount_received,
    partySize:      r.party_size==null ? 1 : +r.party_size,
    createdBy:r.created_by||"", createdAt:r.created_at||"" };
}
function leadOut(l){
  var learn = l.service==="learn";
  return { id:l.id, name:l.name, phone:l.phone||"", email:l.email||"", source:l.source||"Instagram",
    service:l.service,
    play_price:    (!learn && l.playPrice   !== "" && l.playPrice   != null) ? +l.playPrice   : null,
    learn_classes: ( learn && l.learnClasses!== "" && l.learnClasses!= null) ? +l.learnClasses: null,
    learn_price:   ( learn && l.learnPrice  !== "" && l.learnPrice  != null) ? +l.learnPrice  : null,
    notes:l.notes||"", stage:l.stage, customer_id:l.customerId||null,
    payment_state:   l.paymentState||"none",
    amount_received: (l.paymentState==="none" ? 0 : (+l.amountReceived||0)),
    party_size:      Math.min(12, Math.max(1, +l.partySize||1)),
    created_by:l.createdBy||perm.name||"" };
}
function digitsOf(v){ return String(v||"").replace(/\D/g,""); }
function custOut(c){ return { id:c.id, name:c.name, phone:c.phone||"", email:c.email||"",
                              source:c.source||"Walk-in", notes:c.notes||"" }; }

/* ---- error wording ---- */
function pgMsg(e){
  if(!e) return "Something went wrong. Try again.";
  var code = e.code || "", msg = String(e.message||"");
  if(code==="23P01" || msg.indexOf("no_table_overlap")>=0 || msg.indexOf("no_teacher_overlap")>=0){
    if(msg.indexOf("no_teacher_overlap")>=0)
      return "That teacher is already teaching somewhere else during those hours. The booking was not saved.";
    return "Another booking already has that table for part of that slot. The booking was not saved.";
  }
  if(code==="23514"){
    if(msg.indexOf("learn_has_teacher")>=0) return "A To Learn booking needs a teacher.";
    if(msg.indexOf("end_after_start")>=0) return "The end time has to be after the start time.";
    return "The database refused those values. Check the times and amounts.";
  }
  if(code==="23505"){
    if(msg.indexOf("leads_phone_unique")>=0)
      return "Another enquiry already uses that phone number. Open that one instead of starting a second.";
    if(msg.indexOf("customers_phone_unique")>=0)
      return "A customer already has that phone number.";
    return "Something with that value already exists.";
  }
  if(code==="23503") return "That customer, table or teacher no longer exists. Reload the page.";
  if(code==="42501" || code==="PGRST301") return "You don't have permission to make that change.";
  if(msg.toLowerCase().indexOf("failed to fetch")>=0) return "Can't reach the database. Check your connection.";
  return msg || "Couldn't save that. Try again.";
}
function fail(e){ toast(pgMsg(e)); loadAll().then(function(){ render(); }, function(){}); }
function canWrite(){ return perm.write !== false; }

/* ---- loading ---- */
function loadAll(){
  if(!sb) return Promise.resolve();
  return Promise.all([
    sb.from("bookings").select("*"),
    sb.from("customers").select("*"),
    sb.from("teachers").select("*"),
    sb.from("tables").select("*"),
    sb.from("settings").select("*").eq("id",1).maybeSingle(),
    sb.from("staff").select("*"),
    sb.from("leads").select("*")
  ]).then(function(r){
    for(var i=0;i<5;i++) if(r[i].error) throw r[i].error;
    DB.bookings  = (r[0].data||[]).map(bookIn);
    DB.customers = (r[1].data||[]).map(custIn);
    DB.teachers  = (r[2].data||[]).map(function(t){
      return {id:t.id,name:t.name,phone:t.phone||"",note:t.note||"",active:!!t.active}; });
    DB.tables    = (r[3].data||[]).map(function(t){
      return {id:t.id,num:+t.num,capacity:+t.capacity,active:!!t.active}; });
    var s=r[4].data;
    if(s){
      DB.settings = { open:hhmm(s.open_time), close:hhmm(s.close_time), slot:+s.slot_minutes,
        defPlay:+s.default_play_minutes, defLearn:+s.default_learn_minutes,
        ratePlay:+s.rate_play, rateLearn:+s.rate_learn,
        tokenDeposit: s.token_deposit==null ? 50 : +s.token_deposit };
      DB.sources = s.sources && s.sources.length ? s.sources : DB.sources;
    }
    DB.staff = (r[5] && !r[5].error && r[5].data) ? r[5].data : [];
    if(r[6] && r[6].error) throw r[6].error;
    DB.leads = ((r[6] && r[6].data) || []).map(leadIn);
  });
}

var liveChannel=null;
function subscribeLive(){
  if(!sb || liveChannel) return;
  liveChannel = sb.channel("chow-pair-live");
  ["bookings","customers","teachers","tables","settings","staff","leads"].forEach(function(t){
    liveChannel.on("postgres_changes", {event:"*", schema:"public", table:t}, function(){
      if(liveChannel._t) clearTimeout(liveChannel._t);
      liveChannel._t = setTimeout(function(){
        loadAll().then(function(){ scheduleRender(); }, function(){});
      }, 220);
    });
  });
  liveChannel.subscribe();
}

function scheduleRender(){
  if(!booted) return;
  if(renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(function(){
    renderTimer=null;
    var a=document.activeElement;
    if(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $("#main").contains(a)) return;
    if($("#modalRoot").innerHTML) return;
    render();
  }, 200);
}

/* ---- writes ---- */
function putBooking(rec){
  var i=-1; DB.bookings.forEach(function(b,ix){ if(b.id===rec.id) i=ix; });
  if(i>=0) DB.bookings[i]=rec; else DB.bookings.push(rec);
  if(!sb) return Promise.resolve();
  return sb.from("bookings").upsert(bookOut(rec)).then(function(r){
    if(r.error) throw r.error;
  });
}
function delBooking(id){
  DB.bookings = DB.bookings.filter(function(b){ return b.id!==id; });
  if(!sb) return Promise.resolve();
  return sb.from("bookings")["delete"]().eq("id",id).then(function(r){
    if(r.error) throw r.error;
  });
}
function putCustomer(c){
  var i=-1; DB.customers.forEach(function(x,ix){ if(x.id===c.id) i=ix; });
  if(i>=0) DB.customers[i]=c; else DB.customers.push(c);
  if(!sb) return Promise.resolve();
  return sb.from("customers").upsert(custOut(c)).then(function(r){
    if(r.error) throw r.error;
  });
}
function delCustomer(id){
  DB.customers = DB.customers.filter(function(c){ return c.id!==id; });
  if(!sb) return Promise.resolve();
  return sb.from("customers")["delete"]().eq("id",id).then(function(r){ if(r.error) throw r.error; });
}
/* A Converted enquiry may not point at nobody, so hand it back to Quoted
   before the customer disappears underneath it. */
function releaseLeadsFor(cid){
  var linked = DB.leads.filter(function(l){ return l.customerId===cid; });
  if(!linked.length) return Promise.resolve();
  return Promise.all(linked.map(function(l){
    var rec={}; for(var k in l) rec[k]=l[k];
    rec.customerId = "";
    if(rec.stage==="Converted") rec.stage = "Quoted";
    return putLead(rec);
  }));
}

function putConfig(which){
  if(!sb) return Promise.resolve();
  if(which==="teachers")
    return sb.from("teachers").upsert(DB.teachers.map(function(t){
      return {id:t.id,name:t.name,phone:t.phone||"",note:t.note||"",active:!!t.active}; }))
      .then(function(r){ if(r.error) throw r.error; });
  if(which==="tables")
    return sb.from("tables").upsert(DB.tables.map(function(t){
      return {id:t.id,num:+t.num,capacity:+t.capacity,active:!!t.active}; }))
      .then(function(r){ if(r.error) throw r.error; });
  var s=DB.settings;
  return sb.from("settings").update({
    open_time:s.open, close_time:s.close, slot_minutes:s.slot,
    default_play_minutes:s.defPlay, default_learn_minutes:s.defLearn,
    rate_play:s.ratePlay, rate_learn:s.rateLearn, token_deposit:s.tokenDeposit,
    sources:DB.sources
  }).eq("id",1).then(function(r){ if(r.error) throw r.error; });
}
function putLead(rec){
  var i=-1; DB.leads.forEach(function(l,ix){ if(l.id===rec.id) i=ix; });
  if(i>=0) DB.leads[i]=rec; else DB.leads.push(rec);
  if(!sb) return Promise.resolve();
  return sb.from("leads").upsert(leadOut(rec)).then(function(r){ if(r.error) throw r.error; });
}
function delLead(id){
  DB.leads = DB.leads.filter(function(l){ return l.id!==id; });
  if(!sb) return Promise.resolve();
  return sb.from("leads")["delete"]().eq("id",id).then(function(r){ if(r.error) throw r.error; });
}

/* Turning an enquiry into a customer. Reuses an existing customer when the
   phone number already exists, so a repeat enquirer does not get duplicated. */
function convertLead(l){
  var want = digitsOf(l.phone);
  var match = want ? DB.customers.filter(function(c){ return digitsOf(c.phone)===want; })[0] : null;
  var cid  = match ? match.id : ("c"+uid());
  var cust = { id:cid, name:l.name.trim(), phone:l.phone.trim(), email:l.email.trim(),
               source:l.source||"Instagram", notes: match ? (match.notes||"") : (l.notes||"") };
  var done = {}; for(var k in l) done[k]=l[k];
  done.stage="Converted"; done.customerId=cid;
  return putCustomer(cust)
    .then(function(){ return putLead(done); })
    .then(function(){ return { customerId:cid, reused:!!match }; });
}

function putStaff(id, patch){
  var row=null; DB.staff.forEach(function(s){ if(s.id===id) row=s; });
  if(row) for(var k in patch) row[k]=patch[k];
  if(!sb) return Promise.resolve();
  return sb.from("staff").update(patch).eq("id",id).then(function(r){
    if(r.error) throw r.error;
  });
}

/* ---- chrome ---- */
function paintWho(){
  var n=$("#whoName"), r=$("#whoRole");
  if(!n) return;
  n.textContent = perm.name || perm.email || "Signed in";
  r.textContent = perm.admin ? "Admin · full access" : "Staff · can book";
}
function banner(){ return ""; }

var DB = {
  teachers:[], tables:[], customers:[], bookings:[], staff:[], leads:[],
  sources:["Instagram","Walk-in","Referral","WhatsApp","Google","Event","Other"],
  settings:{ open:"10:00", close:"22:00", slot:30, defPlay:120, defLearn:90,
             ratePlay:2400, rateLearn:3200, tokenDeposit:50 }
};

var state = {
  view:"schedule", date:today(),
  schedMode: (window.innerWidth<860 ? "list" : "grid"),
  pipeMode:"board",
  filters:{ type:"", pay:"", stage:"", teacher:"", from:"", to:"" },
  leadMode:"board", leadFilters:{ service:"", stage:"", source:"" },
  customerOpen:null
};

/* ============ lookups ============ */
function customer(id){ return DB.customers.filter(function(c){return c.id===id;})[0] || {name:"(deleted)",phone:""}; }
function teacher(id){ return DB.teachers.filter(function(t){return t.id===id;})[0] || null; }
function tableOf(id){ return DB.tables.filter(function(t){return t.id===id;})[0] || null; }
function activeTables(){ return DB.tables.filter(function(t){return t.active;}).sort(function(a,b){return a.num-b.num;}); }
function activeTeachers(){ return DB.teachers.filter(function(t){return t.active;}); }
function bookingsOn(date){ return DB.bookings.filter(function(b){return b.date===date;}); }

function slots(){
  var out=[], s=t2m(DB.settings.open), e=t2m(DB.settings.close), st=DB.settings.slot;
  for(var m=s;m<e;m+=st) out.push(m2t(m));
  return out;
}

/* ============ seats ============ */
function liveOn(tableId, date){
  return DB.bookings.filter(function(b){ return b.tableId===tableId && b.date===date && !isClosed(b); });
}
function seatsTaken(tableId, date, start, end, exceptId){
  return liveOn(tableId,date).reduce(function(s,b){
    if(exceptId && b.id===exceptId) return s;
    return s + (overlaps(start,end,b.start,b.end) ? (+b.guests||0) : 0);
  },0);
}
function capacityOf(tableId){ var t=tableOf(tableId); return t? +t.capacity : 0; }
function slotIndex(t){ return (t2m(t)-t2m(DB.settings.open))/DB.settings.slot; }

/* seats taken in each half-hour column of one table's day */
function colSeats(tableId, date, sl){
  var list=liveOn(tableId,date), st=DB.settings.slot;
  return sl.map(function(t){
    var a=t2m(t), z=a+st;
    return list.reduce(function(s,b){
      return s + ((t2m(b.start) < z && a < t2m(b.end)) ? (+b.guests||0) : 0);
    },0);
  });
}

/* runs of adjacent columns that are part full: a table needing players */
function openRuns(tableId, date, sl){
  var cap=capacityOf(tableId), cols=colSeats(tableId,date,sl), out=[], cur=null;
  cols.forEach(function(taken,i){
    var partial = taken>0 && taken<cap;
    if(partial && cur && cur.taken===taken && cur.to===i-1){ cur.to=i; return; }
    if(cur){ out.push(cur); cur=null; }
    if(partial) cur={from:i,to:i,taken:taken,free:cap-taken};
  });
  if(cur) out.push(cur);
  return out;
}

/* pack parties sharing a table into stacked lanes */
function laneAssign(list){
  var lanes=[], out=[];
  list.slice().sort(function(a,b){ return (t2m(a.start)-t2m(b.start)) || (t2m(a.end)-t2m(b.end)); })
    .forEach(function(b){
      var put=-1;
      for(var i=0;i<lanes.length;i++){ if(lanes[i] <= t2m(b.start)){ put=i; break; } }
      if(put<0){ lanes.push(t2m(b.end)); put=lanes.length-1; }
      else lanes[put]=t2m(b.end);
      out.push({b:b, lane:put});
    });
  return { items:out, count:Math.max(1, lanes.length) };
}

/* ============ rules ============ */
function overlaps(a1,a2,b1,b2){ return t2m(a1) < t2m(b2) && t2m(b1) < t2m(a2); }

function checkConflicts(draft){
  var errs=[], warns=[];
  if(!draft.customerId)
    errs.push("Pick an existing customer from the list. Anyone new is added under <b>Enquiries</b> first, then converted.");
  if(!draft.phone || !draft.phone.trim()) errs.push("Phone number is required.");
  if(!draft.date) errs.push("Pick a date.");
  if(t2m(draft.end) <= t2m(draft.start)) errs.push("End time must be after the start time.");
  if(draft.type==="learn" && !draft.teacherId) errs.push("A teacher is required for every <b>To Learn</b> booking.");

  var others = DB.bookings.filter(function(b){ return b.id!==draft.id && b.date===draft.date && !isClosed(b); });

  var tb=tableOf(draft.tableId);
  if(tb){
    var taken = seatsTaken(draft.tableId, draft.date, draft.start, draft.end, draft.id);
    var free  = tb.capacity - taken;
    if(+draft.guests > free){
      errs.push(free>0
        ? "Table "+tb.num+" has room for "+free+" more in that slot, not "+draft.guests+". "+taken+" of "+tb.capacity+" seats are already taken."
        : "Table "+tb.num+" is full for that slot. All "+tb.capacity+" seats are taken.");
    }
  }

  if(draft.teacherId){
    others.forEach(function(b){
      if(b.teacherId===draft.teacherId && b.tableId!==draft.tableId && overlaps(draft.start,draft.end,b.start,b.end)){
        var ot=tableOf(b.tableId);
        errs.push(esc(teacher(draft.teacherId).name)+" is already teaching on Table "+(ot?ot.num:"?")+" at "+t12(b.start)+"&ndash;"+t12(b.end)+". One teacher cannot cover two tables at once.");
      }
    });
  }
  if(draft.date && draft.date < today())
    warns.push("This date is in the past ("+fmtDate(draft.date)+").");
  if(draft.payment==="partial" && (+draft.amountPaid<=0 || +draft.amountPaid>=+draft.amountDue))
    warns.push("Partially paid usually means the amount received sits between zero and the amount due.");

  return {errors:errs, warnings:warns};
}

/* ============ shell ============ */
function navItems(){ return NAV.filter(function(n){ return !n.admin || perm.admin || LOCAL; }); }
function buildNav(){
  var nav=$("#railNav"); nav.innerHTML="";
  var bar=$("#tabbar"); bar.innerHTML="";
  navItems().forEach(function(n){
    var b=el("button",{type:"button"}, ICON[n.icon]+"<span>"+n.label+"</span>");
    if(n.id===state.view) b.className="on";
    b.onclick=function(){ go(n.id); };
    nav.appendChild(b);
    var t=el("button",{type:"button"}, ICON[n.icon]+"<span>"+n.label+"</span>");
    if(n.id===state.view) t.className="on";
    t.onclick=function(){ go(n.id); };
    bar.appendChild(t);
  });
}
function go(v){ state.view=v; state.customerOpen=null; buildNav(); render(); window.scrollTo(0,0); }

function mobHead(){
  var lvl = LOCAL ? "Preview" : perm.admin ? "Editor" : perm.write===false ? "View only" : "Contributor";
  return '<div class="mobhead"><img src="'+LOGO+'" alt=""><div class="nm">Chow &amp; Pair</div>'+
    '<span class="lo">'+lvl+'</span></div>';
}

function render(){
  var m=$("#main");
  paintWho();
  var top = mobHead()+banner();
  if(state.view==="schedule") m.innerHTML = top+viewSchedule();
  else if(state.view==="leads") m.innerHTML = top+viewLeads();
  else if(state.view==="pipeline") m.innerHTML = top+viewPipeline();
  else if(state.view==="customers") m.innerHTML = top+viewCustomers();
  else if(state.view==="dashboard") m.innerHTML = top+viewDashboard();
  else m.innerHTML = top+viewSettings();
  if(state.view==="schedule") wireSchedule();
  else if(state.view==="leads") wireLeads();
  else if(state.view==="pipeline") wirePipeline();
  else if(state.view==="customers") wireCustomers();
  else if(state.view==="settings") wireSettings();
}

/* ============ SCHEDULE ============ */
function viewSchedule(){
  var d=state.date;
  var list=bookingsOn(d).filter(function(b){return !isClosed(b);}).sort(function(a,b){return t2m(a.start)-t2m(b.start);});
  var sl0=slots(), seatsFilled=0, needing=0, seatsFree=0;
  list.forEach(function(b){ seatsFilled += (+b.guests||0); });
  activeTables().forEach(function(tb){
    openRuns(tb.id,d,sl0).forEach(function(r){ needing++; seatsFree+=r.free; });
  });
  var h='';
  h+='<div class="page-head"><div><h2>Schedule</h2><p>'+list.length+' booking'+(list.length===1?"":"s")+
     ' &middot; '+seatsFilled+' seat'+(seatsFilled===1?"":"s")+' filled'+
     (needing?' &middot; <b style="color:var(--gold)">'+needing+' table'+(needing===1?"":"s")+' needing '+seatsFree+' more player'+(seatsFree===1?"":"s")+'</b>':'')+
     '</p></div>'+
     '<div class="head-actions">'+
     '<div class="seg"><button type="button" data-mode="grid" class="'+(state.schedMode==="grid"?"on":"")+'">Grid</button>'+
     '<button type="button" data-mode="list" class="'+(state.schedMode==="list"?"on":"")+'">Day list</button>'+
     '<button type="button" data-mode="open" class="'+(state.schedMode==="open"?"on":"")+'">Open seats'+(needing?' <em style="font-style:normal;opacity:.7">('+needing+')</em>':'')+'</button></div>'+
     (canWrite()?'<button class="btn btn-gold" type="button" id="newBooking">+ New booking</button>':'')+'</div></div>';

  h+='<div class="datebar">'+
     '<button class="nav-btn" type="button" id="prevDay" aria-label="Previous day">&#8249;</button>'+
     '<button class="nav-btn" type="button" id="nextDay" aria-label="Next day">&#8250;</button>'+
     '<div class="dlabel">'+fmtDate(d)+'<span>'+dayName(d)+(d===today()?" &middot; today":"")+'</span></div>'+
     '<button class="btn btn-sm" type="button" id="todayBtn">Today</button>'+
     '<input class="inp" id="datePick" type="date" value="'+d+'" style="width:auto;padding:6px 10px;border-radius:7px">'+
     '</div>';

  h += state.schedMode==="grid" ? scheduleGrid(d)
     : state.schedMode==="open" ? scheduleOpen(d)
     : scheduleList(d, list);

  h+='<div class="legend">'+
     '<span><i style="background:var(--jade-bg);border-color:var(--jade-line)"></i>To Play</span>'+
     '<span><i style="background:var(--plum-bg);border-color:var(--plum-line)"></i>To Learn</span>'+
     '<span><i style="background:var(--surface);border-color:var(--line);background-image:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,.14) 3px,rgba(0,0,0,.14) 6px)"></i>Striped = payment outstanding</span>'+
     '<span><i style="border-color:var(--gold);border-style:dashed;background:transparent"></i>Dashed = seats still free</span>'+
     '<span>Tap an empty cell to book it, or a dashed block to fill a table.</span></div>';
  return h;
}

function scheduleGrid(d){
  var narrow = (typeof window!=="undefined" && window.innerWidth<861);
  var sl=slots(), tbs=activeTables(), W=narrow?72:66, LANE=narrow?38:30;
  var h='<div class="gridwrap"><div class="grid">';
  h+='<div class="grow ghead"><div class="gcorner"><span>Table</span></div><div class="gtimes">';
  sl.forEach(function(t){ h+='<div class="gtime'+(t.slice(3)==="00"?" hr":"")+'">'+(t.slice(3)==="00"?t12(t):"")+'</div>'; });
  h+='</div></div>';

  tbs.forEach(function(tb){
    var packed = laneAssign(liveOn(tb.id,d));
    var runs   = canWrite() ? openRuns(tb.id,d,sl) : [];
    var lanes  = packed.count + (runs.length?1:0);
    var rowH   = Math.max(58, lanes*LANE+10);
    var tall   = (lanes===1);
    var blockH = tall ? rowH-10 : LANE-6;
    h+='<div class="grow" style="height:'+rowH+'px">'+
       '<div class="glabel" style="height:'+rowH+'px"><b>Table '+tb.num+'</b>'+
       '<small>'+tb.capacity+' seats</small></div>'+
       '<div class="gtrack" style="height:'+rowH+'px">';

    sl.forEach(function(t){
      h+='<button class="gcell" type="button" data-table="'+tb.id+'" data-start="'+t+'" aria-label="Book Table '+tb.num+' at '+t12(t)+'"></button>';
    });

    packed.items.forEach(function(it){
      var b=it.b;
      var off=slotIndex(b.start), span=(t2m(b.end)-t2m(b.start))/DB.settings.slot;
      if(off<0||span<=0) return;
      var c=customer(b.customerId), tch=teacher(b.teacherId);
      var unpaid = b.payment==="unpaid"||b.payment==="partial";
      var dotc = b.payment==="paid" ? "var(--jade)" : b.payment==="partial" ? "var(--amber)" : b.payment==="refunded" ? "var(--muted)" : "var(--red)";
      h+='<button class="blk '+TYPES[b.type].cls+(unpaid?" unpaid":"")+'" type="button" data-book="'+b.id+'" '+
         'style="left:'+(off*W+3)+'px;width:'+(span*W-6)+'px;top:'+(5+it.lane*LANE)+'px;height:'+blockH+'px">'+
         '<span class="dot" style="background:'+dotc+'"></span>'+
         '<span class="bn">'+esc(c.name)+' <span class="seatn">'+b.guests+'p</span></span>'+
         (tall ? '<span class="bm">'+t12(b.start)+(tch?" &middot; "+initials(tch.name):"")+'</span>' : '')+
         '</button>';
    });

    runs.forEach(function(r){
      var endT = m2t(t2m(sl[r.to])+DB.settings.slot);
      h+='<button class="blk ghost" type="button" data-fill="'+tb.id+'" data-start="'+sl[r.from]+'" '+
         'data-end="'+endT+'" data-free="'+r.free+'" '+
         'title="Table '+tb.num+' has '+r.free+' seat(s) free from '+t12(sl[r.from])+' to '+t12(endT)+'" '+
         'style="left:'+(r.from*W+3)+'px;width:'+((r.to-r.from+1)*W-6)+'px;top:'+(5+packed.count*LANE)+'px;height:'+(LANE-6)+'px">'+
         '<span class="bn">+ '+r.free+' free</span></button>';
    });

    h+='</div></div>';
  });
  h+='</div></div>';
  return h;
}

function scheduleOpen(d){
  var sl=slots(), rows=[];
  activeTables().forEach(function(tb){
    openRuns(tb.id,d,sl).forEach(function(r){
      rows.push({ tb:tb, start:sl[r.from], end:m2t(t2m(sl[r.to])+DB.settings.slot), taken:r.taken, free:r.free });
    });
  });
  rows.sort(function(a,b){ return (t2m(a.start)-t2m(b.start)) || (a.tb.num-b.tb.num); });
  if(!rows.length)
    return '<div class="card empty">Nothing part full on '+fmtDate(d)+'. Every table is either empty or has a full four.</div>';
  var h='<div class="daylist">';
  rows.forEach(function(r){
    var pct=Math.round(r.taken/r.tb.capacity*100);
    var who=liveOn(r.tb.id,d).filter(function(b){ return overlaps(r.start,r.end,b.start,b.end); })
      .map(function(b){ return esc(customer(b.customerId).name)+" ("+b.guests+")"; }).join(", ");
    h+='<button class="dayrow" type="button" data-fill="'+r.tb.id+'" data-start="'+r.start+'" data-end="'+r.end+'" data-free="'+r.free+'">'+
       '<div class="stripe" style="background:var(--gold)"></div>'+
       '<div class="tm">'+t12(r.start)+'<small>'+t12(r.end)+'</small></div>'+
       '<div class="bd"><b>Table '+r.tb.num+'</b>'+
       '<div class="sub">'+r.taken+' of '+r.tb.capacity+' seats'+
       '<span class="seatbar"><span style="width:'+pct+'%"></span></span></div>'+
       (who?'<div class="sub" style="margin-top:2px">'+who+'</div>':'')+
       '</div>'+
       '<div class="rt"><span class="pill seatpill">'+r.free+' seat'+(r.free===1?"":"s")+' free</span>'+
       (canWrite()?'<span class="hint">tap to fill</span>':'')+'</div></button>';
  });
  return h+'</div>';
}

function scheduleList(d, list){
  if(!list.length) return '<div class="card empty">No bookings on '+fmtDate(d)+'. Tap <b>New booking</b> to add one.</div>';
  var h='<div class="daylist">';
  list.forEach(function(b){
    var c=customer(b.customerId), tb=tableOf(b.tableId), tch=teacher(b.teacherId), p=payInfo(b.payment);
    h+='<button class="dayrow" type="button" data-book="'+b.id+'">'+
       '<div class="stripe '+TYPES[b.type].cls+'"></div>'+
       '<div class="tm">'+t12(b.start)+'<small>'+t12(b.end)+'</small></div>'+
       '<div class="bd"><b>'+esc(c.name)+'</b>'+
       '<div class="sub">Table '+(tb?tb.num:"?")+' &middot; '+b.guests+' guest'+(b.guests===1?"":"s")+
       (tch?" &middot; "+esc(tch.name):"")+
       (tb?' &middot; slot '+seatsTaken(b.tableId,b.date,b.start,b.end)+'/'+tb.capacity:'')+'</div></div>'+
       '<div class="rt"><span class="pill '+TYPES[b.type].cls+'">'+TYPES[b.type].label+'</span>'+
       '<span class="pill '+p.cls+'">'+p.short+'</span></div></button>';
  });
  h+='</div>';
  return h;
}

function wireSchedule(){
  var m=$("#main");
  Array.prototype.forEach.call(m.querySelectorAll(".seg button"), function(b){
    b.onclick=function(){ state.schedMode=b.getAttribute("data-mode"); render(); };
  });
  $("#prevDay").onclick=function(){ state.date=addDays(state.date,-1); render(); };
  $("#nextDay").onclick=function(){ state.date=addDays(state.date,1); render(); };
  $("#todayBtn").onclick=function(){ state.date=today(); render(); };
  $("#datePick").onchange=function(e){ if(e.target.value){ state.date=e.target.value; render(); } };
  var nb=$("#newBooking"); if(nb) nb.onclick=function(){ openBooking(null,{date:state.date}); };
  Array.prototype.forEach.call(m.querySelectorAll(".gcell"), function(c){
    c.onclick=function(){ if(!canWrite()){ toast("You have view-only access."); return; }
      openBooking(null,{date:state.date, tableId:c.getAttribute("data-table"), start:c.getAttribute("data-start")}); };
  });
  Array.prototype.forEach.call(m.querySelectorAll("[data-fill]"), function(g){
    g.onclick=function(e){
      e.stopPropagation();
      if(!canWrite()){ toast("You have view-only access."); return; }
      openBooking(null,{ date:state.date, tableId:g.getAttribute("data-fill"),
        start:g.getAttribute("data-start"), end:g.getAttribute("data-end"),
        guests:+g.getAttribute("data-free") });
    };
  });
  Array.prototype.forEach.call(m.querySelectorAll("[data-book]"), function(b){
    b.onclick=function(){ openBooking(b.getAttribute("data-book")); };
  });
}

/* ============ BOOKING MODAL ============ */
function openBooking(id, pre){
  pre = pre || {};
  var existing = id ? DB.bookings.filter(function(b){return b.id===id;})[0] : null;
  var c = existing ? customer(existing.customerId) : null;
  var startDefault = pre.start || "11:00";
  var typeDefault = existing ? existing.type : (pre.type || "play");
  var preCust = pre.customerId ? customer(pre.customerId) : null;
  var d = existing ? {
      id:existing.id, customerId:existing.customerId, customerName:c.name, phone:c.phone, email:c.email||"",
      source:c.source||"Walk-in", custNotes:c.notes||"",
      type:existing.type, guests:existing.guests, date:existing.date, start:existing.start, end:existing.end,
      tableId:existing.tableId, teacherId:existing.teacherId, payment:existing.payment,
      amountDue:existing.amountDue, amountPaid:existing.amountPaid, stage:existing.stage, notes:existing.notes||""
    } : {
      id:null,
      customerId: pre.customerId||"",
      customerName: preCust ? preCust.name : "",
      phone: preCust ? preCust.phone : "",
      email: preCust ? (preCust.email||"") : "",
      source: preCust ? (preCust.source||"Instagram") : "Instagram",
      custNotes:"",
      type:typeDefault, guests:pre.guests||4, date:pre.date||today(), start:startDefault,
      end: pre.end || m2t(t2m(startDefault)+(typeDefault==="learn"?DB.settings.defLearn:DB.settings.defPlay)),
      tableId: pre.tableId || (activeTables()[0]||{}).id, teacherId:"",
      payment: pre.payment || "unpaid",
      amountDue: pre.amountDue!=null ? +pre.amountDue
                 : (typeDefault==="learn" ? DB.settings.rateLearn : DB.settings.ratePlay),
      amountPaid: pre.amountPaid!=null ? +pre.amountPaid : 0,
      stage: pre.stage || "New Lead", notes:""
    };
  var override=false;

  var root=$("#modalRoot");
  function close(){ root.innerHTML=""; document.removeEventListener("keydown",onKey); }
  function onKey(e){ if(e.key==="Escape") close(); }
  document.addEventListener("keydown",onKey);

  function draw(){
    var chk=checkConflicts(d);
    var tbs=activeTables(), tch=activeTeachers();
    var balance = (+d.amountDue||0)-(+d.amountPaid||0);

    var h='<div class="scrim" id="scrim"><div class="modal" role="dialog" aria-modal="true">';
    h+='<header><h3>'+(d.id?"Edit booking":"New booking")+'</h3><button class="x" type="button" id="mClose" aria-label="Close">&times;</button></header>';
    h+='<div class="body">';

    if(chk.errors.length) h+='<div class="alert bad"><b>Can’t save yet</b><br>'+chk.errors.join("<br>")+'</div>';
    chk.warnings.forEach(function(w){ h+='<div class="alert warn">'+w+'</div>'; });

    /* customer */
    h+='<div class="sect"><div class="eyebrow" style="margin-bottom:9px">Customer</div>';
    h+='<div class="row2"><div class="field"><label for="fName">Customer</label>'+
       '<input class="inp" id="fName" value="'+esc(d.customerName)+'" placeholder="Search by name or phone" autocomplete="off">'+
       (d.customerId?'<div class="hint" style="color:var(--jade)">Customer selected</div>'
                    :'<div class="hint">Existing customers only. New people start as an enquiry.</div>')+
       '</div>'+
       '<div class="field"><label for="fPhone">Phone number</label><input class="inp" id="fPhone" value="'+esc(d.phone)+'" placeholder="+91 98XXX XXXXX"></div></div>';
    h+='<div id="suggBox"></div>';
    h+='<div class="row2"><div class="field"><label for="fEmail">Email <span style="text-transform:none;letter-spacing:0;font-weight:400">(optional)</span></label>'+
       '<input class="inp" id="fEmail" type="email" value="'+esc(d.email)+'"></div>'+
       '<div class="field"><label for="fSource">Source</label><select class="inp" id="fSource">'+
       DB.sources.map(function(s){return '<option'+(s===d.source?" selected":"")+'>'+esc(s)+'</option>';}).join("")+
       '</select></div></div>';
    h+='</div>';

    /* session */
    h+='<div class="sect"><div class="eyebrow" style="margin-bottom:9px">Session</div>';
    h+='<div class="chiprow" style="margin-bottom:11px">'+
       '<button type="button" class="chip jade '+(d.type==="play"?"on":"")+'" data-type="play">To Play &middot; Studio</button>'+
       '<button type="button" class="chip plum '+(d.type==="learn"?"on":"")+'" data-type="learn">To Learn &middot; Academy</button></div>';
    h+='<div class="row3">'+
       '<div class="field"><label for="fDate">Date</label><input class="inp" id="fDate" type="date" value="'+d.date+'">'+
       '<div class="hint">'+dayName(d.date)+'</div></div>'+
       '<div class="field"><label for="fStart">Start</label><input class="inp" id="fStart" type="time" step="1800" value="'+d.start+'"></div>'+
       '<div class="field"><label for="fEnd">End</label><input class="inp" id="fEnd" type="time" step="1800" value="'+d.end+'">'+
       '<div class="hint">'+((t2m(d.end)-t2m(d.start))>0?(t2m(d.end)-t2m(d.start))+" min":"&nbsp;")+'</div></div></div>';
    var tbNow  = tableOf(d.tableId);
    var takenNow = tbNow ? seatsTaken(d.tableId, d.date, d.start, d.end, d.id) : 0;
    var freeNow  = tbNow ? tbNow.capacity - takenNow : 0;
    h+='<div class="row3">'+
       '<div class="field"><label for="fTable">Table</label><select class="inp" id="fTable">'+
       tbs.map(function(t){return '<option value="'+t.id+'"'+(t.id===d.tableId?" selected":"")+'>Table '+t.num+' ('+t.capacity+' seats)</option>';}).join("")+
       '</select>'+
       (tbNow ? '<div class="hint"'+(freeNow<=0?' style="color:var(--red)"':(takenNow?' style="color:var(--gold)"':''))+'>'+
          (takenNow ? takenNow+' of '+tbNow.capacity+' seats taken in this slot, room for '+freeNow
                    : 'Empty for this slot, all '+tbNow.capacity+' seats free')+'</div>' : '')+
       '</div>'+
       '<div class="field"><label for="fGuests">Guests</label><select class="inp" id="fGuests">'+
       [1,2,3,4,5,6,7,8].map(function(n){return '<option value="'+n+'"'+(n===+d.guests?" selected":"")+'>'+n+'</option>';}).join("")+
       '</select></div>'+
       '<div class="field"><label for="fTeacher">Teacher'+(d.type==="learn"?' <span style="color:var(--red)">*</span>':'')+'</label>'+
       '<select class="inp" id="fTeacher"'+(d.type==="play"?' disabled':'')+'>'+
       '<option value="">'+(d.type==="learn"?"Select a teacher":"Not required")+'</option>'+
       tch.map(function(t){return '<option value="'+t.id+'"'+(t.id===d.teacherId?" selected":"")+'>'+esc(t.name)+'</option>';}).join("")+
       '</select></div></div>';
    h+='</div>';

    /* payment */
    h+='<div class="sect"><div class="eyebrow" style="margin-bottom:9px">Payment &amp; pipeline</div>';
    h+='<div class="row3">'+
       '<div class="field"><label for="fPay">Payment status</label><select class="inp" id="fPay">'+
       PAY.map(function(p){return '<option value="'+p.v+'"'+(p.v===d.payment?" selected":"")+'>'+p.label+'</option>';}).join("")+
       '</select></div>'+
       '<div class="field"><label for="fDue">Amount due</label><input class="inp mono" id="fDue" type="number" min="0" step="100" value="'+(+d.amountDue||0)+'"></div>'+
       '<div class="field"><label for="fPaid">Amount received</label><input class="inp mono" id="fPaid" type="number" min="0" step="100" value="'+(+d.amountPaid||0)+'">'+
       '<div class="hint">'+(balance>0?"Balance "+inr(balance):"Settled")+'</div></div></div>';
    h+='<div class="field"><label for="fStage">Pipeline stage</label><select class="inp" id="fStage">'+
       STAGES.concat(CLOSED).map(function(s){return '<option'+(s===d.stage?" selected":"")+'>'+s+'</option>';}).join("")+
       '</select></div>';
    h+='<div class="field"><label for="fNotes">Internal notes</label><textarea class="inp" id="fNotes" rows="2" placeholder="Anything the front desk should know">'+esc(d.notes)+'</textarea></div>';
    if(chk.warnings.length)
      h+='<label class="ckrow"><input type="checkbox" id="fOverride"'+(override?" checked":"")+'> I’ve read the warnings above and want to save anyway.</label>';
    h+='</div>';

    h+='</div>'; /* body */

    h+='<footer>';
    if(d.id && perm.admin) h+='<button class="btn btn-danger btn-sm" type="button" id="mDelete">Delete</button>';
    h+='<div class="right"><button class="btn" type="button" id="mCancel">Cancel</button>'+
       '<button class="btn btn-primary" type="button" id="mSave"'+((chk.errors.length||(chk.warnings.length&&!override)||!canWrite())?" disabled style=\"opacity:.45;cursor:not-allowed\"":"")+'>'+
       (d.id?"Save changes":"Create booking")+'</button></div>';
    h+='</footer></div></div>';

    setHTML(root, h);
    wire();
  }

  var drawT=null;
  function scheduleDraw(ms){
    /* Draw on the next tick, not right now. A click from one field to the
       next fires change BEFORE focus lands, so an immediate redraw destroys
       the field being clicked into. One tick later the focus has arrived and
       setHTML can put it back. */
    if(drawT) clearTimeout(drawT);
    drawT=setTimeout(function(){
      drawT=null;
      if(!document.getElementById("fName")) return;   /* closed meanwhile */
      collect(); draw();
    }, ms||0);
  }

  function collect(){
    d.customerName=$("#fName").value; d.phone=$("#fPhone").value; d.email=$("#fEmail").value;
    d.source=$("#fSource").value; d.date=$("#fDate").value||d.date;
    d.start=$("#fStart").value||d.start; d.end=$("#fEnd").value||d.end;
    d.tableId=$("#fTable").value; d.guests=+$("#fGuests").value;
    d.teacherId=$("#fTeacher").value; d.payment=$("#fPay").value;
    d.amountDue=+$("#fDue").value||0; d.amountPaid=+$("#fPaid").value||0;
    d.stage=$("#fStage").value; d.notes=$("#fNotes").value;
    var ov=$("#fOverride"); override = ov ? ov.checked : false;
  }

  function wire(){
    $("#scrim").onclick=function(e){ if(e.target.id==="scrim") close(); };
    $("#mClose").onclick=close; $("#mCancel").onclick=close;

    Array.prototype.forEach.call(document.querySelectorAll(".chip[data-type]"), function(b){
      b.onclick=function(){
        collect();
        d.type=b.getAttribute("data-type");
        if(d.type==="play"){ d.teacherId=""; d.amountDue=DB.settings.ratePlay; }
        else { d.amountDue=DB.settings.rateLearn; }
        d.end=m2t(t2m(d.start)+(d.type==="play"?DB.settings.defPlay:DB.settings.defLearn));
        if(d.payment==="paid") d.amountPaid=d.amountDue;
        draw();
      };
    });

    ["fPhone","fEmail","fSource","fTable","fGuests","fTeacher","fDue","fPaid","fNotes"].forEach(function(idf){
      var e=$("#"+idf); if(e) e.onchange=function(){ collect(); scheduleDraw(); };
    });
    $("#fDate").onchange=function(){ collect(); scheduleDraw(); };
    $("#fStart").onchange=function(){
      var old=t2m(d.start), dur=t2m(d.end)-old;
      collect();
      if(dur>0) d.end=m2t(t2m(d.start)+dur);
      draw();
    };
    $("#fEnd").onchange=function(){ collect(); scheduleDraw(); };
    $("#fPay").onchange=function(){
      collect();
      if(d.payment==="paid") d.amountPaid=d.amountDue;
      if(d.payment==="unpaid") d.amountPaid=0;
      if(d.payment==="refunded") d.amountPaid=0;
      if(d.payment==="paid" && (d.stage==="New Lead"||d.stage==="Confirmed")) d.stage="Paid";
      draw();
    };
    $("#fStage").onchange=function(){ collect(); scheduleDraw(); };
    var ov=$("#fOverride"); if(ov) ov.onchange=function(){ collect(); scheduleDraw(); };

    /* customer search */
    var nameI=$("#fName");
    nameI.oninput=function(){
      d.customerName=nameI.value; d.customerId="";
      var q=nameI.value.trim().toLowerCase();
      var box=$("#suggBox");
      if(q.length<2){ box.innerHTML=""; return; }
      var hits=DB.customers.filter(function(c){
        return c.name.toLowerCase().indexOf(q)>=0 || String(c.phone).replace(/\s/g,"").indexOf(q.replace(/\s/g,""))>=0;
      }).slice(0,6);
      if(!hits.length){
        box.innerHTML='<div class="alert warn" style="margin:6px 0 0">No customer called that. '+
          'New people go through <b>Enquiries</b> first so their source and quote get recorded.'+
          (canWrite()?'<br><button class="btn btn-sm" type="button" id="toLead" style="margin-top:7px">Create an enquiry for &ldquo;'+esc(nameI.value.trim())+'&rdquo;</button>':'')+
          '</div>';
        var tl=$("#toLead");
        if(tl) tl.onclick=function(){
          var nm=nameI.value.trim(), ph=$("#fPhone").value.trim();
          close();
          go("leads");
          setTimeout(function(){ openLead(null,{name:nm, phone:ph}); }, 60);
        };
        return;
      }
      box.innerHTML='<div class="sugg">'+hits.map(function(c){
        return '<button type="button" data-cid="'+c.id+'"><span class="nm">'+esc(c.name)+'</span> '+
               '<span class="ph">'+esc(c.phone)+'</span></button>';
      }).join("")+'</div>';
      Array.prototype.forEach.call(box.querySelectorAll("[data-cid]"), function(b){
        b.onclick=function(){
          var c=customer(b.getAttribute("data-cid"));
          collect();
          d.customerId=c.id; d.customerName=c.name; d.phone=c.phone; d.email=c.email||""; d.source=c.source||"Walk-in";
          draw();
        };
      });
    };
    nameI.onblur=function(){ d.customerName=nameI.value; };

    var del=$("#mDelete");
    if(del) del.onclick=function(){
      var gone=d.id;
      close(); render();
      delBooking(gone).then(function(){ toast("Booking deleted."); }, function(e){ fail(e); });
    };

    $("#mSave").onclick=function(){
      collect();
      var chk=checkConflicts(d);
      if(chk.errors.length || (chk.warnings.length && !override)){ draw(); return; }
      /* customers are created under Enquiries, never here. This only
         keeps the chosen customer's contact details up to date. */
      var cid=d.customerId;
      if(!cid){ draw(); return; }
      var cu=customer(cid);
      var cust={ id:cid, name:d.customerName.trim(), phone:d.phone.trim(), email:d.email.trim(),
                 source:d.source, notes:cu.notes||"" };
      if(d.payment==="paid" && (d.stage==="New Lead"||d.stage==="Confirmed")) d.stage="Paid";
      var rec={ id:d.id||("b"+uid()), customerId:cid, type:d.type, guests:+d.guests, date:d.date,
        start:d.start, end:d.end, tableId:d.tableId, teacherId:d.type==="learn"?d.teacherId:"",
        payment:d.payment, amountDue:+d.amountDue, amountPaid:+d.amountPaid, stage:d.stage, notes:d.notes,
        createdAt:Date.now(), createdBy:(perm.name||"") };
      var wasEdit=!!d.id, who=d.customerName.trim();
      close(); state.date=rec.date;
      Promise.all([putCustomer(cust), putBooking(rec)]).then(function(){
        render(); toast(wasEdit?"Booking updated.":"Booking created for "+who+".");
      }, function(e){ render(); fail(e); });
    };
  }
  draw();
}

/* ============ PIPELINE ============ */
function filtered(){
  var f=state.filters;
  return DB.bookings.filter(function(b){
    if(f.type && b.type!==f.type) return false;
    if(f.pay && b.payment!==f.pay) return false;
    if(f.stage && b.stage!==f.stage) return false;
    if(f.teacher && b.teacherId!==f.teacher) return false;
    if(f.from && b.date < f.from) return false;
    if(f.to && b.date > f.to) return false;
    return true;
  }).sort(function(a,b){ return a.date===b.date ? t2m(a.start)-t2m(b.start) : (a.date<b.date?-1:1); });
}

function viewPipeline(){
  var rows=filtered();
  var h='<div class="page-head"><div><h2>Lead pipeline</h2><p>'+rows.length+' booking'+(rows.length===1?"":"s")+' matching your filters</p></div>'+
    '<div class="head-actions"><div class="seg">'+
    '<button type="button" data-pm="board" class="'+(state.pipeMode==="board"?"on":"")+'">Board</button>'+
    '<button type="button" data-pm="table" class="'+(state.pipeMode==="table"?"on":"")+'">Table</button></div>'+
    (canWrite()?'<button class="btn btn-gold" type="button" id="newBooking2">+ New booking</button>':'')+'</div></div>';

  var f=state.filters;
  h+='<div class="filters">'+
    '<select class="inp" id="flType"><option value="">All types</option>'+
      '<option value="play"'+(f.type==="play"?" selected":"")+'>To Play</option>'+
      '<option value="learn"'+(f.type==="learn"?" selected":"")+'>To Learn</option></select>'+
    '<select class="inp" id="flPay"><option value="">All payments</option>'+
      PAY.map(function(p){return '<option value="'+p.v+'"'+(f.pay===p.v?" selected":"")+'>'+p.label+'</option>';}).join("")+'</select>'+
    '<select class="inp" id="flTeacher"><option value="">All teachers</option>'+
      DB.teachers.map(function(t){return '<option value="'+t.id+'"'+(f.teacher===t.id?" selected":"")+'>'+esc(t.name)+'</option>';}).join("")+'</select>'+
    '<input class="inp" id="flFrom" type="date" value="'+f.from+'" aria-label="From date">'+
    '<input class="inp" id="flTo" type="date" value="'+f.to+'" aria-label="To date">'+
    '<button class="btn btn-sm" type="button" id="flClear">Clear</button></div>';

  if(state.pipeMode==="board"){
    h+='<div class="kan">';
    STAGES.forEach(function(s){
      var items=rows.filter(function(b){return b.stage===s;});
      h+='<div class="kcol" data-stage="'+esc(s)+'"><h3>'+s+'<em>'+items.length+'</em></h3><div class="kcards">';
      items.forEach(function(b){ h+=kcard(b); });
      if(!items.length) h+='<div class="hint" style="padding:7px 2px">Nothing here.</div>';
      h+='</div></div>';
    });
    h+='</div>';
    var closed=rows.filter(function(b){return isClosed(b);});
    h+='<details style="margin-top:14px"><summary style="cursor:pointer;font-size:12.5px;color:var(--muted);font-weight:600">'+
       'Cancelled &amp; no-shows ('+closed.length+')</summary><div class="kan" style="margin-top:9px;grid-template-columns:repeat(2,minmax(216px,1fr))">'+
       CLOSED.map(function(s){
         var it=rows.filter(function(b){return b.stage===s;});
         return '<div class="kcol" data-stage="'+esc(s)+'"><h3>'+s+'<em>'+it.length+'</em></h3><div class="kcards">'+
           (it.length?it.map(kcard).join(""):'<div class="hint" style="padding:7px 2px">Nothing here.</div>')+'</div></div>';
       }).join("")+'</div></details>';
  } else {
    h+='<div class="tblwrap"><table class="dt"><thead><tr>'+
      '<th>Customer</th><th>Type</th><th>Date</th><th>Time</th><th>Table</th><th>Teacher</th><th>Payment</th><th>Balance</th><th>Stage</th>'+
      '</tr></thead><tbody>';
    if(!rows.length) h+='<tr><td colspan="9"><div class="empty">Nothing matches those filters.</div></td></tr>';
    rows.forEach(function(b){
      var c=customer(b.customerId), tb=tableOf(b.tableId), tc=teacher(b.teacherId), p=payInfo(b.payment);
      var bal=(+b.amountDue||0)-(+b.amountPaid||0);
      h+='<tr data-book="'+b.id+'"><td><b>'+esc(c.name)+'</b><div class="hint mono">'+esc(c.phone)+'</div></td>'+
        '<td><span class="pill '+TYPES[b.type].cls+'">'+TYPES[b.type].label+'</span></td>'+
        '<td class="mono">'+fmtShort(b.date)+'<div class="hint">'+dayName(b.date).slice(0,3)+'</div></td>'+
        '<td class="mono">'+t12(b.start)+'&ndash;'+t12(b.end)+'</td>'+
        '<td class="mono">'+(tb?tb.num:"&mdash;")+'</td>'+
        '<td>'+(tc?esc(tc.name):'<span style="color:var(--muted)">&mdash;</span>')+'</td>'+
        '<td><span class="pill '+p.cls+'">'+p.short+'</span></td>'+
        '<td class="mono"'+(bal>0?' style="color:var(--red);font-weight:600"':'')+'>'+(bal>0?inr(bal):"&mdash;")+'</td>'+
        '<td><span class="pill ghost">'+esc(b.stage)+'</span></td></tr>';
    });
    h+='</tbody></table></div>';
  }
  return h;
}

function kcard(b){
  var c=customer(b.customerId), tb=tableOf(b.tableId), tc=teacher(b.teacherId), p=payInfo(b.payment);
  return '<div class="kcard" draggable="true" data-kid="'+b.id+'">'+
    '<b>'+esc(c.name)+'</b>'+
    '<div class="meta">'+fmtShort(b.date)+' &middot; '+t12(b.start)+' &middot; T'+(tb?tb.num:"?")+(tc?" &middot; "+initials(tc.name):"")+'</div>'+
    '<div class="tags"><span class="pill '+TYPES[b.type].cls+'">'+TYPES[b.type].label+'</span>'+
    '<span class="pill '+p.cls+'">'+p.short+'</span></div>'+
    '<select class="kmove" data-move="'+b.id+'">'+
      STAGES.concat(CLOSED).map(function(s){return '<option'+(s===b.stage?" selected":"")+'>'+s+'</option>';}).join("")+
    '</select></div>';
}

function wirePipeline(){
  var m=$("#main");
  Array.prototype.forEach.call(m.querySelectorAll("[data-pm]"), function(b){
    b.onclick=function(){ state.pipeMode=b.getAttribute("data-pm"); render(); };
  });
  var nb2=$("#newBooking2"); if(nb2) nb2.onclick=function(){ openBooking(null,{date:state.date}); };
  function setF(idf,key){ var e=$("#"+idf); if(e) e.onchange=function(){ state.filters[key]=e.value; render(); }; }
  setF("flType","type"); setF("flPay","pay"); setF("flTeacher","teacher"); setF("flFrom","from"); setF("flTo","to");
  $("#flClear").onclick=function(){ state.filters={type:"",pay:"",stage:"",teacher:"",from:"",to:""}; render(); };

  Array.prototype.forEach.call(m.querySelectorAll("tr[data-book]"), function(r){
    r.onclick=function(){ openBooking(r.getAttribute("data-book")); };
  });
  Array.prototype.forEach.call(m.querySelectorAll("[data-move]"), function(s){
    s.onclick=function(e){ e.stopPropagation(); };
    s.onchange=function(e){
      e.stopPropagation();
      moveStage(s.getAttribute("data-move"), s.value);
    };
  });
  Array.prototype.forEach.call(m.querySelectorAll(".kcard"), function(card){
    card.onclick=function(e){ if(e.target.tagName==="SELECT"||e.target.tagName==="OPTION") return; openBooking(card.getAttribute("data-kid")); };
    card.ondragstart=function(e){ e.dataTransfer.setData("text/plain", card.getAttribute("data-kid")); card.classList.add("drag"); };
    card.ondragend=function(){ card.classList.remove("drag"); };
  });
  Array.prototype.forEach.call(m.querySelectorAll(".kcol"), function(col){
    col.ondragover=function(e){ e.preventDefault(); col.classList.add("over"); };
    col.ondragleave=function(){ col.classList.remove("over"); };
    col.ondrop=function(e){
      e.preventDefault(); col.classList.remove("over");
      moveStage(e.dataTransfer.getData("text/plain"), col.getAttribute("data-stage"));
    };
  });
}

function moveStage(bid, stage){
  var b=DB.bookings.filter(function(x){return x.id===bid;})[0];
  if(!b) return;
  var rec={}; for(var k in b) rec[k]=b[k];
  rec.stage=stage;
  if(stage==="Paid" && rec.payment!=="paid"){ rec.payment="paid"; rec.amountPaid=rec.amountDue; }
  var who=customer(rec.customerId).name;
  putBooking(rec).then(function(){ render(); toast(who+" moved to "+stage+"."); },
                       function(e){ render(); fail(e); });
  render();
}

/* ============ LEADS / ENQUIRIES ============ */
function lead(id){ return DB.leads.filter(function(l){ return l.id===id; })[0] || null; }

/* The database compares numbers on their last ten digits, so
   "+91 98111 22333", "098111 22333" and "9811122333" are one person.
   This mirrors public.phone_key() so the form and the database agree. */
function phoneKey(p){ return String(p||"").replace(/\D/g,"").slice(-10); }

/* Who already owns this number. Returns null when it is free.
   exceptLead and exceptCustomer let an enquiry ignore itself and the
   customer it converted into, which legitimately share a number. */
function phoneOwner(phone, exceptLead, exceptCustomer){
  var k=phoneKey(phone);
  if(k.length<7) return null;          /* too short to be a real mobile */
  var l=DB.leads.filter(function(x){
    return x.id!==exceptLead && phoneKey(x.phone)===k; })[0];
  if(l) return { kind:"lead", rec:l };
  var c=DB.customers.filter(function(x){
    return x.id!==exceptCustomer && phoneKey(x.phone)===k; })[0];
  if(c) return { kind:"customer", rec:c };
  return null;
}

function leadQuote(l){
  if(l.service==="learn"){
    var parts=[];
    if(l.learnClasses!=="" && l.learnClasses!=null) parts.push(l.learnClasses+" class"+(+l.learnClasses===1?"":"es"));
    if(l.learnPrice!=="" && l.learnPrice!=null) parts.push(inr(l.learnPrice));
    return parts.length ? parts.join(" · ") : "Not quoted yet";
  }
  return (l.playPrice!=="" && l.playPrice!=null) ? inr(l.playPrice) : "Not quoted yet";
}
var PAYSTATE = {
  none:  { label:"Settling at the venue", short:"At venue", cls:"unpaid" },
  token: { label:"Token taken",           short:"Token",    cls:"part"   },
  paid:  { label:"Paid in full",          short:"Paid",     cls:"paid"   }
};
function payInfoLead(l){ return PAYSTATE[l.paymentState] || PAYSTATE.none; }
function quoteOf(l){
  var v = l.service==="learn" ? l.learnPrice : l.playPrice;
  if(v==="" || v==null) v = l.service==="learn" ? DB.settings.rateLearn : DB.settings.ratePlay;
  return +v||0;
}
function stillOwed(l){ return Math.max(0, quoteOf(l) - (+l.amountReceived||0)); }
function leadValue(l){
  var v = l.service==="learn" ? l.learnPrice : l.playPrice;
  return (v==="" || v==null) ? 0 : +v;
}

function leadsFiltered(){
  var f=state.leadFilters;
  return DB.leads.filter(function(l){
    if(f.service && l.service!==f.service) return false;
    if(f.stage   && l.stage!==f.stage) return false;
    if(f.source  && l.source!==f.source) return false;
    return true;
  }).sort(function(a,b){ return (b.createdAt||"") < (a.createdAt||"") ? -1 : 1; });
}

function viewLeads(){
  var rows=leadsFiltered();
  var open  = DB.leads.filter(function(l){ return l.stage!=="Converted" && l.stage!==LEAD_LOST; });
  var value = open.reduce(function(s,l){ return s+leadValue(l); },0);
  var collected = DB.leads.reduce(function(s,l){ return s+(+l.amountReceived||0); },0);
  var toCollect = DB.leads.filter(function(l){ return l.stage==="Converted"; })
                          .reduce(function(s,l){ return s+stillOwed(l); },0);
  var f=state.leadFilters;

  var h='<div class="page-head"><div><h2>Enquiries</h2><p>'+
    open.length+' open enquir'+(open.length===1?"y":"ies")+
    (value?' &middot; '+inr(value)+' quoted':'')+
    (collected?' &middot; <b style="color:var(--jade)">'+inr(collected)+' collected</b>':'')+
    (toCollect?' &middot; <b style="color:var(--gold)">'+inr(toCollect)+' to collect at the venue</b>':'')+
    '<span class="hide-sm"> &middot; every customer starts here</span></p></div>'+
    '<div class="head-actions"><div class="seg">'+
    '<button type="button" data-lm="board" class="'+(state.leadMode==="board"?"on":"")+'">Board</button>'+
    '<button type="button" data-lm="table" class="'+(state.leadMode==="table"?"on":"")+'">Table</button></div>'+
    (canWrite()?'<button class="btn btn-gold" type="button" id="newLead">+ New enquiry</button>':'')+
    '</div></div>';

  h+='<div class="filters">'+
    '<select class="inp" id="lfService"><option value="">Both services</option>'+
      '<option value="play"'+(f.service==="play"?" selected":"")+'>To Play</option>'+
      '<option value="learn"'+(f.service==="learn"?" selected":"")+'>To Learn</option></select>'+
    '<select class="inp" id="lfStage"><option value="">All stages</option>'+
      LEAD_STAGES.concat([LEAD_LOST]).map(function(x){
        return '<option'+(f.stage===x?" selected":"")+'>'+x+'</option>'; }).join("")+'</select>'+
    '<select class="inp" id="lfSource"><option value="">All sources</option>'+
      DB.sources.map(function(x){ return '<option'+(f.source===x?" selected":"")+'>'+esc(x)+'</option>'; }).join("")+
      '</select>'+
    '<button class="btn btn-sm" type="button" id="lfClear">Clear</button></div>';

  if(state.leadMode==="board"){
    h+='<div class="kan" style="grid-template-columns:repeat(4,minmax(216px,1fr))">';
    LEAD_STAGES.forEach(function(st){
      var items=rows.filter(function(l){ return l.stage===st; });
      h+='<div class="kcol" data-lstage="'+esc(st)+'"><h3>'+st+'<em>'+items.length+'</em></h3><div class="kcards">';
      items.forEach(function(l){ h+=leadCard(l); });
      if(!items.length) h+='<div class="hint" style="padding:7px 2px">Nothing here.</div>';
      h+='</div></div>';
    });
    h+='</div>';
    var lost=rows.filter(function(l){ return l.stage===LEAD_LOST; });
    h+='<details style="margin-top:14px"><summary style="cursor:pointer;font-size:12.5px;color:var(--muted);font-weight:600">'+
       'Lost enquiries ('+lost.length+')</summary>'+
       '<div class="kan" style="margin-top:9px;grid-template-columns:repeat(2,minmax(216px,1fr))">'+
       '<div class="kcol" data-lstage="'+LEAD_LOST+'"><h3>'+LEAD_LOST+'<em>'+lost.length+'</em></h3><div class="kcards">'+
       (lost.length?lost.map(leadCard).join(""):'<div class="hint" style="padding:7px 2px">Nothing here.</div>')+
       '</div></div></div></details>';
  } else {
    h+='<div class="tblwrap"><table class="dt"><thead><tr>'+
      '<th>Name</th><th>Wants</th><th>Quote</th><th>Received</th><th>To collect</th><th>Contact</th><th>Source</th><th>Stage</th>'+
      '</tr></thead><tbody>';
    if(!rows.length) h+='<tr><td colspan="8"><div class="empty">No enquiries match those filters.</div></td></tr>';
    rows.forEach(function(l){
      h+='<tr data-lead="'+l.id+'"><td><b>'+esc(l.name)+'</b>'+
        (l.customerId?'<div class="hint">now a customer</div>':'')+'</td>'+
        '<td><span class="pill '+SERVICES[l.service].cls+'">'+SERVICES[l.service].label+'</span></td>'+
        '<td class="mono">'+esc(leadQuote(l))+'</td>'+
        '<td class="mono">'+(+l.amountReceived>0?inr(l.amountReceived):'<span style="color:var(--muted)">&mdash;</span>')+
          (l.customerId?'<div class="hint">'+payInfoLead(l).short+'</div>':'')+'</td>'+
        '<td class="mono"'+(l.customerId&&stillOwed(l)>0?' style="color:var(--red);font-weight:600"':'')+'>'+
          (l.customerId?(stillOwed(l)>0?inr(stillOwed(l)):"settled"):'<span style="color:var(--muted)">&mdash;</span>')+'</td>'+
        '<td class="mono">'+esc(l.phone)+(l.email?'<div class="hint">'+esc(l.email)+'</div>':'')+'</td>'+
        '<td>'+esc(l.source||"&mdash;")+'</td>'+
        '<td><span class="pill '+(l.stage==="Converted"?"paid":l.stage===LEAD_LOST?"unpaid":"ghost")+'">'+esc(l.stage)+'</span></td></tr>';
    });
    h+='</tbody></table></div>';
  }
  return h;
}

function leadCard(l){
  return '<div class="kcard" draggable="true" data-lkid="'+l.id+'">'+
    '<b>'+esc(l.name)+'</b>'+
    '<div class="meta">'+esc(l.phone||"no phone")+'</div>'+
    '<div class="tags"><span class="pill '+SERVICES[l.service].cls+'">'+SERVICES[l.service].label+'</span>'+
    '<span class="pill ghost">'+esc(leadQuote(l))+'</span>'+
    (+l.partySize>1?'<span class="pill ghost">'+l.partySize+'p</span>':'')+
    (l.customerId?'<span class="pill '+payInfoLead(l).cls+'">'+payInfoLead(l).short+'</span>':'')+
    '</div>'+
    (l.source?'<div class="hint" style="margin-top:5px">via '+esc(l.source)+'</div>':'')+
    '<select class="kmove" data-lmove="'+l.id+'">'+
      LEAD_STAGES.concat([LEAD_LOST]).map(function(x){
        return '<option'+(x===l.stage?" selected":"")+(x==="Converted"&&!l.customerId?" disabled":"")+'>'+x+'</option>';
      }).join("")+
    '</select></div>';
}

function wireLeads(){
  var m=$("#main");
  Array.prototype.forEach.call(m.querySelectorAll("[data-lm]"), function(b){
    b.onclick=function(){ state.leadMode=b.getAttribute("data-lm"); render(); };
  });
  var nl=$("#newLead"); if(nl) nl.onclick=function(){ openLead(null); };
  function setF(id,key){ var e=$("#"+id); if(e) e.onchange=function(){ state.leadFilters[key]=e.value; render(); }; }
  setF("lfService","service"); setF("lfStage","stage"); setF("lfSource","source");
  $("#lfClear").onclick=function(){ state.leadFilters={service:"",stage:"",source:""}; render(); };

  Array.prototype.forEach.call(m.querySelectorAll("tr[data-lead]"), function(r){
    r.onclick=function(){ openLead(r.getAttribute("data-lead")); };
  });
  Array.prototype.forEach.call(m.querySelectorAll("[data-lmove]"), function(sel){
    sel.onclick=function(e){ e.stopPropagation(); };
    sel.onchange=function(e){ e.stopPropagation(); moveLead(sel.getAttribute("data-lmove"), sel.value); };
  });
  Array.prototype.forEach.call(m.querySelectorAll(".kcard[data-lkid]"), function(card){
    card.onclick=function(e){ if(e.target.tagName==="SELECT"||e.target.tagName==="OPTION") return;
      openLead(card.getAttribute("data-lkid")); };
    card.ondragstart=function(e){ e.dataTransfer.setData("text/plain", card.getAttribute("data-lkid")); card.classList.add("drag"); };
    card.ondragend=function(){ card.classList.remove("drag"); };
  });
  Array.prototype.forEach.call(m.querySelectorAll("[data-lstage]"), function(col){
    col.ondragover=function(e){ e.preventDefault(); col.classList.add("over"); };
    col.ondragleave=function(){ col.classList.remove("over"); };
    col.ondrop=function(e){
      e.preventDefault(); col.classList.remove("over");
      moveLead(e.dataTransfer.getData("text/plain"), col.getAttribute("data-lstage"));
    };
  });
}

function moveLead(id, stage){
  var l=lead(id); if(!l) return;
  if(stage==="Converted" && !l.customerId){ openConvert(l); return; }
  var rec={}; for(var k in l) rec[k]=l[k];
  rec.stage=stage;
  render();
  putLead(rec).then(function(){ render(); toast(l.name+" moved to "+stage+"."); }, fail);
}

/* ---- enquiry form ---- */
function openLead(id, pre){
  pre = pre || {};
  var existing = id ? lead(id) : null;
  var d = existing ? JSON.parse(JSON.stringify(existing)) : {
    id:null, name:pre.name||"", phone:pre.phone||"", email:"", source:DB.sources[0]||"Instagram",
    service:"play", playPrice:"", learnClasses:"", learnPrice:"",
    partySize:1, paymentState:"none", amountReceived:0,
    notes:"", stage:"New", customerId:""
  };

  var root=$("#modalRoot");
  function close(){ root.innerHTML=""; document.removeEventListener("keydown",onKey); }
  function onKey(e){ if(e.key==="Escape") close(); }
  document.addEventListener("keydown",onKey);

  function problems(){
    var e=[];
    if(!d.name.trim()) e.push("Enquirer's name is required.");
    if(!d.phone.trim()) e.push("A phone number is required, it's how you'll follow up.");
    if(d.service==="learn" && d.learnClasses!=="" && +d.learnClasses<=0) e.push("Number of classes has to be more than zero.");
    if(phoneOwner(d.phone, d.id, d.customerId)) e.push("__DUPE__");
    return e;
  }

  function draw(){
    var errs=problems();
    var converted = !!d.customerId;
    var cust = converted ? customer(d.customerId) : null;

    var h='<div class="scrim" id="lscrim"><div class="modal" role="dialog" aria-modal="true">';
    h+='<header><h3>'+(d.id?"Enquiry":"New enquiry")+'</h3>'+
       '<button class="x" type="button" id="lClose" aria-label="Close">&times;</button></header>';
    h+='<div class="body">';

    var owner = phoneOwner(d.phone, d.id, d.customerId);
    var plain = errs.filter(function(x){ return x!=="__DUPE__"; });
    if(plain.length) h+='<div class="alert bad"><b>Can’t save yet</b><br>'+plain.join("<br>")+'</div>';
    if(owner){
      if(owner.kind==="lead"){
        h+='<div class="alert bad"><b>That number is already on file.</b><br>'+
           esc(owner.rec.name)+' enquired on this number and is sitting at <b>'+esc(owner.rec.stage)+'</b>. '+
           'Two enquiries for one number means two people chasing the same person.'+
           '<br><button class="btn btn-sm" type="button" id="lGoDupe" style="margin-top:8px">Open '+esc(owner.rec.name)+'\u2019s enquiry</button>'+
           '</div>';
      } else {
        h+='<div class="alert bad"><b>Already a customer.</b><br>'+
           esc(owner.rec.name)+' is on this number already, so they do not need a new enquiry. '+
           'Book them straight from the Schedule.'+
           '<br><button class="btn btn-sm" type="button" id="lGoCust" style="margin-top:8px">Open '+esc(owner.rec.name)+'\u2019s record</button>'+
           '</div>';
      }
    }
    if(converted){
      var ps=payInfoLead(d), owed=stillOwed(d);
      h+='<div class="alert" style="background:var(--jade-bg);border-color:var(--jade-line);color:var(--jade)">'+
        '<b>Converted.</b> '+esc(cust?cust.name:"This enquirer")+' is a customer now. '+ps.label+
        (+d.amountReceived>0?', '+inr(d.amountReceived)+' received':'')+
        (owed>0?'. '+inr(owed)+' still to collect.':'.')+'</div>';
    }

    h+='<div class="sect"><div class="eyebrow" style="margin-bottom:9px">Who got in touch</div>'+
       '<div class="row2">'+
       '<div class="field"><label for="lName">Full name</label><input class="inp" id="lName" value="'+esc(d.name)+'"></div>'+
       '<div class="field"><label for="lPhone">Phone number</label><input class="inp" id="lPhone" value="'+esc(d.phone)+'" placeholder="+91 98XXX XXXXX"></div>'+
       '</div><div class="row2">'+
       '<div class="field"><label for="lEmail">Email <span style="text-transform:none;letter-spacing:0;font-weight:400">(optional)</span></label>'+
       '<input class="inp" id="lEmail" type="email" value="'+esc(d.email)+'"></div>'+
       '<div class="field"><label for="lSource">How did they find you</label><select class="inp" id="lSource">'+
       DB.sources.map(function(x){ return '<option'+(x===d.source?" selected":"")+'>'+esc(x)+'</option>'; }).join("")+
       '</select></div></div></div>';

    h+='<div class="sect"><div class="eyebrow" style="margin-bottom:9px">What they want</div>'+
       '<div class="chiprow" style="margin-bottom:11px">'+
       '<button type="button" class="chip jade '+(d.service==="play"?"on":"")+'" data-lsvc="play">To Play &middot; Studio</button>'+
       '<button type="button" class="chip plum '+(d.service==="learn"?"on":"")+'" data-lsvc="learn">To Learn &middot; Academy</button>'+
       '</div>';

    if(d.service==="play"){
      h+='<div class="row2">'+
         '<div class="field"><label for="lParty">How many coming</label>'+
         '<select class="inp" id="lParty">'+
         [1,2,3,4,5,6,7,8].map(function(n){ return '<option value="'+n+'"'+(n===+d.partySize?" selected":"")+'>'+n+(n===1?" person":" people")+'</option>'; }).join("")+
         '</select></div>'+
         '<div class="field"><label for="lPlayPrice">Price quoted</label>'+
         '<input class="inp mono" id="lPlayPrice" type="number" min="0" step="50" value="'+(d.playPrice===""?"":d.playPrice)+'" placeholder="e.g. 1200">'+
         '<div class="hint">Total for the group. Blank if not quoted yet.</div></div></div>';
    } else {
      h+='<div class="row2">'+
         '<div class="field"><label for="lParty">How many students</label>'+
         '<select class="inp" id="lParty">'+
         [1,2,3,4].map(function(n){ return '<option value="'+n+'"'+(n===+d.partySize?" selected":"")+'>'+n+(n===1?" student":" students")+'</option>'; }).join("")+
         '</select></div>'+
         '<div class="field"><label for="lClasses">Number of classes</label>'+
         '<input class="inp mono" id="lClasses" type="number" min="1" step="1" value="'+(d.learnClasses===""?"":d.learnClasses)+'" placeholder="e.g. 8"></div>'+
         '</div><div class="row2">'+
         '<div class="field"><label for="lLearnPrice">Price quoted</label>'+
         '<input class="inp mono" id="lLearnPrice" type="number" min="0" step="100" value="'+(d.learnPrice===""?"":d.learnPrice)+'" placeholder="e.g. 14000"></div>'+
         '<div></div></div>';
      if(d.learnClasses!=="" && +d.learnClasses>0 && d.learnPrice!=="" && +d.learnPrice>0)
        h+='<div class="hint">Works out at '+inr(Math.round(+d.learnPrice / +d.learnClasses))+' a class.</div>';
    }
    h+='</div>';

    h+='<div class="sect"><div class="eyebrow" style="margin-bottom:9px">Follow up</div>'+
       '<div class="field"><label for="lStage">Stage</label><select class="inp" id="lStage">'+
       LEAD_STAGES.concat([LEAD_LOST]).map(function(x){
         return '<option'+(x===d.stage?" selected":"")+(x==="Converted"&&!converted?" disabled":"")+'>'+x+'</option>';
       }).join("")+'</select>'+
       (converted?'':'<div class="hint">Converted is set by the button below, so a customer record gets created with it.</div>')+
       '</div>'+
       '<div class="field"><label for="lNotes">Notes</label>'+
       '<textarea class="inp" id="lNotes" rows="2" placeholder="What they asked for, when to call back">'+esc(d.notes)+'</textarea></div>'+
       '</div>';

    h+='</div>';

    h+='<footer>';
    if(d.id && perm.admin) h+='<button class="btn btn-danger btn-sm" type="button" id="lDelete">Delete</button>';
    h+='<div class="right">';
    if(d.id && !converted && canWrite())
      h+='<button class="btn btn-gold" type="button" id="lConvert">Convert to customer</button>';
    h+='<button class="btn" type="button" id="lCancel">Cancel</button>'+
       '<button class="btn btn-primary" type="button" id="lSave"'+
       ((errs.length||!canWrite())?' disabled style="opacity:.45;cursor:not-allowed"':'')+'>'+
       (d.id?"Save":"Save enquiry")+'</button></div></footer></div></div>';

    setHTML(root, h);
    wire();
  }

  var drawT=null;
  function scheduleDraw(ms){
    if(drawT) clearTimeout(drawT);
    drawT=setTimeout(function(){
      drawT=null;
      if(!document.getElementById("lName")) return;   /* closed meanwhile */
      collect(); draw();
    }, ms||0);
  }

  function collect(){
    d.name=$("#lName").value; d.phone=$("#lPhone").value; d.email=$("#lEmail").value;
    d.source=$("#lSource").value; d.stage=$("#lStage").value; d.notes=$("#lNotes").value;
    var a=$("#lPlayPrice"); if(a) d.playPrice = a.value===""?"":+a.value;
    var b=$("#lClasses");   if(b) d.learnClasses = b.value===""?"":+b.value;
    var pz=$("#lParty");    if(pz) d.partySize = +pz.value||1;
    var c=$("#lLearnPrice");if(c) d.learnPrice = c.value===""?"":+c.value;
  }

  function wire(){
    $("#lscrim").onclick=function(e){ if(e.target.id==="lscrim") close(); };
    $("#lClose").onclick=close; $("#lCancel").onclick=close;

    Array.prototype.forEach.call(document.querySelectorAll("[data-lsvc]"), function(b){
      b.onclick=function(){ collect(); d.service=b.getAttribute("data-lsvc"); draw(); };
    });
    ["lName","lPhone","lEmail","lSource","lStage","lNotes","lPlayPrice","lClasses","lLearnPrice","lParty"].forEach(function(idf){
      var e=$("#"+idf); if(e) e.onchange=function(){ collect(); scheduleDraw(); };
    });
    /* Warn about a number already on file while it is being typed, not only
       once the field is left. Debounced so it waits for a pause. */
    var ph=$("#lPhone");
    if(ph) ph.oninput=function(){ collect(); scheduleDraw(350); };

    var goDupe=$("#lGoDupe");
    if(goDupe) goDupe.onclick=function(){
      var o=phoneOwner(d.phone, d.id, d.customerId);
      if(!o) return;
      close();
      openLead(o.rec.id);
    };
    var goCust=$("#lGoCust");
    if(goCust) goCust.onclick=function(){
      var o=phoneOwner(d.phone, d.id, d.customerId);
      if(!o) return;
      close();
      state.customerOpen=o.rec.id;
      go("customers");
    };

    var del=$("#lDelete");
    if(del) del.onclick=function(){
      var gone=d.id; close(); render();
      delLead(gone).then(function(){ toast("Enquiry deleted."); }, fail);
    };

    var conv=$("#lConvert");
    if(conv) conv.onclick=function(){
      collect();
      if(problems().length){ draw(); return; }
      var rec={}; for(var k in d) rec[k]=d[k];
      if(!rec.id) rec.id="ld"+uid();
      close();
      openConvert(rec);
    };

    $("#lSave").onclick=function(){
      collect();
      if(problems().length){ draw(); return; }
      var rec={}; for(var k in d) rec[k]=d[k];
      var isNew=!rec.id;
      if(isNew){ rec.id="ld"+uid(); rec.createdBy=perm.name||""; }
      close();
      putLead(rec).then(function(){
        render(); toast(isNew ? "Enquiry saved for "+rec.name+"." : "Enquiry updated.");
      }, fail);
    };
  }
  draw();
}

/* ---- the money question, asked once, at conversion ---- */
function openConvert(l){
  var d={}; for(var k in l) d[k]=l[k];
  if(["none","token","paid"].indexOf(d.paymentState)<0) d.paymentState="none";
  if(d.paymentState==="token" && !(+d.amountReceived>0))
    d.amountReceived = DB.settings.tokenDeposit;

  var root=$("#modalRoot");
  function close(){ root.innerHTML=""; document.removeEventListener("keydown",onKey); }
  function onKey(e){ if(e.key==="Escape") close(); }
  document.addEventListener("keydown",onKey);

  function received(){
    var q=quoteOf(d);
    if(d.paymentState==="none") return 0;
    if(d.paymentState==="paid") return q;
    return +d.amountReceived||0;
  }
  function trouble(){
    var q=quoteOf(d), got=received();
    if(d.paymentState!=="token") return "";
    if(got<=0) return "A token has to be more than nothing.";
    if(got>=q) return "That is the whole quote, so mark it Paid in full instead.";
    return "";
  }

  function draw(){
    var q=quoteOf(d), got=received(), owed=Math.max(0,q-got), bad=trouble();

    var h='<div class="scrim" id="cvscrim"><div class="modal" style="max-width:460px" role="dialog" aria-modal="true">';
    h+='<header><h3>Convert '+esc(d.name)+'</h3><button class="x" type="button" id="cvClose" aria-label="Close">&times;</button></header>';
    h+='<div class="body">';
    h+='<p class="hint" style="margin-top:0">'+SERVICES[d.service].label+
       (d.service==="learn" && d.learnClasses ? ' &middot; '+d.learnClasses+' classes' : '')+
       ' &middot; '+d.partySize+(+d.partySize===1?' person':' people')+'</p>';

    h+='<div class="eyebrow" style="margin:14px 0 9px">What has been paid</div>';
    h+='<div class="chiprow" style="margin-bottom:12px">'+
       '<button type="button" class="chip '+(d.paymentState==="none"?"on":"")+'" data-ps="none">Nothing yet</button>'+
       '<button type="button" class="chip '+(d.paymentState==="token"?"on":"")+'" data-ps="token">Token taken</button>'+
       '<button type="button" class="chip jade '+(d.paymentState==="paid"?"on":"")+'" data-ps="paid">Paid in full</button>'+
       '</div>';

    if(d.paymentState==="token"){
      h+='<div class="field"><label for="cvAmt">Token collected</label>'+
         '<input class="inp mono" id="cvAmt" type="number" min="1" step="10" value="'+(+d.amountReceived||0)+'">'+
         '<div class="hint">Your standard token is '+inr(DB.settings.tokenDeposit)+'. It comes off the bill.</div></div>';
    }
    if(bad) h+='<div class="alert bad">'+bad+'</div>';

    h+='<div class="panel" style="margin-top:6px;padding:12px 14px">'+
       '<ul class="ul" style="font-size:13px">'+
       '<li><span>Quoted</span><span class="mono">'+inr(q)+'</span></li>'+
       '<li><span>Received now</span><span class="mono">'+(got?inr(got):"nothing")+'</span></li>'+
       '<li><span><b>'+(owed>0?"To collect at the venue":"Nothing left to collect")+'</b></span>'+
       '<span class="mono" style="font-weight:700'+(owed>0?";color:var(--red)":";color:var(--jade)")+'">'+inr(owed)+'</span></li>'+
       '</ul></div>';

    h+='<div class="hint" style="margin-top:11px">The booking form opens next with this already filled in. '+
       'Converting never requires payment, it just records where you stand.</div>';
    h+='</div>';
    h+='<footer><div class="right">'+
       '<button class="btn" type="button" id="cvCancel">Cancel</button>'+
       '<button class="btn btn-gold" type="button" id="cvGo"'+(bad?' disabled style="opacity:.45;cursor:not-allowed"':'')+'>Convert and book</button>'+
       '</div></footer></div></div>';
    setHTML(root, h);
    wire();
  }

  function wire(){
    $("#cvscrim").onclick=function(e){ if(e.target.id==="cvscrim") close(); };
    $("#cvClose").onclick=close; $("#cvCancel").onclick=close;
    Array.prototype.forEach.call(document.querySelectorAll("[data-ps]"), function(b){
      b.onclick=function(){
        d.paymentState=b.getAttribute("data-ps");
        if(d.paymentState==="token" && !(+d.amountReceived>0)) d.amountReceived=DB.settings.tokenDeposit;
        if(d.paymentState==="none") d.amountReceived=0;
        draw();
      };
    });
    var amt=$("#cvAmt");
    if(amt) amt.onchange=function(){ d.amountReceived=+amt.value||0; draw(); };

    $("#cvGo").onclick=function(){
      if(trouble()) { draw(); return; }
      var q=quoteOf(d), got=received();
      d.amountReceived=got;
      var btn=$("#cvGo"); btn.disabled=true; btn.textContent="Converting\u2026";
      putLead(d)
        .then(function(){ return convertLead(d); })
        .then(function(res){
          close(); render();
          toast(res.reused ? d.name+" was already a customer, enquiry linked."
                           : d.name+" is now a customer.");
          openBooking(null, {
            customerId: res.customerId,
            type: d.service,
            guests: Math.min(4, Math.max(1, +d.partySize||1)),
            amountDue: q,
            amountPaid: got,
            payment: got<=0 ? "unpaid" : (got>=q ? "paid" : "partial"),
            stage: got>0 ? "Confirmed" : "New Lead",
            date: today()
          });
        }, function(e){ btn.disabled=false; btn.textContent="Convert and book"; fail(e); });
    };
  }
  draw();
}

/* ============ CUSTOMERS ============ */
function viewCustomers(){
  if(state.customerOpen) return customerDetail(state.customerOpen);
  var rows=DB.customers.map(function(c){
    var bs=DB.bookings.filter(function(b){return b.customerId===c.id;});
    var paid=bs.reduce(function(s,b){return s+(+b.amountPaid||0);},0);
    var last=bs.filter(function(b){return b.date<=today();}).sort(function(a,b){return a.date<b.date?1:-1;})[0];
    return {c:c,n:bs.length,paid:paid,last:last?last.date:null};
  }).sort(function(a,b){ return b.n-a.n; });

  var h='<div class="page-head"><div><h2>Customers</h2><p>'+rows.length+' on file</p></div>'+
    '<div class="head-actions"><input class="inp" id="custSearch" placeholder="Search name or phone" style="width:220px;padding:7px 11px;border-radius:8px"></div></div>';
  h+='<div class="tblwrap"><table class="dt"><thead><tr><th>Name</th><th>Phone</th><th>Source</th><th>Bookings</th><th>Lifetime paid</th><th>Last visit</th></tr></thead><tbody id="custBody">';
  rows.forEach(function(r){
    h+='<tr data-cust="'+r.c.id+'"><td><b>'+esc(r.c.name)+'</b>'+(r.c.email?'<div class="hint">'+esc(r.c.email)+'</div>':'')+'</td>'+
      '<td class="mono">'+esc(r.c.phone)+'</td><td>'+esc(r.c.source||"&mdash;")+'</td>'+
      '<td class="mono">'+r.n+'</td><td class="mono">'+inr(r.paid)+'</td>'+
      '<td class="mono">'+(r.last?fmtShort(r.last):'<span style="color:var(--muted)">&mdash;</span>')+'</td></tr>';
  });
  h+='</tbody></table></div>';
  return h;
}

function customerDetail(cid){
  var c=customer(cid);
  var bs=DB.bookings.filter(function(b){return b.customerId===cid;}).sort(function(a,b){return a.date<b.date?1:-1;});
  var paid=bs.reduce(function(s,b){return s+(+b.amountPaid||0);},0);
  var due=bs.reduce(function(s,b){return s+Math.max(0,(+b.amountDue||0)-(+b.amountPaid||0));},0);
  var h='<div class="page-head"><div><button class="btn btn-sm" type="button" id="backCust" style="margin-bottom:7px">&#8249; All customers</button>'+
    '<h2>'+esc(c.name)+'</h2><p class="mono">'+esc(c.phone)+(c.email?" &middot; "+esc(c.email):"")+'</p></div>'+
    '<div class="head-actions">'+
    (perm.admin?'<button class="btn btn-danger btn-sm" type="button" id="delCust">Delete customer</button>':'')+
    '<button class="btn btn-gold" type="button" id="bookFor">+ Book for '+esc(c.name.split(" ")[0])+'</button></div></div>';
  h+='<div class="stats">'+
    stat("Bookings",bs.length,"all time")+
    stat("Lifetime paid",inr(paid),"received")+
    stat("Outstanding",inr(due),due>0?"chase this":"nothing due",due>0)+
    stat("Source",c.source||"—","first heard of us")+'</div>';
  h+='<div class="panel"><h3>Booking history</h3>';
  if(!bs.length) h+='<div class="empty">No bookings yet.</div>';
  else{
    h+='<div class="tblwrap" style="border:0"><table class="dt" style="min-width:560px"><thead><tr><th>Date</th><th>Type</th><th>Time</th><th>Table</th><th>Payment</th><th>Stage</th></tr></thead><tbody>';
    bs.forEach(function(b){
      var tb=tableOf(b.tableId), p=payInfo(b.payment);
      h+='<tr data-book="'+b.id+'"><td class="mono">'+fmtShort(b.date)+' · '+dayName(b.date).slice(0,3)+'</td>'+
        '<td><span class="pill '+TYPES[b.type].cls+'">'+TYPES[b.type].label+'</span></td>'+
        '<td class="mono">'+t12(b.start)+'&ndash;'+t12(b.end)+'</td><td class="mono">'+(tb?tb.num:"?")+'</td>'+
        '<td><span class="pill '+p.cls+'">'+p.short+'</span></td><td><span class="pill ghost">'+esc(b.stage)+'</span></td></tr>';
    });
    h+='</tbody></table></div>';
  }
  h+='</div>';
  return h;
}

function wireCustomers(){
  var m=$("#main");
  var s=$("#custSearch");
  if(s) s.oninput=function(){
    var q=s.value.trim().toLowerCase();
    Array.prototype.forEach.call(m.querySelectorAll("#custBody tr"), function(r){
      r.hidden = q ? r.textContent.toLowerCase().indexOf(q)<0 : false;
    });
  };
  Array.prototype.forEach.call(m.querySelectorAll("[data-cust]"), function(r){
    r.onclick=function(){ state.customerOpen=r.getAttribute("data-cust"); render(); window.scrollTo(0,0); };
  });
  var back=$("#backCust"); if(back) back.onclick=function(){ state.customerOpen=null; render(); };
  var dc=$("#delCust"); if(dc) dc.onclick=function(){ openDeleteCustomer(state.customerOpen); };
  var bf=$("#bookFor");
  if(bf) bf.onclick=function(){
    var c=customer(state.customerOpen);
    openBooking(null,{date:state.date});
    setTimeout(function(){
      var n=$("#fName"), p=$("#fPhone");
      if(n){ n.value=c.name; n.dispatchEvent(new Event("input")); }
      if(p){ p.value=c.phone; }
    },30);
  };
  Array.prototype.forEach.call(m.querySelectorAll("tr[data-book]"), function(r){
    r.onclick=function(e){ e.stopPropagation(); openBooking(r.getAttribute("data-book")); };
  });
}

function openDeleteCustomer(cid){
  var c=customer(cid);
  var bs=DB.bookings.filter(function(b){ return b.customerId===cid; });
  var linked=DB.leads.filter(function(l){ return l.customerId===cid; });
  var root=$("#modalRoot");
  function close(){ root.innerHTML=""; document.removeEventListener("keydown",onKey); }
  function onKey(e){ if(e.key==="Escape") close(); }
  document.addEventListener("keydown",onKey);

  var blocked = bs.length>0;
  var h='<div class="scrim" id="dcscrim"><div class="modal" style="max-width:440px" role="dialog" aria-modal="true">';
  h+='<header><h3>'+(blocked?"Can\u2019t delete yet":"Delete "+esc(c.name)+"?")+'</h3>'+
     '<button class="x" type="button" id="dcClose" aria-label="Close">&times;</button></header><div class="body">';

  if(blocked){
    h+='<p style="margin-top:0">'+esc(c.name)+' has <b>'+bs.length+' booking'+(bs.length===1?"":"s")+'</b> on record. '+
       'Deleting them would leave those bookings pointing at nobody, so the database refuses it.</p>'+
       '<p>Delete their bookings first if you really want them gone. If you just want to stop them booking, '+
       'leave the record alone, it costs nothing and keeps your history intact.</p>';
  } else {
    h+='<p style="margin-top:0">This removes '+esc(c.name)+' and their contact details for good. There is no undo.</p>';
    if(linked.length)
      h+='<div class="alert warn">'+linked.length+' enquir'+(linked.length===1?"y":"ies")+
         ' point'+(linked.length===1?"s":"")+' at this customer. '+(linked.length===1?"It":"They")+
         ' will go back to <b>Quoted</b> so the enquiry history survives.</div>';
  }
  h+='</div><footer><div class="right">'+
     '<button class="btn" type="button" id="dcCancel">'+(blocked?"Close":"Keep them")+'</button>'+
     (blocked?'':'<button class="btn btn-danger" type="button" id="dcGo">Delete</button>')+
     '</div></footer></div></div>';
  root.innerHTML=h;

  $("#dcscrim").onclick=function(e){ if(e.target.id==="dcscrim") close(); };
  $("#dcClose").onclick=close; $("#dcCancel").onclick=close;
  var go=$("#dcGo");
  if(go) go.onclick=function(){
    go.disabled=true; go.textContent="Deleting\u2026";
    releaseLeadsFor(cid)
      .then(function(){ return delCustomer(cid); })
      .then(function(){
        close(); state.customerOpen=null; render();
        toast(c.name+" deleted.");
      }, function(e){ go.disabled=false; go.textContent="Delete"; fail(e); });
  };
}

/* ============ DASHBOARD ============ */
function stat(k,v,s,warn){
  return '<div class="stat'+(warn?" warn":"")+'"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="s">'+s+'</div></div>';
}
function viewDashboard(){
  var td=today();
  var tdB=bookingsOn(td).filter(function(b){return !isClosed(b);});
  var now=new Date(), nowT=pad(now.getHours())+":"+pad(now.getMinutes());
  var occupied=tdB.filter(function(b){ return b.start<=nowT && nowT<b.end; }).length;
  var revToday=tdB.reduce(function(s,b){return s+(+b.amountPaid||0);},0);
  var expToday=tdB.reduce(function(s,b){return s+(+b.amountDue||0);},0);
  var outstanding=DB.bookings.filter(function(b){return !isClosed(b) && b.payment!=="refunded";})
    .reduce(function(s,b){return s+Math.max(0,(+b.amountDue||0)-(+b.amountPaid||0));},0);
  var next7=DB.bookings.filter(function(b){ return !isClosed(b) && b.date>td && b.date<=addDays(td,7); });
  var play=next7.filter(function(b){return b.type==="play";}).length;
  var learn=next7.length-play;
  var newLeads=DB.bookings.filter(function(b){return b.stage==="New Lead";}).length;
  var sl2=slots(), freeSeats=0, partTables=0;
  activeTables().forEach(function(tb){
    openRuns(tb.id,td,sl2).forEach(function(r){ partTables++; freeSeats+=r.free; });
  });
  var seatsToday=tdB.reduce(function(s2,b){ return s2+(+b.guests||0); },0);
  var openLeads=DB.leads.filter(function(l){ return l.stage!=="Converted" && l.stage!==LEAD_LOST; });
  var leadValueOpen=openLeads.reduce(function(s2,l){ return s2+leadValue(l); },0);

  var h='<div class="page-head"><div><h2>Dashboard</h2><p>'+fmtDate(td)+' &middot; '+dayName(td)+'</p></div></div>';
  h+='<div class="stats">'+
    stat("Today","<span class=\"mono\">"+tdB.length+"</span>",seatsToday+" seat"+(seatsToday===1?"":"s")+" across "+tdB.length+" booking"+(tdB.length===1?"":"s"))+
    stat("Seats to fill","<span class=\"mono\">"+freeSeats+"</span>",partTables+" part-full table"+(partTables===1?"":"s")+" today")+
    stat("In play now","<span class=\"mono\">"+occupied+"/"+activeTables().length+"</span>","tables occupied")+
    stat("Collected today",inr(revToday),"of "+inr(expToday)+" expected")+
    stat("Outstanding",inr(outstanding),newLeads+" booking"+(newLeads===1?"":"s")+" not yet confirmed", outstanding>0)+
    stat("Open enquiries","<span class=\"mono\">"+openLeads.length+"</span>",leadValueOpen?inr(leadValueOpen)+" quoted":"nothing quoted yet")+
    '</div>';

  h+='<div class="two">';
  h+='<div class="panel"><h3>Next seven days</h3>';
  var maxn=1;
  var days=[];
  for(var i=1;i<=7;i++){
    var dt=addDays(td,i);
    var n=DB.bookings.filter(function(b){return b.date===dt && !isClosed(b);}).length;
    if(n>maxn) maxn=n;
    days.push({d:dt,n:n});
  }
  days.forEach(function(x){
    h+='<div class="bar"><span class="lab">'+dayName(x.d).slice(0,3)+' '+fmtShort(x.d)+'</span>'+
       '<span class="track"><span class="fill" style="width:'+Math.round(x.n/maxn*100)+'%;background:var(--gold)"></span></span>'+
       '<span class="num">'+x.n+'</span></div>';
  });
  h+='<div style="margin-top:13px;padding-top:12px;border-top:1px solid var(--line-soft)">'+
     '<div class="bar"><span class="lab">To Play</span><span class="track"><span class="fill" style="width:'+
       (next7.length?Math.round(play/next7.length*100):0)+'%;background:var(--jade)"></span></span><span class="num">'+play+'</span></div>'+
     '<div class="bar"><span class="lab">To Learn</span><span class="track"><span class="fill" style="width:'+
       (next7.length?Math.round(learn/next7.length*100):0)+'%;background:var(--plum)"></span></span><span class="num">'+learn+'</span></div>'+
     '</div></div>';

  var upcoming=DB.bookings.filter(function(b){return !isClosed(b) && b.date>=td;})
    .sort(function(a,b){ return a.date===b.date ? t2m(a.start)-t2m(b.start) : (a.date<b.date?-1:1); }).slice(0,8);
  h+='<div class="panel"><h3>Coming up</h3>';
  if(!upcoming.length) h+='<div class="empty">Nothing booked.</div>';
  else{
    h+='<ul class="ul">';
    upcoming.forEach(function(b){
      var c=customer(b.customerId), tb=tableOf(b.tableId), p=payInfo(b.payment);
      h+='<li><span><b>'+esc(c.name)+'</b><div class="hint mono">'+fmtShort(b.date)+' &middot; '+t12(b.start)+' &middot; T'+(tb?tb.num:"?")+'</div></span>'+
         '<span style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">'+
         '<span class="pill '+TYPES[b.type].cls+'">'+TYPES[b.type].label+'</span>'+
         '<span class="pill '+p.cls+'">'+p.short+'</span></span></li>';
    });
    h+='</ul>';
  }
  h+='</div></div>';
  return h;
}

/* ============ SETTINGS ============ */
function viewSettings(){
  var s=DB.settings;
  var h='<div class="page-head"><div><h2>Settings</h2><p>Admin only. Changes apply straight away.</p></div></div>';
  h+='<div class="two">';

  h+='<div class="panel"><h3>Teachers</h3><div class="ul" id="teacherList">';
  DB.teachers.forEach(function(t){
    h+='<div style="display:flex;justify-content:space-between;gap:9px;align-items:center;padding-bottom:8px;border-bottom:1px solid var(--line-soft)">'+
      '<span><b>'+esc(t.name)+'</b><div class="hint mono">'+esc(t.phone)+'</div>'+
      (t.note?'<div class="hint">'+esc(t.note)+'</div>':'')+'</span>'+
      '<button class="btn btn-sm" type="button" data-tt="'+t.id+'">'+(t.active?"Active":"Inactive")+'</button></div>';
  });
  h+='</div><div class="row2" style="margin-top:12px">'+
    '<input class="inp" id="ntName" placeholder="Teacher name"><input class="inp" id="ntPhone" placeholder="Phone"></div>'+
    '<button class="btn btn-sm btn-primary" type="button" id="addTeacher" style="margin-top:8px">Add teacher</button></div>';

  h+='<div class="panel"><h3>Tables</h3><div class="ul">';
  DB.tables.sort(function(a,b){return a.num-b.num;}).forEach(function(t){
    h+='<div style="display:flex;justify-content:space-between;gap:9px;align-items:center;padding-bottom:8px;border-bottom:1px solid var(--line-soft)">'+
      '<span><b>Table '+t.num+'</b><div class="hint">'+t.capacity+' seats</div></span>'+
      '<button class="btn btn-sm" type="button" data-tb="'+t.id+'">'+(t.active?"In service":"Out of service")+'</button></div>';
  });
  h+='</div><button class="btn btn-sm btn-primary" type="button" id="addTable" style="margin-top:12px">Add table</button></div>';

  h+='<div class="panel"><h3>Operating hours &amp; defaults</h3>'+
    '<div class="row2"><div class="field"><label for="stOpen">Opens</label><input class="inp" id="stOpen" type="time" step="1800" value="'+s.open+'"></div>'+
    '<div class="field"><label for="stClose">Closes</label><input class="inp" id="stClose" type="time" step="1800" value="'+s.close+'"></div></div>'+
    '<div class="row2"><div class="field"><label for="stPlay">To Play length (min)</label><input class="inp mono" id="stPlay" type="number" step="30" value="'+s.defPlay+'"></div>'+
    '<div class="field"><label for="stLearn">To Learn length (min)</label><input class="inp mono" id="stLearn" type="number" step="30" value="'+s.defLearn+'"></div></div>'+
    '<div class="row2"><div class="field"><label for="stRp">To Play rate</label><input class="inp mono" id="stRp" type="number" step="100" value="'+s.ratePlay+'"></div>'+
    '<div class="field"><label for="stRl">To Learn rate</label><input class="inp mono" id="stRl" type="number" step="100" value="'+s.rateLearn+'"></div></div>'+
    '<div class="row2"><div class="field"><label for="stTok">Standard token deposit</label>'+
    '<input class="inp mono" id="stTok" type="number" step="10" min="0" value="'+(s.tokenDeposit==null?50:s.tokenDeposit)+'">'+
    '<div class="hint">Prefilled when you convert an enquiry. Comes off their bill.</div></div><div></div></div>'+
    '<button class="btn btn-sm btn-primary" type="button" id="saveSettings" style="margin-top:6px">Save defaults</button></div>';

  h+=staffPanel();

  h+='</div>';
  return h;
}

function wireSettings(){
  var m=$("#main");
  Array.prototype.forEach.call(m.querySelectorAll("[data-tt]"), function(b){
    b.onclick=function(){ var t=teacher(b.getAttribute("data-tt")); t.active=!t.active; render();
      putConfig("teachers").then(null, fail); };
  });
  Array.prototype.forEach.call(m.querySelectorAll("[data-tb]"), function(b){
    b.onclick=function(){ var t=tableOf(b.getAttribute("data-tb")); t.active=!t.active; render();
      putConfig("tables").then(null, fail); };
  });
  $("#addTeacher").onclick=function(){
    var n=$("#ntName").value.trim(), p=$("#ntPhone").value.trim();
    if(!n){ toast("Give the teacher a name first."); return; }
    DB.teachers.push({id:"t"+uid(),name:n,phone:p,active:true,note:""}); render();
    putConfig("teachers").then(function(){ toast(n+" added."); }, fail);
  };
  $("#addTable").onclick=function(){
    var mx=DB.tables.reduce(function(a,t){return Math.max(a,t.num);},0);
    DB.tables.push({id:"tb"+uid(),num:mx+1,capacity:4,active:true}); render();
    putConfig("tables").then(function(){ toast("Table "+(mx+1)+" added."); }, fail);
  };
  wireStaffPanel();
  $("#saveSettings").onclick=function(){
    DB.settings.open=$("#stOpen").value||DB.settings.open;
    DB.settings.close=$("#stClose").value||DB.settings.close;
    DB.settings.defPlay=+$("#stPlay").value||DB.settings.defPlay;
    DB.settings.defLearn=+$("#stLearn").value||DB.settings.defLearn;
    DB.settings.ratePlay=+$("#stRp").value||DB.settings.ratePlay;
    DB.settings.rateLearn=+$("#stRl").value||DB.settings.rateLearn;
    var tk=$("#stTok"); if(tk && tk.value!=="") DB.settings.tokenDeposit=+tk.value;
    render();
    putConfig("settings").then(function(){ toast("Defaults saved."); }, fail);
  };
}

/* ============ settings: staff roster ============ */
function staffPanel(){
  if(!perm.admin) return "";
  var h='<div class="panel"><h3>Staff accounts</h3>'+
    '<p style="margin-top:0;font-size:12.5px;color:var(--muted)">Anyone can create an account, '+
    'but nobody sees a booking until you switch them on here.</p><div class="ul" style="margin-top:11px">';
  if(!DB.staff.length) h+='<div class="empty">Nobody else has signed up yet.</div>';
  DB.staff.slice().sort(function(a,b){ return (a.name||"")<(b.name||"")?-1:1; }).forEach(function(u){
    var isMe = u.id===meId;
    h+='<li><span><b>'+esc(u.name||u.email)+(isMe?' <span class="pill ghost">you</span>':'')+'</b>'+
       '<div class="hint mono">'+esc(u.email)+'</div></span>'+
       '<span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'+
       '<button class="btn btn-sm" type="button" data-role="'+esc(u.id)+'"'+(isMe?' disabled style="opacity:.45"':'')+'>'+
         (u.role==="admin"?"Admin":"Staff")+'</button>'+
       '<button class="btn btn-sm'+(u.active?"":" btn-danger")+'" type="button" data-act="'+esc(u.id)+'"'+
         (isMe?' disabled style="opacity:.45"':'')+'>'+(u.active?"Active":"Switched off")+'</button>'+
       '</span></li>';
  });
  h+='</div><div class="alert warn" style="margin-top:13px">This board holds real customer phone '+
     'numbers. Switch off anyone who leaves, the same day.</div></div>';
  return h;
}
function wireStaffPanel(){
  var m=$("#main");
  Array.prototype.forEach.call(m.querySelectorAll("[data-role]"), function(b){
    b.onclick=function(){
      var id=b.getAttribute("data-role"), row=null;
      DB.staff.forEach(function(s){ if(s.id===id) row=s; });
      if(!row) return;
      var next = row.role==="admin" ? "staff" : "admin";
      render();
      putStaff(id,{role:next}).then(function(){ render(); toast(esc(row.name||row.email)+" is now "+next+"."); }, fail);
    };
  });
  Array.prototype.forEach.call(m.querySelectorAll("[data-act]"), function(b){
    b.onclick=function(){
      var id=b.getAttribute("data-act"), row=null;
      DB.staff.forEach(function(s){ if(s.id===id) row=s; });
      if(!row) return;
      var next = !row.active;
      render();
      putStaff(id,{active:next}).then(function(){
        render(); toast((row.name||row.email)+(next?" can now sign in.":" is switched off."));
      }, fail);
    };
  });
}

/* ============ screens ============ */
function show(which){
  ["boot","auth","pending"].forEach(function(k){
    var e=document.getElementById(k); if(e) e.hidden = (k!==which);
  });
  $("#app").classList.toggle("on", which==="app");
  if(which==="app"){ var b=document.getElementById("boot"); if(b) b.hidden=true; }
}
function authMsg(text, good){
  var m=$("#authMsg");
  if(!text){ m.hidden=true; return; }
  m.className = good ? "ok" : "err";
  m.textContent = text;
  m.hidden=false;
}

var signUpMode=false;
function paintAuthMode(){
  $("#nameField").hidden = !signUpMode;
  $("#auGo").textContent = signUpMode ? "Create account" : "Sign in";
  $("#auSwapText").textContent = signUpMode ? "Already have an account?" : "First time here?";
  $("#auSwap").textContent = signUpMode ? "Sign in instead" : "Create an account";
  $("#auPass").setAttribute("autocomplete", signUpMode ? "new-password" : "current-password");
}

function startApp(){
  booted=true;
  show("app");
  buildNav();
  render();
  subscribeLive();
}

function afterSignIn(session){
  meId = session.user.id;
  perm.email = session.user.email || "";
  return sb.from("staff").select("*").eq("id", meId).maybeSingle().then(function(r){
    var row = r.data;
    if(r.error && r.error.code && r.error.code!=="PGRST116") throw r.error;
    if(!row || !row.active){
      $("#pendingWho").textContent = perm.email;
      show("pending");
      return;
    }
    perm.name  = row.name || perm.email;
    perm.admin = row.role==="admin";
    perm.write = true;
    return loadAll().then(startApp);
  });
}

function boot(){
  if(!configured()){
    show("auth");
    $("#authForm").innerHTML =
      '<img src="logo.jpg" alt="">'+
      '<h1>Not connected yet</h1>'+
      '<p class="auth-sub">One step left</p>'+
      '<p style="font-size:13px;color:var(--ink-2);text-align:left;line-height:1.55">'+
      'Open <b>config.js</b> and paste in your Supabase project URL and anon key, '+
      'then reload. Both are in your Supabase dashboard under '+
      '<b>Project Settings &rarr; API</b>. The README walks through it.</p>';
    return;
  }
  sb = window.supabase.createClient(CONFIG.url, CONFIG.anonKey);

  sb.auth.getSession().then(function(r){
    var session = r.data && r.data.session;
    if(!session){ show("auth"); paintAuthMode(); return; }
    return afterSignIn(session);
  })["catch"](function(e){
    show("auth"); paintAuthMode(); authMsg(pgMsg(e), false);
  });

  sb.auth.onAuthStateChange(function(event, session){
    if(event==="SIGNED_OUT"){
      booted=false; meId=null;
      perm={ name:"", email:"", admin:false, write:true };
      DB.bookings=[]; DB.customers=[]; DB.staff=[];
      show("auth"); paintAuthMode();
    }
  });

  $("#authForm").addEventListener("submit", function(e){
    e.preventDefault();
    authMsg("");
    var email=$("#auEmail").value.trim(), pass=$("#auPass").value, nm=$("#auName").value.trim();
    var btn=$("#auGo"); btn.disabled=true; btn.textContent="Working…";
    function done(){ btn.disabled=false; paintAuthMode(); }

    if(signUpMode){
      sb.auth.signUp({ email:email, password:pass, options:{ data:{ name:nm || email.split("@")[0] } } })
        .then(function(r){
          done();
          if(r.error){ authMsg(r.error.message, false); return; }
          if(r.data.session) return afterSignIn(r.data.session);
          authMsg("Account created. Check your email to confirm it, then sign in.", true);
          signUpMode=false; paintAuthMode();
        }, function(e2){ done(); authMsg(pgMsg(e2), false); });
    } else {
      sb.auth.signInWithPassword({ email:email, password:pass })
        .then(function(r){
          done();
          if(r.error){ authMsg(r.error.message, false); return; }
          return afterSignIn(r.data.session);
        }, function(e2){ done(); authMsg(pgMsg(e2), false); });
    }
  });

  $("#auSwap").addEventListener("click", function(){
    signUpMode=!signUpMode; authMsg(""); paintAuthMode();
  });
  $("#pendReload").addEventListener("click", function(){ window.location.reload(); });
  $("#pendOut").addEventListener("click", function(){ sb.auth.signOut(); });
  $("#signOut").addEventListener("click", function(){ sb.auth.signOut(); });
  paintAuthMode();
}

boot();

})();
