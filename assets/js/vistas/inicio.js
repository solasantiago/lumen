// Vista de inicio: cielo del cuatrimestre, materias, qué estudiar ahora, trayecto en la carrera y guía de niveles.
import {
  NIVELES, diasEntre, hoyISO, porcentajeCuatrimestre, porcentajeTema, prioridades, resumenMateria,
} from '../progreso.js';
import {
  distribucion, fechaCorta, fechaLarga, h, horas, icono, leyendaNiveles, medidor, pct, pips, plural, tonoMateria,
} from '../ui.js';
import { dibujarCielo } from '../cielo.js';

function cifra({ etiqueta, valor, detalle, principal = false, extra }) {
  return h('div', { class: `tarjeta cifra${principal ? ' cifra-principal' : ''}` },
    h('span', { class: 'etiqueta', text: etiqueta }),
    h('span', { class: 'cifra-valor', text: valor }),
    extra,
    detalle && h('span', { class: 'cifra-detalle', text: detalle }),
  );
}

function cuandoEs(ev, hoy) {
  if (!ev?.fecha) return 'fecha a definir';
  const d = diasEntre(hoy, ev.fecha);
  return d === 0 ? 'hoy' : `en ${plural(d, 'día', 'días')}`;
}

function tarjetaMateria(item, hoy, enlace) {
  const { entrada, datos, resumen } = item;
  if (!datos) {
    return h('div', { class: 'tarjeta tarjeta-materia', style: tonoMateria(entrada) },
      h('h3', { class: 'materia-nombre', text: entrada.id }),
      h('p', { class: 'cifra-detalle', text: `No se pudo cargar data/${entrada.archivo}. Corré "npm run validar" para ver el problema.` }));
  }
  const nivel = datos.programa?.nivel;
  return h('a', { class: 'tarjeta tarjeta-materia', href: enlace(entrada), style: tonoMateria(entrada) },
    h('div', { class: 'materia-cabecera' },
      h('span', { class: 'materia-icono' }, icono(entrada.icono, { tam: 24 })),
      h('div', null,
        h('span', { class: 'etiqueta materia-abrev', text: [datos.abreviatura, nivel && `Nivel ${nivel}`].filter(Boolean).join(' · ') }),
        h('h3', { class: 'materia-nombre', text: datos.nombre })),
      h('span', { class: 'materia-flecha' }, icono('flecha', { tam: 20 }))),
    h('div', null,
      h('div', { class: 'materia-progreso' },
        h('span', { class: 'materia-porcentaje', text: pct(resumen.porcentaje) }),
        h('span', { class: 'materia-dominados', text: `${resumen.dominados} de ${resumen.temas} temas dominados` })),
      medidor(resumen.porcentaje, { etiqueta: `${datos.nombre}: aprendido` })),
    resumen.evaluaciones.length > 0 && h('ul', { class: 'evaluaciones-mini' },
      resumen.evaluaciones.map((e) => h('li', { class: 'evaluacion-mini' },
        h('span', { text: e.nombre }),
        medidor(e.porcentaje, { fino: true, etiqueta: `${e.nombre}: contenido aprendido` }),
        h('span', { class: 'valor', text: pct(e.porcentaje) }),
        h('small', { text: e.estado && e.estado !== 'pendiente'
          ? `${e.estado}${e.nota != null ? ` · nota ${e.nota}` : ''}`
          : e.fecha ? `${fechaLarga(e.fecha)} · ${cuandoEs(e, hoy)}` : 'fecha a definir' })))),
    distribucion(resumen.distribucion, { etiqueta: `${datos.nombre}, temas por nivel` }),
    h('div', { class: 'materia-pie' },
      h('span', { class: 'chip', text: plural(datos.unidades.length, 'unidad', 'unidades') }),
      h('span', { class: 'chip', text: plural(resumen.temas, 'tema', 'temas') }),
      resumen.vencidos > 0 && h('span', { class: 'chip alerta' }, icono('reloj', { tam: 14 }), plural(resumen.vencidos, 'repaso vencido', 'repasos vencidos')),
      h('span', { class: 'chip', text: entrada.fuente?.repo ?? 'Sin repo conectado' })),
  );
}

function focoItem(p, i, entradas, enlace) {
  const entrada = entradas.get(p.materia.id);
  const nivel = p.tema.nivel ?? 0;
  const vencido = p.motivo.startsWith('Repaso');
  return h('li', null,
    h('a', { class: 'tarjeta foco-item', href: enlace(entrada, { unidad: p.unidad.id, tema: p.tema.id }), style: tonoMateria(entrada) },
      h('span', { class: 'foco-orden', text: String(i + 1).padStart(2, '0') }),
      h('span', { class: 'foco-cuerpo' },
        h('span', { class: 'foco-tema', text: p.tema.nombre }),
        h('span', { class: 'foco-unidad', text: `U ${p.unidad.numero ?? p.unidad.id} · ${p.unidad.nombre}` }),
        h('span', { class: 'foco-meta' },
          h('span', { class: 'punto-materia', text: p.materia.abreviatura ?? p.materia.nombre }),
          h('span', { class: 'motivo' }, pips(nivel), `${NIVELES[nivel].nombre} · ${pct(porcentajeTema(p.tema))}`),
          h('span', { class: `motivo${vencido ? ' vencido' : ''}` }, icono(vencido ? 'reloj' : 'bandera', { tam: 14 }), p.motivo)))));
}

function trayecto(estado, cuatrimestreVisto, enlaceCuatri, enlaceMateria) {
  const { indice, materias } = estado;
  const niveles = indice.carrera?.niveles ?? 5;
  const todas = [...materias.values()].filter((m) => m.datos);
  const porNivel = new Map();
  for (const m of todas) {
    const n = m.datos.programa?.nivel;
    if (!n) continue;
    if (!porNivel.has(n)) porNivel.set(n, []);
    porNivel.get(n).push(m);
  }

  return h('div', { class: 'tarjeta trayecto' },
    h('ol', { class: 'niveles-carrera', style: { '--n': niveles } },
      Array.from({ length: niveles }, (_, i) => {
        const n = i + 1;
        const lista = porNivel.get(n) ?? [];
        const activo = lista.some((m) => m.cuatrimestre.id === cuatrimestreVisto.id);
        return h('li', { class: `nivel-carrera${activo ? ' activo' : ''}` },
          h('span', { class: 'nivel-nodo', 'aria-hidden': 'true', text: n }),
          h('span', { class: 'etiqueta', text: `Nivel ${n}` }),
          h('span', { class: 'nivel-materias' },
            lista.map((m) => h('a', {
              class: 'nivel-materia', href: enlaceMateria(m.cuatrimestre.id, m.entrada), style: tonoMateria(m.entrada),
              title: `${m.datos.nombre} · ${m.cuatrimestre.nombre} · ${m.entrada.estado}`,
            }, icono(m.entrada.icono, { tam: 14 }), m.datos.abreviatura ?? m.datos.nombre))));
      })),
    h('ul', { class: 'cuatrimestres', 'aria-label': 'Cuatrimestres' },
      indice.cuatrimestres.map((c) => {
        const datos = c.materias.map((e) => materias.get(`${c.id}/${e.id}`)?.datos).filter(Boolean);
        return h('li', null,
          h('a', {
            class: `cuatrimestre-nodo${c.id === cuatrimestreVisto.id ? ' actual' : ''}`, href: enlaceCuatri(c.id),
            'aria-current': c.id === cuatrimestreVisto.id ? 'page' : null,
          },
          h('strong', { text: c.nombre }),
          h('span', { text: `${plural(c.materias.length, 'materia', 'materias')} · ${pct(porcentajeCuatrimestre(datos))}` })));
      }),
      h('li', null, h('span', { class: 'cuatrimestre-nodo futuro' },
        h('strong', { text: 'Próximo cuatrimestre' }),
        h('span', { text: 'Se agrega en data/lumen.json' })))));
}

export function vistaInicio(estado, cuatrimestre, { enlace, enlaceCuatri, enlaceMateria }) {
  const hoy = hoyISO();
  const items = cuatrimestre.materias
    .map((e) => estado.materias.get(`${cuatrimestre.id}/${e.id}`))
    .filter(Boolean)
    .map((i) => (i.datos ? { ...i, resumen: resumenMateria(i.datos, hoy) } : i));
  const validos = items.filter((i) => i.datos);
  const materias = validos.map((i) => i.datos);
  const entradas = new Map(validos.map((i) => [i.datos.id, i.entrada]));

  const total = porcentajeCuatrimestre(materias);
  const temas = validos.reduce((a, i) => a + i.resumen.temas, 0);
  const dominados = validos.reduce((a, i) => a + i.resumen.dominados, 0);
  const vencidos = validos.reduce((a, i) => a + i.resumen.vencidos, 0);
  const minutos = validos.reduce((a, i) => a + i.resumen.minutos, 0);
  const proxima = validos
    .filter((i) => i.resumen.proxima?.fecha)
    .map((i) => ({ i, ev: i.resumen.proxima }))
    .sort((a, b) => a.ev.fecha.localeCompare(b.ev.fecha))[0];
  const sinProgreso = temas > 0 && total === 0;
  const carrera = estado.indice.carrera ?? {};

  const lienzo = h('div', { class: 'cielo-lienzo' });
  const vista = h('div', null,
    h('section', { class: 'hero contenedor', 'aria-labelledby': 'titulo' },
      h('p', { class: 'carrera' },
        h('span', { class: 'carrera-sigla' }, icono('terminal', { tam: 14 }), carrera.sigla ?? 'ISI'),
        h('span', { text: [carrera.nombre, [carrera.universidad, facultadCorta(carrera.facultad)].filter(Boolean).join(' '), carrera.plan && `Plan ${carrera.plan}`].filter(Boolean).join(' · ') })),
      h('h1', { id: 'titulo', tabindex: '-1' }, 'Lo que aprendés, ', h('em', { text: 'se enciende' }), '.'),
      h('p', { class: 'bajada' },
        `Mapa de estudio del ${cuatrimestre.nombre}. Cada estrella es un tema del programa y brilla según cuánto lo dominás.`,
        sinProgreso && !estado.demo && [' Todavía no hay progreso registrado: el cielo está listo para encenderse. ',
          h('a', { href: '?demo', text: 'Ver un ejemplo con datos' }), '.']),
      h('div', { class: 'cifras' },
        cifra({
          etiqueta: 'Cuatrimestre encendido', valor: pct(total), principal: true,
          extra: medidor(total, { etiqueta: 'Cuatrimestre: aprendido' }),
          detalle: `Promedio de ${plural(materias.length, 'materia', 'materias')}`,
        }),
        cifra({ etiqueta: 'Temas dominados', valor: String(dominados), detalle: `de ${temas} temas del programa` }),
        proxima
          ? cifra({
            etiqueta: 'Próxima evaluación', valor: fechaCorta(proxima.ev.fecha),
            detalle: `${proxima.ev.nombre} de ${proxima.i.datos.abreviatura ?? proxima.i.datos.nombre} · ${cuandoEs(proxima.ev, hoy)}`,
          })
          : cifra({ etiqueta: 'Próxima evaluación', valor: 'A definir', detalle: 'Cargá las fechas en cada materia' }),
        vencidos > 0
          ? cifra({ etiqueta: 'Repasos vencidos', valor: String(vencidos), detalle: 'Temas cuyo repaso ya tocaba' })
          : cifra({ etiqueta: 'Tiempo registrado', valor: horas(minutos), detalle: 'Sumando todas las materias' })),
      h('div', { class: 'cielo noche' },
        lienzo,
        h('div', { class: 'cielo-pie' },
          leyendaNiveles({ estrellas: true }),
          h('span', { text: 'Cada constelación es una unidad. Tocá una estrella para ir al tema.' })))),

    h('section', { class: 'seccion contenedor', 'aria-labelledby': 'titulo-materias' },
      h('div', { class: 'seccion-cabecera' },
        h('div', null,
          h('h2', { id: 'titulo-materias', text: 'Materias' }),
          h('p', { text: 'Porcentaje aprendido de cada materia y del contenido de cada parcial.' })),
        leyendaNiveles()),
      h('div', { class: 'grilla-materias' }, items.map((i) => tarjetaMateria(i, hoy, enlace)))),

    h('section', { class: 'seccion contenedor', 'aria-labelledby': 'titulo-foco' },
      h('div', { class: 'seccion-cabecera' },
        h('div', null,
          h('h2', { id: 'titulo-foco', text: 'Qué estudiar ahora' }),
          h('p', { text: 'Los temas con más peso según lo que te falta, la importancia de la unidad y la cercanía del próximo parcial.' }))),
      h('ol', { class: 'foco' },
        prioridades(materias, { hoy, limite: 6, maxPorMateria: 2 }).map((p, i) => focoItem(p, i, entradas, enlace)))),

    h('section', { class: 'seccion contenedor', 'aria-labelledby': 'titulo-trayecto' },
      h('div', { class: 'seccion-cabecera' },
        h('div', null,
          h('h2', { id: 'titulo-trayecto', text: 'Trayecto en la carrera' }),
          h('p', { text: `Dónde está cada materia dentro del plan de ${carrera.nombre ?? 'la carrera'}. Cada cuatrimestre nuevo se suma acá.` }))),
      trayecto(estado, cuatrimestre, enlaceCuatri, enlaceMateria)),

    h('section', { class: 'seccion contenedor', 'aria-labelledby': 'titulo-niveles' },
      h('div', { class: 'seccion-cabecera' },
        h('div', null,
          h('h2', { id: 'titulo-niveles', text: 'Cómo se mide' }),
          h('p', { text: 'Cada tema tiene un nivel de 0 a 4. Una unidad vale el promedio de sus temas; la materia y cada parcial, el promedio de sus unidades según su peso.' }))),
      h('ol', { class: 'guia-niveles' },
        NIVELES.map((n) => h('li', { class: 'tarjeta guia-nivel' },
          h('header', null, h('strong', { text: `${n.nivel} · ${n.nombre}` }), pips(n.nivel)),
          h('p', { text: n.criterio }),
          h('p', { class: 'etiqueta', style: { 'margin-top': '10px' }, text: `${n.porcentaje}%` }))))),
  );

  return {
    nodo: vista,
    titulo: `${cuatrimestre.nombre} · Lumen`,
    montar: () => dibujarCielo(lienzo, validos, { enlace }),
  };
}

function facultadCorta(facultad) {
  if (!facultad) return '';
  const m = facultad.match(/Facultad Regional (.+)/i);
  if (!m) return facultad;
  const siglas = { 'buenos aires': 'FRBA' };
  return siglas[m[1].toLowerCase()] ?? `FR ${m[1]}`;
}
