# ✦ Lumen

Agente personal para organizar el estudio de **Ingeniería en Sistemas de Información (UTN FRBA)**: qué estudiar, en qué orden y cuánto falta. La web muestra cada materia como un cúmulo de estrellas: cada tema es una estrella que brilla según cuánto lo dominás.

**Web:** https://solasantiago.github.io/lumen/ · **Demo con datos inventados:** https://solasantiago.github.io/lumen/?demo

## Cómo funciona

- Cada materia tiene su **propio repo** con su agente (apuntes, ejercicios, tutoría). Ese agente mantiene un `lumen.json` con el nivel de cada tema (0 a 4) y su evidencia.
- Lumen **sincroniza** esos archivos cada 6 horas, los valida y publica la web.
- El progreso se calcula igual en la web y en los scripts (`assets/js/progreso.js`): tema → unidad → parcial → materia → cuatrimestre.
- Cuatrimestre 2026·2: Análisis Matemático II, Comunicación de Datos y Sistemas Operativos, con unidades, temas y parciales armados desde los programas analíticos.

El contrato de métricas para los agentes de materia está en [`docs/contrato.md`](docs/contrato.md).

## Modo pizarra (tele o iPad)

https://solasantiago.github.io/lumen/#/pizarra muestra Lumen en pantalla completa, como carrusel: cielo del cuatrimestre, cuenta regresiva al próximo examen, qué estudiar hoy, una diapositiva por materia y una pregunta al pasar para repasar. Se recarga sola cada 5 minutos, mantiene la pantalla encendida, corre el contenido unos píxeles para no marcar la pantalla y se atenúa de 0 a 7 h.

| Parámetro | Ejemplo | Qué hace |
|---|---|---|
| `d` | `#/pizarra?d=cuenta,hoy,pregunta` | Elige las diapositivas (`cielo`, `cuenta`, `hoy`, `materias` o el id de una materia, `pregunta`). Con una sola queda fija. |
| `s` | `#/pizarra?s=30` | Segundos por diapositiva (20 por defecto). |
| `noche` | `#/pizarra?noche=0` | No atenuar de noche. |

Controles: flechas o deslizar para cambiar, espacio o tocar para pausar/ver controles, `F` pantalla completa, `Esc` salir.

## Uso local

Requiere Node 20 o más (sin dependencias).

```bash
npm run dev           # http://localhost:8000  (o: python3 -m http.server)
npm run validar       # valida data/
npm run prioridades   # qué conviene estudiar ahora
npm run sincronizar   # trae los lumen.json de los repos conectados
```

## Publicación (una sola vez)

1. En GitHub: **Settings → Pages → Source: GitHub Actions**.
2. Hacer push a `main`: el workflow **Publicar web** valida los datos y despliega.
3. Si algún repo de materia es privado: crear el secret `LUMEN_SYNC_TOKEN` (token fine-grained con `Contents: read` sobre esos repos).

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `assets/` | Web estática, sin build |
| `data/lumen.json` | Índice: carrera, cuatrimestres, materias y repo de cada una |
| `data/<cuatri>/<materia>.json` | Métricas de cada materia (`lumen/materia@1`) |
| `data/<cuatri>/historial.json` | Evolución diaria (la escribe la sincronización) |
| `schema/materia.schema.json` | Contrato formal (JSON Schema) |
| `docs/contrato.md` | Contrato explicado: niveles, evidencia, repasos, cálculo |
| `plantillas/agente-materia/` | `CLAUDE.md` y workflow para el repo de cada materia |
| `scripts/` | Validar, sincronizar, prioridades, servidor local |
| `.claude/skills/` | Flujos del agente: planificar semana, registrar progreso, conectar materia, nuevo cuatrimestre |

## Sumar un cuatrimestre

Poner los programas en `referencias/` (carpeta local, no se versiona) y pedirle a Lumen: *"arrancá el cuatrimestre nuevo"* (skill `nuevo-cuatrimestre`). Los cuatrimestres anteriores quedan en el selector de la web y en el trayecto de la carrera.
