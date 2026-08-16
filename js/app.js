(function () {
  'use strict';

  var PALETA = [
    '#3a7bd5', '#e07a5f', '#81b29a', '#e9c46a', '#f4a261',
    '#a78bfa', '#2a9d8f', '#e63946', '#457b9d', '#f4845f'
  ];
  var RAMPA = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'];
  var NUM_CLASES = 5;
  var MAX_TOOLTIP_PROPS = 4;

  var map = L.map('map', { zoomControl: true }).setView([23.6, -102.5], 5);

  var baseMaps = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }),
    google: L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Earth'
    }),
    topo: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '&copy; Esri, USGS'
    })
  };
  baseMaps.osm.addTo(map);

  var capas = [];
  var idContador = 0;
  var colorContador = 0;
  var colorGlobal = '#3a7bd5';

  function nuevoColor() {
    var c = PALETA[colorContador % PALETA.length];
    colorContador++;
    return c;
  }

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatearValor(v) {
    if (typeof v === 'number') {
      return Number.isInteger(v) ? v.toLocaleString('es-MX') : v.toLocaleString('es-MX', { maximumFractionDigits: 2 });
    }
    if (v && typeof v === 'object') {
      try { return JSON.stringify(v); } catch (e) { return ''; }
    }
    return v == null ? 'Sin dato' : String(v);
  }

  function estilosClase(layer, color, dimensiones) {
    if (dimensiones === 1) {
      return { color: '#333', weight: 1, fillColor: color, fillOpacity: 0.5, radius: 6 };
    }
    if (dimensiones === 2) {
      return { color: '#333', weight: 1, fillColor: color, fillOpacity: 0.5 };
    }
    return { color: color, weight: 1.6, fill: false };
  }

  function clasificarValores(valores) {
    var orden = valores.slice().sort(function (a, b) { return a - b; });
    var clases = [];
    for (var i = 0; i < NUM_CLASES; i++) {
      var idx = Math.floor((orden.length - 1) * (i / NUM_CLASES));
      var idx2 = Math.floor((orden.length - 1) * ((i + 1) / NUM_CLASES));
      if (i > 0 && idx <= clases[clases.length - 1].min) idx = clases[clases.length - 1].min + 1;
      if (idx2 < idx) idx2 = idx;
      clases.push({ min: orden[idx], max: orden[idx2], color: RAMPA[i] });
    }
    return clases;
  }

  function colorParaValor(clases, valor) {
    for (var i = 0; i < clases.length; i++) {
      var c = clases[i];
      if (valor >= c.min && (valor <= c.max)) return c.color;
    }
    return clases[clases.length - 1].color;
  }

  function propiedadesNumericas(features) {
    var candidatos = {};
    features.forEach(function (f) {
      var p = f.properties || {};
      Object.keys(p).forEach(function (k) {
        var v = p[k];
        if (typeof v === 'number' && isFinite(v)) {
          candidatos[k] = (candidatos[k] || 0) + 1;
        }
      });
    });
    var total = features.length;
    var res = [];
    Object.keys(candidatos).forEach(function (k) {
      if (candidatos[k] >= total * 0.5) res.push(k);
    });
    return res;
  }

  function contenidoTooltip(feature, nombreCapa) {
    var props = feature.properties || {};
    var claves = Object.keys(props);
    var clavesFiltradas = claves.filter(function (k) {
      var v = props[k];
      return v !== null && v !== undefined && typeof v !== 'object';
    });
    var titulo = clavesFiltradas.length ? props[clavesFiltradas[0]] : nombreCapa;
    var resto = clavesFiltradas.slice(1, 1 + MAX_TOOLTIP_PROPS);
    var html = '<div class="tt-titulo">' + escapar(titulo) + '</div>';
    resto.forEach(function (k) {
      html += '<div class="tt-fila"><span>' + escapar(k) + '</span><span>' + escapar(formatearValor(props[k])) + '</span></div>';
    });
    if (clavesFiltradas.length > 1 + MAX_TOOLTIP_PROPS) {
      html += '<div class="tt-fila"><span style="color:#7c8aa0">Haz clic para ver todos los datos</span></div>';
    }
    return html;
  }

  function contenidoPopup(feature, nombreCapa) {
    var props = feature.properties || {};
    var claves = Object.keys(props);
    var clavesFiltradas = claves.filter(function (k) {
      return props[k] !== null && props[k] !== undefined;
    });
    var titulo = clavesFiltradas.length ? props[clavesFiltradas[0]] : nombreCapa;
    var html = '<div class="popup-tabla"><div class="pt-titulo">' + escapar(titulo) + '</div><table>';
    clavesFiltradas.slice(1).forEach(function (k) {
      html += '<tr><td>' + escapar(k) + '</td><td>' + escapar(formatearValor(props[k])) + '</td></tr>';
    });
    if (feature.geometry && feature.geometry.type === 'Point') {
      var c = feature.geometry.coordinates;
      html += '<tr><td>Lat</td><td>' + c[1].toFixed(6) + '</td></tr><tr><td>Lon</td><td>' + c[0].toFixed(6) + '</td></tr>';
    }
    html += '</table></div>';
    return html;
  }

  function estiloCapa(meta) {
    var dimensiones = meta.dimensiones;
    return function (feature) {
      if (meta.variable && meta.clases) {
        var valor = feature.properties ? +feature.properties[meta.variable] : NaN;
        if (!isNaN(valor)) {
          var base = estilosClase(meta, colorParaValor(meta.clases, valor), dimensiones);
          base.fillOpacity = 0.65;
          return base;
        }
      }
      return estilosClase(meta, meta.color, dimensiones);
    };
  }

  function crearGeoJson(meta) {
    var g = L.geoJSON(meta.geojson, {
      style: estiloCapa(meta),
      onEachFeature: function (feature, layer) {
        layer.bindTooltip(function () {
          return contenidoTooltip(feature, meta.nombre);
        }, {
          sticky: true,
          direction: 'top',
          className: 'tooltip-personalizado',
          opacity: 1
        });
        layer.on('click', function () {
          layer.bindPopup(contenidoPopup(feature, meta.nombre), { maxWidth: 280 }).openPopup();
        });
      }
    });
    meta.geoJson = g;
    meta.grupo = L.layerGroup([g]);
    return g;
  }

  function dimensionesGeoJson(geojson) {
    if (!geojson || !geojson.features || !geojson.features.length) return 0;
    var t = geojson.features[0].geometry ? geojson.features[0].geometry.type : '';
    if (t === 'Point' || t === 'MultiPoint') return 1;
    if (t === 'LineString' || t === 'MultiLineString') return 3;
    return 2;
  }

  function agregarCapa(geojson, nombre) {
    var meta = {
      id: 'capa-' + (++idContador),
      nombre: nombre,
      geojson: geojson,
      color: nuevoColor(),
      dimensiones: dimensionesGeoJson(geojson),
      variable: null,
      clases: null,
      grupo: null,
      geoJson: null,
      visibles: true
    };
    meta.numericos = propiedadesNumericas(geojson.features || []);
    crearGeoJson(meta);
    capas.push(meta);
    actualizarContadorCapas();
    renderListaCapas();
    renderLeyenda();
    return meta;
  }

  function setColor(meta, color) {
    meta.color = color;
    if (meta.variable) return;
    meta.geoJson.setStyle(estiloCapa(meta));
    renderLeyenda();
  }

  function setVariable(meta, variable) {
    meta.variable = variable || null;
    if (meta.variable) {
      var valores = [];
      meta.geojson.features.forEach(function (f) {
        var v = f.properties ? +f.properties[meta.variable] : NaN;
        if (!isNaN(v)) valores.push(v);
      });
      meta.clases = clasificarValores(valores);
    } else {
      meta.clases = null;
    }
    meta.geoJson.setStyle(estiloCapa(meta));
    renderLeyenda();
  }

  function toggleCapa(meta, visible) {
    meta.visibles = visible;
    if (visible) {
      if (!map.hasLayer(meta.grupo)) map.addLayer(meta.grupo);
    } else if (map.hasLayer(meta.grupo)) {
      map.removeLayer(meta.grupo);
    }
    actualizarContadorCapas();
    renderLeyenda();
  }

  function zoomACapa(meta) {
    if (meta.geoJson.getBounds().isValid()) {
      map.fitBounds(meta.geoJson.getBounds(), { padding: [30, 30] });
    }
  }

  function eliminarCapa(meta) {
    map.removeLayer(meta.grupo);
    capas = capas.filter(function (c) { return c.id !== meta.id; });
    actualizarContadorCapas();
    renderListaCapas();
    renderLeyenda();
  }

  function renderListaCapas() {
    var cont = document.getElementById('lista-capas');
    if (!capas.length) {
      cont.innerHTML = '<p class="aviso">Aún no hay capas cargadas. Carga un archivo o usa las capas de ejemplo.</p>';
      return;
    }
    cont.innerHTML = '';
    capas.forEach(function (meta) {
      var fila = document.createElement('div');
      fila.className = 'item-capa';

      var check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = meta.visibles;
      check.title = 'Activar / desactivar capa';

      var sw = document.createElement('div');
      sw.className = 'swatch';
      sw.style.background = meta.color;
      sw.title = 'Cambiar color';

      var nombre = document.createElement('span');
      nombre.className = 'nombre-capa';
      nombre.textContent = meta.nombre;

      var nf = document.createElement('span');
      nf.className = 'n-features';
      nf.textContent = meta.geojson.features.length;

      var botones = document.createElement('span');

      var btnZoom = document.createElement('button');
      btnZoom.className = 'btn-capa';
      btnZoom.textContent = '\u26F6';
      btnZoom.title = 'Enfocar capa';

      var btnDel = document.createElement('button');
      btnDel.className = 'btn-capa';
      btnDel.textContent = '\u2715';
      btnDel.title = 'Eliminar capa';

      botones.appendChild(btnZoom);
      botones.appendChild(btnDel);

      fila.appendChild(check);
      fila.appendChild(sw);
      fila.appendChild(nombre);
      fila.appendChild(nf);
      fila.appendChild(botones);

      if (meta.numericos.length) {
        var filaVar = document.createElement('div');
        filaVar.className = 'item-capa';
        filaVar.style.background = 'transparent';
        filaVar.style.border = 'none';
        filaVar.style.padding = '0 8px 4px';
        var lbl = document.createElement('span');
        lbl.className = 'n-features';
        lbl.textContent = 'Variable:';
        var sel = document.createElement('select');
        sel.style.cssText = 'flex:1;min-width:0;background:#1b2330;color:#dde6f0;border:1px solid rgba(120,160,220,0.3);border-radius:4px;font-size:11px;padding:2px 4px;';
        var opNinguna = document.createElement('option');
        opNinguna.value = '';
        opNinguna.textContent = 'Color único';
        sel.appendChild(opNinguna);
        meta.numericos.forEach(function (k) {
          var op = document.createElement('option');
          op.value = k;
          op.textContent = k;
          if (k === meta.variable) op.selected = true;
          sel.appendChild(op);
        });
        filaVar.appendChild(lbl);
        filaVar.appendChild(sel);
        cont.appendChild(fila);
        cont.appendChild(filaVar);
        sel.addEventListener('change', function () {
          setVariable(meta, sel.value);
          sw.style.background = meta.variable ? '#888' : meta.color;
        });
      } else {
        cont.appendChild(fila);
      }

      check.addEventListener('change', function () { toggleCapa(meta, check.checked); });
      sw.addEventListener('click', function () {
        var input = document.createElement('input');
        input.type = 'color';
        input.value = meta.color;
        input.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(input);
        input.addEventListener('input', function () {
          sw.style.background = input.value;
          setColor(meta, input.value);
        });
        input.addEventListener('blur', function () {
          document.body.removeChild(input);
        });
        input.click();
      });
      btnZoom.addEventListener('click', function () { zoomACapa(meta); });
      btnDel.addEventListener('click', function () { eliminarCapa(meta); });
    });
  }

  function renderLeyenda() {
    var cont = document.getElementById('cuerpo-leyenda');
    var visibles = capas.filter(function (c) { return c.visibles; });
    if (!visibles.length) {
      cont.innerHTML = '<p class="aviso">Sin capas visibles.</p>';
      return;
    }
    cont.innerHTML = '';
    visibles.forEach(function (meta) {
      if (meta.variable && meta.clases) {
        var titulo = document.createElement('div');
        titulo.style.cssText = 'font-size:11px;font-weight:600;color:#a8c6f0;margin:4px 0 2px;';
        titulo.textContent = meta.nombre + ' \u2014 ' + meta.variable;
        cont.appendChild(titulo);
        meta.clases.forEach(function (clase) {
          var fila = document.createElement('div');
          fila.className = 'fila-leyenda';
          var sw = document.createElement('div');
          sw.className = 'swatch';
          sw.style.background = clase.color;
          var txt = document.createElement('span');
          txt.textContent = formatearValor(clase.min) + ' \u2013 ' + formatearValor(clase.max);
          fila.appendChild(sw);
          fila.appendChild(txt);
          cont.appendChild(fila);
        });
      } else {
        var fila = document.createElement('div');
        fila.className = 'fila-leyenda';
        var sw = document.createElement('div');
        sw.className = 'swatch';
        sw.style.background = meta.color;
        var txt = document.createElement('span');
        txt.textContent = meta.nombre;
        fila.appendChild(sw);
        fila.appendChild(txt);
        cont.appendChild(fila);
      }
    });
  }

  function actualizarContadorCapas() {
    var n = capas.filter(function (c) { return c.visibles; }).length;
    document.getElementById('n-capas').textContent = n + ' capa(s)';
  }

  function leerArchivoComoTexto(archivo) {
    return new Promise(function (resolve, reject) {
      var lector = new FileReader();
      lector.onload = function () { resolve(lector.result); };
      lector.onerror = function () { reject(lector.error); };
      lector.readAsText(archivo);
    });
  }

  function leerArchivoComoBuffer(archivo) {
    return new Promise(function (resolve, reject) {
      var lector = new FileReader();
      lector.onload = function () { resolve(lector.result); };
      lector.onerror = function () { reject(lector.error); };
      lector.readAsArrayBuffer(archivo);
    });
  }

  function procesarGeojson(texto) {
    var datos = JSON.parse(texto);
    if (!datos || !Array.isArray(datos.features)) {
      throw new Error('El archivo no es un GeoJSON válido.');
    }
    return datos;
  }

  function nombreSinExtension(nombre) {
    return nombre.replace(/\.[^.]+$/, '');
  }

  async function manejarArchivos(files) {
    var modal = document.getElementById('modal-cargando');
    modal.classList.remove('oculto');
    try {
      for (var i = 0; i < files.length; i++) {
        var archivo = files[i];
        var nombre = nombreSinExtension(archivo.name);
        var ext = archivo.name.toLowerCase().split('.').pop();
        if (ext === 'geojson' || ext === 'json') {
          var texto = await leerArchivoComoTexto(archivo);
          var geojson = procesarGeojson(texto);
          agregarCapa(geojson, nombre);
        } else if (ext === 'zip' || ext === 'shp') {
          if (typeof shp === 'undefined') {
            throw new Error('La librería para Shapefile no está disponible.');
          }
          var buffer = await leerArchivoComoBuffer(archivo);
          var resultado = await shp(buffer);
          if (Array.isArray(resultado)) {
            resultado.forEach(function (r, idx) {
              if (r && r.features) {
                var sufijo = resultado.length > 1 ? ' (' + (idx + 1) + ')' : '';
                agregarCapa(r, nombre + sufijo);
              }
            });
          } else if (resultado && resultado.features) {
            agregarCapa(resultado, nombre);
          } else {
            throw new Error('No se pudo leer el Shapefile.');
          }
        } else {
          throw new Error('Formato no soportado: .' + ext);
        }
      }
    } catch (err) {
      alert('Error al cargar la capa: ' + err.message);
    } finally {
      modal.classList.add('oculto');
      document.getElementById('input-archivo').value = '';
    }
  }

  document.getElementById('btn-cargar').addEventListener('click', function () {
    document.getElementById('input-archivo').click();
  });

  document.getElementById('input-archivo').addEventListener('change', function (e) {
    manejarArchivos(e.target.files);
  });

  document.querySelectorAll('.btn-min').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cuerpo = document.getElementById(btn.dataset.panel);
      var colapsado = cuerpo.classList.toggle('colapsado');
      btn.textContent = colapsado ? '\u002B' : '\u2212';
    });
  });

  document.querySelectorAll('input[name="basemap"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (!radio.checked) return;
      Object.keys(baseMaps).forEach(function (k) {
        if (k === radio.value) baseMaps[k].addTo(map);
        else if (map.hasLayer(baseMaps[k])) map.removeLayer(baseMaps[k]);
      });
    });
  });

  map.on('mousemove', function (e) {
    document.getElementById('coord-pos').textContent =
      e.latlng.lat.toFixed(5) + ', ' + e.latlng.lng.toFixed(5);
  });

  map.on('zoomend', function () {
    document.getElementById('zoom-actual').textContent = 'Zoom: ' + map.getZoom();
  });

  function cargarEjemplo(url, nombre) {
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (datos) {
        if (datos && datos.features) {
          var meta = agregarCapa(datos, nombre);
          if (meta.numericos.length && meta.dimensiones === 2) {
            setVariable(meta, meta.numericos[0]);
            renderListaCapas();
          }
          return meta;
        }
        return null;
      })
      .catch(function () { return null; });
  }

  Promise.all([
    cargarEjemplo('data/zonas_mexico.geojson', 'Zonas de México (ejemplo)'),
    cargarEjemplo('data/Paises_Mundo.geojson', 'Paises del mundo (ejemplo)'),
    cargarEjemplo('data/ciudades_mexico.geojson', 'Ciudades de México (ejemplo)')
  ]).then(function (resultados) {
    if (resultados[0]) zoomACapa(resultados[0]);
  });
})();
