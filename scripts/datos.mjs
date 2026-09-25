// Lectura de los datos de Lumen desde Node (la web los lee con fetch en assets/js/datos.js).
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = join(RAIZ, 'data');

export const leerJSON = async (ruta) => JSON.parse(await readFile(ruta, 'utf8'));
export const aJSON = (datos) => `${JSON.stringify(datos, null, 2)}\n`;

export const cargarIndice = () => leerJSON(join(DATA, 'lumen.json'));

export function buscarCuatrimestre(indice, id = indice.cuatrimestre_actual) {
  const c = indice.cuatrimestres.find((x) => x.id === id);
  if (!c) throw new Error(`No existe el cuatrimestre "${id}" en data/lumen.json`);
  return c;
}

export const cargarMaterias = (cuatrimestre) =>
  Promise.all(cuatrimestre.materias.map((m) => leerJSON(join(DATA, m.archivo))));
