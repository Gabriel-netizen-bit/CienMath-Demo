/** CienMath · Reglas de acceso de demostración. No autentica personas. */
import { ADMIN_ID } from './teacher-repository.js';

export function listAccessProfiles(teachers) {
  return teachers.filter(t => t.active).map(t => ({
    id: t.id, name: t.name, role: t.id === ADMIN_ID ? 'admin' : 'teacher'
  }));
}
export function resolveAccessProfile(id, teachers) {
  return listAccessProfiles(teachers).find(p => p.id === id) || null;
}
export function canManageTeachers(profile) { return profile?.role === 'admin' && profile.id === ADMIN_ID; }
export function canOpenCalendar(profile, teacherId, teachers) {
  if (!profile || !teachers.some(t => t.id === teacherId)) return false;
  return canManageTeachers(profile) || (profile.role === 'teacher' && profile.id === teacherId && teachers.some(t => t.id === teacherId && t.active));
}
export function profileDestination(profile) {
  return 'panel.html'; // Un panel para ambos perfiles; contenido según permisos.
}
