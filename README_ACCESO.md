# CienMath V13.8.19 · Acceso local por perfiles (DEMO)

## Flujo para probar
1. Abrir `index.html` con Live Server (mismo origen para todas las páginas).
2. Pulsar **Acceso · Demo** y **Elegir perfil e ingresar**.
3. Como **Administrador CienMath**: se abre `panel.html` (mini lobby administrativo), con acceso a `profesores.html`. El administrador aparece también en la lista de docentes y tiene calendario propio; no se puede eliminar ni desactivar en esta demo.
4. Crear uno o más profesores y elegir su perfil en `acceso.html`. Cada profesor entra directamente a **su** calendario.
5. Crear una clase y pulsar **Publicar**. En `estudiantes.html`, elegir ese profesor y consultar la clase publicada. Las reservas del estudiante ahora se confirman y registran en localStorage de este navegador; no se envían correos ni SMS.
6. Pulsar **Salir · Demo** para cambiar de perfil.

## Arquitectura
- `js/access-service.js`: reglas puras de roles, acceso a calendarios y destinos.
- `js/demo-session.js`: adaptador de sesión temporal (`sessionStorage`), sin contraseña.
- `js/teacher-repository.js`: catálogo docente en `localStorage` con administrador predeterminado y migración no destructiva.
- `js/store.js`: persistencia de horarios por profesor, conservada.
- `js/student-data.js`: solo lee horarios **publicados** de docentes activos, incluido el administrador.

## Límites explícitos
Esto **NO es autenticación**. La elección de perfil no verifica identidad. Cualquier visitante con acceso a esta demo puede seleccionar un rol y manipular los datos locales. Las restricciones en el navegador son solo para ilustrar el flujo; una API real deberá autorizar cada acción en el servidor. No introducir información personal real ni presentar el sitio como plataforma operativa.
