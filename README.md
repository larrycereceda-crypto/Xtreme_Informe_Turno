# Reporte turno Capataz — v24

Proyecto web instalable (PWA) para reportes de turno con soporte offline y conexión en vivo a Google Sheets.

## Incluye
- App instalable en Android, Windows y algunos navegadores de escritorio
- Funciona sin internet con `data_maestros.json`
- Sincronización manual a Google Sheets
- Maestros online para listas desplegables
- Mejoras de velocidad:
  - íconos locales
  - carga diferida de PDF
  - caché actualizado
  - preload de logo y maestros

## Archivos principales
- `index.html`
- `app.js`
- `style.css`
- `config.js`
- `service-worker.js`
- `manifest.webmanifest`
- `logo.jpg`
- `icon-192.png`
- `icon-512.png`
- `apple-touch-icon.png`
- `data_maestros.json`
- `backend.gs`

## Dejarla instalable en el celular
1. Sube todos los archivos al repo GitHub.
2. Verifica que también subiste:
   - `manifest.webmanifest`
   - `icon-192.png`
   - `icon-512.png`
   - `apple-touch-icon.png`
3. Abre la web publicada en Chrome Android.
4. Presiona el botón **Instalar app** o usa el menú del navegador y luego **Instalar aplicación**.

## Conectar Google Sheets en vivo
1. Crea una hoja en Google Sheets.
2. Abre **Extensiones > Apps Script**.
3. Copia el contenido de `backend.gs`.
4. Publica como **Web app** con acceso **Anyone**.
5. Copia la URL del Web App.
6. En `config.js` completa:

```javascript
window.APP_CONFIG = {
  GOOGLE_SHEETS_URL: "TU_URL_WEBAPP",
  ENABLE_ONLINE_MODE: true,
  MAESTROS_URL: "TU_URL_WEBAPP?action=maestros",
  ENABLE_ONLINE_MAESTROS: true
};
```

## Qué hace cada conexión
- `GOOGLE_SHEETS_URL`: guarda el informe
- `MAESTROS_URL`: refresca minas, grupos y personal en vivo

## Publicar en GitHub Pages
1. Sube los archivos a la raíz del repo.
2. Ve a **Settings > Pages**.
3. Usa **Deploy from a branch**.
4. Branch: `main`
5. Folder: `/ (root)`

## Nota
Si cambias archivos y no ves los cambios, usa `Ctrl + F5` o borra el caché del sitio.
