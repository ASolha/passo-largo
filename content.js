// ============================================================
//  PASSO-LARGO  —  content.js  v3.0
//  UI redesenhada seguindo o mock visual
// ============================================================

// ── Estado global ────────────────────────────────────────────
let messageData = { categories: {} };
let buttonPosition = { bottom: '20px', right: '20px', top: 'auto', left: 'auto' };
let activeCategory = null;
let searchQuery    = '';
let isDarkTheme    = false;

const AVAILABLE_VARS = [
  '[NOME_CLIENTE]',
  '[NUMERO_PEDIDO]',
  '[PRAZO_ENTREGA]',
  '[DATA]',
  '[HORA]',
  '[VALOR]',
];

const categoryIcons = {
  'Gravação':         '✍️',
  'Desconto 50%':     '💰',
  'Mercado Pago':     '💳',
  'Troca de Endereço':'🏠',
  'Troca de Aliança': '💍',
  'Menos Usadas':     '❓',
  default:            '📂',
};

// ── Persistência ─────────────────────────────────────────────
function loadData() {
  try { const s = localStorage.getItem('mr-messages');  if (s) messageData    = JSON.parse(s); } catch(e) {}
  try { const p = localStorage.getItem('mr-button-position'); if (p) buttonPosition = JSON.parse(p); } catch(e) {}
  try { const t = localStorage.getItem('mr-theme');     if (t) isDarkTheme    = t === 'dark'; } catch(e) {}
}
function saveData() { localStorage.setItem('mr-messages', JSON.stringify(messageData)); }
function saveButtonPosition(top, left) {
  const ww = window.innerWidth, wh = window.innerHeight;
  const dr = ww - left, db = wh - top;
  buttonPosition = {
    right:  dr < ww/2 ? dr+'px' : 'auto',  left: dr < ww/2 ? 'auto' : left+'px',
    bottom: db < wh/2 ? db+'px' : 'auto',  top:  db < wh/2 ? 'auto' : top+'px',
  };
  localStorage.setItem('mr-button-position', JSON.stringify(buttonPosition));
}

// ── Injeção de estilos ────────────────────────────────────────
function formatCustomerName(name) {
  if (!name) return name;
  if (name === name.toUpperCase())
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return name;
}

function getFirstNameFromPage() {
  let n = '';
  const sels = [
    '#user_header p',
    '.andes-message-card__header__title span.andes-text_size_large',
    '[data-testid="buyer-name"]', '.buyer-info__name', '.user-info__name',
  ];
  for (const s of sels) {
    const el = document.querySelector(s);
    if (el) {
      let t = el.textContent.trim();
      const m = t.match(/Conversa com (.+)/);
      n = (m ? m[1] : t).split(' ')[0];
      if (n) break;
    }
  }
  if (!n) {
    const lbl = Array.from(document.querySelectorAll('span,div,p'))
      .find(el => el.textContent.includes('Comprador') || el.textContent.includes('Cliente'));
    if (lbl?.nextElementSibling) n = lbl.nextElementSibling.textContent.trim().split(' ')[0];
  }
  return n.replace(/^(Sr\.|Sra\.)\s*/i, '').trim();
}

function highlightVars(text) {
  return text.replace(/\[([A-Z_]+)\]/g, '<span class="mr-var">[$1]</span>');
}

function extractVarTags(text) {
  return [...new Set(text.match(/\[([A-Z_]+)\]/g) || [])];
}

function showToast(msg = 'Mensagem inserida! ✓') {
  const t = document.getElementById('mr-toast');
  if (!t) return;
  t.querySelector('.mr-tmsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Inserção de mensagem ──────────────────────────────────────
function insertMessage(message) {
  let final = message;
  if (final.includes('[NOME_CLIENTE]')) {
    const name = getFirstNameFromPage();
    final = name
      ? final.replace(/\[NOME_CLIENTE\]/g, formatCustomerName(name))
      : final.replace(/\[NOME_CLIENTE\]/g, '').trim();
  }
  const campo =
    document.querySelector('textarea.sc-textarea') ||
    document.querySelector('textarea') ||
    document.querySelector('[contenteditable="true"]') ||
    document.querySelector('input[type="text"]');

  if (campo) {
    campo.focus();
    if (campo.tagName === 'TEXTAREA' || campo.tagName === 'INPUT') {
      campo.value = final;
      campo.dispatchEvent(new Event('input',  { bubbles: true }));
      campo.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      campo.textContent = final;
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    }
    showToast('Mensagem inserida! ✓');
  } else {
    navigator.clipboard.writeText(final)
      .then(() => showToast('Copiado para a área de transferência!'))
      .catch(() => showToast('Não foi possível inserir.'));
  }
  hidePanel();
}

// ── Dados filtrados ───────────────────────────────────────────
function getCategoryColor(catName, category) {
  return category.color || '#3B82F6';
}

function getAllMessages() {
  const results = [];
  Object.entries(messageData.categories).forEach(([catName, cat]) => {
    if (activeCategory && activeCategory !== catName) return;
    Object.entries(cat.subcategories || {}).forEach(([subName, subItem]) => {
      const msg   = typeof subItem === 'string' ? subItem : subItem.message;
      const color = typeof subItem === 'object' && subItem.color ? subItem.color : getCategoryColor(catName, cat);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!subName.toLowerCase().includes(q) && !msg.toLowerCase().includes(q)) return;
      }
      results.push({ catName, subName, message: msg, color });
    });
  });
  return results;
}

// ── Render do painel ──────────────────────────────────────────
function buildPanel() {
  const existing = document.getElementById('mr-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'mr-panel';
  if (isDarkTheme) panel.classList.add('dark');
  positionPanel(panel);

  panel.innerHTML = `
    <div class="mr-cn-wrap">
      <nav class="mr-cn" id="mr-cn"></nav>
    </div>
    <div class="mr-col">
    <div class="mr-hd">
      <div class="mr-hd-l">
        <span class="mr-title">Passo Largo</span>
      </div>
      <div class="mr-hd-r">
        <div class="mr-tt" id="mr-tt" title="Alternar tema">
          <span class="mr-tti sun">☀</span>
          <span class="mr-tti moon">☽</span>
        </div>
        <button class="mr-ibtn" id="mr-close-btn" title="Fechar">✕</button>
      </div>
    </div>
    <div class="mr-sw">
      <div class="mr-s">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="mr-si" placeholder="Buscar mensagens..." autocomplete="off">
      </div>
    </div>
    <div class="mr-c" id="mr-c"></div>
    <div class="mr-ft">
      <button class="mr-bnew" id="mr-bnew">
        <span style="font-size:13px;line-height:1">+</span> Nova Mensagem
      </button>
      <div class="mr-ftr">
        <button class="mr-ibtn" id="mr-ie-btn" title="Importar / Exportar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
        </button>
        <button class="mr-ibtn" id="mr-cat-btn" title="Nova Categoria">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 17h6M17 14v6"/></svg>
        </button>
        <button class="mr-ibtn" id="mr-settings-btn" title="Configurações">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 15.5A3.5 3.5 0 018.5 12 3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5m7.43-2.92c.04-.3.07-.62.07-.96s-.03-.66-.07-1l2.15-1.68c.19-.15.24-.42.12-.64l-2.04-3.53c-.12-.22-.39-.3-.61-.22l-2.53 1.02c-.53-.4-1.1-.74-1.72-.99L14.5 2.42A.49.49 0 0014 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.63.25-1.2.59-1.72.99L4.88 5.08c-.23-.09-.49 0-.61.22L2.23 8.83c-.13.22-.07.49.12.64L4.5 11.15c-.04.34-.07.67-.07 1s.03.65.07.96L2.35 14.8c-.19.15-.24.42-.12.64l2.04 3.53c.12.22.39.3.61.22l2.53-1.02c.53.4 1.1.74 1.72.99l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.63-.25 1.2-.59 1.72-.99l2.53 1.02c.23.09.49 0 .61-.22l2.04-3.53c.12-.22.07-.49-.12-.64l-2.15-1.69z"/></svg>
        </button>
      </div>
    </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Impede que cliques dentro do painel propaguem para o listener "fechar ao clicar fora"
  panel.addEventListener('click', e => e.stopPropagation());

  panel.querySelector('#mr-close-btn').onclick = hidePanel;

  // Scroll horizontal na nav
  const navEl = panel.querySelector('#mr-cn');

  // Função de scroll suave reutilizável
  function smoothScrollNav(amount) {
    const start = navEl.scrollTop;
    const end = start + amount;
    const duration = 150;
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      navEl.scrollTop = start + (end - start) * ease;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // arrow buttons removed (sidebar layout)

  panel.querySelector('#mr-tt').onclick = () => {
    isDarkTheme = !isDarkTheme;
    panel.classList.toggle('dark', isDarkTheme);
    localStorage.setItem('mr-theme', isDarkTheme ? 'dark' : 'light');
  };
  panel.querySelector('#mr-si').oninput = (e) => {
    searchQuery = e.target.value.trim();
    renderCards();
  };
  panel.querySelector('#mr-bnew').onclick   = () => openMessageModal(null, null);
  panel.querySelector('#mr-cat-btn').onclick = openCatModal;
  panel.querySelector('#mr-settings-btn').onclick = openSettingsPanel;
  panel.querySelector('#mr-ie-btn').onclick  = openImportExportModal;

  renderCatTabs();
  renderCards();
}

function positionPanel(panel) {
  const fab = document.getElementById('mr-fab');
  const ww = window.innerWidth, wh = window.innerHeight;
  // Use actual rendered size or fallback
  const pw = panel.offsetWidth  || 340;
  const ph = Math.min(panel.offsetHeight || 680, wh - 24);
  panel.style.maxHeight = (wh - 24) + 'px';
  if (!fab) {
    panel.style.bottom = '80px'; panel.style.right = '20px';
    panel.style.top = 'auto'; panel.style.left = 'auto';
    return;
  }
  const rect = fab.getBoundingClientRect();
  // Try left of FAB first, then right
  let left = rect.left - pw - 12;
  if (left < 8) left = rect.right + 12;
  if (left + pw > ww - 8) left = ww - pw - 8;
  if (left < 8) left = 8;
  // Align top with FAB, clamp to viewport
  let top = rect.top;
  if (top + ph > wh - 8) top = wh - ph - 8;
  if (top < 8) top = 8;
  panel.style.left = left + 'px';
  panel.style.top  = top  + 'px';
  panel.style.bottom = 'auto';
  panel.style.right  = 'auto';
}

// ── Category tabs ─────────────────────────────────────────────
function renderCatTabs() {
  const nav = document.getElementById('mr-cn');
  if (!nav) return;
  nav.innerHTML = '';

  const total = Object.values(messageData.categories)
    .reduce((s, c) => s + Object.keys(c.subcategories || {}).length, 0);

  const allTab = document.createElement('div');
  allTab.className = 'mr-ct' + (activeCategory === null ? ' active' : '');
  allTab.innerHTML = `<span class="mr-ct-icon">🗂</span><span class="mr-ct-name">Todas</span>`;
  allTab.onclick = (e) => { e.stopPropagation(); activeCategory = null; renderCatTabs(); renderCards(); };
  nav.appendChild(allTab);

  Object.entries(messageData.categories).forEach(([catName, cat]) => {
    const count = Object.keys(cat.subcategories || {}).length;
    const color = getCategoryColor(catName, cat);
    const tab = document.createElement('div');
    tab.className = 'mr-ct' + (activeCategory === catName ? ' active' : '');
    tab.innerHTML = `<span class="mr-ct-icon">${cat.icon || categoryIcons[catName] || categoryIcons.default}</span><span class="mr-ct-name">${catName}</span>`;
    tab.onclick = (e) => { e.stopPropagation(); activeCategory = catName; renderCatTabs(); renderCards(); };
    nav.appendChild(tab);
  });
}

// ── Cards ─────────────────────────────────────────────────────
function renderCards() {
  const content = document.getElementById('mr-c');
  if (!content) return;
  content.innerHTML = '';

  const msgs = getAllMessages();

  if (msgs.length === 0) {
    content.innerHTML = `
      <div class="mr-empty">
        <div class="mr-ei">💬</div>
        <div class="mr-et">${searchQuery ? 'Nenhum resultado' : 'Nenhuma mensagem'}</div>
        <div class="mr-ed">${searchQuery ? 'Tente outro termo de busca.' : 'Clique em "+ Nova Mensagem" para começar.'}</div>
      </div>`;
    return;
  }

  msgs.forEach(({ catName, subName, message, color }) => {
    const card = document.createElement('div');
    card.className = 'mr-card';
    card.innerHTML = `
      <div class="mr-ci">
        <div class="mr-cbar" style="background:${color}"></div>
        <div class="mr-cbody">
          <span class="mr-cname">${subName}</span>
          <div class="mr-cprev">${highlightVars(message)}</div>
          <div class="mr-cft">
            <div class="mr-cact">
              <button class="mr-btn mr-bg mr-edit">Editar</button>
              <button class="mr-btn mr-bp mr-use">Usar</button>
            </div>
          </div>
        </div>
      </div>`;

    card.querySelector('.mr-use').onclick = e => { e.stopPropagation(); insertMessage(message); };
    card.querySelector('.mr-edit').onclick = e => { e.stopPropagation(); openMessageModal(catName, subName); };
    card.onclick = () => insertMessage(message);
    content.appendChild(card);
  });
}

// ── Panel show/hide ───────────────────────────────────────────
function showPanel() {
  let panel = document.getElementById('mr-panel');
  if (!panel) buildPanel();
  panel = document.getElementById('mr-panel');
  searchQuery = '';
  const si = panel.querySelector('#mr-si');
  if (si) si.value = '';
  positionPanel(panel);
  renderCatTabs();
  renderCards();
  setTimeout(() => panel.classList.add('visible'), 10);
}

function hidePanel() {
  const p = document.getElementById('mr-panel');
  if (p) p.classList.remove('visible');
}

function togglePanel() {
  const p = document.getElementById('mr-panel');
  if (!p || !p.classList.contains('visible')) showPanel();
  else hidePanel();
}

// ── Modal base ────────────────────────────────────────────────
function createOverlay() {
  const ov = document.createElement('div');
  ov.className = 'mr-ov';
  ov.innerHTML = `<div class="mr-modal" id="mr-modal-inner"></div>`;

  // copia CSS vars do panel para a modal
  const panel = document.getElementById('mr-panel');
  if (panel) {
    const cs = getComputedStyle(panel);
    const vars = ['--bg','--bg2','--bg3','--bghov','--txt','--txt2','--txt3','--border',
                  '--accent','--accenthov','--accentlt','--success','--danger','--dangerlt',
                  '--sh-sm','--sh-md','--sh-lg','--r-sm','--r-md','--r-lg','--r-full','--tr'];
    const modal = ov.querySelector('.mr-modal');
    vars.forEach(v => modal.style.setProperty(v, cs.getPropertyValue(v)));
  }

  ov.onclick = e => { if (e.target === ov) closeOverlay(ov); };
  ov.querySelector('.mr-modal').addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(ov);
  setTimeout(() => ov.classList.add('active'), 10);
  return ov;
}

function closeOverlay(ov) {
  ov.classList.remove('active');
  setTimeout(() => ov.remove(), 220);
}

// ── Modal: Nova/Editar Mensagem ───────────────────────────────
function openMessageModal(editCatName, editSubName, defaultCat) {
  const isEdit = editCatName !== null && editSubName !== null;
  const ov = createOverlay();
  const modal = ov.querySelector('#mr-modal-inner');

  const catOpts = Object.keys(messageData.categories)
    .map(c => `<option value="${c}" ${(c===editCatName||c===defaultCat)?'selected':''}>${c}</option>`)
    .join('');

  let currentMsg = '', currentColor = '#3B82F6';
  if (isEdit) {
    const sub = messageData.categories[editCatName]?.subcategories[editSubName];
    if (sub) {
      currentMsg   = typeof sub === 'string' ? sub : sub.message;
      currentColor = typeof sub === 'object' && sub.color ? sub.color : currentColor;
    }
  }

  const chips = AVAILABLE_VARS.map(v => `<span class="mr-vc">${v}</span>`).join('');

  modal.innerHTML = `
    <div class="mr-mhd">
      <span class="mr-mt">${isEdit ? 'Editar Mensagem' : 'Nova Mensagem'}</span>
      <button class="mr-mc">✕</button>
    </div>
    <div class="mr-mb">
      <div class="mr-fg">
        <label class="mr-fl">Título</label>
        <input class="mr-fi" id="mr-f-name" type="text" placeholder="Ex: Confirmação de envio" value="${isEdit ? escapeHtml(editSubName) : ''}">
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Categoria</label>
        <select class="mr-fs" id="mr-f-cat">
          <option value="">Selecione uma categoria</option>
          ${catOpts}
        </select>
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Cor da barra lateral</label>
        <input type="color" id="mr-f-color" value="${currentColor}"
          style="width:100%;height:30px;padding:2px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg2);cursor:pointer">
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Mensagem</label>
        <textarea class="mr-fta" id="mr-f-msg" placeholder="Digite sua mensagem...">${isEdit ? escapeHtml(currentMsg) : ''}</textarea>
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Inserir variável (clique para adicionar)</label>
        <div class="mr-vp">${chips}</div>
      </div>
      ${isEdit ? '<div id="mr-del-area"></div>' : ''}
    </div>
    <div class="mr-mft">
      ${isEdit ? '<button class="mr-btn mr-bd" id="mr-f-del">Excluir</button>' : ''}
      <button class="mr-btn mr-bg" id="mr-f-cancel">Cancelar</button>
      <button class="mr-btn mr-bp" id="mr-f-save">Salvar</button>
    </div>`;

  modal.querySelector('.mr-mc').onclick      = () => closeOverlay(ov);
  modal.querySelector('#mr-f-cancel').onclick = () => closeOverlay(ov);

  modal.querySelectorAll('.mr-vc').forEach(chip => {
    chip.onclick = () => {
      const ta = modal.querySelector('#mr-f-msg');
      const s = ta.selectionStart, e = ta.selectionEnd, v = chip.textContent;
      ta.value = ta.value.slice(0,s) + v + ta.value.slice(e);
      ta.focus(); ta.selectionStart = ta.selectionEnd = s + v.length;
    };
  });

  modal.querySelector('#mr-f-save').onclick = () => {
    const name  = modal.querySelector('#mr-f-name').value.trim();
    const cat   = modal.querySelector('#mr-f-cat').value;
    const msg   = modal.querySelector('#mr-f-msg').value.trim();
    const color = modal.querySelector('#mr-f-color').value;
    if (!name) { alert('Digite um título.'); return; }
    if (!cat)  { alert('Selecione uma categoria.'); return; }
    if (!msg)  { alert('A mensagem não pode ser vazia.'); return; }
    if (isEdit && (editCatName !== cat || editSubName !== name)) {
      delete messageData.categories[editCatName].subcategories[editSubName];
    }
    if (!messageData.categories[cat]) return;
    messageData.categories[cat].subcategories[name] = { message: msg, color };
    saveData(); refreshPanel(); closeOverlay(ov);
    showToast(isEdit ? 'Mensagem atualizada!' : 'Mensagem criada!');
  };

  if (isEdit) {
    modal.querySelector('#mr-f-del').onclick = () => {
      const area = modal.querySelector('#mr-del-area');
      area.innerHTML = `
        <div class="mr-delbar">
          <span>Tem certeza? Não pode ser desfeito.</span>
          <div class="mr-delbar-act">
            <button class="mr-btn mr-bg" id="del-no">Não</button>
            <button class="mr-btn mr-bd" id="del-yes">Excluir</button>
          </div>
        </div>`;
      area.querySelector('#del-no').onclick  = () => { area.innerHTML = ''; };
      area.querySelector('#del-yes').onclick = () => {
        delete messageData.categories[editCatName].subcategories[editSubName];
        saveData(); refreshPanel(); closeOverlay(ov);
        showToast('Mensagem excluída.');
      };
    };
  }
}

// ── Modal: Nova Categoria ─────────────────────────────────────
function openCatModal() {
  const ov = createOverlay();
  const modal = ov.querySelector('#mr-modal-inner');
  modal.innerHTML = `
    <div class="mr-mhd">
      <span class="mr-mt">Nova Categoria</span>
      <button class="mr-mc">✕</button>
    </div>
    <div class="mr-mb">
      <div class="mr-fg">
        <label class="mr-fl">Nome</label>
        <input class="mr-fi" id="mc-name" type="text" placeholder="Ex: Pós-venda">
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Ícone (emoji)</label>
        <input class="mr-fi" id="mc-icon" type="text" placeholder="Ex: ✅">
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Cor</label>
        <input type="color" id="mc-color" value="#3B82F6"
          style="width:100%;height:30px;padding:2px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg2);cursor:pointer">
      </div>
    </div>
    <div class="mr-mft">
      <button class="mr-btn mr-bg" id="mc-cancel">Cancelar</button>
      <button class="mr-btn mr-bp" id="mc-save">Criar Categoria</button>
    </div>`;

  modal.querySelector('.mr-mc').onclick   = () => closeOverlay(ov);
  modal.querySelector('#mc-cancel').onclick = () => closeOverlay(ov);
  modal.querySelector('#mc-save').onclick = () => {
    const name  = modal.querySelector('#mc-name').value.trim();
    const icon  = modal.querySelector('#mc-icon').value.trim();
    const color = modal.querySelector('#mc-color').value;
    if (!name) { alert('Digite um nome.'); return; }
    if (messageData.categories[name]) { alert('Categoria já existe.'); return; }
    messageData.categories[name] = {
      subcategories: {}, color,
      icon: icon || categoryIcons[name] || categoryIcons.default
    };
    saveData(); refreshPanel(); closeOverlay(ov);
    showToast('Categoria criada!');
  };
}

// ── Modal: Importar/Exportar ──────────────────────────────────
function openImportExportModal() {
  const ov = createOverlay();
  const modal = ov.querySelector('#mr-modal-inner');
  modal.innerHTML = `
    <div class="mr-mhd">
      <span class="mr-mt">Importar / Exportar</span>
      <button class="mr-mc">✕</button>
    </div>
    <div class="mr-mb">
      <p style="font-size:12px;color:var(--txt2);line-height:1.5">
        Exporte suas mensagens como JSON para backup. Ao importar, as mensagens atuais serão substituídas.
      </p>
      <div style="display:flex;gap:8px">
        <button class="mr-btn mr-bp" id="exp-btn" style="flex:1;padding:9px">↑ Exportar JSON</button>
        <button class="mr-btn mr-bg" id="imp-btn" style="flex:1;padding:9px">↓ Importar JSON</button>
      </div>
      <input type="file" id="mr-file" accept=".json" style="display:none">
    </div>
    <div class="mr-mft">
      <button class="mr-btn mr-bg" id="ie-close">Fechar</button>
    </div>`;

  modal.querySelector('.mr-mc').onclick   = () => closeOverlay(ov);
  modal.querySelector('#ie-close').onclick = () => closeOverlay(ov);
  modal.querySelector('#exp-btn').onclick = () => {
    const a = document.createElement('a');
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(messageData, null, 2));
    a.download = 'backup-mensagens.json'; a.click();
  };
  modal.querySelector('#imp-btn').onclick = () => modal.querySelector('#mr-file').click();
  modal.querySelector('#mr-file').onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.categories) throw new Error('Formato inválido');
        if (confirm('Substituir mensagens atuais?')) {
          messageData = data; saveData(); refreshPanel();
          closeOverlay(ov); showToast('Importado com sucesso!');
        }
      } catch (err) { alert('Erro: ' + err.message); }
    };
    reader.readAsText(file); e.target.value = '';
  };
}



// ── Helpers ───────────────────────────────────────────────────
function formatCustomerName(name) {
  if (!name) return name;
  if (name === name.toUpperCase())
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return name;
}

function getFirstNameFromPage() {
  let n = '';
  const sels = [
    '#user_header p',
    '.andes-message-card__header__title span.andes-text_size_large',
    '[data-testid="buyer-name"]', '.buyer-info__name', '.user-info__name',
  ];
  for (const s of sels) {
    const el = document.querySelector(s);
    if (el) {
      let t = el.textContent.trim();
      const m = t.match(/Conversa com (.+)/);
      n = (m ? m[1] : t).split(' ')[0];
      if (n) break;
    }
  }
  if (!n) {
    const lbl = Array.from(document.querySelectorAll('span,div,p'))
      .find(el => el.textContent.includes('Comprador') || el.textContent.includes('Cliente'));
    if (lbl?.nextElementSibling) n = lbl.nextElementSibling.textContent.trim().split(' ')[0];
  }
  return n.replace(/^(Sr\.|Sra\.)\s*/i, '').trim();
}

function highlightVars(text) {
  return text.replace(/\[([A-Z_]+)\]/g, '<span class="mr-var">[$1]</span>');
}

function extractVarTags(text) {
  return [...new Set(text.match(/\[([A-Z_]+)\]/g) || [])];
}

function showToast(msg = 'Mensagem inserida! ✓') {
  const t = document.getElementById('mr-toast');
  if (!t) return;
  t.querySelector('.mr-tmsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Inserção de mensagem ──────────────────────────────────────
function insertMessage(message) {
  let final = message;
  if (final.includes('[NOME_CLIENTE]')) {
    const name = getFirstNameFromPage();
    final = name
      ? final.replace(/\[NOME_CLIENTE\]/g, formatCustomerName(name))
      : final.replace(/\[NOME_CLIENTE\]/g, '').trim();
  }
  const campo =
    document.querySelector('textarea.sc-textarea') ||
    document.querySelector('textarea') ||
    document.querySelector('[contenteditable="true"]') ||
    document.querySelector('input[type="text"]');

  if (campo) {
    campo.focus();
    if (campo.tagName === 'TEXTAREA' || campo.tagName === 'INPUT') {
      campo.value = final;
      campo.dispatchEvent(new Event('input',  { bubbles: true }));
      campo.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      campo.textContent = final;
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    }
    showToast('Mensagem inserida! ✓');
  } else {
    navigator.clipboard.writeText(final)
      .then(() => showToast('Copiado para a área de transferência!'))
      .catch(() => showToast('Não foi possível inserir.'));
  }
  hidePanel();
}

// ── Dados filtrados ───────────────────────────────────────────
function getCategoryColor(catName, category) {
  return category.color || '#3B82F6';
}

function getAllMessages() {
  const results = [];
  Object.entries(messageData.categories).forEach(([catName, cat]) => {
    if (activeCategory && activeCategory !== catName) return;
    Object.entries(cat.subcategories || {}).forEach(([subName, subItem]) => {
      const msg   = typeof subItem === 'string' ? subItem : subItem.message;
      const color = typeof subItem === 'object' && subItem.color ? subItem.color : getCategoryColor(catName, cat);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!subName.toLowerCase().includes(q) && !msg.toLowerCase().includes(q)) return;
      }
      results.push({ catName, subName, message: msg, color });
    });
  });
  return results;
}

// ── Render do painel ──────────────────────────────────────────
function buildPanel() {
  const existing = document.getElementById('mr-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'mr-panel';
  if (isDarkTheme) panel.classList.add('dark');
  positionPanel(panel);

  panel.innerHTML = `
    <div class="mr-cn-wrap">
      <nav class="mr-cn" id="mr-cn"></nav>
    </div>
    <div class="mr-col">
    <div class="mr-hd">
      <div class="mr-hd-l">
        <span class="mr-title">Passo Largo</span>
      </div>
      <div class="mr-hd-r">
        <div class="mr-tt" id="mr-tt" title="Alternar tema">
          <span class="mr-tti sun">☀</span>
          <span class="mr-tti moon">☽</span>
        </div>
        <button class="mr-ibtn" id="mr-close-btn" title="Fechar">✕</button>
      </div>
    </div>
    <div class="mr-sw">
      <div class="mr-s">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="mr-si" placeholder="Buscar mensagens..." autocomplete="off">
      </div>
    </div>
    <div class="mr-c" id="mr-c"></div>
    <div class="mr-ft">
      <button class="mr-bnew" id="mr-bnew">
        <span style="font-size:13px;line-height:1">+</span> Nova Mensagem
      </button>
      <div class="mr-ftr">
        <button class="mr-ibtn" id="mr-ie-btn" title="Importar / Exportar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
        </button>
        <button class="mr-ibtn" id="mr-cat-btn" title="Nova Categoria">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 17h6M17 14v6"/></svg>
        </button>
        <button class="mr-ibtn" id="mr-settings-btn" title="Configurações">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 15.5A3.5 3.5 0 018.5 12 3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5m7.43-2.92c.04-.3.07-.62.07-.96s-.03-.66-.07-1l2.15-1.68c.19-.15.24-.42.12-.64l-2.04-3.53c-.12-.22-.39-.3-.61-.22l-2.53 1.02c-.53-.4-1.1-.74-1.72-.99L14.5 2.42A.49.49 0 0014 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.63.25-1.2.59-1.72.99L4.88 5.08c-.23-.09-.49 0-.61.22L2.23 8.83c-.13.22-.07.49.12.64L4.5 11.15c-.04.34-.07.67-.07 1s.03.65.07.96L2.35 14.8c-.19.15-.24.42-.12.64l2.04 3.53c.12.22.39.3.61.22l2.53-1.02c.53.4 1.1.74 1.72.99l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.63-.25 1.2-.59 1.72-.99l2.53 1.02c.23.09.49 0 .61-.22l2.04-3.53c.12-.22.07-.49-.12-.64l-2.15-1.69z"/></svg>
        </button>
      </div>
    </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Impede que cliques dentro do painel propaguem para o listener "fechar ao clicar fora"
  panel.addEventListener('click', e => e.stopPropagation());

  panel.querySelector('#mr-close-btn').onclick = hidePanel;

  // Scroll horizontal na nav
  const navEl = panel.querySelector('#mr-cn');

  // Função de scroll suave reutilizável
  function smoothScrollNav(amount) {
    const start = navEl.scrollTop;
    const end = start + amount;
    const duration = 150;
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      navEl.scrollTop = start + (end - start) * ease;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // arrow buttons removed (sidebar layout)

  panel.querySelector('#mr-tt').onclick = () => {
    isDarkTheme = !isDarkTheme;
    panel.classList.toggle('dark', isDarkTheme);
    localStorage.setItem('mr-theme', isDarkTheme ? 'dark' : 'light');
  };
  panel.querySelector('#mr-si').oninput = (e) => {
    searchQuery = e.target.value.trim();
    renderCards();
  };
  panel.querySelector('#mr-bnew').onclick   = () => openMessageModal(null, null);
  panel.querySelector('#mr-cat-btn').onclick = openCatModal;
  panel.querySelector('#mr-settings-btn').onclick = openSettingsPanel;
  panel.querySelector('#mr-ie-btn').onclick  = openImportExportModal;

  renderCatTabs();
  renderCards();
}

function positionPanel(panel) {
  const fab = document.getElementById('mr-fab');
  const ww = window.innerWidth, wh = window.innerHeight;
  // Use actual rendered size or fallback
  const pw = panel.offsetWidth  || 340;
  const ph = Math.min(panel.offsetHeight || 680, wh - 24);
  panel.style.maxHeight = (wh - 24) + 'px';
  if (!fab) {
    panel.style.bottom = '80px'; panel.style.right = '20px';
    panel.style.top = 'auto'; panel.style.left = 'auto';
    return;
  }
  const rect = fab.getBoundingClientRect();
  // Try left of FAB first, then right
  let left = rect.left - pw - 12;
  if (left < 8) left = rect.right + 12;
  if (left + pw > ww - 8) left = ww - pw - 8;
  if (left < 8) left = 8;
  // Align top with FAB, clamp to viewport
  let top = rect.top;
  if (top + ph > wh - 8) top = wh - ph - 8;
  if (top < 8) top = 8;
  panel.style.left = left + 'px';
  panel.style.top  = top  + 'px';
  panel.style.bottom = 'auto';
  panel.style.right  = 'auto';
}

// ── Category tabs ─────────────────────────────────────────────
function renderCatTabs() {
  const nav = document.getElementById('mr-cn');
  if (!nav) return;
  nav.innerHTML = '';

  const total = Object.values(messageData.categories)
    .reduce((s, c) => s + Object.keys(c.subcategories || {}).length, 0);

  const allTab = document.createElement('div');
  allTab.className = 'mr-ct' + (activeCategory === null ? ' active' : '');
  allTab.innerHTML = `<span class="mr-ct-icon">🗂</span><span class="mr-ct-name">Todas</span>`;
  allTab.onclick = (e) => { e.stopPropagation(); activeCategory = null; renderCatTabs(); renderCards(); };
  nav.appendChild(allTab);

  Object.entries(messageData.categories).forEach(([catName, cat]) => {
    const count = Object.keys(cat.subcategories || {}).length;
    const color = getCategoryColor(catName, cat);
    const tab = document.createElement('div');
    tab.className = 'mr-ct' + (activeCategory === catName ? ' active' : '');
    tab.innerHTML = `<span class="mr-ct-icon">${cat.icon || categoryIcons[catName] || categoryIcons.default}</span><span class="mr-ct-name">${catName}</span>`;
    tab.onclick = (e) => { e.stopPropagation(); activeCategory = catName; renderCatTabs(); renderCards(); };
    nav.appendChild(tab);
  });
}

// ── Cards ─────────────────────────────────────────────────────
function renderCards() {
  const content = document.getElementById('mr-c');
  if (!content) return;
  content.innerHTML = '';

  const msgs = getAllMessages();

  if (msgs.length === 0) {
    content.innerHTML = `
      <div class="mr-empty">
        <div class="mr-ei">💬</div>
        <div class="mr-et">${searchQuery ? 'Nenhum resultado' : 'Nenhuma mensagem'}</div>
        <div class="mr-ed">${searchQuery ? 'Tente outro termo de busca.' : 'Clique em "+ Nova Mensagem" para começar.'}</div>
      </div>`;
    return;
  }

  msgs.forEach(({ catName, subName, message, color }) => {
    const card = document.createElement('div');
    card.className = 'mr-card';
    card.innerHTML = `
      <div class="mr-ci">
        <div class="mr-cbar" style="background:${color}"></div>
        <div class="mr-cbody">
          <span class="mr-cname">${subName}</span>
          <div class="mr-cprev">${highlightVars(message)}</div>
          <div class="mr-cft">
            <div class="mr-cact">
              <button class="mr-btn mr-bg mr-edit">Editar</button>
              <button class="mr-btn mr-bp mr-use">Usar</button>
            </div>
          </div>
        </div>
      </div>`;

    card.querySelector('.mr-use').onclick = e => { e.stopPropagation(); insertMessage(message); };
    card.querySelector('.mr-edit').onclick = e => { e.stopPropagation(); openMessageModal(catName, subName); };
    card.onclick = () => insertMessage(message);
    content.appendChild(card);
  });
}

// ── Panel show/hide ───────────────────────────────────────────
function showPanel() {
  let panel = document.getElementById('mr-panel');
  if (!panel) buildPanel();
  panel = document.getElementById('mr-panel');
  searchQuery = '';
  const si = panel.querySelector('#mr-si');
  if (si) si.value = '';
  positionPanel(panel);
  renderCatTabs();
  renderCards();
  setTimeout(() => panel.classList.add('visible'), 10);
}

function hidePanel() {
  const p = document.getElementById('mr-panel');
  if (p) p.classList.remove('visible');
}

function togglePanel() {
  const p = document.getElementById('mr-panel');
  if (!p || !p.classList.contains('visible')) showPanel();
  else hidePanel();
}

// ── Modal base ────────────────────────────────────────────────
function createOverlay() {
  const ov = document.createElement('div');
  ov.className = 'mr-ov';
  ov.innerHTML = `<div class="mr-modal" id="mr-modal-inner"></div>`;

  // copia CSS vars do panel para a modal
  const panel = document.getElementById('mr-panel');
  if (panel) {
    const cs = getComputedStyle(panel);
    const vars = ['--bg','--bg2','--bg3','--bghov','--txt','--txt2','--txt3','--border',
                  '--accent','--accenthov','--accentlt','--success','--danger','--dangerlt',
                  '--sh-sm','--sh-md','--sh-lg','--r-sm','--r-md','--r-lg','--r-full','--tr'];
    const modal = ov.querySelector('.mr-modal');
    vars.forEach(v => modal.style.setProperty(v, cs.getPropertyValue(v)));
  }

  ov.onclick = e => { if (e.target === ov) closeOverlay(ov); };
  ov.querySelector('.mr-modal').addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(ov);
  setTimeout(() => ov.classList.add('active'), 10);
  return ov;
}

function closeOverlay(ov) {
  ov.classList.remove('active');
  setTimeout(() => ov.remove(), 220);
}

// ── Modal: Nova/Editar Mensagem ───────────────────────────────
function openMessageModal(editCatName, editSubName, defaultCat, fromSettings, onSave) {
  const isEdit = editCatName !== null && editSubName !== null;
  const ov = createOverlay();
  if (fromSettings) {
    ov.style.zIndex = '1000010';
    const inner = ov.querySelector('#mr-modal-inner');
    if (inner) inner.style.zIndex = '1000011';
  }
  const modal = ov.querySelector('#mr-modal-inner');

  const catOpts = Object.keys(messageData.categories)
    .map(c => `<option value="${c}" ${(c===editCatName||c===defaultCat)?'selected':''}>${c}</option>`)
    .join('');

  let currentMsg = '', currentColor = '#3B82F6';
  if (isEdit) {
    const sub = messageData.categories[editCatName]?.subcategories[editSubName];
    if (sub) {
      currentMsg   = typeof sub === 'string' ? sub : sub.message;
      currentColor = typeof sub === 'object' && sub.color ? sub.color : currentColor;
    }
  }

  const chips = AVAILABLE_VARS.map(v => `<span class="mr-vc">${v}</span>`).join('');

  modal.innerHTML = `
    <div class="mr-mhd">
      <span class="mr-mt">${isEdit ? 'Editar Mensagem' : 'Nova Mensagem'}</span>
      <button class="mr-mc">✕</button>
    </div>
    <div class="mr-mb">
      <div class="mr-fg">
        <label class="mr-fl">Título</label>
        <input class="mr-fi" id="mr-f-name" type="text" placeholder="Ex: Confirmação de envio" value="${isEdit ? escapeHtml(editSubName) : ''}">
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Categoria</label>
        <select class="mr-fs" id="mr-f-cat">
          <option value="">Selecione uma categoria</option>
          ${catOpts}
        </select>
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Cor da barra lateral</label>
        <input type="color" id="mr-f-color" value="${currentColor}"
          style="width:100%;height:30px;padding:2px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg2);cursor:pointer">
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Mensagem</label>
        <textarea class="mr-fta" id="mr-f-msg" placeholder="Digite sua mensagem...">${isEdit ? escapeHtml(currentMsg) : ''}</textarea>
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Inserir variável (clique para adicionar)</label>
        <div class="mr-vp">${chips}</div>
      </div>
      ${isEdit ? '<div id="mr-del-area"></div>' : ''}
    </div>
    <div class="mr-mft">
      ${isEdit ? '<button class="mr-btn mr-bd" id="mr-f-del">Excluir</button>' : ''}
      <button class="mr-btn mr-bg" id="mr-f-cancel">Cancelar</button>
      <button class="mr-btn mr-bp" id="mr-f-save">Salvar</button>
    </div>`;

  modal.querySelector('.mr-mc').onclick      = () => closeOverlay(ov);
  modal.querySelector('#mr-f-cancel').onclick = () => closeOverlay(ov);

  modal.querySelectorAll('.mr-vc').forEach(chip => {
    chip.onclick = () => {
      const ta = modal.querySelector('#mr-f-msg');
      const s = ta.selectionStart, e = ta.selectionEnd, v = chip.textContent;
      ta.value = ta.value.slice(0,s) + v + ta.value.slice(e);
      ta.focus(); ta.selectionStart = ta.selectionEnd = s + v.length;
    };
  });

  modal.querySelector('#mr-f-save').onclick = () => {
    const name  = modal.querySelector('#mr-f-name').value.trim();
    const cat   = modal.querySelector('#mr-f-cat').value;
    const msg   = modal.querySelector('#mr-f-msg').value.trim();
    const color = modal.querySelector('#mr-f-color').value;
    if (!name) { alert('Digite um título.'); return; }
    if (!cat)  { alert('Selecione uma categoria.'); return; }
    if (!msg)  { alert('A mensagem não pode ser vazia.'); return; }
    if (isEdit && (editCatName !== cat || editSubName !== name)) {
      delete messageData.categories[editCatName].subcategories[editSubName];
    }
    if (!messageData.categories[cat]) return;
    messageData.categories[cat].subcategories[name] = { message: msg, color };
    saveData(); refreshPanel(); closeOverlay(ov);
    if (onSave) onSave();
    showToast(isEdit ? 'Mensagem atualizada!' : 'Mensagem criada!');
  };

  if (isEdit) {
    modal.querySelector('#mr-f-del').onclick = () => {
      const area = modal.querySelector('#mr-del-area');
      area.innerHTML = `
        <div class="mr-delbar">
          <span>Tem certeza? Não pode ser desfeito.</span>
          <div class="mr-delbar-act">
            <button class="mr-btn mr-bg" id="del-no">Não</button>
            <button class="mr-btn mr-bd" id="del-yes">Excluir</button>
          </div>
        </div>`;
      area.querySelector('#del-no').onclick  = () => { area.innerHTML = ''; };
      area.querySelector('#del-yes').onclick = () => {
        delete messageData.categories[editCatName].subcategories[editSubName];
        saveData(); refreshPanel(); closeOverlay(ov);
        if (onSave) onSave();
        showToast('Mensagem excluída.');
      };
    };
  }
}

// ── Modal: Nova Categoria ─────────────────────────────────────
function openCatModal() {
  const ov = createOverlay();
  const modal = ov.querySelector('#mr-modal-inner');
  modal.innerHTML = `
    <div class="mr-mhd">
      <span class="mr-mt">Nova Categoria</span>
      <button class="mr-mc">✕</button>
    </div>
    <div class="mr-mb">
      <div class="mr-fg">
        <label class="mr-fl">Nome</label>
        <input class="mr-fi" id="mc-name" type="text" placeholder="Ex: Pós-venda">
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Ícone (emoji)</label>
        <input class="mr-fi" id="mc-icon" type="text" placeholder="Ex: ✅">
      </div>
      <div class="mr-fg">
        <label class="mr-fl">Cor</label>
        <input type="color" id="mc-color" value="#3B82F6"
          style="width:100%;height:30px;padding:2px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg2);cursor:pointer">
      </div>
    </div>
    <div class="mr-mft">
      <button class="mr-btn mr-bg" id="mc-cancel">Cancelar</button>
      <button class="mr-btn mr-bp" id="mc-save">Criar Categoria</button>
    </div>`;

  modal.querySelector('.mr-mc').onclick   = () => closeOverlay(ov);
  modal.querySelector('#mc-cancel').onclick = () => closeOverlay(ov);
  modal.querySelector('#mc-save').onclick = () => {
    const name  = modal.querySelector('#mc-name').value.trim();
    const icon  = modal.querySelector('#mc-icon').value.trim();
    const color = modal.querySelector('#mc-color').value;
    if (!name) { alert('Digite um nome.'); return; }
    if (messageData.categories[name]) { alert('Categoria já existe.'); return; }
    messageData.categories[name] = {
      subcategories: {}, color,
      icon: icon || categoryIcons[name] || categoryIcons.default
    };
    saveData(); refreshPanel(); closeOverlay(ov);
    showToast('Categoria criada!');
  };
}

// ── Modal: Importar/Exportar ──────────────────────────────────
function openImportExportModal() {
  const ov = createOverlay();
  const modal = ov.querySelector('#mr-modal-inner');
  modal.innerHTML = `
    <div class="mr-mhd">
      <span class="mr-mt">Importar / Exportar</span>
      <button class="mr-mc">✕</button>
    </div>
    <div class="mr-mb">
      <p style="font-size:12px;color:var(--txt2);line-height:1.5">
        Exporte suas mensagens como JSON para backup. Ao importar, as mensagens atuais serão substituídas.
      </p>
      <div style="display:flex;gap:8px">
        <button class="mr-btn mr-bp" id="exp-btn" style="flex:1;padding:9px">↑ Exportar JSON</button>
        <button class="mr-btn mr-bg" id="imp-btn" style="flex:1;padding:9px">↓ Importar JSON</button>
      </div>
      <input type="file" id="mr-file" accept=".json" style="display:none">
    </div>
    <div class="mr-mft">
      <button class="mr-btn mr-bg" id="ie-close">Fechar</button>
    </div>`;

  modal.querySelector('.mr-mc').onclick   = () => closeOverlay(ov);
  modal.querySelector('#ie-close').onclick = () => closeOverlay(ov);
  modal.querySelector('#exp-btn').onclick = () => {
    const a = document.createElement('a');
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(messageData, null, 2));
    a.download = 'backup-mensagens.json'; a.click();
  };
  modal.querySelector('#imp-btn').onclick = () => modal.querySelector('#mr-file').click();
  modal.querySelector('#mr-file').onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.categories) throw new Error('Formato inválido');
        if (confirm('Substituir mensagens atuais?')) {
          messageData = data; saveData(); refreshPanel();
          closeOverlay(ov); showToast('Importado com sucesso!');
        }
      } catch (err) { alert('Erro: ' + err.message); }
    };
    reader.readAsText(file); e.target.value = '';
  };
}


// ── Painel de Configurações ───────────────────────────────────
function openSettingsPanel() {
  if (document.getElementById('mr-settings')) return;

  // Injetar CSS do painel de settings
  if (!document.getElementById('mr-settings-css')) {
    const st = document.createElement('style');
    st.id = 'mr-settings-css';
    st.textContent = [
      '#mr-settings{',
        'position:fixed;top:50%;left:50%;',
        'transform:translate(-50%,-50%) scale(.95);',
        'width:700px;max-width:calc(100vw - 24px);',
        'height:82vh;max-height:720px;',
        'background:var(--bg,#fff);border-radius:14px;',
        'box-shadow:0 20px 60px rgba(0,0,0,.15),0 0 0 1px var(--border,#E2E8F0);',
        'display:flex;flex-direction:column;z-index:1000002;',
        'opacity:0;pointer-events:none;',
        'transition:opacity .25s ease,transform .25s ease;',
        'font-family:Segoe UI,system-ui,sans-serif;',
      '}',
      '#mr-settings.visible{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:all;}',
      '#mr-settings-backdrop{',
        'position:fixed;inset:0;background:rgba(0,0,0,.45);',
        'backdrop-filter:blur(3px);z-index:1000001;',
        'opacity:0;pointer-events:none;transition:opacity .25s ease;',
      '}',
      '#mr-settings-backdrop.visible{opacity:1;pointer-events:all;}',
      '#mr-settings *{box-sizing:border-box;font-family:Segoe UI,system-ui,sans-serif;}',
      '.mst-hd{padding:14px 18px;border-bottom:1px solid var(--border,#E2E8F0);',
        'display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}',
      '.mst-title{font-size:15px;font-weight:700;color:var(--txt,#0F172A);}',
      '.mst-body{display:flex;flex:1;overflow:hidden;}',
      '.mst-sidebar{width:210px;flex-shrink:0;border-right:1px solid var(--border,#E2E8F0);display:flex;flex-direction:column;overflow:hidden;}',
      '.mst-sidebar-hd{padding:10px 12px;font-size:11px;font-weight:700;color:var(--txt3,#94A3B8);',
        'text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border,#E2E8F0);',
        'display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}',
      '.mst-sidebar-list{flex:1;overflow-y:auto;padding:6px;}',
      '.mst-sidebar-list::-webkit-scrollbar{width:3px;}',
      '.mst-sidebar-list::-webkit-scrollbar-thumb{background:var(--bghov,#E2E8F0);border-radius:3px;}',
      '.mst-cat-row{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:6px;',
        'cursor:pointer;transition:all 150ms ease;border:1.5px solid transparent;margin-bottom:3px;}',
      '.mst-cat-row:hover{background:var(--bg2,#F8FAFC);}',
      '.mst-cat-row.active{background:var(--accentlt,#DBEAFE);border-color:var(--accent,#3B82F6);}',
      '.mst-cat-row.drag-over{border-color:var(--accent,#3B82F6);background:var(--accentlt,#DBEAFE);}',
      '.mst-cat-row.dragging{opacity:.35;}',
      '.mst-cat-drag{cursor:grab;color:var(--txt3,#94A3B8);font-size:16px;opacity:.4;transition:opacity 150ms;}',
      '.mst-cat-row:hover .mst-cat-drag{opacity:1;}',
      '.mst-cat-icon{font-size:14px;flex-shrink:0;}',
      '.mst-cat-name{font-size:12px;font-weight:500;color:var(--txt,#0F172A);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.mst-cat-count{font-size:10px;color:var(--txt3,#94A3B8);flex-shrink:0;}',
      '.mst-main{flex:1;display:flex;flex-direction:column;overflow:hidden;}',
      // ── Cat edit bar ──
      '.mst-cat-edit-bar{border-bottom:1px solid var(--border,#E2E8F0);flex-shrink:0;background:var(--bg2,#F8FAFC);}',
      '.mst-cat-edit-top{display:flex;align-items:center;gap:6px;padding:10px 14px 6px;}',
      '.mst-cat-edit-icon{font-size:18px;flex-shrink:0;}',
      '.mst-cat-edit-name{flex:1;min-width:0;padding:5px 8px;border:1.5px solid var(--border,#E2E8F0);border-radius:6px;font-size:12px;font-family:inherit;color:var(--txt,#0F172A);background:var(--bg,#fff);outline:none;}',
      '.mst-cat-edit-name:focus{border-color:var(--accent,#3B82F6);}',
      '.mst-cat-edit-emoji{width:54px;text-align:center;padding:5px 4px;border:1.5px solid var(--border,#E2E8F0);border-radius:6px;font-size:13px;font-family:inherit;color:var(--txt,#0F172A);background:var(--bg,#fff);outline:none;}',
      '.mst-cat-edit-emoji:focus{border-color:var(--accent,#3B82F6);}',
      '.mst-cat-edit-color{width:32px;height:28px;padding:2px;border:1.5px solid var(--border,#E2E8F0);border-radius:6px;cursor:pointer;flex-shrink:0;}',
      '.mst-cat-edit-actions{display:flex;gap:6px;padding:0 14px 10px;}',
      '.mst-action-btn{flex:1;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:600;border:none;cursor:pointer;font-family:inherit;transition:all 150ms ease;white-space:nowrap;}',
      '.mst-action-save{background:var(--accent,#3B82F6);color:#fff;}',
      '.mst-action-save:hover{background:var(--accenthov,#2563EB);}',
      '.mst-action-del{background:var(--bg3,#F1F5F9);color:var(--danger,#EF4444);border:1.5px solid var(--danger,#EF4444);}',
      '.mst-action-del:hover{background:var(--dangerlt,#FEE2E2);}',
      // ── Messages header ──
      '.mst-msgs-header{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:1px solid var(--border,#E2E8F0);flex-shrink:0;}',
      '.mst-msgs-header-left{display:flex;align-items:center;gap:7px;min-width:0;}',
      '.mst-msgs-header-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}',
      '.mst-msgs-header-title{font-size:12px;font-weight:600;color:var(--txt,#0F172A);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.mst-action-new{flex:0 0 auto;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;border:none;cursor:pointer;font-family:inherit;transition:all 150ms ease;background:var(--accent,#3B82F6);color:#fff;}',
      '.mst-action-new:hover{background:var(--accenthov,#2563EB);}',
      '.mst-msg-list{flex:1;overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:5px;}',
      '.mst-msg-list::-webkit-scrollbar{width:3px;}',
      '.mst-msg-list::-webkit-scrollbar-thumb{background:var(--bghov,#E2E8F0);border-radius:3px;}',
      '.mst-msg-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;',
        'background:var(--bg2,#F8FAFC);border:1.5px solid var(--border,#E2E8F0);transition:all 150ms ease;}',
      '.mst-msg-row:hover{border-color:var(--accent,#3B82F6);}',
      '.mst-msg-row.dragging{opacity:.35;}',
      '.mst-msg-row.drag-over{border-color:var(--accent,#3B82F6);background:var(--accentlt,#DBEAFE);}',
      '.mst-msg-drag{cursor:grab;color:var(--txt3,#94A3B8);font-size:16px;opacity:.4;transition:opacity 150ms;}',
      '.mst-msg-row:hover .mst-msg-drag{opacity:1;}',
      '.mst-msg-bar{width:3px;min-height:34px;border-radius:2px;flex-shrink:0;align-self:stretch;}',
      '.mst-msg-info{flex:1;min-width:0;}',
      '.mst-msg-name{font-size:12px;font-weight:600;color:var(--txt,#0F172A);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.mst-msg-prev{font-size:11px;color:var(--txt3,#94A3B8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}',
      '.mst-msg-acts{display:flex;gap:4px;flex-shrink:0;}',
      '.mst-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--txt3,#94A3B8);}',
      '.mst-empty-icon{font-size:36px;opacity:.3;}',
      '.mst-empty-txt{font-size:12px;}',
      // ── Unsaved changes modal ──
      '.mst-unsaved-modal{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:10;border-radius:14px;}',
      '.mst-unsaved-box{background:var(--bg,#fff);border-radius:12px;padding:20px;width:280px;box-shadow:0 20px 60px rgba(0,0,0,.2);display:flex;flex-direction:column;gap:10px;text-align:center;}',
      '.mst-unsaved-icon{font-size:28px;}',
      '.mst-unsaved-title{font-size:14px;font-weight:700;color:var(--txt,#0F172A);}',
      '.mst-unsaved-msg{font-size:12px;color:var(--txt2,#475569);line-height:1.5;}',
      '.mst-unsaved-actions{display:flex;flex-direction:column;gap:6px;margin-top:4px;}',
      '.mst-action-discard{background:var(--bg3,#F1F5F9);color:var(--txt2,#475569);border:1.5px solid var(--border,#E2E8F0);}',
      '.mst-action-discard:hover{background:var(--bghov,#E2E8F0);}',
    ].join('');
    document.head.appendChild(st);
  }

  let selectedCat = Object.keys(messageData.categories)[0] || null;
  let dragSrcCat = null;
  let dragSrcMsg = null;

  // Verifica se há alterações não salvas na categoria atual
  function hasUnsavedChanges() {
    const nameInput  = sp.querySelector('#mst-cat-name-input');
    const iconInput  = sp.querySelector('#mst-cat-icon-input');
    const colorInput = sp.querySelector('#mst-cat-color-input');
    if (!nameInput || !selectedCat) return false;
    const cat = messageData.categories[selectedCat];
    if (!cat) return false;
    return nameInput.value.trim() !== selectedCat ||
           iconInput.value.trim() !== (cat.icon  || '') ||
           colorInput.value       !== (cat.color || '#3B82F6');
  }

  // Modal de confirmação de alterações não salvas
  function confirmUnsaved(onSave, onDiscard) {
    const existing = sp.querySelector('.mst-unsaved-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.className = 'mst-unsaved-modal';
    const box = document.createElement('div');
    box.className = 'mst-unsaved-box';
    box.innerHTML = '<div class="mst-unsaved-icon">⚠️</div>'
      + '<div class="mst-unsaved-title">Alterações não salvas</div>'
      + '<div class="mst-unsaved-msg">Você alterou <strong>' + selectedCat + '</strong> sem salvar. O que deseja fazer?</div>';
    const acts = document.createElement('div');
    acts.className = 'mst-unsaved-actions';
    const btnSave = document.createElement('button');
    btnSave.className = 'mst-action-btn mst-action-save';
    btnSave.textContent = '✓ Salvar Alterações';
    const btnDiscard = document.createElement('button');
    btnDiscard.className = 'mst-action-btn mst-action-discard';
    btnDiscard.textContent = 'Ignorar';
    acts.appendChild(btnSave);
    acts.appendChild(btnDiscard);
    box.appendChild(acts);
    modal.appendChild(box);
    sp.appendChild(modal);
    btnSave.onclick    = () => { modal.remove(); onSave(); };
    btnDiscard.onclick = () => { modal.remove(); onDiscard(); };
  }

  // Salva as alterações da categoria atual lendo direto do DOM
  function saveCurrent() {
    const nameInput  = sp.querySelector('#mst-cat-name-input');
    const iconInput  = sp.querySelector('#mst-cat-icon-input');
    const colorInput = sp.querySelector('#mst-cat-color-input');
    if (!nameInput || !selectedCat) return;
    const newName  = nameInput.value.trim();
    const newIcon  = iconInput.value.trim();
    const newColor = colorInput.value;
    if (!newName) return;
    if (newName !== selectedCat && messageData.categories[newName]) return;
    const data = { ...messageData.categories[selectedCat], icon: newIcon, color: newColor };
    if (newName !== selectedCat) {
      const entries = Object.entries(messageData.categories);
      const idx = entries.findIndex(([k]) => k === selectedCat);
      entries[idx] = [newName, data];
      messageData.categories = Object.fromEntries(entries);
      selectedCat = newName;
    } else {
      messageData.categories[selectedCat].icon  = newIcon;
      messageData.categories[selectedCat].color = newColor;
    }
    saveData();
    refreshPanel();
    showToast('Categoria atualizada!');
  }

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'mr-settings-backdrop';
  backdrop.onclick = closeSettings;
  document.body.appendChild(backdrop);

  // Panel
  const sp = document.createElement('div');
  sp.id = 'mr-settings';
  if (isDarkTheme) sp.classList.add('dark');
  sp.innerHTML = `
    <div class="mst-hd">
      <span class="mst-title">⚙️ Configurações — Categorias & Mensagens</span>
      <button class="mr-mc" id="mst-close">✕</button>
    </div>
    <div class="mst-body">
      <div class="mst-sidebar">
        <div class="mst-sidebar-hd">
          <span>Categorias</span>
          <button class="mr-btn mr-bp" id="mst-add-cat" style="padding:2px 8px;font-size:10px">+ Nova</button>
        </div>
        <div class="mst-sidebar-list" id="mst-cat-list"></div>
      </div>
      <div class="mst-main" id="mst-main">
        <div class="mst-empty"><div class="mst-empty-icon">📂</div><div class="mst-empty-txt">Selecione uma categoria</div></div>
      </div>
    </div>
  `;
  sp.addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(sp);

  // Copia vars de tema
  const panel = document.getElementById('mr-panel');
  if (panel) {
    const cs = getComputedStyle(panel);
    ['--bg','--bg2','--bg3','--bghov','--txt','--txt2','--txt3','--border',
     '--accent','--accenthov','--accentlt','--success','--danger','--dangerlt',
     '--sh-sm','--sh-md','--sh-lg','--r-sm','--r-md','--r-lg','--r-full','--tr']
      .forEach(v => sp.style.setProperty(v, cs.getPropertyValue(v)));
  }

  sp.querySelector('#mst-close').onclick = closeSettings;
  sp.querySelector('#mst-add-cat').onclick = () => {
    closeSettings();
    openCatModal();
  };

  setTimeout(() => { backdrop.classList.add('visible'); sp.classList.add('visible'); }, 10);

  // ── Render sidebar de categorias ──
  function renderSidebar() {
    const list = sp.querySelector('#mst-cat-list');
    list.innerHTML = '';
    Object.entries(messageData.categories).forEach(([catName, cat]) => {
      const count = Object.keys(cat.subcategories || {}).length;
      const color = cat.color || '#3B82F6';
      const row = document.createElement('div');
      row.className = 'mst-cat-row' + (catName === selectedCat ? ' active' : '');
      row.dataset.cat = catName;
      row.draggable = true;
      row.innerHTML = `
        <span class="mst-cat-drag" title="Arrastar para reordenar">⠿</span>
        <span class="mst-cat-icon" style="color:${color}">${cat.icon || '📂'}</span>
        <span class="mst-cat-name">${catName}</span>
        <span class="mst-cat-count">${count}</span>
      `;
      row.onclick = (e) => {
        if (e.target.classList.contains('mst-cat-drag')) return;
        if (catName === selectedCat) return;
        const switchTo = catName;
        if (hasUnsavedChanges()) {
          confirmUnsaved(
            () => { // Salvar
              saveCurrent();
              selectedCat = switchTo;
              renderSidebar();
              renderMain();
            },
            () => { // Ignorar
              selectedCat = switchTo;
              renderSidebar();
              renderMain();
            }
          );
        } else {
          selectedCat = switchTo;
          renderSidebar();
          renderMain();
        }
      };

      // Drag & drop categorias
      row.addEventListener('dragstart', e => {
        dragSrcCat = catName;
        setTimeout(() => row.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', e => {
        e.preventDefault();
        if (dragSrcCat && dragSrcCat !== catName) row.classList.add('drag-over');
      });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
      row.addEventListener('drop', e => {
        e.preventDefault();
        row.classList.remove('drag-over');
        if (!dragSrcCat || dragSrcCat === catName) return;
        // Reordena
        const entries = Object.entries(messageData.categories);
        const fromIdx = entries.findIndex(([k]) => k === dragSrcCat);
        const toIdx   = entries.findIndex(([k]) => k === catName);
        const [moved] = entries.splice(fromIdx, 1);
        entries.splice(toIdx, 0, moved);
        messageData.categories = Object.fromEntries(entries);
        saveData(); refreshPanel(); renderSidebar();
        dragSrcCat = null;
      });

      list.appendChild(row);
    });
  }

  // ── Render painel principal (mensagens da cat selecionada) ──
  function renderMain() {
    const main = sp.querySelector('#mst-main'); // eslint-disable-line no-shadow
    if (!selectedCat || !messageData.categories[selectedCat]) {
      main.innerHTML = `<div class="mst-empty"><div class="mst-empty-icon">📂</div><div class="mst-empty-txt">Selecione uma categoria</div></div>`;
      return;
    }
    const cat = messageData.categories[selectedCat];
    const color = cat.color || '#3B82F6';

    main.innerHTML = `
      <div class="mst-cat-edit-bar">
        <div class="mst-cat-edit-top">
          <span class="mst-cat-edit-icon">${cat.icon || '📂'}</span>
          <input id="mst-cat-name-input" class="mst-cat-edit-name" value="${escapeHtml(selectedCat)}" placeholder="Nome">
          <input id="mst-cat-icon-input" class="mst-cat-edit-emoji" value="${escapeHtml(cat.icon || '')}" placeholder="Ícone">
          <input type="color" id="mst-cat-color-input" class="mst-cat-edit-color" value="${color}" title="Cor">
        </div>
        <div class="mst-cat-edit-actions">
          <button class="mst-action-btn mst-action-save" id="mst-cat-save">✓ Salvar</button>
          <button class="mst-action-btn mst-action-del" id="mst-cat-del" title="Excluir categoria">🗑 Excluir</button>
        </div>
      </div>
      <div class="mst-msgs-header">
        <div class="mst-msgs-header-left">
          <span class="mst-msgs-header-dot" style="background:${color}"></span>
          <span class="mst-msgs-header-title">Mensagens em <strong>${selectedCat}</strong></span>
        </div>
        <button class="mst-action-btn mst-action-new" id="mst-add-msg">+ Nova</button>
      </div>
      <div class="mst-msg-list" id="mst-msg-list"></div>
    `;

    // Salvar edição da categoria
    main.querySelector('#mst-cat-save').onclick = () => {
      const newName  = main.querySelector('#mst-cat-name-input').value.trim();
      const newIcon  = main.querySelector('#mst-cat-icon-input').value.trim();
      const newColor = main.querySelector('#mst-cat-color-input').value;
      if (!newName) { alert('Nome não pode ser vazio.'); return; }
      if (newName !== selectedCat && messageData.categories[newName]) { alert('Já existe uma categoria com esse nome.'); return; }
      const data = { ...messageData.categories[selectedCat], icon: newIcon, color: newColor };
      if (newName !== selectedCat) {
        const entries = Object.entries(messageData.categories);
        const idx = entries.findIndex(([k]) => k === selectedCat);
        entries[idx] = [newName, data];
        messageData.categories = Object.fromEntries(entries);
        selectedCat = newName;
      } else {
        messageData.categories[selectedCat].icon  = newIcon;
        messageData.categories[selectedCat].color = newColor;
      }
      saveData(); refreshPanel(); renderSidebar(); renderMain();
      showToast('Categoria atualizada!');
    };

    // Excluir categoria
    main.querySelector('#mst-cat-del').onclick = () => {
      if (!confirm(`Excluir a categoria "${selectedCat}" e todas as suas mensagens?`)) return;
      delete messageData.categories[selectedCat];
      selectedCat = Object.keys(messageData.categories)[0] || null;
      saveData(); refreshPanel(); renderSidebar(); renderMain();
      showToast('Categoria excluída.');
    };

    main.querySelector('#mst-add-msg').onclick = () => {
      openMessageModal(null, null, selectedCat, true, () => renderMsgList());
    };

    renderMsgList();
  }

  function renderMsgList() {
    const list = sp.querySelector('#mst-msg-list');
    if (!list) return;
    list.innerHTML = '';
    const subs = Object.entries(messageData.categories[selectedCat]?.subcategories || {});
    if (subs.length === 0) {
      list.innerHTML = `<div class="mst-empty" style="padding:32px"><div class="mst-empty-icon">💬</div><div class="mst-empty-txt">Nenhuma mensagem nesta categoria</div></div>`;
      return;
    }
    subs.forEach(([subName, subItem]) => {
      const msg   = typeof subItem === 'string' ? subItem : subItem.message;
      const color = typeof subItem === 'object' && subItem.color ? subItem.color : '#3B82F6';

      const row = document.createElement('div');
      row.className = 'mst-msg-row';
      row.dataset.sub = subName;
      row.draggable = true;
      row.innerHTML = `
        <span class="mst-msg-drag" title="Arrastar para reordenar">⠿</span>
        <div class="mst-msg-bar" style="background:${color}"></div>
        <div class="mst-msg-info">
          <div class="mst-msg-name">${escapeHtml(subName)}</div>
          <div class="mst-msg-prev">${escapeHtml(msg)}</div>
        </div>
        <div class="mst-msg-actions">
          <button class="mr-btn mr-bg mst-edit-msg" style="padding:3px 9px;font-size:10px">Editar</button>
          <button class="mr-btn mr-bd mst-del-msg" style="padding:3px 8px;font-size:10px">🗑</button>
        </div>
      `;

      // Editar mensagem
      row.querySelector('.mst-edit-msg').onclick = () => {
        openMessageModal(selectedCat, subName, null, true, () => renderMsgList());
      };

      // Excluir mensagem
      row.querySelector('.mst-del-msg').onclick = () => {
        if (!confirm(`Excluir a mensagem "${subName}"?`)) return;
        delete messageData.categories[selectedCat].subcategories[subName];
        saveData(); refreshPanel(); renderMsgList();
        showToast('Mensagem excluída.');
      };

      // Drag & drop mensagens
      row.addEventListener('dragstart', e => {
        dragSrcMsg = subName;
        setTimeout(() => row.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', e => {
        e.preventDefault();
        if (dragSrcMsg && dragSrcMsg !== subName) row.classList.add('drag-over');
      });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
      row.addEventListener('drop', e => {
        e.preventDefault();
        row.classList.remove('drag-over');
        if (!dragSrcMsg || dragSrcMsg === subName) return;
        const entries = Object.entries(messageData.categories[selectedCat].subcategories);
        const fromIdx = entries.findIndex(([k]) => k === dragSrcMsg);
        const toIdx   = entries.findIndex(([k]) => k === subName);
        const [moved] = entries.splice(fromIdx, 1);
        entries.splice(toIdx, 0, moved);
        messageData.categories[selectedCat].subcategories = Object.fromEntries(entries);
        saveData(); refreshPanel(); renderMsgList();
        dragSrcMsg = null;
      });

      list.appendChild(row);
    });
  }

  function closeSettings() {
    backdrop.classList.remove('visible');
    sp.classList.remove('visible');
    setTimeout(() => { backdrop.remove(); sp.remove(); }, 250);
  }

  renderSidebar();
  renderMain();
}

// ── Helpers ───────────────────────────────────────────────────
function refreshPanel() { renderCatTabs(); renderCards(); }

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── FAB ───────────────────────────────────────────────────────
function renderFAB() {
  if (document.getElementById('mr-fab')) return;
  const fab = document.createElement('button');
  fab.id = 'mr-fab';
  fab.innerHTML = `<div id="mr-fab-drag" title="Arrastar">⋮</div>✉️`;
  fab.style.cssText = `top:${buttonPosition.top};left:${buttonPosition.left};bottom:${buttonPosition.bottom};right:${buttonPosition.right};`;

  let dragging = false, ox = 0, oy = 0;
  const drag = fab.querySelector('#mr-fab-drag');
  drag.onmousedown = e => {
    e.stopPropagation(); dragging = true;
    ox = e.clientX - fab.getBoundingClientRect().left;
    oy = e.clientY - fab.getBoundingClientRect().top;
    document.onmousemove = e => {
      if (!dragging) return;
      const nx = Math.max(0, Math.min(e.clientX - ox, window.innerWidth  - fab.offsetWidth));
      const ny = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - fab.offsetHeight));
      fab.style.left = nx+'px'; fab.style.top = ny+'px';
      fab.style.right = 'auto'; fab.style.bottom = 'auto';
    };
    document.onmouseup = e => {
      dragging = false;
      const r = fab.getBoundingClientRect();
      saveButtonPosition(r.top, r.left);
      const panel = document.getElementById('mr-panel');
      if (panel?.classList.contains('visible')) positionPanel(panel);
      document.onmousemove = null; document.onmouseup = null;
    };
  };
  fab.onclick = e => { if (!dragging) togglePanel(); };
  document.body.appendChild(fab);

  document.addEventListener('click', e => {
    const panel = document.getElementById('mr-panel');
    const f     = document.getElementById('mr-fab');
    if (!panel?.classList.contains('visible')) return;
    // Não fecha se há um overlay/modal aberto
    if (document.querySelector('.mr-ov.active')) return;
    // Não fecha se o clique foi dentro do painel ou no FAB
    if (!panel.contains(e.target) && e.target !== f && !f?.contains(e.target))
      hidePanel();
  });
}

// ── Toast ─────────────────────────────────────────────────────
function renderToast() {
  if (document.getElementById('mr-toast')) return;
  const t = document.createElement('div');
  t.id = 'mr-toast';
  t.innerHTML = `<span class="mr-ticon">✓</span><span class="mr-tmsg">Mensagem inserida!</span>`;
  document.body.appendChild(t);
}

// ── Bootstrap: importa do GitHub na primeira vez ─────────────
// Troque pela URL raw do seu repositório GitHub:
const BACKUP_URL = 'https://raw.githubusercontent.com/ASolha/passo-largo/main/backup-mensagens.json';
const IMPORT_FLAG = 'mr-auto-imported';

async function bootstrap() {
  loadData();

  // Só importa se: nunca importou antes E não tem nenhuma categoria salva
  const alreadyImported = localStorage.getItem(IMPORT_FLAG);
  const hasData = Object.keys(messageData.categories).length > 0;

  if (!alreadyImported && !hasData) {
    try {
      const res = await fetch(BACKUP_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const imported = await res.json();
      if (imported && imported.categories && Object.keys(imported.categories).length > 0) {
        messageData = imported;
        saveData();
        localStorage.setItem(IMPORT_FLAG, '1');
        console.log('[Passo-Largo] Backup importado do GitHub com sucesso!');
      }
    } catch (e) {
      console.warn('[Passo-Largo] Nao foi possivel importar backup:', e.message);
      // Falha silenciosa — usuario pode importar manualmente
    }
  }

  renderToast();
  renderFAB();
}

// ── Init ──────────────────────────────────────────────────────
function init() { bootstrap(); }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

chrome.runtime.onMessage.addListener(request => {
  if (request.action === 'openEditor') showPanel();
});
