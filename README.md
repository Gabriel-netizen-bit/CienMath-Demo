**VERSIÓN ACTUAL V13.8.20:** Ver `README_V13.8.20.md` para panel administrativo, reservas locales y estilo unificado.

# Estado de esta entrega: V13.8.13 (portal de estudiantes sin datos de demostración)

Consultá `README_ESTUDIANTES.md` para el alcance y los límites de integración. La documentación histórica a continuación corresponde a las versiones previas del constructor.

**V13.8.9:** Ver `README_ESTUDIANTES.md` para el portal de estudiantes, alcance y pruebas.

# CienMath V13.8.8 — Alineación y herramientas flotantes

Actualización visual sobre V13.8.7, sin modificar las operaciones de clases.

- Día, semana y año: marco de altura compartida (hasta 640 px), con scroll interior.
- Constructor compacto de 166 px alineado con el marco de los calendarios y scroll interno si crece.
- Repetir horario: ventana flotante de 230 px, arrastrable, con cierre explícito; mantiene todos los controles y permanece abierta al navegar por las vistas.
- `js/repeat-window.js` contiene solo la presentación y el movimiento del panel.

Comprobaciones: sintaxis de módulos JS y pruebas unitarias existentes superadas.
La inspección automatizada en navegador no estuvo disponible en este entorno; validar visualmente en Live Server antes de aprobar.

---

# CienMath V13.8.7 — Constructor compacto y encabezado semanal fijo

Partiendo de V13.8.6, esta edición modifica únicamente `css/styles.css`, `js/weekly-calendar.js` y la prueba correspondiente.

- Constructor vertical estrecho (166 px), controles de 100 × 28 px, bordes de 8 px.
- Cupo debajo del interruptor Grupal; botones de 28 px de alto.
- Encabezado semanal opaco en una sola fila fija para ocultar las tarjetas al desplazarse.
- Sin cambios en reservas, datos, vistas diaria/anual ni nuevas etiquetas o filtros.

Para comprobarlo: `node --test tests/*.mjs`.

---

# CienMath · Constructor de horarios · V13

Prototipo modular, sin dependencias ni backend. No es todavía un sistema de reservas productivo.

## Ejecutar

Abrir la carpeta con VS Code y servirla mediante Live Server, o ejecutar desde la carpeta raíz:

```sh
python -m http.server 8000
```

Luego abrir `http://localhost:8000`.

**No abrir `index.html` mediante `file://`**: usa módulos JavaScript nativos y requiere un servidor HTTP local.

## Módulos

- `index.html`: estructura y accesibilidad.
- `css/styles.css`: diseño aprobado, claro/oscuro y responsive.
- `js/schedule.js`: fechas, intervalos, generación y detección de conflictos.
- `js/store.js`: identidad de clases y repositorio provisional en memoria.
- `js/main.js`: coordinación de formularios, calendario, editor y lote transaccional.

## Comportamiento

- Calendario inicial vacío, fecha actual de Costa Rica.
- 07:00, 50 minutos, una clase por defecto.
- Si no hay traslapes, se agregan clases directamente al calendario.
- Si hay traslapes, aparece el carril ámbar y se gestionan sobre el mismo calendario.
- Sustituir únicamente clases disponibles; las reservadas están protegidas.
- Ajustes del lote provisionales hasta confirmar; cancelar restaura el estado original.
- Semana operativa con naipes parcialmente superpuestos y seleccionables.

## Pendientes antes de producción

Persistencia, autenticación y roles, reserva estudiantil real, notificaciones, reprogramación controlada, auditoría, recurrencias con ID de serie, pruebas automatizadas y validación del backend para evitar dobles reservas. El comportamiento exacto del selector nativo de minutos depende del navegador.


## Ajustes V13.1
- `index.html`: botón «Agregar clases sin coincidencia» en la barra de resolución.
- `js/main.js`: permite guardar las clases completamente libres y dejar pendientes las coincidentes. Las clases guardadas mediante este botón permanecen incluso si se cancela después el resto del lote.
- `css/styles.css`: bloque final `V13.1 — CALIBRACIÓN DE ANCHOS`, que limita la anchura de ambos calendarios y mantiene el formulario compacto en escritorio.
- Sin persistencia: los datos siguen siendo de demostración y se pierden al recargar la página.

## Ajustes V13.2
- `js/main.js`: clases sin choques se agregan directamente en verde incluso en lotes mixtos y repetidos; únicamente las conflictivas quedan en revisión.
- `js/main.js`: el botón «Agregar sin coincidencia» sirve para propuestas que se liberan durante la revisión, siempre que no choquen con clases originales. No se permite guardar una propuesta encima de una clase retirada solo provisionalmente, pues cancelar restauraría esa clase.
- `js/main.js` y `css/styles.css`: vista semanal con escala calibrada según duración mínima y extensión horaria; tarjetas contiguas ya no se pisan por una altura mínima forzada. El abanico solo se usa para coincidencias reales.
- `css/styles.css`: ancho máximo más contenido para el calendario diario de un solo carril.
- No se alteraron los archivos `schedule.js`, `store.js` ni `index.html`.


## V13.4 — ajustes quirúrgicos (30 de octubre de 2026)
- `Desde` y `Hasta` independientes en Replicar; los días L/M/X/J/V/S/D filtran el intervalo inclusivo.
- Sincronización bidireccional entre fecha de creación y navegación semanal.
- Interruptor **Eliminar** en el panel existente: vista previa ámbar de clases del rango, exclusión individual haciendo clic, confirmación explícita y protección de reservas.
- Eliminar acepta clases publicadas y sin publicar. No afecta clases fuera del rango ni reservas.
- Se mantienen las propuestas conflictivas, las confirmaciones parciales y el resto de la interfaz V13.3.
- Datos solo en memoria: al recargar el navegador se reinicia esta demostración.


## V13.5 — vista anual y presentación del formulario
- Nueva vista **Año** (12 meses, seis por fila en escritorio, adaptable a pantalla). Los días muestran puntos verdes para borradores, azules para publicadas y violetas para futuras reservadas; ámbar para propuestas conflictivas.
- Clic en cualquier fecha: abre la vista diaria correspondiente. Flechas para cambiar de año. Sin nuevas operaciones sobre el almacén.
- Violeta para tarjetas reservadas cuando exista ese estado; su protección de edición/eliminación se conserva. **No se implementa todavía el flujo de reserva de estudiantes**.
- El formulario en anchuras menores a 850px se agrupa en dos columnas regulares, sin reordenar su HTML ni modificar la mecánica de crear/replicar/eliminar.


## V13.5.1 — Ajustes visuales
- Controles del constructor con ancho compacto cuando el formulario se sitúa arriba.
- Vista anual: cada mes conserva un ancho máximo de 155 px al cambiar de 6 a 3, 2 o 1 columnas; sin saltos de ampliación.
- Solo se modificó css/styles.css; lógica JS y HTML intactos.

## V13.5.2 — Consolidación visual responsive

- Solo se modificó `css/styles.css` (y esta nota del README).
- Día, Semana y Año comparten el mismo ancho máximo de calendario (1050 px).
- El mapa semanal incorpora el mismo fondo, borde y radio que los mapas diario y anual, en tema claro y oscuro.
- En ventanas de 850 px o menos, el formulario ocupa el mismo ancho disponible que el calendario y sus controles fluyen horizontalmente, saltando de fila según el espacio.
- «Generar mediante» y «Cantidad» quedan alineados en una misma agrupación.
- Se eliminaron reglas responsive del formulario que se superponían entre versiones y producían estiramiento en Año.
- No se modificaron HTML ni archivos JavaScript. El selector de vistas conserva su ubicación.


## V13.6 — Atributos de clases
- Dos interruptores compactos en el panel de creación: **Grupal** (activa cupo máximo de 2 a 999) y **En línea** (apagado significa presencial).
- Cada clase guarda individualmente `group`, `capacity` y `online`, incluidos los horarios replicados y las propuestas en conflicto.
- Clic en una clase: el editor permite cambiar sus atributos sin modificar las demás. Las clases marcadas como reservadas permanecen protegidas.
- Los atributos aparecen abreviados en las tarjetas y completos al pasar el cursor.
- Se conserva el almacén de demostración **en memoria**; todavía no hay base de datos ni reservas reales.


## V13.7 — Reserva manual y legibilidad
- Tarjetas diarias y semanales con tipografía mayor, estado y atributos en líneas separadas.
- Vista semanal con desplazamiento horizontal en pantallas estrechas para preservar legibilidad.
- Nuevo interruptor **Reservada** en creación y replicación.
- En editor individual, botón **Marcar como reservada / Quitar reserva**. Las clases reservadas mantienen la protección contra modificación y eliminación hasta liberar la reserva.
- En panel Repetir: interruptor **Reservas**, selección por rango/días, acción Reservar o Quitar reserva, exclusión por clic y confirmación antes de aplicar.
- Se conserva el modo Eliminar y su protección de clases reservadas.
- IMPORTANTE: es una demostración en memoria: la reserva manual es un estado booleano, no representa inscripciones de estudiantes, cupos ocupados ni persistencia.


## V13.8 — Recuperación de navegación y selección segura
- Se conserva la base V13.7 (creación, atributos, reservas manuales, repetición, borrado por rango, conflictos, edición, publicación, año y temas).
- Se restaura navegación diaria ‹ / › y fecha rápida; salto de 1 día en Día y 7 en Semana.
- Las tarjetas de 50/90 minutos muestran horario, estado y atributos sin cortar la última línea. Para duraciones extremadamente cortas, se compacta el texto y el detalle permanece en el editor/tooltip.
- En Replicar → Seleccionar en calendario: seleccionar tarjetas en Día/Semana; botón Día completo; encabezado de cada día en Semana; fechas en Año. Selección persistente al cambiar de vista.
- Eliminar selección: pide confirmación y protege las clases reservadas. Se puede eliminar cualquier clase no reservada, independientemente de cuándo se creó o publicó.
- Replicar selección: toma la primera fecha seleccionada como origen y copia las clases desde la fecha destino, conservando separación entre días, horas, duración, tipo, cupo y modalidad. Las nuevas copias son borradores sin reservas. Los conflictos se resuelven en el editor ya existente.
- Se conserva el modo Eliminar por rango y Reservas por rango. No hay base de datos; todo sigue en memoria.


## V13.8.1 — Fecha «Hasta» en replicación de selección
- En **Replicar → Seleccionar en calendario**, los campos **Replicar desde** y **Hasta** permiten un rango inclusivo.
- Las clases seleccionadas sirven como patrón y se copian semanalmente hasta «Hasta», conservando la separación entre sus días, horarios, duración, tipo, cupo y modalidad.
- Las copias son borradores sin reservas; las clases originales no se modifican.
- Se validan fechas y se limita la repetición a tres años; las coincidencias pasan al mecanismo existente.
- No se modificaron los estilos ni las demás herramientas.


## V13.8.2 — Replicación de selección y colores
- Replicar clases ya existentes: el selector L/M/X/J/V/S/D se inicia con los días originales de las clases elegidas y puede modificarse.
- Desde/Hasta son límites inclusivos, independientes del día de la semana; todas las plantillas seleccionadas se aplican a los días elegidos.
- Horarios idénticos se deduplican; las superposiciones entre plantillas se rechazan con aviso. Las coincidencias con clases existentes siguen el mecanismo de resolución previo.
- Copias en borrador sin reservas; se conservan hora, duración, modalidad, tipo y cupo.
- Fondos diferenciados: verde borrador, celeste publicada, violeta reservada; en claro y oscuro.
- No se modifican los controles ni los flujos de borrado y reservas.


## V13.8.3 — Pulido visual aprobado (base V13.8.2)

- **Formulario:** anchuras compactas de Fecha (158 px), Duración (122 px), Generar mediante (178 px), Cantidad (110 px), Hasta las (128 px). No se cambia el calendario ni la lógica de generación.
- **Interruptores en Crear clases:** títulos inmediatamente junto al interruptor. Grupal + cupo permanecen en la misma fila; Presencial/Virtual y No reservada/Reservada cambian el texto según el estado; interruptor de reserva violeta. El editor individual conserva su interfaz anterior.
- **Mensajes:** se conserva el mensaje persistente original debajo del calendario, con mejor visibilidad, y se añade un aviso flotante temporal (5 s) que no bloquea el trabajo. Módulo nuevo `js/notifications.js`.
- **Duración:** si Generar mediante = Hora de finalización y el intervalo disponible es inferior a la duración, se muestra un aviso ámbar en el cálculo y se resalta el campo; si es igual, es válido. Al pulsar Agregar/Aplicar repetición con ese conflicto, se explica el problema.
- **Día inicial del replicador:** al cambiar la fecha de creación o navegar por el mapa se marca su día semanal de forma automática mientras no se hayan elegido manualmente los días. Una selección manual se respeta.
- **Eliminación:** sin modificaciones a las funciones de borrado. Auditoría de código: el borrado por rango, por selección y el editor evitan borrar clases reservadas; las operaciones destructivas requieren confirmación. Sigue sin haber función Deshacer ni persistencia de datos; no usar como agenda productiva.
- **Sin cambios:** `js/schedule.js`, `js/store.js`, resolución de coincidencias, navegación, colores de tarjetas, publicación, reservas y demás comportamientos V13.8.2.

### Pruebas manuales sugeridas

1. Crear una clase con duración de 80 min entre 13:30 y 14:00: aviso ámbar; entre 13:30 y 14:50: válida.
2. Elegir miércoles 11/11/2026: `Desde` debe seguir esa fecha y repetición debe marcar X. Elegir otro día manualmente y comprobar que no se sobreescribe al cambiar fecha.
3. Alternar Grupal/Cupo, Presencial/Virtual y No reservada/Reservada en ambos temas.
4. Crear, replicar y eliminar: comprobar el mensaje persistente y la notificación flotante; probar eliminación de clases reservadas para verificar su protección.
5. Revisar el panel en escritorio y teléfono antes de reemplazar la versión estable.

**Alcance de verificación:** comprobaciones estáticas, sintaxis JavaScript y pruebas unitarias puntuales. La ejecución visual completa en navegador real debe validarse localmente.


## V13.8.4 — Selección anual y acceso grupal a coincidencias

Actualización limitada de V13.8.3, sin alterar el almacenamiento ni las reglas de reservas.

- En la vista Año se resaltan en violeta las fechas con clases seleccionadas para reservar/liberar, y en ámbar las seleccionadas para eliminar. Se utilizan las mismas selecciones del gestor por rango que en Día y Semana; el clic anual sigue navegando al día.
- En la barra de coincidencias aparece **Reemplazar N disponibles** cuando hay propuestas compatibles con sustitución grupal. Ejecuta la misma sustitución de clases existentes no reservadas del editor individual, con una confirmación y sin guardar hasta **Confirmar cambios**.
- Las clases reservadas y las propuestas que se superponen entre sí permanecen para revisión individual. Cancelar el lote conserva las clases originales según la lógica de V13.8.3; las clases libres ya incorporadas mantienen su comportamiento anterior.
- Módulo nuevo `js/conflict-actions.js`: calcula el conjunto de sustituciones seguras sin modificar los datos. `js/store.js`, `js/schedule.js` y `js/notifications.js` no se modificaron.
- Pruebas unitarias: `node tests/conflict-actions.test.mjs`. También se verificaron en navegador la selección anual, las reservas y liberaciones, la sustitución grupal, la protección de clases reservadas y la cancelación.

**Importante:** esta versión sigue siendo un prototipo en memoria, sin persistencia ni backend.


## V13.8.6 — Vista semanal horaria
- Nuevo módulo `js/weekly-calendar.js` (escala constante 07:00–22:00, extensible a horas extraordinarias).
- Fondo tenue, horas a la izquierda y líneas horizontales con mediodía destacado.
- Altura máxima y desplazamiento dentro de la ventana semanal; cabeceras de días navegables con teclado.
- Pulsar un día sincroniza la fecha sin salir de la vista semanal; en modo selección conserva la selección del día.
- Sin cambios en almacenamiento, reservas, borrado ni vistas diaria/anual.


## V13.8.19 · Acceso por perfiles (Demo)
Ver `README_ACCESO.md`. Inicio en `index.html`, elegir perfil desde `acceso.html`. No hay autenticación real.


## V13.8.21 · Bachillerato
Ver `README_V13.8.21.md` para cambios y recorrido de prueba.
