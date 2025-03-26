document.addEventListener('DOMContentLoaded', () => {
  const shortcutButton = document.getElementById('openShortcuts');
  
  if (shortcutButton) {
    shortcutButton.addEventListener('click', () => {
      // Open Chrome extensions keyboard shortcuts page
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    });
  }
});