/* === XTREME MINING v16 FINAL === */
"use strict";

const STORAGE_KEY = "informe_capataces_pro_v16";
const MAX_REPORT_BYTES = 5 * 1024 * 1024;
const HISTORY_KEY = "informe_capataces_historial_v16";
const THEME_KEY = "informe_capataces_theme";
const COLLAPSED_KEY = "informe_capataces_collapsed";
const TAB_KEY = "informe_capataces_tab";
const AUTOSAVE_INTERVAL = 30000;
const MAESTROS_CACHE_KEY = "informe_capataces_maestros_v24";
let deferredInstallPrompt = null;

const OTHER_EQUIPMENT_TYPES = ["Equipo levante","Retro excavadora","Acuñador mecanizado","Jumbo","Brook","Scoop","Roboshot","Mixer","Tensadora"];
const MATERIAL_TYPES = [
  ["Malla",""],["Malla Acma C196",""],["Malla Acma 567",""],["Malla Pollera",""],["Pernos helicoidales 2,50 mts x 25 mm",""],["Pernos helicoidales 2,55 mts x 25 mm",""],
  ["Pernos helicoidales 2,70 mts x 25 mm",""],["Pernos helicoidales 2,90 mts x 25 mm",""],
  ["Pernos helicoidales 2,30 mts x 22 mm","Solo Interzanja o C33 rotura Z66 o Z67"],
  ["Planchuelas 10 mm",""],["Planchuelas 6 mm","Solo Interzanja o C33 rotura Z66 o Z67"],
  ["Tuercas 25 mm",""],["Tuercas 22 mm","Solo Interzanja o C33 rotura Z66 o Z67"],
  ["Cemento",""],["Pernos cables",""]
];
const DEFAULT_TOOL_TYPES = ["Galletera","Taladro","Llave impacto","Soldadora","Equipo oxicorte"];

/* ============================================================
   GLOBAL TAB FUNCTION — called via onclick from HTML buttons
   ============================================================ */
function switchTab(tabId) {
  // Show/hide pages
  document.querySelectorAll(".tab-page").forEach(function(p) { p.classList.remove("active"); });
  var page = document.getElementById(tabId);
  if (page) page.classList.add("active");
  // Highlight main tabs
  document.querySelectorAll(".main-tab").forEach(function(b) {
    b.classList.toggle("active", b.getAttribute("data-tab") === tabId);
  });
  // Highlight sidebar tabs
  document.querySelectorAll(".tab-selector button").forEach(function(b) {
    b.classList.toggle("active", b.getAttribute("data-tab") === tabId);
  });
  // Highlight mobile bottom nav
  document.querySelectorAll("[data-mobile-tab]").forEach(function(a) {
    a.classList.toggle("active", a.getAttribute("data-mobile-tab") === tabId);
  });
  // Show/hide sidebar nav links for current tab
  document.querySelectorAll("#sideNav a[data-tab-link]").forEach(function(a) {
    a.classList.toggle("visible", a.getAttribute("data-tab-link") === tabId);
  });
  try { localStorage.setItem(TAB_KEY, tabId); } catch(e) {}
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* === DOM HELPERS === */
function $(id) { return document.getElementById(id); }
function debounce(fn, ms) { var t; return function() { clearTimeout(t); t = setTimeout(fn, ms); }; }
function sumInputs(c, suffix) { var s=0; c.querySelectorAll('input[name$="'+suffix+'"]').forEach(function(i){ s += parseFloat(i.value||"0"); }); return s; }
function pct(r, m) { return (!m||m<=0)?0:Math.min(999,(r/m)*100); }
function formatMB(b) { return (b/(1024*1024)).toFixed(2)+" MB"; }
function normalizeText(v) { return String(v||"").trim().toLowerCase(); }
function firstArticle(f) { return f.querySelector(".card-entry"); }
function getSheetsUrl() { return (window.APP_CONFIG && window.APP_CONFIG.GOOGLE_SHEETS_URL) || ""; }

function getInstallButton(){ return $("installBtn"); }
function safeBind(id, eventName, handler){ var el=$(id); if(el) el.addEventListener(eventName, handler); }
function initInstallPrompt(){
  var installBtn = getInstallButton();
  window.addEventListener("beforeinstallprompt", function(e){
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });
  window.addEventListener("appinstalled", function(){
    deferredInstallPrompt = null;
    if (installBtn) installBtn.hidden = true;
    if (saveStatus) saveStatus.textContent = "App instalada";
  });
  if (installBtn) {
    installBtn.addEventListener("click", async function(){
      if (!deferredInstallPrompt) {
        alert("En este equipo el navegador no mostró el aviso de instalación. En Chrome usa el menú y luego 'Instalar aplicación'.");
        return;
      }
      deferredInstallPrompt.prompt();
      try { await deferredInstallPrompt.userChoice; } catch(e) {}
      deferredInstallPrompt = null;
      installBtn.hidden = true;
    });
  }
}
function ensureJsPdfLoaded(){
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise(function(resolve, reject){
    var existing = document.querySelector('script[data-jspdf="1"]');
    if (existing) {
      existing.addEventListener('load', function(){ resolve(window.jspdf.jsPDF); }, { once:true });
      existing.addEventListener('error', reject, { once:true });
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.defer = true;
    s.dataset.jspdf = '1';
    s.onload = function(){ resolve(window.jspdf.jsPDF); };
    s.onerror = function(){ reject(new Error('No se pudo cargar jsPDF')); };
    document.head.appendChild(s);
  });
}

function getMaestrosUrl() { return (window.APP_CONFIG && window.APP_CONFIG.MAESTROS_URL) || ""; }
function safeArray(v) { return Array.isArray(v) ? v : []; }
function setSelectOptions(select, items, placeholder, currentValue) {
  if (!select) return;
  var normalized = [];
  (items || []).forEach(function(item) {
    var value = String(item == null ? "" : item).trim();
    if (value && normalized.indexOf(value) === -1) normalized.push(value);
  });
  var previous = currentValue != null ? String(currentValue) : String(select.value || "");
  select.innerHTML = '<option value="">' + (placeholder || "Seleccione") + '</option>' +
    normalized.map(function(item) { return '<option value="' + item.replace(/"/g, "&quot;") + '">' + item + '</option>'; }).join("");
  if (previous && normalized.indexOf(previous) >= 0) select.value = previous;
}
function getUniqueNames(list, key) {
  var out = [];
  safeArray(list).forEach(function(item) {
    var value = item && item[key] ? String(item[key]).trim() : "";
    if (value && out.indexOf(value) === -1) out.push(value);
  });
  return out;
}
function tryCacheMaestros(data) {
  try { localStorage.setItem(MAESTROS_CACHE_KEY, JSON.stringify(data)); } catch (e) {}
}
function getCachedMaestros() {
  try { return JSON.parse(localStorage.getItem(MAESTROS_CACHE_KEY) || "null"); } catch (e) { return null; }
}
function normalizeMaestrosPayload(data) {
  if (!data || typeof data !== "object") return null;
  return {
    version: data.version || "local",
    minas: safeArray(data.minas),
    jornadas: safeArray(data.jornadas),
    grupos: safeArray(data.grupos),
    capataces: safeArray(data.capataces),
    jefesTurno: safeArray(data.jefesTurno),
    jefesTerreno: safeArray(data.jefesTerreno),
    jefesOperaciones: safeArray(data.jefesOperaciones)
  };
}
function loadLocalMaestros() {
  return fetch("./data_maestros.json", { cache: "no-store" })
    .then(function(r) {
      if (!r.ok) throw new Error("No se pudo cargar data_maestros.json");
      return r.json();
    })
    .then(normalizeMaestrosPayload);
}
function loadOnlineMaestros() {
  var url = getMaestrosUrl();
  if (!url || !navigator.onLine) return Promise.resolve(null);
  return fetch(url, { cache: "no-store" })
    .then(function(r) {
      if (!r.ok) throw new Error("No se pudo cargar maestros online");
      return r.json();
    })
    .then(function(data) {
      if (data && data.ok && data.maestros) return normalizeMaestrosPayload(data.maestros);
      return normalizeMaestrosPayload(data);
    })
    .catch(function() { return null; });
}
function loadMaestros() {
  return loadLocalMaestros().catch(function() { return getCachedMaestros(); }).then(function(localData) {
    var cached = getCachedMaestros();
    maestrosData = localData || cached;
    if (maestrosData) tryCacheMaestros(maestrosData);
    return loadOnlineMaestros().then(function(onlineData) {
      if (onlineData) {
        maestrosData = onlineData;
        tryCacheMaestros(onlineData);
      }
      return maestrosData;
    });
  });
}
function applyMaestrosToForm() {
  if (!maestrosData || !form) return;
  var minaSel = form.elements.namedItem("mina");
  var grupoSel = form.elements.namedItem("grupo");
  var turnoSel = form.elements.namedItem("turno");
  var capatazSel = form.elements.namedItem("capataz");
  var jefeTurnoSel = form.elements.namedItem("jefeTurno");
  var jefeTerrenoSel = form.elements.namedItem("jefeTerreno");
  var jefeOperacionesSel = form.elements.namedItem("jefeOperaciones");

  setSelectOptions(turnoSel, maestrosData.jornadas, "Seleccione", turnoSel && turnoSel.value);
  setSelectOptions(minaSel, maestrosData.minas, "Seleccione", minaSel && minaSel.value);
  updateDependentSelects();

  [minaSel, grupoSel].forEach(function(el) {
    if (!el || el.dataset.maestrosBound === "1") return;
    el.dataset.maestrosBound = "1";
    el.addEventListener("change", function() {
      updateDependentSelects();
      hasUnsavedChanges = true;
      debouncedRecompute();
    });
  });

  [capatazSel, jefeTurnoSel, jefeTerrenoSel, jefeOperacionesSel, turnoSel].forEach(function(el) {
    if (!el || el.dataset.maestrosBound === "1") return;
    el.dataset.maestrosBound = "1";
    el.addEventListener("change", function() {
      hasUnsavedChanges = true;
      debouncedRecompute();
    });
  });
}
function updateDependentSelects() {
  if (!maestrosData || !form) return;
  var minaSel = form.elements.namedItem("mina");
  var grupoSel = form.elements.namedItem("grupo");
  var capatazSel = form.elements.namedItem("capataz");
  var jefeTurnoSel = form.elements.namedItem("jefeTurno");
  var jefeTerrenoSel = form.elements.namedItem("jefeTerreno");
  var jefeOperacionesSel = form.elements.namedItem("jefeOperaciones");

  var selectedMina = minaSel ? String(minaSel.value || "").trim() : "";
  var selectedGrupo = grupoSel ? String(grupoSel.value || "").trim() : "";

  var grupos = maestrosData.grupos.slice();
  if (!grupos.length) {
    grupos = getUniqueNames(maestrosData.capataces, "grupo").concat(getUniqueNames(maestrosData.jefesTurno, "grupo"));
  }
  setSelectOptions(grupoSel, grupos, "Seleccione", selectedGrupo);

  var capataces = safeArray(maestrosData.capataces).filter(function(item) {
    if (selectedGrupo && item.grupo !== selectedGrupo) return false;
    return true;
  });
  var jefesTurno = safeArray(maestrosData.jefesTurno).filter(function(item) {
    if (selectedGrupo && item.grupo !== selectedGrupo) return false;
    return true;
  });

  setSelectOptions(capatazSel, getUniqueNames(capataces, "nombre"), "Seleccione", capatazSel && capatazSel.value);
  setSelectOptions(jefeTurnoSel, getUniqueNames(jefesTurno, "nombre"), "Seleccione", jefeTurnoSel && jefeTurnoSel.value);
  setSelectOptions(jefeTerrenoSel, getUniqueNames(maestrosData.jefesTerreno, "nombre"), "Seleccione", jefeTerrenoSel && jefeTerrenoSel.value);
  setSelectOptions(jefeOperacionesSel, getUniqueNames(maestrosData.jefesOperaciones, "nombre"), "Seleccione", jefeOperacionesSel && jefeOperacionesSel.value);

  if (selectedMina && minaSel && minaSel.value !== selectedMina && maestrosData.minas.indexOf(selectedMina) >= 0) {
    minaSel.value = selectedMina;
  }
}


/* === REFS (set on DOMContentLoaded) === */
var form, saveStatus, syncStatus, sizeStatus, summaryBox, validationBox, folioDisplay;
var containers = {};
var counters = {jaula:0,plataforma:0,porta:0,radio:0,tool:0,art:0,activity:0,pending:0,procedimiento:0,site:0};
var otherCounter = OTHER_EQUIPMENT_TYPES.length;
var hasUnsavedChanges = false;
var maestrosData = null;

/* === INIT === */
document.addEventListener("DOMContentLoaded", function() {
  form = $("reportForm");
  saveStatus = $("saveStatus");
  syncStatus = $("syncStatus");
  sizeStatus = $("sizeStatus");
  summaryBox = $("summaryBox");
  validationBox = $("validationBox");
  folioDisplay = $("folioDisplay");
  containers = {
    jaulas:$("jaulasContainer"), plataformas:$("plataformasContainer"),
    portaMarcos:$("portaMarcosContainer"), others:$("othersContainer"),
    radios:$("radiosContainer"), materials:$("materialsContainer"),
    tools:$("toolsContainer"), art:$("artContainer"),
    activities:$("activitiesContainer"), pending:$("pendingContainer"),
    procedimientos:$("procedimientosContainer"), siteEvidence:$("siteEvidenceContainer")
  };

  // Restore saved tab
  var savedTab = localStorage.getItem(TAB_KEY) || "tab1";
  switchTab(savedTab);

  initTheme();
  initInstallPrompt();
  initCollapsiblePanels();
  initMobileNav();
  buildStaticSections();
  bindStaticPhotoInputs();
  attachDynamicButtons();
  attachFormListeners();
  attachSectionClearButtons();
  loadData();
  loadMaestros().then(function(){
    applyMaestrosToForm();
  }).finally(function(){
    renderHistory();
    renderConsolidated();
  });
  updateNetworkStatus();
  updateFolio();
  updateProgressBar();
  checkSheetsConfig();

  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  safeBind("saveBtn", "click", saveData);
  safeBind("syncBtn", "click", syncToSheets);
  safeBind("exportBtn", "click", exportJson);
  safeBind("pdfBtn", "click", exportPdf);
  safeBind("exportFlatBtn", "click", exportFlatCsv);
  safeBind("saveHistoryBtn", "click", saveToHistory);
  safeBind("clearHistoryBtn", "click", clearHistory);
  safeBind("applyFiltersBtn", "click", renderConsolidated);
  safeBind("resetFiltersBtn", "click", resetConsolidatedFilters);
  safeBind("exportConsolidatedBtn", "click", exportConsolidatedCsv);
  safeBind("clearBtn", "click", clearAll);
  safeBind("importFile", "change", importJson);

  startAutosave();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(function(){});
});

/* === DARK MODE === */
function initTheme() {
  if (localStorage.getItem(THEME_KEY)==="dark") document.documentElement.dataset.theme="dark";
  updateThemeUI();
  $("themeToggle").addEventListener("click", toggleTheme);
  if ($("mobileThemeBtn")) $("mobileThemeBtn").addEventListener("click", toggleTheme);
}
function toggleTheme() {
  var d=document.documentElement.dataset.theme==="dark";
  document.documentElement.dataset.theme=d?"":"dark";
  localStorage.setItem(THEME_KEY,d?"light":"dark");
  updateThemeUI();
}
function updateThemeUI() {
  var d=document.documentElement.dataset.theme==="dark";
  var i=$("themeIcon"),l=$("themeLabel");
  if(i) i.textContent=d?"\u2600":"\u263D";
  if(l) l.textContent=d?"Modo claro":"Modo oscuro";
}

/* === COLLAPSIBLE PANELS === */
function initCollapsiblePanels() {
  var saved; try{saved=JSON.parse(localStorage.getItem(COLLAPSED_KEY)||"{}");}catch(e){saved={};}
  document.querySelectorAll("[data-collapse]").forEach(function(header) {
    var id=header.dataset.collapse;
    var panel=header.closest(".panel");
    var body=panel?panel.querySelector(".panel-body"):null;
    if(!panel||!body) return;
    if(saved[id]) panel.classList.add("collapsed");
    header.addEventListener("click", function() {
      panel.classList.toggle("collapsed");
      if(!panel.classList.contains("collapsed")){body.style.maxHeight=body.scrollHeight+"px";setTimeout(function(){body.style.maxHeight="none";},350);}
      else{body.style.maxHeight=body.scrollHeight+"px";requestAnimationFrame(function(){body.style.maxHeight="0";});}
      saveCollapsedState();
    });
    if(!panel.classList.contains("collapsed")) requestAnimationFrame(function(){body.style.maxHeight="none";});
  });
}
function saveCollapsedState() {
  var s={};
  document.querySelectorAll("[data-collapse]").forEach(function(h){if(h.closest(".panel")&&h.closest(".panel").classList.contains("collapsed"))s[h.dataset.collapse]=true;});
  localStorage.setItem(COLLAPSED_KEY,JSON.stringify(s));
}

/* === MOBILE NAV === */
function initMobileNav() {
  if($("menuBtn")) $("menuBtn").addEventListener("click",function(){$("sidebar").classList.add("open");$("sidebarOverlay").classList.add("show");});
  if($("sidebarOverlay")) $("sidebarOverlay").addEventListener("click",closeMobileSidebar);
}
function closeMobileSidebar() {$("sidebar").classList.remove("open");$("sidebarOverlay").classList.remove("show");}

/* === PROGRESS BAR === */
function updateProgressBar() {
  var fields=form.querySelectorAll("input:not([type=file]):not([type=hidden]),select,textarea");
  var filled=0,total=0;
  fields.forEach(function(f){
    if(f.closest("template")||f.closest("#consolidado")||f.closest("#historial"))return;
    total++;if(f.value&&f.value.trim()!=="")filled++;
  });
  var fill=$("progressFill");
  if(fill)fill.style.width=Math.min(100,total?(filled/total)*100:0)+"%";
}

/* === AUTO-SAVE === */
function startAutosave() {
  setInterval(function(){
    if(hasUnsavedChanges){
      var data=getFormData(true);
      if(getPayloadSizeBytes(data)<=MAX_REPORT_BYTES){
        localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
        hasUnsavedChanges=false;
        var el=$("autosaveIndicator");
        if(el){el.classList.add("show");setTimeout(function(){el.classList.remove("show");},2000);}
        saveStatus.textContent="Auto-guardado";
      }
    }
  },AUTOSAVE_INTERVAL);
}

/* === BUILD SECTIONS === */
function buildStaticSections() {
  addJaula(); addPlataforma(); addPorta();
  OTHER_EQUIPMENT_TYPES.forEach(function(name,i){
    var frag=createEntry("otherEquipmentTemplate",name,"other_"+i);
    var article=firstArticle(frag);
    article.dataset.equipmentName=name;
    toggleEquipmentFields(article,name);
    wireEquipmentCalc(article,name);
    addDeleteHandler(article);
    containers.others.appendChild(frag);
  });
  addRadio();
  MATERIAL_TYPES.forEach(function(pair,i){
    var name=pair[0],note=pair[1];
    var frag=createEntry("materialTemplate",name,"mat_"+i);
    var article=firstArticle(frag);
    var noteEl=article.querySelector("[data-note]");
    noteEl.textContent=note||"";if(!note)noteEl.style.display="none";
    if(name!=="Pernos cables"){article.querySelectorAll("[data-field]").forEach(function(el){if(el.name&&el.name.endsWith("_longitud"))el.closest("label").style.display="none";});}
    if(name==="Malla"){
      var grid=article.querySelector(".grid");
      if(grid){var lbl=document.createElement("label");lbl.innerHTML='<span>Tipo de malla</span>';var sel=document.createElement("select");sel.name="mat_"+i+"_tipoMalla";sel.dataset.field="tipoMalla";sel.innerHTML='<option value="">Seleccione</option><option>G80</option><option>R80</option><option>5000-100NR</option><option>MFI 3500-75</option><option>10006</option><option>R65</option>';lbl.appendChild(sel);grid.insertBefore(lbl,grid.firstChild);}
    }
    containers.materials.appendChild(frag);
  });
  DEFAULT_TOOL_TYPES.forEach(function(name){addTool(name);});
  addArt(); addActivity(); addPending(); addProcedimiento(); addSiteEvidence();
  recomputeAll();
}

function attachDynamicButtons() {}

function attachSectionClearButtons(){document.querySelectorAll("[data-clear-section]").forEach(function(btn){btn.addEventListener("click",function(){clearSection(btn.dataset.clearSection);});});}
function clearSection(id){
  var s=$(id);if(!s)return;
  if(id==="resumen"){summaryBox.textContent="Resumen limpiado.";recomputeAll();return;}
  s.querySelectorAll("input,textarea,select").forEach(function(el){if(el.type==="file")el.value="";else if(el.tagName==="SELECT")el.selectedIndex=0;else el.value="";});
  s.querySelectorAll(".preview").forEach(function(p){p.innerHTML="";delete p.dataset.image;delete p.dataset.timestamp;});
  saveStatus.textContent="Pestaña limpiada";hasUnsavedChanges=true;recomputeAll();
}

function wireEntryButtons(article){
  if(!article) return;
  var top = article.querySelector(".entry-top");
  if(!top) return;
  var deleteBtn = top.querySelector(".btn-delete");
  var actions = document.createElement("div");
  actions.className = "entry-actions";

  var clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "btn-card btn-card-clear";
  clearBtn.textContent = "Limpiar";
  clearBtn.addEventListener("click", function(){
    resetEntry(article);
    hasUnsavedChanges = true;
    saveStatus.textContent = "Tarjeta limpiada";
    recomputeAll();
  });
  actions.appendChild(clearBtn);

  if(article.dataset.tplId !== "materialTemplate"){
    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn-card btn-card-add";
    addBtn.textContent = "Agregar";
    addBtn.addEventListener("click", function(){
      addSameEntry(article);
    });
    actions.appendChild(addBtn);
  }

  if(deleteBtn){
    deleteBtn.textContent = "Eliminar";
    deleteBtn.className = "btn-card btn-card-delete btn-delete";
    actions.appendChild(deleteBtn);
  }
  top.appendChild(actions);
}

function getGroupKeyForEntry(tplId, title){
  if(tplId==="otherEquipmentTemplate") return "other:" + String(title||"").toLowerCase();
  if(tplId==="toolTemplate") return "tool:" + String(title||"").toLowerCase();
  if(tplId==="materialTemplate") return "material:" + String(title||"").toLowerCase();
  return tplId;
}

function addSameEntry(article){
  if(!article) return;
  var tplId = article.dataset.tplId || "";
  var title = (article.dataset.entryTitle || (article.querySelector("[data-title]") ? article.querySelector("[data-title]").textContent : "") || "").trim();
  switch(tplId){
    case "jaulaTemplate": addJaula(); break;
    case "plataformaTemplate": addPlataforma(); break;
    case "portaMarcosTemplate": addPorta(); break;
    case "radioTemplate": addRadio(); break;
    case "toolTemplate": addTool(title || ("Herramienta " + (counters.tool+1))); break;
    case "artTemplate": addArt(); break;
    case "activityTemplate": addActivity(); break;
    case "pendingTemplate": addPending(); break;
    case "procedimientoTemplate": addProcedimiento(); break;
    case "siteEvidenceTemplate": addSiteEvidence(); break;
    case "otherEquipmentTemplate": addOtherEquipment(article.dataset.equipmentName || title); break;
  }
}

function addDeleteHandler(article){
  var btn=article.querySelector(".btn-delete");
  if(!btn) return;
  btn.addEventListener("click",function(){
    var container = article.parentElement;
    var groupKey = article.dataset.groupKey || "";
    var tplId = article.dataset.tplId || "";
    var title = article.dataset.entryTitle || "";
    var equipmentName = article.dataset.equipmentName || title;
    article.remove();
    if(container && groupKey && !container.querySelector('.card-entry[data-group-key="'+groupKey.replace(/"/g, '&quot;')+'"]')){
      if(tplId==="otherEquipmentTemplate") addOtherEquipment(equipmentName);
      else if(tplId==="toolTemplate") addTool(title || ("Herramienta " + (counters.tool+1)));
      else if(tplId==="jaulaTemplate") addJaula();
      else if(tplId==="plataformaTemplate") addPlataforma();
      else if(tplId==="portaMarcosTemplate") addPorta();
      else if(tplId==="radioTemplate") addRadio();
      else if(tplId==="artTemplate") addArt();
      else if(tplId==="activityTemplate") addActivity();
      else if(tplId==="pendingTemplate") addPending();
      else if(tplId==="procedimientoTemplate") addProcedimiento();
      else if(tplId==="siteEvidenceTemplate") addSiteEvidence();
    }
    hasUnsavedChanges=true;
    recomputeAll();
  });
}

function addDynamicEntry(type,tplId,container,prefix){
  counters[type]++;var frag=createEntry(tplId,prefix+" "+counters[type],type+"_"+counters[type]);
  addDeleteHandler(firstArticle(frag));container.appendChild(frag);recomputeAll();
  if(window.innerWidth<=900)requestAnimationFrame(function(){var last=container.lastElementChild;if(last)last.scrollIntoView({behavior:"smooth",block:"nearest"});});
}
function addJaula(){addDynamicEntry("jaula","jaulaTemplate",containers.jaulas,"Jaula");}
function addPlataforma(){addDynamicEntry("plataforma","plataformaTemplate",containers.plataformas,"Plataforma");}
function addPorta(){addDynamicEntry("porta","portaMarcosTemplate",containers.portaMarcos,"Porta Marcos");}
function addRadio(){addDynamicEntry("radio","radioTemplate",containers.radios,"Radio Handy");}
function addArt(){addDynamicEntry("art","artTemplate",containers.art,"Reporte ART");}
function addActivity(){addDynamicEntry("activity","activityTemplate",containers.activities,"Actividad");}
function addPending(){addDynamicEntry("pending","pendingTemplate",containers.pending,"Pendiente");}
function addProcedimiento(){addDynamicEntry("procedimiento","procedimientoTemplate",containers.procedimientos,"Procedimiento");}
function addSiteEvidence(){addDynamicEntry("site","siteEvidenceTemplate",containers.siteEvidence,"Evidencia gestión de sitio");}
function addTool(title){counters.tool++;var f=createEntry("toolTemplate",title,"tool_"+counters.tool);addDeleteHandler(firstArticle(f));containers.tools.appendChild(f);recomputeAll();}

function addOtherEquipment(name){otherCounter++;var frag=createEntry("otherEquipmentTemplate",name,"other_"+otherCounter);var article=firstArticle(frag);article.dataset.equipmentName=name;article.dataset.groupKey=getGroupKeyForEntry("otherEquipmentTemplate",name);toggleEquipmentFields(article,name);wireEquipmentCalc(article,name);addDeleteHandler(article);containers.others.appendChild(frag);recomputeAll();}
function showAddOtherEquipmentDialog(){
  var all=OTHER_EQUIPMENT_TYPES.concat(["Otro (personalizado)"]);
  var sel=prompt("Tipo de equipo (número):\n"+all.map(function(t,i){return(i+1)+". "+t;}).join("\n"));
  if(!sel)return;var idx=parseInt(sel)-1;
  if(idx>=0&&idx<OTHER_EQUIPMENT_TYPES.length)addOtherEquipment(OTHER_EQUIPMENT_TYPES[idx]);
  else if(idx===OTHER_EQUIPMENT_TYPES.length){var c=prompt("Nombre:");if(c&&c.trim())addOtherEquipment(c.trim());}
  else if(sel.trim())addOtherEquipment(sel.trim());
}
function resetEntry(card){
  card.querySelectorAll("input,textarea,select").forEach(function(el){if(el.type==="file")el.value="";else if(el.tagName==="SELECT")el.selectedIndex=0;else el.value="";});
  card.querySelectorAll(".preview").forEach(function(p){p.innerHTML="";delete p.dataset.image;delete p.dataset.timestamp;});
}
function clearContainerEntries(container,msg){
  if(!container) return;
  container.querySelectorAll(".card-entry").forEach(resetEntry);
  hasUnsavedChanges=true;saveStatus.textContent=msg||"Datos limpiados";recomputeAll();
}
function clearEquipmentByName(name){
  containers.others.querySelectorAll(".card-entry").forEach(function(card){
    if((card.dataset.equipmentName||"")===name) resetEntry(card);
  });
  hasUnsavedChanges=true;saveStatus.textContent=name+" limpiado";recomputeAll();
}
function clearOtherEquipments(){clearContainerEntries(containers.others,"Equipos limpiados");}
function clearMaterialsByNames(names){
  containers.materials.querySelectorAll(".card-entry").forEach(function(card){
    var title = card.querySelector("h4") ? card.querySelector("h4").textContent.trim() : "";
    if(names.indexOf(title)>=0) resetEntry(card);
  });
  hasUnsavedChanges=true;saveStatus.textContent="Materiales limpiados";recomputeAll();
}
function clearMaterialsByPrefix(prefix){
  containers.materials.querySelectorAll(".card-entry").forEach(function(card){
    var title = card.querySelector("h4") ? card.querySelector("h4").textContent.trim() : "";
    if(title.indexOf(prefix)===0) resetEntry(card);
  });
  hasUnsavedChanges=true;saveStatus.textContent="Materiales limpiados";recomputeAll();
}
function clearToolsByTitle(title){
  containers.tools.querySelectorAll(".card-entry").forEach(function(card){
    var current = card.querySelector("h4") ? card.querySelector("h4").textContent.trim() : "";
    if(current.toLowerCase()===title.toLowerCase()) resetEntry(card);
  });
  hasUnsavedChanges=true;saveStatus.textContent=title+" limpiada";recomputeAll();
}

function createEntry(tplId,title,idBase){
  var tpl=$(tplId);var frag=tpl.content.cloneNode(true);var article=firstArticle(frag);
  article.dataset.entryId=idBase;
  article.dataset.tplId=tplId;
  article.dataset.entryTitle=title;
  article.dataset.groupKey=getGroupKeyForEntry(tplId,title);
  frag.querySelector("[data-title]").textContent=title;
  frag.querySelectorAll("[data-field]").forEach(function(el){el.name=idBase+"_"+el.dataset.field;});
  frag.querySelectorAll("[data-dynamic-photo]").forEach(function(input,idx){
    var key=idBase+"_photo_"+(idx+1);input.dataset.photoKey=key;
    var preview=input.closest(".photo-card").querySelector(".preview");preview.id="preview_"+key;
    input.addEventListener("change",handlePhotoInput);
  });
  wireEntryButtons(article);
  return frag;
}
function toggleEquipmentFields(article,name){
  var show=function(s,y){article.querySelectorAll(s).forEach(function(e){e.style.display=y?"":"none";});};
  show(".retro-config",name==="Retro excavadora");show(".brook-config",name==="Brook");
  show(".acunador-only",name==="Acuñador mecanizado");show(".jumbo-only",name==="Jumbo");
  show(".tensadora-only",name==="Tensadora");show(".roboshot-only",name==="Roboshot");
  show(".scoop-only",name==="Scoop");show(".mixer-only",name==="Mixer");show(".mixer-only-photo",name==="Mixer");
}
function wireEquipmentCalc(article,name){
  if(name==="Scoop"){var b=article.querySelector('[data-field="baldadas"]'),c=article.querySelector('[data-field="cantidadExtraida"]');if(b&&c)b.addEventListener("input",function(){c.value=(parseFloat(b.value||"0")*7.5).toFixed(2);recomputeAll();});}
  if(name==="Retro excavadora"){var b2=article.querySelector('[data-field="baldadasRetro"]'),c2=article.querySelector('[data-field="m3Retro"]');if(b2&&c2)b2.addEventListener("input",function(){c2.value=(parseFloat(b2.value||"0")*1).toFixed(2);recomputeAll();});}
}

/* === FORM LISTENERS === */
var debouncedRecompute=debounce(recomputeAll,150);
function attachFormListeners(){
  form.addEventListener("submit",function(e){e.preventDefault();});
  form.addEventListener("input",function(){updateFolio();hasUnsavedChanges=true;saveStatus.textContent="Cambios sin guardar";debouncedRecompute();});
}
function bindStaticPhotoInputs(){document.querySelectorAll("input[data-photo]").forEach(function(i){i.addEventListener("change",handlePhotoInput);});}
function handlePhotoInput(e){
  var file=e.target.files&&e.target.files[0];if(!file)return;
  if(file.size>1.2*1024*1024){alert("Foto debe ser < 1,2 MB.");e.target.value="";return;}
  var reader=new FileReader();
  reader.onload=function(){
    var key=e.target.dataset.photo||e.target.dataset.photoKey;
    var preview=$("preview_"+key)||e.target.closest(".photo-card").querySelector(".preview");
    var ts=new Date().toLocaleString("es-CL");
    preview.innerHTML='<img src="'+reader.result+'" alt="evidencia"><small>'+ts+'</small>';
    preview.dataset.image=reader.result;preview.dataset.timestamp=ts;
    hasUnsavedChanges=true;saveStatus.textContent="Cambios sin guardar";recomputeAll();
  };
  reader.readAsDataURL(file);
}

/* === DATA === */
function getFormData(meta){
  var data={};var fd=new FormData(form);
  fd.forEach(function(v,k){data[k]=v;});
  document.querySelectorAll(".preview").forEach(function(p){if(p.dataset.image)data[p.id]={image:p.dataset.image,timestamp:p.dataset.timestamp||""};});
  data.folio=buildFolio();
  if(meta)data.meta={savedAt:new Date().toISOString(),userAgent:navigator.userAgent,online:navigator.onLine,version:"v16"};
  return data;
}
function buildFolio(){
  var f=form.elements.namedItem("fecha");f=f?f.value:"";
  var m=(form.elements.namedItem("mina")?form.elements.namedItem("mina").value:"MINA").trim().toUpperCase().replace(/\s+/g,"").slice(0,6);
  var g=(form.elements.namedItem("grupo")?form.elements.namedItem("grupo").value:"0").trim().toUpperCase().replace(/\s+/g,"").slice(0,4);
  var d=f?f.replace(/-/g,"").slice(2):"000000";
  return "XM-"+m+"-"+g+"-"+d;
}
function updateFolio(){folioDisplay.textContent=buildFolio();}
function getPayloadSizeBytes(d){return new Blob([JSON.stringify(d)]).size;}
function updateSizeIndicator(d){var b=getPayloadSizeBytes(d);sizeStatus.textContent=formatMB(b)+" / 5 MB";sizeStatus.style.color=b>MAX_REPORT_BYTES?"#ffb4b4":"";}
function validateReportSize(d){if(getPayloadSizeBytes(d)>MAX_REPORT_BYTES){alert("Supera 5 MB.");return false;}return true;}

/* === VALIDATION === */
function collectValidationIssues(){
  var issues=[];
  var val=function(n){var el=form.elements.namedItem(n);return el?el.value.trim():"";};
  if(!val("fecha"))issues.push("Falta fecha.");
  if(!val("turno"))issues.push("Falta turno.");
  if(!val("mina"))issues.push("Falta mina.");
  if(!val("capataz"))issues.push("Falta capataz.");
  containers.art.querySelectorAll(".card-entry").forEach(function(c,i){
    var t=c.querySelector('input[name$="_trabajo"]');t=t?t.value.trim():"";
    var f1=c.querySelector('.preview[id*="_photo_1"]');f1=f1&&f1.dataset.image;
    var f2=c.querySelector('.preview[id*="_photo_2"]');f2=f2&&f2.dataset.image;
    if(t&&(!f1||!f2))issues.push("ART "+(i+1)+": faltan fotos.");
  });
  containers.others.querySelectorAll(".card-entry").forEach(function(c){
    var t=c.querySelector("h4")?c.querySelector("h4").textContent:"";
    if(t.indexOf("Jumbo")>=0){
      var m=c.querySelector('input[name$="_metrosPerforados"]');m=m?m.value.trim():"";
      var ti=c.querySelector('input[name$="_tiros"]');ti=ti?ti.value.trim():"";
      var s=c.querySelector('input[name$="_statusProximoTurno"]');s=s?s.value.trim():"";
      if(!m||!ti||!s)issues.push("Jumbo: faltan metros, tiros o status.");
    }
    if(t.indexOf("Scoop")>=0){var b=c.querySelector('input[name$="_baldadas"]');if(!b||!b.value.trim())issues.push("Scoop: faltan baldadas.");}
    if(t.indexOf("Retro")>=0){var b2=c.querySelector('input[name$="_baldadasRetro"]');if(!b2||!b2.value.trim())issues.push("Retro: faltan baldadas.");}
  });
  return issues;
}
function updateValidationBox(){
  var issues=collectValidationIssues();
  validationBox.className=issues.length?"validation-box warn":"validation-box ok";
  validationBox.textContent=issues.length?issues.join("\n"):"Sin observaciones. Listo para enviar.";
  return issues;
}

/* === KPI === */
function setKpiCardState(id,state){var el=$(id);if(!el)return;el.classList.remove("green","yellow","red");el.classList.add(state);}
function recomputeAll(){updateFolio();var d=getFormData(false);updateSummary(d);updateSizeIndicator(d);updateKPIAndDashboard();updateValidationBox();updateProgressBar();}

function updateKPIAndDashboard(){
  var countReported=function(vals){var c=0;document.querySelectorAll('select[name$="_estado"]').forEach(function(s){
    var card=s.closest(".card-entry");if(!card)return;
    var op=card.querySelector('input[name$="_operador"]');op=op?op.value.trim():"";
    var int=card.querySelector('input[name$="_interno"]');int=int?int.value.trim():"";
    if((op||int)&&vals.indexOf(s.value)>=0)c++;
  });return c;};
  var eqOp=countReported(["Operativo","Operativa"]);
  var eqFS=countReported(["F/S","Con falla"]);
  var artCount=0;containers.art.querySelectorAll(".card-entry").forEach(function(c){var t=c.querySelector('input[name$="_trabajo"]');if(t&&t.value.trim())artCount++;});
  var radios=0;containers.radios.querySelectorAll('input[name$="_recibe"]').forEach(function(i){if(i.value.trim())radios++;});
  var m3S=sumInputs(containers.others,"_cantidadExtraida")+sumInputs(containers.others,"_m3Retro");
  var m2M=sumInputs(containers.activities,"_m2Malla");
  var mJ=sumInputs(containers.others,"_metrosPerforados");
  var pE=sumInputs(containers.others,"_pernosExpansor");
  var pL=sumInputs(containers.jaulas,"_pernosLechados");
  var cL=sumInputs(containers.jaulas,"_cablesLechados");
  var m2H=sumInputs(containers.plataformas,"_m2Hilteo");
  var m2D=sumInputs(containers.others,"_m2Demolidos");
  var m3P=sumInputs(containers.others,"_m3Proyectados");
  var m3B=sumInputs(containers.others,"_m3Bombeados");

  var kpis={kpiEquiposOperativos:eqOp,kpiEquiposFS:eqFS,kpiART:artCount,kpiRadios:radios,
    kpiM3Scoop:m3S.toFixed(2),kpiM2Malla:m2M.toFixed(2),kpiMetrosJumbo:mJ.toFixed(2),kpiPernosExpansor:pE.toFixed(0),
    kpiPernosLechados:pL.toFixed(0),kpiCablesLechados:cL.toFixed(0),kpiM2Hilteo:m2H.toFixed(2),
    kpiM2Demolidos:m2D.toFixed(2),kpiM3Proyectados:m3P.toFixed(2),kpiM3Bombeados:m3B.toFixed(2)};
  for(var id in kpis){var el=$(id);if(el)el.textContent=kpis[id];}

  setKpiCardState("cardEquiposOperativos",eqOp>=6?"green":eqOp>=3?"yellow":"red");
  setKpiCardState("cardEquiposFS",eqFS<=1?"green":eqFS<=2?"yellow":"red");
  setKpiCardState("cardART",artCount>=1?"green":"red");
  setKpiCardState("cardRadios",radios>=1?"green":"yellow");
  setKpiCardState("cardM3Scoop",m3S>=30?"green":m3S>=10?"yellow":"red");
  setKpiCardState("cardM2Malla",m2M>=20?"green":m2M>=5?"yellow":"red");
  setKpiCardState("cardMetrosJumbo",mJ>=50?"green":mJ>=15?"yellow":"red");
  setKpiCardState("cardPernosExpansor",pE>=10?"green":pE>=1?"yellow":"red");
  setKpiCardState("cardPernosLechados",pL>=10?"green":pL>=1?"yellow":"red");
  setKpiCardState("cardCablesLechados",cL>=4?"green":cL>=1?"yellow":"red");
  setKpiCardState("cardM2Hilteo",m2H>=10?"green":m2H>=1?"yellow":"red");
  setKpiCardState("cardM2Demolidos",m2D>=10?"green":m2D>=1?"yellow":"red");
  setKpiCardState("cardM3Proyectados",m3P>=10?"green":m3P>=1?"yellow":"red");
  setKpiCardState("cardM3Bombeados",m3B>=10?"green":m3B>=1?"yellow":"red");

  var mM3=parseFloat((form.elements.namedItem("metaM3Scoop")||{}).value||"0");
  var mM2=parseFloat((form.elements.namedItem("metaM2Malla")||{}).value||"0");
  var mMJ=parseFloat((form.elements.namedItem("metaMetrosJumbo")||{}).value||"0");
  var mMP=parseFloat((form.elements.namedItem("metaPernosExpansor")||{}).value||"0");
  var p1=pct(m3S,mM3),p2=pct(m2M,mM2),p3=pct(mJ,mMJ),p4=pct(pE,mMP);
  var vals=[p1,p2,p3,p4].filter(function(v){return v>0;});
  var cumpl=vals.length?vals.reduce(function(a,b){return a+b;},0)/vals.length:0;
  var totEq=eqOp+eqFS;var disp=totEq?(eqOp/totEq)*100:0;
  var artC=artCount>0?100:0;
  var issues=collectValidationIssues();
  var riesgo="Bajo",rd="Sin alertas";
  if(issues.length>=4||eqFS>=3){riesgo="Alto";rd="Revisar validación";}
  else if(issues.length>=1||eqFS>=2){riesgo="Medio";rd="Existen observaciones";}

  $("dashCumplimiento").textContent=cumpl.toFixed(1)+"%";
  $("dashDetalleProduccion").textContent="Removido "+p1.toFixed(0)+"% | Malla "+p2.toFixed(0)+"% | Jumbo "+p3.toFixed(0)+"%";
  $("dashDisponibilidad").textContent=disp.toFixed(1)+"%";
  $("dashDetalleEquipos").textContent=eqOp+" operativos / "+eqFS+" F/S";
  $("dashART").textContent=artC.toFixed(0)+"%";
  $("dashDetalleART").textContent=artCount?artCount+" ART con control":"Sin ART ingresados";
  $("dashRiesgo").textContent=riesgo;$("dashDetalleRiesgo").textContent=rd;

  var alerts=[];
  if(eqFS>=3)alerts.push("3+ equipos F/S.");
  if(disp<70&&totEq>0)alerts.push("Disponibilidad < 70%.");
  if(cumpl<70&&vals.length>0)alerts.push("Producción bajo meta.");
  if(!artCount)alerts.push("Sin ART registrados.");
  $("alertBox").textContent=alerts.length?alerts.join(" "):"Sin alertas críticas.";

  var bar=function(id,v){var el=$(id);if(el)el.style.width=Math.max(0,Math.min(100,v))+"%";};
  bar("barProduccion",cumpl);bar("barDisponibilidad",disp);bar("barART",artC);
}

/* === SUMMARY === */
function updateSummary(d){
  summaryBox.textContent=["Folio: "+buildFolio(),"Mina: "+(d.mina||"-"),"Fecha: "+(d.fecha||"-"),"Turno: "+(d.turno||"-"),
    "Grupo: "+(d.grupo||"-"),"Capataz: "+(d.capataz||"-"),"Postura: "+(d.postura||"-"),
    "Dotación: "+(d.dotacion||"-"),"Sismicidad: "+(d.sismicidad||"-"),"CNC: "+(d.cnc||"-"),
    "Obs: "+(d.observacionesGenerales||"-")].join("\n");
}

/* === GOOGLE SHEETS SYNC === */
function checkSheetsConfig(){var ready = getSheetsUrl(); var onlineMasters = getMaestrosUrl(); $("sheetsStatus").textContent=ready?"Configurado":"No configurado"; if(onlineMasters && $("sheetsStatus")){$("sheetsStatus").textContent += " | Maestros online";}}
function buildSheetsPayload(){
  var d=getFormData(false);
  var operaciones={folio:buildFolio(),fecha:d.fecha||"",turno:d.turno||"",grupo:d.grupo||"",mina:d.mina||"",capataz:d.capataz||"",
    jefeTurno:d.jefeTurno||"",jefeTerreno:d.jefeTerreno||"",jefeOperaciones:d.jefeOperaciones||"",
    dotacion:d.dotacion||"",postura:d.postura||"",sismicidad:d.sismicidad||"",cnc:d.cnc||"",
    equipos_operativos:$("kpiEquiposOperativos").textContent,equipos_fs:$("kpiEquiposFS").textContent,
    art_count:$("kpiART").textContent,supervisorAprobador:d.supervisorAprobador||"",cierreAprobado:d.cierreAprobado||"",horaCierre:d.horaCierre||""};
  var logistica={folio:buildFolio(),fecha:d.fecha||"",mina:d.mina||"",capataz:d.capataz||""};
  MATERIAL_TYPES.forEach(function(pair,i){var name=pair[0],prefix="mat_"+i+"_";
    logistica[name+"_estatus"]=d[prefix+"estatus"]||"";logistica[name+"_cantidad"]=d[prefix+"cantidad"]||"";
  });
  var kpi={folio:buildFolio(),fecha:d.fecha||"",turno:d.turno||"",mina:d.mina||"",capataz:d.capataz||"",
    m3_removidos:$("kpiM3Scoop").textContent,m2_malla:$("kpiM2Malla").textContent,metros_jumbo:$("kpiMetrosJumbo").textContent,
    cumplimiento:$("dashCumplimiento").textContent,disponibilidad:$("dashDisponibilidad").textContent,riesgo:$("dashRiesgo").textContent};
  return{operaciones:operaciones,logistica:logistica,kpi:kpi};
}
function syncToSheets(){
  var url=getSheetsUrl();if(!url){alert("Configura GOOGLE_SHEETS_URL en config.js.");return;}
  var issues=collectValidationIssues();if(issues.length){updateValidationBox();alert("Revisa validación antes de enviar.");return;}
  if(!navigator.onLine){alert("Sin conexión.");syncStatus.textContent="Sin señal";return;}
  var payload=buildSheetsPayload();syncStatus.textContent="Enviando...";
  fetch(url,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({mode:"multi_sheet",operaciones:payload.operaciones,logistica:payload.logistica,kpi:payload.kpi})})
  .then(function(r){return r.json();}).then(function(result){
    if(result.ok){syncStatus.textContent=new Date().toLocaleString("es-CL");saveStatus.textContent="Enviado a Google Sheets";$("sheetsStatus").textContent="Sincronizado";hasUnsavedChanges=false;localStorage.setItem(STORAGE_KEY,JSON.stringify(getFormData(true)));}
    else throw new Error(result.error||"Error");
  }).catch(function(err){syncStatus.textContent="Error envío";alert("Error: "+err.message);});
}

/* === EXPORTS === */
function exportPdf(){
  var issues=collectValidationIssues();if(issues.length){updateValidationBox();alert("Revisa validación.");return;}
  var jsPDF=window.jspdf.jsPDF;var doc=new jsPDF();
  doc.setFontSize(14);doc.text("Xtreme Mining Informe Capataces",14,16);doc.setFontSize(10);
  var y=26;summaryBox.textContent.split("\n").forEach(function(line){var w=doc.splitTextToSize(line,180);doc.text(w,14,y);y+=w.length*6;if(y>270){doc.addPage();y=16;}});
  doc.save(buildFolio()+".pdf");
}
function downloadBlob(c,f,t){var b=new Blob([c],{type:t}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=f;a.click();URL.revokeObjectURL(a.href);}
function exportFlatCsv(){
  var d=getFormData(false);
  var r={folio:buildFolio(),fecha:d.fecha||"",turno:d.turno||"",mina:d.mina||"",capataz:d.capataz||"",
    m3_removidos:$("kpiM3Scoop").textContent,m2_malla:$("kpiM2Malla").textContent,metros_jumbo:$("kpiMetrosJumbo").textContent};
  var h=Object.keys(r),v=h.map(function(k){return'"'+String(r[k]).replace(/"/g,'""')+'"';});
  downloadBlob(h.join(",")+"\n"+v.join(","),buildFolio()+"_powerbi.csv","text/csv;charset=utf-8;");
}
function exportJson(){var d=getFormData(true);if(!validateReportSize(d))return;downloadBlob(JSON.stringify(d,null,2),"informe_"+(d.fecha||new Date().toISOString().slice(0,10))+".json","application/json");}
function importJson(e){
  var f=e.target.files&&e.target.files[0];if(!f)return;
  var reader=new FileReader();reader.onload=function(){try{var d=JSON.parse(reader.result);if(!validateReportSize(d))return;localStorage.setItem(STORAGE_KEY,JSON.stringify(d));location.reload();}catch(err){alert("JSON inválido.");}};
  reader.readAsText(f);
}

/* === HISTORY === */
function getHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");}catch(e){return[];}}
function getFilteredHistory(){
  var h=getHistory(),m=normalizeText($("filterMina")?$("filterMina").value:""),c=normalizeText($("filterCapataz")?$("filterCapataz").value:""),
    d=$("filterDesde")?$("filterDesde").value:"",u=$("filterHasta")?$("filterHasta").value:"";
  return h.filter(function(r){return(!m||normalizeText(r.mina).indexOf(m)>=0)&&(!c||normalizeText(r.capataz).indexOf(c)>=0)&&(!d||r.fecha>=d)&&(!u||r.fecha<=u);});
}
function saveToHistory(){
  if(collectValidationIssues().length){updateValidationBox();alert("Corrige validación primero.");return;}
  var h=getHistory();
  h.unshift({folio:buildFolio(),fecha:(form.elements.namedItem("fecha")||{}).value||"",turno:(form.elements.namedItem("turno")||{}).value||"",
    mina:(form.elements.namedItem("mina")||{}).value||"",capataz:(form.elements.namedItem("capataz")||{}).value||"",
    kpi_m3:$("kpiM3Scoop").textContent,kpi_m2:$("kpiM2Malla").textContent,kpi_metros:$("kpiMetrosJumbo").textContent,
    equipos_fs:$("kpiEquiposFS").textContent,disponibilidad:$("dashDisponibilidad").textContent.replace("%",""),
    saved_at:new Date().toLocaleString("es-CL")});
  localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,50)));renderHistory();renderConsolidated();
}
function clearHistory(){if(!confirm("¿Eliminar historial?"))return;localStorage.removeItem(HISTORY_KEY);renderHistory();renderConsolidated();}
function renderHistory(){
  var list=$("historyList"),h=getHistory();
  if(!h.length){list.textContent="Sin registros.";return;}
  list.innerHTML=h.map(function(r){return'<div class="history-item"><strong>'+r.folio+'</strong><br>'+r.fecha+' | '+r.turno+' | '+r.mina+'<br>Capataz: '+r.capataz+'<br>m3: '+r.kpi_m3+' | m2: '+r.kpi_m2+' | metros: '+r.kpi_metros+'<br>'+r.saved_at+'</div>';}).join("");
}
function renderConsolidated(){
  var data=getFilteredHistory(),total=data.length;
  var sum=function(k){return data.reduce(function(a,r){return a+parseFloat(r[k]||"0");},0);};
  var m3=sum("kpi_m3"),m2=sum("kpi_m2"),mt=sum("kpi_metros");
  var disp=total?data.reduce(function(a,r){return a+parseFloat(r.disponibilidad||"0");},0)/total:0;
  var fs=total?data.reduce(function(a,r){return a+parseFloat(r.equipos_fs||"0");},0)/total:0;
  $("consInformes").textContent=total;$("consM3").textContent=m3.toFixed(2);$("consM2").textContent=m2.toFixed(2);
  $("consMetros").textContent=mt.toFixed(2);$("consDisp").textContent=disp.toFixed(1)+"%";$("consFS").textContent=fs.toFixed(2);
  var byCap={},byMina={};data.forEach(function(r){var c=r.capataz||"-",mi=r.mina||"-",p=parseFloat(r.kpi_m3||"0")+parseFloat(r.kpi_metros||"0");byCap[c]=(byCap[c]||0)+p;byMina[mi]=(byMina[mi]||0)+p;});
  var tc=Object.entries(byCap).sort(function(a,b){return b[1]-a[1];})[0];
  var tm=Object.entries(byMina).sort(function(a,b){return b[1]-a[1];})[0];
  $("consTopCapataz").textContent=tc?tc[0]:"-";$("consTopDetalle").textContent=tc?"Prod: "+tc[1].toFixed(2):"Sin datos";
  $("consTopMina").textContent=tm?tm[0]:"-";$("consTopMinaDetalle").textContent=tm?"Prod: "+tm[1].toFixed(2):"Sin datos";
  var ranking=Object.entries(byCap).sort(function(a,b){return b[1]-a[1];});
  var rb=$("rankingCapataz");if(!ranking.length){rb.textContent="Sin ranking.";return;}
  rb.innerHTML='<table class="consolidated-table"><thead><tr><th>#</th><th>Capataz</th><th>Producción</th></tr></thead><tbody>'+ranking.map(function(r,i){return'<tr><td>'+(i+1)+'</td><td>'+r[0]+'</td><td>'+r[1].toFixed(2)+'</td></tr>';}).join("")+'</tbody></table>';
}
function resetConsolidatedFilters(){$("filterMina").value="";$("filterCapataz").value="";$("filterDesde").value="";$("filterHasta").value="";renderConsolidated();}
function exportConsolidatedCsv(){
  var d=getFilteredHistory();if(!d.length){alert("Sin datos.");return;}
  var h=Object.keys(d[0]),rows=d.map(function(r){return h.map(function(k){return'"'+String(r[k]||"").replace(/"/g,'""')+'"';}).join(",");});
  downloadBlob(h.join(",")+"\n"+rows.join("\n"),"consolidado_"+new Date().toISOString().slice(0,10)+".csv","text/csv;charset=utf-8;");
}

/* === SAVE/LOAD === */
function saveData(){var d=getFormData(true);if(!validateReportSize(d))return;localStorage.setItem(STORAGE_KEY,JSON.stringify(d));saveStatus.textContent="Guardado offline";hasUnsavedChanges=false;recomputeAll();}
function loadData(){
  var raw=localStorage.getItem(STORAGE_KEY);if(!raw){recomputeAll();return;}
  try{
    var d=JSON.parse(raw);
    Object.keys(d).forEach(function(k){var f=form.elements.namedItem(k);if(f&&typeof d[k]==="string")f.value=d[k];});
    Object.keys(d).forEach(function(k){
      if(k.indexOf("preview_")===0&&d[k]&&d[k].image){var p=$(k);if(p){p.innerHTML='<img src="'+d[k].image+'" alt="evidencia"><small>'+d[k].timestamp+'</small>';p.dataset.image=d[k].image;p.dataset.timestamp=d[k].timestamp;}}
    });
    saveStatus.textContent="Datos recuperados";
    if (maestrosData) applyMaestrosToForm();
  }catch(e){saveStatus.textContent="Error carga";}
  recomputeAll();
}
function clearAll(){if(!confirm("¿Borrar formulario?"))return;localStorage.removeItem(STORAGE_KEY);location.reload();}
function updateNetworkStatus(){$("networkStatus").textContent=navigator.onLine?"En línea":"Offline";}
