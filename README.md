# Text Highlighter & Sidebar Chrome Extension

A lightweight, powerful Chrome extension (Manifest V3) that allows users to highlight text on any webpage, save it locally, and manage all highlights through a centralized dashboard. It even supports highlighting text in PDFs and offers a fallback bookmarklet for mobile devices.

## Current Features

- **Highlight Text on Webpages**: Easily highlight important text on any webpage. The text turns a noticeable yellow/gold and is saved for future reference.
- **Context Menu Integration**: Right-click any selected text and choose "Highlight Selection" to quickly save it.
- **Keyboard Shortcut**: Press `Ctrl + .` to quickly highlight the currently selected text without using the mouse.
- **Floating Sidebar (Shadow DOM Isolated)**: A sleek, non-intrusive right-side panel that displays all your saved highlights for the current page. The UI is isolated using a Shadow DOM to ensure it doesn't conflict with the webpage's styling.
- **Local Storage Persistence**: Highlights are saved persistently using `chrome.storage.local` and are organized by domain name. The sidebar's open/closed state is also remembered.
- **Highlights Dashboard**: A dedicated dashboard page (`dashboard.html`) to manage, export, and import all your saved highlights across different websites.
- **Export and Import Data**: Backup your highlights by exporting them to a JSON file. Import them back to sync data across different devices or browsers.
- **Built-in PDF Support**: The extension intercepts PDF navigation and opens a custom PDF viewer (powered by `pdf.js`), enabling you to highlight text directly on PDF files.
- **Mobile/Universal Bookmarklet**: Includes a Javascript bookmarklet (`notes.txt`) that allows you to use the core highlighting and sidebar features on mobile browsers (iOS Safari, Chrome for Android) or environments where extensions cannot be installed.

## Project Structure

- `manifest.json`: The Manifest V3 configuration file.
- `background.js`: The service worker that handles context menu creation, PDF navigation interception, and message passing.
- `content.js`: Injects the sidebar UI using Shadow DOM and handles text highlighting logic on standard webpages.
- `dashboard.html` / `dashboard.js` / `dashboard.css`: The management dashboard for viewing, exporting, and importing cross-domain highlights.
- `viewer.html` / `viewer.js` / `pdf_content.js`: The custom PDF viewer utilizing PDF.js to support text highlighting within PDFs.
- `lib/pdfjs/`: Contains the PDF.js library files.
- `notes.txt`: Contains instructions and the code for the universal bookmarklet installation.

## How to Test the Project

To test the extension locally as a developer, follow these steps:

1. **Open Extensions Page**: Launch Google Chrome (or a Chromium-based browser like Edge or Brave) and navigate to `chrome://extensions/` in your address bar.
2. **Enable Developer Mode**: Toggle the "Developer mode" switch located in the top right corner of the page.
3. **Load Unpacked Extension**: Click the "Load unpacked" button that appears in the top left area.
4. **Select Directory**: Browse to and select the project directory (`c:\test\ag-HLtext-chromeX-pg`). The "Text Highlighter & Sidebar" extension should now appear in your list.
5. **Start Highlighting**:
   - Navigate to any standard webpage (e.g., an article or blog post).
   - Select some text.
   - Right-click and choose **"Highlight Selection"**, or press **`Ctrl + .`**.
   - The sidebar will slide out showing your saved highlight, and the text will be highlighted on the page.
6. **Test the Dashboard**: Click the "Manage Highlights" button at the bottom of the sidebar to open the dashboard. Try exporting your data to JSON and importing it back.
7. **Test PDF Support**: Open a PDF file in your browser. The extension should intercept the navigation and load it in the custom PDF viewer, where you can select and highlight text.
8. **Test Bookmarklet**: Check `notes.txt` to copy the bookmarklet code and test it on a clean browser profile or mobile simulator to verify the fallback functionality.

## Permissions

- `contextMenus`: To add the "Highlight Selection" option to the right-click menu.
- `storage`: To save the highlights and sidebar state locally.
- `activeTab` / `scripting`: To interact with the current webpage's DOM for highlighting and injecting the sidebar.
- `webNavigation` / `tabs`: To intercept PDF navigation and redirect to the custom PDF viewer.
