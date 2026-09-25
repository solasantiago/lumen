// Vista de una materia: ficha, distribución por nivel, evolución, evaluaciones y detalle por unidad y tema.
import {
  NIVELES, diasEntre, hoyISO, porcentajeTema, porcentajeUnidad, prioridades, repasoVencido, resumenMateria, temasDe,
} from '../progreso.js';
import {
  distribucion, fechaCorta, fechaLarga, h, horas, icono, leyendaNiveles, medidor, mostrarTooltip, ocultarTooltip, pct,
  pips, plural, s, tonoMateria, tooltipNivel,
} from '../ui.js';

const abiertas = new Map(); // unidades desplegadas por materia, para conservarlas al filtrar

function cuandoEs(ev, hoy) {
  if (!ev?.fecha) return 'Fecha a definir';
  const d = diasEntre(hoy, ev.fecha);
  const falta = d === 0 ? 'hoy' : d > 0 ? `en ${plural(d, 'día', 'días')}` : `hace ${plural(-d, 'día', 'días')}`;
  return `${fechaLarga(ev.fecha)} · ${falta}`;
}

function cifra({ etiqueta, valor, detalle, principal = false, extra }) {
  return h('div', { class: `cifra${principal ? ' cifra-principal' : ''}` },
    h('span', { class: 'etiqueta', text: etiqueta }),
    h('span', { class: 'cifra-valor', text: valor }),
    extra,
    detalle && h('span', { class: 'cifra-detalle', text: detalle }));
}

// ---- Evolución (una serie: sin leyenda, el título la nombra) ----

function evolucion(contenedor, serie) {
  const dibujar = () => {
    const W = Math.max(260, contenedor.clientWidth);
    const H = 132;
    const m = { arriba: 10, derecha: 44, abajo: 22, izquierda: 30 };
    const w = W - m.izquierda - m.derecha;
    const alto = H - m.arriba - m.abajo;
    const x = (i) => m.izquierda + (serie.length === 1 ? w : (i / (serie.length - 1)) * w);
    const y = (v) => m.arriba + alto - (v / 100) * alto;
    const linea = serie.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.porcentaje).toFixed(1)}`).join('');
    const area = `${linea}L${x(serie.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
    const ultimo = serie.at(-1);

    const guia = s('line', { y1: m.arriba, y2: m.arriba + alto, stroke: 'var(--tinta-3)', 'stroke-width': 1, visibility: 'hidden' });
    const punto = s('circle', { r: 4, fill: 'var(--acento)', stroke: 'var(--superficie)', 'stroke-width': 2, visibility: 'hidden' });
    const capa = s('rect', { x: m.izquierda, y: 0, width: w, height: H, fill: 'transparent', tabindex: 0, 'aria-label': 'Explorar la evolución con el puntero' });

    const mostrar = (i, cx, cy) => {
      const p = serie[i];
      guia.setAttribute('x1', x(i));
      guia.setAttribute('x2', x(i));
      punto.setAttribute('cx', x(i));
      punto.setAttribute('cy', y(p.porcentaje));
      guia.setAttribute('visibility', 'visible');
      punto.setAttribute('visibility', 'visible');
      mostrarTooltip(tooltipNivel({ valor: pct(p.porcentaje), color: 'var(--acento)', texto: fechaLarga(p.fecha) }), cx, cy);
    };
    const esconder = () => {
      guia.setAttribute('visibility', 'hidden');
      punto.setAttribute('visibility', 'hidden');
      ocultarTooltip();
    };
    capa.addEventListener('pointermove', (e) => {
      const r = capa.getBoundingClientRect();
      const rel = (e.clientX - r.left) / r.width;
      const i = Math.round(rel * (serie.length - 1));
      mostrar(Math.max(0, Math.min(serie.length - 1, i)), e.clientX, e.clientY);
    });
    capa.addEventListener('pointerleave', esconder);
    capa.addEventListener('focus', () => {
      const r = capa.getBoundingClientRect();
      mostrar(serie.length - 1, r.right, r.top);
    });
    capa.addEventListener('blur', esconder);

    contenedor.replaceChildren(s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': `Evolución: de ${pct(serie[0].porcentaje)} el ${fechaCorta(serie[0].fecha)} a ${pct(ultimo.porcentaje)} el ${fechaCorta(ultimo.fecha)}` },
      [0, 50, 100].map((v) => s('g', null,
        s('line', { x1: m.izquierda, x2: m.izquierda + w, y1: y(v), y2: y(v), stroke: 'var(--linea)', 'stroke-width': 1 }),
        s('text', { x: m.izquierda - 8, y: y(v), 'text-anchor': 'end', 'dominant-baseline': 'middle', fill: 'var(--tinta-3)', 'font-size': 10, style: { 'font-variant-numeric': 'tabular-nums' }, text: `${v}%` }))),
      s('text', { x: m.izquierda, y: H - 4, fill: 'var(--tinta-3)', 'font-size': 10, text: fechaCorta(serie[0].fecha) }),
      s('text', { x: m.izquierda + w, y: H - 4, 'text-anchor': 'end', fill: 'var(--tinta-3)', 'font-size': 10, text: fechaCorta(ultimo.fecha) }),
      s('path', { d: area, fill: 'var(--acento)', 'fill-opacity': 0.1 }),
      s('path', { d: linea, fill: 'none', stroke: 'var(--acento)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
      s('circle', { cx: x(serie.length - 1), cy: y(ultimo.porcentaje), r: 4, fill: 'var(--acento)', stroke: 'var(--superficie)', 'stroke-width': 2 }),
      s('text', { x: x(serie.length - 1) + 10, y: y(ultimo.porcentaje), 'dominant-baseline': 'middle', fill: 'var(--tinta)', 'font-size': 12, 'font-weight': 600, text: pct(ultimo.porcentaje) }),
      guia, punto, capa));
  };
  dibujar();
  let espera;
  const obs = new ResizeObserver(() => {
    if (!contenedor.isConnected) return obs.disconnect();
    clearTimeout(espera);
    espera = setTimeout(dibujar, 120);
  });
  obs.observe(contenedor);
}

// ---- Temas y unidades ----

function evidenciaTema(t, hoy) {
  const ev = t.evidencia ?? {};
  const partes = [];
  if (ev.ejercicios) partes.push(h('span', { text: `${ev.ejercicios.hechos}/${ev.ejercicios.total} ejercicios${ev.ejercicios.correctos != null ? ` (${ev.ejercicios.correctos} bien)` : ''}` }));
  const ultimaAuto = ev.autoevaluaciones?.at(-1);
  if (ultimaAuto) partes.push(h('span', { text: `autoevaluación ${pct(ultimaAuto.puntaje * 100)}` }));
  if (ev.ultimo_repaso) partes.push(h('span', { text: `repasado ${fechaCorta(ev.ultimo_repaso)}` }));
  if (ev.proximo_repaso) {
    partes.push(repasoVencido(t, hoy)
      ? h('span', { class: 'alerta' }, icono('reloj', { tam: 13 }), `repaso vencido (${fechaCorta(ev.proximo_repaso)})`)
      : h('span', { text: `próximo repaso ${fechaCorta(ev.proximo_repaso)}` }));
  }
  if (ev.minutos) partes.push(h('span', { text: horas(ev.minutos) }));
  return partes;
}

function filaTema(t, hoy, resaltado) {
  const nivel = t.nivel ?? 0;
  const evidencia = evidenciaTema(t, hoy);
  return h('li', { class: 'tema', id: `tema-${t.id}`, 'data-resaltado': resaltado ? '' : null },
    pips(nivel),
    h('span', { class: 'tema-nombre', text: t.nombre }),
    h('span', { class: 'tema-nivel', text: `${NIVELES[nivel].nombre} · ${pct(porcentajeTema(t))}` }),
    evidencia.length > 0 && h('span', { class: 'tema-evidencia' }, evidencia),
    t.notas && h('span', { class: 'tema-notas', text: t.notas }));
}

function tarjetaUnidad(u, clave, hoy, { abierta, temaResaltado }) {
  const set = abiertas.get(clave);
  const valor = porcentajeUnidad(u);
  const dominados = u.temas.filter((t) => t.nivel === NIVELES.length - 1).length;
  const det = h('details', { class: 'tarjeta unidad', id: `unidad-${u.id}`, open: abierta || set.has(u.id) },
    h('summary', null,
      h('span', { class: 'unidad-numero', text: `U ${u.numero ?? u.id}` }),
      h('span', { class: 'unidad-titulo', text: u.nombre }),
      h('span', { style: { display: 'inline-flex', 'align-items': 'center', gap: '10px' } },
        h('span', { class: 'unidad-valor', text: pct(valor) }),
        h('span', { class: 'unidad-chevron' }, icono('chevron', { tam: 18 }))),
      h('span', { class: 'unidad-barra' },
        medidor(valor, { fino: true, etiqueta: `${u.nombre}: aprendido` }),
        h('span', { text: `${plural(u.temas.length, 'tema', 'temas')} · ${dominados} ${dominados === 1 ? 'dominado' : 'dominados'}` }))),
    u.temas.length
      ? h('ul', { class: 'temas' }, u.temas.map((t) => filaTema(t, hoy, t.id === temaResaltado)))
      : h('p', { class: 'vacio', text: 'Esta unidad todavía no tiene temas cargados.' }));
  det.addEventListener('toggle', () => (det.open ? set.add(u.id) : set.delete(u.id)));
  return det;
}

function tabla(datos, unidades, hoy) {
  return h('div', { class: 'tabla-envoltura' },
    h('table', null,
      h('caption', { class: 'visualmente-oculto', text: `Temas de ${datos.nombre} con su nivel y evidencia` }),
      h('thead', null, h('tr', null, ['Unidad', 'Tema', 'Nivel', 'Ejercicios', 'Último repaso', 'Próximo repaso'].map((c) => h('th', { scope: 'col', text: c })))),
      h('tbody', null, unidades.flatMap((u) => u.temas.map((t) => {
        const ev = t.evidencia ?? {};
        const nivel = t.nivel ?? 0;
        return h('tr', null,
          h('td', { class: 'num', text: `U ${u.numero ?? u.id}` }),
          h('td', { text: t.nombre }),
          h('td', null, h('span', { class: 'celda-nivel' }, pips(nivel), `${NIVELES[nivel].nombre} · ${pct(porcentajeTema(t))}`)),
          h('td', { class: 'num', text: ev.ejercicios ? `${ev.ejercicios.hechos}/${ev.ejercicios.total}` : '—' }),
          h('td', { class: 'num', text: ev.ultimo_repaso ? fechaCorta(ev.ultimo_repaso) : '—' }),
          h('td', { class: 'num' }, ev.proximo_repaso
            ? (repasoVencido(t, hoy) ? h('span', { class: 'alerta' }, icono('reloj', { tam: 13 }), fechaCorta(ev.proximo_repaso)) : fechaCorta(ev.proximo_repaso))
            : '—'));
      })))));
}

// ---- Vista ----

export function vistaMateria(estado, item, { enlace, enlaceCuatri, filtro, vista, unidad, tema, alCambiar }) {
  const { entrada, datos, cuatrimestre } = item;
  const hoy = hoyISO();
  const clave = `${cuatrimestre.id}/${entrada.id}`;
  if (!abiertas.has(clave)) abiertas.set(clave, new Set());

  if (!datos) {
    return {
      titulo: 'Materia no disponible · Lumen',
      nodo: h('div', { class: 'contenedor' },
        h('a', { class: 'volver', href: enlaceCuatri(cuatrimestre.id) }, icono('volver', { tam: 16 }), 'Todas las materias'),
        h('div', { class: 'tarjeta error-carga' },
          h('h1', { tabindex: '-1', text: 'No se pudo cargar la materia' }),
          h('p', { text: `Revisá data/${entrada.archivo} con "npm run validar".` }))),
    };
  }

  const resumen = resumenMateria(datos, hoy);
  const evaluacion = datos.evaluaciones.find((e) => e.id === filtro) ?? null;
  const unidades = evaluacion ? datos.unidades.filter((u) => evaluacion.unidades.includes(u.id)) : datos.unidades;
  const temas = temasDe(datos.unidades);
  const practicados = temas.filter((t) => t.nivel === 3).length;
  const serie = estado.historiales.get(cuatrimestre.id)?.materias?.[datos.id] ?? [];
  const sesiones = datos.sesiones?.length ?? 0;
  const p = datos.programa ?? {};

  const repasar = prioridades([{ ...datos, unidades }], { hoy, limite: 6 });

  const lienzoEvolucion = serie.length >= 2 ? h('div') : null;

  const botonFiltro = (id, texto) => h('button', {
    type: 'button', 'aria-pressed': String((filtro ?? null) === id), onClick: () => alCambiar({ filtro: id }),
  }, texto);

  const nodo = h('div', { class: 'contenedor', style: tonoMateria(entrada) },
    h('a', { class: 'volver', href: enlaceCuatri(cuatrimestre.id) }, icono('volver', { tam: 16 }), `Materias del ${cuatrimestre.nombre}`),

    h('article', { class: 'tarjeta ficha' },
      h('div', { class: 'ficha-cabecera' },
        h('span', { class: 'materia-icono grande' }, icono(entrada.icono, { tam: 32 })),
        h('div', null,
          h('span', { class: 'etiqueta', text: [datos.abreviatura, p.nivel && `Nivel ${p.nivel}`, p.plan && `Plan ${p.plan}`].filter(Boolean).join(' · ') }),
          h('h1', { tabindex: '-1', text: datos.nombre }))),
      h('div', { class: 'ficha-chips' },
        p.horas_reloj && h('span', { class: 'chip', text: `${p.horas_reloj} h reloj` }),
        p.modalidad && h('span', { class: 'chip', text: p.modalidad }),
        p.area && h('span', { class: 'chip', text: p.area }),
        entrada.fuente?.repo
          ? h('a', { class: 'chip', href: `https://github.com/${entrada.fuente.repo}`, rel: 'noopener' }, icono('github', { tam: 14 }), entrada.fuente.repo)
          : h('span', { class: 'chip', text: 'Sin repo conectado' }),
        datos.actualizado && h('span', { class: 'chip', text: `Actualizado ${fechaCorta(datos.actualizado.slice(0, 10))}` })),
      h('div', { class: 'ficha-cifras' },
        cifra({ etiqueta: 'Aprendido', valor: pct(resumen.porcentaje), principal: true, extra: medidor(resumen.porcentaje, { etiqueta: 'Materia: aprendido' }), detalle: `${resumen.temas} temas en ${datos.unidades.length} unidades` }),
        cifra({ etiqueta: 'Temas dominados', valor: String(resumen.dominados), detalle: `${practicados} practicados más` }),
        cifra({ etiqueta: 'Próxima evaluación', valor: resumen.proxima?.nombre ?? 'Ninguna', detalle: resumen.proxima ? cuandoEs(resumen.proxima, hoy) : 'No hay evaluaciones pendientes' }),
        cifra({ etiqueta: 'Tiempo registrado', valor: horas(resumen.minutos), detalle: sesiones ? plural(sesiones, 'sesión', 'sesiones') : 'Sin sesiones cargadas' }))),

    h('div', { class: 'dos-columnas' },
      h('section', { class: 'tarjeta panel', 'aria-labelledby': 'titulo-niveles' },
        h('div', { class: 'panel-cabecera' },
          h('h2', { id: 'titulo-niveles', text: 'Temas por nivel' }),
          h('p', { text: `${resumen.dominados} de ${resumen.temas} dominados` })),
        distribucion(resumen.distribucion),
        leyendaNiveles({ conteo: resumen.distribucion }),
        lienzoEvolucion && h('div', { class: 'evolucion' },
          h('div', { class: 'evolucion-titulo' }, h('span', { text: 'Evolución del aprendizaje' }), h('span', { text: plural(serie.length, 'registro', 'registros') })),
          lienzoEvolucion)),
      h('section', { class: 'tarjeta panel', 'aria-labelledby': 'titulo-evaluaciones' },
        h('div', { class: 'panel-cabecera' },
          h('h2', { id: 'titulo-evaluaciones', text: 'Evaluaciones' }),
          h('p', { text: 'Tocá una para filtrar sus unidades' })),
        resumen.evaluaciones.length
          ? h('ul', { class: 'lista-evaluaciones' }, resumen.evaluaciones.map((e) => h('li', null,
            h('button', { type: 'button', class: 'evaluacion', 'aria-pressed': String(filtro === e.id), onClick: () => alCambiar({ filtro: filtro === e.id ? null : e.id }) },
              h('span', { class: 'evaluacion-fila' }, h('strong', { text: e.nombre }), h('span', { class: 'valor', text: pct(e.porcentaje) })),
              medidor(e.porcentaje, { fino: true, etiqueta: `${e.nombre}: contenido aprendido` }),
              h('small', { text: [
                cuandoEs(e, hoy),
                `U ${datos.unidades.filter((u) => e.unidades.includes(u.id)).map((u) => u.numero ?? u.id).join(', ')}`,
                e.estado && e.estado !== 'pendiente' ? `${e.estado}${e.nota != null ? ` (${e.nota})` : ''}` : null,
              ].filter(Boolean).join(' · ') })))))
          : h('p', { class: 'cifra-detalle', text: 'Sin evaluaciones cargadas.' }),
        h('div', { class: 'requisitos' },
          datos.aprobacion?.promocion && h('p', null, h('strong', { text: `Promoción (≥ ${datos.aprobacion.promocion.nota_minima}): ` }), datos.aprobacion.promocion.descripcion),
          datos.aprobacion?.regularizacion && h('p', null, h('strong', { text: `Regularización (≥ ${datos.aprobacion.regularizacion.nota_minima}): ` }), datos.aprobacion.regularizacion.descripcion),
          datos.aprobacion?.notas && h('p', { text: datos.aprobacion.notas })))),

    h('div', { class: 'filtros', role: 'toolbar', 'aria-label': 'Filtros de contenido' },
      h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Contenido' },
        botonFiltro(null, 'Toda la materia'),
        datos.evaluaciones.map((e) => botonFiltro(e.id, e.nombre))),
      h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Vista' },
        h('button', { type: 'button', 'aria-pressed': String(vista !== 'tabla'), onClick: () => alCambiar({ vista: null }) }, 'Unidades'),
        h('button', { type: 'button', 'aria-pressed': String(vista === 'tabla'), onClick: () => alCambiar({ vista: 'tabla' }) }, 'Tabla'))),

    h('div', { class: 'contenido-materia' },
      vista === 'tabla'
        ? tabla(datos, unidades, hoy)
        : h('div', { class: 'unidades' }, unidades.map((u) => tarjetaUnidad(u, clave, hoy, { abierta: u.id === unidad, temaResaltado: tema }))),
      h('aside', { class: 'tarjeta panel', 'aria-labelledby': 'titulo-repasar' },
        h('div', { class: 'panel-cabecera' },
          h('h2', { id: 'titulo-repasar', text: 'Estudiar primero' }),
          h('p', { text: evaluacion ? `Para el ${evaluacion.nombre.toLowerCase()}` : 'Toda la materia' })),
        repasar.length
          ? h('ol', { class: 'lista-foco' }, repasar.map((x) => h('li', null,
            h('a', { href: enlace(entrada, { unidad: x.unidad.id, tema: x.tema.id, filtro, vista }) },
              h('strong', { text: x.tema.nombre }),
              h('span', { text: `U ${x.unidad.numero ?? x.unidad.id} · ${NIVELES[x.tema.nivel ?? 0].nombre} · ${x.motivo}` })))))
          : h('p', { class: 'cifra-detalle', text: 'No queda nada pendiente en este contenido.' }))),
  );

  return {
    nodo,
    titulo: `${datos.nombre} · Lumen`,
    montar: () => {
      if (lienzoEvolucion) evolucion(lienzoEvolucion, serie);
      if (tema) {
        const el = document.getElementById(`tema-${tema}`);
        if (el) {
          el.scrollIntoView({ block: 'center' });
          el.style.setProperty('background', 'var(--acento-suave)');
          el.style.setProperty('border-radius', '10px');
          setTimeout(() => el.style.removeProperty('background'), 2400);
        }
      } else if (unidad) {
        document.getElementById(`unidad-${unidad}`)?.scrollIntoView({ block: 'start' });
      }
    },
  };
}
