// Arranque de Lumen: carga datos, arma la barra y el pie, y resuelve rutas con hash.
//   #/                       cuatrimestre actual
//   #/c/<cuatrimestre>       otro cuatrimestre
//   #/c/<cuatrimestre>/<materia>?f=<evaluación>&v=tabla&u=<unidad>&t=<tema>
//   #/pizarra?d=<diapositivas>&s=<segundos>   modo pizarra (ver vistas/pizarra.js)
import { cargar } from './datos.js';
import { h, icono, ocultarTooltip } from './ui.js';
import { vistaInicio } from './vistas/inicio.js';
import { vistaMateria } from './vistas/materia.js';
import { vistaPizarra } from './vistas/pizarra.js';

const demo = new URLSearchParams(location.search).has('demo');
const main = document.getElementById('contenido');
let estado;
let rutaPrevia = '';
let vistaActual = null;

function leerRuta() {
  const [camino, consulta = ''] = location.hash.replace(/^#/, '').split('?');
  const partes = camino.split('/').filter(Boolean);
  const q = new URLSearchParams(consulta);
  return {
    cuatrimestre: partes[0] === 'c' ? partes[1] : null,
    materia: partes[0] === 'c' ? partes[2] ?? null : null,
    filtro: q.get('f'),
    vista: q.get('v'),
    unidad: q.get('u'),
    tema: q.get('t'),
    consulta: q,
    camino,
  };
}

const enlaceCuatri = (cid) => (cid === estado.indice.cuatrimestre_actual ? '#/' : `#/c/${cid}`);

function enlaceMateria(cid, entrada, { unidad, tema, filtro, vista } = {}) {
  const q = new URLSearchParams();
  if (filtro) q.set('f', filtro);
  if (vista) q.set('v', vista);
  if (unidad) q.set('u', unidad);
  if (tema) q.set('t', tema);
  const qs = q.toString();
  return `#/c/${cid}/${entrada.id}${qs ? `?${qs}` : ''}`;
}

function temaInicial() {
  try {
    return localStorage.getItem('lumen-tema') ?? 'dark';
  } catch {
    return 'dark';
  }
}

function cambiarTema(boton) {
  const nuevo = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nuevo;
  try {
    localStorage.setItem('lumen-tema', nuevo);
  } catch {
    /* sin almacenamiento: el tema dura hasta recargar */
  }
  pintarBotonTema(boton);
}

function pintarBotonTema(boton) {
  const oscuro = document.documentElement.dataset.theme === 'dark';
  boton.replaceChildren(icono(oscuro ? 'sol' : 'luna', { tam: 18 }));
  boton.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  boton.title = boton.getAttribute('aria-label');
}

function barra(cuatrimestreId) {
  const { indice } = estado;
  const botonTema = h('button', { type: 'button', class: 'boton-icono', onClick: (e) => cambiarTema(e.currentTarget) });
  pintarBotonTema(botonTema);
  const selector = indice.cuatrimestres.length > 1
    ? h('select', {
      class: 'selector', 'aria-label': 'Cuatrimestre',
      onChange: (e) => { location.hash = enlaceCuatri(e.target.value); },
    }, indice.cuatrimestres.map((c) => h('option', { value: c.id, selected: c.id === cuatrimestreId, text: c.nombre })))
    : h('span', { class: 'chip', text: indice.cuatrimestres[0].nombre });

  return h('header', { class: 'barra' },
    h('div', { class: 'contenedor' },
      h('a', { class: 'marca', href: '#/', 'aria-label': 'Lumen, inicio' }, icono('lumen', { tam: 22 }), 'Lumen'),
      h('div', { class: 'barra-acciones' },
        selector,
        h('a', { class: 'boton-icono', href: '#/pizarra', 'aria-label': 'Modo pizarra', title: 'Modo pizarra (para la tele o el iPad)' }, icono('pantalla', { tam: 18 })),
        botonTema,
        indice.repositorio && h('a', { class: 'boton-icono', href: indice.repositorio, rel: 'noopener', 'aria-label': 'Repositorio en GitHub', title: 'Repositorio en GitHub' }, icono('github', { tam: 18 })))));
}

function avisoDemo() {
  return h('div', { class: 'aviso-demo', role: 'status' },
    h('div', { class: 'contenedor' },
      h('strong', { text: 'Modo demo.' }),
      h('span', { text: 'Niveles, fechas y evolución inventados para mostrar cómo se ve Lumen con progreso.' }),
      h('a', { href: `${location.pathname}${location.hash}`, text: 'Ver mis datos reales' })));
}

function pie() {
  const { indice, materias } = estado;
  const fechas = [...materias.values()].map((m) => m.datos?.actualizado).filter(Boolean).sort();
  const ultima = fechas.at(-1);
  const carrera = indice.carrera ?? {};
  return h('footer', { class: 'pie' },
    h('div', { class: 'contenedor' },
      h('span', { text: `Lumen · ${[carrera.sigla, carrera.universidad].filter(Boolean).join(' ')}${indice.estudiante ? ` · ${indice.estudiante}` : ''}` }),
      h('span', null,
        'Datos con contrato ', h('code', { class: 'mono', text: 'lumen/materia@1' }),
        ultima ? ` · actualizado ${new Date(ultima).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''),
      h('span', null,
        h('a', { href: '#/pizarra', text: 'Modo pizarra' }),
        indice.repositorio && [' · ', h('a', { href: `${indice.repositorio}/blob/main/docs/contrato.md`, text: 'Cómo se cargan las métricas' })])));
}

async function recargar() {
  estado = await cargar({ demo });
  return estado;
}

function render() {
  ocultarTooltip();
  vistaActual?.desmontar?.();
  const ruta = leerRuta();
  const { indice, materias } = estado;
  const cuatrimestre = indice.cuatrimestres.find((c) => c.id === ruta.cuatrimestre)
    ?? indice.cuatrimestres.find((c) => c.id === indice.cuatrimestre_actual)
    ?? indice.cuatrimestres.at(-1);

  document.querySelector('.barra')?.replaceWith(barra(cuatrimestre.id));
  const enlace = (entrada, opciones) => enlaceMateria(cuatrimestre.id, entrada, opciones);

  let vista;
  const item = ruta.materia && materias.get(`${cuatrimestre.id}/${ruta.materia}`);
  const pizarra = ruta.camino === 'pizarra' || ruta.camino === '/pizarra';
  document.body.classList.toggle('modo-pizarra', pizarra);
  if (pizarra) {
    vista = vistaPizarra(estado, { consulta: ruta.consulta, recargar, salir: () => { location.hash = '#/'; } });
  } else if (item) {
    vista = vistaMateria(estado, item, {
      enlace, enlaceCuatri,
      filtro: ruta.filtro, vista: ruta.vista, unidad: ruta.unidad, tema: ruta.tema,
      alCambiar: (cambios) => {
        const actual = { filtro: ruta.filtro, vista: ruta.vista, ...cambios };
        history.replaceState(null, '', enlace(item.entrada, actual));
        render();
      },
    });
  } else {
    vista = vistaInicio(estado, cuatrimestre, {
      enlace, enlaceCuatri, enlaceMateria: (cid, entrada) => enlaceMateria(cid, entrada),
    });
  }

  main.replaceChildren(vista.nodo);
  vistaActual = vista;
  document.title = vista.titulo;
  const cambioDePagina = ruta.camino !== rutaPrevia;
  rutaPrevia = ruta.camino;
  if (cambioDePagina && !ruta.unidad && !ruta.tema) {
    window.scrollTo(0, 0);
    main.querySelector('h1')?.focus({ preventScroll: true });
  }
  vista.montar?.();
}

async function iniciar() {
  document.documentElement.dataset.theme = temaInicial();
  try {
    estado = await cargar({ demo });
  } catch (error) {
    main.replaceChildren(h('div', { class: 'contenedor' },
      h('div', { class: 'tarjeta error-carga' },
        h('h1', { text: 'No se pudieron cargar los datos' }),
        h('p', { text: `Detalle: ${error.message}.` }),
        h('p', { text: 'Si abriste index.html directo desde el disco, levantá un servidor local con "npm run dev" o "python3 -m http.server" y entrá por http://localhost.' }))));
    return;
  }
  document.body.prepend(barra(estado.indice.cuatrimestre_actual));
  if (demo) document.querySelector('.barra').after(avisoDemo());
  main.after(pie());
  window.addEventListener('hashchange', render);
  render();
}

iniciar();
