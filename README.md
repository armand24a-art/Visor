# Visor de capas vectoriales

Visor web de mapas para México construido con [Leaflet](https://leafletjs.com/). Permite cargar capas vectoriales (GeoJSON y Shapefile), activar/desactivarlas, cambiar el mapa base y consultar los atributos de cada elemento al pasar el cursor.

## Estructura

```
├── index.html              # Página principal
├── css/
│   └── style.css           # Estilos de la interfaz
├── js/
│   └── app.js              # Lógica del visor (Leaflet)
└── data/
    ├── zonas_mexico.geojson      # Ejemplo de polígonos
    └── ciudades_mexico.geojson   # Ejemplo de puntos
```

## Funcionalidades

- **Título:** "Visor de capas vectoriales"
- **Panel de capas:** activa/desactiva capas, cambia el color, enfoca, elimina y carga archivos nuevos.
- **Carga de datos:** GeoJSON (`.geojson`, `.json`) y Shapefile (`.zip` con `.shp`, `.shx`, `.dbf`, `.prj` o `.shp` individual).
- **Mapas base:** OpenStreetMap, Google Earth (satélite) y Topográfica (Esri).
- **Ventana flotante al pasar el cursor:** muestra los atributos del polígono, línea o punto bajo el puntero; desaparece al salir.
- **Al hacer clic:** ventana emergente con la tabla completa de atributos.
- **Variables temáticas:** si la capa tiene atributos numéricos, se puede elegir una variable para colorear los elementos por rangos (mapa coroplético) con su leyenda.

## Cómo publicar en GitHub Pages

1. Crea un repositorio en GitHub (por ejemplo `visor-capas`).
2. Sube estos archivos al repositorio (rama `main`):
   ```bash
   git init
   git add .
   git commit -m "Visor de capas vectoriales"
   git remote add origin https://github.com/TU_USUARIO/visor-capas.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages**.
4. En **Build and deployment** elige *Deploy from a branch*.
5. Selecciona la rama `main` y la carpeta `/ (root)`.
6. Guarda. El sitio quedará publicado en:
   `https://TU_USUARIO.github.io/visor-capas/`

> Nota: las capas de ejemplo se cargan con `fetch` relativo, por lo que la página debe servirse por HTTP(S) (GitHub Pages o un servidor local como `python -m http.server`); abrir el `index.html` directamente con doble clic no cargará los ejemplos.

## Agregar tus propias capas

Coloca archivos GeoJSON en `data/` y carga un segundo archivo en `js/app.js`, o simplemente usa el botón **"Cargar capa"** desde la interfaz.

Formatos de archivos vectoriales recomendados:

| Formato | Archivo |
|---|---|
| GeoJSON | `capa.geojson` o `capa.json` |
| Shapefile | `capa.zip` (conteniendo `capa.shp`, `capa.shx`, `capa.dbf`, `capa.prj`) |

## Créditos

- Leaflet 1.9.4
- shpjs 4.0.4
- Tiles: OpenStreetMap, Google Earth, Esri World Topo
