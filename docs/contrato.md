# Contrato de métricas `lumen/materia@1`

Este documento define qué tiene que registrar el agente de cada materia para que Lumen pueda mostrar el progreso. Está escrito para humanos y para agentes: si sos el agente de una materia, esto es lo que tenés que mantener.

## Cómo fluyen los datos

```
repo de la materia                          repo lumen
┌──────────────────────────┐   cada 6 h    ┌───────────────────────────────┐
│ lumen.json  ◀── agente   │ ────────────▶ │ data/<cuatri>/<materia>.json   │──▶ GitHub Pages
│ (contrato materia@1)     │  (o al avisar)│ data/<cuatri>/historial.json   │
└──────────────────────────┘               └───────────────────────────────┘
```

1. El agente de la materia mantiene un archivo **`lumen.json`** en la raíz de su repo.
2. La Action `Sincronizar materias` de Lumen lo trae cada 6 horas (o apenas la avisan con `repository_dispatch`), lo valida y lo copia en `data/`.
3. Si el archivo no cumple el contrato, Lumen **conserva la versión anterior** y la Action queda en rojo con el detalle.
4. En cada sincronización Lumen guarda un punto de historial por materia (uno por día como máximo) para dibujar la evolución.

Una vez conectada, **la fuente de verdad es el repo de la materia**. Si alguien edita a mano el archivo de esa materia en Lumen, la próxima sincronización lo pisa.

## El archivo

La estructura inicial de cada materia ya está armada a partir del programa analítico: copiá `data/<cuatrimestre>/<materia>.json` de Lumen como `lumen.json` en el repo de la materia y seguí desde ahí. Es una base, no algo definitivo: se pueden agregar, dividir o renombrar temas siguiendo las reglas de abajo.

```jsonc
{
  "esquema": "lumen/materia@1",          // obligatorio, exacto
  "id": "sistemas-operativos",           // igual al id en data/lumen.json de Lumen
  "nombre": "Sistemas Operativos",
  "abreviatura": "SO",
  "actualizado": "2026-10-02T21:15:00-03:00",
  "programa": { "plan": "2023", "nivel": 2, "horas_reloj": 96, "modalidad": "Cuatrimestral" },
  "unidades": [
    {
      "id": "u3",                         // estable
      "numero": "3",                      // como lo nombra la cátedra
      "nombre": "Planificación de procesos y procesadores",
      "peso": 1,                          // importancia relativa dentro de la materia
      "temas": [
        {
          "id": "u3-round-robin-virtual",
          "nombre": "Round Robin y Virtual Round Robin",
          "nivel": 3,                     // 0..4, ver criterios
          "evidencia": {
            "ejercicios": { "hechos": 12, "correctos": 10, "total": 15 },
            "autoevaluaciones": [{ "fecha": "2026-09-28", "puntaje": 0.8, "tipo": "quiz" }],
            "ultimo_repaso": "2026-09-28",
            "proximo_repaso": "2026-10-05",
            "minutos": 180
          },
          "notas": "Me confundo con el quantum cuando llega un proceso nuevo."
        }
      ]
    }
  ],
  "evaluaciones": [
    { "id": "p1", "nombre": "1er parcial", "tipo": "parcial", "fecha": "2026-10-14", "hora": "19:00",
      "unidades": ["u1", "u2", "u3", "u4"], "nota": null, "estado": "pendiente" }
  ],
  "aprobacion": {
    "promocion": { "nota_minima": 8, "descripcion": "Ambos parciales con 8 o más." },
    "regularizacion": { "nota_minima": 6, "descripcion": "Ambos parciales con 6 o más." },
    "notas": ""
  },
  "sesiones": [
    { "fecha": "2026-09-28", "minutos": 90, "tipo": "practica", "temas": ["u3-round-robin-virtual"] }
  ],
  "extra": {}                             // libre para el agente; Lumen no lo lee
}
```

El esquema formal está en [`schema/materia.schema.json`](../schema/materia.schema.json).

## Niveles: la única métrica que mueve el porcentaje

| Nivel | Nombre | % | Criterio para asignarlo | Evidencia esperada |
|:-:|---|:-:|---|---|
| 0 | No visto | 0 | Todavía no se estudió. | — |
| 1 | Visto | 25 | Leíste la teoría o fuiste a la clase. Lo reconocés, pero no podrías explicarlo. | `ultimo_repaso` |
| 2 | Entendido | 50 | Lo explicás con tus palabras y podés seguir un ejercicio resuelto. | una explicación propia o preguntas de comprensión respondidas bien |
| 3 | Practicado | 75 | Resolvés ejercicios de la guía sin mirar la solución. | `ejercicios` con al menos 70 % bien |
| 4 | Dominado | 100 | Resolvés ejercicios tipo parcial sin ayuda y lo sostuviste en un repaso posterior. | `autoevaluaciones` con puntaje ≥ 0,7 en un repaso hecho 7 días o más después del nivel 3 |

Reglas para el agente:

- **Nunca subas un nivel sin evidencia.** Si no hay forma de verificarlo, preguntale al estudiante o proponé un ejercicio corto.
- **Se sube de a un nivel por sesión**, salvo que la evidencia sea contundente (por ejemplo, un simulacro completo bien resuelto).
- **Bajar también vale.** Si en un repaso el estudiante falla lo que antes resolvía, bajá un nivel y reprogramá el repaso.
- El `porcentaje` de un tema es siempre `nivel × 25`. Podés escribirlo por legibilidad, pero Lumen lo recalcula.

## Repasos espaciados

Después de cada sesión sobre un tema, actualizá `ultimo_repaso` y programá `proximo_repaso` según el nivel resultante:

| Nivel | Próximo repaso en |
|:-:|---|
| 1 | 2 días |
| 2 | 4 días |
| 3 | 7 días |
| 4 | 21 días |

Lumen marca como **vencido** todo tema con `proximo_repaso` anterior o igual a hoy y lo sube en las prioridades.

## Cómo calcula Lumen

- **Unidad** = promedio de sus temas (ponderado por `tema.peso`, 1 si falta).
- **Materia** = promedio de sus unidades ponderado por `unidad.peso`. Las unidades sin temas no cuentan.
- **Evaluación** = lo mismo, pero solo con las unidades que lista.
- **Cuatrimestre** = promedio simple de sus materias.
- **Prioridad de un tema** = `falta × urgencia × importancia` (+0,4 si el repaso está vencido), con
  `falta = (4 − nivel) / 4`, `urgencia` según los días hasta la próxima evaluación que lo incluye y
  `importancia` = peso de la unidad repartido entre sus temas. La fórmula exacta está en [`assets/js/progreso.js`](../assets/js/progreso.js).

## Reglas de estructura

- Los `id` de unidades y temas son **estables**: no los cambies aunque cambie el nombre. Si un tema se divide, el original conserva su id y los nuevos llevan ids nuevos.
- No borres un tema con progreso; si sale del programa, dejalo con una nota o movelo a otra unidad.
- `evaluaciones` va en orden cronológico y cada una lista las unidades que evalúa. Cuando llega la nota, completá `nota` y `estado`.
- Cargá las fechas de parciales apenas se conozcan: sin fecha, la prioridad no puede medir urgencia. La `hora` (HH:MM, 24 h) es opcional y hace que la cuenta regresiva del modo pizarra sea exacta.
- Todo lo que el agente quiera guardar para sí mismo va en `extra`.

## Validar antes de hacer push

```bash
curl -fsSL https://raw.githubusercontent.com/solasantiago/lumen/main/scripts/validar.mjs -o /tmp/validar-lumen.mjs
node /tmp/validar-lumen.mjs lumen.json
```

El validador no tiene dependencias. Devuelve errores (bloquean la sincronización) y avisos (por ejemplo, un nivel 3 sin ejercicios registrados).

## Avisarle a Lumen

La sincronización programada alcanza para el día a día. Para ver el cambio al instante, el repo de la materia puede disparar la sincronización (la plantilla ya trae el workflow):

```bash
gh api repos/solasantiago/lumen/dispatches -f event_type=lumen-sync
```

Hace falta un token con permiso `Contents: write` sobre el repo `lumen`.

## Versionado del contrato

`esquema` lleva la versión mayor. Agregar campos opcionales no la cambia; renombrar o cambiar el significado de un campo sí (`lumen/materia@2`), y en ese caso Lumen tiene que aceptar las dos versiones durante la transición.
