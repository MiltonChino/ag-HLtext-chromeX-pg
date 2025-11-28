chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "highlight-text",
        title: "Highlight Selection",
        contexts: ["selection"]
    });
});

// Listen for PDF navigation
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId === 0 && details.url.toLowerCase().endsWith('.pdf')) {
        const viewerUrl = chrome.runtime.getURL('viewer.html') + '?file=' + encodeURIComponent(details.url);
        chrome.tabs.update(details.tabId, { url: viewerUrl });
    }
}, {
    url: [{ urlSuffix: '.pdf' }]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "highlight-text" && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
            action: "HIGHLIGHT_TEXT",
            selectionText: info.selectionText
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "OPEN_DASHBOARD") {
        chrome.tabs.create({ url: 'dashboard.html' });
    }
});
