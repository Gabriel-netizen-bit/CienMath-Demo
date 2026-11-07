/** CienMath · Adaptador de sesión LOCAL, sustituible por API y cookies seguras. */
import { loadTeachers } from './teacher-repository.js';
import { resolveAccessProfile } from './access-service.js';
export const DEMO_SESSION_KEY = 'cienmath.demo.session.v1';
function storage() { try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; } }
export function currentDemoProfile() {
  try {
    const raw = storage()?.getItem(DEMO_SESSION_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    return saved && typeof saved.id === 'string' ? resolveAccessProfile(saved.id, loadTeachers()) : null;
  } catch { return null; }
}
export function startDemoSession(id) {
  const profile = resolveAccessProfile(id, loadTeachers());
  if (!profile) throw new Error('Seleccioná un perfil activo para continuar.');
  const s = storage();
  if (!s) throw new Error('Tu navegador no permite guardar la sesión local.');
  s.setItem(DEMO_SESSION_KEY, JSON.stringify({ id: profile.id }));
  return profile;
}
export function endDemoSession() { try { storage()?.removeItem(DEMO_SESSION_KEY); } catch {} }
