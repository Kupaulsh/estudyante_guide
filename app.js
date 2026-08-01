/* =========================================================
   APP STATE
========================================================= */
let DATA = {};              // { pccm: {...}, tup: {...} } — populated on demand from Supabase
let currentSchool = null;   // 'pccm' | 'tup'
let currentPage = 'hub';
let calCursor = new Date();

function S(){ return DATA[currentSchool]; }

/* =========================================================
   NAVIGATION / SHELL
========================================================= */
function logoFallback(img, name){
  if(!img.dataset.triedJpg){
    img.dataset.triedJpg = '1';
    img.src = name.toLowerCase() + '-logo.jpg';
  } else {
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = name;
    img.replaceWith(badge);
  }
}

function setSchoolDotLogo(school){
  const dot = document.getElementById('topSchoolDot');
  dot.style.background = 'transparent';
  dot.innerHTML = '';
  const img = document.createElement('img');
  img.alt = school.toUpperCase() + ' logo';
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit;';
  img.src = school + '-logo.png';
  img.onerror = function(){
    if(!img.dataset.triedJpg){
      img.dataset.triedJpg = '1';
      img.src = school + '-logo.jpg';
    } else {
      dot.style.background = 'var(--accent)';
      dot.textContent = school.toUpperCase();
    }
  };
  dot.appendChild(img);
}

function applyTheme(school){
  const d = DATA[school];
  if(!d) return;
  document.documentElement.style.setProperty('--accent', d.accentColor || '#2F6F5E');
  document.documentElement.style.setProperty('--bg', d.bgColor || '#F6F5F0');
}
function resetTheme(){
  document.documentElement.style.removeProperty('--accent');
  document.documentElement.style.removeProperty('--bg');
}

async function enterApp(school){
  currentSchool = school;
  document.getElementById('landing').style.display='none';
  document.getElementById('app').classList.add('active');
  setSchoolDotLogo(school);
  document.getElementById('topSchoolName').innerHTML = 'Loading… <span style="color:var(--ink-soft);font-weight:400;font-size:12px;">▾</span>';
  document.getElementById('pageContent').innerHTML = `<p style="color:var(--ink-soft);">Loading ${school.toUpperCase()}…</p>`;

  DATA[school] = await loadSchoolData(school);

  applyTheme(school);
  document.getElementById('topSchoolName').innerHTML = S().fullName + ' <span style="color:var(--ink-soft);font-weight:400;font-size:12px;">▾</span>';
  buildGearItems();
  document.getElementById('gearNav').style.display='block';
  goPage('hub');
}
async function refreshCurrentSchool(){
  if(!currentSchool) return;
  DATA[currentSchool] = await loadSchoolData(currentSchool);
  applyTheme(currentSchool);
}
function goLanding(){
  document.getElementById('app').classList.remove('active');
  document.getElementById('landing').style.display='flex';
  document.getElementById('gearNav').style.display='none';
  resetTheme();
  closeGear();
}
function openSchoolMenu(){
  const other = currentSchool==='pccm' ? 'tup' : 'pccm';
  const curName = currentSchool.toUpperCase();
  const otherName = other.toUpperCase();
  openModal(`
    <h3>${S().fullName}</h3>
    <p style="font-size:12.5px;color:var(--ink-soft);">Switch schools or jump into admin.</p>
    <div class="form-grid">
      <button class="btn" onclick="closeModal();enterApp('${other}')">Switch to ${otherName}</button>
      <button class="btn ghost" onclick="closeModal();openAdminGate('${currentSchool}')">Admin for ${curName}</button>
      <button class="btn ghost" onclick="closeModal();openAdminGate('${other}')">Admin for ${otherName}</button>
    </div>
  `);
}

const PAGES = [
  {id:'calendar', label:'Calendar', title:'Calendar', sub:'Tap a date to see events, due dates, and projects.',
    icon:'<path d="M7 2v2M17 2v2M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.8"/>'},
  {id:'schedule', label:'Schedule', title:'Schedule', sub:'Your full class list — professor, room, and time slot.',
    icon:'<path d="M4 4h16v16H4z M4 9h16 M9 4v16" fill="none" stroke="currentColor" stroke-width="1.8"/>'},
  {id:'subjects', label:'Subjects', title:'Subjects', sub:'Tap a subject to see its syllabus and materials.',
    icon:'<path d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2zm0 0h14" fill="none" stroke="currentColor" stroke-width="1.8"/>'},
  {id:'activities', label:'Activities', title:'Activities', sub:'Assignments, activities, and projects across subjects.',
    icon:'<path d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" fill="none" stroke="currentColor" stroke-width="1.8"/>'},
  {id:'reviewers', label:'Reviewers', title:'Reviewers', sub:'Flashcards, mock quizzes, and readable PDFs per subject.',
    icon:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill="none" stroke="currentColor" stroke-width="1.8"/>'},
  {id:'howto', label:'How-To', title:'How-To', sub:'Frequently asked questions.',
    icon:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 1.7-2 3.3M12 17h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'},
  {id:'rules', label:'Rules & Others', title:'Rules and Others', sub:'Vision, mission, core values, guidelines, and anything else you add.',
    icon:'<path d="M12 2 3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6z" fill="none" stroke="currentColor" stroke-width="1.8"/>'}
];

const HUB_META = {title:'Menu', sub:'Choose where you want to go.'};

function buildGearItems(){
  const wrap = document.getElementById('gearItems');
  wrap.innerHTML='';
  PAGES.forEach((p)=>{
    const el = document.createElement('button');
    el.className='gear-item';
    el.id='gear-'+p.id;
    el.innerHTML = `<svg viewBox="0 0 24 24">${p.icon}</svg><span>${p.label}</span>`;
    el.onclick = ()=>{ goPage(p.id); closeGear(); };
    wrap.appendChild(el);
  });
}

function toggleGear(){
  const nav = document.getElementById('gearNav');
  const scrim = document.getElementById('gearScrim');
  const opening = !nav.classList.contains('open');
  nav.classList.toggle('open');
  scrim.classList.toggle('show', opening);
}
function closeGear(){
  const nav = document.getElementById('gearNav');
  if(nav.classList.contains('open')) toggleGear();
}

function goPage(id){
  currentPage = id;
  document.querySelectorAll('.gear-item').forEach(el=>el.classList.toggle('active', el.id==='gear-'+id));
  if(id==='hub'){ renderHub(); window.scrollTo({top:0,behavior:'smooth'}); return; }
  const renderers = {calendar:renderCalendar, schedule:renderSchedule, subjects:renderSubjects,
    activities:renderActivities, reviewers:renderReviewers, howto:renderHowTo, rules:renderRules};
  renderers[id]();
  window.scrollTo({top:0,behavior:'smooth'});
}

function renderHub(){
  let html = `<div class="hub-list">`;
  PAGES.forEach(p=>{
    html += `<div class="hub-row" onclick="goPage('${p.id}')">
      <div class="hub-icon"><svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:var(--ink);stroke-width:1.6">${p.icon}</svg></div>
      <div class="hub-text">
        <h4>${p.label}</h4>
        <p>${p.sub}</p>
      </div>
      <span class="hub-arrow">›</span>
    </div>`;
  });
  html += `</div>`;
  document.getElementById('pageContent').innerHTML = html;
}

/* =========================================================
   MODAL
========================================================= */
function openModal(html){
  document.getElementById('modalBox').innerHTML = `<button class="modal-close" onclick="closeModal()">✕</button>${html}`;
  document.getElementById('modalScrim').classList.add('show');
}
function closeModal(){ document.getElementById('modalScrim').classList.remove('show'); }

/* =========================================================
   CALENDAR
========================================================= */
function getUpcomingDue(limit){
  const today = todayISO();
  const items = [];
  S().activities.forEach(a=>{
    if(a.due && a.due >= today){
      const subj = S().subjects.find(s=>s.id===a.subjectId);
      items.push({date:a.due, title:a.title, type:a.type==='Project'?'project':'due', kind:'activity', id:a.id, subj: subj?subj.name:''});
    }
  });
  S().events.forEach(e=>{
    if((e.type==='due'||e.type==='project') && e.date >= today){
      const subj = S().subjects.find(s=>s.id===e.subjectId);
      items.push({date:e.date, title:e.title, type:e.type, kind:'event', id:e.date, subj: subj?subj.name:''});
    }
  });
  items.sort((a,b)=>a.date.localeCompare(b.date));
  return items.slice(0, limit||6);
}
function daysFromToday(iso){
  const d1 = new Date(todayISO()+'T00:00'), d2 = new Date(iso+'T00:00');
  const diff = Math.round((d2-d1)/86400000);
  if(diff===0) return 'Today';
  if(diff===1) return 'Tomorrow';
  return `In ${diff} days`;
}
function renderCalendar(){
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  const first = new Date(y,m,1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y,m+1,0).getDate();
  const monthName = calCursor.toLocaleString('default',{month:'long'});
  let html = `<div class="cal-layout">
  <div class="card">
    <div class="cal-head">
      <button onclick="shiftMonth(-1)">‹</button>
      <h3>${monthName} ${y}</h3>
      <button onclick="shiftMonth(1)">›</button>
    </div>
    <div class="cal-grid">`;
  ['S','M','T','W','T','F','S'].forEach(d=> html += `<div class="cal-dow">${d}</div>`);
  for(let i=0;i<startDow;i++) html += `<div class="cal-cell empty"></div>`;
  const isThisMonth = todayISO().slice(0,7) === `${y}-${String(m+1).padStart(2,'0')}`;
  const todayNum = new Date().getDate();
  for(let d=1; d<=daysInMonth; d++){
    const iso = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs = S().events.filter(e=>e.date===iso);
    const types = [...new Set(evs.map(e=>e.type))];
    const dots = types.map(t=>`<i class="dot-${t}"></i>`).join('');
    const isToday = isThisMonth && d===todayNum;
    html += `<div class="cal-cell ${isToday?'today':''}" onclick="openDay('${iso}')">${d}<div class="cal-dots">${dots}</div></div>`;
  }
  html += `</div></div>

  <div class="cal-sidebar">
    <div class="cal-legend">
      <span class="tag">● Event</span><span class="tag due">● Due</span><span class="tag project">● Project</span>
    </div>
    <div class="section-label" style="margin-top:18px;">Coming Up</div>
    <div class="hub-list">`;
  const upcoming = getUpcomingDue(6);
  if(upcoming.length===0){
    html += `<p style="color:var(--ink-soft);font-size:13px;">Nothing due soon.</p>`;
  } else {
    upcoming.forEach(u=>{
      html += `<div class="hub-row" onclick="${u.kind==='activity'?`openActivity('${u.id}')`:`openDay('${u.id}')`}">
        <div class="hub-text">
          <h4>${u.title}</h4>
          <p>${u.subj?u.subj+' · ':''}${daysFromToday(u.date)} · ${u.date}</p>
        </div>
        <span class="tag ${u.type}" style="margin:0;">${u.type}</span>
      </div>`;
    });
  }
  html += `</div>
  </div>
  </div>`;
  document.getElementById('pageContent').innerHTML = html;
}
function shiftMonth(n){ calCursor.setMonth(calCursor.getMonth()+n); renderCalendar(); }
function openDay(iso){
  const evs = S().events.filter(e=>e.date===iso);
  let html = `<h3>${new Date(iso+'T00:00').toDateString()}</h3>`;
  if(evs.length===0){ html += `<p style="color:var(--ink-soft);">No events on this date.</p>`; }
  evs.forEach(e=>{
    const subj = S().subjects.find(s=>s.id===e.subjectId);
    html += `<div style="margin-bottom:14px;">
      <span class="tag ${e.type!=='event'?e.type:''}">${e.type}</span>
      <h4 style="margin-top:8px;">${e.title}</h4>
      ${subj?`<p style="font-size:12px;color:var(--ink-soft);margin:0 0 4px;">${subj.name}</p>`:''}
      <p>${nl2br(e.desc)}</p>
    </div>`;
  });
  openModal(html);
}

/* =========================================================
   SCHEDULE
========================================================= */
function parseTimeStart(timeStr){
  if(!timeStr) return 24*60+1; // no time set — sort to the end of the day
  const m = timeStr.match(/(\d{1,2}):(\d{2})/);
  if(!m) return 24*60+1;
  let hour = parseInt(m[1],10);
  const min = parseInt(m[2],10);
  const ampm = timeStr.match(/\b(AM|PM)\b/i);
  if(ampm){
    const p = ampm[1].toUpperCase();
    if(p==='PM' && hour<12) hour += 12;
    if(p==='AM' && hour===12) hour = 0;
  }
  return hour*60+min;
}
function renderSchedule(){
  const order = {Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
  const rows = [];
  S().subjects.forEach(s=>{
    if(s.schedule.length===0){
      rows.push({subject:s, day:null, time:'', room:'', professor:''});
    } else {
      s.schedule.forEach(sl=> rows.push({subject:s, day:sl.day, time:sl.time, room:sl.room, professor:sl.professor}));
    }
  });
  rows.sort((a,b)=>{
    const dayDiff = (order[a.day]??9)-(order[b.day]??9);
    if(dayDiff!==0) return dayDiff;
    return parseTimeStart(a.time)-parseTimeStart(b.time);
  });
  let html = '';
  if(rows.length===0) html = `<p style="color:var(--ink-soft);">No schedule yet.</p>`;
  let lastDay = undefined;
  rows.forEach(r=>{
    if(r.day !== lastDay){ html += `<div class="section-label">${r.day||'Unscheduled'}</div>`; lastDay = r.day; }
    html += `<div class="sched-item" onclick="openSubject('${r.subject.id}')" style="cursor:pointer;">
      <div class="sched-swatch" style="background:${r.subject.color}"></div>
      <div class="sched-time">${r.time||'TBA'}</div>
      <div class="sched-body">
        <h4>${r.subject.name}</h4>
        <p>${r.professor||'Professor TBA'} · Room ${r.room||'TBA'}</p>
      </div>
    </div>`;
  });
  document.getElementById('pageContent').innerHTML = html;
}

/* =========================================================
   SUBJECTS
========================================================= */
function renderSubjects(){
  let html = `<div class="hub-list">`;
  S().subjects.forEach(s=>{
    html += `<div class="hub-row" onclick="openSubject('${s.id}')">
      <div class="chip" style="background:${s.color}">${s.code.slice(0,4)}</div>
      <div class="hub-text">
        <h4>${s.name}</h4>
        <p>${s.materials.length} material${s.materials.length!==1?'s':''} · ${s.syllabus.length} syllabus file${s.syllabus.length!==1?'s':''}</p>
      </div>
      <span class="hub-arrow">›</span>
    </div>`;
  });
  html += `</div>`;
  document.getElementById('pageContent').innerHTML = html;
}
function openSubject(id){
  const s = S().subjects.find(x=>x.id===id);
  let html = `<h3>${s.name}</h3>`;
  if(s.schedule.length===0){
    html += `<p style="color:var(--ink-soft);font-size:13px;">No schedule set yet.</p>`;
  } else {
    s.schedule.forEach(sl=>{
      html += `<p style="color:var(--ink-soft);font-size:13px;margin:0 0 4px;">${sl.day||''} · ${sl.time||'TBA'} · ${sl.professor||'Professor TBA'} · Room ${sl.room||'TBA'}</p>`;
    });
  }
  html += `<div class="section-label">Syllabus</div>`;
  if(s.syllabus.length===0) html += `<p style="font-size:13px;color:var(--ink-soft);">No syllabus uploaded yet.</p>`;
  s.syllabus.forEach(f=> html += fileRow(f));
  html += `<div class="section-label">Materials</div>`;
  if(s.materials.length===0) html += `<p style="font-size:13px;color:var(--ink-soft);">No materials uploaded yet.</p>`;
  s.materials.forEach(f=> html += fileRow(f));
  openModal(html);
}
function fileRow(f, subLabel){
  return `<a class="file-row" href="${f.url}" target="_blank" rel="noopener">
    <div class="ficon">${(f.type||'FILE').slice(0,3).toUpperCase()}</div>
    <div class="file-row-text">
      <div class="file-row-title">${f.label}</div>
      ${subLabel?`<div class="file-row-sub">${subLabel}</div>`:''}
    </div>
  </a>`;
}

/* =========================================================
   ACTIVITIES
========================================================= */
let actSort = 'due';
function renderActivities(){
  let acts = [...S().activities];
  if(actSort==='due') acts.sort((a,b)=>(a.due||'').localeCompare(b.due||''));
  else if(actSort==='start') acts.sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  else if(actSort==='subject') acts.sort((a,b)=>{
    const sa = S().subjects.find(s=>s.id===a.subjectId)?.name||'';
    const sb = S().subjects.find(s=>s.id===b.subjectId)?.name||'';
    return sa.localeCompare(sb);
  });
  let html = `<div class="filter-row">
    <label>Sort by</label>
    <select onchange="actSort=this.value;renderActivities()">
      <option value="due" ${actSort==='due'?'selected':''}>Due date</option>
      <option value="start" ${actSort==='start'?'selected':''}>Starting date</option>
      <option value="subject" ${actSort==='subject'?'selected':''}>Subject</option>
    </select>
  </div>`;
  if(acts.length===0) html += `<p style="color:var(--ink-soft);">No activities yet.</p>`;
  acts.forEach(a=>{
    const subj = S().subjects.find(s=>s.id===a.subjectId);
    html += `<div class="act-item" onclick="openActivity('${a.id}')" style="cursor:pointer;">
      <span class="tag ${a.type==='Assignment'?'':a.type==='Project'?'project':'due'}">${a.type}</span>
      <h4>${a.title}</h4>
      <div class="meta">${subj?subj.name:''} · Starts ${a.start||'TBA'} · Due ${a.due||'TBA'}</div>
      <div>${(a.tags||[]).map(t=>`<span class="tag">#${t}</span>`).join('')}</div>
    </div>`;
  });
  document.getElementById('pageContent').innerHTML = html;
}
function openActivity(id){
  const a = S().activities.find(x=>x.id===id);
  const subj = S().subjects.find(s=>s.id===a.subjectId);
  openModal(`<h3>${a.title}</h3>
    <p style="color:var(--ink-soft);font-size:13px;">${subj?subj.name:''} · ${a.type}</p>
    <p><b>Starts:</b> ${a.start||'TBA'} &nbsp; <b>Due:</b> ${a.due||'TBA'}</p>
    <p>${nl2br(a.instructions)}</p>
    <div>${(a.tags||[]).map(t=>`<span class="tag">#${t}</span>`).join('')}</div>`);
}

/* =========================================================
   REVIEWERS
========================================================= */
let revMode = 'flashcards';
let revView = 'list'; // 'list' | 'detail'  (flashcards only)
let revSubjectId = null;
let flashIdx = 0, flashFlipped = false;

// Mock quiz state
let quizStage = 'list'; // 'list' | 'setup' | 'active' | 'results'
let quizTimed = false;
let quizMinutes = 10;
let quizQuestions = [];
let quizIndex = 0;
let quizAnswers = [];
let quizTimerId = null;
let quizSecondsLeft = 0;

function revSetMode(m){
  revMode = m; revView = 'list'; quizStage = 'list';
  stopQuizTimer();
  renderReviewers();
}
function revOpenSubject(id){
  revSubjectId = id;
  if(revMode==='quiz'){
    quizStage = 'setup'; quizTimed = false; quizMinutes = 10;
  } else {
    revView = 'detail'; flashIdx = 0; flashFlipped = false;
  }
  renderReviewers();
}
function revBack(){
  if(revMode==='quiz'){ stopQuizTimer(); quizStage = 'list'; }
  else { revView = 'list'; }
  renderReviewers();
}

function renderReviewers(){
  let html = `<div class="rev-tabs">
    <button class="rev-tab ${revMode==='flashcards'?'active':''}" onclick="revSetMode('flashcards')">Flashcards</button>
    <button class="rev-tab ${revMode==='quiz'?'active':''}" onclick="revSetMode('quiz')">Mock Quiz</button>
    <button class="rev-tab ${revMode==='pdf'?'active':''}" onclick="revSetMode('pdf')">Readable PDF</button>
  </div>`;

  if(S().subjects.length===0){
    document.getElementById('pageContent').innerHTML = html + `<p style="color:var(--ink-soft);">No subjects yet — add some via Admin.</p>`;
    return;
  }

  if(revMode==='pdf'){
    const rows = [];
    S().subjects.forEach(s=>{
      s.materials.filter(m=>(m.type||'').toLowerCase()==='pdf').forEach(f=> rows.push(fileRow(f, s.name)));
    });
    html += `<div class="section-label">Readable PDFs</div>`;
    html += rows.length ? `<div class="hub-list">${rows.join('')}</div>`
      : `<p style="color:var(--ink-soft);">No PDF materials linked yet — add them via Admin → Subjects → Materials (type: PDF).</p>`;
    document.getElementById('pageContent').innerHTML = html;
    return;
  }

  if(revMode==='flashcards'){
    if(revView==='list'){
      html += renderRevSubjectList('flashcards');
      document.getElementById('pageContent').innerHTML = html;
      return;
    }
    const s = S().subjects.find(x=>x.id===revSubjectId);
    html += `<button class="btn ghost sm" onclick="revBack()" style="margin-bottom:16px;">‹ Back to subjects</button>`;
    html += `<div class="section-label" style="margin-top:0;">${s.name}</div>`;
    if(s.flashcards.length===0){ html += `<p style="color:var(--ink-soft);">No flashcards yet for this subject.</p>`; }
    else{
      const c = s.flashcards[flashIdx % s.flashcards.length];
      html += `<div class="flash-card ${flashFlipped?'is-flipped':''}" onclick="flashFlipped=!flashFlipped;renderReviewers()">
        ${flashFlipped ? c.a : c.q}
      </div>
      <div class="flash-nav">
        <button class="btn ghost" onclick="flashIdx=(flashIdx-1+${s.flashcards.length})%${s.flashcards.length};flashFlipped=false;renderReviewers()">‹ Prev</button>
        <span style="font-size:12.5px;color:var(--ink-soft);">${flashIdx%s.flashcards.length+1} / ${s.flashcards.length} · tap card to flip</span>
        <button class="btn ghost" onclick="flashIdx=(flashIdx+1)%${s.flashcards.length};flashFlipped=false;renderReviewers()">Next ›</button>
      </div>`;
    }
    document.getElementById('pageContent').innerHTML = html;
    return;
  }

  // ---- Mock Quiz ----
  if(quizStage==='list'){
    html += renderRevSubjectList('quiz');
    document.getElementById('pageContent').innerHTML = html;
    return;
  }
  const s = S().subjects.find(x=>x.id===revSubjectId);
  if(quizStage==='setup') html += renderQuizSetup(s);
  else if(quizStage==='active') html += renderQuizActive(s);
  else if(quizStage==='results') html += renderQuizResults(s);
  document.getElementById('pageContent').innerHTML = html;
}

function renderRevSubjectList(mode){
  let html = `<div class="section-label">${mode==='flashcards'?'Choose a subject to review':'Choose a subject to test yourself'}</div>
  <div class="hub-list">`;
  S().subjects.forEach(s=>{
    const count = mode==='flashcards' ? s.flashcards.length : s.quiz.length;
    const noun = mode==='flashcards' ? (count===1?'flashcard':'flashcards') : (count===1?'question':'questions');
    html += `<div class="hub-row" onclick="revOpenSubject('${s.id}')">
      <div class="chip" style="background:${s.color}">${s.code.slice(0,4)}</div>
      <div class="hub-text">
        <h4>${s.name}</h4>
        <p>${count} ${noun}</p>
      </div>
      <span class="hub-arrow">›</span>
    </div>`;
  });
  html += `</div>`;
  return html;
}

/* ---- Quiz setup (timer choice) ---- */
function renderQuizSetup(s){
  return `
    <button class="btn ghost sm" onclick="revBack()" style="margin-bottom:16px;">‹ Back to subjects</button>
    <div class="card">
      <h3>${s.name} — Mock Quiz</h3>
      <p style="color:var(--ink-soft);font-size:13px;">${s.quiz.length} question${s.quiz.length!==1?'s':''} available.</p>
      ${s.quiz.length===0 ? `<p style="color:var(--ink-soft);margin-top:12px;">No quiz questions yet for this subject — add some via Admin.</p>` : `
      <div class="section-label" style="margin-top:18px;">Timer</div>
      <div class="quiz-setup-options">
        <button class="quiz-setup-opt ${!quizTimed?'active':''}" onclick="quizTimed=false;renderReviewers()">No Timer</button>
        <button class="quiz-setup-opt ${quizTimed?'active':''}" onclick="quizTimed=true;renderReviewers()">Timer</button>
      </div>
      ${quizTimed?`
        <div class="section-label">Minutes</div>
        <input type="number" min="1" max="180" value="${quizMinutes}" style="max-width:130px;" onchange="quizMinutes=Math.max(1,parseInt(this.value)||10)">
      `:''}
      <button class="btn" style="margin-top:20px;" onclick="startQuiz('${s.id}')">Start Quiz</button>
      `}
    </div>
  `;
}

function startQuiz(subjectId){
  const s = S().subjects.find(x=>x.id===subjectId);
  quizQuestions = s.quiz.slice();
  quizIndex = 0;
  quizAnswers = new Array(quizQuestions.length).fill(null);
  quizStage = 'active';
  if(quizTimed){
    quizSecondsLeft = quizMinutes*60;
    startQuizTimer();
  }
  renderReviewers();
}
function startQuizTimer(){
  stopQuizTimer();
  quizTimerId = setInterval(()=>{
    quizSecondsLeft--;
    if(quizSecondsLeft<=0){
      quizSecondsLeft = 0;
      stopQuizTimer();
      finishQuiz();
      return;
    }
    const el = document.getElementById('quizTimerDisplay');
    if(el) el.textContent = formatQuizTime(quizSecondsLeft);
  },1000);
}
function stopQuizTimer(){
  if(quizTimerId){ clearInterval(quizTimerId); quizTimerId = null; }
}
function formatQuizTime(sec){
  const m = Math.floor(sec/60), s = sec%60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

/* ---- Quiz active (one question at a time) ---- */
function renderQuizActive(s){
  const q = quizQuestions[quizIndex];
  const selected = quizAnswers[quizIndex];
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <span style="font-size:12.5px;color:var(--ink-soft);">Question ${quizIndex+1} of ${quizQuestions.length}</span>
      ${quizTimed?`<span id="quizTimerDisplay" class="tag due" style="font-family:'Manrope';font-weight:700;">${formatQuizTime(quizSecondsLeft)}</span>`:''}
    </div>
    <div class="card">
      <span class="tag">${q.difficulty||'Easy'}</span>
      <div class="quiz-q" style="margin-top:10px;">${q.q}</div>
      ${q.choices.map((c,ci)=>`<button class="quiz-opt ${selected===ci?'selected':''}" onclick="selectQuizAnswer(${ci})">${c}</button>`).join('')}
    </div>
    <div class="flash-nav" style="margin-top:16px;">
      <button class="btn ghost" ${quizIndex===0?'disabled':''} onclick="quizIndex--;renderReviewers()">‹ Prev</button>
      ${quizIndex < quizQuestions.length-1
        ? `<button class="btn" onclick="quizIndex++;renderReviewers()">Next ›</button>`
        : `<button class="btn" onclick="finishQuiz()">Finish Quiz</button>`}
    </div>
  `;
}
function selectQuizAnswer(ci){
  quizAnswers[quizIndex] = ci;
  renderReviewers();
}
function finishQuiz(){
  stopQuizTimer();
  quizStage = 'results';
  renderReviewers();
}

/* ---- Quiz results ---- */
function renderQuizResults(s){
  let correct = 0;
  quizQuestions.forEach((q,i)=>{ if(quizAnswers[i]===q.answer) correct++; });
  const pct = quizQuestions.length ? Math.round(correct/quizQuestions.length*100) : 0;
  let html = `
    <div class="card" style="text-align:center;">
      <h3>Quiz Results</h3>
      <p style="font-size:32px;font-family:'Manrope';font-weight:800;color:var(--accent);margin:10px 0;">${correct}/${quizQuestions.length}</p>
      <p style="color:var(--ink-soft);">${pct}% correct</p>
    </div>
    <div class="section-label">Review</div>
  `;
  quizQuestions.forEach((q,i)=>{
    const userAns = quizAnswers[i];
    const isCorrect = userAns===q.answer;
    html += `<div class="card" style="margin-bottom:10px;">
      <span class="tag ${isCorrect?'':'due'}">${isCorrect?'Correct':(userAns===null?'Skipped':'Incorrect')}</span>
      <div class="quiz-q" style="margin-top:8px;font-size:14px;">${i+1}. ${q.q}</div>
      ${q.choices.map((c,ci)=>{
        let cls = '';
        if(ci===q.answer) cls='correct';
        else if(ci===userAns) cls='wrong';
        return `<div class="quiz-opt ${cls}" style="cursor:default;">${c}</div>`;
      }).join('')}
    </div>`;
  });
  html += `
    <div style="display:flex;gap:10px;margin-top:10px;">
      <button class="btn" onclick="quizStage='setup';renderReviewers()">Retake</button>
      <button class="btn ghost" onclick="revBack()">Back to subjects</button>
    </div>
  `;
  return html;
}

/* =========================================================
   HOW-TO (FAQ)
========================================================= */
function renderHowTo(){
  let html = '';
  S().faqs.forEach((f,i)=>{
    html += `<div class="faq-item" id="faq-${i}">
      <div class="faq-q" onclick="toggleFaq(${i})"><span>${f.q}</span><span>+</span></div>
      <div class="faq-a">${nl2br(f.a)}</div>
    </div>`;
  });
  if(S().faqs.length===0) html = `<p style="color:var(--ink-soft);">No FAQs yet.</p>`;
  document.getElementById('pageContent').innerHTML = html;
}
function toggleFaq(i){ document.getElementById('faq-'+i).classList.toggle('open'); }

/* =========================================================
   RULES AND OTHERS
========================================================= */
function nl2br(s){ return (s||'').replace(/\n/g, '<br>'); }
function rulesCard(icon, title, innerHtml){
  return `<div class="rules-card">
    <div class="rules-card-head">
      <div class="rules-card-icon"><svg viewBox="0 0 24 24">${icon}</svg></div>
      <h3>${title}</h3>
    </div>
    ${innerHtml}
  </div>`;
}
const RULES_ICONS = {
  vision: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  mission: '<path d="M12 2v20M2 12h20" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  preamble: '<path d="M6 2h9l5 5v15H6z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 12h6M9 16h6M9 8h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  values: '<path d="M12 2l2.9 6.3 6.9.9-5 4.8 1.2 6.9L12 17.6 5.9 20.9l1.2-6.9-5-4.8 6.9-.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  more: '<path d="M4 4h16v16H4z M4 9h16 M9 4v16" fill="none" stroke="currentColor" stroke-width="1.8"/>'
};

function renderRules(){
  const r = S().rules;
  let html = rulesCard(RULES_ICONS.vision, 'Vision', `<p>${nl2br(r.vision)||'Not set yet.'}</p>`);
  html += rulesCard(RULES_ICONS.mission, 'Mission', `<p>${nl2br(r.mission)||'Not set yet.'}</p>`);
  html += rulesCard(RULES_ICONS.preamble, 'Preamble', `<p>${nl2br(r.preamble)||'Not set yet.'}</p>`);
  html += rulesCard(RULES_ICONS.values, 'Core Values', `<div class="core-values">${r.coreValues.map(v=>`<div>${v}</div>`).join('') || '<p style="color:var(--ink-soft);">Not set yet.</p>'}</div>`);

  if(r.guidelines.length===0){
    html += rulesCard(RULES_ICONS.more, 'More Sections', `<p style="color:var(--ink-soft);">Not set yet.</p>`);
  } else {
    r.guidelines.forEach(g=>{
      let inner;
      if(g.body && g.body.includes('$')){
        const items = g.body.split('$').map(v=>v.trim()).filter(Boolean);
        inner = `<div class="core-values">${items.map(v=>`<div>${v}</div>`).join('')}</div>`;
      } else {
        inner = `<p>${nl2br(g.body)}</p>`;
      }
      html += rulesCard(RULES_ICONS.more, g.title, inner);
    });
  }
  document.getElementById('pageContent').innerHTML = html;
}
