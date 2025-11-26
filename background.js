chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "highlight-text",
        title: "Highlight Selection",
        contexts: ["selection"]
    });
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
