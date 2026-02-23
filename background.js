// ============================================================
// BACKGROUND SERVICE WORKER — Passo-Largo v2.3
// ============================================================

// Arquivo padrão público do administrador (sem autenticação)
// Compartilhado como "qualquer pessoa com o link pode ver"
const DEFAULT_TEMPLATE_FILE_ID = '1GSDInyBva23RxPw2Q429TSrbQp2k50SB';

let cachedToken = null;

// -------------------------------------------------------
// Carrega template padrão na primeira instalação
// Usa a API pública do Drive (sem precisar de login)
// -------------------------------------------------------
async function loadDefaultTemplate() {
  try {
    // Verifica se já foi inicializado antes
    const result = await chrome.storage.local.get('mr-initialized');
    if (result['mr-initialized']) return; // Já inicializado, ignora

    console.log('[Passo-Largo] Primeira instalação — carregando mensagens padrão...');

    // Busca o arquivo público via export do Drive (sem autenticação)
    const url = `https://drive.google.com/uc?export=download&id=${DEFAULT_TEMPLATE_FILE_ID}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error('Falha ao baixar template: ' + res.status);

    const text = await res.text();
    const data = JSON.parse(text);

    if (!data.categories) throw new Error('Formato inválido');

    // Salva no localStorage via mensagem para a aba ativa
    // (background não tem acesso ao localStorage da página)
    // Usamos chrome.storage.local como ponte
    await chrome.storage.local.set({
      'mr-default-messages': JSON.stringify(data),
      'mr-initialized': true
    });

    console.log('[Passo-Largo] Mensagens padrão carregadas com sucesso!');
  } catch (e) {
    console.warn('[Passo-Largo] Não foi possível carregar template padrão:', e.message);
    // Marca como inicializado mesmo assim para não tentar de novo em loop
    await chrome.storage.local.set({ 'mr-initialized': true });
  }
}

// Dispara na instalação
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    loadDefaultTemplate();
  }
});

// -------------------------------------------------------
// OAuth / Google Drive
// -------------------------------------------------------

async function getAuthToken(interactive = false) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        if (!interactive) {
          chrome.identity.getAuthToken({ interactive: true }, (token2) => {
            if (chrome.runtime.lastError || !token2) {
              reject(chrome.runtime.lastError?.message || 'Sem token');
            } else {
              cachedToken = token2;
              resolve(token2);
            }
          });
        } else {
          reject(chrome.runtime.lastError?.message || 'Sem token');
        }
      } else {
        cachedToken = token;
        resolve(token);
      }
    });
  });
}

async function getAuthTokenFresh() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          chrome.identity.getAuthToken({ interactive: true }, (newToken) => {
            if (chrome.runtime.lastError || !newToken) {
              reject(chrome.runtime.lastError?.message || 'Falha ao renovar token');
            } else {
              cachedToken = newToken;
              resolve(newToken);
            }
          });
        });
      } else {
        chrome.identity.getAuthToken({ interactive: true }, (newToken) => {
          if (chrome.runtime.lastError || !newToken) {
            reject(chrome.runtime.lastError?.message || 'Sem token');
          } else {
            cachedToken = newToken;
            resolve(newToken);
          }
        });
      }
    });
  });
}

async function getUserEmail(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email || null;
}

async function revokeToken(token) {
  try { await fetch('https://accounts.google.com/o/oauth2/revoke?token=' + token); } catch(e) {}
  chrome.identity.removeCachedAuthToken({ token }, () => {});
  cachedToken = null;
}

async function findFileId(token, fileName) {
  const q = encodeURIComponent("name='" + fileName + "' and trashed=false");
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id,name)',
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!res.ok) { const txt = await res.text(); throw new Error('Erro ao buscar no Drive: ' + txt); }
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

async function readFileContent(token, fileId) {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media',
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!res.ok) throw new Error('Erro ao ler arquivo do Drive');
  return await res.text();
}

async function upsertFile(token, fileName, content, existingFileId) {
  const boundary = '-------314159265358979323846';
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelimiter = '\r\n--' + boundary + '--';
  const metadata = JSON.stringify({ name: fileName, mimeType: 'application/json' });
  const body =
    delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + metadata +
    delimiter + 'Content-Type: application/json\r\n\r\n' + content +
    closeDelimiter;

  const method = existingFileId ? 'PATCH' : 'POST';
  const url = existingFileId
    ? 'https://www.googleapis.com/upload/drive/v3/files/' + existingFileId + '?uploadType=multipart'
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'multipart/related; boundary="' + boundary + '"'
    },
    body
  });
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!res.ok) { const err = await res.text(); throw new Error('Erro ao salvar no Drive: ' + err); }
  return await res.json();
}

async function withTokenRetry(operation) {
  try {
    const token = await getAuthToken(false);
    return await operation(token);
  } catch (err) {
    if (String(err).includes('TOKEN_EXPIRED') || String(err).includes('Sem token')) {
      const freshToken = await getAuthTokenFresh();
      return await operation(freshToken);
    }
    throw err;
  }
}

// -------------------------------------------------------
// Listener de mensagens
// -------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'openEditor') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: 'openEditor' });
    });
    return;
  }

  // Verifica se há mensagens padrão prontas para aplicar (chamado pelo content.js no boot)
  if (request.action === 'get_default_messages') {
    chrome.storage.local.get('mr-default-messages', (result) => {
      if (result['mr-default-messages']) {
        // Entrega e limpa — só aplica uma vez
        const data = result['mr-default-messages'];
        chrome.storage.local.remove('mr-default-messages');
        sendResponse({ data });
      } else {
        sendResponse({ data: null });
      }
    });
    return true;
  }

  if (request.action === 'gdrive_check_auth') {
    getAuthToken(false)
      .then(async (token) => { const email = await getUserEmail(token); sendResponse({ loggedIn: true, email }); })
      .catch(() => sendResponse({ loggedIn: false }));
    return true;
  }

  if (request.action === 'gdrive_login') {
    getAuthToken(true)
      .then(async (token) => { const email = await getUserEmail(token); sendResponse({ loggedIn: true, email }); })
      .catch((err) => sendResponse({ loggedIn: false, error: String(err) }));
    return true;
  }

  if (request.action === 'gdrive_logout') {
    const tok = cachedToken;
    if (tok) { revokeToken(tok).then(() => sendResponse({ loggedIn: false })); }
    else { sendResponse({ loggedIn: false }); }
    return true;
  }

  if (request.action === 'gdrive_export') {
    const { data, fileName } = request;
    withTokenRetry(async (token) => {
      const existingId = await findFileId(token, fileName);
      await upsertFile(token, fileName, data, existingId);
    })
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ error: String(err) }));
    return true;
  }

  if (request.action === 'gdrive_import') {
    const { fileName } = request;
    withTokenRetry(async (token) => {
      const fileId = await findFileId(token, fileName);
      if (!fileId) return { notFound: true };
      const content = await readFileContent(token, fileId);
      return { data: content };
    })
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: String(err) }));
    return true;
  }

});
