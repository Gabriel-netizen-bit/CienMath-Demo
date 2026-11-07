/**
 * CienMath · Tema global (V13.8.16).
 * Única fuente de verdad para profesores, horarios y estudiantes.
 * Se carga en <head> antes del CSS para evitar el destello de tema incorrecto.
 * No altera la lógica de los módulos ni almacena datos académicos.
 */
(() => {
  'use strict';
  const KEY = 'cienmath:appearance';
  const root = document.documentElement;

  function readPreference() {
    try { return localStorage.getItem(KEY); }
    catch { return null; } // Modo privado o almacenamiento deshabilitado.
  }
  function savePreference(value) {
    try { localStorage.setItem(KEY, value); }
    catch { /* La navegación sigue funcionando sin persistencia. */ }
  }
  function updateButtons() {
    const dark = root.classList.contains('dark');
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.textContent = dark ? '☀' : '☾';
      button.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
      button.setAttribute('title', dark ? 'Activar modo claro' : 'Activar modo oscuro');
      button.setAttribute('aria-pressed', String(dark));
    });
  }
  function applyTheme(value) {
    root.classList.toggle('dark', value === 'dark');
    updateButtons();
  }

  applyTheme(readPreference());
  document.addEventListener('DOMContentLoaded', () => {
    updateButtons();
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const next = root.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(next);
        savePreference(next);
      });
    });
  });
  // Si se cambia el tema en otra pestaña, mantener la presentación consistente.
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) applyTheme(readPreference());
  });
})();
