#!/usr/bin/env node
// Validador del contrato de datos de Lumen. No tiene dependencias: los repos de cada materia
// pueden descargar este archivo solo y correrlo sobre su lumen.json.
//
//   node scripts/validar.mjs                 valida data/lumen.json y todas las materias que referencia
//   node scripts/validar.mjs lumen.json ...  valida uno o más archivos de materia (lumen/materia@1)

import { readFile, access } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ESQUEMA_MATERIA = 'lumen/materia@1';
export const ESQUEMA_INDICE = 'lumen/indice@1';

const TIPOS_EVALUACION = ['parcial', 'recuperatorio', 'final', 'tp', 'integrador', 'otro'];
const ESTADOS_EVALUACION = ['pendiente', 'aprobado', 'desaprobado', 'ausente'];
const ESTADOS_MATERIA = ['cursando', 'regularizada', 'promocionada', 'aprobada', 'recursar', 'abandonada'];
const TIPOS_SESION = ['clase', 'teoria', 'practica', 'repaso', 'simulacro'];
const ICONOS = ['integral', 'senal', 'chip', 'libro', 'codigo', 'base-datos', 'red', 'grafico'];
const CLAVES_MATERIA = ['esquema', 'id', 'nombre', 'abreviatura', 'actualizado', 'programa', 'unidades',
  'evaluaciones', 'aprobacion', 'sesiones', 'extra'];

const RE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_REPO = /^[\w.-]+\/[\w.-]+$/;

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const esTexto = (v) => typeof v === 'string' && v.trim() !== '';
const esFecha = (v) => typeof v === 'string' && RE_FECHA.test(v) && !Number.isNaN(Date.parse(v));
const esEntero = (v, min, max) => Number.isInteger(v) && v >= min && (max === undefined || v <= max);

export function validarMateria(m) {
  const errores = [];
  const avisos = [];
  const err = (ruta, msg) => errores.push(`${ruta}: ${msg}`);
  const aviso = (ruta, msg) => avisos.push(`${ruta}: ${msg}`);

  if (!esObjeto(m)) return { errores: ['la raíz tiene que ser un objeto'], avisos };
  if (m.esquema !== ESQUEMA_MATERIA) err('esquema', `tiene que ser "${ESQUEMA_MATERIA}" (vino ${JSON.stringify(m.esquema)})`);
  if (!esTexto(m.id) || !RE_ID.test(m.id)) err('id', 'tiene que ser un slug en minúsculas, p. ej. "sistemas-operativos"');
  if (!esTexto(m.nombre)) err('nombre', 'falta el nombre de la materia');
  if (m.abreviatura !== undefined && !esTexto(m.abreviatura)) err('abreviatura', 'tiene que ser texto');
  if (m.actualizado !== undefined && (typeof m.actualizado !== 'string' || Number.isNaN(Date.parse(m.actualizado))))
    err('actualizado', 'tiene que ser una fecha-hora ISO 8601');
  if (m.programa !== undefined && !esObjeto(m.programa)) err('programa', 'tiene que ser un objeto');
  for (const k of Object.keys(m)) if (!CLAVES_MATERIA.includes(k)) aviso(k, 'clave desconocida (los datos propios del agente van en "extra")');

  const idsUnidad = new Set();
  const idsTema = new Set();
  if (!Array.isArray(m.unidades) || !m.unidades.length) {
    err('unidades', 'tiene que ser una lista con al menos una unidad');
  } else {
    m.unidades.forEach((u, i) => {
      const r = `unidades[${i}]`;
      if (!esObjeto(u)) return err(r, 'tiene que ser un objeto');
      if (!esTexto(u.id) || !RE_ID.test(u.id)) err(`${r}.id`, 'tiene que ser un slug, p. ej. "u3"');
      else if (idsUnidad.has(u.id)) err(`${r}.id`, `"${u.id}" está repetido`);
      else idsUnidad.add(u.id);
      if (!esTexto(u.nombre)) err(`${r}.nombre`, 'falta el nombre de la unidad');
      if (u.numero !== undefined && !esTexto(u.numero)) err(`${r}.numero`, 'tiene que ser texto, p. ej. "IV"');
      if (u.peso !== undefined && !(typeof u.peso === 'number' && u.peso > 0)) err(`${r}.peso`, 'tiene que ser un número mayor a 0');
      if (!Array.isArray(u.temas)) return err(`${r}.temas`, 'tiene que ser una lista');
      if (!u.temas.length) aviso(`${r}.temas`, 'la unidad no tiene temas; no suma al progreso');
      u.temas.forEach((t, j) => validarTema(t, `${r}.temas[${j}]`, idsTema, err, aviso));
    });
  }

  const idsEval = new Set();
  if (!Array.isArray(m.evaluaciones)) {
    err('evaluaciones', 'tiene que ser una lista (puede estar vacía)');
  } else {
    m.evaluaciones.forEach((e, i) => {
      const r = `evaluaciones[${i}]`;
      if (!esObjeto(e)) return err(r, 'tiene que ser un objeto');
      if (!esTexto(e.id) || !RE_ID.test(e.id)) err(`${r}.id`, 'tiene que ser un slug, p. ej. "p1"');
      else if (idsEval.has(e.id)) err(`${r}.id`, `"${e.id}" está repetido`);
      else idsEval.add(e.id);
      if (!esTexto(e.nombre)) err(`${r}.nombre`, 'falta el nombre');
      if (!TIPOS_EVALUACION.includes(e.tipo)) err(`${r}.tipo`, `tiene que ser uno de: ${TIPOS_EVALUACION.join(', ')}`);
      if (e.fecha !== null && e.fecha !== undefined && !esFecha(e.fecha)) err(`${r}.fecha`, 'tiene que ser AAAA-MM-DD o null');
      if (e.nota !== null && e.nota !== undefined && !(typeof e.nota === 'number' && e.nota >= 0 && e.nota <= 10))
        err(`${r}.nota`, 'tiene que ser un número de 0 a 10 o null');
      if (e.estado !== undefined && !ESTADOS_EVALUACION.includes(e.estado))
        err(`${r}.estado`, `tiene que ser uno de: ${ESTADOS_EVALUACION.join(', ')}`);
      if (!Array.isArray(e.unidades) || !e.unidades.length) err(`${r}.unidades`, 'tiene que listar al menos una unidad');
      else for (const uid of e.unidades) if (!idsUnidad.has(uid)) err(`${r}.unidades`, `la unidad "${uid}" no existe`);
    });
  }

  if (m.aprobacion !== undefined) {
    if (!esObjeto(m.aprobacion)) err('aprobacion', 'tiene que ser un objeto');
    else for (const k of ['promocion', 'regularizacion']) {
      const a = m.aprobacion[k];
      if (a === null || a === undefined) continue;
      if (!esObjeto(a) || typeof a.nota_minima !== 'number' || !esTexto(a.descripcion))
        err(`aprobacion.${k}`, 'tiene que ser null o { nota_minima: número, descripcion: texto }');
    }
  }

  if (m.sesiones !== undefined) {
    if (!Array.isArray(m.sesiones)) err('sesiones', 'tiene que ser una lista');
    else m.sesiones.forEach((s, i) => {
      const r = `sesiones[${i}]`;
      if (!esObjeto(s)) return err(r, 'tiene que ser un objeto');
      if (!esFecha(s.fecha)) err(`${r}.fecha`, 'tiene que ser AAAA-MM-DD');
      if (!(typeof s.minutos === 'number' && s.minutos > 0)) err(`${r}.minutos`, 'tiene que ser un número mayor a 0');
      if (s.tipo !== undefined && !TIPOS_SESION.includes(s.tipo)) err(`${r}.tipo`, `tiene que ser uno de: ${TIPOS_SESION.join(', ')}`);
      if (s.temas !== undefined) {
        if (!Array.isArray(s.temas)) err(`${r}.temas`, 'tiene que ser una lista de ids de tema');
        else for (const tid of s.temas) if (!idsTema.has(tid)) aviso(`${r}.temas`, `el tema "${tid}" no existe`);
      }
    });
  }

  if (m.extra !== undefined && !esObjeto(m.extra)) err('extra', 'tiene que ser un objeto');
  return { errores, avisos };
}

function validarTema(t, r, idsTema, err, aviso) {
  if (!esObjeto(t)) return err(r, 'tiene que ser un objeto');
  if (!esTexto(t.id) || !RE_ID.test(t.id)) err(`${r}.id`, 'tiene que ser un slug');
  else if (idsTema.has(t.id)) err(`${r}.id`, `"${t.id}" está repetido en la materia`);
  else idsTema.add(t.id);
  if (!esTexto(t.nombre)) err(`${r}.nombre`, 'falta el nombre del tema');
  if (!esEntero(t.nivel, 0, 4)) err(`${r}.nivel`, 'tiene que ser un entero de 0 a 4');
  if (t.peso !== undefined && !(typeof t.peso === 'number' && t.peso > 0)) err(`${r}.peso`, 'tiene que ser un número mayor a 0');
  if (t.porcentaje !== undefined && t.porcentaje !== t.nivel * 25)
    aviso(`${r}.porcentaje`, `no coincide con el nivel (${t.nivel} → ${t.nivel * 25}); Lumen usa el nivel`);
  if (t.notas !== undefined && typeof t.notas !== 'string') err(`${r}.notas`, 'tiene que ser texto');

  const ev = t.evidencia;
  if (ev === undefined) {
    if (t.nivel >= 3) aviso(r, `nivel ${t.nivel} sin evidencia registrada`);
    return;
  }
  if (!esObjeto(ev)) return err(`${r}.evidencia`, 'tiene que ser un objeto');
  if (ev.ejercicios !== undefined) {
    const x = ev.ejercicios;
    if (!esObjeto(x) || !esEntero(x.hechos, 0) || !esEntero(x.total, 0))
      err(`${r}.evidencia.ejercicios`, 'tiene que ser { hechos: entero, total: entero, correctos?: entero }');
    else {
      if (x.hechos > x.total) aviso(`${r}.evidencia.ejercicios`, 'hay más ejercicios hechos que el total');
      if (x.correctos !== undefined && !(esEntero(x.correctos, 0) && x.correctos <= x.hechos))
        err(`${r}.evidencia.ejercicios.correctos`, 'tiene que ser un entero entre 0 y "hechos"');
    }
  } else if (t.nivel >= 3) {
    aviso(`${r}.evidencia`, `nivel ${t.nivel} sin ejercicios registrados`);
  }
  if (ev.autoevaluaciones !== undefined) {
    if (!Array.isArray(ev.autoevaluaciones)) err(`${r}.evidencia.autoevaluaciones`, 'tiene que ser una lista');
    else ev.autoevaluaciones.forEach((a, k) => {
      if (!esObjeto(a) || !esFecha(a.fecha) || !(typeof a.puntaje === 'number' && a.puntaje >= 0 && a.puntaje <= 1))
        err(`${r}.evidencia.autoevaluaciones[${k}]`, 'tiene que ser { fecha: AAAA-MM-DD, puntaje: 0..1, tipo?: texto }');
    });
  }
  for (const k of ['ultimo_repaso', 'proximo_repaso'])
    if (ev[k] !== undefined && ev[k] !== null && !esFecha(ev[k])) err(`${r}.evidencia.${k}`, 'tiene que ser AAAA-MM-DD');
  if (t.nivel === 4 && !ev.ultimo_repaso) aviso(`${r}.evidencia`, 'nivel 4 sin fecha de último repaso');
  if (ev.minutos !== undefined && !(typeof ev.minutos === 'number' && ev.minutos >= 0))
    err(`${r}.evidencia.minutos`, 'tiene que ser un número mayor o igual a 0');
}

export function validarIndice(ix) {
  const errores = [];
  const avisos = [];
  const err = (ruta, msg) => errores.push(`${ruta}: ${msg}`);
  if (!esObjeto(ix)) return { errores: ['la raíz tiene que ser un objeto'], avisos };
  if (ix.esquema !== ESQUEMA_INDICE) err('esquema', `tiene que ser "${ESQUEMA_INDICE}"`);
  if (!esObjeto(ix.carrera) || !esTexto(ix.carrera.nombre)) err('carrera', 'falta { nombre, ... }');
  if (!Array.isArray(ix.cuatrimestres) || !ix.cuatrimestres.length) {
    err('cuatrimestres', 'tiene que ser una lista con al menos un cuatrimestre');
    return { errores, avisos };
  }
  const ids = new Set();
  ix.cuatrimestres.forEach((c, i) => {
    const r = `cuatrimestres[${i}]`;
    if (!esTexto(c.id) || !RE_ID.test(c.id)) err(`${r}.id`, 'tiene que ser un slug, p. ej. "2026-2c"');
    else if (ids.has(c.id)) err(`${r}.id`, `"${c.id}" está repetido`);
    else ids.add(c.id);
    if (!esTexto(c.nombre)) err(`${r}.nombre`, 'falta el nombre');
    for (const k of ['inicio', 'fin']) if (c[k] != null && !esFecha(c[k])) err(`${r}.${k}`, 'tiene que ser AAAA-MM-DD o null');
    if (!Array.isArray(c.materias)) return err(`${r}.materias`, 'tiene que ser una lista');
    const colores = new Set();
    c.materias.forEach((m, j) => {
      const rm = `${r}.materias[${j}]`;
      if (!esTexto(m.id) || !RE_ID.test(m.id)) err(`${rm}.id`, 'tiene que ser un slug');
      if (!esTexto(m.archivo) || !m.archivo.endsWith('.json')) err(`${rm}.archivo`, 'tiene que ser una ruta .json relativa a data/');
      if (!esEntero(m.color, 1, 6)) err(`${rm}.color`, 'tiene que ser un entero de 1 a 6 (paleta de materias)');
      else if (colores.has(m.color)) avisos.push(`${rm}.color: el color ${m.color} ya lo usa otra materia del cuatrimestre`);
      else colores.add(m.color);
      if (m.icono !== undefined && !ICONOS.includes(m.icono)) err(`${rm}.icono`, `tiene que ser uno de: ${ICONOS.join(', ')}`);
      if (!ESTADOS_MATERIA.includes(m.estado)) err(`${rm}.estado`, `tiene que ser uno de: ${ESTADOS_MATERIA.join(', ')}`);
      if (m.fuente !== null && m.fuente !== undefined) {
        const f = m.fuente;
        if (!esObjeto(f) || !RE_REPO.test(f.repo ?? '')) err(`${rm}.fuente`, 'tiene que ser null o { repo: "usuario/repo", ruta?, rama? }');
      }
    });
  });
  if (ix.cuatrimestre_actual && !ids.has(ix.cuatrimestre_actual))
    err('cuatrimestre_actual', `"${ix.cuatrimestre_actual}" no está en la lista de cuatrimestres`);
  return { errores, avisos };
}

// ---- CLI ----

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function leerJSON(ruta) {
  return JSON.parse(await readFile(ruta, 'utf8'));
}

function reportar(nombre, { errores, avisos }) {
  const icono = errores.length ? '✗' : '✓';
  console.log(`${icono} ${nombre}${avisos.length ? ` (${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'})` : ''}`);
  for (const e of errores) console.log(`    error  ${e}`);
  for (const a of avisos) console.log(`    aviso  ${a}`);
  return errores.length === 0;
}

async function validarArchivoMateria(ruta, idEsperado) {
  let datos;
  try {
    datos = await leerJSON(ruta);
  } catch (e) {
    return reportar(relative(process.cwd(), ruta) || ruta, { errores: [`no se pudo leer como JSON (${e.message})`], avisos: [] });
  }
  const res = validarMateria(datos);
  if (idEsperado && datos.id !== idEsperado) res.errores.push(`id: es "${datos.id}" pero el índice espera "${idEsperado}"`);
  return reportar(relative(process.cwd(), ruta) || ruta, res);
}

async function validarLumen() {
  const rutaIndice = join(RAIZ, 'data', 'lumen.json');
  const indice = await leerJSON(rutaIndice);
  let ok = reportar('data/lumen.json', validarIndice(indice));
  for (const c of indice.cuatrimestres ?? []) {
    for (const m of c.materias ?? []) {
      const ruta = join(RAIZ, 'data', m.archivo);
      try {
        await access(ruta);
      } catch {
        ok = reportar(`data/${m.archivo}`, { errores: ['el archivo no existe'], avisos: [] }) && ok;
        continue;
      }
      ok = (await validarArchivoMateria(ruta, m.id)) && ok;
    }
  }
  return ok;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const archivos = process.argv.slice(2);
  let ok = true;
  if (archivos.length) for (const a of archivos) ok = (await validarArchivoMateria(a)) && ok;
  else ok = await validarLumen();
  process.exit(ok ? 0 : 1);
}
