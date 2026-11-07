/**
 * CienMath · Capa de negocio de reservas DEMO (solo un navegador).
 * Validaciones y persistencia aisladas de la interfaz. NO sustituye transacciones,
 * autorización, envíos de correo/SMS ni sincronización de un backend real.
 */
import { loadTeachers, loadTeacherClasses, teacherClassesKey, SUBJECTS } from './teacher-repository.js';
export const RESERVATIONS_KEY = 'cienmath.demo.reservations.v1';
export const NOTIFICATIONS_KEY = 'cienmath.demo.notification-outbox.v1';
const storage = () => { try { return localStorage; } catch { return null; } };
function readList(key) {
  try { const value = JSON.parse(storage()?.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
export function listReservations() { return readList(RESERVATIONS_KEY); }
export function listDemoNotifications() { return readList(NOTIFICATIONS_KEY); }
function saveList(key, list) {
  const s = storage();
  if (!s) throw new Error('Activá el almacenamiento local para probar la reserva.');
  s.setItem(key, JSON.stringify(list));
}
export function reserveDemoClass({ teacherId, classId, name, email, subject, grade, mode }) {
  const teachers = loadTeachers();
  const teacher = teachers.find(t => t.id === teacherId && t.active);
  if (!teacher) throw new Error('Este profesor ya no está disponible.');
  const studentName = String(name || '').trim().replace(/\s+/g,' ');
  const studentEmail = String(email || '').trim().toLowerCase();
  if (studentName.length < 3 || studentName.length > 100) throw new Error('Ingresá tu nombre completo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail) || studentEmail.length > 150) throw new Error('Ingresá un correo válido.');
  if (!SUBJECTS.includes(subject) || !teacher.subjects.includes(subject)) throw new Error('La materia no está asignada a este profesor.');
  if (!['7','8','9','10','11','bachillerato'].includes(String(grade))) throw new Error('Seleccioná un nivel válido.');
  if (!['online','onsite'].includes(mode)) throw new Error('Seleccioná una modalidad válida.');
  const items = loadTeacherClasses(teacherId);
  const lesson = items.find(c => String(c.id) === String(classId));
  if (!lesson || !lesson.published) throw new Error('Esta clase ya no está publicada.');
  if (lesson.bachillerato && String(grade) !== 'bachillerato') throw new Error('El nivel de esta clase es Bachillerato.');
  if (!lesson.bachillerato && String(grade) === 'bachillerato') throw new Error('Seleccioná el nivel correspondiente a esta clase.');
  if (mode !== (lesson.online ? 'online' : 'onsite')) throw new Error('La modalidad no corresponde a la clase publicada.');
  const capacity = lesson.group ? Math.max(2, Number(lesson.capacity) || 2) : 1;
  const enrolled = Math.max(0, Number(lesson.enrolled) || 0);
  if ((lesson.booked && enrolled === 0) || enrolled >= capacity) throw new Error('Esta clase ya no tiene cupos disponibles.');
  const reservations = listReservations();
  if (reservations.some(r => r.teacherId === teacherId && String(r.classId) === String(classId) && r.email === studentEmail)) {
    throw new Error('Este correo ya tiene una reservación para esa clase.');
  }
  const reservation = {
    id: `CM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,
    teacherId, teacherName: teacher.name, classId: lesson.id, date: lesson.date,
    start: lesson.start, end: lesson.end, name: studentName, email: studentEmail,
    subject, grade: String(grade), bachillerato: !!lesson.bachillerato, mode, status: 'confirmada-demo', createdAt: new Date().toISOString()
  };
  // Una única ejecución síncrona en un mismo navegador. En producción debe
  // sustituirse por una transacción atómica del servidor para impedir sobrecupos.
  const updated = items.map(c => c === lesson ? { ...c, enrolled: enrolled + 1, booked: true } : c);
  const s = storage();
  if (!s) throw new Error('No hay almacenamiento local disponible.');
  const classKey = teacherClassesKey(teacherId);
  const previousClasses = s.getItem(classKey);
  const previousReservations = s.getItem(RESERVATIONS_KEY);
  try {
    s.setItem(classKey, JSON.stringify(updated));
    saveList(RESERVATIONS_KEY, [...reservations, reservation]);
  } catch {
    try { if (previousClasses === null) s.removeItem(classKey); else s.setItem(classKey, previousClasses);
      if (previousReservations === null) s.removeItem(RESERVATIONS_KEY); else s.setItem(RESERVATIONS_KEY, previousReservations); } catch {}
    throw new Error('No se pudo guardar la reservación local.');
  }
  // Bandeja de notificaciones simuladas. Nunca se envían mensajes reales.
  try { saveList(NOTIFICATIONS_KEY, [...listDemoNotifications(), {
    reservationId: reservation.id, teacherId, teacherEmail: teacher.email || '',
    studentEmail, channels: ['correo', 'SMS'], state: 'pendiente-demo'
  }]); } catch { /* La reserva confirmada se mantiene; no se finge ningún envío. */ }
  return reservation;
}
