#!/usr/bin/env node
// Trae el lumen.json del repo de cada materia conectada (campo "fuente" en data/lumen.json),
// lo valida y lo guarda en data/. Después agrega un punto al historial de progreso de cada cuatrimestre.
//
// Token: LUMEN_SYNC_TOKEN (PAT con permiso de lectura de contenido sobre los repos de las materias).
// Sin token solo funciona con repos públicos.

import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validarMateria } from './validar.mjs';
import { DATA, aJSON, cargarIndice, leerJSON } from './datos.mjs';
import { hoyISO, porcentajeUnidades, unidadesDe } from '../assets/js/progreso.js';

const token = process.env.LUMEN_SYNC_TOKEN || process.env.GITHUB_TOKEN;
const resumen = [];
let fallas = 0;

async function leerSiExiste(ruta) {
  try {
    return await readFile(ruta, 'utf8');
  } catch {
    return null;
  }
}

async function traer({ repo, ruta = 'lumen.json', rama }) {
  const camino = ruta.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${repo}/contents/${camino}${rama ? `?ref=${encodeURIComponent(rama)}` : ''}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.raw+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'lumen-sync',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 404) throw new Error(`no se encontró ${repo}/${ruta} (¿existe el archivo? ¿el token tiene acceso al repo?)`);
  if (!res.ok) throw new Error(`GitHub respondió ${res.status} ${res.statusText}`);
  try {
    return JSON.parse(await res.text());
  } catch (e) {
    throw new Error(`${repo}/${ruta} no es JSON válido (${e.message})`);
  }
}

async function sincronizarMateria(entrada) {
  const destino = join(DATA, entrada.archivo);
  const origen = `${entrada.fuente.repo}/${entrada.fuente.ruta ?? 'lumen.json'}`;
  try {
    const datos = await traer(entrada.fuente);
    const { errores, avisos } = validarMateria(datos);
    if (datos.id !== entrada.id) errores.push(`id: es "${datos.id}" pero el índice espera "${entrada.id}"`);
    if (errores.length) {
      fallas++;
      resumen.push(`✗ ${entrada.id}: ${origen} no cumple el contrato, se mantiene la versión anterior`);
      for (const e of errores) resumen.push(`    error  ${e}`);
      return;
    }
    const nuevo = aJSON(datos);
    const cambio = (await leerSiExiste(destino)) !== nuevo;
    if (cambio) await writeFile(destino, nuevo);
    resumen.push(`${cambio ? '↻' : '='} ${entrada.id}: ${cambio ? 'actualizada' : 'sin cambios'} desde ${origen}`);
    for (const a of avisos) resumen.push(`    aviso  ${a}`);
  } catch (e) {
    fallas++;
    resumen.push(`✗ ${entrada.id}: ${e.message}`);
  }
}

// Un punto por día y por materia; solo se agrega si el progreso cambió respecto del último punto.
async function actualizarHistorial(cuatrimestre, hoy) {
  const ruta = join(DATA, cuatrimestre.id, 'historial.json');
  const historial = (await leerSiExiste(ruta)) ? await leerJSON(ruta) : { esquema: 'lumen/historial@1', materias: {} };
  let cambios = 0;
  for (const entrada of cuatrimestre.materias) {
    const materia = await leerJSON(join(DATA, entrada.archivo));
    const redondear = (x) => Math.round(x * 10) / 10;
    const punto = {
      fecha: hoy,
      porcentaje: redondear(porcentajeUnidades(materia.unidades)),
      evaluaciones: Object.fromEntries(
        materia.evaluaciones.map((e) => [e.id, redondear(porcentajeUnidades(unidadesDe(materia, e)))]),
      ),
    };
    const serie = (historial.materias[entrada.id] ??= []);
    const ultimo = serie.at(-1);
    const igual = ultimo && JSON.stringify({ ...ultimo, fecha: 0 }) === JSON.stringify({ ...punto, fecha: 0 });
    if (igual) continue;
    if (ultimo?.fecha === hoy) serie[serie.length - 1] = punto;
    else serie.push(punto);
    cambios++;
  }
  if (cambios) await writeFile(ruta, aJSON(historial));
  return cambios;
}

const indice = await cargarIndice();
const hoy = hoyISO();
const conectadas = indice.cuatrimestres.flatMap((c) => c.materias.filter((m) => m.fuente?.repo));

if (!conectadas.length) resumen.push('Ninguna materia tiene "fuente" configurada: no hay nada que traer.');
for (const entrada of conectadas) await sincronizarMateria(entrada);

for (const c of indice.cuatrimestres) {
  const n = await actualizarHistorial(c, hoy);
  if (n) resumen.push(`+ historial ${c.id}: ${n} ${n === 1 ? 'punto nuevo' : 'puntos nuevos'} (${hoy})`);
}

console.log(resumen.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `### Sincronización de materias\n\n\`\`\`\n${resumen.join('\n')}\n\`\`\`\n`);
}
process.exit(fallas ? 1 : 0);
