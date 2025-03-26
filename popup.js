document.addEventListener('DOMContentLoaded', () => {
  const UI = {
    videoList: document.getElementById('videoList'),
    tabs: document.querySelectorAll('.tab'),
    exportButton: document.getElementById('exportLog')
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const padZero = (num) => num.toString().padStart(2, '0');
    
    return hours > 0 
      ? `${hours}:${padZero(minutes)}:${padZero(secs)}` 
      : `${padZero(minutes)}:${padZero(secs)}`;
  };

  const createDeleteSVG = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    
    const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path1.setAttribute("d", "M3 6h18");
    
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path2.setAttribute("d", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2");
    
    svg.appendChild(path1);
    svg.appendChild(path2);
    
    return svg;
  };

  const setupTabs = () => {
    UI.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        UI.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderVideos(tab.dataset.tab);
      });
    });
  };

  const renderVideos = (status = 'playing') => {
    chrome.storage.local.get('allVideos', (result) => {
      const videos = result.allVideos || [];
      
      const filteredVideos = filterVideosByStatus(videos, status);

      if (filteredVideos.length === 0) {
        UI.videoList.innerHTML = `
          <div style="text-align: center; color: #6c757d; padding: 20px;">
            No videos in this category
          </div>
        `;
        return;
      }

      UI.videoList.innerHTML = createVideoListHTML(filteredVideos, status);
      attachDeleteHandlers(filteredVideos, status);
    });
  };

  const createVideoListHTML = (videos, status) => {
    return videos.map((video) => {
      const statusInfo = getVideoStatus(video, status);
      
      return `
        <div class="video-item">
          <div>
            <a href="${video.url}" target="_blank" style="color: #333; text-decoration: none;">
              ${video.title}
            </a>
            <div style="color: #6c757d; font-size: 0.9em;">
              ${formatTime(video.time)} / ${formatTime(video.duration)}
            </div>
          </div>
          <button class="delete-btn" data-url="${video.url}">
            <!-- Delete SVG will be inserted here by JS -->
          </button>
        </div>
      `;
    }).join('');
  };

  const attachDeleteHandlers = (videos, status) => {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
      const svg = createDeleteSVG();
      button.appendChild(svg);
      
      button.addEventListener('click', () => {
        const videoUrl = button.dataset.url;
        deleteVideo(videoUrl, status);
      });
    });
  };

  const deleteVideo = (url, currentStatus) => {
    chrome.storage.local.get('allVideos', (result) => {
      const videos = result.allVideos || [];
      const updatedVideos = videos.filter(v => v.url !== url);

      chrome.storage.local.set({ allVideos: updatedVideos }, () => {
        renderVideos(currentStatus);
      });
    });
  };

  const filterVideosByStatus = (videos, status) => {
    const statusFilters = {
      'playing': v => v.isPlaying,
      'incomplete': v => !v.isComplete,
      'complete': v => v.isComplete
    };

    return videos
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter(statusFilters[status] || (() => true));
  };

  const getVideoStatus = (video, status) => {
    if (status === 'playing') {
      return {
        class: 'status-playing',
        text: 'Playing 🔴'
      };
    }
    
    return video.isComplete 
      ? { class: 'status-complete', text: 'Complete ✅' }
      : { class: 'status-incomplete', text: 'Incomplete ⏳' };
  };

  const exportVideoLog = () => {
    chrome.storage.local.get('allVideos', (result) => {
      const videos = result.allVideos || [];
      
      if (videos.length === 0) {
        alert('No videos to export');
        return;
      }

      const csvContent = convertToCSV(videos);
      downloadCSV(csvContent);
    });
  };

  const convertToCSV = (data) => {
    const headers = [
      'Title', 'URL', 'Current Time', 
      'Total Duration', 'Watch Date', 'Completed'
    ];

    const csvRows = [headers.join(',')];

    data.forEach(video => {
      const row = [
        `"${video.title.replace(/"/g, '""')}"`,
        `"${video.url}"`,
        video.time.toFixed(2),
        video.duration.toFixed(2),
        new Date(video.timestamp).toLocaleString(),
        video.isComplete ? 'Yes' : 'No'
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  const downloadCSV = (csvContent) => {
    const blob = new Blob(['\uFEFF' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'youtube_videos_log.csv';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  setupTabs();
  renderVideos();
  UI.exportButton.addEventListener('click', exportVideoLog);
});