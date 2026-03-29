# Operativa propuesta: texto de Ricardo → Calendar + Keep

Fecha: 2026-03-29
Fuente principal: `base_platos_editable.xlsx` + lógica existente en `planificador_comidas.py`

## Objetivo

Preparar una lógica clara y reutilizable para este flujo:

```text
frase de Ricardo
→ platos asignados a días
→ lectura de ingredientes del Excel
→ deduplicación
→ eventos en Calendar
→ lista de compra única en Keep
```

## 1. Qué ya existe

### Excel como catálogo canónico
El Excel `base_platos_editable.xlsx` ya contiene:
- `plato`
- `categoria`
- `ingrediente_1..ingrediente_12`

### Lectura de ingredientes ya implementada
`planificador_comidas.py` ya hace esto:
1. carga el Excel
2. busca un plato por nombre exacto
3. recoge sus ingredientes
4. agrega ingredientes de todos los platos del plan
5. deduplica visualmente por texto exacto y añade contador `xN`

Función clave actual:
- `generar_ingredientes()`

### Modelo semanal ya existente
El sistema trabaja con:
- días: `lunes..domingo`
- tipos: `comida`, `cena`
- slots: `primero`, `segundo`

## 2. Qué falta

No existe aún en el repositorio auditado:
- parser de lenguaje natural
- integración real con Google Calendar
- integración real con Google Keep
- deduplicación comparando contra una nota Keep ya existente

## 3. Convención operativa recomendada

Si Ricardo dice:
- `albóndigas el lunes y rapantes el martes`

interpretar por defecto:
- `tipo = comida`
- `slot = primero`

Resultado intermedio:

```json
[
  {
    "dia": "lunes",
    "tipo": "comida",
    "slot": "primero",
    "plato_raw": "albóndigas",
    "plato_canonico": "Albóndigas"
  },
  {
    "dia": "martes",
    "tipo": "comida",
    "slot": "primero",
    "plato_raw": "rapantes",
    "plato_canonico": "Rapantes"
  }
]
```

## 4. Resolución de plato

### Recomendación
Resolver siempre contra el Excel como fuente de verdad.

### Capas sugeridas
1. coincidencia exacta
2. coincidencia normalizada (minúsculas, trim, tildes/espacios)
3. tabla de alias manual para casos dudosos

## 5. Lectura de ingredientes

Para cada `plato_canonico`, extraer todos los `ingrediente_n` no vacíos.

Ejemplos confirmados:
- `Albóndigas` → `Carne picada`, `Huevo`, `Pan rallado`, `Puerro`, `Pimiento`, `Zanahorias`, `Vino blanco`, `Caldo de carne`
- `Rapantes` → `Rapantes`

## 6. Deduplicación

Mantener una sola entrada por ingrediente normalizado.

Ejemplo:

```json
{
  "carne picada": {"display":"Carne picada","count":1},
  "huevo": {"display":"Huevo","count":1},
  "rapantes": {"display":"Rapantes","count":1}
}
```

Esto permite:
- no repetir líneas en Keep
- conservar información de frecuencia (`count`) si luego interesa

## 7. Calendar

Por cada asignación resuelta:
- crear/actualizar evento en el día correcto
- usar `plato_canonico` como título
- el enlace HTML de receta pasa a ser opcional, no prioritario

## 8. Keep

Construir una lista única de ingredientes de todos los platos afectados.

Regla clave:
- si un ingrediente ya existe en la lista de compra de Keep, no crear otra línea
- si se quiere reflejar frecuencia, actualizar la línea existente o manejar metadato aparte

## 9. Separación útil de responsabilidades

### Parte local ya resuelta
- plato → ingredientes
- plan semanal → ingredientes agregados
- deduplicación simple

### Parte externa pendiente
- frase → asignaciones
- asignaciones → Google Calendar
- ingredientes agregados → Google Keep
- sincronización sin duplicados contra Keep real

## 10. Siguiente implementación sugerida

Crear un módulo nuevo, por ejemplo `scripts/calendar_keep_pipeline.py`, con funciones separadas:
- `parse_text_to_assignments(text)`
- `resolve_plate_name(raw_name, catalog)`
- `load_plate_catalog_from_excel(path)`
- `collect_ingredients(assignments, catalog)`
- `dedupe_ingredients(ingredients)`
- `build_calendar_payload(assignments, reference_date)`
- `build_keep_payload(deduped_ingredients)`

La llamada real a Google Calendar/Keep debe venir después, desacoplada del núcleo de negocio.
