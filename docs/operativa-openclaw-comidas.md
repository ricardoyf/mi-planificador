# Operativa OpenClaw — comidas, compra, calendar y email

Este documento fija la operativa real que debe seguir el agente `mi-planificador` cuando Ricardo pida cambios o acciones sobre comidas, cenas, lista de la compra, calendar, email o backup.

## 1. Principio operativo

Si Ricardo habla en modo operativo (por ejemplo, "vamos en real") o indica una comida/cena para un día concreto, no se debe responder en modo propuesta: hay que ejecutar la acción correspondiente.

## 2. Calendar

### Horarios por defecto

- Comida: **13:00–14:00**
- Cena: **20:00–21:00**

Salvo que Ricardo indique otra hora.

### Regla de ejecución

Si Ricardo dice una comida o una cena para un día concreto:

- se debe crear o actualizar directamente el evento en Google Calendar
- sin titubeos
- sin quedarse en modo borrador o solo confirmación textual

## 3. Persistencia semanal

Google Keep ya no se usa para este flujo.

La persistencia oficial pasa a ser la carpeta:

- `/home/n95/.openclaw/workspace/Historicos/`

### Archivos semanales

- Lista de la compra: `compraDD_MM-DD_MM.md`
- Plan semanal: `planDD_MM-DD_MM.json`

### Ejemplo real de nomenclatura

- Plan: `plan30_04-05_05.json`
- Compra: `compra30_04-05_05.md`
- Asunto del email asociado: `plan30_04-05_05`

### Regla de actualización

Si Ricardo cambia comidas o cenas:

- actualizar el JSON del plan semanal
- y actualizar también el MD de compra si cambian ingredientes o productos

La semana operativa se entiende de **lunes a domingo**.

## 4. Lista de la compra por email

Cuando Ricardo pida enviar la lista de la compra, **no** debe enviarse una lista simple de platos.

Debe replicarse la lógica de `planificador_comidas.py`.

### Asunto del email

El asunto del email debe ser exactamente el nombre base del plan semanal, sin extensión.

Ejemplo:

- archivo del plan: `plan30_04-05_05.json`
- asunto del email: `plan30_04-05_05`

### Lógica correcta

1. Resolver cada plato del plan semanal contra `base_platos_editable.xlsx`
2. Extraer sus ingredientes
3. Agregar todos los ingredientes de la semana
4. Deduplicar por texto exacto
5. Si un ingrediente se repite, mostrarlo como `(xN)`

### Regla clave

El email correcto contiene:

- **ingredientes agregados reales del plan**
- no un simple resumen del menú

### Ejemplo de contenido correcto

Ejemplo basado en el último envío corregido:

```text
Lista de la compra actual

Menú planificado:
- Lunes comida: Albóndigas
- Martes comida: Rapantes con judías
- Martes cena: Pisto
- Miércoles comida: Pescado al horno
- Miércoles cena: Salmón airfryer
- Jueves comida: Lentejas

Ingredientes agregados:
- Boniato
- Calabacín (x2)
- Caldo de carne
- Carne picada
- Huevo
- Lentejas
- Lomos de salmón
- Pan rallado
- Pimentón
- Pimiento (x2)
- Pimiento rojo
- Pimiento verde
- Puerro (x3)
- Rapantes
- Tomate triturado
- Vino blanco
- Zanahorias (x2)
- bacalao, jurelos, dorada, rodaballo, sargo, palometa, menda, coruxo, corvina
```

## 5. Destinatarios por defecto de email

- Ricardo / “mandarme un email” → `ricardoyf@gmail.com`
- Patri → `palonsodavila@gmail.com`

Si Ricardo pide enviar la lista de la compra, la fuente debe ser el plan semanal vigente y la extracción de ingredientes según la lógica anterior.

## 6. Backup

Si Ricardo pide hacer backup:

- debe ejecutarse como **primera acción**
- sin pedir confirmación adicional
- salvo riesgo real de destrucción o ambigüedad técnica

`Hacer backup` tiene máxima prioridad operativa.

## 7. Mandato general del agente

En temas de comidas, cenas, compra, calendar y correo relacionado:

- `mi-planificador` actúa como agente responsable
- debe ejecutar y no limitarse a sugerir
- debe respetar esta operativa como referencia principal

## 8. Conversión de recetas a YAML

Cuando Ricardo pida pasar una receta a YAML, debe tomarse como referencia el formato de `ASAID.yaml` dentro de la carpeta `Yaml` del proyecto.

### Regla de categoría

- Si Ricardo no indica la categoría, hay que preguntársela antes de crear el archivo YAML.
- En cuanto Ricardo indique la categoría, debe crearse el YAML directamente.
- No deben hacerse más preguntas una vez indicada la categoría.

### Regla permanente

Esto aplica siempre para cualquier receta que Ricardo pida convertir a YAML.
