# Procedimiento para actualizar recetas y standalone

Este documento fija el flujo que debe seguir el agente cuando Ricardo envie una receta nueva para `mi-planificador`.

## Objetivo

Mantener sincronizados tres niveles:

- `Recipes/`: recetario completo exportado desde Paprika en HTML.
- `base_platos_editable.xlsx`: capa operativa para planificar y generar lista de la compra.
- Standalone local: un unico HTML con el planificador y todas las recetas incrustadas.

## Regla clave de ingredientes

El HTML de la receta conserva las cantidades, pasos, fuente y texto completo.

El Excel no debe copiar los ingredientes literalmente. En el Excel se escriben ingredientes de compra normalizados, siguiendo el estilo que ya exista en `base_platos_editable.xlsx`, porque la lista de la compra agrupa por texto exacto.

## Como normalizar ingredientes para el Excel

- Quitar cantidades: usar `Huevo`, no `2 huevos`.
- Quitar unidades y preparaciones: usar `Patatas`, no `500 g de patata`.
- Quitar textos de receta: `al gusto`, `cantidad necesaria`, `caliente`, `troceado`, `picado`, etc.
- Omitir sal por defecto.
- Omitir aceite, AOVE o aceite de oliva por defecto, porque Ricardo lo tiene normalmente en casa.
- Preferir nombres que ya existan en el Excel para que agrupen bien: por ejemplo `Leche SIN LACTOSA`, `Patatas`, `Zanahorias`, `Carne picada`, `Huevo`.
- Mantener ingredientes comprables aunque la receta tenga variantes, eligiendo la forma mas util para comprar.
- Si hay una duda real entre dos productos distintos, dejar el ingrediente mas general o preguntar solo si afecta mucho a la compra.

## Flujo cuando Ricardo envia una receta

1. Extraer nombre, categoria, descripcion, ingredientes, instrucciones y fuente.
2. Guardar la receta completa como HTML en `Recipes/Nombre del plato.html`.
3. Crear o actualizar una fila en `base_platos_editable.xlsx`.
4. Usar la categoria de Paprika/HTML salvo que Ricardo indique otra.
5. Escribir en el Excel solo los ingredientes de compra normalizados.
6. Ejecutar:

```bash
python3 actualizar_datos.py
```

7. Subir la version de cache en `index.html`.
8. Generar un ZIP con un unico HTML standalone que incruste:
   - `index.html`
   - `css/styles.css`
   - `js/data.js`
   - `js/app.js`
   - todos los HTML de `Recipes/`
9. Verificar `js/app.js`, los ingredientes generados y el ZIP.
10. Dejar los cambios locales preparados para GitHub. Subir solo cuando `gh` vuelva a estar autenticado.

## Ejemplos corregidos

### Bizcocho con pepitas de chocolate

Categoria: `Postres`

Ingredientes Excel:

- Platanos
- Huevo
- Harina de avena, almendra o arroz
- Chocolate 85%
- Polvo de hornear

### Pastel de carne con pure de patata

Categoria: `Carnes`

Ingredientes Excel:

- Carne picada
- Cebolla
- Zanahorias
- Ajo
- Tomate frito
- Patatas
- Mantequilla
- Leche SIN LACTOSA
- Pimienta
- Nuez moscada
- Queso mozzarella
