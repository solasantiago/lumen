// El cielo: cada materia es un cúmulo, cada unidad una constelación y cada tema una estrella
// que brilla según su nivel. Posiciones deterministas (dependen de los ids), así no "saltan" entre visitas.
import { NIVELES, porcentajeTema } from './progreso.js';
import { colorNivel, conTooltip, icono, ocultarTooltip, pct, s, tooltipNivel } from './ui.js';

const RADIO = [3.5, 4, 4.3, 4.7, 5.3];
const HALO = [0, 0, 9, 12, 16];

function azar(semilla) {
  let h = 2166136261;
  for (const ch of semilla) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// Puntos dentro de un disco, separados entre sí (muestreo por rechazo con semilla).
function puntosEnDisco(n, radio, r) {
  const minimo = (radio * 1.5) / Math.sqrt(n + 1);
  const pts = [];
  for (let i = 0; i < n; i++) {
    let mejor = null;
    let mejorDist = -1;
    for (let intento = 0; intento < 40; intento++) {
      const a = r() * Math.PI * 2;
      const d = radio * Math.sqrt(0.08 + r() * 0.92);
      const p = [Math.cos(a) * d, Math.sin(a) * d];
      const dist = pts.length ? Math.min(...pts.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))) : Infinity;
      if (dist > mejorDist) [mejor, mejorDist] = [p, dist];
      if (dist >= minimo) break;
    }
    pts.push(mejor);
  }
  return pts;
}

// Recorrido del vecino más cercano: arma la "figura" de la constelación.
function recorrido(pts) {
  if (pts.length < 2) return pts.map((_, i) => i);
  const restantes = new Set(pts.keys());
  let actual = [...restantes].reduce((a, b) => (Math.hypot(...pts[a]) <= Math.hypot(...pts[b]) ? a : b));
  const orden = [actual];
  restantes.delete(actual);
  while (restantes.size) {
    let sig = null;
    let dist = Infinity;
    for (const j of restantes) {
      const d = Math.hypot(pts[j][0] - pts[actual][0], pts[j][1] - pts[actual][1]);
      if (d < dist) [sig, dist] = [j, d];
    }
    orden.push(sig);
    restantes.delete(sig);
    actual = sig;
  }
  return orden;
}

function defs() {
  return s('defs', null,
    [2, 3, 4].map((n) => s('radialGradient', { id: `halo-${n}` },
      s('stop', { offset: '0%', 'stop-color': colorNivel(n), 'stop-opacity': n === 4 ? 0.75 : 0.5 }),
      s('stop', { offset: '100%', 'stop-color': colorNivel(n), 'stop-opacity': 0 }),
    )),
    s('radialGradient', { id: 'nebulosa' },
      s('stop', { offset: '0%', 'stop-color': 'currentColor', 'stop-opacity': 1 }),
      s('stop', { offset: '100%', 'stop-color': 'currentColor', 'stop-opacity': 0 }),
    ),
  );
}

function fondoEstrellado(W, H) {
  const r = azar(`fondo-${Math.round(W / 100)}`);
  const n = Math.round((W * H) / 2600);
  return s('g', { 'aria-hidden': 'true' },
    Array.from({ length: n }, () => s('circle', {
      cx: (r() * W).toFixed(1), cy: (r() * H).toFixed(1), r: (0.4 + r() * 0.8).toFixed(2),
      fill: '#dfe6ff', 'fill-opacity': (0.06 + r() * 0.28).toFixed(2),
    })));
}

function cumulo({ entrada, datos, resumen }, { cx, cy, R, yNombre, enlace }) {
  const r = azar(datos.id);
  const K = datos.unidades.length;
  const r0 = Math.min(R * Math.sin(Math.PI / Math.max(K, 3)) * 0.9, R * 0.42);
  const giro = r() * 0.5 - 0.25;
  const tono = `var(--m-${entrada.color ?? 1})`;
  const g = s('g', { style: { color: tono } });

  g.append(s('circle', {
    cx, cy, r: R + r0 + 24, fill: 'url(#nebulosa)', 'fill-opacity': (0.05 + 0.22 * (resumen.porcentaje / 100)).toFixed(3),
    'aria-hidden': 'true',
  }));
  g.append(s('circle', { cx, cy, r: R, fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.12, 'stroke-width': 1, 'aria-hidden': 'true' }));

  datos.unidades.forEach((u, k) => {
    const theta = -Math.PI / 2 + (2 * Math.PI * k) / K + giro;
    const ux = cx + R * Math.cos(theta);
    const uy = cy + R * Math.sin(theta);
    const pts = puntosEnDisco(u.temas.length, r0, azar(`${datos.id}/${u.id}`)).map(([x, y]) => [ux + x, uy + y]);
    const orden = recorrido(pts.map(([x, y]) => [x - ux, y - uy]));

    if (orden.length > 1) {
      g.append(s('polyline', {
        points: orden.map((i) => pts[i].map((v) => v.toFixed(1)).join(',')).join(' '),
        fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.42, 'stroke-width': 1, 'stroke-linejoin': 'round',
        'aria-hidden': 'true',
      }));
    }

    const lx = cx + (R + r0 + 12) * Math.cos(theta);
    const ly = cy + (R + r0 + 12) * Math.sin(theta);
    g.append(s('text', {
      x: lx.toFixed(1), y: ly.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      fill: 'var(--tinta-3)', 'font-size': 10, 'font-family': 'var(--fuente-mono)', 'aria-hidden': 'true',
      text: u.numero ?? u.id,
    }));

    u.temas.forEach((t, j) => {
      const [x, y] = pts[j];
      const nivel = t.nivel ?? 0;
      if (HALO[nivel]) {
        g.append(s('circle', {
          class: `estrella-halo${nivel === 4 ? ' titila' : ''}`, cx: x.toFixed(1), cy: y.toFixed(1), r: HALO[nivel],
          fill: `url(#halo-${nivel})`, style: nivel === 4 ? { 'animation-delay': `${(r() * 4).toFixed(2)}s` } : null,
        }));
      }
      const blanco = s('circle', { class: 'estrella-blanco', cx: x.toFixed(1), cy: y.toFixed(1), r: 12 });
      conTooltip(blanco, () => tooltipNivel({
        valor: `${NIVELES[nivel].nombre} · ${pct(porcentajeTema(t))}`,
        color: colorNivel(nivel),
        texto: t.nombre,
        sub: `${datos.abreviatura ?? datos.nombre} · U ${u.numero ?? u.id} · ${u.nombre}`,
      }));
      blanco.addEventListener('click', () => {
        ocultarTooltip();
        location.hash = enlace(entrada, { unidad: u.id, tema: t.id });
      });
      g.append(blanco);
      g.append(nivel === 0
        ? s('circle', { class: 'estrella', cx: x.toFixed(1), cy: y.toFixed(1), r: RADIO[0], fill: 'none', stroke: '#9aa3c4', 'stroke-opacity': 0.55, 'stroke-width': 1.25, 'pointer-events': 'none' })
        : s('circle', { class: 'estrella', cx: x.toFixed(1), cy: y.toFixed(1), r: RADIO[nivel], fill: colorNivel(nivel), 'pointer-events': 'none' }));
    });
  });

  const centro = s('a', {
    class: 'cumulo-enlace', href: enlace(entrada),
    'aria-label': `${datos.nombre}: ${pct(resumen.porcentaje)} aprendido. Ver la materia.`,
  },
  s('circle', { cx, cy, r: 50, fill: '#0b1020', 'fill-opacity': 0.55 }),
  s('circle', { class: 'cumulo-foco', cx, cy, r: 50 }),
  s('g', { transform: `translate(${cx - 11} ${cy - 36})`, style: { color: tono } }, icono(entrada.icono, { tam: 22 })),
  s('text', {
    x: cx, y: cy + 9, 'text-anchor': 'middle', fill: 'var(--tinta)', 'font-size': 24, 'font-weight': 600,
    'font-family': 'var(--fuente-titulo)', 'letter-spacing': '-0.02em', text: pct(resumen.porcentaje),
  }),
  s('text', {
    x: cx, y: cy + 27, 'text-anchor': 'middle', fill: 'var(--tinta-3)', 'font-size': 10.5,
    'font-family': 'var(--fuente-mono)', 'letter-spacing': '0.06em', text: datos.abreviatura ?? '',
  }));
  g.append(centro);

  g.append(s('text', {
    x: cx, y: yNombre, 'text-anchor': 'middle', fill: 'var(--tinta-2)', 'font-size': 14, 'font-weight': 500,
    'font-family': 'var(--fuente)', text: datos.nombre,
  }));
  return g;
}

export function dibujarCielo(contenedor, items, { enlace }) {
  let anchoPrevio = 0;

  const dibujar = () => {
    const W = Math.max(300, Math.round(contenedor.clientWidth));
    if (Math.abs(W - anchoPrevio) < 2) return;
    anchoPrevio = W;
    const n = items.length;
    const cols = W >= 900 ? Math.min(n, 3) : W >= 600 ? Math.min(n, 2) : 1;
    const filas = Math.ceil(n / cols);
    const celdaW = W / cols;
    const celdaH = Math.min(450, Math.max(360, celdaW * 0.97));
    const H = Math.round(filas * celdaH);

    const svg = s('svg', {
      viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group',
      'aria-label': 'Mapa de constelaciones: cada estrella es un tema y brilla según su nivel',
    }, defs(), fondoEstrellado(W, H));

    items.forEach((item, i) => {
      const fila = Math.floor(i / cols);
      const enFila = Math.min(cols, n - fila * cols);
      const offset = ((cols - enFila) * celdaW) / 2;
      const cx = offset + (i % cols) * celdaW + celdaW / 2;
      const cy = fila * celdaH + celdaH * 0.45;
      const R = Math.min(celdaW, celdaH) * 0.3;
      svg.append(cumulo(item, { cx, cy, R, yNombre: (fila + 1) * celdaH - 14, enlace }));
    });
    contenedor.replaceChildren(svg);
  };

  dibujar();
  let espera;
  const observador = new ResizeObserver(() => {
    if (!contenedor.isConnected) return observador.disconnect();
    clearTimeout(espera);
    espera = setTimeout(dibujar, 120);
  });
  observador.observe(contenedor);
}
