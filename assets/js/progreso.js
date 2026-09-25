// Cálculos de progreso de Lumen. Módulo puro (sin DOM): lo usan la web y los scripts de Node.
// Cualquier cambio en estas fórmulas cambia lo que muestran la web, el historial y las prioridades.

export const NIVELES = [
  { nivel: 0, clave: 'no-visto', nombre: 'No visto', porcentaje: 0,
    criterio: 'Todavía no lo estudiaste.' },
  { nivel: 1, clave: 'visto', nombre: 'Visto', porcentaje: 25,
    criterio: 'Leíste la teoría o fuiste a la clase. Lo reconocés, pero no podrías explicarlo.' },
  { nivel: 2, clave: 'entendido', nombre: 'Entendido', porcentaje: 50,
    criterio: 'Lo explicás con tus palabras y podés seguir un ejercicio resuelto.' },
  { nivel: 3, clave: 'practicado', nombre: 'Practicado', porcentaje: 75,
    criterio: 'Resolvés ejercicios de la guía sin mirar la solución.' },
  { nivel: 4, clave: 'dominado', nombre: 'Dominado', porcentaje: 100,
    criterio: 'Resolvés ejercicios tipo parcial sin ayuda y lo sostuviste en un repaso posterior.' },
];

export const MAX_NIVEL = NIVELES.length - 1;

export const porcentajeTema = (tema) => (tema.nivel ?? 0) * (100 / MAX_NIVEL);

function promedioPonderado(items) {
  let suma = 0;
  let pesos = 0;
  for (const { valor, peso } of items) {
    suma += valor * peso;
    pesos += peso;
  }
  return pesos ? suma / pesos : 0;
}

export function porcentajeUnidad(unidad) {
  return promedioPonderado(unidad.temas.map((t) => ({ valor: porcentajeTema(t), peso: t.peso ?? 1 })));
}

export function porcentajeUnidades(unidades) {
  return promedioPonderado(
    unidades.filter((u) => u.temas.length).map((u) => ({ valor: porcentajeUnidad(u), peso: u.peso ?? 1 })),
  );
}

export const unidadesDe = (materia, evaluacion) =>
  evaluacion ? materia.unidades.filter((u) => evaluacion.unidades.includes(u.id)) : materia.unidades;

export const temasDe = (unidades) => unidades.flatMap((u) => u.temas);

// Cantidad de temas en cada nivel: [noVisto, visto, entendido, practicado, dominado].
export function distribucion(temas) {
  const d = NIVELES.map(() => 0);
  for (const t of temas) d[t.nivel ?? 0]++;
  return d;
}

// ---- Fechas (siempre como 'AAAA-MM-DD', en hora local) ----

export function hoyISO(fecha = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
}

export function diasEntre(desdeISO, hastaISO) {
  const a = Date.UTC(...desdeISO.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0)));
  const b = Date.UTC(...hastaISO.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0)));
  return Math.round((b - a) / 86_400_000);
}

const pendiente = (e) => !e.estado || e.estado === 'pendiente';

// Evaluaciones que todavía no se rindieron, en el orden del archivo (que es cronológico por contrato).
export function evaluacionesPendientes(materia, hoy = hoyISO()) {
  return materia.evaluaciones.filter((e) => pendiente(e) && (!e.fecha || e.fecha >= hoy));
}

export const proximaEvaluacion = (materia, hoy = hoyISO()) => evaluacionesPendientes(materia, hoy)[0] ?? null;

export const repasoVencido = (tema, hoy = hoyISO()) =>
  Boolean(tema.evidencia?.proximo_repaso && tema.evidencia.proximo_repaso <= hoy);

export function minutosRegistrados(materia) {
  const porSesiones = (materia.sesiones ?? []).reduce((s, x) => s + (x.minutos ?? 0), 0);
  if (porSesiones) return porSesiones;
  return temasDe(materia.unidades).reduce((s, t) => s + (t.evidencia?.minutos ?? 0), 0);
}

export function resumenMateria(materia, hoy = hoyISO()) {
  const temas = temasDe(materia.unidades);
  const dist = distribucion(temas);
  return {
    porcentaje: porcentajeUnidades(materia.unidades),
    temas: temas.length,
    dominados: dist[MAX_NIVEL],
    distribucion: dist,
    vencidos: temas.filter((t) => repasoVencido(t, hoy)).length,
    minutos: minutosRegistrados(materia),
    proxima: proximaEvaluacion(materia, hoy),
    evaluaciones: materia.evaluaciones.map((e) => ({
      ...e,
      porcentaje: porcentajeUnidades(unidadesDe(materia, e)),
    })),
  };
}

// Cada materia pesa lo mismo en el total del cuatrimestre.
export function porcentajeCuatrimestre(materias) {
  if (!materias.length) return 0;
  return materias.reduce((s, m) => s + porcentajeUnidades(m.unidades), 0) / materias.length;
}

// ---- Prioridades: qué conviene estudiar ahora ----
//
// puntaje = falta × urgencia × importancia (+ 0.4 si el repaso está vencido)
//   falta       (4 − nivel) / 4
//   urgencia    con fecha: 14 / (días + 7), acotada a [0.25, 2] → 2 el día del examen, 1 a una semana, 0.5 a tres.
//               sin fecha: 1 para la próxima evaluación pendiente, 0.5 para las siguientes, 0.3 si no entra en ninguna.
//   importancia peso relativo de la unidad repartido entre sus temas (≈1 en promedio), acotada a [0.5, 2].
// A igual puntaje se respeta el orden del programa (materia → unidad → tema).
export function prioridades(materias, { hoy = hoyISO(), limite = 10, maxPorMateria = Infinity } = {}) {
  const lista = [];
  for (const materia of materias) {
    const pendientes = evaluacionesPendientes(materia, hoy);
    const unidades = materia.unidades.filter((u) => u.temas.length);
    const pesoTotal = unidades.reduce((s, u) => s + (u.peso ?? 1), 0) || 1;
    const totalTemas = temasDe(unidades).length || 1;

    for (const unidad of unidades) {
      const idx = pendientes.findIndex((e) => e.unidades.includes(unidad.id));
      const evaluacion = idx >= 0 ? pendientes[idx] : null;
      const dias = evaluacion?.fecha ? diasEntre(hoy, evaluacion.fecha) : null;
      let urgencia = 0.3;
      if (evaluacion) urgencia = dias != null ? Math.min(2, Math.max(0.25, 14 / (dias + 7))) : idx === 0 ? 1 : 0.5;
      const importancia = Math.min(2, Math.max(0.5, ((unidad.peso ?? 1) / pesoTotal) * (totalTemas / unidad.temas.length)));

      for (const tema of unidad.temas) {
        const nivel = tema.nivel ?? 0;
        const vencido = repasoVencido(tema, hoy);
        const falta = (MAX_NIVEL - nivel) / MAX_NIVEL;
        const puntaje = falta * urgencia * importancia + (vencido ? 0.4 : 0);
        if (puntaje <= 0) continue;

        let motivo;
        if (vencido) {
          const atraso = diasEntre(tema.evidencia.proximo_repaso, hoy);
          motivo = atraso === 0 ? 'Repaso para hoy' : `Repaso vencido hace ${atraso} ${atraso === 1 ? 'día' : 'días'}`;
        } else if (evaluacion && dias != null) {
          motivo = dias === 0 ? `${evaluacion.nombre} hoy` : `${evaluacion.nombre} en ${dias} ${dias === 1 ? 'día' : 'días'}`;
        } else if (evaluacion) {
          motivo = `Entra en el ${evaluacion.nombre.toLowerCase()}`;
        } else {
          motivo = 'Sin evaluación pendiente';
        }
        lista.push({ materia, unidad, tema, evaluacion, dias, puntaje, motivo });
      }
    }
  }
  const porMateria = new Map();
  return lista
    .sort((a, b) => b.puntaje - a.puntaje)
    .filter((p) => {
      const n = (porMateria.get(p.materia.id) ?? 0) + 1;
      porMateria.set(p.materia.id, n);
      return n <= maxPorMateria;
    })
    .slice(0, limite);
}
