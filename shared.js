// shared.js — cliente Supabase e autenticação usados por todas as páginas do Hub Lisfer.
// Carregar depois de: supabase-js (CDN) + config.js
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
      loadProfiles().then(() => onReady(currentUser));
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
