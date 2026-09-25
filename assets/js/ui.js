// Piezas de interfaz reutilizables. Todo el texto que viene de los datos entra por textContent.
import { NIVELES } from './progreso.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function aplicar(el, props) {
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'style') for (const [p, x] of Object.entries(v)) el.style.setProperty(p, x);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    // Los atributos de presentación SVG no aceptan var(): esos valores van como estilo.
    else if (el instanceof SVGElement && typeof v === 'string' && v.includes('var(')) el.style.setProperty(k, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
}

function agregar(el, hijos) {
  for (const c of hijos.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
}

export function h(tag, props, ...hijos) {
  const el = document.createElement(tag);
  aplicar(el, props);
  agregar(el, hijos);
  return el;
}

export function s(tag, props, ...hijos) {
  const el = document.createElementNS(SVG_NS, tag);
  aplicar(el, props);
  agregar(el, hijos);
  return el;
}

// ---- Íconos (24×24, trazo) ----

const TRAZOS = {
  lumen: [['path', { d: 'M12 2.5c.7 5 2.8 7.6 9.5 9.5-6.7 1.9-8.8 4.5-9.5 9.5-.7-5-2.8-7.6-9.5-9.5 6.7-1.9 8.8-4.5 9.5-9.5Z', fill: 'currentColor', stroke: 'none' }]],
  integral: [
    ['path', { d: 'M15.5 3.2c-1.9-.7-3.4.3-3.8 2.4L9.9 18.4c-.4 2.1-1.9 3.1-3.8 2.4' }],
    ['ellipse', { cx: '11.2', cy: '12', rx: '5', ry: '2.6' }],
  ],
  senal: [
    ['path', { d: 'M2.5 12c1.6-4.8 3.2-4.8 4.8 0s3.2 4.8 4.8 0 3.2-4.8 4.8 0 3.2 4.8 4.8 0' }],
    ['circle', { cx: '2.5', cy: '12', r: '.6', fill: 'currentColor' }],
  ],
  chip: [
    ['rect', { x: '6', y: '6', width: '12', height: '12', rx: '2.2' }],
    ['rect', { x: '9.5', y: '9.5', width: '5', height: '5', rx: '1' }],
    ['path', { d: 'M9.5 2.5V6M14.5 2.5V6M9.5 18v3.5M14.5 18v3.5M2.5 9.5H6M2.5 14.5H6M18 9.5h3.5M18 14.5h3.5' }],
  ],
  libro: [['path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 0 6.5 23H20M8 7.5h8' }]],
  codigo: [['path', { d: 'm8 7-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15' }]],
  'base-datos': [
    ['ellipse', { cx: '12', cy: '5.5', rx: '7.5', ry: '2.8' }],
    ['path', { d: 'M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8' }],
  ],
  red: [
    ['circle', { cx: '12', cy: '5', r: '2.2' }],
    ['circle', { cx: '5', cy: '18.5', r: '2.2' }],
    ['circle', { cx: '19', cy: '18.5', r: '2.2' }],
    ['path', { d: 'M11 7 6 16.5M13 7l5 9.5M7.2 18.5h9.6' }],
  ],
  grafico: [['path', { d: 'M3.5 3.5v17h17M7.5 16l4-5 3 3 5-7' }]],
  flecha: [['path', { d: 'M5 12h14M13 6l6 6-6 6' }]],
  volver: [['path', { d: 'M19 12H5M11 6l-6 6 6 6' }]],
  chevron: [['path', { d: 'm6 9 6 6 6-6' }]],
  sol: [
    ['circle', { cx: '12', cy: '12', r: '4' }],
    ['path', { d: 'M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4' }],
  ],
  luna: [['path', { d: 'M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z' }]],
  reloj: [['circle', { cx: '12', cy: '12', r: '8.5' }], ['path', { d: 'M12 7.5V12l3 2' }]],
  bandera: [['path', { d: 'M5 21V4M5 4h11l-2 4 2 4H5' }]],
  github: [['path', { d: 'M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21' }]],
  terminal: [['path', { d: 'm4.5 7 5 5-5 5M12 17.5h7.5' }]],
};

export function icono(nombre, { tam = 20, clase } = {}) {
  const trazos = TRAZOS[nombre] ?? TRAZOS.libro;
  return s(
    'svg',
    {
      viewBox: '0 0 24 24', width: tam, height: tam, fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: clase,
    },
    trazos.map(([tag, attrs]) => s(tag, attrs)),
  );
}

// ---- Formato ----

const fmtPorcentaje = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
export const pct = (x) => `${fmtPorcentaje.format(x)}%`;

export function fechaLocal(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

const fmtCorta = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const fmtLarga = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
export const fechaCorta = (iso) => fmtCorta.format(fechaLocal(iso)).replace('.', '');
export const fechaLarga = (iso) => fmtLarga.format(fechaLocal(iso)).replaceAll('.', '');

export function horas(minutos) {
  if (!minutos) return '0 h';
  const hs = minutos / 60;
  return hs < 10 ? `${hs.toLocaleString('es-AR', { maximumFractionDigits: 1 })} h` : `${Math.round(hs)} h`;
}

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export const colorNivel = (nivel) => `var(--niv-${nivel})`;
export const tonoMateria = (entrada) => ({ '--tono': `var(--m-${entrada.color ?? 1})` });

// ---- Tooltip (uno solo para toda la página) ----

let globo;

function asegurarGlobo() {
  globo ??= document.querySelector('.tooltip');
  return globo;
}

function ubicar(x, y) {
  const g = asegurarGlobo();
  const { width, height } = g.getBoundingClientRect();
  const margen = 12;
  let left = x + 14;
  let top = y + 16;
  if (left + width > innerWidth - margen) left = x - width - 14;
  if (top + height > innerHeight - margen) top = y - height - 14;
  g.style.left = `${Math.max(margen, left)}px`;
  g.style.top = `${Math.max(margen, top)}px`;
}

export function mostrarTooltip(contenido, x, y) {
  const g = asegurarGlobo();
  g.replaceChildren(contenido);
  g.hidden = false;
  ubicar(x, y);
}

export function ocultarTooltip() {
  const g = asegurarGlobo();
  if (g) g.hidden = true;
}

// Engancha hover y foco. `contenido` es una función que devuelve un nodo.
export function conTooltip(el, contenido) {
  el.addEventListener('pointerenter', (e) => mostrarTooltip(contenido(), e.clientX, e.clientY));
  el.addEventListener('pointermove', (e) => ubicar(e.clientX, e.clientY));
  el.addEventListener('pointerleave', ocultarTooltip);
  el.addEventListener('focus', () => {
    const r = el.getBoundingClientRect();
    mostrarTooltip(contenido(), r.left + r.width / 2, r.bottom);
  });
  el.addEventListener('blur', ocultarTooltip);
  return el;
}

export function tooltipNivel({ valor, color, texto, sub }) {
  return h('div', null,
    h('div', { class: 'tooltip-valor' }, h('span', { class: 'tooltip-clave', style: { '--c': color } }), valor),
    texto && h('div', { class: 'tooltip-texto', text: texto }),
    sub && h('div', { class: 'tooltip-sub', text: sub }),
  );
}

// ---- Componentes de datos ----

export function medidor(valor, { fino = false, etiqueta } = {}) {
  return h('div', {
    class: `medidor${fino ? ' medidor-fino' : ''}`,
    role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(valor),
    'aria-label': etiqueta,
  }, h('div', { class: 'medidor-relleno', style: { '--v': `${valor}%` } }));
}

// Barra apilada: cuántos temas hay en cada nivel. Etiquetas por tooltip; los números también están en la leyenda.
export function distribucion(conteo, { etiqueta = 'Temas por nivel' } = {}) {
  const total = conteo.reduce((a, b) => a + b, 0) || 1;
  const barra = h('div', { class: 'distribucion', role: 'img', 'aria-label': `${etiqueta}: ${conteo.map((n, i) => `${NIVELES[i].nombre} ${n}`).join(', ')}` });
  conteo.forEach((n, nivel) => {
    if (!n) return;
    const seg = h('div', { class: 'distribucion-segmento', style: { '--c': colorNivel(nivel), flex: `${n} 1 0` } });
    conTooltip(seg, () => tooltipNivel({
      valor: plural(n, 'tema', 'temas'),
      color: colorNivel(nivel),
      texto: `${NIVELES[nivel].nombre} · ${pct((n / total) * 100)} del total`,
    }));
    barra.append(seg);
  });
  return barra;
}

export function pips(nivel) {
  return h('span', { class: 'pips', 'aria-hidden': 'true', style: { '--c': colorNivel(nivel) } },
    [1, 2, 3, 4].map((i) => h('span', { class: `pip${i <= nivel ? ' encendido' : ''}` })));
}

export function leyendaNiveles({ conteo, estrellas = false } = {}) {
  return h('ul', { class: 'leyenda', 'aria-label': 'Niveles de aprendizaje' },
    NIVELES.map((n) => h('li', null,
      h('span', { class: estrellas ? 'muestra-estrella' : 'muestra', 'data-nivel': n.nivel, style: { '--c': colorNivel(n.nivel) } }),
      conteo ? `${n.nombre} · ${conteo[n.nivel]}` : `${n.nombre} (${n.porcentaje}%)`,
    )));
}
