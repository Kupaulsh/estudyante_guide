/* =========================================================
   ADMIN AUTH (Supabase Auth + Google, checked against `admins` table)
========================================================= */
let adminSchool = 'pccm';
let adminTab = 'subjects';

function openAdminGate(presetSchool){
  sessionStorage.setItem('shAdminPendingSchool', presetSchool || 'pccm');
  document.getElementById('landing').style.display='none';
  document.getElementById('app').classList.remove('active');
  document.getElementById('gearNav').style.display='none';
  closeGear();
  document.getElementById('adminGate').classList.remove('hidden');
  setAdminGateStatus('');
}
function closeAdminGate(){
  sessionStorage.removeItem('shAdminPendingSchool');
  document.getElementById('adminGate').classList.add('hidden');
  document.getElementById('landing').style.display='flex';
}
function setAdminGateStatus(msg){
  const el = document.getElementById('adminGateStatus');
  if(el) el.textContent = msg;
}
async function signInWithGoogle(){
  setAdminGateStatus('Redirecting to Google…');
  const {error} = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href.split('#')[0].split('?')[0] }
  });
  if(error) setAdminGateStatus('Sign-in error: ' + error.message);
  // On success the browser navigates away to Google and back — nothing else to do here.
}
async function checkAdminSession(){
  const {data:{session}} = await supabase.auth.getSession();
  if(!session) return;
  const pending = sessionStorage.getItem('shAdminPendingSchool');
  if(!pending) return; // signed in, but not currently trying to reach Admin

  const {data:isAdmin, error} = await supabase.rpc('is_admin');
  if(error){ setAdminGateStatus('Error checking admin status: ' + error.message); return; }

  if(isAdmin){
    sessionStorage.removeItem('shAdminPendingSchool');
    await enterAdminApp(pending, session.user.email);
  } else {
    document.getElementById('landing').style.display='none';
    document.getElementById('adminGate').classList.remove('hidden');
    setAdminGateStatus(`Signed in as ${session.user.email}, but this account isn't on the admin list. Add this email to the "admins" table in Supabase, then try again.`);
  }
}
async function enterAdminApp(school, email){
  document.getElementById('adminGate').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');
  adminSchool = school;
  document.getElementById('adminSchoolSel').value = school;
  const emailEl = document.getElementById('adminUserEmail');
  if(emailEl) emailEl.textContent = email;
  DATA[school] = await loadSchoolData(school);
  renderAdmin();
}
async function exitAdmin(){
  await supabase.auth.signOut();
  document.getElementById('adminApp').classList.add('hidden');
  document.getElementById('landing').style.display='flex';
}

// Fires on load (existing session) and right after the Google redirect comes back.
supabase.auth.onAuthStateChange((event, session)=>{
  if(event === 'SIGNED_IN') checkAdminSession();
});
checkAdminSession();

/* =========================================================
   ADMIN PANEL
========================================================= */
const ADMIN_TABS = ['subjects','schedule','reviewers','events','activities','faqs','rules','theme'];

async function refreshAdminData(){
  DATA[adminSchool] = await loadSchoolData(adminSchool);
}
async function switchAdminSchool(){
  adminSchool = document.getElementById('adminSchoolSel').value;
  await refreshAdminData();
  renderAdmin();
}

function renderAdmin(){
  document.getElementById('adminTabs').innerHTML = ADMIN_TABS.map(t=>
    `<button class="admin-tab ${adminTab===t?'active':''}" onclick="adminTab='${t}';renderAdmin()">${t[0].toUpperCase()+t.slice(1)}</button>`
  ).join('');
  const body = document.getElementById('adminBody');
  const D = DATA[adminSchool];
  if(!D){ body.innerHTML = `<p style="color:var(--ink-soft);">Loading…</p>`; return; }
  if(adminTab==='subjects') body.innerHTML = adminSubjects(D);
  if(adminTab==='schedule') body.innerHTML = adminSchedule(D);
  if(adminTab==='reviewers') body.innerHTML = adminReviewers(D);
  if(adminTab==='events') body.innerHTML = adminEvents(D);
  if(adminTab==='activities') body.innerHTML = adminActivities(D);
  if(adminTab==='faqs') body.innerHTML = adminFaqs(D);
  if(adminTab==='rules') body.innerHTML = adminRules(D);
  if(adminTab==='theme') body.innerHTML = adminTheme(D);
}

/* ---- Subjects admin ---- */
function adminSubjects(D){
  let html = `<button class="btn" onclick="adminAddSubject()">+ Add subject</button><div style="height:14px;"></div>`;
  D.subjects.forEach(s=>{
    html += `<div class="admin-list-item">
      <div class="info">
        <b>${s.name}</b> <small>${s.code}</small>
        <small>${s.syllabus.length} syllabus file(s) · ${s.materials.length} material(s)</small>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn sm ghost" onclick="adminEditSubject('${s.id}')">Edit</button>
        <button class="btn sm danger" onclick="adminDeleteSubject('${s.id}')">Delete</button>
      </div>
    </div>`;
  });
  return html;
}
async function adminAddSubject(){
  const newId = await dbAddSubject(adminSchool);
  await refreshAdminData();
  renderAdmin();
  if(newId) adminEditSubject(newId);
}
async function adminDeleteSubject(id){
  if(!confirm('Delete this subject and all its content?')) return;
  await dbDeleteSubject(id);
  await refreshAdminData();
  renderAdmin();
}
function adminEditSubject(id){
  const D = DATA[adminSchool];
  const s = D.subjects.find(x=>x.id===id);
  let html = `<h3>Edit subject</h3>
  <div class="form-grid">
    <div><label>Name</label><input id="f_name" value="${escAttr(s.name)}"></div>
    <div class="two-col">
      <div><label>Code</label><input id="f_code" value="${escAttr(s.code)}"></div>
      <div><label>Color</label><input id="f_color" type="color" value="${s.color}"></div>
    </div>
  </div>
  <button class="btn" onclick="adminSaveSubject('${id}')">Save details</button>
  <hr style="margin:20px 0;border:none;border-top:1px solid var(--line);">

  <div class="section-label">Syllabus files</div>
  <div id="syllabusList">${adminFileList(s.syllabus,'syllabus_files',id)}</div>
  ${adminFileAddForm('syllabus_files', id)}

  <div class="section-label">Materials (PDF / PPTX / DOCX)</div>
  <div id="materialsList">${adminFileList(s.materials,'materials',id)}</div>
  ${adminFileAddForm('materials', id)}`;
  openModal(html);
}
function adminFileList(list, table, subjId){
  if(list.length===0) return `<p style="font-size:12.5px;color:var(--ink-soft);">None yet.</p>`;
  return list.map((f)=>`<div class="admin-list-item"><div class="info"><b>${f.label}</b><br><small>${f.type||''} — ${f.url}</small></div><button class="btn sm danger" onclick="adminDeleteFile('${table}','${f.id}','${subjId}')">Delete</button></div>`).join('');
}
function adminFileAddForm(table, subjId){
  return `<div class="form-grid">
    <input id="${table}_label_${subjId}" placeholder="Label (e.g. Week 1 Syllabus)">
    <div class="two-col">
      <input id="${table}_type_${subjId}" placeholder="Type (PDF, PPTX, DOCX...)">
      <input id="${table}_url_${subjId}" placeholder="Link (Google Drive URL)">
    </div>
    <button class="btn ghost" onclick="adminAddFile('${table}','${subjId}')">+ Add file</button>
  </div>`;
}
async function adminAddFile(table, subjId){
  const label = document.getElementById(`${table}_label_${subjId}`).value.trim();
  const type = document.getElementById(`${table}_type_${subjId}`).value.trim();
  const url = document.getElementById(`${table}_url_${subjId}`).value.trim();
  if(!label || !url){ alert('Label and link are required.'); return; }
  await dbAddFile(table, subjId, label, type, url);
  await refreshAdminData();
  adminEditSubject(subjId);
}
async function adminDeleteFile(table, fileId, subjId){
  await dbDeleteFile(table, fileId);
  await refreshAdminData();
  adminEditSubject(subjId);
}
async function adminSaveSubject(id){
  await dbSaveSubject(id, {
    name: document.getElementById('f_name').value,
    code: document.getElementById('f_code').value,
    color: document.getElementById('f_color').value
  });
  await refreshAdminData();
  renderAdmin();
  closeModal();
}

/* ---- Schedule admin (a subject can have multiple meeting slots) ---- */
function adminSchedule(D){
  if(D.subjects.length===0) return `<p style="color:var(--ink-soft);">Add subjects first (in the Subjects tab), then set their schedule here.</p>`;
  let html = '';
  D.subjects.forEach(s=>{
    const summary = s.schedule.length===0 ? 'No schedule set'
      : s.schedule.map(sl=>`${sl.day||'?'} ${sl.time||'TBA'}`).join(' · ');
    html += `<div class="admin-list-item">
      <div class="info">
        <b>${s.name}</b>
        <small>${summary}</small>
      </div>
      <button class="btn sm ghost" onclick="adminEditSchedule('${s.id}')">Edit</button>
    </div>`;
  });
  return html;
}
function adminEditSchedule(id){
  const D = DATA[adminSchool];
  const s = D.subjects.find(x=>x.id===id);
  const html = `<h3>Schedule — ${s.name}</h3>
  <p style="color:var(--ink-soft);font-size:12.5px;">Add one entry per class meeting — e.g. add a "Mon" one for lecture, then a separate "Wed" one for lab. Each stays independent.</p>
  <div class="section-label" style="margin-top:16px;">Current meeting times</div>
  <div id="scheduleList">${adminScheduleList(s.schedule, id)}</div>
  <hr style="margin:20px 0;border:none;border-top:1px solid var(--line);">
  <div class="section-label" style="margin-top:0;">Add a new meeting time</div>
  <div class="form-grid">
    <div class="two-col">
      <div><label>Day</label>
        <select id="sc_day_${id}">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<option>${d}</option>`).join('')}</select>
      </div>
      <div><label>Time slot</label><input id="sc_time_${id}" placeholder="8:00–10:00 AM"></div>
    </div>
    <div class="two-col">
      <div><label>Professor</label><input id="sc_prof_${id}" placeholder="Professor name"></div>
      <div><label>Room</label><input id="sc_room_${id}" placeholder="Room number"></div>
    </div>
    <button class="btn" onclick="adminAddScheduleSlot('${id}')">+ Add this meeting time</button>
  </div>`;
  openModal(html);
}
function adminScheduleList(slots, subjId){
  if(slots.length===0) return `<p style="font-size:12.5px;color:var(--ink-soft);">None yet — this subject won't show up on the Schedule page until you add one.</p>`;
  return slots.map(sl=>`<div class="admin-list-item"><div class="info"><b>${sl.day||'?'} · ${sl.time||'TBA'}</b><br><small>${sl.professor||'Professor TBA'} · Room ${sl.room||'TBA'}</small></div><button class="btn sm danger" onclick="adminDeleteScheduleSlot('${subjId}','${sl.id}')">Delete</button></div>`).join('');
}
async function adminAddScheduleSlot(subjId){
  const day = document.getElementById(`sc_day_${subjId}`).value;
  const time = document.getElementById(`sc_time_${subjId}`).value.trim();
  const professor = document.getElementById(`sc_prof_${subjId}`).value.trim();
  const room = document.getElementById(`sc_room_${subjId}`).value.trim();
  await dbAddScheduleSlot(subjId, day, time, room, professor);
  await refreshAdminData();
  adminEditSchedule(subjId);
}
async function adminDeleteScheduleSlot(subjId, slotId){
  await dbDeleteScheduleSlot(slotId);
  await refreshAdminData();
  adminEditSchedule(subjId);
}

/* ---- Reviewers admin (flashcards + quiz per subject) ---- */
function adminReviewers(D){
  if(D.subjects.length===0) return `<p style="color:var(--ink-soft);">Add subjects first (in the Subjects tab), then add flashcards and quiz questions here.</p>`;
  let html = '';
  D.subjects.forEach(s=>{
    html += `<div class="admin-list-item">
      <div class="info">
        <b>${s.name}</b>
        <small>${s.flashcards.length} flashcard(s) · ${s.quiz.length} quiz question(s)</small>
      </div>
      <button class="btn sm ghost" onclick="adminEditReviewer('${s.id}')">Edit</button>
    </div>`;
  });
  return html;
}
function adminEditReviewer(id){
  const D = DATA[adminSchool];
  const s = D.subjects.find(x=>x.id===id);
  const html = `<h3>Reviewers — ${s.name}</h3>

  <div class="section-label" style="margin-top:0;">Flashcards</div>
  <div id="flashList">${s.flashcards.map((f)=>`<div class="admin-list-item"><div class="info"><b>Q:</b> ${f.q}<br><small>A: ${f.a}</small></div><button class="btn sm danger" onclick="adminDeleteFlash('${id}','${f.id}')">Delete</button></div>`).join('')}</div>
  <div class="form-grid">
    <input id="fc_q" placeholder="Question">
    <input id="fc_a" placeholder="Answer">
    <button class="btn ghost" onclick="adminAddFlash('${id}')">+ Add flashcard</button>
  </div>

  <div class="section-label">Quiz questions</div>
  <div id="quizList">${s.quiz.map((q)=>`<div class="admin-list-item"><div class="info"><b>${q.q}</b><br><small>Choices: ${q.choices.join(' | ')} — Correct: ${q.choices[q.answer]} — ${q.difficulty}</small></div><button class="btn sm danger" onclick="adminDeleteQuiz('${id}','${q.id}')">Delete</button></div>`).join('')}</div>
  <div class="form-grid">
    <input id="qz_q" placeholder="Question">
    <input id="qz_choices" placeholder="Choices, comma-separated (e.g. A, B, C, D)">
    <input id="qz_answer" placeholder="Correct answer (must match one choice exactly)">
    <select id="qz_diff">
      <option>Easy</option><option>Average</option><option>Hard</option><option>Very Hard</option>
    </select>
    <button class="btn ghost" onclick="adminAddQuiz('${id}')">+ Add quiz question</button>
  </div>`;
  openModal(html);
}
async function adminAddFlash(subjId){
  const q = document.getElementById('fc_q').value.trim();
  const a = document.getElementById('fc_a').value.trim();
  if(!q||!a){alert('Fill both fields.');return;}
  await dbAddFlashcard(subjId, q, a);
  await refreshAdminData();
  adminEditReviewer(subjId);
}
async function adminDeleteFlash(subjId, flashId){
  await dbDeleteFlashcard(flashId);
  await refreshAdminData();
  adminEditReviewer(subjId);
}
async function adminAddQuiz(subjId){
  const q = document.getElementById('qz_q').value.trim();
  const choices = document.getElementById('qz_choices').value.split(',').map(c=>c.trim()).filter(Boolean);
  const answerText = document.getElementById('qz_answer').value.trim();
  const diff = document.getElementById('qz_diff').value;
  const answerIdx = choices.indexOf(answerText);
  if(!q||choices.length<2||answerIdx===-1){ alert('Fill all fields; correct answer must exactly match one choice.'); return; }
  await dbAddQuiz(subjId, q, choices, answerIdx, diff);
  await refreshAdminData();
  adminEditReviewer(subjId);
}
async function adminDeleteQuiz(subjId, quizId){
  await dbDeleteQuiz(quizId);
  await refreshAdminData();
  adminEditReviewer(subjId);
}

/* ---- Events admin ---- */
function adminEvents(D){
  let html = `<div class="form-grid">
    <input id="ev_title" placeholder="Title">
    <div class="two-col">
      <input id="ev_date" type="date" value="${todayISO()}">
      <select id="ev_type"><option value="event">Event</option><option value="due">Due</option><option value="project">Project</option></select>
    </div>
    <select id="ev_subject">${D.subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select>
    <textarea id="ev_desc" placeholder="Description" rows="2"></textarea>
    <button class="btn" onclick="adminAddEvent()">+ Add to calendar</button>
  </div><div class="section-label">All events</div>`;
  D.events.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>{
    html += `<div class="admin-list-item"><div class="info"><b>${e.title}</b><br><small>${e.date} · ${e.type}</small></div><button class="btn sm danger" onclick="adminDeleteEvent('${e.id}')">Delete</button></div>`;
  });
  return html;
}
async function adminAddEvent(){
  const title = document.getElementById('ev_title').value.trim();
  if(!title){alert('Title required.');return;}
  await dbAddEvent(adminSchool, {
    title, date: document.getElementById('ev_date').value, type: document.getElementById('ev_type').value,
    subject_id: document.getElementById('ev_subject').value || null,
    description: document.getElementById('ev_desc').value
  });
  await refreshAdminData();
  renderAdmin();
}
async function adminDeleteEvent(id){
  await dbDeleteEvent(id);
  await refreshAdminData();
  renderAdmin();
}

/* ---- Activities admin ---- */
function adminActivities(D){
  let html = `<div class="form-grid">
    <input id="ac_title" placeholder="Title">
    <select id="ac_subject">${D.subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select>
    <select id="ac_type"><option>Assignment</option><option>Activity</option><option>Project</option></select>
    <div class="two-col">
      <div><label>Start</label><input id="ac_start" type="date" value="${todayISO()}"></div>
      <div><label>Due</label><input id="ac_due" type="date" value="${todayISO()}"></div>
    </div>
    <textarea id="ac_instr" placeholder="Instructions" rows="2"></textarea>
    <input id="ac_tags" placeholder="Tags, comma-separated">
    <button class="btn" onclick="adminAddActivity()">+ Add activity</button>
  </div><div class="section-label">All activities</div>`;
  D.activities.forEach(a=>{
    html += `<div class="admin-list-item"><div class="info"><b>${a.title}</b><br><small>${a.type} · due ${a.due}</small></div><button class="btn sm danger" onclick="adminDeleteActivity('${a.id}')">Delete</button></div>`;
  });
  return html;
}
async function adminAddActivity(){
  const title = document.getElementById('ac_title').value.trim();
  if(!title){alert('Title required.');return;}
  await dbAddActivity(adminSchool, {
    title, subject_id: document.getElementById('ac_subject').value || null,
    type: document.getElementById('ac_type').value,
    start_date: document.getElementById('ac_start').value,
    due_date: document.getElementById('ac_due').value,
    instructions: document.getElementById('ac_instr').value,
    tags: document.getElementById('ac_tags').value.split(',').map(t=>t.trim()).filter(Boolean)
  });
  await refreshAdminData();
  renderAdmin();
}
async function adminDeleteActivity(id){
  await dbDeleteActivity(id);
  await refreshAdminData();
  renderAdmin();
}

/* ---- FAQ admin ---- */
function adminFaqs(D){
  let html = `<div class="form-grid">
    <input id="fq_q" placeholder="Question">
    <textarea id="fq_a" placeholder="Answer" rows="2"></textarea>
    <button class="btn" onclick="adminAddFaq()">+ Add FAQ</button>
  </div><div class="section-label">All FAQs</div>`;
  D.faqs.forEach((f)=>{
    html += `<div class="admin-list-item"><div class="info"><b>${f.q}</b><br><small>${f.a}</small></div><button class="btn sm danger" onclick="adminDeleteFaq('${f.id}')">Delete</button></div>`;
  });
  return html;
}
async function adminAddFaq(){
  const q = document.getElementById('fq_q').value.trim();
  const a = document.getElementById('fq_a').value.trim();
  if(!q||!a){alert('Fill both fields.');return;}
  await dbAddFaq(adminSchool, q, a);
  await refreshAdminData();
  renderAdmin();
}
async function adminDeleteFaq(id){
  await dbDeleteFaq(id);
  await refreshAdminData();
  renderAdmin();
}

/* ---- Rules admin ---- */
function adminRules(D){
  const r = D.rules;
  let html = `<div class="form-grid">
    <div><label>Vision</label><textarea id="r_vision" rows="2">${r.vision}</textarea></div>
    <div><label>Mission</label><textarea id="r_mission" rows="2">${r.mission}</textarea></div>
    <div><label>Preamble</label><textarea id="r_preamble" rows="2">${r.preamble}</textarea></div>
    <div><label>Core Values (comma-separated)</label><input id="r_values" value="${escAttr(r.coreValues.join(', '))}"></div>
    <button class="btn" onclick="adminSaveRules()">Save</button>
  </div>
  <div class="section-label">More sections</div>
  <p style="color:var(--ink-soft);font-size:12.5px;margin-top:-6px;">Add anything else that doesn't fit above — university hymn, strategic goals, rules & regulations, dress code, whatever you need. Each one shows up as its own block on the Rules and Others page.</p>`;
  if(r.guidelines.length===0){
    html += `<p style="color:var(--ink-soft);font-size:12.5px;">None yet.</p>`;
  }
  r.guidelines.forEach((g)=>{
    html += `<div class="admin-list-item"><div class="info"><b>${g.title}</b><br><small>${g.body}</small></div><button class="btn sm danger" onclick="adminDeleteGuideline('${g.id}')">Delete</button></div>`;
  });
  html += `<div class="form-grid">
    <input id="g_title" placeholder="Section title (e.g. University Hymn, Strategic Goals, Dress Code)">
    <textarea id="g_body" placeholder="Content for this section" rows="3"></textarea>
    <button class="btn ghost" onclick="adminAddGuideline()">+ Add section</button>
  </div>`;
  return html;
}
async function adminSaveRules(){
  await dbSaveRules(adminSchool, {
    vision: document.getElementById('r_vision').value,
    mission: document.getElementById('r_mission').value,
    preamble: document.getElementById('r_preamble').value,
    core_values: document.getElementById('r_values').value.split(',').map(v=>v.trim()).filter(Boolean)
  });
  await refreshAdminData();
  renderAdmin();
}
async function adminAddGuideline(){
  const title = document.getElementById('g_title').value.trim();
  const body = document.getElementById('g_body').value.trim();
  if(!title||!body){alert('Fill both fields.');return;}
  await dbAddGuideline(adminSchool, title, body);
  await refreshAdminData();
  renderAdmin();
}
async function adminDeleteGuideline(id){
  await dbDeleteGuideline(id);
  await refreshAdminData();
  renderAdmin();
}

/* ---- Theme admin ---- */
function adminTheme(D){
  return `
    <div class="card">
      <h3>Colors for ${D.fullName}</h3>
      <p style="color:var(--ink-soft);font-size:12.5px;">These apply site-wide whenever someone is viewing this school. Changes save immediately and preview here too.</p>
      <div class="two-col" style="margin-top:16px;max-width:320px;">
        <div>
          <label>Accent color</label>
          <input id="th_accent" type="color" value="${D.accentColor}" style="height:44px;">
        </div>
        <div>
          <label>Background color</label>
          <input id="th_bg" type="color" value="${D.bgColor}" style="height:44px;">
        </div>
      </div>
      <button class="btn" style="margin-top:18px;" onclick="adminSaveTheme()">Save colors</button>
      <button class="btn ghost" style="margin-top:18px;" onclick="adminResetTheme()">Reset to default</button>
    </div>
  `;
}
async function adminSaveTheme(){
  const accent = document.getElementById('th_accent').value;
  const bg = document.getElementById('th_bg').value;
  await dbSaveTheme(adminSchool, accent, bg);
  await refreshAdminData();
  applyTheme(adminSchool);
  renderAdmin();
}
async function adminResetTheme(){
  await dbSaveTheme(adminSchool, '#2F6F5E', '#F6F5F0');
  await refreshAdminData();
  applyTheme(adminSchool);
  renderAdmin();
}

function escAttr(s){ return (s||'').replace(/"/g,'&quot;'); }
