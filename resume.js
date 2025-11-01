/*
  AI Resume Builder (client-side)
  - Local "AI generate" uses heuristics & templates to produce summary & bullets.
  - No external services required.
*/

const state = {
  fullName: 'Jane Doe',
  role: 'Frontend Developer',
  email: 'you@example.com',
  phone: '',
  location: 'City, Country',
  summary: 'A results-driven frontend developer with hands-on experience building scalable web apps and delightful user experiences.',
  skills: ['JavaScript','React','HTML','CSS'],
  jobs: [
    {company:'Acme Inc', title:'Frontend Developer', start:'2022', end:'Present', bullets:['Built responsive UI for product using React and decreased load time by 25%.','Collaborated with designers to improve UX.']}
  ],
  education: ['B.Sc. Computer Science | ABC University | 2022'],
  template: 'classic'
};

// --- DOM refs
const q = id => document.getElementById(id);
const fields = {
  fullName: q('fullName'),
  role: q('role'),
  email: q('email'),
  phone: q('phone'),
  location: q('location'),
  summary: q('summary'),
  skills: q('skills'),
  education: q('education'),
  template: q('templateSelect')
};

const previewParent = q('previewParent');
const resume = q('resume');
const avatar = q('avatar');
const p_name = q('p_name');
const p_role = q('p_role');
const p_contact = q('p_contact');
const p_summary = q('p_summary');
const p_experience = q('p_experience');
const p_education = q('p_education');
const p_skills = q('p_skills');
const rawData = q('rawData');

function init() {
  // Load from localStorage if found
  const saved = localStorage.getItem('aiResume_v1');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(state, parsed);
    } catch(e){}
  }
  // Fill form
  fields.fullName.value = state.fullName;
  fields.role.value = state.role;
  fields.email.value = state.email;
  fields.phone.value = state.phone;
  fields.location.value = state.location;
  fields.summary.value = state.summary;
  fields.skills.value = state.skills.join(', ');
  fields.education.value = state.education.join('\\n');
  fields.template.value = state.template;

  // events
  fields.fullName.addEventListener('input', e => { state.fullName = e.target.value; render(); });
  fields.role.addEventListener('input', e => { state.role = e.target.value; render(); });
  fields.email.addEventListener('input', e => { state.email = e.target.value; render(); });
  fields.phone.addEventListener('input', e => { state.phone = e.target.value; render(); });
  fields.location.addEventListener('input', e => { state.location = e.target.value; render(); });
  fields.summary.addEventListener('input', e => { state.summary = e.target.value; render(); });
  fields.skills.addEventListener('input', e => { state.skills = e.target.value.split(',').map(s=>s.trim()).filter(Boolean); render(); });
  fields.education.addEventListener('input', e => { state.education = e.target.value.split('\\n').map(s=>s.trim()).filter(Boolean); render(); });
  fields.template.addEventListener('change', e => { state.template = e.target.value; applyTemplate(); saveLocal(); });

  q('addJob').addEventListener('click', addJobForm);
  q('generateAI').addEventListener('click', generateAISummary);
  q('clearSummary').addEventListener('click', ()=>{ state.summary=''; fields.summary.value=''; render(); });
  q('downloadPdf').addEventListener('click', ()=>{ window.print(); });
  q('exportJson').addEventListener('click', exportJSON);
  q('importJson').addEventListener('change', handleImport);
  q('saveLocal').addEventListener('click', saveLocal);
  q('resetAll').addEventListener('click', resetAll);
  q('togglePreviewData').addEventListener('click', ()=>{ rawData.style.display = rawData.style.display==='none' ? 'block':'none'; renderRaw(); });

  renderJobsEditor();
  applyTemplate();
  render();
}

// --- Render preview
function render(){
  // header
  p_name.textContent = state.fullName || 'Full Name';
  p_role.textContent = state.role || 'Role / Title';
  p_contact.textContent = [state.email, state.location, state.phone].filter(Boolean).join(' — ');
  avatar.textContent = initials(state.fullName || '');

  // summary
  p_summary.innerHTML = state.summary ? escapeHtml(state.summary).replace(/\\n/g,'<br/>') : '<i class="muted">Add a short professional summary</i>';

  // experience
  p_experience.innerHTML = '';
  if (!state.jobs || state.jobs.length===0) {
    p_experience.innerHTML = '<div class="muted">No experience added yet</div>';
  } else {
    state.jobs.forEach(job=>{
      const div = document.createElement('div');
      div.className = 'job';
      div.innerHTML = '<div class="title">'+escapeHtml(job.title)+' — <span class="muted">'+escapeHtml(job.company)+'</span></div>'
                    +'<div class="muted">'+escapeHtml(job.start)+' — '+escapeHtml(job.end||'Present')+'</div>';
      if (job.bullets && job.bullets.length){
        const ul = document.createElement('ul');
        ul.className = 'bullets';
        job.bullets.forEach(b=>{ const li = document.createElement('li'); li.textContent = b; ul.appendChild(li); });
        div.appendChild(ul);
      }
      p_experience.appendChild(div);
    });
  }

  // education
  p_education.innerHTML = '';
  if (!state.education || state.education.length===0) {
    p_education.innerHTML = '<div class="muted">No education added</div>';
  } else {
    state.education.forEach(ed=>{
      const d = document.createElement('div');
      d.textContent = ed;
      p_education.appendChild(d);
    });
  }

  // skills
  p_skills.innerHTML = '';
  (state.skills || []).forEach(s=>{
    const sp = document.createElement('span');
    sp.className = 'skill-pill';
    sp.textContent = s;
    p_skills.appendChild(sp);
  });

  applyTemplate();
  saveLocalDebounced();
  renderRaw();
}

function renderRaw(){
  rawData.textContent = JSON.stringify(state, null, 2);
}

// --- Templates
function applyTemplate(){
  previewParent.className = '';
  previewParent.classList.add('template-'+(state.template || 'classic'));
  // subtle styling per template
  document.documentElement.style.setProperty('--accent', state.template==='modern' ? '#0b6efd' : state.template==='minimal' ? '#222' : '#0b6efd');
}

// --- Jobs editor (left side)
function renderJobsEditor(){
  const container = q('experienceList');
  container.innerHTML = '';
  (state.jobs || []).forEach((job, idx)=>{
    const block = document.createElement('div');
    block.style.border = '1px solid #eef7ff';
    block.style.padding = '8px';
    block.style.borderRadius = '8px';
    block.style.marginTop = '8px';
    block.innerHTML = `
      <div style="display:flex;gap:8px">
        <input placeholder="Job title" data-idx="${idx}" data-key="title" value="${escapeHtml(job.title||'')}" style="flex:1;padding:8px;border-radius:6px;border:1px solid #e9f2ff"/>
        <input placeholder="Company" data-idx="${idx}" data-key="company" value="${escapeHtml(job.company||'')}" style="width:150px;padding:8px;border-radius:6px;border:1px solid #e9f2ff"/>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input placeholder="Start" data-idx="${idx}" data-key="start" value="${escapeHtml(job.start||'')}" style="flex:1;padding:8px;border-radius:6px;border:1px solid #e9f2ff"/>
        <input placeholder="End" data-idx="${idx}" data-key="end" value="${escapeHtml(job.end||'')}" style="width:120px;padding:8px;border-radius:6px;border:1px solid #e9f2ff"/>
      </div>
      <label style="font-weight:600;margin-top:8px">Achievements / bullets (one per line)</label>
      <textarea data-idx="${idx}" data-key="bullets" style="width:100%;min-height:70px;padding:8px;border-radius:6px;border:1px solid #e9f2ff">${(job.bullets||[]).join('\\n')}</textarea>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn ghost" data-action="remove" data-idx="${idx}">Remove</button>
        <button class="btn" data-action="aiBullets" data-idx="${idx}">AI enhance bullets</button>
      </div>
    `;
    container.appendChild(block);
  });

  // attach listeners
  container.querySelectorAll('input,textarea').forEach(el=>{
    el.addEventListener('input', e=>{
      const idx = Number(e.target.dataset.idx);
      const key = e.target.dataset.key;
      if (key==='bullets') {
        state.jobs[idx].bullets = e.target.value.split('\\n').map(s=>s.trim()).filter(Boolean);
      } else {
        state.jobs[idx][key] = e.target.value;
      }
      render();
    });
  });

  container.querySelectorAll('button').forEach(btn=>{
    const action = btn.dataset.action;
    const idx = Number(btn.dataset.idx);
    btn.addEventListener('click', ()=>{
      if (action==='remove') {
        state.jobs.splice(idx,1); renderJobsEditor(); render();
      } else if (action==='aiBullets') {
        // enhance bullets for this job
        const job = state.jobs[idx];
        const generated = generateBulletsFromJob(job, state.skills);
        job.bullets = generated.concat(job.bullets || []).slice(0,6);
        renderJobsEditor(); render();
      }
    });
  });
}

function addJobForm(){
  state.jobs = state.jobs || [];
  state.jobs.push({company:'Company', title:'Job Title', start:'2020', end:'2022', bullets:[]});
  renderJobsEditor();
  render();
}

// --- Utilities
function initials(name){
  if(!name) return '';
  const parts = name.trim().split(/\\s+/).filter(Boolean);
  if(parts.length===1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// --- Light "AI" generation (client-side heuristics)
// These are deterministic text templates — they create decent results offline.
// You can later replace with a server-side call to an LLM if you have API keys.
function generateAISummary(){
  // Use role, skills, and top job to craft a summary + bullets
  const role = state.role || 'Professional';
  const skills = (state.skills || []).slice(0,6);
  const topJob = (state.jobs && state.jobs[0]) ? state.jobs[0] : null;
  const years = inferYearsExperience(state.jobs);

  // Build summary
  let summary = '';
  if(topJob && topJob.title){
    summary = ${role} with ${years} of experience building ${topJob.title.toLowerCase()} and web applications. Skilled in ${skills.join(', ')}. Proven track record delivering user-focused solutions and improving performance and design.;
  } else {
    summary = ${role} with ${years} of experience. Skilled in ${skills.join(', ')}. Focused on building scalable, maintainable solutions that deliver business value.;
  }

  // build bullets for top job if exists
  if(topJob){
    const bullets = generateBulletsFromJob(topJob, skills);
    // place summary and add bullets to top job
    state.summary = summary;
    topJob.bullets = bullets.concat(topJob.bullets || []).slice(0,6);
  } else {
    state.summary = summary;
  }
  // update form field
  fields.summary.value = state.summary;
  renderJobsEditor();
  render();
}

function inferYearsExperience(jobs){
  if(!jobs || jobs.length===0) return 'X+ years';
  // naive: count distinct years from strings that look like '2020' etc.
  const years = new Set();
  jobs.forEach(j=>{
    [j.start, j.end].forEach(x=>{
      if(!x) return;
      const m = x.match(/(20\\d{2}|19\\d{2})/);
      if(m) years.add(Number(m[1]));
    });
  });
  if(years.size===0) return '2+ years';
  const arr = Array.from(years).sort((a,b)=>a-b);
  return Math.max(1, arr[arr.length-1] - arr[0] + 1) + '+ years';
}

function generateBulletsFromJob(job, skills){
  // Heuristic-driven bullet generation
  const title = job.title || state.role || '';
  const company = job.company || '';
  const skillList = (skills || []).slice(0,5);
  const verbs = ['Led','Built','Designed','Improved','Implemented','Optimized','Spearheaded','Created','Delivered'];
  const metrics = ['by 30%','reducing load by 25%','increasing conversion by 12%','saving 2 hours per week','scaling to 100k users','improving accessibility','improving performance'];

  const bullets = [];
  // generic achievement
  bullets.push(${pick(verbs)} ${title.toLowerCase()} features at ${company} using ${skillList.join(', ')} ${pick(metrics)}.);
  // teamwork
  bullets.push(${pick(verbs)} cross-functional collaboration with product and design to ship customer-facing features and improve UX.);
  // process / quality
  bullets.push(Introduced testing and CI practices to increase code quality and reduce regressions.);
  // performance / scale
  bullets.push(${pick(verbs)} performance improvements, ${pick(metrics)}, through code and architecture optimizations.);
  // optional: one skill-focused bullet
  if(skillList.length){
    bullets.push(Developed solutions using ${skillList.join(', ')} to solve complex front-end problems and maintainable code.);
  }
  // keep unique & short
  return uniq(bullets).slice(0,5).map(s => s.replace(/\\s+/g,' ').trim());
}

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function uniq(a){ return Array.from(new Set(a)); }

// --- save / export / import
function saveLocal(){
  try{
    localStorage.setItem('aiResume_v1', JSON.stringify(state));
    alert('Saved to localStorage.');
  }catch(e){ console.warn('save failed',e); }
}
let saveTimer = null;
function saveLocalDebounced(){
  if(saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{ localStorage.setItem('aiResume_v1', JSON.stringify(state)); }, 800);
}
function exportJSON(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = (state.fullName || 'resume') + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function handleImport(e){
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    try {
      const parsed = JSON.parse(ev.target.result);
      Object.assign(state, parsed);
      // update form fields & UI
      fields.fullName.value = state.fullName || '';
      fields.role.value = state.role || '';
      fields.email.value = state.email || '';
      fields.phone.value = state.phone || '';
      fields.location.value = state.location || '';
      fields.summary.value = state.summary || '';
      fields.skills.value = (state.skills || []).join(', ');
      fields.education.value = (state.education || []).join('\\n');
      fields.template.value = state.template || 'classic';
      renderJobsEditor();
      applyTemplate();
      render();
      alert('Resume imported.');
    } catch(err){ alert('Invalid JSON file'); }
  };
  reader.readAsText(f);
  e.target.value = '';
}
function resetAll(){
  if(!confirm('Reset all data to defaults?')) return;
  localStorage.removeItem('aiResume_v1');
  location.reload();
}

// init on load
init();

