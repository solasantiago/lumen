#!/usr/bin/env node
// Lista los temas que conviene estudiar ahora, con la misma fórmula que usa la web ("Qué estudiar ahora").
//
//   node scripts/prioridades.mjs [--limite 15] [--cuatrimestre 2026-2c] [--hoy 2026-10-01] [--json]

import { parseArgs } from 'node:util';
import { buscarCuatrimestre, cargarIndice, cargarMaterias } from './datos.mjs';
import { NIVELES, hoyISO, prioridades } from '../assets/js/progreso.js';

const { values: op } = parseArgs({
  options: {
    limite: { type: 'string', default: '15' },
    cuatrimestre: { type: 'string' },
    hoy: { type: 'string' },
    json: { type: 'boolean', default: false },
  },
});

const indice = await cargarIndice();
const cuatrimestre = buscarCuatrimestre(indice, op.cuatrimestre);
const materias = await cargarMaterias(cuatrimestre);
const lista = prioridades(materias, { hoy: op.hoy ?? hoyISO(), limite: Number(op.limite) });

if (op.json) {
  console.log(JSON.stringify(lista.map((p) => ({
    materia: p.materia.id,
    unidad: p.unidad.id,
    tema: p.tema.id,
    nombre: p.tema.nombre,
    nivel: p.tema.nivel,
    evaluacion: p.evaluacion?.id ?? null,
    dias: p.dias,
    puntaje: Math.round(p.puntaje * 1000) / 1000,
    motivo: p.motivo,
  })), null, 2));
} else {
  console.log(`Prioridades · ${cuatrimestre.nombre}\n`);
  lista.forEach((p, i) => {
    const n = String(i + 1).padStart(2);
    const materia = (p.materia.abreviatura ?? p.materia.id).padEnd(4);
    console.log(`${n}. [${materia}] ${p.tema.nombre}`);
    console.log(`      U ${p.unidad.numero ?? p.unidad.id} · ${NIVELES[p.tema.nivel].nombre} · ${p.motivo} · puntaje ${p.puntaje.toFixed(2)}`);
  });
}
