---
name: conectar-materia
description: Crea o conecta el repo propio de una materia (con su agente de estudio) para que Lumen sincronice su lumen.json. Usar cuando Santiago quiera arrancar el repo de una materia, armar su agente o enganchar un repo existente a Lumen.
---

# Conectar una materia a su repo

1. **Datos.** Confirmá materia (id en `data/lumen.json`), nombre del repo (sugerí `solasantiago/<abreviatura en minúscula>-<año>`, por ejemplo `solasantiago/so-2026`) y si va a ser público o privado. Crear el repo en GitHub lo hace Santiago o `gh repo create`, solo con su confirmación.

2. **Contenido inicial del repo de la materia.**
   - `lumen.json` ← copia de `data/<cuatri>/<materia>.json` (conserva todo el progreso cargado hasta ahora).
   - `CLAUDE.md` ← `plantillas/agente-materia/CLAUDE.md`, reemplazando `{{MATERIA}}`, `{{ABREVIATURA}}`, `{{CARRERA}}` y `{{CUATRIMESTRE}}`.
   - `.github/workflows/lumen.yml` ← `plantillas/agente-materia/.github/workflows/lumen.yml`.
   - Carpetas `programa/`, `apuntes/`, `practica/`, `parciales/`. Si el programa está en `referencias/`, sugerí copiarlo a `programa/` del repo nuevo (en Lumen esa carpeta no se versiona).

3. **Enganchar en Lumen.** En `data/lumen.json`, en la entrada de la materia:
   ```json
   "fuente": { "repo": "solasantiago/so-2026", "ruta": "lumen.json", "rama": "main" }
   ```
   Corré `npm run validar`.

4. **Permisos** (los configura Santiago; explicale los pasos):
   - Repo privado: en Lumen, secret `LUMEN_SYNC_TOKEN` = token fine-grained con `Contents: read` sobre los repos de materias. Si todos son públicos no hace falta.
   - Sincronización inmediata (opcional): en el repo de la materia, secret `LUMEN_DISPATCH_TOKEN` = token fine-grained con `Contents: write` sobre `solasantiago/lumen`.

5. **Probar.** Después del push de ambos repos, correr la Action "Sincronizar materias" (`gh workflow run sincronizar.yml`) y revisar el resumen del job.

A partir de acá, el progreso de esa materia se registra en su repo y no en `data/` de Lumen.
