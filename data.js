/* =========================================================
   DATA LAYER (Supabase-backed)
   Every function here talks to Supabase. Nothing is stored
   in localStorage anymore — data is shared across every
   visitor and device.
========================================================= */

function uid(){ return crypto.randomUUID(); }
function todayISO(){ return new Date().toISOString().slice(0,10); }

/* ---- Load everything for one school, shaped like the old local DATA object ---- */
async function loadSchoolData(schoolId){
  const [schoolRes, subjectsRes, eventsRes, activitiesRes, faqsRes, rulesRes, guidelinesRes] = await Promise.all([
    supabase.from('schools').select('*').eq('id', schoolId).maybeSingle(),
    supabase.from('subjects')
      .select('*, syllabus_files(*), materials(*), flashcards(*), quiz_questions(*)')
      .eq('school_id', schoolId)
      .order('created_at', {ascending:true}),
    supabase.from('events').select('*').eq('school_id', schoolId),
    supabase.from('activities').select('*').eq('school_id', schoolId),
    supabase.from('faqs').select('*').eq('school_id', schoolId),
    supabase.from('rules').select('*').eq('school_id', schoolId).maybeSingle(),
    supabase.from('guidelines').select('*').eq('school_id', schoolId)
  ]);

  [schoolRes, subjectsRes, eventsRes, activitiesRes, faqsRes, rulesRes, guidelinesRes].forEach(r=>{
    if(r.error) console.error('Supabase load error:', r.error);
  });

  return {
    fullName: schoolRes.data?.full_name || schoolId.toUpperCase(),
    subjects: (subjectsRes.data || []).map(s => ({
      id: s.id, code: s.code, name: s.name, professor: s.professor, room: s.room,
      day: s.day, time: s.time, color: s.color,
      syllabus: (s.syllabus_files || []).map(f => ({id:f.id, label:f.label, type:f.type, url:f.url})),
      materials: (s.materials || []).map(f => ({id:f.id, label:f.label, type:f.type, url:f.url})),
      flashcards: (s.flashcards || []).map(f => ({id:f.id, q:f.question, a:f.answer})),
      quiz: (s.quiz_questions || []).map(q => ({id:q.id, q:q.question, choices:q.choices, answer:q.correct_index, difficulty:q.difficulty}))
    })),
    events: (eventsRes.data || []).map(e => ({id:e.id, date:e.date, title:e.title, type:e.type, desc:e.description, subjectId:e.subject_id})),
    activities: (activitiesRes.data || []).map(a => ({id:a.id, title:a.title, subjectId:a.subject_id, type:a.type, start:a.start_date, due:a.due_date, instructions:a.instructions, tags:a.tags || []})),
    faqs: (faqsRes.data || []).map(f => ({id:f.id, q:f.question, a:f.answer})),
    rules: {
      vision: rulesRes.data?.vision || '',
      mission: rulesRes.data?.mission || '',
      preamble: rulesRes.data?.preamble || '',
      coreValues: rulesRes.data?.core_values || [],
      guidelines: (guidelinesRes.data || []).map(g => ({id:g.id, title:g.title, body:g.body}))
    }
  };
}

/* ---- Subjects ---- */
async function dbAddSubject(schoolId){
  const {data, error} = await supabase.from('subjects').insert({
    school_id: schoolId, code:'NEW', name:'New Subject', day:'Mon', color:'#2F6F5E'
  }).select().single();
  if(error){ alert('Could not add subject: '+error.message); return null; }
  return data.id;
}
async function dbSaveSubject(id, fields){
  const {error} = await supabase.from('subjects').update(fields).eq('id', id);
  if(error) alert('Could not save subject: '+error.message);
}
async function dbDeleteSubject(id){
  const {error} = await supabase.from('subjects').delete().eq('id', id);
  if(error) alert('Could not delete subject: '+error.message);
}

/* ---- Syllabus / Materials (same shape, different table) ---- */
async function dbAddFile(table, subjectId, label, type, url){
  const {error} = await supabase.from(table).insert({subject_id: subjectId, label, type, url});
  if(error) alert('Could not add file: '+error.message);
}
async function dbDeleteFile(table, id){
  const {error} = await supabase.from(table).delete().eq('id', id);
  if(error) alert('Could not delete file: '+error.message);
}

/* ---- Flashcards ---- */
async function dbAddFlashcard(subjectId, q, a){
  const {error} = await supabase.from('flashcards').insert({subject_id: subjectId, question: q, answer: a});
  if(error) alert('Could not add flashcard: '+error.message);
}
async function dbDeleteFlashcard(id){
  const {error} = await supabase.from('flashcards').delete().eq('id', id);
  if(error) alert('Could not delete flashcard: '+error.message);
}

/* ---- Quiz questions ---- */
async function dbAddQuiz(subjectId, question, choices, correctIndex, difficulty){
  const {error} = await supabase.from('quiz_questions').insert({
    subject_id: subjectId, question, choices, correct_index: correctIndex, difficulty
  });
  if(error) alert('Could not add quiz question: '+error.message);
}
async function dbDeleteQuiz(id){
  const {error} = await supabase.from('quiz_questions').delete().eq('id', id);
  if(error) alert('Could not delete quiz question: '+error.message);
}

/* ---- Events ---- */
async function dbAddEvent(schoolId, fields){
  const {error} = await supabase.from('events').insert({school_id: schoolId, ...fields});
  if(error) alert('Could not add event: '+error.message);
}
async function dbDeleteEvent(id){
  const {error} = await supabase.from('events').delete().eq('id', id);
  if(error) alert('Could not delete event: '+error.message);
}

/* ---- Activities ---- */
async function dbAddActivity(schoolId, fields){
  const {error} = await supabase.from('activities').insert({school_id: schoolId, ...fields});
  if(error) alert('Could not add activity: '+error.message);
}
async function dbDeleteActivity(id){
  const {error} = await supabase.from('activities').delete().eq('id', id);
  if(error) alert('Could not delete activity: '+error.message);
}

/* ---- FAQs ---- */
async function dbAddFaq(schoolId, question, answer){
  const {error} = await supabase.from('faqs').insert({school_id: schoolId, question, answer});
  if(error) alert('Could not add FAQ: '+error.message);
}
async function dbDeleteFaq(id){
  const {error} = await supabase.from('faqs').delete().eq('id', id);
  if(error) alert('Could not delete FAQ: '+error.message);
}

/* ---- Rules ---- */
async function dbSaveRules(schoolId, fields){
  const {error} = await supabase.from('rules').upsert({school_id: schoolId, ...fields});
  if(error) alert('Could not save rules: '+error.message);
}
async function dbAddGuideline(schoolId, title, body){
  const {error} = await supabase.from('guidelines').insert({school_id: schoolId, title, body});
  if(error) alert('Could not add guideline: '+error.message);
}
async function dbDeleteGuideline(id){
  const {error} = await supabase.from('guidelines').delete().eq('id', id);
  if(error) alert('Could not delete guideline: '+error.message);
}
