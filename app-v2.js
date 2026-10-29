const cfgOk=window.SUPABASE_URL && !window.SUPABASE_URL.startsWith("PEGAR") && window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.startsWith("PEGAR");
const sb=cfgOk?supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY):null;
const tables={
 properties:{label:"Propiedades",table:"properties",fields:[
  ["name","Nombre","text",1],["type","Tipo","select:Apartamento,Casa,Local,Oficina,Bodega,Lote,Finca,Otro",1],["address","Dirección","text"],["city","Ciudad","text"],["area","Área m²","number"],["commercial_value","Valor comercial","number"],["cadastral_id","Cédula catastral","text"],["property_registration","Matrícula inmobiliaria","text"],["status","Estado","select:Arrendada,Disponible,En venta,No disponible"],["notes","Notas","textarea"]]},
 owners:{label:"Propietarios",table:"owners",fields:[["name","Nombre","text",1],["document","Documento","text"],["phone","Teléfono","text"],["email","Correo","email"],["notes","Notas","textarea"]]},
 tenants:{label:"Arrendatarios",table:"tenants",fields:[["name","Nombre","text",1],["document","Documento","text"],["phone","Teléfono","text"],["email","Correo","email"],["notes","Notas","textarea"]]},
 leases:{label:"Arriendos",table:"leases",fields:[["property_id","Propiedad","property",1],["tenant_id","Arrendatario","tenant",1],["start_date","Inicio","date"],["end_date","Fin","date"],["monthly_rent","Canon mensual","number"],["deposit","Depósito","number"],["increase_percent","Incremento %","number"],["status","Estado","select:Vigente,Vencido,Terminado"],["notes","Notas","textarea"]]},
 taxes:{label:"Impuestos",table:"taxes",fields:[["property_id","Propiedad","property",1],["concept","Concepto","text",1],["due_date","Vencimiento","date"],["amount","Valor","number"],["status","Estado","select:Pendiente,Pagado,Vencido"],["notes","Notas","textarea"]]},
 admin:{label:"Administración",table:"administration_fees",fields:[["property_id","Propiedad","property",1],["concept","Concepto","text"],["period","Periodo AAAA-MM","text"],["amount","Valor","number"],["status","Estado","select:Pendiente,Pagado,Vencido"],["notes","Notas","textarea"]]},
 maintenance:{label:"Mantenimiento",table:"maintenance_orders",fields:[["property_id","Propiedad","property",1],["date","Fecha","date"],["category","Categoría","select:Plomería,Eléctrico,Pintura,Carpintería,Aseo,Equipos,Otro"],["description","Descripción","textarea",1],["provider","Proveedor","text"],["cost","Costo","number"],["status","Estado","select:Solicitado,En proceso,Finalizado,Cancelado"],["notes","Notas","textarea"]]},
 payments:{label:"Pagos",table:"payments",fields:[["property_id","Propiedad","property"],["type","Tipo","select:Arriendo,Impuesto,Administración,Mantenimiento,Otro"],["date","Fecha","date"],["concept","Concepto","text"],["amount","Valor","number"],["status","Estado","select:Recibido,Pagado,Anulado"],["notes","Notas","textarea"]]},
 documents:{label:"Documentos",table:"documents",fields:[["property_id","Propiedad","property",1],["category","Categoría","select:Contrato,Predial,Administración,Mantenimiento,Seguro,Escritura,Foto,Otro"],["title","Título","text",1],["expires_on","Vence","date"],["notes","Notas","textarea"]]}
};
const state={view:"dashboard",cache:{properties:[],owners:[],tenants:[]},editing:null};
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const money=v=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(v)||0);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const badge=s=>`<span class="badge ${/pagado|recibido|vigente|finalizado|arrendada/i.test(s)?"success":/pendiente|proceso|disponible/i.test(s)?"warning":/venc|anulado|cancelado/i.test(s)?"danger":""}">${esc(s||"—")}</span>`;
const fmtDate=s=>s?new Date(s+"T00:00:00").toLocaleDateString("es-CO"): "—";

async function init(){
 if(!sb){$("#authScreen").style.display="grid"; $("#authMsg").textContent="Configure config.js con la URL y la clave pública de Supabase para activar la versión multiusuario."; return}
 const {data:{session}}=await sb.auth.getSession(); applySession(session);
 sb.auth.onAuthStateChange((_e,session)=>applySession(session));
}
function applySession(session){
 const logged=!!session;
 $("#authScreen").style.display=logged?"none":"grid"; $("#mainApp").hidden=!logged; $("#sidebar").style.display=logged?"flex":"none";
 if(logged){$("#userEmail").textContent=session.user.email||"";render()}
}
$("#loginForm").onsubmit=async e=>{e.preventDefault();if(!sb)return;msg("Ingresando...");const {error}=await sb.auth.signInWithPassword({email:$("#email").value,password:$("#password").value});if(error)msg(error.message)}
$("#registerBtn").onclick=async()=>{if(!sb)return;const email=$("#email").value,password=$("#password").value;if(!email||password.length<6)return msg("Ingrese correo y una contraseña de al menos 6 caracteres.");const {error}=await sb.auth.signUp({email,password});msg(error?error.message:"Cuenta creada. Revise el correo si Supabase solicita confirmación.")}
$("#logoutBtn").onclick=()=>sb?.auth.signOut();
function msg(t){$("#authMsg").textContent=t}
async function load(table){const {data,error}=await sb.from(table).select("*").order("created_at",{ascending:false});if(error){toast(error.message);return []}return data||[]}
async function preload(){state.cache.properties=await load("properties");state.cache.owners=await load("owners");state.cache.tenants=await load("tenants")}
async function render(){
 await preload(); $("#pageTitle").textContent=state.view==="dashboard"?"Dashboard":tables[state.view]?.label||"Dashboard";
 $$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.view===state.view));
 $("#app").innerHTML=state.view==="dashboard"?dashboard():crud(state.view);
 bind();
}
function dashboard(){
 const p=state.cache.properties;
 const total=p.reduce((a,x)=>a+Number(x.commercial_value||0),0);
 const rents=0; // Se calcula desde la consulta de arriendos.
 return `<div class="grid cards">
 <div class="card"><div class="metric-label">Propiedades</div><div class="metric">${p.length}</div><div class="metric-note">Valor: ${money(total)}</div></div>
 <div class="card"><div class="metric-label">Propietarios</div><div class="metric">${state.cache.owners.length}</div><div class="metric-note">Registrados</div></div>
 <div class="card"><div class="metric-label">Arrendatarios</div><div class="metric">${state.cache.tenants.length}</div><div class="metric-note">Registrados</div></div>
 <div class="card"><div class="metric-label">Estado</div><div class="metric">Centralizado</div><div class="metric-note">Base de datos Supabase</div></div>
 </div>
 <div class="grid dashboard-grid" style="margin-top:18px"><div class="panel"><div class="section-head"><h2>Propiedades recientes</h2><button class="btn secondary" data-goto="properties">Ver todas</button></div>
 <table><thead><tr><th>Propiedad</th><th>Tipo</th><th>Ciudad</th><th>Estado</th><th>Valor</th></tr></thead><tbody>
 ${p.slice(0,8).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.type)}</td><td>${esc(x.city)}</td><td>${badge(x.status)}</td><td>${money(x.commercial_value)}</td></tr>`).join("")||`<tr><td colspan="5" class="empty">No hay propiedades.</td></tr>`}</tbody></table></div>
 <div class="panel"><h2>Próximos módulos</h2><p class="form-note">La V2 deja preparada la autenticación, RLS, propietarios, arrendatarios, inmuebles, contratos, obligaciones, pagos y documentos.</p><div class="kpi-row"><div class="kpi">🔐 Seguridad</div><div class="kpi">☁️ Nube</div><div class="kpi">📄 Documentos</div><div class="kpi">📊 Reportes</div></div></div></div>`;
}
function pretty(k){return ({property_id:"Propiedad",tenant_id:"Arrendatario",name:"Nombre",type:"Tipo",address:"Dirección",city:"Ciudad",area:"Área",commercial_value:"Valor",cadastral_id:"Cédula catastral",property_registration:"Matrícula",owner_id:"Propietario",document:"Documento",phone:"Teléfono",email:"Correo",start_date:"Inicio",end_date:"Fin",monthly_rent:"Canon",deposit:"Depósito",increase_percent:"Incremento",status:"Estado",concept:"Concepto",due_date:"Vencimiento",amount:"Valor",period:"Periodo",date:"Fecha",category:"Categoría",description:"Descripción",provider:"Proveedor",cost:"Costo",title:"Título",expires_on:"Vence",notes:"Notas"}[k]||k)}
function display(k,v){if(k==="property_id")return esc(state.cache.properties.find(x=>x.id===v)?.name||"—");if(k==="tenant_id")return esc(state.cache.tenants.find(x=>x.id===v)?.name||"—");if(["commercial_value","monthly_rent","deposit","amount","cost"].includes(k))return money(v);if(["start_date","end_date","due_date","date","expires_on"].includes(k))return fmtDate(v);if(k==="status")return badge(v);return esc(v)}
function crud(view){
 const cfg=tables[view], rows=state.rows||[];
 // rows loaded synchronously from a cache promise set by bind; placeholder while loading.
 return `<div class="panel"><div class="section-head"><div><h2>${cfg.label}</h2><div class="form-note">Registros en la cuenta actual</div></div><button class="btn primary" data-add="${view}">+ Agregar</button></div>
 <div class="toolbar"><input id="search" class="input search" placeholder="Buscar..."></div><div id="tableContainer"><div class="empty">Cargando...</div></div></div>`;
}
async function bind(){
 $$("[data-goto]").forEach(b=>b.onclick=()=>{state.view=b.dataset.goto;render()});
 $$("[data-add]").forEach(b=>b.onclick=()=>openForm(b.dataset.add));
 const cfg=tables[state.view]; if(!cfg)return;
 const rows=await load(cfg.table); state.rows=rows; drawRows();
 $("#search")?.addEventListener("input",drawRows);
}
function drawRows(){
 const cfg=tables[state.view], q=($("#search")?.value||"").toLowerCase();
 const rows=(state.rows||[]).filter(r=>JSON.stringify(r).toLowerCase().includes(q));
 const cols=cfg.fields.map(x=>x[0]).filter(k=>k!=="notes");
 $("#tableContainer").innerHTML=`<div class="table-wrap"><table><thead><tr>${cols.map(k=>`<th>${pretty(k)}</th>`).join("")}<th>Acciones</th></tr></thead><tbody>
 ${rows.map(r=>`<tr>${cols.map(k=>`<td>${display(k,r[k])}</td>`).join("")}<td><button class="action-btn" data-edit="${r.id}">Editar</button><button class="action-btn danger" data-delete="${r.id}">Eliminar</button></td></tr>`).join("")||`<tr><td colspan="${cols.length+1}" class="empty">No hay registros.</td></tr>`}</tbody></table></div>`;
 $$("[data-edit]").forEach(b=>b.onclick=()=>openForm(state.view,b.dataset.edit));
 $$("[data-delete]").forEach(b=>b.onclick=()=>removeRow(state.view,b.dataset.delete));
}
function fieldHTML(f,item){
 const [k,label,type,req]=f; let c="";
 if(type==="property")c=`<select class="input" name="${k}" ${req?"required":""}><option value="">Seleccione...</option>${state.cache.properties.map(x=>`<option value="${x.id}" ${x.id===item[k]?"selected":""}>${esc(x.name)}</option>`).join("")}</select>`;
 else if(type==="owner")c=`<select class="input" name="${k}"><option value="">Seleccione...</option>${state.cache.owners.map(x=>`<option value="${x.id}" ${x.id===item[k]?"selected":""}>${esc(x.name)}</option>`).join("")}</select>`;
 else if(type==="tenant")c=`<select class="input" name="${k}" ${req?"required":""}><option value="">Seleccione...</option>${state.cache.tenants.map(x=>`<option value="${x.id}" ${x.id===item[k]?"selected":""}>${esc(x.name)}</option>`).join("")}</select>`;
 else if(type.startsWith("select:"))c=`<select class="input" name="${k}"><option value="">Seleccione...</option>${type.slice(7).split(",").map(x=>`<option ${x===item[k]?"selected":""}>${x}</option>`).join("")}</select>`;
 else if(type==="textarea")c=`<textarea class="input" name="${k}" rows="3">${esc(item[k]||"")}</textarea>`;
 else c=`<input class="input" name="${k}" type="${type}" value="${esc(item[k]??"")}" ${req?"required":""}>`;
 return `<div class="field ${type==="textarea"?"full":""}"><label>${label}</label>${c}</div>`;
}
function openForm(view,id=null){
 const cfg=tables[view], item=id?(state.rows||[]).find(x=>x.id===id)||{}:{};
 state.editing={view,id}; $("#modalTitle").textContent=(id?"Editar ":"Nuevo ")+cfg.label.slice(0,-1);
 $("#modalBody").innerHTML=`<div class="form-grid">${cfg.fields.map(f=>fieldHTML(f,item)).join("")}</div>`;
 $("#modal").showModal();
}
$("#modalForm").onsubmit=async e=>{
 e.preventDefault();const {view,id}=state.editing,cfg=tables[view];const raw=Object.fromEntries(new FormData(e.target));const data={...raw};
 for(const f of cfg.fields){if(["number"].includes(f[2]))data[f[0]]=Number(data[f[0]]||0)}
 data.user_id=(await sb.auth.getUser()).data.user.id;
 let res=id?await sb.from(cfg.table).update(data).eq("id",id):await sb.from(cfg.table).insert(data);
 if(res.error){toast(res.error.message);return}$("#modal").close();toast("Registro guardado");render();
};
async function removeRow(view,id){if(!confirm("¿Eliminar este registro?"))return;const res=await sb.from(tables[view].table).delete().eq("id",id);if(res.error)toast(res.error.message);else{toast("Registro eliminado");render()}}
$("#quickAdd").onclick=()=>{const v=state.view==="dashboard"?"properties":state.view;openForm(v)}
$("#refreshBtn").onclick=render;
$$(".nav-item").forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render();$("#sidebar").classList.remove("open")});
$("#mobileMenu").onclick=()=>$("#sidebar").classList.toggle("open");
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("toast-show");setTimeout(()=>x.classList.remove("toast-show"),2500)}
init();
