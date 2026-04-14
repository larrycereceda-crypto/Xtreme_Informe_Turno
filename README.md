# Xtreme Mining — Informe Capataces v16

Sistema de informes operacionales para minería subterránea con soporte offline, sincronización a Google Sheets y deploy automático via GitHub Pages.

## Estructura del proyecto

```
├── index.html              # App principal (3 hojas/tabs)
├── style.css               # Estilos con dark mode y mobile-first
├── app.js                  # Lógica de negocio + sync Google Sheets
├── config.js               # URL de Google Sheets Web App
├── backend.gs              # Google Apps Script (copiar a Sheets)
├── appsscript.json         # Manifiesto Apps Script
├── service-worker.js       # PWA offline
├── manifest.webmanifest    # PWA manifest
└── .github/workflows/
    └── deploy.yml          # CI/CD GitHub Pages
```

## Hojas del informe

| Hoja | Secciones | Hoja Google Sheets |
|------|-----------|-------------------|
| **Operaciones** | General, ART, Equipos, Actividades, Pendientes | `Operaciones` |
| **Logística** | Materiales, Herramientas, Gestión de sitio | `Logística` |
| **KPI / Dashboard** | KPI, Dashboard, Metas, Resumen, Validación, Cierre, Historial, Consolidado | `KPI` |

## Setup con VS Code

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/xtreme-mining-informe.git
cd xtreme-mining-informe
```

### 2. Abrir en VS Code

```bash
code .
```

### 3. Instalar Live Server

1. En VS Code, ir a **Extensiones** (Ctrl+Shift+X)
2. Buscar **"Live Server"** de Ritwick Dey
3. Instalar
4. Click derecho en `index.html` → **"Open with Live Server"**

### 4. Desarrollo

- Editar archivos → Live Server recarga automáticamente
- Los datos se guardan en `localStorage` del navegador
- Funciona 100% offline

## Setup Google Sheets (Backend)

### 1. Crear el Spreadsheet

1. Ir a [Google Sheets](https://sheets.google.com) → crear nuevo
2. Nombrar: "Xtreme Mining Informes"

### 2. Agregar el Script

1. **Extensiones → Apps Script**
2. Borrar el contenido de `Code.gs`
3. Copiar y pegar TODO el contenido de `backend.gs`
4. Guardar (Ctrl+S)

### 3. Deploy del Web App

1. **Deploy → New deployment**
2. Tipo: **Web app**
3. Description: "Informe Capataces v16"
4. Execute as: **Me**
5. Who has access: **Anyone**
6. Click **Deploy**
7. **Copiar la URL** (ejemplo: `https://script.google.com/macros/s/AKfycbx.../exec`)

### 4. Configurar la URL en el proyecto

Editar `config.js`:

```javascript
window.APP_CONFIG = {
  GOOGLE_SHEETS_URL: "https://script.google.com/macros/s/AKfycbx.../exec",
  ENABLE_ONLINE_MODE: true
};
```

### 5. Probar

1. Abrir la app con Live Server
2. Llenar datos de prueba
3. Click **"Enviar a Google Sheets"**
4. Verificar que aparecen 3 hojas: `Operaciones`, `Logística`, `KPI`

## Deploy con GitHub Pages

### 1. Crear repositorio en GitHub

```bash
git init
git add .
git commit -m "v16 - tabs + Google Sheets"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/xtreme-mining-informe.git
git push -u origin main
```

### 2. Activar GitHub Pages

1. Ir al repositorio en GitHub
2. **Settings → Pages**
3. Source: **GitHub Actions**
4. El workflow `deploy.yml` se ejecutará automáticamente en cada push

### 3. Acceder a la app

Tu app estará en: `https://TU_USUARIO.github.io/xtreme-mining-informe/`

## Flujo de trabajo diario

```
Capataz abre la app en celular/tablet
       ↓
Llena Hoja 1 (Operaciones) → General, ART, Equipos, Actividades
       ↓
Llena Hoja 2 (Logística) → Materiales, Herramientas, Fotos sitio
       ↓
Revisa Hoja 3 (KPI) → Dashboard automático, valida, cierra
       ↓
Click "Enviar a Google Sheets" → Datos van a 3 hojas automáticamente
       ↓
Jefe de Operaciones revisa en Google Sheets desde cualquier lugar
```

## Funcionalidades

- **3 hojas organizadas** para separar operaciones, logística y métricas
- **Modo oscuro** persistente
- **Auto-guardado** cada 30 segundos
- **Paneles colapsables** que recuerdan su estado
- **KPI inteligentes**: solo cuentan equipos reportados y ART con datos
- **Google Sheets multi-hoja**: datos se distribuyen automáticamente
- **PWA offline**: funciona sin conexión
- **GitHub Pages**: deploy automático con CI/CD
- **Responsive mobile-first**: bottom nav, sidebar drawer, touch-optimized

## Requisitos

- Navegador moderno (Chrome, Edge, Safari, Firefox)
- Cuenta Google (para Google Sheets)
- Cuenta GitHub (para deploy)
- VS Code + Live Server (para desarrollo)


## Maestros para listas desplegables (offline + online)

Este paquete incluye `data_maestros.json` generado desde `Informacion(1).xlsx`.

### Campos con lista desplegable
- Turno
- Grupo
- Mina
- Capataz
- Jefe de Turno
- Jefe de Terreno
- Jefe de Operaciones

### Modo offline
No requiere internet. La app carga `data_maestros.json` localmente.

### Modo online
1. Sube a Google Sheets las hojas:
   - Capataces
   - Jefes de turno
   - Jefe Terreno
   - Jefe Operaciones
   - Mina
   - Jornada
2. Reemplaza `backend.gs` por la versión v22.
3. Publica de nuevo el Web App.
4. En `config.js` configura:
```javascript
window.APP_CONFIG = {
  GOOGLE_SHEETS_URL: "TU_URL_WEBAPP",
  ENABLE_ONLINE_MODE: true,
  MAESTROS_URL: "TU_URL_WEBAPP?action=maestros",
  ENABLE_ONLINE_MAESTROS: true
};
```

### Comportamiento
- Sin internet: usa `data_maestros.json`
- Con internet y `MAESTROS_URL` configurado: refresca maestros online
- Si falla internet: mantiene el catálogo local/cacheado

