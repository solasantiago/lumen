---
name: nuevo-cuatrimestre
description: Agrega un cuatrimestre nuevo a Lumen con sus materias, arma la estructura de unidades, temas y parciales desde los programas en referencias/, y cierra el cuatrimestre anterior. Usar cuando empiece un cuatrimestre, se sume una materia o haya que cargar programas nuevos.
---

# Nuevo cuatrimestre

1. **Cerrar el anterior.** Para cada materia del cuatrimestre actual, preguntá cómo terminó y actualizá su `estado` en `data/lumen.json` (`regularizada`, `promocionada`, `aprobada`, `recursar`, `abandonada`) y las notas en su archivo. No borres nada: los cuatrimestres viejos siguen visibles en la web.

2. **Datos del nuevo.** id `AAAA-Nc` (por ejemplo `2027-1c`), nombre (`1º cuatrimestre 2027`), fechas de inicio y fin si se saben, y la lista de materias.

3. **Estructura de cada materia** (desde el PDF en `referencias/`, leído con `pdftotext -layout`):
   - `unidades`: una por unidad del programa analítico, `id` `u1`, `u2`… y `numero` como lo escribe la cátedra.
   - `temas`: de 4 a 12 por unidad, cada uno algo que se pueda evaluar por separado. id `<unidad>-<slug de hasta 4 palabras>`. Todos en `nivel: 0`.
   - `peso` de cada unidad: clases dedicadas según el cronograma si el programa lo trae; si no, 1.
   - `evaluaciones`: según el cronograma o lo que informe la cátedra. Si el programa no lo dice, proponé una división a la mitad y avisá que es provisoria. `fecha: null` hasta que se sepa.
   - `aprobacion`: copiá el régimen si el programa lo trae; si no, `null` con una nota.
   - `programa`: plan, nivel, área, horas y la fuente.
   Mostrale a Santiago la división de parciales antes de escribir los archivos.

4. **Índice.** Agregá el cuatrimestre a `data/lumen.json` con sus materias: `archivo` `"<cuatri>/<materia>.json"`, `color` 1, 2, 3… en orden, `icono` acorde (`integral`, `senal`, `chip`, `libro`, `codigo`, `base-datos`, `red`, `grafico`), `estado: "cursando"`, `fuente: null`. Cambiá `cuatrimestre_actual`.

5. Corré `npm run validar` y `npm run dev` para revisar. Ofrecé `conectar-materia` para cada materia nueva.
