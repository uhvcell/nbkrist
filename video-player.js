/**
 * Advanced Internet Archive Video Player
 * Modular video playback architecture for UHV CELL platform
 */
class UHVVideoPlayer {
  constructor(containerId, videoData) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!this.container) throw new Error(`Container not found`);
    
    this.videoData = videoData;
    this.isPlaying = false;
    this.isControlsActive = true;
    this.controlsTimeout = null;
    
    this.initUI();
    this.bindEvents();
    this.loadSource();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="uhv-video-wrapper" id="uhv_wrapper_${this.videoData.id}">
        <video class="uhv-video-element" id="uhv_video_${this.videoData.id}" poster="${this.videoData.thumbnail || ''}" playsinline preload="metadata" controlsList="nodownload"></video>
        
        <div class="uhv-big-play"><i class="fa-solid fa-play"></i></div>
        
        <div class="uhv-loading-overlay"><div class="uhv-spinner"></div></div>
        
        <div class="uhv-error-overlay">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <h3>Playback Error</h3>
          <p>Unable to play this video right now. Please try again later.</p>
        </div>
        
        <div class="uhv-video-controls">
          <div class="uhv-progress-container">
            <div class="uhv-progress-loaded"></div>
            <div class="uhv-progress-current"></div>
          </div>
          
          <div class="uhv-controls-row">
            <div class="uhv-controls-group">
              <button class="uhv-btn uhv-play-pause" aria-label="Play/Pause"><i class="fa-solid fa-play"></i></button>
              
              <div class="uhv-volume-container">
                <button class="uhv-btn uhv-mute-toggle" aria-label="Mute/Unmute"><i class="fa-solid fa-volume-high"></i></button>
                <div class="uhv-volume-slider">
                  <input type="range" class="uhv-volume-input" min="0" max="1" step="0.05" value="1" aria-label="Volume">
                </div>
              </div>
              
              <div class="uhv-time-display">
                <span class="uhv-current-time">0:00</span> / <span class="uhv-duration">0:00</span>
              </div>
            </div>
            
            <div class="uhv-controls-group">
              <button class="uhv-btn uhv-playback-rate" aria-label="Playback Speed">1x</button>
              <button class="uhv-btn uhv-fullscreen-toggle" aria-label="Fullscreen"><i class="fa-solid fa-expand"></i></button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Elements
    this.wrapper = this.container.querySelector('.uhv-video-wrapper');
    this.video = this.container.querySelector('.uhv-video-element');
    this.playPauseBtn = this.container.querySelector('.uhv-play-pause');
    this.bigPlayBtn = this.container.querySelector('.uhv-big-play');
    this.muteBtn = this.container.querySelector('.uhv-mute-toggle');
    this.volumeInput = this.container.querySelector('.uhv-volume-input');
    this.currentTimeEl = this.container.querySelector('.uhv-current-time');
    this.durationEl = this.container.querySelector('.uhv-duration');
    this.progressContainer = this.container.querySelector('.uhv-progress-container');
    this.progressCurrent = this.container.querySelector('.uhv-progress-current');
    this.progressLoaded = this.container.querySelector('.uhv-progress-loaded');
    this.fullscreenBtn = this.container.querySelector('.uhv-fullscreen-toggle');
    this.speedBtn = this.container.querySelector('.uhv-playback-rate');
    this.loadingOverlay = this.container.querySelector('.uhv-loading-overlay');
    this.errorOverlay = this.container.querySelector('.uhv-error-overlay');
  }

  loadSource() {
    // If it's a legacy URL that isn't resolved to sources
    if ((!this.videoData.sources || this.videoData.sources.length === 0) && this.videoData.videoUrl) {
      if (this.videoData.videoUrl.endsWith('.mp4')) {
        this.video.src = this.videoData.videoUrl;
      } else {
        // Fallback to iframe for unresolved archive or external links
        this.wrapper.innerHTML = `<iframe src="${this.videoData.videoUrl}" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay; fullscreen" sandbox="allow-same-origin allow-scripts allow-popups"></iframe>`;
        return;
      }
    } else if (this.videoData.sources && this.videoData.sources.length > 0) {
      // Pick best source (we can expand this for adaptive bitrates later)
      this.video.src = this.videoData.sources[0].src;
    } else {
      this.showError();
    }
  }

  bindEvents() {
    if (!this.video) return;

    // Security & Deterrence
    this.video.addEventListener('contextmenu', e => e.preventDefault());
    
    // Playback events
    this.playPauseBtn.addEventListener('click', () => this.togglePlay());
    this.bigPlayBtn.addEventListener('click', () => this.togglePlay());
    this.video.addEventListener('click', () => this.togglePlay());
    
    this.video.addEventListener('play', () => {
      this.isPlaying = true;
      this.playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      this.bigPlayBtn.style.display = 'none';
      this.startIdleTimer();
    });
    
    this.video.addEventListener('pause', () => {
      this.isPlaying = false;
      this.playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      this.bigPlayBtn.style.display = 'flex';
      this.wrapper.classList.remove('idle');
    });

    // Time & Progress
    this.video.addEventListener('timeupdate', () => this.updateProgress());
    this.video.addEventListener('loadedmetadata', () => {
      this.durationEl.textContent = this.formatTime(this.video.duration);
    });
    this.video.addEventListener('progress', () => this.updateBuffer());

    // Seeking
    this.progressContainer.addEventListener('click', (e) => this.seek(e));
    let isDragging = false;
    this.progressContainer.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mouseup', () => isDragging = false);
    this.progressContainer.addEventListener('mousemove', (e) => {
      if (isDragging) this.seek(e);
    });

    // Volume & Mute
    this.muteBtn.addEventListener('click', () => this.toggleMute());
    this.volumeInput.addEventListener('input', (e) => {
      this.video.volume = e.target.value;
      this.video.muted = e.target.value === '0';
      this.updateVolumeIcon();
    });

    // Fullscreen
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this.updateFullscreenIcon());

    // Playback Rate
    const speeds = [1, 1.25, 1.5, 2, 0.5];
    let speedIdx = 0;
    this.speedBtn.addEventListener('click', () => {
      speedIdx = (speedIdx + 1) % speeds.length;
      this.video.playbackRate = speeds[speedIdx];
      this.speedBtn.textContent = speeds[speedIdx] + 'x';
    });

    // Loading & Errors
    this.video.addEventListener('waiting', () => this.loadingOverlay.classList.add('active'));
    this.video.addEventListener('playing', () => this.loadingOverlay.classList.remove('active'));
    this.video.addEventListener('canplay', () => this.loadingOverlay.classList.remove('active'));
    this.video.addEventListener('error', () => this.showError());

    // Idle mouse tracking for controls
    this.wrapper.addEventListener('mousemove', () => this.startIdleTimer());
    this.wrapper.addEventListener('mouseleave', () => {
      if (this.isPlaying) this.wrapper.classList.add('idle');
    });
  }

  togglePlay() {
    if (this.video.paused) this.video.play().catch(e => console.warn('Play error:', e));
    else this.video.pause();
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
    if (!this.video.muted && this.video.volume === 0) {
      this.video.volume = 1;
      this.volumeInput.value = 1;
    }
    this.updateVolumeIcon();
  }

  updateVolumeIcon() {
    if (this.video.muted || this.video.volume === 0) {
      this.muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      this.volumeInput.value = 0;
    } else if (this.video.volume < 0.5) {
      this.muteBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
    } else {
      this.muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
  }

  seek(e) {
    const rect = this.progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    this.video.currentTime = pos * this.video.duration;
  }

  updateProgress() {
    if (!this.video.duration) return;
    const percent = (this.video.currentTime / this.video.duration) * 100;
    this.progressCurrent.style.width = percent + '%';
    this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);
  }

  updateBuffer() {
    if (this.video.buffered.length > 0) {
      const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
      const duration = this.video.duration;
      if (duration > 0) {
        this.progressLoaded.style.width = ((bufferedEnd / duration) * 100) + '%';
      }
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.wrapper.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen();
    }
  }

  updateFullscreenIcon() {
    if (document.fullscreenElement) {
      this.fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
    } else {
      this.fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
    }
  }

  startIdleTimer() {
    this.wrapper.classList.remove('idle');
    clearTimeout(this.controlsTimeout);
    if (this.isPlaying) {
      this.controlsTimeout = setTimeout(() => {
        if (this.isPlaying) this.wrapper.classList.add('idle');
      }, 3000);
    }
  }

  showError() {
    this.loadingOverlay.classList.remove('active');
    this.errorOverlay.classList.add('active');
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
}

window.UHVVideoPlayer = UHVVideoPlayer;
