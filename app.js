/* =================== Helpers & storage =================== */
const KEY_FORM = 'mr_demo_encuestas_v1';
const KEY_USER = 'mr_demo_users_v1';
const KEY_AUTH = 'mr_demo_auth_v1';
const THEME_KEY = 'mr_demo_theme';

const $  = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const load = (k, d=[]) => JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const todayStr = () => new Date().toISOString().slice(0,10);

function showToast(msg){
  const t = $('#encToast'); if(!t) return;
  t.textContent = msg; t.hidden = !msg;
}
function announce(msg){
  const live = $('#encMsg'); if(live) live.textContent = msg || '';
  showToast(msg || '');
}

/* Scroll hacia el primer elemento faltante (vertical y horizontal si es matriz/tabla) */
function scrollToControl(el){
  if(!el) return;
  const scroller = $('#dlgEncuesta .modal-body') || $('#dlgEncuesta');
  let target = el;

  if(el.type === 'hidden'){
    const group = el.previousElementSibling;
    if(group && group.classList.contains('checkgroup')){
      target = group;
      const hwrap = group.closest('.matrix-wrap, .table-wrap');
      if(hwrap){
        const r  = group.getBoundingClientRect();
        const wr = hwrap.getBoundingClientRect();
        hwrap.scrollBy({ left: r.left - wr.left - 16, behavior:'smooth' });
      }
      group.querySelector('.pillcheck')?.focus();
    }
  }

  const rect  = target.getBoundingClientRect();
  const crect = scroller.getBoundingClientRect();
  scroller.scrollBy({ top: rect.top - crect.top - 24, behavior:'smooth' });
}

function ensureHint(el){
  const parent = el.parentElement || el.closest('div') || el;
  let h = parent.querySelector('.err-hint');
  if(!h){ h = document.createElement('small'); h.className='err-hint'; parent.appendChild(h); }
  return h;
}

/* Seed usuario demo */
if(!localStorage.getItem(KEY_USER)){
  save(KEY_USER, [{ username:'ricardo_lechuca', pass:'mr-pasf12*', meta:20, nombre:'Ricardo Lechuca' }]);
}
if(!localStorage.getItem(KEY_FORM)){ save(KEY_FORM, []); }

/* =================== Router =================== */
function showView(hash){
  const id = (hash || '#/login');
  $('#view-login').hidden = id !== '#/login';
  $('#view-panel').hidden = id !== '#/panel';
  if(id === '#/panel') guard();
}
window.addEventListener('hashchange', ()=>showView(location.hash));
showView(location.hash);

/* =================== Tema =================== */
function setTheme(mode){
  const root = document.documentElement;
  if(mode==='dark'){ root.classList.add('dark'); } else { root.classList.remove('dark'); mode='light'; }
  localStorage.setItem(THEME_KEY, mode);
  const btn = $('#btnTema'); if(btn) btn.textContent = mode==='dark'?'Tema: Oscuro':'Tema: Claro';
}
(()=>{ const saved=localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved || (prefersDark?'dark':'light'));
})();
$('#btnTema')?.addEventListener('click', ()=> setTheme(document.documentElement.classList.contains('dark')?'light':'dark') );

/* =================== Auth =================== */
function currentUser(){
  const auth = load(KEY_AUTH, null);
  if(!auth) return null;
  const users = load(KEY_USER, []);
  return users.find(u=>u.username===auth.username) || null;
}
function guard(){
  const u = currentUser();
  if(!u){ location.hash = '#/login'; return; }
  renderPanel();
}
$('#formLogin')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const u = $('#lgUser').value.trim();
  const p = $('#lgPass').value;
  const users = load(KEY_USER, []);
  const found = users.find(x=>x.username===u && x.pass===p);
  if(!found){ alert('Usuario o contraseña incorrecta'); return; }
  save(KEY_AUTH, { username: found.username });
  location.hash = '#/panel';
});
$('#btnLogout')?.addEventListener('click', ()=>{ localStorage.removeItem(KEY_AUTH); location.hash = '#/login'; });

/* =================== Panel KPIs =================== */
function renderPanel(){
  const u = currentUser(); if(!u) return;
  $('#lblUser').textContent = `Conectado: ${u.nombre || u.username}`;
  $('#metaDiaria').value = u.meta || 0; $('#kMeta').textContent = u.meta || 0;

  const data = load(KEY_FORM);
  const mias = data.filter(r => r.censista === u.username);
  const hoy = todayStr();
  const hoyMias = mias.filter(r => r.fecha === hoy);
  $('#kHoy').textContent = hoyMias.length;
  const semana = mias.filter(r => Date.now()-new Date(r.created_at).getTime() < 7*864e5).length;
  $('#kSemana').textContent = semana;

  const pct = u.meta ? Math.min(100, Math.round(100*hoyMias.length/u.meta)) : 0;
  $('#barraMeta').style.width = pct + '%';
  $('#lblMeta').textContent = `${pct}% de tu meta cubierta hoy`;

  $('#listaCensista').innerHTML = mias.slice(-20).reverse().map(r =>
    `<li class="bg-white border border-borde rounded-xl p-2 flex items-center justify-between">
       <span>${r.seccion || 'Sección ?'}</span>
       <span class="text-xs text-neutral-500">${r.fecha}</span>
     </li>`).join('');
}
$('#guardarMeta')?.addEventListener('click', ()=>{
  const u = currentUser(); if(!u) return;
  const users = load(KEY_USER, []);
  const i = users.findIndex(x=>x.username===u.username);
  if(i>=0){ users[i].meta = Number($('#metaDiaria').value || 0); save(KEY_USER, users); renderPanel(); alert('Meta actualizada.'); }
});

/* =================== CheckGroup (pills exclusivas) =================== */
function makeCheckGroup(name, options) {
  const id = `cg_${name}_${Math.random().toString(36).slice(2)}`;
  const html = [
    `<div class="checkgroup" id="${id}" data-name="${name}">`,
    ...options.map(v => `<button type="button" class="pillcheck" data-val="${v}" aria-checked="false">${v}</button>`),
    `</div><input type="hidden" name="${name}" />`
  ].join('');
  return html;
}
function wireCheckGroups(scope=document){
  scope.querySelectorAll('.checkgroup').forEach(cg=>{
    const name = cg.dataset.name;
    const hidden = cg.nextElementSibling?.name===name ? cg.nextElementSibling : null;
    const setVal = (val)=>{
      cg.querySelectorAll('.pillcheck').forEach(b => b.setAttribute('aria-checked', String(b.dataset.val===val)));
      if(hidden) hidden.value = val || '';
    };
    cg.querySelectorAll('.pillcheck').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const active = btn.getAttribute('aria-checked')==='true';
        setVal(active ? '' : btn.dataset.val);
        scope.dispatchEvent(new CustomEvent('cg-change',{detail:{name,value:hidden?.value}}));
      });
    });
    if(hidden && hidden.value) setVal(hidden.value);
  });
}

/* ===== Matriz (misma escala) ===== */
function makeMatrix(prefix, rows, options, names){
  const cols = options.length;
  const hdr = ['<div class="hdr"></div>']
    .concat(options.map(o=>`<div class="hdr">${o}</div>`)).join('');
  const body = rows.map((label, idx)=>{
    const fieldName = (names && names[idx]) ? names[idx] : `${prefix}_${idx+1}`;
    const cg = `
      <div class="checkgroup" data-name="${fieldName}" data-matrix="1" style="--cols:${cols}">
        ${options.map(v=>`<button type="button" class="pillcheck" data-val="${v}" aria-checked="false">${v}</button>`).join('')}
      </div>
      <input type="hidden" name="${fieldName}">
    `;
    return `
      <div class="matrix-row">
        <div class="matrix-cell"><label class="text-sm">${label}</label></div>
        <div class="matrix-cell" style="grid-column: 2 / span ${cols}">${cg}</div>
      </div>`;
  }).join('');
  return `
    <div class="matrix-wrap">
      <div class="matrix-grid" style="--cols:${cols}">
        ${hdr}${body}
      </div>
    </div>`;
}

/* ===== Matriz compuesta para C2/C3 en mobile =====
   - 1ª submatriz: ¿Hay? (Sí/No)  -> 2 columnas
   - 2ª submatriz: Calidad        -> 5 columnas
   Total columnas: 7 (scroll horizontal en móviles)
*/
function makeServicesMatrix(servicios, calidades){
  const colsHay = 2;
  const colsCal = calidades.length;      // normalmente 5
  const totalCols = colsHay + colsCal;   // 7

  const hdr = ['<div class="hdr"></div>']                     // hueco del label
    .concat(['Sí','No'].map(o=>`<div class="hdr">¿Hay? ${o}</div>`))
    .concat(calidades.map(o=>`<div class="hdr">${o}</div>`))
    .join('');

  const body = servicios.map((s, idx)=>{
    const cgHay = `
      <div class="checkgroup" data-name="C2_${idx}_hay" data-matrix="1" style="--cols:${colsHay}">
        ${['Sí','No'].map(v=>`<button type="button" class="pillcheck" data-val="${v}" aria-checked="false">${v}</button>`).join('')}
      </div>
      <input type="hidden" name="C2_${idx}_hay">
    `;
    const cgCal = `
      <div class="checkgroup" data-name="C3_${idx}_calidad" data-matrix="1" style="--cols:${colsCal}">
        ${calidades.map(v=>`<button type="button" class="pillcheck" data-val="${v}" aria-checked="false">${v}</button>`).join('')}
      </div>
      <input type="hidden" name="C3_${idx}_calidad">
    `;
    return `
      <div class="matrix-row">
        <div class="matrix-cell"><label class="text-sm">${s}</label></div>
        <div class="matrix-cell" style="grid-column: auto / span ${colsHay}">${cgHay}</div>
        <div class="matrix-cell" style="grid-column: auto / span ${colsCal}">${cgCal}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="matrix-wrap">
      <!-- puedes ajustar --label-min / --col-min si quieres aún más aire -->
      <div class="matrix-grid" style="--cols:${totalCols}; --label-min: 220px; --col-min: 90px">
        ${hdr}${body}
      </div>
    </div>
  `;
}


/* ====== D2–D4 habilitar campos ====== */
function initMediaRows(){
  ['D2_radio','D3_tv','D4_per'].forEach(k=>{
    const sel  = document.querySelector(`[name="${k}_si"]`);
    const cual = document.querySelector(`[name="${k}_cual"]`);
    const hora = document.querySelector(`[name="${k}_horario"]`);
    if(!sel) return;
    const sync = ()=>{
      const yes = sel.value.toLowerCase().startsWith('sí') || sel.value==='Sí';
      cual.disabled = !yes; hora.disabled = !yes;
      if(!yes){ cual.value=''; hora.value=''; }
    };
    sel.addEventListener('change', sync);
    sync();
  });
}

/* ====== C2 -> C3 sync (si NO hay, desactiva calidad y NO valida) ====== */
function initServiciosSync(scope=document){
  const servicios = Array.from({length:15},(_,i)=>i);
  const onChange = ()=>{
    servicios.forEach(i=>{
      const hay = scope.querySelector(`input[name="C2_${i}_hay"]`)?.value || '';
      const cg = scope.querySelector(`[data-name="C3_${i}_calidad"]`);
      const hidden = scope.querySelector(`input[name="C3_${i}_calidad"]`);
      if(!cg || !hidden) return;
      const disable = (hay!=='Sí' && hay!=='1' && hay!=='Sí ');
      cg.setAttribute('aria-disabled', disable?'true':'false');
      hidden.disabled = disable;           // clave: no exigir cuando NO hay
      if(disable){
        hidden.value='';
        cg.querySelectorAll('.pillcheck').forEach(b=>b.setAttribute('aria-checked','false'));
      }
    });
  };
  scope.addEventListener('cg-change', onChange);
  onChange();
}

/* =================== Modal Encuesta =================== */
const dlg = $('#dlgEncuesta');
const btnClose = document.getElementById('btnClose');

function formDirty(){
  const encBody = $('#encBody');
  if(!encBody) return false;
  return namedControls(encBody).some(el => controlHasValue(el));
}

btnClose?.addEventListener('click', (e)=>{
  e.preventDefault();
  if(!formDirty()){ dlg.close(); return; }
  const ok = confirm('Hay respuestas capturadas. ¿Deseas cerrar y perder lo contestado?');
  if(ok) dlg.close();
});
dlg.addEventListener('cancel', (e)=> e.preventDefault());
const dlgForm = $('#dlgForm');
dlgForm?.addEventListener('submit', (e)=> e.preventDefault());
dlgForm?.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' && e.target && e.target.tagName !== 'TEXTAREA'){
    e.preventDefault();
  }
});
$('#btnLevantar')?.addEventListener('click', ()=>{
  buildSurvey();
  dlg.showModal();
});

/* Tabs */
const BLOQUES = [
  { id:'A', titulo:'A) Conexión y Sentimiento' },
  { id:'B', titulo:'B) Necesidades Ciudadanas' },
  { id:'C', titulo:'C) Servicios y Gobierno' },
  { id:'D', titulo:'D) Comunicación y Participación' },
  { id:'E', titulo:'E) Economía y Seguridad' },
  { id:'F', titulo:'F) Salud' },
  { id:'G', titulo:'G) Vivienda' },
  { id:'H', titulo:'H) Desigualdad y Opiniones' }
];

/* === Secciones === */
function htmlA(){
  return `
  <div class="qgrid qcols-2">
    <div>
      <label class="block text-sm font-medium mb-1">Calle, colonia / comunidad</label>
      <input name="seccion" class="form-input w-full">
    </div>
    <div>
      <label class="block text-sm font-medium mb-1">Fecha</label>
      <input name="fecha" type="date" class="form-input w-full" value="${todayStr()}">
    </div>

    <div class="col-span-2">
      <h4 class="font-semibold mt-2 mb-1">CONEXIÓN Y SENTIMIENTO COMUNITARIO</h4>
      <p class="text-sm font-medium mb-1">A1. Antes que nada, nos gustaría saber, ¿qué es lo que más le gusta o le hace sentir orgullo de vivir aquí en su colonia? (Pregunta abierta)</p>
      <textarea name="A1_orgullo" rows="3" class="form-textarea w-full" data-optional="true"></textarea>
    </div>

    <div class="col-span-2">
      <p class="text-sm font-medium mb-1">A2. Ahora, pensando en el último año, ¿usted diría que la vida en su colonia ha mejorado, sigue igual o ha empeorado?</p>
      ${makeCheckGroup('A2_balance',['Ha mejorado','Sigue igual','Ha empeorado','Ns / Nc'])}
    </div>

    <div class="col-span-2">
      <p class="text-sm font-medium mb-1">A3. En general, ¿qué tan satisfecho o insatisfecho se siente con las condiciones de vida en su colonia?</p>
      ${makeCheckGroup('A3_satisfaccion',['Muy Satisfecho','Algo Satisfecho','Algo insatisfecho','Muy insatisfecho','Ns / Nc'])}
    </div>
  </div>`;
}

function htmlB(){
  return `
  <div class="qgrid">
    <h4 class="font-semibold mt-2">B. NECESIDADES CIUDADANAS.</h4>

    <div>
      <p class="text-sm font-medium mb-1">B1. Por favor, mencione por orden de importancia los tres principales problemas que usted cree hoy padece en su municipio.</p>
      <div class="qgrid qcols-3">
        <input name="B1_p1" class="form-input" placeholder="1">
        <input name="B1_p2" class="form-input" placeholder="2">
        <input name="B1_p3" class="form-input" placeholder="3">
      </div>
    </div>

    <div>
      <p class="text-sm font-medium mb-1">B2. De estos problemas que mencionó, ¿cuál es el que más le afecta a usted y a su familia en su día a día? Por favor, cuénteme un poco más sobre eso. (Pregunta abierta)</p>
      <textarea name="B2_mas_afecta" rows="3" class="form-textarea w-full" data-optional="true"></textarea>
    </div>

    <div>
      <p class="text-sm font-medium mb-1">B3. ¿Qué tanto cree usted que su Gobierno Municipal podrá resolver los problemas antes mencionados?</p>
      ${makeCheckGroup('B3_resolver',['1. Totalmente','2.  La mayoría','3. Algunos','4. Unos pocos','5. Ninguno','99. Ns / Nc'])}
    </div>

    <div>
      <p class="text-sm font-medium mb-1">B4. ¿En general está ud. satisfecho o insatisfecho con las condiciones de vida en su localidad o colonia?</p>
      ${makeCheckGroup('B4_satisf_local',['1. Muy Satisfecho','2. Algo Satisfecho','3. Algo insatisfecho','4. Muy insatisfecho','99. Ns / Nc'])}
    </div>

    <div>
      <p class="text-sm font-medium mb-1">B5. Si el Presidente Municipal pudiera hacer una sola cosa para mejorar la vida aquí en su colonia, ¿qué sería lo más importante para usted? (Pregunta abierta)</p>
      <textarea name="B5_una_cosa" rows="2" class="form-textarea w-full" data-optional="true"></textarea>
    </div>

    <div>
      <p class="text-sm font-medium mb-1">B6. Y pensando en una obra grande para todo el municipio, ¿cuál sería la obra de infraestructura más necesaria? (Pregunta abierta)</p>
      <textarea name="B6_obra" rows="2" class="form-textarea w-full" data-optional="true"></textarea>
    </div>
  </div>`;
}

/* C */
function htmlC(){
  const temas = [
    '1. Pobreza','2. Desempleo','3. Narcotráfico','4. Aumento de precios','5. Inseguridad','6. Escasez de agua',
    '7. Corrupción','8. Calidad educativa','9. Servicios de salud','10. Bajos salarios',
    '11. Falta de castigo a delincuentes','12. Ninguno','13. Otro:','14. Ns/Nc'
  ];
  const servicios = [
    'A7.1 Calles pavimentadas','A7.2 Agua potable','A7.3 Drenaje','A7.4 Alumbrado público','A7.5 Transporte público',
    'A7.6 Recolección de basura','A7.7 Alcantarillado','A7.8 Caminos y carreteras','A7.9 Farmacias',
    'A7.10 Escuelas públicas','A7.11 Parques y jardines','A7.12 Deportivos','A7.13 Módulo de seguridad',
    'A7.14 Patrullaje','A7.15 Clínica o centro de salud'
  ];
  const calidades = ['Muy buena','Buena','Mala','Muy mala','Ns/Nc'];

  return `
  <div class="qgrid">
    <h4 class="font-semibold mt-2">C. EVALUACIÓN DE SERVICIOS Y GOBIERNO.</h4>

    <div>
      <p class="text-sm font-medium mb-1">C1. De los siguientes temas, ¿cuáles es el que más le preocupa?</p>
      ${makeCheckGroup('C1_preocupa',temas)}
    </div>

    <div class="mt-1">
      <p class="text-sm font-semibold mb-2">
        C2. ¿En su colonia / comunidad hay…?<br>
        C3. ¿Y cómo evaluaría la calidad de los mismos … (leer opciones una a una)? (Encuestador: evaluar el servicio sólo si dice que Sí)
      </p>

      <!-- Desktop -->
      <div id="services-desktop" class="table-wrap hidden md:block">
        <div class="services-table">
          <div class="hdr">Leer y rotar opciones</div>
          <div class="hdr">Sí / No</div>
          <div class="hdr">Muy buena • Buena • Mala • Muy mala • Ns/Nc</div>
          ${servicios.map((s,idx)=>`
            <div class="services-row">
              <div class="services-cell"><label class="text-sm">${s}</label></div>
              <div class="services-cell">
                ${makeCheckGroup(`C2_${idx}_hay`,['Sí','No'])}
              </div>
              <div class="services-cell">
                ${makeCheckGroup(`C3_${idx}_calidad`,calidades)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Mobile -->
      <div id="services-mobile" class="md:hidden">
        ${makeServicesMatrix(servicios, calidades)}
        </div>
    </div>

    <div>
      <p class="text-sm font-medium mb-1">C4. De todos estos servicios, ¿cuál es el que necesita atención más urgente en su colonia? (Pregunta abierta) — 99. Ns/Nc</p>
      <textarea name="C4_urgente" rows="2" class="form-textarea w-full" data-optional="true"></textarea>
    </div>

    <div class="qgrid">
      <p class="text-sm font-medium mb-1">C5. ¿Usted aprueba o desaprueba la forma en que el presidente municipal está haciendo su trabajo?</p>
      ${makeCheckGroup('C5_aprobacion',['Aprueba mucho','Aprueba algo','Desaprueba algo','Desaprueba mucho','Ns/Nc'])}

      <p class="text-sm font-medium mb-1 mt-2">C6. ¿Qué tan cercano o lejano siente usted al presidente municipal de los problemas de la gente como usted?</p>
      ${makeCheckGroup('C6_cercania',['Muy cercano','Cercano','Lejano','Muy lejano','Ns/Nc'])}

      <p class="text-sm font-medium mb-1 mt-2">C7. ¿Y qué tanta confianza le genera el cabildo municipal, es decir, los síndicos y regidores?</p>
      ${makeCheckGroup('C7_cabildo',['Mucha','Algo','Poca','Ninguna','Ns/Nc'])}
    </div>

    <div class="mt-2">
      <p class="text-sm font-medium mb-1">
        C8. ¿Qué tanta confianza le inspiran los siguientes actores en su municipio?
      </p>
      ${makeMatrix(
        'C8',
        ['Líderes de barrio o colonia','Comerciantes y empresarios locales','Maestros y directores de escuela','Asociaciones vecinales'],
        ['Mucha','Algo','Poca','Ninguna','Ns/Nc'],
        ['C8_0','C8_1','C8_2','C8_3']
      )}
    </div>`;
}

/* D */
function htmlD(){
  return `
  <div class="qgrid">
    <h4 class="font-semibold mt-2">D. COMUNICACIÓN Y PARTICIPACIÓN CIUDADANA</h4>

    <div>
      <p class="text-sm font-medium mb-1">D1. ¿Por qué medio se entera usted principalmente de lo que sucede en su municipio y/o Estado?</p>
      ${makeCheckGroup('D1_medio',['1. Rumores','2. Periódico','3. Radio','4. TV','5. Redes Sociales','6. Mensaje de texto o WhastApp','7. Internet','8. Otro','99. Ns / Nc'])}
    </div>

    ${[
      {k:'D2_radio', t:'D2. ¿Usted escucha la radio?'},
      {k:'D3_tv',    t:'D3. ¿Usted ve la TV?'},
      {k:'D4_per',   t:'D4. ¿¿Usted lee el periódico?'}
    ].map(cfg=>`
      <fieldset class="border border-borde rounded-xl p-3">
        <legend class="text-sm font-semibold">${cfg.t}</legend>
        <div class="qgrid qcols-3">
          <select name="${cfg.k}_si" class="form-select">
            <option value="">Si/No</option><option>Sí</option><option>No</option>
          </select>
          <input name="${cfg.k}_cual" class="form-input" placeholder="¿Cuál estación / canal / periódico?" data-optional="true">
          <select name="${cfg.k}_horario" class="form-select">
            <option value="">Horario</option><option>Mañana</option><option>Tarde</option><option>Noche</option>
          </select>
        </div>
      </fieldset>
    `).join('')}

    <fieldset class="border border-borde rounded-xl p-3">
      <legend class="text-sm font-semibold">D5. A continuación le mencionaré algunas redes sociales, ¿me puede decir si la utiliza?</legend>
      ${makeMatrix(
        'D5',
        ['Twitter','WhatsApp','Instagram','Youtube','Facebook','TikTok'],
        ['1.Si','2.No'],
        ['D5_twitter','D5_whatsapp','D5_instagram','D5_youtube','D5_facebook','D5_tiktok']
      )}
    </fieldset>

    <div>
      <p class="text-sm font-medium mb-1">D6. Pensando en la forma en que a usted le gusta enterarse de las cosas, si el gobierno municipal quisiera informarle algo importante sobre su colonia de una forma que usted le crea, ¿cuál sería la mejor manera? (Pregunta abierta)</p>
      <textarea name="D6_mejor_modo" rows="2" class="form-textarea w-full" data-optional="true"></textarea>
    </div>

    <div class="qgrid qcols-2">
      <div>
        <p class="text-sm font-medium mb-1">D3. ¿Qué tan dispuesto estaría a participar en actividades para mejorar su colonia, como jornadas de limpieza o comités vecinales, si el gobierno municipal las organizara?</p>
        ${makeCheckGroup('D3_dispuesto',['Muy dispuesto','Algo dispuesto','Poco dispuesto','Nada dispuesto','Ns/Nc'])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">D5. ¿Usted considera que el gobierno municipal es…?</p>
        ${makeCheckGroup('D5_transparencia',['Muy transparente','Algo transparente','Poco transparente','Nada transparente','Ns/Nc'])}
      </div>
    </div>

    <div>
      <p class="text-sm font-medium mb-1">D4. ¿Qué tipo de actividad o proyecto haría que usted se animara más a participar junto con sus vecinos? (Pregunta abierta)</p>
      <textarea name="D4_proyecto" rows="2" class="form-textarea w-full" data-optional="true"></textarea>
    </div>
  </div>`;
}

/* E */
function htmlE(){
  return `
  <div class="qgrid">
    <h4 class="font-semibold mt-2">E. PERCEPCIÓN GENERAL (ECONOMÍA Y SEGURIDAD)</h4>

    <fieldset class="border border-borde rounded-xl p-3">
      <legend class="text-sm font-semibold">E1. DATOS SOCIOECONÓMICOS</legend>
      <div class="qgrid">
        <p class="text-sm font-medium mb-1">E1.1. Género</p>
        ${makeCheckGroup('E1_genero',['1. Mujer','2. Hombre'])}

        <p class="text-sm font-medium mb-1 mt-2">B2. Zona</p>
        ${makeCheckGroup('E1_zona',['1. Urbana','2. Rural'])}

        <p class="text-sm font-medium mb-1 mt-2">E1.2. Edad</p>
        ${makeCheckGroup('E1_edad',['1. 18 a 25','2. 26 a 35','3. 36 a 45','4. 46 a 55','6. 56 o más'])}

        <p class="text-sm font-medium mb-1 mt-2">E1.3 Escolaridad</p>
        ${makeCheckGroup('E1_escolaridad',[
          '0. Sin instrucción','1. Primaria sin terminar','2. Primaria','3.Secundaria sin terminar','4.Secundiaria',
          '5.Preparatoria sin terminar','6.Preparatoria','7.Universidad sin terminar','8.Universidad / Postgrado','99.  Ns/Nc'
        ])}

        <p class="text-sm font-medium mb-1 mt-2">E1.4 Ocupación</p>
        ${makeCheckGroup('E1_ocupacion',[
          '1. Trabajador de gobierno','2. Trabajador sector privado','3. Trabajo por cuenta propia','4. Trabajo tiempo parcial',
          '5.Estudiante','6. Ama de casa','7.Desempleado','8. Campesino','10. Otro','99. Ns/Nc'
        ])}

        <p class="text-sm font-medium mb-1 mt-2">E1.5 Más o menos ¿Cuánto ganan todos los que trabajan en su familia al mes?</p>
        ${makeCheckGroup('E1_ingreso',['1. Menos de $7,000','2. $7,001 - $14,000','3.  $14,001 - $21,000','4. más de $21,001','5. Variable'])}

        <p class="text-sm font-medium mb-1 mt-2">E1.6. Se considera una persona indígena</p>
        ${makeCheckGroup('E1_indigena',['1. No','2. Si, totalmente','3. Si, parcialmente','99. Ns/Nc'])}

        <p class="text-sm font-medium mb-1 mt-2">E1.7 Habla alguna lengua indígena</p>
        ${makeCheckGroup('E1_lengua',['1. Si','2. No'])}
      </div>
    </fieldset>

    <p class="text-sm font-medium mb-1 mt-2">E2. Comparada con hace un año, ¿la situación económica de su familia mejoró, sigue igual o empeoró?</p>
    ${makeCheckGroup('E2_sitfam',['Mejoró','Sigue igual','Empeoró','Ns/Nc'])}

    <div class="qgrid qcols-2">
      <div>
        <p class="text-sm font-medium mb-1">E3. ¿Considera que el ingreso que percibe su familia es suficiente o es insuficiente para cubrir sus necesidades básicas?</p>
        ${makeCheckGroup('E3_suf',['1.Suficiente','2. Insuficiente'])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">E3.1 ¿Por qué?</p>
        <textarea name="E3_razon" rows="2" class="form-textarea w-full" data-optional="true"></textarea>
      </div>
    </div>

    <div class="qgrid qcols-2">
      <div>
        <p class="text-sm font-medium mb-1">E4. En general, de aquí a un año, ¿diría que la situación económica de usted y su familia va a mejorar  o va a empeorar?</p>
        ${makeCheckGroup('E4_pers',['1. Mejorar','2. Seguir igual de bien','3. Seguir igual de mal','4. Empeorar','99. Ns/Nc'])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">E5. En general, de aquí a un año, ¿diría usted que la situación económica del municipio va a mejorar o va a empeorar?</p>
        ${makeCheckGroup('E5_mpio',['1. Mejorar','2. Seguir igual de bien','3. Seguir igual de mal','4. Empeorar','99. Ns/Nc'])}
      </div>
    </div>

    <div class="qgrid qcols-3">
      <div>
        <p class="text-sm font-medium mb-1">E6. ¿Tiene familiares en el extranjero que le envíen remesas?</p>
        ${makeCheckGroup('E6_rem',['1.Si','2.No','99.Ns/Nc'])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">E6.1 En caso de ser afirmativo. ¿Qué tan importante es la remesa que usted recibe en los ingresos de su hogar?</p>
        ${makeCheckGroup('E6_import',['1. Mucho','2. Poco','3. Es un extra','99. Ns/Nc'])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">E7. ¿Usted es originario del municipio o proviene de otro municipio o estado? ¿Cuál?</p>
        ${makeCheckGroup('E7_ori',['1.Originario','2.Otro ¿Cual?'])}
      </div>
    </div>
    <input name="E7_cual" class="form-input w-full" placeholder="Si respondió ‘2.Otro ¿Cuál?’, especifique" data-optional="true">

    <div class="qgrid qcols-2">
      <div>
        <p class="text-sm font-medium mb-1">E8. Ahora hablemos sobre la situación de empleo en el municipio. De lo que sabe o ha oído, ¿qué tan difícil diría usted que es conseguir trabajo en aquí en este momento: mucho, algo, poco o nada?</p>
        ${makeCheckGroup('E8_trabajo',['1. Mucho','2. Algo','3. Poco','4. Nada','99. Ns/Nc'])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">E9. ¿Tiene usted trabajo en este momento?</p>
        ${makeCheckGroup('E9_tiene',['1.Si','2.No'])}
      </div>
    </div>

    <div class="qgrid qcols-2">
      <div>
        <p class="text-sm font-medium mb-1">E9.2 ¿Está buscando?</p>
        ${makeCheckGroup('E9_busca',['1. Si','2. No','99.Ns/Nc'])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">E10. En el último año, ¿usted cree que la delincuencia en su colonia ha aumentado, disminuido o seguido igual?</p>
        ${makeCheckGroup('E10_delito',['Ha aumentado','Ha permanecido igual','Ha disminuido','Ns / Nc'])}
      </div>
    </div>

    ${makeMatrix(
      'E11',
      ['E11.1 En el Estado','E11.2 En su municipio','E11.3 En su colonia o comunidad','E11.4 En su calle'],
      ['Muy seguro','Seguro','Inseguro','Muy inseguro','Ns/Nc'],
      ['E11_estado','E11_mpio','E11_col','E11_calle']
    )}

    <div class="qgrid qcols-3">
      <div>
        <p class="text-sm font-medium mb-1">E12. En los últimos seis meses, ¿usted ha sido víctima de algún delito? / En caso afirmativo ¿qué delito?</p>
        ${makeCheckGroup('E12_victima',['1. Si','2. No'])}
      </div>
      <input name="E12_cual" class="form-input" placeholder="F3.2. ¿Cuál?  —  99. Ns / Nc" data-optional="true">
      <div>
        <p class="text-sm font-medium mb-1">E13 ¿Lo denunció ante las autoridades?</p>
        ${makeCheckGroup('E13_denuncio',['1. Si','2. No','99. Ns / Nc'])}
      </div>
    </div>

    <div class="qgrid qcols-3">
      <div>
        <p class="text-sm font-medium mb-1">E14. En su opinión, la mayoría de los delitos que suceden en esta zona, ¿son cometidos por el crimen organizado o por la delincuencia común?</p>
        ${makeCheckGroup('E14_quien',['1. C. Organizado','2. D. Común','3. Ambos','99. Ns / Nc'])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">E15. ¿Hasta qué grado usted y su familia se sienten amenazados por la inseguridad?</p>
        ${makeCheckGroup('E15_amenaza',['1. Seriamente amenazados','2. Algo amenazados','3. Poco amenazados','4. No se sienten amenazados','5. Otro','99. Ns/Nc'])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">E16. De los siguientes delitos ¿cuál es el que usted percibe como el más cercano?</p>
        ${makeCheckGroup('E16_cercano',[
          '1. Robo en calle, casa habitación, vehículo o negocio.','2. Comercialización y consumo de drogas.',
          '3. Consumo de alcohol.','4. Pandillerismo.','5. Extorsiones.','99. Ns/Nc'
        ])}
      </div>
    </div>
  </div>`;
}

/* F */
function htmlF(){
  return `
  <div class="qgrid">
    <h4 class="font-semibold mt-2">F. PERCEPCIÓN DE SALUD</h4>

    <div class="qgrid qcols-3">
      <div>
        <p class="text-sm font-medium mb-1">F1. ¿Está afiliado a un sistema de salud pública? ¿A cuál?</p>
        ${makeCheckGroup('F1_afiliado',['1. Si','2. No'])}
      </div>
      <input name="F1_cual" class="form-input" placeholder="F5.1 ¿Cuál?" data-optional="true">
    </div>

    <div class="qgrid qcols-2">
      <div>
        <p class="text-sm font-medium mb-1">F2. Pensando en la última vez que tuvo un problema de salud o cuándo enferma ¿A qué servicio de salud acude para su atención ?</p>
        ${makeCheckGroup('F2_serv',[
          '1. Ambulatorio/clínica popular/','2. Hospital público o del Seguro Social',
          '3. Servicio privado sin hospitalización','4. Clínica privada','5. Centro de salud privado sin fines de lucro',
          '6. Servicio médico en el lugar de trabajo','7. Farmacia','99. Ns/Nc'
        ])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">F2.1 ¿Cómo califica la atención que recibió?</p>
        ${makeCheckGroup('F2_calif',['1. Muy buena','2. Buena','3. Mala','4. Muy mala','99. Ns/Nc'])}
      </div>
    </div>

    <div class="qgrid qcols-2">
      <div>
        <p class="text-sm font-medium mb-1">F3. ¿Hay un centro de salud cerca de donde usted vive?</p>
        ${makeCheckGroup('F3_cerca',['1. Si','2. No'])}
      </div>
      <input name="F3_cual" class="form-input" placeholder="G3.1 ¿Cuál?" data-optional="true">
    </div>

    <div>
      <p class="text-sm font-medium mb-1">F4. Ahora le pido que piense en la última vez que fue al médico y que se le recetó algún medicamento, ¿cómo obtuvo los medicamentos?</p>
      ${makeCheckGroup('F4_meds',[
        '1. Los recibió todos gratis','2. Recibió algunos gratis y otros los compró','3. Los compró todos','4. Compró algunos',
        '5. Recibió algunos gratis y los otros no pudo comprarlos','6. No pudo obtener ninguno','99. Ns/Nc'
      ])}
    </div>

    <div>
      <p class="text-sm font-medium mb-1">F5. ¿Considera usted que el ingreso de su hogar es suficiente para la compra de alimentos/ comida para consumir dentro y fuera del hogar?</p>
      ${makeCheckGroup('F5_suf_alim',['1. Si','2. No','99. Ns/Nc'])}
    </div>

    <fieldset class="border border-borde rounded-xl p-3">
      <legend class="text-sm font-semibold">F6. Durante el último mes, por falta de dinero… (Sí/No/Ns/Nc)</legend>
      ${makeMatrix('F6', [
        'F6.1 Usted se preocupó porque los alimentos se acabarán en su hogar',
        'F6.2 En su hogar se quedaron sin alimentos',
        'F6.3 En su hogar dejaron de tener una alimentación saludable',
        'F6.4 En su hogar dejó de desayunar, almorzar o cenar',
        'F6.5 En su hogar comió menos de lo que debía comer',
        'F6.6 En su hogar sintió hambre pero no comió',
        'F6.7 En su hogar alguien comió una vez al día, o dejó de comer durante el día'
      ], ['Sí','No','Ns/Nc'])}
    </fieldset>

    <div>
      <p class="text-sm font-medium mb-1">F7. Ahora, dígame, ¿acostumbran a desayunar los integrantes menores de 12 años de este hogar? (Leer opciones)</p>
      ${makeCheckGroup('F7_desayuno',[
        '1. Si, en el hogar','2. Si, con algún familiar en su casa','3. Si, en la escuela o estancia','4. No','5. No hay menores de 12 años','99. Ns/Nc'
      ])}
    </div>
  </div>`;
}

/* G */
function htmlG(){
  return `
  <div class="qgrid">
    <h4 class="font-semibold mt-2">G. VIVIENDA</h4>

    <div>
      <p class="text-sm font-medium mb-1">G1. ¿Usted vive en casa?</p>
      ${makeCheckGroup('G1_vive',['1. Propia.','2. Prestada.','3. Rentada.','4. Hipotecada / la esta pagando a crédito.','5. Compartida con otra familia o familiar.','6. Otro.'])}
    </div>

    <div class="qgrid qcols-2">
      <div>
        <p class="text-sm font-medium mb-1">G2. Sin tomar en cuenta la conexión móvil que pudiera tener desde algún celular ¿este hogar cuenta con internet?</p>
        ${makeCheckGroup('G2_internet',['1. No tiene','2. Si tiene'])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">G3. De todas las personas de 14 años o más que viven en el hogar, ¿cuántas trabajaron en el último mes?</p>
        ${makeCheckGroup('G3_trabajan',['1. Cero','2. Una','3. Dos','4. Tres','5. Cuatro o más'])}
      </div>
    </div>

    <div class="qgrid qcols-2">
      <div>
        <p class="text-sm font-medium mb-1">G4. ¿El piso de su hogar es predominantemente de tierra o de cemento o de algún otro tipo de acabado?</p>
        ${makeCheckGroup('G4_piso',['1. Tierra o cemento','2.Otro tipo de material o acabado'])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">G5. En su vivienda tienen…</p>
        ${makeCheckGroup('G5_agua',[
          '1. Agua entubada dentro de la vivienda','2. Agua entubada fuera de la vivienda, pero dentro del terreno',
          '3. Agua entubada de la llave pública (o hidrante)','4. Agua entubada que acarrean de otra vivienda',
          '5. Agua de pipa','6. Agua de un pozo, río, lago, arroyo','7. Agua captada de lluvia u otro medio','99. Ns/Nc'
        ])}
      </div>
    </div>

    <div>
      <p class="text-sm font-medium mb-1">G6. En caso de tener agua entubada dentro de la vivienda, cuenta con ella todos los días, casi todos los días o solo algunos días a la semana?</p>
      ${makeCheckGroup('G6_frec',['1. Todos los días','2. Casi todos los días','3. Solo algunos días a la semana','99. Ns/Nc'])}
    </div>

    <div class="qgrid qcols-2">
      <div>
        <p class="text-sm font-medium mb-1">G7. En su vivienda, ¿qué hacen con la basura?</p>
        ${makeCheckGroup('G7_basura',[
          '1. La tiran en un contenedor, la recoge un camión o carrito de basura','2. La queman ',
          '3. La entierran','4. La tiran en el basurero público','5. La tiran en un terreno baldío o en la calle',
          '6. La tiran al río, lago, mar o barranca','7. Otro ','99. Ns/Nc'
        ])}
      </div>
      <div>
        <p class="text-sm font-medium mb-1">G8. ¿En caso de que la basura la recoja el camión o carrito de basura, con qué frecuencia pasa el camión?</p>
        ${makeCheckGroup('G8_frec',['1. Diaria','2. Dos o tres veces por semana','3. Una vez por semana','4. Menos de una vez por semana','99. Ns/Nc'])}
      </div>
    </div>

    <div>
      <p class="text-sm font-medium mb-1">G9. Desayuno de menores de 12 años</p>
      ${makeCheckGroup('G9_desayuno',['1. Si, en el hogar','2. Si, con algún familiar en su casa','3. Si, en la escuela o estancia','4. No ','5. No hay menores de 12 años','99. Ns/Nc'])}
    </div>
  </div>`;
}

/* H */
function htmlH(){
  return `
  <div class="qgrid">
    <h4 class="font-semibold mt-2">H. DISTRIBUCIÓN DE LA RIQUEZA</h4>

    <div>
      <p class="text-sm font-medium mb-1">H1. Según su opinión, ¿qué tanta desigualdad … (leer opciones una a una) considera usted que existe entre los habitantes del municipio?</p>
      <div class="qgrid qcols-2">
        <div>
          <label class="text-sm">H1.1 social</label>
          ${makeCheckGroup('H1_social',['Mucha','Algo','Poco','Nada','Ns/Nc'])}
        </div>
        <div>
          <label class="text-sm">H1.2 del ingreso</label>
          ${makeCheckGroup('H1_ingreso',['Mucha','Algo','Poco','Nada','Ns/Nc'])}
        </div>
      </div>
    </div>

    <div>
      <p class="text-sm font-medium mb-1">H2. ¿Qué tan desigual es el acceso de los mineralenses a...?</p>
      ${makeMatrix(
        'H2',
        ['H2.1 a la justicia','H2.2 a la salud','H2.3 a la educación','H2.4 al trabajo','H2.5 a las oportunidades'],
        ['Muy desigual','Desigual','Poco desigual','Nada desigual','Ns/Nc'],
        ['H2_just','H2_salud','H2_edu','H2_trab','H2_op']
      )}
    </div>

    <div>
      <p class="text-sm font-medium mb-1">H3. Según su opinión, ¿qué tan grave es la desigualdad en el municipio entre…?</p>
      ${makeMatrix(
        'H3',
        [
          'H3.1 ricos y pobres',
          'H3.2 adultos mayores y jóvenes',
          'H3.3 hombres y mujeres (género)',
          'H3.4 por color de piel',
          'H3.5 por preferencias sexuales',
          'H3.6 personas con bajo nivel educativo',
          'H3.7 personas indígenas',
          'H3.8 entre ciudades y zonas rurales',
          'H3.9 entre Pachuca y el resto de los municipios'
        ],
        ['Muy grave','Poco grave','Nada grave','Ns/Nc'],
        ['H3_1','H3_2','H3_3','H3_4','H3_5','H3_6','H3_7','H3_8','H3_9']
      )}
    </div>

    <div>
      <p class="text-sm font-medium mb-1">H4. ¿Qué tan grandes considera usted que son las diferencias de ingreso entre las personas habitantes del municipio, diría que muy grandes, grandes, algo grandes, no tan grandes?</p>
      ${makeCheckGroup('H4_dif',['1. Muy grandes','2. Algo grandes','3. No tan grandes','99. Ns/Nc'])}
    </div>

    <div>
      <p class="text-sm font-medium mb-1">H5. ¿Qué tan de acuerdo está con las siguientes frases…?</p>
      ${makeMatrix(
        'H5',
        [
          'H5.1 El rol del gobierno es reducir la desigualdad',
          'H5.2 El rol del gobierno es ayudar solo a los pobres',
          'H5.3 El rol del gobierno es ayudar a todos'
        ],
        ['Muy de acuerdo','De acuerdo','En desacuerdo','Muy en desacuerdo','Ns/Nc'],
        ['H5_rol_gob','H5_ayuda_pobres','H5_ayuda_todos']
      )}
    </div>

    <div>
      <p class="text-sm font-medium mb-1">H6. “la sociedad mexicana permite que todos tengan las mismas oportunidades para salir de la pobreza”</p>
      ${makeCheckGroup('H6_iguales_oportunidades',['1. Muy de acuerdo','2. De acuerdo','3. En desacuerdo','4. Muy en desacuerdo','99. Ns/Nc'])}
    </div>

    <div>
      <p class="text-sm font-medium mb-1">H7. “Las personas pobres son pobres porque la sociedad los trata injustamente”</p>
      ${makeCheckGroup('H7_pobres_injusticia',['1. Muy de acuerdo','2. De acuerdo','3. En desacuerdo','4. Muy en desacuerdo','99. Ns/Nc'])}
    </div>

    <div>
      <p class="text-sm font-medium mb-1">H8. “Las personas pobres son pobres porque desaprovechan las oportunidades”</p>
      ${makeCheckGroup('H8_pobres_oportunidades',['1. Muy de acuerdo','2. De acuerdo','3. En desacuerdo','4. Muy en desacuerdo','99. Ns/Nc'])}
    </div>

    <div>
      <p class="text-sm font-medium mb-1">H9. “En México una persona pobre que trabaje duro puede llegar a ser rica”</p>
      ${makeCheckGroup('H9_mito_mov_social',['1. Muy de acuerdo','2. De acuerdo','3. En desacuerdo','4. Muy en desacuerdo','99. Ns/Nc'])}
    </div>
  </div>`;
}

/* ====== Construcción ====== */
let step = 0;
function buildSurvey(){
  step = 0;
  const tabs = $('#encTabs'); const body = $('#encBody');
  tabs.innerHTML = BLOQUES.map((b,i)=>`<button class="tab" data-step="${i}" aria-selected="${i===0?'true':'false'}">${b.id}</button>`).join('');
  body.innerHTML = `
    <section data-step="0">${htmlA()}</section>
    <section data-step="1" hidden>${htmlB()}</section>
    <section data-step="2" hidden>${htmlC()}</section>
    <section data-step="3" hidden>${htmlD()}</section>
    <section data-step="4" hidden>${htmlE()}</section>
    <section data-step="5" hidden>${htmlF()}</section>
    <section data-step="6" hidden>${htmlG()}</section>
    <section data-step="7" hidden>${htmlH()}</section>
  `;
  $$('#encTabs .tab').forEach(btn=>{ btn.onclick = ()=>gotoStep(Number(btn.dataset.step)); });
  updateProgress();

  wireCheckGroups($('#encBody'));
  initMediaRows();
  initServiciosSync($('#encBody'));
  toggleServicesVariant();
  initMobileServicesLogic();
  window.addEventListener('resize', toggleServicesVariant, { passive:true });

  attachValidationListeners($('#encBody'));
  updateButtonsState();
}

function gotoStep(i){
  step = Math.max(0, Math.min(BLOQUES.length-1, i));
  $$('#encBody > section').forEach(s => s.hidden = Number(s.dataset.step)!==step);
  $$('#encTabs .tab').forEach(b => b.setAttribute('aria-selected', String(Number(b.dataset.step)===step)));
  announce('');
  updateProgress();
  updateButtonsState();
}
function updateProgress(){
  const pct = Math.round(((step+1)/BLOQUES.length)*100);
  $('#encProgreso').style.width = pct + '%';
}
$('#btnPrev').addEventListener('click',(e)=>{ e.preventDefault(); gotoStep(step-1); });
$('#btnNext').addEventListener('click',(e)=>{
  e.preventDefault();
  const cur = $('#encBody').querySelector(`section[data-step="${step}"]`);
  if(!isComplete(cur)){
    const miss = missingControls(cur);
    announce(`Faltan ${miss.length} respuestas en este bloque.`);
    if(miss[0]) scrollToControl(miss[0]);
    updateButtonsState();
    return;
  }
  gotoStep(step+1);
});

/* ====== Envío con validación global ====== */
$('#btnEnviar').addEventListener('click', (e)=>{
  e.preventDefault();
  const body = $('#encBody');
  if(!isComplete(body)){
    const miss = missingControls(body);
    announce(`Faltan ${miss.length} respuestas en la encuesta. Revisa los campos marcados.`);
    if(miss[0]) scrollToControl(miss[0]);
    updateButtonsState();
    return;
  }

  const fields = namedControls(body);
  const row = {};
  fields.forEach(el => { row[el.name] = el.value?.trim?.() ?? el.value; });

  const u = currentUser();
  row.id = crypto.randomUUID();
  row.created_at = new Date().toISOString();
  row.censista = u?.username || null;

  const all = load(KEY_FORM); all.push(row); save(KEY_FORM, all);
  dlg.close(); renderPanel(); alert('¡Encuesta registrada!');
});

/* ===== Export CSV ===== */
$('#btnExport')?.addEventListener('click', ()=>{
  const data = load(KEY_FORM);
  if(!data.length){ alert('No hay registros.'); return; }
  const cols = Array.from(data.reduce((s,o)=>{ Object.keys(o).forEach(k=>s.add(k)); return s; }, new Set()));
  const rows = [cols.join(',')].concat(data.map(r => cols.map(c => JSON.stringify(r[c]??'')).join(',')));
  const blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href=url; a.download='encuestas_mr_demo.csv'; a.click(); URL.revokeObjectURL(url);
});

/* ===== Variantes C2/C3 (evitar nombres duplicados) ===== */
function toggleServicesVariant(){
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const desk = document.getElementById('services-desktop');
  const mob  = document.getElementById('services-mobile');

  const rename = (root, enable) => {
    if(!root) return;
    root.querySelectorAll('input[name],select[name]').forEach(el=>{
      if(enable){
        if(el.dataset.origName){ el.name = el.dataset.origName; el.removeAttribute('data-orig-name'); }
      }else{
        if(!el.dataset.origName){ el.dataset.origName = el.name; el.name = el.name + '_off'; }
      }
    });
  };
  if(desk) rename(desk, !isMobile);
  if(mob)  rename(mob,  isMobile);
}

/* En mobile: si ¿Hay? = No, deshabilita "Calidad" */
function initMobileServicesLogic(){
  document.querySelectorAll('#services-mobile .sv-hay').forEach(sel=>{
    const cal = sel.parentElement.querySelector('.sv-cal');
    const sync = ()=>{
      const yes = sel.value === 'Sí';
      cal.disabled = !yes;
      if(!yes) cal.value = '';
    };
    sel.addEventListener('change', sync);
    sync();
  });
}

/* =================== Validación =================== */
function namedControls(scope=document){
  const all = Array.from(scope.querySelectorAll('[name]'));
  return all.filter(el=>{
    const nm = el.name || '';
    if(nm.endsWith('_off')) return false;
    if(el.disabled) return false;
    return true;
  });
}
function controlHasValue(el){
  const v = (el.value ?? '').trim();
  return v !== '';
}
function markInvalid(el, invalid){
  if(invalid){
    el.classList.add('is-invalid');
    const h = ensureHint(el);
    h.textContent = 'Este campo es obligatorio';
  }else{
    el.classList.remove('is-invalid');
    const parent = el.parentElement || el.closest('div');
    const h = parent?.querySelector?.('.err-hint');
    if(h) h.remove();
  }
}
function requiredControls(scope=document){
  return namedControls(scope).filter(el => el.dataset.optional !== 'true');
}
function missingControls(scope=document){
  return requiredControls(scope).filter(el => !controlHasValue(el));
}
/* === Actualiza estado de botones (siguiente / enviar) y etiquetas === */
function updateButtonsState(){
  const body = $('#encBody');
  if(!body) return;

  const curSec  = body.querySelector(`section[data-step="${step}"]`);
  const btnSend = $('#btnEnviar');
  const btnNext = $('#btnNext');

  // Faltantes por bloque y globales
  const missStep = curSec ? missingControls(curSec) : [];
  const missAll  = missingControls(body);

  // Habilitación
  const stepOk = missStep.length === 0;
  const fullOk = missAll.length === 0;

  if(btnNext){
    btnNext.disabled   = !stepOk;
    btnNext.textContent = stepOk ? 'Siguiente' : `Siguiente · ${missStep.length} pendientes`;
    btnNext.title      = stepOk ? '' : 'Completa este bloque para continuar';
  }

  if(btnSend){
    btnSend.disabled   = !fullOk;
    btnSend.textContent = fullOk ? 'Enviar' : `Enviar · ${missAll.length} pendientes`;
    btnSend.title      = fullOk ? '' : 'Completa todas las respuestas para enviar';
  }

  // Si ya está todo completo, limpia el toast
  if(fullOk){ announce(''); }
}

function isComplete(scope){
  const req = requiredControls(scope);
  let ok = true;
  req.forEach(el=>{
    const good = controlHasValue(el);
    markInvalid(el, !good);
    if(!good) ok = false;
  });
  return ok;
}
function attachValidationListeners(scope=document){
  scope.addEventListener('input', updateButtonsState, { passive:true });
  scope.addEventListener('change', updateButtonsState, { passive:true });
  scope.addEventListener('cg-change', updateButtonsState);
}
