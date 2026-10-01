// shared.js — cliente Supabase, autenticação, menu lateral e utilidades de
// interface usados por todas as páginas do Hub Lisfer.
// Carregar depois de: supabase-js (CDN) + config.js
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------------------------------------------
// Ícones (traço único, 24x24) — um só conjunto para o Hub inteiro
// ------------------------------------------------------------------
const HubIcons = (function () {
  const P = {
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
    coletas: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    full: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M7.5 9v4"/>',
    compras: '<path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6L5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
    separacao: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 13l2 2 4-4"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01"/>',
    preco: '<path d="M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="8" cy="8" r="1.5"/>',
    lucro: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/><path d="M16 7h4v4"/>',
    importacao: '<path d="M2 15h20"/><path d="M4 15l2-7h12l2 7"/><path d="M6 15v5M18 15v5M9 20h6"/><path d="M12 3v5"/>',
    pontos: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    reputacao: '<path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9 5.8 20.3l1.6-6.8L2.2 8.9l6.9-.6z"/>',
    anuncios: '<path d="M3 11v2a2 2 0 0 0 2 2h1l4 4V5L6 9H5a2 2 0 0 0-2 2z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M19 5a9 9 0 0 1 0 14"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    chevronRight: '<path d="M9 18l6-6-6-6"/>',
    chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    alert: '<path d="M12 3l9.5 16.5H2.5z"/><path d="M12 10v4M12 17.5h.01"/>',
    alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>',
    upload: '<path d="M12 16V4M12 4l-4 4M12 4l4 4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    download: '<path d="M12 4v12M12 16l-4-4M12 16l4-4"/><path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    truck: '<path d="M1 6h13v10H1z"/><path d="M14 9h4l4 4v3h-8z"/><circle cx="5.5" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
    car: '<path d="M3 13l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 8l2 5"/><rect x="2" y="13" width="20" height="5" rx="1.5"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="17" cy="18.5" r="1.6"/>',
    person: '<circle cx="12" cy="6" r="2.5"/><path d="M12 9v5M8 11l4-2 4 2M8.5 21l3.5-7 3.5 7"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ship: '<path d="M2 20c2 1 4 1 6 0s4-1 6 0 4 1 6 0"/><path d="M4 17l-1-5h18l-2 5"/><path d="M6 12V7h9l3 5"/><path d="M10 7V4"/>',
    eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A11 11 0 0 1 12 5c7 0 11 7 11 7a13.2 13.2 0 0 1-3.1 3.8M6.5 6.6C3.7 8.3 1 12 1 12s4 7 11 7a10.6 10.6 0 0 0 4.2-.9"/><path d="M9.5 9.9a3 3 0 0 0 4.2 4.2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  };
  const WHATSAPP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8.9-.2.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.2.3-.4.1-.1 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 2 3 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.4-.3z"/></svg>';
  function svg(name) {
    if (name === 'whatsapp') return WHATSAPP;
    const p = P[name];
    if (!p) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  return { svg: svg };
})();

// ------------------------------------------------------------------
// Utilidades de interface
// ------------------------------------------------------------------
const HubUI = (function () {
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  let region = null;
  function toast(message, opts) {
    opts = opts || {};
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (opts.error ? ' is-error' : '');
    t.innerHTML = HubIcons.svg(opts.error ? 'alertCircle' : 'checkCircle') + '<span></span>';
    t.querySelector('span').textContent = message;
    region.appendChild(t);
    setTimeout(() => {
      t.classList.add('is-leaving');
      setTimeout(() => t.remove(), 220);
    }, opts.duration || 3200);
  }

  // Coloca um botão em estado "carregando" (spinner + texto) e devolve
  // uma função que restaura o conteúdo original.
  function busy(btn, label) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span></span>';
    btn.lastChild.textContent = label || 'Salvando…';
    return function done() {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.innerHTML = original;
    };
  }

  function initials(nome) {
    const parts = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  return { escapeHtml: escapeHtml, toast: toast, busy: busy, initials: initials };
})();

// ------------------------------------------------------------------
// Menu lateral (igual em todas as páginas)
// ------------------------------------------------------------------
const HubShell = (function () {
  const NAV = [
    { title: null, items: [
      { key: 'inicio', label: 'Início', href: 'index.html', icon: 'home' }
    ] },
    { title: 'Operação', items: [
      { key: 'coletas', label: 'Coletas', href: 'coletas.html', icon: 'coletas' },
      { key: 'full', label: 'Full', href: 'full.html', icon: 'full', children: [
        { key: 'full-compras', label: 'Lista de Compras', href: 'full-lista-compras.html' },
        { key: 'full-separacao', label: 'Lista de Separação', href: 'full-lista-separacao.html' }
      ] },
      { key: 'importacao', label: 'Importação', href: 'importacao.html', icon: 'importacao' }
    ] },
    { title: 'Vendas', items: [
      { key: 'calculadoras', label: 'Calculadoras', href: 'calculadoras.html', icon: 'calc', children: [
        { key: 'calc-precos', label: 'Preços', href: 'calculadora-precos.html' },
        { key: 'calc-lucro', label: 'Lucratividade', href: 'calculadora-lucratividade.html' }
      ] }
    ] },
    { title: 'Em breve', items: [
      { key: 'pontos', label: 'Pontos do mês', icon: 'pontos', soon: true },
      { key: 'reputacao', label: 'Reputação das contas', icon: 'reputacao', soon: true },
      { key: 'anuncios', label: 'Anúncios pendentes', icon: 'anuncios', soon: true }
    ] }
  ];

  let rendered = false;

  function link(item, active, isSub) {
    if (item.soon) {
      return '<span class="sb-link is-soon" aria-disabled="true">' + HubIcons.svg(item.icon) +
        '<span>' + item.label + '</span></span>';
    }
    const current = item.key === active ? ' aria-current="page"' : '';
    return '<a class="sb-link" href="' + item.href + '"' + current + '>' +
      (isSub ? '' : HubIcons.svg(item.icon)) + '<span>' + item.label + '</span></a>';
  }

  function render() {
    if (rendered) return;
    const aside = document.getElementById('appSidebar');
    if (!aside) return;
    rendered = true;
    const active = aside.dataset.active || '';
    const app = aside.closest('.app');

    let nav = '';
    NAV.forEach((group) => {
      nav += '<div class="sb-group">';
      if (group.title) nav += '<div class="sb-group-title">' + group.title + '</div>';
      group.items.forEach((item) => {
        nav += link(item, active, false);
        if (item.children) {
          const open = item.key === active || item.children.some((c) => c.key === active);
          if (open) {
            nav += '<div class="sb-sub">' + item.children.map((c) => link(c, active, true)).join('') + '</div>';
          }
        }
      });
      nav += '</div>';
    });

    aside.innerHTML =
      '<a class="sb-brand" href="index.html" aria-label="Hub Lisfer — início">' +
        '<img src="logo-hub.png" alt="Lisfer Ferramentas"><span class="sb-product">HUB</span></a>' +
      '<nav class="sb-nav" aria-label="Módulos">' + nav + '</nav>' +
      '<div class="sb-user">' +
        '<span class="sb-avatar" id="sbAvatar" aria-hidden="true">·</span>' +
        '<span class="sb-user-name"><span id="sbUserName">—</span><span class="sb-user-mail" id="sbUserMail"></span></span>' +
        '<button type="button" class="sb-logout" id="sbLogout" aria-label="Sair" title="Sair">' + HubIcons.svg('logout') + '</button>' +
      '</div>';

    document.getElementById('sbLogout').addEventListener('click', () => HubAuth.logout());

    // barra compacta para telas estreitas
    const main = app && app.querySelector('.app-main');
    if (main && !main.querySelector('.app-topbar')) {
      const top = document.createElement('header');
      top.className = 'app-topbar';
      top.innerHTML = '<button type="button" class="app-menu-btn" aria-label="Abrir menu" aria-expanded="false">' + HubIcons.svg('menu') + '</button>' +
        '<img src="logo-hub.png" alt="Lisfer Ferramentas">';
      main.prepend(top);
      const btn = top.querySelector('button');
      const toggle = (open) => {
        app.classList.toggle('nav-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      btn.addEventListener('click', () => toggle(!app.classList.contains('nav-open')));
      const scrim = app.querySelector('.app-scrim');
      if (scrim) scrim.addEventListener('click', () => toggle(false));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
    }
  }

  function setUser(nome, email) {
    render();
    const n = document.getElementById('sbUserName');
    if (!n) return;
    n.textContent = nome || email || '—';
    document.getElementById('sbUserMail').textContent = nome && email ? email : '';
    document.getElementById('sbAvatar').textContent = HubUI.initials(nome || email);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();

  return { render: render, setUser: setUser };
})();

// ------------------------------------------------------------------
// Autenticação
// ------------------------------------------------------------------
const HubAuth = (function () {
  let currentUser = null;
  let profilesList = [];
  let profilesById = {};
  let authListenerAdded = false;

  async function loadProfiles() {
    const { data, error } = await sb.from('profiles').select('id, nome').order('nome', { ascending: true });
    if (error) { console.error(error); return; }
    profilesList = data || [];
    profilesById = {};
    profilesList.forEach((p) => { profilesById[p.id] = p.nome || p.id; });
  }

  function nomeDe(id) {
    return profilesById[id] || null;
  }

  // Usar em páginas de MÓDULO (não na tela de login): garante que existe
  // sessão ativa — se não houver, manda de volta para o login — e só então
  // chama onReady(user).
  function requireAuth(onReady) {
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = 'index.html'; return; }
      currentUser = data.session.user;
      loadProfiles().then(() => {
        HubShell.setUser(nomeDe(currentUser.id), currentUser.email);
        onReady(currentUser);
      });
    });
    if (!authListenerAdded) {
      authListenerAdded = true;
      sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') window.location.href = 'index.html';
      });
    }
  }

  function logout() {
    sb.auth.signOut();
  }

  return {
    get user() { return currentUser; },
    get profiles() { return profilesList; },
    nomeDe: nomeDe,
    requireAuth: requireAuth,
    logout: logout,
    loadProfiles: loadProfiles
  };
})();
