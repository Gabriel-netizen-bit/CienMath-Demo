# CienMath V13.8.16 · Ajustes visuales y tema integrado (prototipo)

## Qué se añadió
- `profesores.html`: diseño compacto con directorio de filas, formulario desplegable para crear/editar, activar/desactivar y materias del catálogo inicial.
- `js/teacher-repository.js`: capa de datos aislada, reemplazable por una API/SQL más adelante.
- El botón **Profesores** de la pantalla inicial abre el panel.
- **Ver horarios** abre el mismo constructor existente con el nombre del profesor integrado en el título del constructor, sin franja adicional y un almacenamiento local independiente por profesor.
- `estudiantes.html` lee los profesores activos y sus clases publicadas desde el mismo navegador. Las solicitudes de reserva siguen deshabilitadas.

## Limitaciones esenciales
- No hay autenticación, permisos, cuentas ni backend. La etiqueta «Admin» es solo conceptual: cualquier persona con acceso a la página puede abrirla. **No publicar como panel administrativo operativo.**
- Datos y horarios en `localStorage` del navegador/dispositivo. No se comparten entre usuarios ni equipos, pueden perderse al limpiar datos y no son apropiados para datos personales reales.
- El correo es opcional y solo sirve como dato de demostración. No usar direcciones personales reales en una publicación pública.
- Activar/desactivar no elimina clases; los profesores inactivos no aparecen en el catálogo público local.
- El calendario sin parámetro `?profesor=` conserva su comportamiento anterior en memoria.
- La capa de datos se puede sustituir por un backend SQL, pero la migración requerirá integración, controles de concurrencia, permisos, pruebas y migración de datos.

## Probar
1. Servir la carpeta con Live Server o `python -m http.server 8000`.
2. Abrir `index.html` → **Profesores**. Crear un profesor, seleccionar materias y abrir **Ver horarios**.
3. Crear y publicar una clase; volver al panel y abrir `estudiantes.html` en el **mismo navegador** para ver el profesor y su horario publicado.
4. Confirmar que el formulario estudiantil **no realiza reservas**.
5. Ejecutar `node --test tests/*.test.mjs`.

## Ajustes V13.8.16
- **Un solo botón** `Nuevo profesor / Cerrar formulario` en la esquina superior derecha del área de creación. No hay botón X; el control no se desplaza al abrir el formulario.
- Matices verdes y degradados discretos en **modo claro** para formulario, materias, listado y tarjetas. Modo oscuro intacto.
- `js/theme.js` centraliza el cambio de luz para `index.html`, `profesores.html` y `estudiantes.html`, guardando la preferencia en el navegador.
- Se conserva el constructor de horarios, el portal estudiantil y la gestión de profesores de V13.8.15; no se añaden funciones de negocio.
