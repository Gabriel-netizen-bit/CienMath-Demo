/**
 * CienMath V13.8.24 · Encabezado y pie institucional únicos.
 * Las dos presentaciones usan la misma marca aprobada. Los accesos son
 * configuración de interfaz; las autorizaciones siguen en access-service.js.
 * No lee ni escribe registros académicos.
 */
(() => {
  'use strict';
  const page = document.body.dataset.cmPage;
  const headerSlot = document.querySelector('[data-cm-header]');
  const footerSlot = document.querySelector('[data-cm-footer]');
  if (!page || !headerSlot || !footerSlot) return;

  // Solo indica si existe una sesión local para ofrecer el acceso al panel.
  // El perfil y los permisos se validan en panel.js y access-service.js.
  function hasDemoSession() {
    try {
      const raw = sessionStorage.getItem('cienmath.demo.session.v1');
      const saved = raw && JSON.parse(raw);
      return !!(saved && typeof saved.id === 'string' && saved.id);
    } catch { return false; }
  }
  const hasSession = hasDemoSession();
  const mark = (home = 'index.html') => `
    <a class="cm-brand" href="${home}" aria-label="CienMath · Sitio público">
      <img src="assets/cienmath-marca.png" alt="Academia Virtual CienMath" width="1748" height="518">
    </a>`;
  const theme = (extra = '') => `<button class="${extra ? 'btn icon ' + extra : 'theme-control'}" data-theme-toggle type="button" aria-label="Cambiar tema">☾</button>`;
  const link = (href, label, extra = 'btn site-back') => `<a class="${extra}" href="${href}">${label}</a>`;
  const panelLink = (extra = 'btn site-back') => link('panel.html', 'Panel', extra);
  const publicLink = (extra = 'btn site-back') => link('index.html', 'Sitio público', extra);
  const logout = (extra = 'btn site-back', id = 'demo-logout') => `<button class="${extra}" id="${id}" type="button">Salir</button>`;

  // Las acciones tienen el mismo nombre y destino en todas las herramientas.
  const toolActions = {
    profesores: `<span class="teachers-nav-label">Administración</span>${panelLink()}${logout()}${theme('teachers-theme')}`,
    horarios: `${panelLink()}${logout()}${theme('theme')}`,
    estudiantes: `${hasSession ? panelLink('btn site-back student-back') : ''}${publicLink('btn site-back student-back')}${theme('student-theme')}`
  };

  function institutionalHeader() {
    let actions = '';
    if (page === 'index') {
      actions = `<button class="mobile-menu" id="mobile-menu" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Abrir menú"><span></span><span></span><span></span></button>
        <nav class="site-nav" id="site-nav" aria-label="Navegación principal">
          <a class="active" href="#inicio">Inicio</a><a href="#academia">La academia</a><a href="#programas">Programas</a><a href="#horarios">Horarios y tarifas</a><a href="#informacion">Información</a>
        </nav>
        <div class="header-actions">${theme()}<button class="access-button" data-open-access type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg> Acceso</button></div>`;
    } else if (page === 'acceso') {
      actions = `<div class="access-header-right">${publicLink('access-home')}${theme()}</div>`;
    } else if (page === 'panel') {
      actions = `<div class="panel-header-actions"><span class="panel-admin-name" id="panel-role-label">Administración</span>${publicLink('access-button')}${theme()}${logout('access-button','panel-logout')}</div>`;
    }
    return `<header class="lobby-header cm-header"${page === 'index' ? ' id="inicio"' : ''}><div class="header-inner">${mark(page === 'index' ? '#inicio' : 'index.html')}${actions}</div></header>`;
  }
  function toolHeader() {
    const cls = page === 'profesores' ? 'teachers-top' : page === 'estudiantes' ? 'student-top' : '';
    const actionsCls = page === 'profesores' ? 'teachers-nav' : page === 'estudiantes' ? 'student-top-actions site-header-actions' : 'site-header-actions';
    const captions = {
      horarios: '<div class="muted" id="calendar-role-caption">Academia Virtual · Administración</div>',
      estudiantes: '<div class="muted">Academia Virtual · Horarios para estudiantes</div>',
      profesores: ''
    };
    return `<header class="top row site-header cm-header cm-tool-header ${cls}">
      <div class="cm-tool-identity">${mark()}${captions[page]}</div>
      <div class="${actionsCls}">${toolActions[page]}</div>
    </header>`;
  }
  function footer() {
    const links = page === 'index'
      ? `<div class="footer-links"><a href="#inicio">Inicio</a><a href="#programas">Programas</a><a href="#informacion">Información</a></div>`
      : `<div class="footer-links"><a href="index.html">Inicio</a><a href="estudiantes.html">Horarios</a></div>`;
    return `<footer class="cm-footer lobby-footer" aria-label="Pie institucional"><div class="footer-inner">
      <div><strong>CienMath</strong><span>Academia Virtual · Aprender con método, avanzar con seguridad.</span></div>
      ${links}<small>© 2026 CienMath · Demostración local</small>
    </div></footer>`;
  }
  headerSlot.outerHTML = ['index','acceso','panel'].includes(page) ? institutionalHeader() : toolHeader();
  footerSlot.outerHTML = footer();

  // La marca sigue la clase de tema REAL, no el clic (evita la inversión de logos).
  // El observador también cubre cambios hechos desde otros módulos o controles.
  const brandImages = [...document.querySelectorAll('.cm-brand img')];
  const syncBrand = () => {
    const file = document.documentElement.classList.contains('dark')
      ? 'assets/cienmath-marca-oscura.png' : 'assets/cienmath-marca.png';
    brandImages.forEach(img => {
      if (!img.src.endsWith(file)) img.src = file;
    });
  };
  syncBrand();
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(syncBrand).observe(document.documentElement, {
      attributes: true, attributeFilter: ['class']
    });
  }
  window.addEventListener('storage', event => {
    if (event.key === 'cienmath:appearance' || event.key === null) queueMicrotask(syncBrand);
  });
})();
