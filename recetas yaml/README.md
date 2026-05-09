# recetas yaml

Carpeta operativa para recetas en YAML listas para usar en Paprika.

## Regla de trabajo

Cuando Ricardo pegue una receta copiada de Internet y pida pasarla a YAML, hay que:

1. Tomar como referencia exacta la estructura de `ASAID.yaml`.
2. Crear el archivo nuevo dentro de esta carpeta `recetas yaml/`.
3. Elegir siempre una categoría ya existente en el sistema, usando solo estas categorías válidas:
   - `Básicos`
   - `CENAS`
   - `Carnes`
   - `Ensaladas`
   - `Internacionales`
   - `MACU`
   - `Pasta y arroces`
   - `Pescados`
   - `Sopas y cremas`
4. Si Ricardo no indica la categoría, hay que preguntarle cuál de esas categorías quiere usar.
5. En cuanto Ricardo diga la categoría, se crea el YAML directamente, sin más preguntas.
6. El objetivo es dejar la receta limpia, útil y lista para importación/uso en Paprika.

## Formato base

Usar como ejemplo canónico:

- `ASAID.yaml`

Campos esperados en la receta YAML:

- `name`
- `categories`
- `tags`
- `servings`
- `ingredients`
- `directions`
- `notes`

## Archivos actuales

- `ASAID.yaml`
- `Empanada de hojaldre de jamón y queso.yaml`
- `Tostada salmón + Philadelphia + aguacate.yaml`
