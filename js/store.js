export const clone = x => JSON.parse(JSON.stringify(x));
/** Store de demostración: memoria por defecto; localStorage opcional por profesor. */
export function createStore(key = null) {
  let nextId = 1;
  let initial = [];
  if (key && typeof localStorage !== 'undefined') {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(parsed)) initial = parsed;
    } catch { initial = []; }
  }
  nextId = initial.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const store = {
    classes: initial,
    persist() {
      if (!key || typeof localStorage === 'undefined') return;
      try { localStorage.setItem(key, JSON.stringify(this.classes)); }
      catch { /* Solo prototipo: sin almacenamiento disponible, funciona en memoria. */ }
    },
    add(items) {
      for (const x of items) this.classes.push({
        id: nextId++, date: x.date, start: x.start, end: x.end,
        published: false, booked: !!x.booked, enrolled: 0, label: 'Disponible',
        group: !!x.group, capacity: x.group ? x.capacity : 1, online: !!x.online,
        bachillerato: !!x.bachillerato
      });
      this.persist();
    },
    remove(id) { this.classes = this.classes.filter(x => x.id !== id); this.persist(); },
    replace(items) { this.classes = clone(items); this.persist(); },
    publish() { this.classes.forEach(x => x.published = true); this.persist(); },
    clearDrafts() { this.classes = this.classes.filter(x => x.published || x.booked); this.persist(); }
  };
  return store;
}
