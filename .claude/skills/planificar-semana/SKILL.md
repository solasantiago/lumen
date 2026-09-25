---
name: planificar-semana
description: Arma el plan de estudio de la semana (bloques por día y materia) a partir de las prioridades de Lumen, las fechas de evaluación y la disponibilidad horaria. Usar cuando Santiago pida planificar, organizar la semana, armar horarios o decidir qué estudiar en los próximos días.
---

# Planificar la semana

1. **Disponibilidad.** Leé `data/agenda.json`. Si no existe o está vacío, preguntá la disponibilidad por día y los horarios de cursada, y guardalo con este formato:

   ```json
   {
     "esquema": "lumen/agenda@1",
     "disponibilidad": {
       "lunes": [{ "desde": "19:00", "hasta": "21:30" }],
       "sabado": [{ "desde": "10:00", "hasta": "13:00" }]
     },
     "clases": [
       { "materia": "sistemas-operativos", "dia": "martes", "desde": "18:30", "hasta": "22:45" }
     ],
     "preferencias": { "bloque_minutos": 50, "descanso_minutos": 10, "max_horas_dia": 3 }
   }
   ```

   Días en minúscula y sin tilde (`lunes` … `domingo`). La primera vez, agregá `"agenda": "agenda.json"` en `data/lumen.json` para que la web (modo pizarra) la muestre. Si Santiago avisa un cambio puntual para esta semana, usalo sin tocar el archivo.

2. **Prioridades.** Corré `npm run prioridades -- --json --limite 40`. Cada ítem trae materia, unidad, tema, nivel, evaluación, días que faltan y motivo.

3. **Contexto.** Revisá en `data/<cuatri>/*.json` las evaluaciones de los próximos 21 días. Si alguna materia no tiene fechas cargadas, avisalo y pedilas: sin fecha la urgencia se estima.

4. **Armado.**
   - Repasos vencidos primero, en bloques cortos (25 minutos) al comienzo de la sesión.
   - Si hay un parcial en 7 días o menos, esa materia se lleva al menos la mitad del tiempo disponible y el último bloque antes del examen es un simulacro.
   - Temas de nivel 0–1: bloque de teoría (leer y resumir) seguido de ejercicios la sesión siguiente. Nivel 2: ejercicios. Nivel 3: ejercicios tipo parcial o simulacro.
   - No más de dos materias por día, y respetá `max_horas_dia`.
   - No pongas estudio en horario de clase; el día de clase de una materia, un repaso corto de lo visto es buena idea.

5. **Entrega.** Mostrá el plan como tabla (día · horario · materia · tema · tipo de bloque) y, abajo, en una o dos líneas, por qué ese orden. Si Santiago lo quiere guardar, escribilo en `planes/AAAA-Wss.md` (semana ISO).

No modifiques niveles ni evidencia en este flujo: eso lo hace el agente de cada materia (o `registrar-progreso`).
