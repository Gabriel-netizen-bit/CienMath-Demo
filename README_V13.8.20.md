# CienMath V13.8.20 · Reservas DEMO + panel administrativo + tema unificado

**Prueba de extremo a extremo en un mismo navegador:**
1. Abrir `index.html` con Live Server.
2. Acceso · Demo → Administrador → panel.html → Profesores: crear un profesor y asignar materias.
3. Salir → ingresar con ese profesor → crear clases, elegir cupo/modalidad y publicar.
4. Desde el lobby, abrir Estudiantes → elegir profesor → elegir clase y materia → Confirmar reservación · Demo.
5. Aparece comprobante local; los cupos se actualizan. Volver a entrar como administrador → Panel → Solicitudes para consultar el registro.

**Límites:** No hay backend, login real, pagos, envío de correos ni SMS. El panel contiene un registro local; los avisos se registran solo en una bandeja simulada. La reserva no se comparte entre navegadores/dispositivos, y NO garantiza concurrencia real. No usar datos personales reales ni publicar el demo como servicio de reservas operativo.

**Arquitectura:** `js/reservation-service.js` concentra validaciones, cupos y registros; `js/panel.js` presenta los datos sin lógica de negocio; `css/tool-theme.css` aplica solamente la nueva piel visual sin modificar el constructor de horarios. `panel.html` es el mini lobby administrativo. Reemplazar el servicio de reservas por transacciones de servidor en producción.
