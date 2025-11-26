document.addEventListener('DOMContentLoaded', loadDashboard);

function loadDashboard() {
  chrome.storage.local.get(null, (items) => {
    const container = document.getElementById('domains-list');
    container.innerHTML = '';
    
    // Group by domain
    const domains = {};
    
    for (const [key, value] of Object.entries(items)) {
      if (key.startsWith('highlights_')) {
        const hostname = key.replace('highlights_', '');
        if (value && value.length > 0) {
          domains[hostname] = value;
        }
      }
    }
    
    if (Object.keys(domains).length === 0) {
      container.innerHTML = '<div style="text-align:center; color:#888;">No highlights found yet. Go highlight something!</div>';
      return;
    }
    
    // Render
    for (const [hostname, highlights] of Object.entries(domains)) {
      const card = document.createElement('div');
      card.className = 'domain-card';
      
      const header = document.createElement('div');
      header.className = 'domain-header';
      header.innerHTML = `
        <div class="domain-info">
          <h3>${hostname}</h3>
          <span>${highlights.length} highlights</span>
        </div>
        <div class="domain-actions">
          <button class="delete-domain-btn">Delete All</button>
        </div>
      `;
      
      const list = document.createElement('div');
      list.className = 'highlights-container';
      
      highlights.forEach(h => {
        const item = document.createElement('div');
        item.className = 'highlight-item';
        item.innerHTML = `
          <div class="highlight-text">${h.text}</div>
          <div class="highlight-meta">
            <span>${h.date}</span>
            <a href="${h.url}" target="_blank">Visit Page</a>
          </div>
        `;
        list.appendChild(item);
      });
      
      // Toggle Expand
      header.querySelector('.domain-info').addEventListener('click', () => {
        list.classList.toggle('expanded');
      });
      
      // Delete All
      header.querySelector('.delete-domain-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete all highlights for ${hostname}?`)) {
          chrome.storage.local.remove('highlights_' + hostname, () => {
            loadDashboard(); // Reload
          });
        }
      });
      
      card.appendChild(header);
      card.appendChild(list);
      container.appendChild(card);
    }
  });
}
