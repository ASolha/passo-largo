document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');
  const openMLButton = document.getElementById('openML');
  const openEditorButton = document.getElementById('openEditor');

  // Verificar se estamos em uma página do Mercado Livre
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    if (currentTab.url.includes('mercadolivre.com') || currentTab.url.includes('mercadolibre.com')) {
      statusElement.classList.add('active');
      statusElement.querySelector('.status-text').textContent = '✅ Extensão ativa no Mercado Livre';
    } else {
      statusElement.classList.add('inactive');
      statusElement.querySelector('.status-text').textContent = '⚠️ Não está no Mercado Livre';
    }
  });

  // Abrir Mercado Livre
  openMLButton.addEventListener('click', function() {
    chrome.tabs.create({url: 'https://www.mercadolivre.com.br'});
  });

  // Abrir editor de mensagens
  openEditorButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "openEditor"});
    });
  });
});