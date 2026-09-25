---
name: registrar-progreso
description: Actualiza niveles, evidencia, repasos, fechas de evaluación o notas de una materia en data/ de Lumen, para materias que todavía no tienen repo propio conectado. Usar cuando Santiago cuente qué estudió, cargue una fecha de parcial o una nota, o pida actualizar el progreso a mano.
---

# Registrar progreso

1. Ubicá la materia en `data/lumen.json` (cuatrimestre actual salvo que diga otro).
   - Si tiene `fuente` distinta de `null`, **no edites acá**: el cambio se pierde en la próxima sincronización. Decile que lo registre con el agente de la materia en su repo.
2. Abrí `data/<cuatri>/<materia>.json` y encontrá los temas por nombre. Si lo que cuenta no coincide con ningún tema, proponé a cuál corresponde antes de tocar nada.
3. Aplicá los criterios de nivel de `docs/contrato.md`:
   - Subí niveles solo con evidencia y de a uno por sesión. Si Santiago dice "ya lo sé" sin más, preguntá cómo lo comprobó (ejercicios resueltos, simulacro, nota) o proponé un ejercicio rápido.
   - Registrá la evidencia: `ejercicios`, `autoevaluaciones`, `ultimo_repaso` (hoy) y `proximo_repaso` (nivel 1 → +2 días, 2 → +4, 3 → +7, 4 → +21).
   - Si trae horas de estudio, agregá una entrada en `sesiones`.
4. Fechas y notas de evaluaciones: completá `fecha` (AAAA-MM-DD), y cuando llegue el resultado, `nota` y `estado` (`aprobado`, `desaprobado`, `ausente`).
5. Actualizá `actualizado` (ISO 8601 con -03:00) y corré `npm run validar`.
6. Resumí los cambios: temas que subieron o bajaron, cómo quedó el porcentaje de la materia y del parcial correspondiente. Commit solo si lo pide.
