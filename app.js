const API = window.APP_CONFIG.API_URL;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let currentWorker = null, currentReport = null, adminPin = "", dashboardData = null;
let chartCumplimiento, chartEstado;

const SYMPTOMS = [
  "Dolor de cabeza","Mareo o vértigo","Fiebre o escalofríos","Tos o dolor de garganta",
  "Dificultad para respirar","Dolor de pecho","Náuseas o vómitos","Diarrea",
  "Dolor muscular intenso","Fatiga o debilidad","Alteración visual","Otro síntoma",
  "No tengo ningún síntoma"
];

document.addEventListener("DOMContentLoaded", () => {
  renderSymptoms();
  setupNav();
  setupTabs();
  bindEvents();
  const view = new URLSearchParams(location.search).get("view");
  showView(view === "admin" ? "administrador" : view === "consulta" ? "consulta" : "trabajador");
});

function setupNav(){
  $$("#mainNav button").forEach(b => b.onclick = () => showView(b.dataset.view));
  $("#menuBtn").onclick = () => $("#mainNav").classList.toggle("open");
}
function showView(name){
  $$(".view").forEach(v => v.classList.remove("active"));
  $(`#view-${name}`).classList.add("active");
  $("#mainNav").classList.remove("open");
  history.replaceState(null,"",`?view=${name === "administrador" ? "admin" : name}`);
  scrollTo({top:0,behavior:"smooth"});
}
function setupTabs(){
  $$(".tab").forEach(b => b.onclick = () => {
    $$(".tab").forEach(x=>x.classList.remove("active"));
    $$(".tab-panel").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); $(`#tab-${b.dataset.tab}`).classList.add("active");
  });
}
function renderSymptoms(){
  $("#symptoms").innerHTML = SYMPTOMS.map((s,i)=>`<label><input type="checkbox" value="${s}" ${i===SYMPTOMS.length-1?'data-none="1"':''}><span>${s}</span></label>`).join("");
  $$("#symptoms input").forEach(cb=>cb.onchange=()=>{
    if(cb.dataset.none && cb.checked) $$("#symptoms input:not([data-none])").forEach(x=>x.checked=false);
    if(!cb.dataset.none && cb.checked) $("#symptoms input[data-none]").checked=false;
  });
}
function bindEvents(){
  $("#buscarDni").onclick = searchWorker;
  $("#workerForm").onsubmit = submitWorker;
  $("#btnAdminLogin").onclick = loginAdmin;
  $("#refreshDashboard").onclick = loadDashboard;
  $("#buscarReporte").onclick = searchReport;
  $("#medicalForm").onsubmit = submitMedical;
  $("#filterWorkers").oninput = renderTracking;
  $("#btnConsulta").onclick = consultHealth;
  $("#exportDashboard").onclick = exportDashboardPDF;
  $("#modalClose").onclick = ()=>$("#modal").classList.add("hidden");
}
async function callApi(action, data={}){
  if(!API || API.includes("PEGAR_AQUI")) throw new Error("Primero configura la URL de Apps Script en config.js");
  const body = new URLSearchParams({action, payload:JSON.stringify(data)});
  const r = await fetch(API,{method:"POST",body});
  const out = await r.json();
  if(!out.ok) throw new Error(out.message || "No se pudo completar la operación");
  return out.data;
}
function loading(btn,on,text="Procesando..."){
  if(!btn) return;
  if(on){btn.dataset.label=btn.textContent;btn.textContent=text;btn.disabled=true}
  else{btn.textContent=btn.dataset.label||btn.textContent;btn.disabled=false}
}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3000)}
function modal(type,title,text){
  $("#modalIcon").textContent=type==="danger"?"!":"✓";
  $("#modalIcon").style.background=type==="danger"?"#feeeee":"#e9f8ef";
  $("#modalIcon").style.color=type==="danger"?"#c62828":"#0a8f48";
  $("#modalTitle").textContent=title;$("#modalText").textContent=text;$("#modal").classList.remove("hidden");
}
async function searchWorker(){
  const dni=$("#dni").value.trim(); if(!dni) return toast("Ingresa el DNI");
  const btn=$("#buscarDni");loading(btn,true,"Buscando...");
  try{
    currentWorker=await callApi("getWorker",{dni});
    $("#wNombres").textContent=currentWorker.nombres;$("#wCargo").textContent=currentWorker.cargo;
    $("#wEmpresa").textContent=currentWorker.empresa;$("#wCorreo").textContent=currentWorker.correo;
    $("#workerData").classList.remove("hidden");$("#healthQuestions").classList.remove("hidden");
  }catch(e){currentWorker=null;$("#workerData").classList.add("hidden");$("#healthQuestions").classList.add("hidden");toast(e.message)}
  finally{loading(btn,false)}
}
async function submitWorker(e){
  e.preventDefault(); if(!currentWorker) return toast("Valida primero el DNI");
  const selected=$$("#symptoms input:checked").map(x=>x.value);
  if(!selected.length) return toast("Selecciona al menos una opción de síntomas");
  const hasNone=selected.includes("No tengo ningún síntoma");
  if(hasNone && selected.length>1) return toast("La opción 'No tengo ningún síntoma' debe marcarse sola");
  const btn=e.submitter;loading(btn,true,"Enviando...");
  try{
    const data=await callApi("submitWorkerReport",{
      ...currentWorker,
      sintomas:selected,
      tieneSintomas:!hasNone,
      altura:$('input[name="altura"]:checked').value,
      observacion:$("#observacion").value.trim()
    });
    modal(!hasNone?"danger":"ok",
      !hasNone?"Reporte enviado al equipo médico":"Registro completado",
      !hasNone
      ?"Tu reporte fue enviado al equipo médico. Informa inmediatamente a tu supervisor y al personal de salud antes de realizar cualquier trabajo."
      :"Ante cualquier síntoma o cambio en tu salud, informa a tu jefe inmediato y acércate al área de salud.");
    e.target.reset();currentWorker=null;$("#workerData").classList.add("hidden");$("#healthQuestions").classList.add("hidden");
  }catch(err){toast(err.message)}finally{loading(btn,false)}
}
async function loginAdmin(){
  adminPin=$("#adminPin").value; if(!adminPin) return toast("Ingresa el PIN");
  const btn=$("#btnAdminLogin");loading(btn,true,"Validando...");
  try{await callApi("adminLogin",{pin:adminPin});$("#adminLogin").classList.add("hidden");$("#adminPanel").classList.remove("hidden");await loadDashboard()}
  catch(e){toast(e.message)}finally{loading(btn,false)}
}
async function loadDashboard(){
  try{
    dashboardData=await callApi("dashboard",{pin:adminPin});
    $("#kpiActivos").textContent=dashboardData.kpis.activos;
    $("#kpiReportes").textContent=dashboardData.kpis.reportesHoy;
    $("#kpiCumplimiento").textContent=dashboardData.kpis.cumplimiento+"%";
    $("#kpiSintomas").textContent=dashboardData.kpis.conSintomas;
    $("#kpiPendientes").textContent=dashboardData.kpis.pendientes;
    renderCharts();renderRecent();renderTracking();toast("Dashboard actualizado");
  }catch(e){toast(e.message)}
}
function renderCharts(){
  if(chartCumplimiento)chartCumplimiento.destroy();if(chartEstado)chartEstado.destroy();
  chartCumplimiento=new Chart($("#chartCumplimiento"),{type:"bar",data:{labels:dashboardData.series.map(x=>x.fecha),datasets:[{label:"% cumplimiento",data:dashboardData.series.map(x=>x.cumplimiento),backgroundColor:"#00aeee"}]},options:{responsive:true,scales:{y:{beginAtZero:true,max:100}}}});
  chartEstado=new Chart($("#chartEstado"),{type:"doughnut",data:{labels:["Sin síntomas","Con síntomas","Pendientes"],datasets:[{data:[dashboardData.kpis.sinSintomas,dashboardData.kpis.conSintomas,dashboardData.kpis.pendientes],backgroundColor:["#12a150","#d93535","#f59e0b"]}]},options:{responsive:true}});
}
function badge(v){const c=v==="APTO"||v==="SIN SÍNTOMAS"?"ok":v==="NO APTO"||v==="CON SÍNTOMAS"?"danger":"pending";return `<span class="badge ${c}">${v||"PENDIENTE"}</span>`}
function renderRecent(){
  const rows=dashboardData.recent||[];
  $("#recentTable").innerHTML=`<thead><tr><th>Fecha</th><th>DNI</th><th>Trabajador</th><th>Empresa</th><th>Síntomas</th><th>Altura &gt; 7m</th><th>Condición</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.fecha}</td><td>${r.dni}</td><td>${r.nombres}</td><td>${r.empresa}</td><td>${badge(r.tieneSintomas?"CON SÍNTOMAS":"SIN SÍNTOMAS")}</td><td>${r.altura}</td><td>${badge(r.condicion)}</td></tr>`).join("")}</tbody>`;
}
function renderTracking(){
  if(!dashboardData)return;const q=$("#filterWorkers").value.toLowerCase();
  const rows=(dashboardData.tracking||[]).filter(r=>`${r.dni} ${r.nombres} ${r.empresa}`.toLowerCase().includes(q));
  $("#trackingTable").innerHTML=`<thead><tr><th>DNI</th><th>Nombres</th><th>Cargo</th><th>Empresa</th><th>Reporte hoy</th><th>Síntomas</th><th>Evaluación</th><th>Condición</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.dni}</td><td>${r.nombres}</td><td>${r.cargo}</td><td>${r.empresa}</td><td>${badge(r.reporto?"SI":"PENDIENTE")}</td><td>${r.sintomas||"—"}</td><td>${badge(r.evaluado?"COMPLETA":"PENDIENTE")}</td><td>${badge(r.condicion)}</td></tr>`).join("")}</tbody>`;
}
async function searchReport(){
  const dni=$("#medDni").value.trim();if(!dni)return toast("Ingresa el DNI");
  try{
    currentReport=await callApi("getLatestReport",{pin:adminPin,dni});
    $("#reportedSummary").innerHTML=`<b>${currentReport.nombres}</b><br>DNI: ${currentReport.dni}<br>Empresa: ${currentReport.empresa}<br>Cargo: ${currentReport.cargo}<br><br><b>Síntomas reportados:</b> ${currentReport.sintomas}<br><b>Trabajo en altura &gt; 7 m:</b> ${currentReport.altura}<br><b>Fecha:</b> ${currentReport.fecha}`;
    $("#reportedSummary").classList.remove("hidden");$("#horaMedicion").value=new Date().toTimeString().slice(0,5);
  }catch(e){currentReport=null;$("#reportedSummary").classList.add("hidden");toast(e.message)}
}
async function submitMedical(e){
  e.preventDefault();if(!currentReport)return toast("Primero busca el reporte del trabajador");
  const btn=e.submitter;loading(btn,true,"Guardando...");
  try{
    await callApi("submitMedicalAssessment",{pin:adminPin,reportId:currentReport.reportId,dni:currentReport.dni,
      hora:$("#horaMedicion").value,presion:$("#presion").value,fc:$("#fc").value,fr:$("#fr").value,
      temperatura:$("#temperatura").value,saturacion:$("#saturacion").value,rangoNormal:$("#rangoNormal").value,
      condicion:$("#condicionFinal").value,observacion:$("#obsMedica").value});
    modal("ok","Evaluación finalizada","La medición de funciones vitales y la condición final fueron registradas correctamente.");
    e.target.reset();currentReport=null;$("#reportedSummary").classList.add("hidden");await loadDashboard();
  }catch(err){toast(err.message)}finally{loading(btn,false)}
}
async function consultHealth(){
  const dni=$("#consultaDni").value.trim();if(!dni)return toast("Ingresa el DNI");
  try{
    const r=await callApi("consultHealth",{dni});const box=$("#consultaResult");
    const cls=r.condicion==="APTO"?"ok":r.condicion==="NO APTO"?"danger":"pending";
    box.className=`result ${cls}`;box.innerHTML=`<span>Última condición registrada</span><strong>${r.condicion}</strong><div>${r.fecha}<br>${r.mensaje}</div>`;box.classList.remove("hidden");
  }catch(e){toast(e.message)}
}
async function exportDashboardPDF(){
  const btn=$("#exportDashboard");loading(btn,true,"Generando...");
  try{
    const {jsPDF}=window.jspdf;const canvas=await html2canvas($("#tab-dashboard"),{scale:1.5,backgroundColor:"#f4f7fb"});
    const img=canvas.toDataURL("image/png");const pdf=new jsPDF("l","mm","a4");
    const w=277,h=canvas.height*w/canvas.width;pdf.addImage(img,"PNG",10,10,w,Math.min(h,190));pdf.save(`Dashboard_ENGIE_${new Date().toISOString().slice(0,10)}.pdf`);
  }finally{loading(btn,false)}
}