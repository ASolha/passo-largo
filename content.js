// Sistema de armazenamento das mensagens
let messageData = {
  categories: {}
};

// Posição do botão
let buttonPosition = {
  bottom: '20px',
  right: '20px',
  top: 'auto',
  left: 'auto'
};

// Variáveis para controle do drag (apenas no editor)
let draggedItem = null;
let draggedSubItem = null;
let draggedOverItem = null;
let draggedOverSubItem = null;

// Mapa de ícones padrão para categorias
const categoryIcons = {
  'Gravação': '✍️',
  'Desconto 50%': '💰',
  'Mercado Pago': '💳',
  'Troca de Endereço': '🏠',
  'Troca de Aliança': '💍',
  'Menos Usadas': '❓',
  // Ícone padrão para categorias sem um mapeamento específico ou novas categorias
  'default': '📂'
};

// Variável para armazenar a categoria atualmente expandida por clique
let openCategoryDiv = null;

// Carrega dados salvos
function loadData() {
  const saved = localStorage.getItem('mr-messages');
  if (saved) {
    try {
      messageData = JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    }
  }

  // Carrega posição do botão
  const savedPosition = localStorage.getItem('mr-button-position');
  if (savedPosition) {
    try {
      buttonPosition = JSON.parse(savedPosition);
    } catch (e) {
      console.error('Erro ao carregar posição do botão:', e);
    }
  }
}

// Salva dados
function saveData() {
  localStorage.setItem('mr-messages', JSON.stringify(messageData));
}

// Salva posição do botão
function saveButtonPosition(top, left) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  const distanceToRight = windowWidth - left;
  const distanceToBottom = windowHeight - top;

  if (distanceToRight < windowWidth / 2) {
    buttonPosition.right = distanceToRight + 'px';
    buttonPosition.left = 'auto';
  } else {
    buttonPosition.left = left + 'px';
    buttonPosition.right = 'auto';
  }

  if (distanceToBottom < windowHeight / 2) {
    buttonPosition.bottom = distanceToBottom + 'px';
    buttonPosition.top = 'auto';
  } else {
    buttonPosition.top = top + 'px';
    buttonPosition.bottom = 'auto';
  }

  localStorage.setItem('mr-button-position', JSON.stringify(buttonPosition));
}

function renderButton() {
  if (document.getElementById('mr-button')) return;

  loadData();

  const btn = document.createElement('div');
  btn.id = 'mr-button';
  btn.textContent = '✉️';

  btn.style.cssText = `
    position: fixed;
    top: ${buttonPosition.top};
    left: ${buttonPosition.left};
    bottom: ${buttonPosition.bottom};
    right: ${buttonPosition.right};
    width: 50px;
    height: 50px;
    background: #007bff;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    user-select: none;
  `;

  const drag = document.createElement('div');
  drag.textContent = '⋮';
  drag.style.cssText = `
    cursor: move;
    position: absolute;
    top: -10px;
    left: -10px;
    background: #ccc;
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 12px;
    color: #666;
  `;
  drag.title = 'Arraste para mover';
  btn.appendChild(drag);

  let offsetX = 0,
    offsetY = 0,
    isDragging = false;
  drag.onmousedown = (e) => {
    e.stopPropagation();
    isDragging = true;
    offsetX = e.clientX - btn.getBoundingClientRect().left;
    offsetY = e.clientY - btn.getBoundingClientRect().top;

    document.onmousemove = (e) => {
      if (!isDragging) return;

      const newLeft = e.clientX - offsetX;
      const newTop = e.clientY - offsetY;

      const maxX = window.innerWidth - btn.offsetWidth;
      const maxY = window.innerHeight - btn.offsetHeight;
      const finalLeft = Math.max(0, Math.min(newLeft, maxX));
      const finalTop = Math.max(0, Math.min(newTop, maxY));

      btn.style.top = finalTop + 'px';
      btn.style.left = finalLeft + 'px';
      btn.style.bottom = 'auto';
      btn.style.right = 'auto';
    };

    document.onmouseup = (e) => {
      if (isDragging) {
        isDragging = false;
        const rect = btn.getBoundingClientRect();
        saveButtonPosition(rect.top, rect.left);

        const menu = document.getElementById('mr-menu');
        if (menu && menu.style.visibility === 'visible') { // Verifica visibilidade para posicionar
          positionMenu();
        }
      }
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };

  btn.onclick = (e) => {
    if (!isDragging) {
      e.stopPropagation();
      toggleMenu();
    }
  };

  document.body.appendChild(btn);
  renderMenu();
  renderEditor();
}

function renderMenu() {
  if (document.getElementById('mr-menu')) return;

  const menu = document.createElement('div');
  menu.id = 'mr-menu';
  menu.style.cssText = `
    position: fixed;
    width: 300px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 10001;
    visibility: hidden; /* Controla visibilidade */
    opacity: 0; /* Controla transparência */
    transform: scale(0.95); /* Para efeito de zoom sutil (sem translate) */
    transition: opacity 0.5s ease, transform 0.5s ease, visibility 0.5s; /* Transição mais suave (0.5s) */
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
    background: #f8f9fa;
    border-radius: 8px 8px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  const title = document.createElement('strong');
  title.textContent = 'Mensagens Rápidas';
  title.style.color = '#333';

  const editBtn = document.createElement('button');
  editBtn.textContent = '⚙️ Editar';
  editBtn.style.cssText = `
    background: #007bff;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  editBtn.onclick = () => openEditor();

  header.appendChild(title);
  header.appendChild(editBtn);
  menu.appendChild(header);

  const content = document.createElement('div');
  content.id = 'mr-menu-content';
  content.style.padding = '8px';
  content.style.maxHeight = 'calc(80vh - 50px)';
  content.style.overflowY = 'auto';
  menu.appendChild(content);

  document.body.appendChild(menu);
  updateMenuContent();
}

function positionMenu() {
  const menu = document.getElementById('mr-menu');
  const btn = document.getElementById('mr-button');

  if (!menu || !btn) return;

  const btnRect = btn.getBoundingClientRect();

  // Temporarily make it visible/block to get accurate dimensions, but invisible to user
  const originalVisibility = menu.style.visibility;
  const originalOpacity = menu.style.opacity;
  menu.style.visibility = 'hidden';
  menu.style.opacity = '0';
  menu.style.display = 'block'; // Make sure it's block for height calculation

  const menuWidth = menu.offsetWidth; // Use offsetWidth/Height for calculated dimensions
  const menuHeight = menu.offsetHeight;

  // Restore original display/visibility
  menu.style.display = 'block'; // Menu should always be block when visible
  menu.style.visibility = originalVisibility;
  menu.style.opacity = originalOpacity;

  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let left, top;
  const padding = 10; // Padding from window edges

  // Horizontal positioning: try right, then left, then center
  if (btnRect.right + menuWidth + padding <= windowWidth) {
    left = btnRect.right + padding;
  } else if (btnRect.left - menuWidth - padding >= 0) {
    left = btnRect.left - menuWidth - padding;
  } else {
    // Fallback to center if no side fits
    left = Math.max(padding, (windowWidth - menuWidth) / 2);
  }

  // Vertical positioning:
  // Prefer to align with the top of the button, if it fits below
  if (btnRect.top + menuHeight + padding <= windowHeight) {
    top = btnRect.top;
  }
  // Else, prefer to align with the bottom of the button, if it fits above
  else if (btnRect.bottom - menuHeight - padding >= 0) {
    top = btnRect.bottom - menuHeight;
  }
  // Otherwise, center it vertically within the available space, clamped by window edges
  else {
    top = Math.max(padding, (windowHeight - menuHeight) / 2);
    top = Math.min(top, windowHeight - menuHeight - padding); // Ensure it doesn't go off bottom
  }

  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  menu.style.transformOrigin = 'center center';
}

// Function to open a category
const openCategory = (currentCategoryDiv, subcategoriesDiv, arrow) => {
    // Close the previously open category if it exists and is different from the current one
    if (openCategoryDiv && openCategoryDiv !== currentCategoryDiv) {
        const prevSubDiv = openCategoryDiv.querySelector('.subcategories-list');
        const prevArrow = openCategoryDiv.querySelector('.arrow-icon');
        if (prevSubDiv) {
            prevSubDiv.style.maxHeight = '0';
            prevSubDiv.style.opacity = '0';
        }
        if (prevArrow) prevArrow.style.transform = 'rotate(0deg)';
    }

    // Open the current category
    subcategoriesDiv.style.maxHeight = '500px'; // Valor grande o suficiente para conter todas as subcategorias
    subcategoriesDiv.style.opacity = '1';
    arrow.style.transform = 'rotate(180deg)';
    positionMenu(); // Recalcula a posição do menu
    openCategoryDiv = currentCategoryDiv;
};

// Function to close a category
const closeCategory = (subcategoriesDiv, arrow) => {
    subcategoriesDiv.style.maxHeight = '0';
    subcategoriesDiv.style.opacity = '0';
    arrow.style.transform = 'rotate(0deg)';
    positionMenu();
    openCategoryDiv = null;
};


function updateMenuContent() {
  const content = document.getElementById('mr-menu-content');
  if (!content) return;

  content.innerHTML = '';

  if (Object.keys(messageData.categories).length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      text-align: center;
      color: #666;
      padding: 20px;
      font-style: italic;
    `;
    empty.textContent = 'Nenhuma mensagem cadastrada. Clique em "Editar" para adicionar.';
    content.appendChild(empty);
    return;
  }

  const categories = Object.entries(messageData.categories);

  categories.forEach(([categoryName, category]) => {
    const categoryDiv = document.createElement('div');
    categoryDiv.style.marginBottom = '8px';

    const categoryBtn = document.createElement('div');
    categoryBtn.style.cssText = `
      padding: 8px 12px;
      background: #f0f0f0;
      color: #333;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    `;

    const categoryTextContainer = document.createElement('div');
    categoryTextContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const categoryIconSpan = document.createElement('span');
    categoryIconSpan.textContent = category.icon || categoryIcons[categoryName] || categoryIcons['default'];
    categoryIconSpan.style.color = category.color || '#333';
    categoryIconSpan.style.fontSize = '18px';

    const categoryNameSpan = document.createElement('span');
    categoryNameSpan.textContent = categoryName;

    categoryTextContainer.appendChild(categoryIconSpan);
    categoryTextContainer.appendChild(categoryNameSpan);
    categoryBtn.appendChild(categoryTextContainer);

    const arrow = document.createElement('span');
    arrow.textContent = '▼';
    arrow.style.transition = 'transform 0.2s';
    arrow.style.color = '#333';
    arrow.classList.add('arrow-icon'); // Add class for easy selection
    categoryBtn.appendChild(arrow);

    const subcategoriesDiv = document.createElement('div');
    subcategoriesDiv.style.cssText = `
      margin-top: 4px;
      margin-left: 12px;
      overflow: hidden;
      max-height: 0; /* Começa fechado */
      opacity: 0; /* Começa invisível */
      transition: max-height 0.5s ease-out, opacity 0.5s ease-out; /* Transição mais suave (0.5s) */
    `;
    subcategoriesDiv.classList.add('subcategories-list'); // Add class for easy selection

    const subcategories = Object.entries(category.subcategories || {});

    subcategories.forEach(([subName, subItem]) => {
      const subMessage = typeof subItem === 'string' ? subItem : subItem.message;
      const subColor = (typeof subItem === 'object' && subItem.color) ? subItem.color : (category.color || '#007bff');

      const subBtn = document.createElement('div');
      subBtn.style.cssText = `
        padding: 6px 12px;
        background: white;
        color: #333;
        border-radius: 4px;
        cursor: pointer;
        margin-bottom: 2px;
        border: 1px solid ${subColor}; /* Contorno fino da mesma cor */
        border-left: 5px solid ${subColor}; /* Borda esquerda maior (Aplicada DEPOIS para sobrescrever e garantir visibilidade) */
      `;
      subBtn.textContent = subName;

      subBtn.onclick = (e) => {
        e.stopPropagation();
        insertMessage(subMessage);
        toggleMenu(); // Fecha o menu principal após inserir a mensagem
      };

      subcategoriesDiv.appendChild(subBtn);
    });

    // Evento de click para abrir/fechar a categoria
    categoryBtn.onclick = () => {
      const isVisible = parseFloat(subcategoriesDiv.style.maxHeight) > 0; // Verifica se está "aberto"
      if (isVisible) {
        closeCategory(subcategoriesDiv, arrow);
      } else {
        openCategory(categoryDiv, subcategoriesDiv, arrow);
      }
    };

    categoryDiv.appendChild(categoryBtn);
    categoryDiv.appendChild(subcategoriesDiv);
    content.appendChild(categoryDiv);
  });
}

/**
 * Tries to extract the first name of the customer from the Mercado Livre page.
 * This function is a heuristic and might need adjustments based on actual Mercado Livre HTML changes.
 * It looks for common patterns where the customer's name might be displayed.
 * @returns {string} The first name of the customer, or an empty string if not found.
 */
function getFirstNameFromPage() {
  let customerName = '';

  // Attempt 1: Look for the name within the user_header div, as provided by the user
  let nameElement = document.querySelector('#user_header p');
  if (nameElement) {
    let nameText = nameElement.textContent.trim();
    customerName = nameText.split(' ')[0]; // Get only the first name
  }

  // Attempt 2: Look for specific elements in Mercado Livre's chat or sales pages
  // Common selectors for customer names:
  // In a chat context, it might be in a header or a specific message bubble.
  // In a sales detail page, it might be near the "Comprador" or "Vendedor" section.
  if (!customerName) {
    nameElement = document.querySelector('.andes-message-card__header__title span.andes-text_size_large');
    if (nameElement) {
      let nameText = nameElement.textContent.trim();
      // Assuming the format is "Conversa com [Nome do Cliente]" or similar
      const match = nameText.match(/Conversa com (.+)/);
      if (match && match[1]) {
        customerName = match[1].split(' ')[0]; // Get only the first name
      } else {
        // If it's just the name
        customerName = nameText.split(' ')[0];
      }
    }
  }

  // Attempt 3: Look for elements with data attributes or specific classes on a transaction page
  if (!customerName) {
    nameElement = document.querySelector('[data-testid="buyer-name"], .buyer-info__name, .user-info__name');
    if (nameElement) {
      customerName = nameElement.textContent.trim().split(' ')[0];
    }
  }

  // Attempt 4: More generic approach, looking for common user profile links/spans
  if (!customerName) {
    nameElement = document.querySelector('a.nav-profile-menu-trigger span.nav-menu-label'); // For logged in user
    if (nameElement) {
      // This might get the seller's name, not the buyer's. Use with caution.
      customerName = nameElement.textContent.trim().split(' ')[0];
    }
  }

  // Fallback: If no specific element is found, try to find a common "Comprador" or "Cliente" label and get the adjacent text
  if (!customerName) {
      const buyerLabel = Array.from(document.querySelectorAll('span, div, p')).find(el => 
          el.textContent.includes('Comprador') || el.textContent.includes('Cliente')
      );
      if (buyerLabel && buyerLabel.nextElementSibling) {
          customerName = buyerLabel.nextElementSibling.textContent.trim().split(' ')[0];
      }
  }
  
  // Clean up the name (remove common prefixes/suffixes if any)
  customerName = customerName.replace(/^(Sr\.|Sra\.)\s*/i, '').trim();

  return customerName;
}


function insertMessage(message) {
  const campo = document.querySelector('textarea.sc-textarea') ||
    document.querySelector('textarea') ||
    document.querySelector('[contenteditable="true"]') ||
    document.querySelector('input[type="text"]');

  let finalMessage = message;

  // Check if the message contains the [NOME_CLIENTE] placeholder
  if (finalMessage.includes('[NOME_CLIENTE]')) {
    const customerFirstName = getFirstNameFromPage();
    if (customerFirstName) {
      finalMessage = finalMessage.replace(/\[NOME_CLIENTE\]/g, customerFirstName);
    } else {
      // If no name is found, remove the placeholder
      finalMessage = finalMessage.replace(/\[NOME_CLIENTE\]/g, '').trim();
    }
  }

  if (campo) {
    campo.focus();

    if (campo.tagName === 'TEXTAREA' || campo.tagName === 'INPUT') {
      campo.value = finalMessage;
      campo.dispatchEvent(new Event('input', {
        bubbles: true
      }));
      campo.dispatchEvent(new Event('change', {
        bubbles: true
      }));
    } else {
      campo.textContent = finalMessage;
      campo.dispatchEvent(new Event('input', {
        bubbles: true
      }));
    }
  } else {
    navigator.clipboard.writeText(finalMessage).then(() => {
      alert('Campo de texto não encontrado. Mensagem copiada para área de transferência.');
    }).catch(() => {
      alert('Não foi possível encontrar campo de texto ou copiar mensagem.');
    });
  }
}

function toggleMenu() {
  const menu = document.getElementById('mr-menu');
  if (!menu) return;

  const isVisible = menu.style.visibility === 'visible';

  if (isVisible) {
    menu.style.opacity = '0';
    menu.style.transform = 'scale(0.95)';
    menu.addEventListener('transitionend', function handler() {
      menu.style.visibility = 'hidden';
      menu.removeEventListener('transitionend', handler);
    });

    // Fecha qualquer subcategoria aberta quando o menu principal é fechado
    if (openCategoryDiv) {
        const prevSubDiv = openCategoryDiv.querySelector('.subcategories-list');
        const prevArrow = openCategoryDiv.querySelector('.arrow-icon');
        if (prevSubDiv) {
            prevSubDiv.style.maxHeight = '0';
            prevSubDiv.style.opacity = '0';
        }
        if (prevArrow) prevArrow.style.transform = 'rotate(0deg)';
        openCategoryDiv = null; // Reseta a variável de rastreamento
    }

  } else {
    menu.style.visibility = 'visible';
    menu.style.opacity = '1';
    menu.style.transform = 'scale(1)';
    updateMenuContent();
    positionMenu();
  }
}

function renderEditor() {
  if (document.getElementById('mr-editor')) return;

  const editor = document.createElement('div');
  editor.id = 'mr-editor';
  editor.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    max-height: 80vh;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    display: none;
    z-index: 10002;
    overflow-y: auto;
  `;

  editor.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid #eee; background: #f8f9fa; border-radius: 8px 8px 0 0;">
      <h3 style="margin: 0; color: #333;">Editor de Mensagens</h3>
    </div>
    <div style="padding: 16px;">
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Nova Categoria:</label>
        <input type="text" id="new-category" placeholder="Nome da categoria" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <label style="display: block; margin-top: 8px; margin-bottom: 4px; font-weight: bold;">Ícone da Categoria (emoji):</label>
        <input type="text" id="new-category-icon" placeholder="Ex: ✍️, 💰, 🏠" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <label style="display: block; margin-top: 8px; margin-bottom: 4px; font-weight: bold;">Cor do Ícone:</label>
        <input type="color" id="new-category-color" value="#007bff" style="width: 100%; height: 36px; padding: 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
        <button id="add-category" style="margin-top: 8px; background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Adicionar Categoria</button>
      </div>

      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Nova Subcategoria:</label>
        <select id="category-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px;">
          <option value="">Selecione uma categoria</option>
        </select>
        <input type="text" id="new-subcategory" placeholder="Nome da subcategoria" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px;">
        <label style="display: block; margin-top: 8px; margin-bottom: 4px; font-weight: bold;">Cor da Linha Lateral (Subcat.):</label>
        <input type="color" id="new-subcategory-color" value="#007bff" style="width: 100%; height: 36px; padding: 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; margin-bottom: 8px;">
        <textarea id="subcategory-message" placeholder="Mensagem da subcategoria" style="width: 100%; height: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
        <button id="add-subcategory" style="margin-top: 8px; background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Adicionar Subcategoria</button>
      </div>

      <div id="existing-items" style="margin-bottom: 16px;">
        <h4 style="color: #333;">Itens Cadastrados: <small style="color: #666; font-weight: normal;">(Arraste para reordenar)</small></h4>
        <div id="items-list"></div>
      </div>

      <div style="border-top: 1px solid #eee; padding: 16px 0; margin-bottom: 16px;">
        <h4 style="color: #333; margin-top: 0;">Importar/Exportar:</h4>
        <div style="display: flex; gap: 8px;">
          <button id="export-data" style="background: #17a2b8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; flex: 1;">Exportar Mensagens</button>
          <button id="import-data" style="background: #6f42c1; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; flex: 1;">Importar Mensagens</button>
        </div>
        <input type="file" id="file-input" accept=".json" style="display: none;">
      </div>

      <div style="text-align: right; border-top: 1px solid #eee; padding-top: 16px;">
        <button id="close-editor" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 8px;">Fechar</button>
        <button id="clear-all" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Limpar Tudo</button>
      </div>
    </div>
  `;

  document.body.appendChild(editor);
  setupEditorEvents();
}

function setupEditorEvents() {
  document.getElementById('add-category').onclick = addCategory;
  document.getElementById('add-subcategory').onclick = addSubcategory;
  document.getElementById('close-editor').onclick = closeEditor;
  document.getElementById('clear-all').onclick = clearAllData;
  document.getElementById('export-data').onclick = exportData;
  document.getElementById('import-data').onclick = () => document.getElementById('file-input').click();

  document.getElementById('file-input').addEventListener('change', handleFileImport);
}

function exportData() {
  const dataStr = JSON.stringify(messageData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = 'backup-mensagens.json';
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      if (!importedData.categories) {
        throw new Error('Formato de arquivo inválido');
      }

      for (const catName in importedData.categories) {
        if (importedData.categories.hasOwnProperty(catName)) {
          const category = importedData.categories[catName];
          if (category.subcategories) {
            for (const subName in category.subcategories) {
              if (category.subcategories.hasOwnProperty(subName)) {
                let subItem = category.subcategories[subName];
                // Ensure subItem is an object with message and color
                if (typeof subItem === 'string') {
                  category.subcategories[subName] = { message: subItem, color: '#007bff' };
                }
                if (!category.subcategories[subName].color) {
                  category.subcategories[subName].color = '#007bff';
                }
              }
            }
          }
          if (!category.color) {
            category.color = '#007bff';
          }
          if (!category.icon) {
            category.icon = categoryIcons[catName] || categoryIcons['default'];
          }
        }
      }

      if (confirm('Deseja substituir suas mensagens atuais pelas mensagens importadas?')) {
        messageData = importedData;
        saveData();
        updateCategorySelect();
        updateItemsList();
        alert('Mensagens importadas com sucesso!');
      }
    } catch (error) {
      alert('Erro ao importar arquivo: ' + error.message);
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // Clear the file input
}


function openEditor() {
  const editor = document.getElementById('mr-editor');
  if (!editor) return;
  editor.style.display = 'block';
  updateCategorySelect();
  updateItemsList();
  toggleMenu(); // Fecha o menu principal ao abrir o editor
}

function closeEditor() {
  const editor = document.getElementById('mr-editor');
  if (editor) {
    editor.style.display = 'none';
  }
}

function updateCategorySelect() {
  const select = document.getElementById('category-select');
  if (!select) return;

  select.innerHTML = '<option value="">Selecione uma categoria</option>';
  Object.keys(messageData.categories).forEach(categoryName => {
    const option = document.createElement('option');
    option.value = categoryName;
    option.textContent = categoryName;
    select.appendChild(option);
  });
}

function addCategory() {
  const input = document.getElementById('new-category');
  const iconInput = document.getElementById('new-category-icon');
  const colorInput = document.getElementById('new-category-color');
  const categoryName = input.value.trim();
  const categoryIcon = iconInput.value.trim();
  const categoryColor = colorInput.value;

  if (!categoryName) {
    alert('Digite um nome para a categoria');
    return;
  }
  if (messageData.categories[categoryName]) {
    alert('Categoria já existe');
    return;
  }

  messageData.categories[categoryName] = {
    subcategories: {},
    color: categoryColor,
    icon: categoryIcon || categoryIcons[categoryName] || categoryIcons['default']
  };
  saveData();
  input.value = '';
  iconInput.value = '';
  colorInput.value = '#007bff';
  updateCategorySelect();
  updateItemsList();
  alert('Categoria adicionada com sucesso!');
}

function addSubcategory() {
  const categorySelect = document.getElementById('category-select');
  const subcategoryInput = document.getElementById('new-subcategory');
  const messageTextarea = document.getElementById('subcategory-message');
  const subcategoryColorInput = document.getElementById('new-subcategory-color');

  const categoryName = categorySelect.value;
  const subcategoryName = subcategoryInput.value.trim();
  const message = messageTextarea.value.trim();
  const subcategoryColor = subcategoryColorInput.value;

  if (!categoryName) {
    alert('Selecione uma categoria');
    return;
  }
  if (!subcategoryName) {
    alert('Digite um nome para a subcategoria');
    return;
  }
  if (!message) {
    alert('Digite uma mensagem para a subcategoria');
    return;
  }
  if (messageData.categories[categoryName].subcategories[subcategoryName]) {
    alert('Subcategoria já existe');
    return;
  }

  messageData.categories[categoryName].subcategories[subcategoryName] = {
    message: message,
    color: subcategoryColor
  };
  saveData();
  subcategoryInput.value = '';
  messageTextarea.value = '';
  subcategoryColorInput.value = '#007bff';
  updateItemsList();
  alert('Subcategoria adicionada com sucesso!');
}

function updateItemsList() {
  const list = document.getElementById('items-list');
  if (!list) return;

  list.innerHTML = '';

  Object.keys(messageData.categories).forEach(categoryName => {
    const category = messageData.categories[categoryName];

    const categoryDiv = document.createElement('div');
    categoryDiv.style.cssText = `
      margin-bottom: 12px;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #f8f9fa;
      color: #333;
    `;
    categoryDiv.draggable = true;
    categoryDiv.dataset.category = categoryName;

    categoryDiv.addEventListener('dragstart', (e) => {
      draggedItem = categoryName;
      e.target.style.opacity = '0.5';
      e.target.style.transform = 'rotate(2deg)';
    });

    categoryDiv.addEventListener('dragend', (e) => {
      e.target.style.opacity = '1';
      e.target.style.transform = 'none';
      draggedItem = null;
      draggedOverItem = null;
    });

    categoryDiv.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem !== categoryName) {
        draggedOverItem = categoryName;
        e.target.style.borderTop = '3px solid #007bff';
      }
    });

    categoryDiv.addEventListener('dragleave', (e) => {
      e.target.style.borderTop = '1px solid #ddd';
    });

    categoryDiv.addEventListener('drop', (e) => {
      e.preventDefault();
      e.target.style.borderTop = '1px solid #ddd';
      if (draggedItem && draggedOverItem && draggedItem !== draggedOverItem) {
        const categoriesArray = Object.entries(messageData.categories);
        const draggedIndex = categoriesArray.findIndex(([name]) => name === draggedItem);
        const overIndex = categoriesArray.findIndex(([name]) => name === draggedOverItem);

        const [removed] = categoriesArray.splice(draggedIndex, 1);
        categoriesArray.splice(overIndex, 0, removed);

        messageData.categories = {};
        categoriesArray.forEach(([name, data]) => {
          messageData.categories[name] = data;
        });

        saveData();
        updateItemsList();
      }
      draggedItem = null;
      draggedOverItem = null;
    });


    const categoryHeader = document.createElement('div');
    categoryHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      cursor: move;
    `;

    const categoryTitleContainer = document.createElement('div');
    categoryTitleContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const categoryIconSpan = document.createElement('span');
    categoryIconSpan.textContent = category.icon || categoryIcons[categoryName] || categoryIcons['default'];
    categoryIconSpan.style.color = category.color || '#007bff';
    categoryIconSpan.style.fontSize = '18px';

    const categoryNameSpan = document.createElement('strong');
    categoryNameSpan.textContent = categoryName;

    categoryTitleContainer.appendChild(categoryIconSpan);
    categoryTitleContainer.appendChild(categoryNameSpan);
    categoryHeader.appendChild(categoryTitleContainer);


    const categoryActions = document.createElement('div');
    categoryActions.style.cssText = `
      display: flex;
      gap: 4px;
    `;

    const editCategoryBtn = document.createElement('button');
    editCategoryBtn.textContent = '✏️';
    editCategoryBtn.title = 'Editar Categoria';
    editCategoryBtn.style.cssText = `
      background: #ffc107;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    editCategoryBtn.onclick = (e) => {
      e.stopPropagation();
      editCategory(categoryName);
    };
    categoryActions.appendChild(editCategoryBtn);

    const deleteCategoryBtn = document.createElement('button');
    deleteCategoryBtn.textContent = '🗑️';
    deleteCategoryBtn.title = 'Excluir Categoria';
    deleteCategoryBtn.style.cssText = `
      background: #dc3545;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    deleteCategoryBtn.onclick = (e) => {
      e.stopPropagation();
      deleteCategory(categoryName);
    };
    categoryActions.appendChild(deleteCategoryBtn);

    categoryHeader.appendChild(categoryActions);
    categoryDiv.appendChild(categoryHeader);

    const subcategoriesList = document.createElement('div');
    subcategoriesList.style.marginTop = '8px';
    subcategoriesList.classList.add('ml-messages-list'); // Adiciona classe para customização do scrollbar

    Object.entries(category.subcategories).forEach(([subName, subItem]) => {
      const subMessage = typeof subItem === 'string' ? subItem : subItem.message;
      const subColor = (typeof subItem === 'object' && subItem.color) ? subItem.color : (category.color || '#007bff');

      const subDiv = document.createElement('div');
      subDiv.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        background: white;
        border: 1px solid #eee;
        border-left: 5px solid ${subColor};
        border-radius: 4px;
        margin-bottom: 4px;
        cursor: move;
      `;
      subDiv.draggable = true;
      subDiv.dataset.category = categoryName;
      subDiv.dataset.subcategory = subName;

      subDiv.addEventListener('dragstart', (e) => {
        draggedSubItem = { category: categoryName, subcategory: subName };
        e.target.style.opacity = '0.5';
        e.target.style.transform = 'rotate(2deg)';
      });

      subDiv.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
        e.target.style.transform = 'none';
        draggedSubItem = null;
        draggedOverSubItem = null;
      });

      subDiv.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedSubItem && draggedSubItem.category === categoryName && draggedSubItem.subcategory !== subName) {
          draggedOverSubItem = { category: categoryName, subcategory: subName };
          e.target.style.borderTop = '3px solid #007bff';
        }
      });

      subDiv.addEventListener('dragleave', (e) => {
        e.target.style.borderTop = '1px solid #eee';
      });

      subDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        e.target.style.borderTop = '1px solid #eee';
        if (draggedSubItem && draggedOverSubItem && draggedSubItem.category === draggedOverSubItem.category && draggedSubItem.subcategory !== draggedOverSubItem.subcategory) {
          const subcategoriesArray = Object.entries(messageData.categories[categoryName].subcategories);
          const draggedIndex = subcategoriesArray.findIndex(([name]) => name === draggedSubItem.subcategory);
          const overIndex = subcategoriesArray.findIndex(([name]) => name === draggedOverSubItem.subcategory);

          const [removed] = subcategoriesArray.splice(draggedIndex, 1);
          subcategoriesArray.splice(overIndex, 0, removed);

          messageData.categories[categoryName].subcategories = {};
          subcategoriesArray.forEach(([name, data]) => {
            messageData.categories[categoryName].subcategories[name] = data;
          });

          saveData();
          updateItemsList();
        }
        draggedSubItem = null;
        draggedOverSubItem = null;
      });

      const subTextContainer = document.createElement('div');
      subTextContainer.textContent = subName;
      subTextContainer.style.flex = '1';
      subTextContainer.style.cursor = 'pointer';
      subTextContainer.onclick = () => {
        insertMessage(subMessage);
        toggleMenu();
      };

      const subActions = document.createElement('div');
      subActions.style.display = 'flex';
      subActions.style.gap = '4px';

      const editSubBtn = document.createElement('button');
      editSubBtn.textContent = '✏️';
      editSubBtn.title = 'Editar Subcategoria';
      editSubBtn.style.cssText = `
        background: #ffc107;
        color: white;
        border: none;
        padding: 2px 6px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 10px;
      `;
      editSubBtn.onclick = (e) => {
        e.stopPropagation();
        editSubcategory(categoryName, subName, subMessage, subColor);
      };
      subActions.appendChild(editSubBtn);

      const deleteSubBtn = document.createElement('button');
      deleteSubBtn.textContent = '🗑️';
      deleteSubBtn.title = 'Excluir Subcategoria';
      deleteSubBtn.style.cssText = `
        background: #dc3545;
        color: white;
        border: none;
        padding: 2px 6px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 10px;
      `;
      deleteSubBtn.onclick = (e) => {
        e.stopPropagation();
        deleteSubcategory(categoryName, subName);
      };
      subActions.appendChild(deleteSubBtn);

      subDiv.appendChild(subTextContainer);
      subDiv.appendChild(subActions);
      subcategoriesList.appendChild(subDiv);
    });

    categoryDiv.appendChild(subcategoriesList);
    list.appendChild(categoryDiv);
  });
}

function editCategory(categoryName) {
  const category = messageData.categories[categoryName];
  if (!category) return;

  const modal = document.createElement('div');
  modal.id = 'edit-category-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10003;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    width: 400px;
    max-width: 90%;
  `;

  content.innerHTML = `
    <h3 style="margin-top: 0; margin-bottom: 15px; color: #333;">Editar Categoria: ${categoryName}</h3>
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Novo Nome:</label>
      <input type="text" id="edit-category-name" value="${categoryName}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Novo Ícone (emoji):</label>
      <input type="text" id="edit-category-icon" value="${category.icon || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Nova Cor:</label>
      <input type="color" id="edit-category-color" value="${category.color || '#007bff'}" style="width: 100%; height: 36px; padding: 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
    </div>
    <div style="text-align: right;">
      <button id="cancel-edit" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Cancelar</button>
      <button id="save-edit" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Salvar</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  document.getElementById('cancel-edit').onclick = () => {
    document.body.removeChild(modal);
  };

  document.getElementById('save-edit').onclick = () => {
    const newName = document.getElementById('edit-category-name').value.trim();
    const newIcon = document.getElementById('edit-category-icon').value.trim();
    const newColor = document.getElementById('edit-category-color').value;

    if (!newName) {
      alert('O nome da categoria não pode ser vazio.');
      return;
    }

    if (newName !== categoryName && messageData.categories[newName]) {
      alert('Já existe uma categoria com este novo nome.');
      return;
    }

    if (newName !== categoryName) {
      // Create new category with updated name and copy subcategories
      messageData.categories[newName] = { ...category, icon: newIcon, color: newColor };
      // Delete old category
      delete messageData.categories[categoryName];
    } else {
      // Update existing category
      messageData.categories[categoryName].icon = newIcon;
      messageData.categories[categoryName].color = newColor;
    }

    saveData();
    updateCategorySelect();
    updateItemsList();
    document.body.removeChild(modal);
    alert('Categoria atualizada com sucesso!');
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };

  content.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target.tagName !== 'TEXTAREA' || e.ctrlKey)) {
      e.preventDefault();
      content.querySelector('#save-edit').click();
    }
    if (e.key === 'Escape') {
      content.querySelector('#cancel-edit').click();
    }
  });
}

function editSubcategory(categoryName, subcategoryName, currentMessage, currentColor) {
  const modal = document.createElement('div');
  modal.id = 'edit-subcategory-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10003;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    width: 500px;
    max-width: 90%;
  `;

  content.innerHTML = `
    <h3 style="margin-top: 0; margin-bottom: 15px; color: #333;">Editar Subcategoria: ${subcategoryName}</h3>
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Novo Nome:</label>
      <input type="text" id="edit-subcategory-name" value="${subcategoryName}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Nova Cor da Linha Lateral:</label>
      <input type="color" id="edit-subcategory-color" value="${currentColor}" style="width: 100%; height: 36px; padding: 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
    </div>
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Nova Mensagem:</label>
      <textarea id="edit-subcategory-message" style="width: 100%; height: 150px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;">${currentMessage}</textarea>
    </div>
    <div style="text-align: right;">
      <button id="cancel-edit" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Cancelar</button>
      <button id="save-edit" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Salvar</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  document.getElementById('cancel-edit').onclick = () => {
    document.body.removeChild(modal);
  };

  document.getElementById('save-edit').onclick = () => {
    const newName = document.getElementById('edit-subcategory-name').value.trim();
    const newMessage = document.getElementById('edit-subcategory-message').value.trim();
    const newColor = document.getElementById('edit-subcategory-color').value;

    if (!newName) {
      alert('O nome da subcategoria não pode ser vazio.');
      return;
    }
    if (!newMessage) {
      alert('A mensagem da subcategoria não pode ser vazia.');
      return;
    }

    if (newName !== subcategoryName && messageData.categories[categoryName].subcategories[newName]) {
      alert('Já existe uma subcategoria com este novo nome.');
      return;
    }

    // Update the subcategory
    const oldSubcategoryData = messageData.categories[categoryName].subcategories[subcategoryName];
    if (newName !== subcategoryName) {
        delete messageData.categories[categoryName].subcategories[subcategoryName];
    }
    messageData.categories[categoryName].subcategories[newName] = {
      message: newMessage,
      color: newColor
    };

    saveData();
    updateItemsList();
    document.body.removeChild(modal);
    alert('Subcategoria atualizada com sucesso!');
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };

  content.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target.tagName !== 'TEXTAREA' || e.ctrlKey)) {
      e.preventDefault();
      content.querySelector('#save-edit').click();
    }
    if (e.key === 'Escape') {
      content.querySelector('#cancel-edit').click();
    }
  });
}

function deleteCategory(categoryName) {
  if (confirm(`Tem certeza que deseja excluir a categoria "${categoryName}" e todas suas subcategorias?`)) {
    delete messageData.categories[categoryName];
    saveData();
    updateCategorySelect();
    updateItemsList();
  }
}

function deleteSubcategory(categoryName, subcategoryName) {
  if (confirm(`Tem certeza que deseja excluir a subcategoria "${subcategoryName}"?`)) {
    delete messageData.categories[categoryName].subcategories[subcategoryName];
    saveData();
    updateItemsList();
  }
}

function clearAllData() {
  if (confirm('Tem certeza que deseja excluir TODAS as suas mensagens? Esta ação não pode ser desfeita.')) {
    messageData.categories = {};
    saveData();
    updateCategorySelect();
    updateItemsList();
    alert('Todos os dados foram limpos!');
  }
}

// Initial rendering when the content script is injected
loadData(); // Load data initially
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderButton);
} else {
  renderButton();
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openEditor") {
    openEditor();
  }
});