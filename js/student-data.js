/**
 * CienMath · Contrato de datos para el portal público de estudiantes.
 *
 * Esta demostración lee profesores y clases publicadas desde almacenamiento
 * local del mismo navegador. El repositorio se sustituirá por API al publicar
 * la plataforma real. Las reservas demo se registran localmente; no hay sincronización ni autenticación real.
 */
import { loadTeachers, loadTeacherClasses } from './teacher-repository.js';

export function loadStudentCatalog() {
    const teachers = loadTeachers().filter(t => t.active);
    const classes = teachers.flatMap(t => loadTeacherClasses(t.id)
        .filter(c => c && c.published)
        .map(c => ({ ...c, id: `${t.id}:${c.id}`, teacherId: t.id })));
    return { teachers, classes };
}

/** Una clase individual ocupada o una grupal sin cupos ya no admite reservas. */
export function isClosed(item) {
    const enrolled = Number(item.enrolled || 0);
    if (item.group && enrolled > 0) return enrolled >= Number(item.capacity || 1);
    return !!item.booked;
}

/** Estados semánticos que comparten las vistas semanal y anual. */
export function classTone(item) {
    return `${item.bachillerato ? 'bach' : 'common'}-${isClosed(item) ? 'closed' : 'open'}`;
}

export function placesText(item) {
    if (!item.group) return 'Individual';
    return `Grupal · ${Number(item.enrolled || 0)}/${item.capacity}`;
}
