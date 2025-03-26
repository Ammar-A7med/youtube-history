// Background service worker for YouTube Playback Manager

/**
 * Handle messages from content and popup scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'restoreLastPosition':
      handleRestorePosition(sender.tab);
      break;
    
    case 'exportVideoLog':
      handleVideoLogExport(request.data);
      break;
    
    default:
      console.warn('Unhandled message:', request.action);
  }
});

/**
 * Restore video position in active tab
 * @param {chrome.tabs.Tab} tab - Active tab
 */
function handleRestorePosition(tab) {
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: 'restoreLastPosition' });
  }
}

/**
 * Export video log to external storage or clipboard
 * @param {Object[]} videoData - Array of video tracking data
 */
function handleVideoLogExport(videoData) {
  if (!videoData || videoData.length === 0) {
    console.warn('No video data to export');
    return;
  }

  // Future: Add more advanced export methods
  const csvData = convertToCSV(videoData);
  
  // Example: Copy to clipboard
  navigator.clipboard.writeText(csvData)
    .then(() => console.log('Video log copied to clipboard'))
    .catch(err => console.error('Export failed:', err));
}

/**
 * Convert video data to CSV format
 * @param {Object[]} data - Video tracking data
 * @returns {string} CSV formatted string
 */
function convertToCSV(data) {
  const headers = [
    'Title', 'URL', 'Current Time', 
    'Total Duration', 'Timestamp', 'Completed'
  ];

  const csvRows = [headers.join(',')];

  data.forEach(video => {
    const row = [
      `"${video.title.replace(/"/g, '""')}"`,
      `"${video.url}"`,
      video.time.toFixed(2),
      video.duration.toFixed(2),
      new Date(video.timestamp).toISOString(),
      video.isComplete ? 'Yes' : 'No'
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}