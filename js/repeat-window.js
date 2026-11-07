// CienMath — presentación flotante de las herramientas de horario.
// No modifica repetición, reservas, eliminación ni selección.
export function initRepeatWindow({ panel, trigger }) {
  const handle = panel.querySelector('#repeat-drag');
  const close = panel.querySelector('#repeat-close');
  let drag = null;

  function positionNearTrigger() {
    const rect = trigger.getBoundingClientRect();
    const width = panel.offsetWidth || 230;
    const height = panel.offsetHeight || 340;
    const left = Math.min(Math.max(8, rect.right + 10), Math.max(8, innerWidth - width - 8));
    const top = Math.min(Math.max(8, rect.top), Math.max(8, innerHeight - height - 8));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  // Otros modos pueden abrir el panel directamente: detectar solo el cambio
  // de visibilidad; no reubicarlo mientras el usuario navega por el calendario.
  new MutationObserver(() => {
    if (!panel.hidden) positionNearTrigger();
  }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });

  // El cierre pasa por el botón existente, conservando todos los reseteos.
  close.addEventListener('click', () => {
    if (!panel.hidden) trigger.click();
  });

  handle.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    const rect = panel.getBoundingClientRect();
    drag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (!drag) return;
    const x = Math.max(8, Math.min(innerWidth - panel.offsetWidth - 8, event.clientX - drag.dx));
    const y = Math.max(8, Math.min(innerHeight - panel.offsetHeight - 8, event.clientY - drag.dy));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
  });
  handle.addEventListener('pointerup', () => { drag = null; });
  handle.addEventListener('pointercancel', () => { drag = null; });
}
