# CienMath V13.8.13 — Portal de estudiantes, versión limpia

## Qué se entrega

- La sección `estudiantes.html` conserva íntegramente la presentación aprobada en V13.8.12: tarjetas azul/violeta/naranja calabaza, escala semanal, vista anual, cabecera y formulario compacto.
- Acceso mediante la tarjeta **Estudiantes → Ver horarios** en `index.html`, bajo **¿Qué deseas hacer?**. Este acceso ya existía en la base y se conserva sin modificaciones.
- No hay perfiles ni clases de muestra. El selector indica **Sin profesores registrados** y el calendario muestra un estado vacío, sin inventar reservas.
- `js/student-data.js` define el contrato de lectura `loadStudentCatalog()` y la lógica de cupos/estados. Devuelve listas vacías hasta integrar la administración de profesores y una fuente de datos compartida.
- El formulario permanece preparado visualmente, pero **no envía ni simula solicitudes** mientras no exista un sistema real de reservas.

## Límites de esta etapa

No se implementó inicio de sesión, backend, sincronización de clases del constructor ni gestión de profesores. No se añadió botón Volver: la navegación pública se diseñará con el lobby de la academia. El acceso desde el panel actual es **provisional**, no un acceso público para estudiantes.

## Versión para demostración

Conservar aparte el ZIP **CienMath V13.8.12 — Paleta unificada**. Ese paquete mantiene profesores y horarios ilustrativos para la presentación. No copiar sus datos al paquete limpio.

## Integridad

`index.html`, `css/styles.css`, `js/main.js`, `js/store.js`, `js/weekly-calendar.js` y el resto de archivos del constructor se preservan sin cambios respecto a V13.8.12.

## Pruebas

Desde la carpeta raíz del proyecto: `node --test tests/*.test.mjs`.
