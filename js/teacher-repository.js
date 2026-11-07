/**
 * CienMath · Repositorio intercambiable de profesores (demostración local).
 * Sustituir estas funciones por llamadas a una API en la fase de producción.
 * localStorage NO ofrece autenticación, permisos ni sincronización entre dispositivos.
 */
export const TEACHERS_KEY = 'cienmath.demo.teachers.v1';
export const SUBJECTS = Object.freeze(['Matemática', 'Física', 'Química', 'Biología']);
export const ADMIN_ID = 'cienmath-demo-admin';
// Identidad de muestra: el propietario puede editar nombre y materias desde su panel.
const DEMO_ADMIN = Object.freeze({ id: ADMIN_ID, name: 'Administrador CienMath', email: '', subjects: [...SUBJECTS], active: true, role: 'admin' });


function storage() {
  try { return typeof localStorage === 'undefined' ? null : localStorage; }
  catch { return null; }
}

export function loadTeachers() {
  let list = [];
  try {
    const raw = storage()?.getItem(TEACHERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed.filter(t => t && typeof t.id === 'string' && typeof t.name === 'string' && Array.isArray(t.subjects)).map(t => ({
      id: t.id, name: t.name, email: typeof t.email === 'string' ? t.email : '',
      subjects: t.subjects.filter(s => SUBJECTS.includes(s)),
      active: t.id === ADMIN_ID ? true : t.active !== false,
      role: t.id === ADMIN_ID ? 'admin' : 'teacher'
    }));
  } catch { /* Catálogo dañado: se conserva el administrador demo. */ }
  // Migración no destructiva de instalaciones anteriores: el administrador
  // también es docente y puede publicar clases para la vista de estudiantes.
  if (!list.some(t => t.id === ADMIN_ID)) list.unshift({ ...DEMO_ADMIN, subjects: [...SUBJECTS] });
  return list;
}

function writeTeachers(list) {
  const s = storage();
  if (!s) throw new Error('El navegador no permite guardar datos locales.');
  s.setItem(TEACHERS_KEY, JSON.stringify(list));
}

export function saveTeacher(data, current = loadTeachers()) {
  const name = String(data.name || '').trim().replace(/\s+/g, ' ');
  const email = String(data.email || '').trim().toLowerCase();
  const subjects = [...new Set((data.subjects || []).filter(s => SUBJECTS.includes(s)))];
  if (name.length < 3 || name.length > 100) throw new Error('Ingresá un nombre de 3 a 100 caracteres.');
  if (email.length > 150 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Revisá el correo electrónico.');
  if (!subjects.length) throw new Error('Seleccioná al menos una materia.');
  const existing = data.id ? current.find(t => t.id === data.id) : null;
  if (data.id && !existing) throw new Error('El profesor ya no existe.');
  if (email && current.some(t => t.email && t.email.toLowerCase() === email && t.id !== data.id)) throw new Error('Ya existe un profesor con ese correo.');
  const id = existing?.id || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `prof-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const record = { id, name, email, subjects, active: existing ? existing.active : true, role: id === ADMIN_ID ? 'admin' : 'teacher' };
  const next = existing ? current.map(t => t.id === id ? record : t) : [...current, record];
  writeTeachers(next);
  return record;
}

export function setTeacherActive(id, active, current = loadTeachers()) {
  if (id === ADMIN_ID) throw new Error('El administrador de demostración no se puede desactivar.');
  if (!current.some(t => t.id === id)) throw new Error('Profesor no encontrado.');
  const next = current.map(t => t.id === id ? { ...t, active: !!active } : t);
  writeTeachers(next);
  return next;
}

export function teacherClassesKey(id) { return `cienmath.demo.classes.${id}.v1`; }

export function loadTeacherClasses(id) {
  if (!id) return [];
  try {
    const raw = storage()?.getItem(teacherClassesKey(id));
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch { return []; }
}

/**
 * Elimina un profesor y sus clases SOLO del almacenamiento local de esta demo.
 * La futura API deberá gestionar esta operación con autorización y transacciones.
 */
export function deleteTeacher(id, current = loadTeachers()) {
  if (id === ADMIN_ID) throw new Error('El administrador de demostración no se puede eliminar.');
  const teacher = current.find(t => t.id === id);
  if (!teacher) throw new Error('Profesor no encontrado.');
  // Primero actualizamos el catálogo; luego limpiamos su calendario aislado.
  writeTeachers(current.filter(t => t.id !== id));
  try { storage()?.removeItem(teacherClassesKey(id)); }
  catch { /* Los datos huérfanos no son accesibles desde el catálogo. */ }
  return teacher;
}
