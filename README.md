# mi-planificador

Planificador web de comidas con catálogo de platos, recetario y generación de lista de la compra.

## Estado

- Versión visible de la web: **v9.1**.
- Última release etiquetada: **v9**.

## Funciones

- Planificar comidas y cenas por días y huecos semanales.
- Elegir platos desde un catálogo operativo.
- Consultar recetas HTML exportadas de Paprika.
- Agrupar platos y recetas por categorías.
- Generar la lista de la compra desde ingredientes normalizados.
- Mantener el catálogo desde `base_platos_editable.xlsx`.
- Regenerar los datos con `python3 actualizar_datos.py`.
- Crear una edición HTML autónoma con `scripts/build_standalone.py`.

Web: <https://ricardoyf.github.io/mi-planificador/>

## Estructura

- `index.html`, `css/` y `js/`: aplicación web.
- `Recipes/`: recetas completas de Paprika.
- `base_platos_editable.xlsx`: catálogo e ingredientes de compra.
- `actualizar_datos.py`: actualiza los datos de la web.
- `recetas yaml/`: recetas preparadas para Paprika.
