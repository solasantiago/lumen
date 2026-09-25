// Modo pizarra: Lumen en pantalla completa, como carrusel, para dejarlo de fondo en una tele o un iPad.
//   #/pizarra                              todas las diapositivas, 20 s cada una
//   #/pizarra?d=cuenta,hoy,pregunta&s=30   solo esas, 30 s cada una
//   #/pizarra?d=cuenta                     una sola, fija
//   #/pizarra?noche=0                      sin atenuar la pantalla entre las 0 y las 7
// Diapositivas: cielo, cuenta, hoy, materias (una por materia) o el id de una materia, pregunta.
import {
  NIVELES, diasEntre, evaluacionesPendientes, hoyISO, porcentajeCuatrimestre, porcentajeUnidad, porcentajeUnidades,
  prioridades, proximaEvaluacion, repasoVencido, resumenMateria, unidadesDe,
} from '../progreso.js';
import { distribucion, fechaLarga, h, icono, leyendaNiveles, medidor, pct, pips, plural, s, tonoMateria } from '../ui.js';
import { dibujarCielo } from '../cielo.js';

const ORDEN = ['cielo', 'cuenta', 'hoy', 'materias', 'pregunta'];
const RECARGA_MS = 5 * 60_000;
const CONTROLES_MS = 3500;
const DESPLAZAR_MS = 2 * 60_000;
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const fmtHora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDia = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

// ---- Datos ----

function contexto(estado) {
  const { indice } = estado;
  const cuatrimestre = indice.cuatrimestres.find((c) => c.id === indice.cuatrimestre_actual) ?? indice.cuatrimestres.at(-1);
  const hoy = hoyISO();
  const items = cuatrimestre.materias
    .map((e) => estado.materias.get(`${cuatrimestre.id}/${e.id}`))
    .filter((i) => i?.datos)
    .map((i) => ({ ...i, resumen: resumenMateria(i.datos, hoy) }));
  return { estado, cuatrimestre, items, hoy, carrera: indice.carrera ?? {} };
}

function momento(ev) {
  const [a, m, d] = ev.fecha.split('-').map(Number);
  const [hh, mm] = (ev.hora ?? '00:00').split(':').map(Number);
  return new Date(a, m - 1, d, hh, mm);
}

function proximasEvaluaciones(ctx) {
  return ctx.items
    .flatMap((item) => evaluacionesPendientes(item.datos, ctx.hoy).filter((ev) => ev.fecha).map((ev) => ({ item, ev })))
    .sort((a, b) => momento(a.ev) - momento(b.ev));
}

function cuentaRegresiva(ev, ahora = new Date()) {
  if (!ev.hora && ev.fecha === hoyISO(ahora)) return { valor: 'Hoy', detalle: '¡Éxitos!', urgente: true };
  const ms = momento(ev) - ahora;
  if (ms <= 0) {
    return ms > -3 * 3_600_000
      ? { valor: '¡Ahora!', detalle: 'Éxitos en el examen', urgente: true }
      : { valor: 'Rendido', detalle: 'Cargá la nota con el agente de la materia', urgente: false };
  }
  const dias = diasEntre(hoyISO(ahora), ev.fecha);
  if (dias >= 3) return { valor: plural(dias, 'día', 'días'), detalle: 'para prepararlo', urgente: false };
  const minutos = Math.ceil(ms / 60_000);
  const d = Math.floor(minutos / 1440);
  const hs = Math.floor((minutos % 1440) / 60);
  const min = minutos % 60;
  if (d >= 1) return { valor: `${d} d ${hs} h`, detalle: 'Último empujón', urgente: true };
  return { valor: hs ? `${hs} h ${String(min).padStart(2, '0')} min` : `${min} min`, detalle: 'Último empujón', urgente: true };
}

function fechaEvaluacion(ev) {
  return `${fmtDia.format(momento(ev))}${ev.hora ? ` · ${ev.hora} h` : ''}`;
}

function textoEvaluacion(ev, hoy) {
  if (ev.estado && ev.estado !== 'pendiente') return `${ev.estado}${ev.nota != null ? ` · nota ${ev.nota}` : ''}`;
  if (!ev.fecha) return 'fecha a definir';
  const d = diasEntre(hoy, ev.fecha);
  const cuando = d === 0 ? 'hoy' : d > 0 ? `en ${plural(d, 'día', 'días')}` : `hace ${plural(-d, 'día', 'días')}`;
  return `${fechaLarga(ev.fecha)}${ev.hora ? ` ${ev.hora}` : ''} · ${cuando}`;
}

const focoDeHoy = (ctx) => prioridades(ctx.items.map((i) => i.datos), { hoy: ctx.hoy, limite: 6, maxPorMateria: 3 });

// Temas para preguntar al pasar: los repasos vencidos pesan doble; después, lo ya visto que entra en el próximo examen.
function candidatosPregunta(ctx) {
  const todos = ctx.items.flatMap((item) =>
    item.datos.unidades.flatMap((unidad) => unidad.temas.map((tema) => ({ item, unidad, tema }))));
  const vistos = todos.filter((x) => (x.tema.nivel ?? 0) >= 1);
  const vencidos = vistos.filter((x) => repasoVencido(x.tema, ctx.hoy));
  const proximos = vistos.filter((x) => {
    const ev = proximaEvaluacion(x.item.datos, ctx.hoy);
    return x.tema.nivel < NIVELES.length - 1 && ev?.unidades.includes(x.unidad.id);
  });
  const pozo = [...vencidos, ...vencidos, ...proximos];
  return pozo.length ? pozo : vistos;
}

function agendaDeHoy(ctx) {
  const agenda = ctx.estado.agenda;
  if (!agenda) return [];
  const dia = DIAS[new Date().getDay()];
  const nombre = (id) => ctx.items.find((i) => i.datos.id === id)?.datos.abreviatura ?? id;
  return [
    ...(agenda.clases ?? []).filter((c) => c.dia === dia).map((c) => `Clase de ${nombre(c.materia)} ${c.desde}–${c.hasta}`),
    ...(agenda.disponibilidad?.[dia] ?? []).map((b) => `Estudio ${b.desde}–${b.hasta}`),
  ];
}

function subidas(viejo, nuevo) {
  const niveles = (estado) => {
    const m = new Map();
    for (const { datos } of estado.materias.values()) {
      if (!datos) continue;
      for (const u of datos.unidades) for (const t of u.temas) m.set(`${datos.id}/${t.id}`, { materia: datos, tema: t, nivel: t.nivel ?? 0 });
    }
    return m;
  };
  const antes = niveles(viejo);
  return [...niveles(nuevo)].filter(([k, x]) => antes.has(k) && x.nivel > antes.get(k).nivel).map(([, x]) => x);
}

// ---- Piezas ----

function filaUnidad(u) {
  const v = porcentajeUnidad(u);
  return h('li', { class: 'pz-unidad' },
    h('span', { class: 'pz-unidad-num', text: `U ${u.numero ?? u.id}` }),
    h('span', { class: 'pz-unidad-nombre', text: u.nombre }),
    medidor(v, { fino: true, etiqueta: `${u.nombre}: aprendido` }),
    h('span', { class: 'pz-unidad-valor', text: pct(v) }));
}

// Una sola serie: sin leyenda; el rótulo "Evolución" la nombra. Escala con el ancho (viewBox).
function evolucion(serie) {
  const W = 600;
  const H = 150;
  const m = { arriba: 14, derecha: 76, abajo: 30, izquierda: 6 };
  const x = (i) => m.izquierda + (i / (serie.length - 1)) * (W - m.izquierda - m.derecha);
  const y = (v) => m.arriba + (1 - v / 100) * (H - m.arriba - m.abajo);
  const linea = serie.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.porcentaje).toFixed(1)}`).join('');
  const ultimo = serie.at(-1);
  const fin = x(serie.length - 1);
  return s('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'pz-evolucion-svg', role: 'img',
    'aria-label': `Evolución: de ${pct(serie[0].porcentaje)} a ${pct(ultimo.porcentaje)}`,
  },
  s('line', { x1: m.izquierda, x2: W - m.derecha, y1: y(0), y2: y(0), stroke: 'var(--linea-2)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }),
  s('line', { x1: m.izquierda, x2: W - m.derecha, y1: y(100), y2: y(100), stroke: 'var(--linea)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }),
  s('path', { d: `${linea}L${fin.toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`, fill: 'var(--acento)', 'fill-opacity': 0.1 }),
  s('path', { d: linea, fill: 'none', stroke: 'var(--acento)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }),
  s('circle', { cx: fin, cy: y(ultimo.porcentaje), r: 6, fill: 'var(--acento)', stroke: 'var(--fondo)', 'stroke-width': 3 }),
  s('text', { x: fin + 14, y: y(ultimo.porcentaje), 'dominant-baseline': 'middle', fill: 'var(--tinta)', 'font-size': 24, 'font-weight': 600, text: pct(ultimo.porcentaje) }),
  s('text', { x: m.izquierda, y: H - 6, fill: 'var(--tinta-3)', 'font-size': 18, text: fechaLarga(serie[0].fecha) }),
  s('text', { x: W - m.derecha, y: H - 6, 'text-anchor': 'end', fill: 'var(--tinta-3)', 'font-size': 18, text: fechaLarga(ultimo.fecha) }));
}

// ---- Diapositivas ----

function diapoCielo(ctx) {
  const lienzo = h('div', { class: 'pz-cielo-lienzo' });
  const total = porcentajeCuatrimestre(ctx.items.map((i) => i.datos));
  const temas = ctx.items.reduce((a, i) => a + i.resumen.temas, 0);
  const dominados = ctx.items.reduce((a, i) => a + i.resumen.dominados, 0);
  const nodo = h('div', { class: 'pz-cielo' },
    h('div', { class: 'pz-lateral' },
      h('p', { class: 'pz-eyebrow', text: ctx.carrera.nombre ?? 'Mapa de estudio' }),
      h('div', null,
        h('p', { class: 'pz-hero', text: pct(total) }),
        h('p', { class: 'pz-hero-sub', text: `del ${ctx.cuatrimestre.nombre} encendido` })),
      medidor(total, { etiqueta: 'Cuatrimestre: aprendido' }),
      h('ul', { class: 'pz-lista-materias' }, ctx.items.map((i) => h('li', { style: tonoMateria(i.entrada) },
        h('span', { class: 'pz-icono-chico' }, icono(i.entrada.icono, { tam: 20 })),
        h('span', { class: 'pz-lista-nombre', text: i.datos.nombre }),
        h('strong', { text: pct(i.resumen.porcentaje) })))),
      h('p', { class: 'pz-nota', text: `${dominados} de ${temas} temas dominados` }),
      leyendaNiveles({ estrellas: true })),
    h('div', { class: 'pz-cielo-marco noche' }, lienzo));
  return { nodo, montar: () => dibujarCielo(lienzo, ctx.items, { enlace: () => '#/pizarra', ajustar: true }) };
}

function diapoCuenta(ctx) {
  const lista = proximasEvaluaciones(ctx);
  const { item, ev } = lista[0];
  const unidades = unidadesDe(item.datos, ev);
  const porcentaje = porcentajeUnidades(unidades);
  const repasar = prioridades([{ ...item.datos, unidades }], { hoy: ctx.hoy, limite: 4 });
  const valor = h('p', { class: 'pz-cuenta-valor' });
  const detalle = h('p', { class: 'pz-cuenta-detalle' });

  const nodo = h('div', { class: 'pz-cuenta', style: tonoMateria(item.entrada) },
    h('div', { class: 'pz-cuenta-principal' },
      h('p', { class: 'pz-eyebrow' }, icono(item.entrada.icono, { tam: 22 }), item.datos.nombre),
      h('h2', { class: 'pz-titulo-grande', text: ev.nombre }),
      h('p', { class: 'pz-fecha', text: fechaEvaluacion(ev) }),
      valor,
      detalle,
      lista.length > 1 && h('div', { class: 'pz-despues' },
        h('span', { class: 'pz-etiqueta', text: 'Después' }),
        h('ul', null, lista.slice(1, 4).map(({ item: i, ev: e }) => h('li', { style: tonoMateria(i.entrada) },
          h('span', { class: 'pz-punto' }),
          h('span', { text: `${e.nombre} de ${i.datos.abreviatura ?? i.datos.nombre}` }),
          h('span', { class: 'pz-tenue', text: textoEvaluacion(e, ctx.hoy) })))))),
    h('div', { class: 'pz-panel pz-cuenta-contenido' },
      h('div', { class: 'pz-panel-cabecera' },
        h('span', { class: 'pz-etiqueta', text: 'Contenido que entra' }),
        h('strong', { class: 'pz-panel-valor', text: pct(porcentaje) })),
      medidor(porcentaje, { etiqueta: `${ev.nombre}: contenido aprendido` }),
      h('ul', { class: 'pz-unidades' }, unidades.map(filaUnidad)),
      repasar.length > 0 && h('div', { class: 'pz-repasar' },
        h('span', { class: 'pz-etiqueta', text: 'Repasar primero' }),
        h('ol', null, repasar.map((p) => h('li', null, pips(p.tema.nivel ?? 0), h('span', { text: p.tema.nombre })))))));

  const actualizar = (ahora = new Date()) => {
    const c = cuentaRegresiva(ev, ahora);
    valor.textContent = c.valor;
    detalle.textContent = c.detalle ?? '';
    nodo.dataset.urgente = c.urgente ? 'si' : 'no';
  };
  actualizar();
  return { nodo, actualizar };
}

function diapoHoy(ctx) {
  const lista = focoDeHoy(ctx);
  const entradas = new Map(ctx.items.map((i) => [i.datos.id, i.entrada]));
  const vencidos = ctx.items.reduce((a, i) => a + i.resumen.vencidos, 0);
  const agenda = agendaDeHoy(ctx);
  const nodo = h('div', { class: 'pz-hoy' },
    h('div', { class: 'pz-hoy-cabecera' },
      h('div', null,
        h('p', { class: 'pz-eyebrow', text: `Hoy · ${fmtDia.format(new Date())}` }),
        h('h2', { class: 'pz-titulo-grande', text: 'Qué estudiar ahora' })),
      h('div', { class: 'pz-chips' },
        vencidos > 0 && h('span', { class: 'pz-chip pz-chip-alerta' }, icono('reloj', { tam: 16 }), plural(vencidos, 'repaso vencido', 'repasos vencidos')),
        agenda.map((t) => h('span', { class: 'pz-chip' }, icono('bandera', { tam: 16 }), t)))),
    h('ol', { class: 'pz-foco' }, lista.map((p, k) => {
      const nivel = p.tema.nivel ?? 0;
      return h('li', { style: tonoMateria(entradas.get(p.materia.id)) },
        h('span', { class: 'pz-foco-num', text: String(k + 1).padStart(2, '0') }),
        h('span', { class: 'pz-foco-tema', text: p.tema.nombre }),
        h('span', { class: 'pz-foco-sub' },
          h('span', { class: 'pz-punto' }),
          `${p.materia.abreviatura ?? p.materia.nombre} · U ${p.unidad.numero ?? p.unidad.id} · ${p.unidad.nombre}`),
        h('span', { class: 'pz-foco-meta' },
          h('span', { class: 'pz-foco-nivel' }, pips(nivel), NIVELES[nivel].nombre),
          h('span', { class: 'pz-foco-motivo' }, icono(p.motivo.startsWith('Repaso') ? 'reloj' : 'bandera', { tam: 16 }), p.motivo)));
    })));
  return { nodo };
}

function diapoMateria(ctx, item) {
  const { entrada, datos, resumen } = item;
  const serie = ctx.estado.historiales.get(ctx.cuatrimestre.id)?.materias?.[datos.id] ?? [];
  const p = datos.programa ?? {};
  const nodo = h('div', { class: 'pz-materia', style: tonoMateria(entrada) },
    h('div', { class: 'pz-materia-principal' },
      h('div', { class: 'pz-materia-id' },
        h('span', { class: 'pz-icono-grande' }, icono(entrada.icono, { tam: 32 })),
        h('div', null,
          h('p', { class: 'pz-eyebrow', text: [datos.abreviatura, p.nivel && `Nivel ${p.nivel}`, p.plan && `Plan ${p.plan}`].filter(Boolean).join(' · ') }),
          h('h2', { class: 'pz-titulo-grande', text: datos.nombre }))),
      h('div', { class: 'pz-materia-cifra' },
        h('span', { class: 'pz-hero', text: pct(resumen.porcentaje) }),
        h('span', { class: 'pz-hero-sub', text: `${resumen.dominados} de ${resumen.temas} temas dominados` })),
      medidor(resumen.porcentaje, { etiqueta: `${datos.nombre}: aprendido` }),
      distribucion(resumen.distribucion, { etiqueta: `${datos.nombre}, temas por nivel` }),
      leyendaNiveles({ conteo: resumen.distribucion }),
      serie.length >= 2 && h('div', { class: 'pz-evolucion' }, h('span', { class: 'pz-etiqueta', text: 'Evolución' }), evolucion(serie))),
    h('div', { class: 'pz-panel pz-materia-detalle' },
      resumen.evaluaciones.length > 0 && h('ul', { class: 'pz-parciales' }, resumen.evaluaciones.map((e) => h('li', null,
        h('span', { class: 'pz-parcial-nombre', text: e.nombre }),
        medidor(e.porcentaje, { fino: true, etiqueta: `${e.nombre}: contenido aprendido` }),
        h('strong', { text: pct(e.porcentaje) }),
        h('small', { text: textoEvaluacion(e, ctx.hoy) })))),
      h('span', { class: 'pz-etiqueta', text: 'Unidades' }),
      h('ul', { class: 'pz-unidades' }, datos.unidades.map(filaUnidad))));
  return { nodo };
}

const PREGUNTA = [
  '',
  '¿Lo podés explicar con tus palabras?',
  '¿Cómo lo usarías para resolver un ejercicio?',
  '¿Te sale un ejercicio tipo parcial sin mirar nada?',
  'Repaso rápido: ¿lo seguís dominando?',
];

function diapoPregunta(ctx) {
  const pozo = candidatosPregunta(ctx);
  const { item, unidad, tema } = pozo[Math.floor(Math.random() * pozo.length)];
  const nivel = tema.nivel ?? 0;
  const abrev = item.datos.abreviatura ?? item.datos.nombre;
  const nodo = h('div', { class: 'pz-pregunta', style: tonoMateria(item.entrada) },
    h('p', { class: 'pz-eyebrow' }, icono('lumen', { tam: 18 }), 'Pregunta al pasar'),
    h('p', { class: 'pz-pregunta-intro', text: PREGUNTA[nivel] }),
    h('h2', { class: 'pz-pregunta-tema', text: tema.nombre }),
    h('p', { class: 'pz-pregunta-meta' },
      h('span', { class: 'pz-icono-chico' }, icono(item.entrada.icono, { tam: 20 })),
      `${item.datos.nombre} · U ${unidad.numero ?? unidad.id} · ${unidad.nombre}`),
    h('p', { class: 'pz-pregunta-nivel' }, pips(nivel), `${NIVELES[nivel].nombre}${repasoVencido(tema, ctx.hoy) ? ' · repaso pendiente' : ''}`),
    h('p', { class: 'pz-pista', text: `Si te sale redondo, contáselo al agente de ${abrev} para que suba de nivel.` }));
  return { nodo };
}

function definiciones(ctx, { diapos }) {
  const lista = [];
  const agregar = (id, titulo, crear) => {
    if (!lista.some((d) => d.id === id)) lista.push({ id, titulo, crear });
  };
  const materia = (i) => agregar(i.datos.id, i.datos.abreviatura ?? i.datos.nombre, () => diapoMateria(ctx, i));
  for (const clave of diapos) {
    if (clave === 'cielo') agregar('cielo', 'Cielo', () => diapoCielo(ctx));
    else if (clave === 'cuenta') { if (proximasEvaluaciones(ctx).length) agregar('cuenta', 'Próximo examen', () => diapoCuenta(ctx)); }
    else if (clave === 'hoy') { if (focoDeHoy(ctx).length) agregar('hoy', 'Hoy', () => diapoHoy(ctx)); }
    else if (clave === 'pregunta') { if (candidatosPregunta(ctx).length) agregar('pregunta', 'Pregunta', () => diapoPregunta(ctx)); }
    else if (clave === 'materias') ctx.items.forEach(materia);
    else {
      const i = ctx.items.find((x) => x.datos.id === clave);
      if (i) materia(i);
    }
  }
  if (!lista.length) agregar('cielo', 'Cielo', () => diapoCielo(ctx));
  return lista;
}

function leerOpciones(q) {
  const diapos = (q.get('d') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const seg = Number(q.get('s'));
  return {
    diapos: diapos.length ? diapos : ORDEN,
    duracion: (Number.isFinite(seg) && seg >= 5 ? Math.min(seg, 600) : 20) * 1000,
    noche: q.get('noche') !== '0',
  };
}

// ---- Vista ----

export function vistaPizarra(estadoInicial, { consulta, recargar, salir }) {
  const opciones = leerOpciones(consulta);
  let estado = estadoInicial;
  let ctx = contexto(estado);
  let defs = definiciones(ctx, opciones);
  let indice = 0;
  let actual = null;
  let pausado = false;
  let acumulado = 0;
  let desde = 0;
  let raf = 0;
  let bloqueo = null;
  let ocultar = 0;
  let refrescando = false;
  let temaPrevio;
  const temporizadores = [];

  const reloj = h('strong');
  const fecha = h('span');
  const chipPausa = h('span', { class: 'pz-chip', hidden: true }, icono('pausa', { tam: 16 }), 'En pausa');
  const escena = h('section', { class: 'pz-escena', 'aria-live': 'polite' });
  const progreso = h('ol', { class: 'pz-progreso', 'aria-label': 'Diapositivas' });
  const avisos = h('div', { class: 'pz-avisos', 'aria-live': 'polite' });
  const puedePantallaCompleta = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);

  const boton = (nombre, etiqueta, accion) => h('button', { type: 'button', 'aria-label': etiqueta, title: etiqueta, onClick: accion }, icono(nombre, { tam: 22 }));
  const botonPausa = boton('pausa', 'Pausar', () => alternarPausa());
  const controles = h('div', { class: 'pz-controles', role: 'toolbar', 'aria-label': 'Controles de la pizarra' },
    boton('anterior', 'Anterior', () => mostrar(indice - 1)),
    botonPausa,
    boton('siguiente', 'Siguiente', () => mostrar(indice + 1)),
    puedePantallaCompleta && boton('expandir', 'Pantalla completa', () => alternarPantallaCompleta()),
    boton('cerrar', 'Salir de la pizarra', () => salir()));

  const raiz = h('div', { class: 'pizarra sin-cursor' },
    h('h1', { class: 'visualmente-oculto', text: 'Lumen, modo pizarra' }),
    h('header', { class: 'pz-cabecera' },
      h('div', { class: 'pz-marca' },
        icono('lumen', { tam: 22 }),
        h('span', { text: 'Lumen' }),
        h('span', { class: 'pz-contexto', text: [ctx.carrera.sigla, ctx.cuatrimestre.nombre].filter(Boolean).join(' · ') }),
        estado.demo && h('span', { class: 'pz-chip', text: 'demo' }),
        chipPausa),
      h('div', { class: 'pz-reloj' }, reloj, fecha)),
    escena,
    progreso,
    controles,
    avisos);

  function pintarProgreso() {
    progreso.replaceChildren(...defs.map((d, k) => h('li', { onClick: () => mostrar(k) },
      h('span', { class: 'pz-pista-barra' }, h('span')),
      h('span', { class: 'pz-seg-titulo', text: d.titulo }))));
    progreso.hidden = defs.length < 2;
    marcarProgreso();
  }

  function marcarProgreso() {
    [...progreso.children].forEach((li, k) => {
      li.dataset.estado = k === indice ? 'activo' : k < indice ? 'hecho' : '';
      li.style.setProperty('--p', k < indice ? 1 : 0);
    });
  }

  // Si la diapositiva no entra (pantalla chica o materia con muchas unidades), achica la letra hasta que entre.
  function encajar(marco) {
    let k = 1;
    marco.style.fontSize = '';
    while (marco.scrollHeight > marco.clientHeight + 2 && k > 0.62) {
      k -= 0.06;
      marco.style.fontSize = `${k.toFixed(2)}em`;
    }
  }

  function mostrar(i) {
    indice = ((i % defs.length) + defs.length) % defs.length;
    acumulado = 0;
    desde = performance.now();
    const diapo = defs[indice].crear();
    diapo.marco = h('div', { class: 'pz-diapo pz-entrando' }, diapo.nodo);
    for (const viejo of [...escena.children]) {
      viejo.classList.add('pz-saliendo');
      setTimeout(() => viejo.remove(), 800);
    }
    escena.append(diapo.marco);
    encajar(diapo.marco);
    diapo.montar?.();
    requestAnimationFrame(() => requestAnimationFrame(() => diapo.marco.classList.remove('pz-entrando')));
    actual = diapo;
    marcarProgreso();
  }

  let esperaTamano = 0;
  const cambioDeTamano = () => {
    clearTimeout(esperaTamano);
    esperaTamano = setTimeout(() => actual && encajar(actual.marco), 200);
  };

  function cuadro() {
    if (defs.length > 1 && !pausado) {
      const p = Math.min(1, (acumulado + performance.now() - desde) / opciones.duracion);
      progreso.children[indice]?.style.setProperty('--p', p);
      if (p >= 1) mostrar(indice + 1);
    }
    raf = requestAnimationFrame(cuadro);
  }

  function alternarPausa() {
    pausado = !pausado;
    if (pausado) acumulado += performance.now() - desde;
    else desde = performance.now();
    chipPausa.hidden = !pausado;
    botonPausa.replaceChildren(icono(pausado ? 'play' : 'pausa', { tam: 22 }));
    botonPausa.setAttribute('aria-label', pausado ? 'Reanudar' : 'Pausar');
    botonPausa.title = botonPausa.getAttribute('aria-label');
  }

  function alternarPantallaCompleta() {
    const activa = document.fullscreenElement || document.webkitFullscreenElement;
    const el = document.documentElement;
    if (activa) (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
    else (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
  }

  function mostrarControles() {
    raiz.dataset.controles = '';
    raiz.classList.remove('sin-cursor');
    clearTimeout(ocultar);
    ocultar = setTimeout(esconderControles, CONTROLES_MS);
  }

  function esconderControles() {
    delete raiz.dataset.controles;
    raiz.classList.add('sin-cursor');
  }

  // Mantener la pantalla encendida. Algunos navegadores lo permiten solo después de un toque: se reintenta.
  async function mantenerEncendida() {
    if (!('wakeLock' in navigator) || bloqueo || document.visibilityState !== 'visible') return;
    try {
      bloqueo = await navigator.wakeLock.request('screen');
      bloqueo.addEventListener('release', () => { bloqueo = null; });
    } catch {
      /* sin permiso todavía */
    }
  }

  function tictac() {
    const ahora = new Date();
    reloj.textContent = fmtHora.format(ahora);
    fecha.textContent = fmtDia.format(ahora);
    raiz.classList.toggle('atenuada', opciones.noche && ahora.getHours() < 7);
    actual?.actualizar?.(ahora);
    if (hoyISO(ahora) !== ctx.hoy) refrescar();
  }

  // Anti quemado de pantalla: corre todo unos píxeles cada tanto.
  function desplazar() {
    const r = () => `${Math.round(Math.random() * 8 - 4)}px`;
    raiz.style.setProperty('--dx', r());
    raiz.style.setProperty('--dy', r());
  }

  function celebrar(lista) {
    if (!lista.length) return;
    const mensajes = lista.length > 3
      ? [`${plural(lista.length, 'tema subió', 'temas subieron')} de nivel`]
      : lista.map((x) => `${x.materia.abreviatura ?? x.materia.nombre} · ${x.tema.nombre}: ${NIVELES[x.nivel].nombre}`);
    mensajes.forEach((texto, k) => temporizadores.push(setTimeout(() => {
      const aviso = h('div', { class: 'pz-aviso' }, icono('lumen', { tam: 20 }), h('span', { text: texto }));
      avisos.append(aviso);
      setTimeout(() => aviso.remove(), 7500);
    }, k * 2500)));
  }

  async function refrescar() {
    if (refrescando) return;
    refrescando = true;
    try {
      const nuevo = await recargar();
      celebrar(subidas(estado, nuevo));
      estado = nuevo;
      ctx = contexto(estado);
      const id = defs[indice]?.id;
      defs = definiciones(ctx, opciones);
      const k = defs.findIndex((d) => d.id === id);
      pintarProgreso();
      if (defs.length === 1 || k < 0) mostrar(Math.max(0, k));
      else {
        indice = k;
        marcarProgreso();
      }
    } catch (error) {
      console.warn('Lumen: no se pudieron recargar los datos; se reintenta en la próxima vuelta.', error);
    } finally {
      refrescando = false;
    }
  }

  const teclas = (e) => {
    const enBoton = e.target instanceof HTMLButtonElement;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') mostrar(indice + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') mostrar(indice - 1);
    else if ((e.key === ' ' || e.key === 'Enter' || e.key === 'MediaPlayPause') && !enBoton) alternarPausa();
    else if ((e.key === 'f' || e.key === 'F') && puedePantallaCompleta) alternarPantallaCompleta();
    else if (e.key === 'Escape' && !(document.fullscreenElement || document.webkitFullscreenElement)) salir();
    else return;
    e.preventDefault();
    mostrarControles();
  };

  const visibilidad = () => {
    if (document.visibilityState === 'visible') {
      desde = performance.now();
      mantenerEncendida();
      tictac();
    } else if (!pausado) {
      acumulado += performance.now() - desde;
    }
  };

  // Gestos: deslizar cambia de diapositiva; un toque muestra u oculta los controles.
  let inicioGesto = null;
  raiz.addEventListener('pointerdown', (e) => {
    inicioGesto = { x: e.clientX, y: e.clientY };
    mantenerEncendida();
  });
  raiz.addEventListener('pointerup', (e) => {
    if (!inicioGesto) return;
    const dx = e.clientX - inicioGesto.x;
    const dy = e.clientY - inicioGesto.y;
    inicioGesto = null;
    if (e.target.closest('.pz-controles, .pz-progreso')) return mostrarControles();
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      mostrar(indice + (dx < 0 ? 1 : -1));
      mostrarControles();
    } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      if ('controles' in raiz.dataset) {
        clearTimeout(ocultar);
        esconderControles();
      } else mostrarControles();
    }
  });
  raiz.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') mostrarControles();
  });

  return {
    nodo: raiz,
    titulo: 'Pizarra · Lumen',
    montar() {
      temaPrevio = document.documentElement.dataset.theme;
      document.documentElement.dataset.theme = 'dark';
      pintarProgreso();
      mostrar(0);
      tictac();
      raf = requestAnimationFrame(cuadro);
      temporizadores.push(setInterval(tictac, 10_000), setInterval(refrescar, RECARGA_MS), setInterval(desplazar, DESPLAZAR_MS));
      window.addEventListener('keydown', teclas);
      window.addEventListener('resize', cambioDeTamano);
      document.addEventListener('visibilitychange', visibilidad);
      mantenerEncendida();
    },
    desmontar() {
      cancelAnimationFrame(raf);
      temporizadores.forEach(clearInterval);
      clearTimeout(ocultar);
      window.removeEventListener('keydown', teclas);
      window.removeEventListener('resize', cambioDeTamano);
      document.removeEventListener('visibilitychange', visibilidad);
      bloqueo?.release().catch(() => {});
      bloqueo = null;
      if (temaPrevio) document.documentElement.dataset.theme = temaPrevio;
      if (document.fullscreenElement || document.webkitFullscreenElement) alternarPantallaCompleta();
    },
  };
}
