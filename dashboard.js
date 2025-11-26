document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  document.getElementById('export-btn').addEventListener('click', exportHighlights);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importHighlights);
});

function importHighlights(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);

      // We need to merge this with existing data
      chrome.storage.local.get(null, (currentItems) => {
        const newData = {};

        for (const [hostname, highlights] of Object.entries(importedData)) {
          const key = 'highlights_' + hostname;
          const existingHighlights = currentItems[key] || [];

          // Merge and Deduplicate (by ID)
          const merged = [...existingHighlights];
          const existingIds = new Set(existingHighlights.map(h => h.id));

          highlights.forEach(h => {
            if (!existingIds.has(h.id)) {
              merged.push(h);
              existingIds.add(h.id);
            }
          });

          // Sort by date (newest first) - assuming ID is timestamp-based or we parse date
          // Simple sort by ID (descending) as proxy for time
          merged.sort((a, b) => b.id - a.id);

          newData[key] = merged;
        }

        chrome.storage.local.set(newData, () => {
          alert('Import successful!');
          loadDashboard();
        });
      });
    } catch (err) {
      alert('Error importing file: ' + err.message);
    }
  };
  reader.readAsText(file);
  // Reset input
  event.target.value = '';
}

function exportHighlights() {
  chrome.storage.local.get(null, (items) => {
    const exportData = {};
    for (const [key, value] of Object.entries(items)) {
      if (key.startsWith('highlights_')) {
        const hostname = key.replace('highlights_', '');
        exportData[hostname] = value;
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'highlights_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

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
