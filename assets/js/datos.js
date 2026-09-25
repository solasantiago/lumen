// Carga de datos para la web: data/lumen.json + el archivo de cada materia + el historial de cada cuatrimestre.
import { MAX_NIVEL, hoyISO, porcentajeUnidades, unidadesDe } from './progreso.js';

async function getJSON(ruta) {
  const res = await fetch(ruta, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${ruta}: ${res.status}`);
  return res.json();
}

export async function cargar({ demo = false } = {}) {
  const indice = await getJSON('data/lumen.json');
  const materias = new Map();
  const historiales = new Map();

  await Promise.all(indice.cuatrimestres.flatMap((c) => [
    getJSON(`data/${c.id}/historial.json`).then((h) => historiales.set(c.id, h), () => {}),
    ...c.materias.map(async (entrada) => {
      const clave = `${c.id}/${entrada.id}`;
      try {
        materias.set(clave, { entrada, cuatrimestre: c, datos: await getJSON(`data/${entrada.archivo}`) });
      } catch (error) {
        materias.set(clave, { entrada, cuatrimestre: c, datos: null, error });
      }
    }),
  ]));

  const estado = { indice, materias, historiales, demo };
  if (demo) aplicarDemo(estado);
  return estado;
}

// ---- Modo demo: niveles y fechas inventados para ver cómo luce la web con progreso ----

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

function sumarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(a, m - 1, d + n);
  return hoyISO(f);
}

function aplicarDemo({ indice, materias, historiales }) {
  const hoy = hoyISO();
  const intervalo = [1, 3, 6, 10, 21];
  for (const { datos, cuatrimestre } of materias.values()) {
    if (!datos || cuatrimestre.id !== indice.cuatrimestre_actual) continue;
    const r = azar(datos.id);
    const avance = 0.4 + r() * 0.25;
    const k = datos.unidades.length;
    datos.unidades.forEach((u, i) => {
      const base = (avance * 1.5 - i / k) * 5;
      for (const t of u.temas) {
        t.nivel = Math.max(0, Math.min(MAX_NIVEL, Math.round(base + (r() - 0.5) * 2.4)));
        if (!t.nivel) continue;
        const ultimo = sumarDias(hoy, -Math.ceil(r() * 12));
        t.evidencia = {
          ultimo_repaso: ultimo,
          proximo_repaso: sumarDias(ultimo, intervalo[t.nivel]),
          minutos: t.nivel * 30 + Math.round(r() * 60),
          ...(t.nivel >= 2 && { ejercicios: { hechos: t.nivel * 3, total: 12 } }),
        };
      }
    });
    const [p1, p2] = datos.evaluaciones;
    if (p1) p1.fecha = sumarDias(hoy, 6 + Math.floor(r() * 14));
    if (p2) p2.fecha = sumarDias(hoy, 50 + Math.floor(r() * 20));
    datos.sesiones = Array.from({ length: 6 + Math.floor(r() * 8) }, (_, i) => ({
      fecha: sumarDias(hoy, -i * 2), minutos: 45 + Math.round(r() * 90), tipo: 'practica',
    }));

    // Historial inventado: sube hasta el valor actual en las últimas semanas.
    const final = porcentajeUnidades(datos.unidades);
    const serie = Array.from({ length: 8 }, (_, i) => {
      const f = (i + 1) / 8;
      return {
        fecha: sumarDias(hoy, (i - 7) * 5),
        porcentaje: Math.round(final * f * f * 10) / 10,
        evaluaciones: Object.fromEntries(datos.evaluaciones.map((e) => [e.id, porcentajeUnidades(unidadesDe(datos, e)) * f * f])),
      };
    });
    const h = historiales.get(cuatrimestre.id) ?? { esquema: 'lumen/historial@1', materias: {} };
    h.materias[datos.id] = serie;
    historiales.set(cuatrimestre.id, h);
  }
}
