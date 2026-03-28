# Guía de Supervivencia: GitHub y Git Push

A continuación tienes todos los pasos "de emergencia" y de uso diario para subir tu código a GitHub sin problemas. Si sigues estos pasos siempre subirá tu web rapidísimo y nunca te encontrarás con el error de los 2.5GB de subida (HTTP 500).

---

## 1. El gran problema: ¿Qué fue el error de los 2 Gigas?
El comando `git add .` le indica a tu terminal que guarde **absolutamente todo** lo que haya en la carpeta actual para enviarlo a internet. En Linux hay carpetas ocultas súper pesadas (por ejemplo `.gemini/` que graba vídeos) y al hacer `git add .` Git intentó tragarse 2.5 GB, saturando al servidor de GitHub.
Como la web realmente solo pesa 1 MB entre Excel y recetas, para que esto *nunca* vuelva a pasar, se usa un selector explícito de los archivos importantes y no el punto (`.`).

---

## 2. Instrucciones para enviar tu Web a GitHub sin errores
Si abres por primera vez la terminal hoy para actualizar la web (después de añadir un plato nuevo en la excel y haber ejecutado `python3 actualizar_datos.py`), o si quieres resincronizarla por un problema como el anterior (y has borrado Git), escribe estos comandos por orden, pulsando Enter en cada uno:

1. **Entrar en tu carpeta siempre:**
```bash
cd /home/n95/gDrive/Antigravity
```
*(Es importante tener el prefijo `~/gDrive/Antigravity$` en el prompt de comandos)*

2. *(Solo si hay problemas y necesitas purgar los envíos locales colapsados)*:
```bash
rm -rf .git
git init
```

3. **Añade solo la "chicha" de la web:** (Esto garantiza que no subas basura oculta de Linux u otros experimentos).
```bash
git add index.html css/ js/ Recipes/ actualizar_datos.py README.md .gitignore base_platos_editable.xlsx
```

4. **Empaquétalo poniéndole un nombre:**
```bash
git commit -m "Nueva actualización de platos o recetas"
git branch -M main
```

5. **Engancharlo a tu cuenta y repositorio de GitHub:** (Este paso puedes saltarlo si `git status` ya reconoce el origen de Git, pero no hace daño ejecutarlo cuando la carpeta está vacía).
```bash
git remote add origin https://github.com/ricardoyf/mi-planificador.git
```

6. **Subirlo a Internet definitivamente:**
```bash
git push -u origin main
```

---

## 3. Entendiendo la fase del Login al subir código 
En el paso final de `git push`, si te pregunta credenciales:
1. **Username for 'https://github.com':** Escribe `ricardoyf` y dale a Enter.
2. **Password for 'https://ricardoyf@github.com':** Ve a [GitHub Tokens](https://github.com/settings/tokens), dale a "Generate new token (classic)", marca el permiso `repo`, generar y copia el chorizo enorme (`ghp_xxxxxxxx...`). 
*(Importante: Cuando pulses "pegar" o "Ctrl+Shift+V" en tu terminal al introducir la contraseña, no aparecerá ningún asterisco ni carácter en la pantalla, el área del teclado parece muerta. ¡Es normal, por extrema seguridad en Linux no se pinta nada! Sólo pégalo y dale a Enter ciegamente).*

---

## 4. Activando GitHub Pages para que todo el mundo vea tu Web
La parte del código ya está subida. Ahora hay que decirle a GitHub "Oye, coge mis carpetitas y conviértelas en una web real interactiva".

1. Entra a [https://github.com/ricardoyf/mi-planificador](https://github.com/ricardoyf/mi-planificador).
2. Haz clic en el botón de un engranaje **Settings** (Ajustes) en la barra del menú superior.
3. A la izquierda selecciona **Pages**.
4. Debajo de donde pone "Build and deployment", localiza el apartado "Branch".
5. Donde pone `none`, haz clic, selecciona **main**, y dale a **Save** (Guardar).
6. Tómate un café (puede tardar un minuto), y tras ello la web estará permanentemente subida para que la disfrutes desde el enlace:

🌐 **[Tu Planificador Web (Clic aquí)](https://ricardoyf.github.io/mi-planificador/)**
