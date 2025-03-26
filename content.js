// YouTube Playback Manager: Content Script
console.log('YouTube Playback Manager: Content Script Loaded');

// More robust video element selectors
const VIDEO_SELECTORS = [
  'video', 
  'video.html5-main-video', 
  '#movie_player video', 
  'ytd-player video',
  'div.html5-video-player video'
];

/**
 * Find the video element on the page
 * @returns {HTMLVideoElement|null} Video element or null
 */
function findVideo() {
  return VIDEO_SELECTORS.reduce((found, selector) => 
    found || document.querySelector(selector), 
    null
  );
}

/**
 * Save video progress to local storage
 * @param {boolean} [forceImmediate=false] Force immediate save
 */
function saveVideoProgress(forceImmediate = false) {
  const video = findVideo();
  if (!video) return;

  const videoData = {
    url: window.location.href,
    title: document.title || 'Untitled Video',
    time: video.currentTime,
    duration: video.duration || 0,
    timestamp: Date.now(),
    isPlaying: document.visibilityState === 'visible',
    isComplete: video.duration ? (video.duration - video.currentTime) < 10 : false
  };

  try {
    chrome.storage.local.get(['allVideos'], (result) => {
      const videos = result.allVideos || [];
      const existingIndex = videos.findIndex(v => v.url === videoData.url);
      
      if (existingIndex !== -1) {
        videos[existingIndex] = videoData;
      } else {
        videos.push(videoData);
      }

      // Limit stored videos to prevent excessive storage
      const maxVideos = 50;
      const trimmedVideos = videos.slice(-maxVideos);

      chrome.storage.local.set({ 
        lastVideo: videoData,
        allVideos: trimmedVideos 
      });
    });
  } catch (error) {
    console.error('Error saving video progress:', error);
  }
}

/**
 * Setup video tracking with debounce
 */
function setupVideoTracking() {
  const video = findVideo();
  if (!video) {
    setTimeout(setupVideoTracking, 1000);
    return;
  }

  let saveTimer;
  const SAVE_INTERVAL = 500; // 0.5 seconds

  video.addEventListener('timeupdate', () => {
    // Clear previous timer to debounce
    clearTimeout(saveTimer);
    
    // Set new timer
    saveTimer = setTimeout(() => {
      saveVideoProgress();
    }, SAVE_INTERVAL);
  });

  // Additional event listeners for more comprehensive tracking
  video.addEventListener('pause', () => saveVideoProgress(true));
  video.addEventListener('ended', () => saveVideoProgress(true));
}

/**
 * Restore the last known video position
 */
function restoreLastPosition() {
  chrome.storage.local.get(['lastVideo'], (result) => {
    const lastVideo = result.lastVideo;
    if (lastVideo && lastVideo.url === window.location.href) {
      const video = findVideo();
      if (video) {
        try {
          // Safely set current time within video duration
          const safeTime = Math.min(
            Math.max(0, lastVideo.time), 
            video.duration || Infinity
          );
          video.currentTime = safeTime;
        } catch (error) {
          console.error('Error restoring video position:', error);
        }
      }
    }
  });
}

// Handle Ctrl+Z shortcut for position restoration
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'z') {
    restoreLastPosition();
    saveVideoProgress(true);
  }
});

// Start video tracking
setupVideoTracking();