# Planificador de Comidas (Web App)

Esta carpeta contiene tu nueva aplicación web interactiva para planificar las comidas. Al ser 100% estática (HTML, CSS, JS), es ideal para subirla a GitHub Pages y usarla como una "App" desde tu móvil.

---

## 🚀 1. Cómo probar la página en tu PC
Para ver cómo funciona la web desde tu ordenador antes de subir nada:
1. Abre una terminal en esta misma carpeta (`/home/n95/gDrive/Antigravity`).
2. Levanta un servidor de prueba de Python ejecutando:
   ```bash
   python3 -m http.server 8000
   ```
3. Abre tu navegador de internet y escribe en la barra de direcciones:
   **http://localhost:8000**
4. Para detener el servidor, pulsa `Ctrl + C` en la terminal.

---

## 🌐 2. Cómo subirlo a GitHub y cuál será tu URL
Vas a necesitar subir esta carpeta a un repositorio de GitHub para que sirva la página:

1. Entra en tu cuenta de GitHub y crea un **Nuevo Repositorio** (por ejemplo, llámalo `mi-planificador`).
2. Abre la terminal en esta carpeta y súbelo ejecutando:
   ```bash
   git init
   git add .
   git commit -m "Primera versión del planificador web"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/mi-planificador.git
   git push -u origin main
   ```
   *(Sustituye `TU-USUARIO` por tu nombre de usuario de GitHub).*

3. **Activar GitHub Pages**: 
   - Ve a la página de tu repositorio en GitHub.com.
   - Entra en la pestaña **Settings** (Configuración).
   - En el menú de la izquierda baja hasta **Pages**.
   - Donde dice *Build and deployment > Branch*, selecciona **main** y dale a Guardar (Save).
4. Espera 1 o 2 minutos. GitHub te mostrará en esa misma pantalla un mensaje diciendo "Your site is live at..."
   🚨 **Ese enlace es tu página web**. Será así: `https://TU-USUARIO.github.io/mi-planificador/`
5. Abre ese enlace desde tu móvil, dale a "Añadir a la pantalla de inicio" y tendrás el icono de tu app como si fuera nativa.

---

## 🔄 3. Cómo actualizar los platos (Si modificas el Excel)
Todo el sistema está pensado para que sigas teniendo el control de tu Excel en el PC, pero la web sea el punto de uso diario.

1. Abre y edita tu archivo **`base_platos_editable.xlsx`** (o `platos_ingredientes.xlsx`) en tu ordenador, añadiendo todas las nuevas comidas o recetas que necesites.
2. Si tienes nuevas recetas en HTML, ponlas dentro de la carpeta **`Recipes`**.
3. Abre una terminal aquí y ejecuta el script conversor:
   ```bash
   python3 actualizar_datos.py
   ```
   Verás un mensaje verde de éxito diciendo que se ha actualizado `js/data.js` con tus últimos platos y recetas.
4. Sube este pequeño cambio a GitHub para que tu móvil lo vea:
   ```bash
   git commit -am "Actualizado el excel de platos"
   git push
   ```
¡Listo! La próxima vez que abras la web en el móvil, tendrás los platos nuevos.

---

## 📱 4. Uso rápido de la App en el móvil
- **Plantillas (Par / Impar)**: Arriba a la derecha tienes un botón con tres puntitos (`⋮`). Como no hay base de datos, la web recuerda tus planillas guardándolas en la memoria del navegador de tu móvil. Puedes montar una semana, pulsar **Guardar como PAR**, y dentro de dos semanas darle a **Cargar PAR** para que aparezca todo de golpe.
- **Exportar**: En ese mismo menú está **Exportar HTML**. Te bajará al móvil un archivo con la tabla limpia de tu plan semanal.
- **Recetas vinculadas**: Si un plato del menú coincide con uno de tus archivos en la carpeta `Recipes`, al exportar el plan en HTML ese plato será un **enlace azul**. Al tocarlo, se abrirá la receta completa alojada en tu web.
