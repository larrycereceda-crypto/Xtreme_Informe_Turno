/**
 * Xtreme Mining — Backend Google Apps Script v16
 * 
 * Recibe datos del formulario web y los distribuye en 3 hojas:
 *   1. "Operaciones"  → Información general, ART, equipos, actividades, cierre
 *   2. "Logística"    → Materiales, herramientas
 *   3. "KPI"          → Métricas de producción, dashboard, metas
 *
 * INSTRUCCIONES DE DEPLOY:
 * 1. Abre Google Sheets → Extensiones → Apps Script
 * 2. Pega este código completo en Code.gs
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copia la URL y pégala en config.js → GOOGLE_SHEETS_URL
 */

const SHEET_OPERACIONES = "Operaciones";
const SHEET_LOGISTICA = "Logística";
const SHEET_KPI = "KPI";
const SHEET_RAW = "raw_json";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (body.mode === "multi_sheet") {
      // Hoja 1: Operaciones
      if (body.operaciones) {
        const sheet = getOrCreateSheet_(ss, SHEET_OPERACIONES);
        appendObjectRow_(sheet, body.operaciones);
      }

      // Hoja 2: Logística
      if (body.logistica) {
        const sheet = getOrCreateSheet_(ss, SHEET_LOGISTICA);
        appendObjectRow_(sheet, body.logistica);
      }

      // Hoja 3: KPI
      if (body.kpi) {
        const sheet = getOrCreateSheet_(ss, SHEET_KPI);
        appendObjectRow_(sheet, body.kpi);
      }

      // Raw JSON backup
      const rawSheet = getOrCreateSheet_(ss, SHEET_RAW);
      rawSheet.appendRow([
        new Date(),
        body.operaciones?.folio || "",
        JSON.stringify(body)
      ]);

      return jsonResponse_({
        ok: true,
        folio: body.operaciones?.folio || "",
        sheets: [SHEET_OPERACIONES, SHEET_LOGISTICA, SHEET_KPI]
      });
    }

    // Legacy: single sheet mode
    if (body.mode === "append_report") {
      const sheet = getOrCreateSheet_(ss, "informes");
      appendObjectRow_(sheet, body.row || {});
      const rawSheet = getOrCreateSheet_(ss, SHEET_RAW);
      rawSheet.appendRow([new Date(), (body.row || {}).folio || "", JSON.stringify(body.raw || {})]);
      return jsonResponse_({ ok: true, folio: (body.row || {}).folio || "" });
    }

    return jsonResponse_({ ok: false, error: "Modo no soportado" });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : "";
  if (action === "maestros") {
    return jsonResponse_({
      ok: true,
      version: "v22",
      maestros: getMaestrosData_()
    });
  }
  return jsonResponse_({
    ok: true,
    status: "running",
    version: "v22",
    sheets: [SHEET_OPERACIONES, SHEET_LOGISTICA, SHEET_KPI]
  });
}

function getMaestrosData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    version: "v22",
    minas: readSingleColumnSheet_(ss, "Mina", true),
    jornadas: readSingleColumnSheet_(ss, "Jornada", false).map(function(v) {
      const value = String(v || "").trim().toUpperCase();
      if (value === "DIA") return "Día";
      if (value === "NOCHE") return "Noche";
      return v;
    }),
    grupos: getUniqueByKey_(readObjectsFromSheet_(ss, "Capataces"), "GRUPO")
      .concat(getUniqueByKey_(readObjectsFromSheet_(ss, "Jefes de turno"), "GRUPO"))
      .filter(onlyUnique_),
    capataces: readObjectsFromSheet_(ss, "Capataces").map(function(r) {
      return { nombre: pickValue_(r, ["NOMBRE"]), cargo: pickValue_(r, ["CARGO"]), grupo: pickValue_(r, ["GRUPO"]) };
    }).filter(function(r) { return r.nombre; }),
    jefesTurno: readObjectsFromSheet_(ss, "Jefes de turno").map(function(r) {
      return { nombre: pickValue_(r, ["NOMBRE"]), cargo: pickValue_(r, ["TURNO","CARGO"]), grupo: pickValue_(r, ["GRUPO"]) };
    }).filter(function(r) { return r.nombre; }),
    jefesTerreno: readRowsNoHeader_(ss, "Jefe Terreno", ["nombre","cargo"]).map(function(r) {
      return { nombre: r.nombre, cargo: r.cargo };
    }).filter(function(r) { return r.nombre; }),
    jefesOperaciones: readObjectsFromSheet_(ss, "Jefe Operaciones").map(function(r) {
      return { nombre: pickValue_(r, ["NOMBRE"]), cargo: pickValue_(r, ["CARGO"]) };
    }).filter(function(r) { return r.nombre; })
  };
}

function readRowsNoHeader_(ss, name, keys) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() === 0) return [];
  const values = sh.getDataRange().getDisplayValues();
  return values.map(function(row) {
    const obj = {};
    keys.forEach(function(key, index) { obj[key] = String(row[index] || "").trim(); });
    return obj;
  }).filter(function(obj) {
    return Object.keys(obj).some(function(key) { return obj[key]; });
  });
}

function readSingleColumnSheet_(ss, name, skipHeader) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() === 0) return [];
  const values = sh.getRange(1, 1, sh.getLastRow(), 1).getDisplayValues().flat().map(function(v) { return String(v || "").trim(); }).filter(String);
  return skipHeader ? values.slice(1) : values;
}

function readObjectsFromSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() === 0 || sh.getLastColumn() === 0) return [];
  const data = sh.getDataRange().getDisplayValues();
  if (data.length === 0) return [];
  let headers = data[0].map(function(h, i) { return String(h || "").trim() || String.fromCharCode(65 + i); });
  if (headers[0] === "" || headers[0] === "A") {
    headers = headers.map(function(h, i) { return h || String.fromCharCode(65 + i); });
  }
  return data.slice(1).map(function(row) {
    const obj = {};
    headers.forEach(function(h, i) { obj[h] = String(row[i] || "").trim(); });
    return obj;
  }).filter(function(obj) {
    return Object.keys(obj).some(function(key) { return obj[key]; });
  });
}

function pickValue_(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var value = obj[keys[i]];
    if (value) return value;
  }
  return "";
}

function getUniqueByKey_(rows, key) {
  return rows.map(function(r) { return String(r[key] || "").trim(); }).filter(String);
}

function onlyUnique_(value, index, array) {
  return array.indexOf(value) === index;
}

/**
 * Obtiene o crea una hoja en el spreadsheet.
 * Si es nueva, aplica formato básico al header.
 */
function getOrCreateSheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    // Formato header
    sh.getRange("1:1").setFontWeight("bold").setBackground("#123c7b").setFontColor("#ffffff");
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * Agrega una fila a la hoja. Si hay columnas nuevas, las agrega al header.
 * Previene duplicados si el folio ya existe en la misma fecha.
 */
function appendObjectRow_(sheet, obj) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return;

  // Si la hoja está vacía, crear header
  if (sheet.getLastRow() === 0) {
    // Agregar timestamp como primera columna
    sheet.appendRow(["timestamp", ...keys]);
    sheet.getRange("1:1").setFontWeight("bold").setBackground("#123c7b").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }

  // Obtener header actual
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Agregar columnas faltantes
  const missing = keys.filter(k => !header.includes(k));
  if (missing.length) {
    const startCol = header.length + 1;
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
    sheet.getRange(1, startCol, 1, missing.length).setFontWeight("bold").setBackground("#123c7b").setFontColor("#ffffff");
  }

  // Re-leer header final
  const finalHeader = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Construir fila
  const row = finalHeader.map(h => {
    if (h === "timestamp") return new Date();
    return obj[h] ?? "";
  });

  sheet.appendRow(row);

  // Auto-resize columns (solo primeras 10 para performance)
  try {
    const colCount = Math.min(finalHeader.length, 10);
    for (let i = 1; i <= colCount; i++) {
      sheet.autoResizeColumn(i);
    }
  } catch (e) {
    // Ignore resize errors
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Función de utilidad para limpiar datos antiguos.
 * Ejecutar manualmente desde el editor de Apps Script.
 */
function cleanOldData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const raw = ss.getSheetByName(SHEET_RAW);
  if (!raw || raw.getLastRow() <= 1) return;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6); // Mantener 6 meses

  const data = raw.getDataRange().getValues();
  const rowsToDelete = [];
  for (let i = data.length - 1; i >= 1; i--) {
    const date = new Date(data[i][0]);
    if (date < cutoff) rowsToDelete.push(i + 1);
  }
  rowsToDelete.forEach(r => raw.deleteRow(r));

  Logger.log(`Eliminadas ${rowsToDelete.length} filas antiguas de raw_json`);
}
