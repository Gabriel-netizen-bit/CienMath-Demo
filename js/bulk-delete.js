/* ===========================================================================
   CIENMATH — BORRADO MASIVO

   Responsabilidad única:
   - Eliminar por rango y días, con exclusiones individuales.
   - Eliminar clases seleccionadas en Día, Semana o Año.
   - Limpiar borradores sin reserva.
   - Proteger las reservas hasta obtener autorización explícita para liberarlas.

   La eliminación individual del editor permanece en main.js.
   Este módulo NO crea clases, publica, replica ni resuelve coincidencias.
   =========================================================================== */

/**
 * Centraliza la gestión del borrado sin duplicar sus reglas en main.js.
 * Las dependencias son explícitas para evitar importaciones circulares.
 */
export function createBulkDelete({
  $, root, store, pretty, weekday, notify, selectedIds,
  getDays, hasBatch, hasReserveMode, disableReserveMode,
  hasSelectMode, disableSelectMode, getSelectionItems,
  closeEditor, render
}) {
  let eraseMode = false;
  const eraseExcluded = new Set();

  const isActive = () => eraseMode;
  const clearExclusions = () => eraseExcluded.clear();

  // -------------------------------------------------------------------------
  // 01. Rango: clases elegibles y clases que requieren liberar su reserva.
  // -------------------------------------------------------------------------
  function selection() {
    if (!eraseMode) return { targets: [], protectedClasses: [], invalid: false };

    const from = $('from').value;
    const to = $('until').value;
    const days = getDays();
    if (!from || !to || from > to || !days.length) {
      return { targets: [], protectedClasses: [], invalid: true };
    }

    const matches = store.classes.filter(b =>
      b.date >= from && b.date <= to &&
      days.includes(weekday(b.date)) && !eraseExcluded.has(b.id)
    );

    return {
      targets: matches.filter(b => !b.booked),
      protectedClasses: matches.filter(b => b.booked),
      invalid: false
    };
  }

  function updatePreview() {
    if (!eraseMode) return;

    const { targets, protectedClasses, invalid } = selection();
    $('erase-summary').textContent = invalid
      ? 'Selecciona un rango válido y al menos un día.'
      : `${targets.length} clase(s) para eliminar · ${protectedClasses.length} reservada(s) requieren autorización para liberar. Pulsa una tarjeta para excluirla.`;

    const count = targets.length + protectedClasses.length;
    $('apply').disabled = invalid || !count;
    $('apply').textContent = targets.length
      ? `Eliminar ${targets.length} horario(s)`
      : protectedClasses.length
        ? `Gestionar ${protectedClasses.length} reservada(s)`
        : 'Sin horarios para eliminar';
  }

  function toggleExcluded(b) {
    if (!eraseMode || b.proposed) return;

    const from = $('from').value;
    const to = $('until').value;
    if (b.date < from || b.date > to || !getDays().includes(weekday(b.date))) {
      notify('Para seleccionar esta clase, amplía las fechas o marca su día de la semana.');
      return;
    }

    if (eraseExcluded.has(b.id)) eraseExcluded.delete(b.id);
    else eraseExcluded.add(b.id);
  }

  function toggleMode(enabled) {
    if (enabled && hasBatch()) {
      $('erase-mode').checked = false;
      notify('Confirma o cancela las coincidencias antes de activar Eliminar.');
      return;
    }
    if (enabled && hasReserveMode()) disableReserveMode();
    if (enabled && hasSelectMode()) disableSelectMode();

    eraseMode = enabled;
    clearExclusions();
    root.classList.toggle('erase-mode', enabled);
    $('erase-mode').checked = enabled;
    $('repeat-title').textContent = enabled ? 'Eliminar horarios' : 'Repetir horario';
    $('repeat-hint').textContent = enabled
      ? 'Días de la semana que se eliminarán'
      : 'Días de la semana';
    $('apply').classList.toggle('erase-action', enabled);

    if (!enabled) {
      $('apply').disabled = false;
      $('apply').textContent = 'Aplicar repetición';
    }
    $('erase-summary').hidden = !enabled;

    if (enabled) {
      closeEditor();
      notify('Modo eliminación: primero se borran clases disponibles. Las reservas requieren autorización explícita.');
    }
    render();
  }

  // -------------------------------------------------------------------------
  // 02. Flujo compartido: disponibles → liberar reservas → borrar liberadas.
  // -------------------------------------------------------------------------
  function removeIds(items) {
    const ids = new Set(items.map(b => b.id));
    store.replace(store.classes.filter(b => !ids.has(b.id)));
    for (const id of ids) selectedIds.delete(id);
    return ids.size;
  }

  /**
   * Cada etapa tiene confirmación independiente. Si se cancela, las clases
   * todavía presentes se conservan. No hay eliminación silenciosa de reservas.
   */
  function deleteInStages(items, scope) {
    const available = items.filter(b => !b.booked);
    const reserved = items.filter(b => b.booked);
    if (!items.length) {
      notify('No hay clases seleccionadas para eliminar.', 'warning');
      return;
    }

    let removed = 0;
    if (available.length) {
      const prompt = `¿Eliminar DEFINITIVAMENTE ${available.length} clase(s) ${scope}?\n` +
        `${reserved.length} reservada(s) permanecerán protegidas.\n\n` +
        'Esta acción no se puede deshacer en esta demostración.';
      if (!confirm(prompt)) {
        notify('Eliminación cancelada. No se modificó ninguna clase.');
        return;
      }
      removed = removeIds(available);
      render();
      notify(`${removed} clase(s) sin reserva eliminada(s). Quedan ${reserved.length} reservada(s).`, 'success');
    }

    if (!reserved.length) return;

    // Se informa cuántas quedaron ANTES de solicitar la liberación.
    const releasePrompt = `${removed} clase(s) sin reserva eliminada(s).\n` +
      `Quedaron ${reserved.length} clase(s) reservada(s), intacta(s).\n\n` +
      `¿QUITAR EL ATRIBUTO DE RESERVA a estas ${reserved.length} clase(s)?\n` +
      'Este paso NO las elimina. Se pedirá una confirmación adicional para borrarlas.\n' +
      'En el futuro, con estudiantes inscritos, se deberán validar sus reservas.';

    if (!confirm(releasePrompt)) {
      render();
      notify(`Se conservaron ${reserved.length} clase(s) reservada(s).`, 'warning');
      return;
    }

    const ids = new Set(reserved.map(b => b.id));
    for (const b of store.classes) if (ids.has(b.id)) b.booked = false;
    store.persist();
    render();
    notify(`${ids.size} reserva(s) retirada(s). Las clases siguen existentes.`, 'warning');

    if (!confirm(`Las ${ids.size} clase(s) ya están SIN reserva.\n\n¿ELIMINARLAS DEFINITIVAMENTE ahora?\n\nSi cancelás, quedarán disponibles en el calendario.`)) {
      render();
      notify(`${ids.size} clase(s) liberada(s) conservada(s) en el calendario.`, 'warning');
      return;
    }

    const released = store.classes.filter(b => ids.has(b.id) && !b.booked);
    const deleted = removeIds(released);
    render();
    notify(`${removed + deleted} clase(s) eliminada(s) en total; ${deleted} fueron liberadas antes del borrado.`, 'success');
  }

  // -------------------------------------------------------------------------
  // 03. Borrado por rango y días.
  // -------------------------------------------------------------------------
  function eraseSelected() {
    if (!eraseMode) return;
    if (hasBatch()) {
      notify('Finaliza primero las coincidencias.');
      return;
    }

    const { targets, protectedClasses, invalid } = selection();
    if (invalid || (!targets.length && !protectedClasses.length)) {
      notify('No hay clases seleccionadas en el rango elegido.', 'warning');
      return;
    }

    const scope = `del ${pretty($('from').value)} al ${pretty($('until').value)}`;
    deleteInStages([...targets, ...protectedClasses], scope);

    // Conservar el modo cuando quedan clases, para que se pueda continuar.
    if (!selection().targets.length && !selection().protectedClasses.length) {
      toggleMode(false);
    }
  }

  // -------------------------------------------------------------------------
  // 04. Borrado por selección directa (Día / Semana / Año).
  // -------------------------------------------------------------------------
  function deleteSelection() {
    if (!hasSelectMode() || hasBatch()) return;
    const items = getSelectionItems();
    if (!items.length) {
      notify('Seleccioná al menos una clase.', 'warning');
      return;
    }
    deleteInStages(items, 'seleccionada(s)');
    render();
  }

  // -------------------------------------------------------------------------
  // 05. Limpieza de borradores (acción independiente, misma responsabilidad).
  // -------------------------------------------------------------------------
  function clearDrafts() {
    if (hasBatch()) {
      notify('Finaliza el lote primero.');
      return;
    }
    if (confirm('¿Eliminar borradores sin reservas?')) {
      store.clearDrafts();
      render();
      notify('Borradores eliminados.', 'success');
    }
  }

  return {
    isActive, clearExclusions, selection, updatePreview,
    toggleExcluded, toggleMode, eraseSelected, deleteSelection, clearDrafts
  };
}
