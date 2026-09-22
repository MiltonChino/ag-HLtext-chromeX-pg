chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "highlight-text",
        title: "Highlight & Add Note",
        contexts: ["selection"]
    });
    chrome.contextMenus.create({
        id: "create-task",
        title: "Create Task from Selection",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab.id) return;
    if (info.menuItemId === "highlight-text") {
        chrome.tabs.sendMessage(tab.id, {
            action: "HIGHLIGHT_TEXT",
            selectionText: info.selectionText
        });
    } else if (info.menuItemId === "create-task") {
        chrome.tabs.sendMessage(tab.id, {
            action: "CREATE_TASK",
            selectionText: info.selectionText
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "OPEN_DASHBOARD") {
        chrome.tabs.create({ url: 'dashboard.html' });
    }
});

