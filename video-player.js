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
    this.retryCount = 0;
    
    this.initUI();
    this.bindEvents();
    this.loadSource();
    this.setupIntersectionObserver();
    this.setupMediaSession();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="uhv-video-wrapper" id="uhv_wrapper_${this.videoData.id || 'default'}" tabindex="0">
        <video class="uhv-video-element" id="uhv_video_${this.videoData.id || 'default'}" poster="${this.videoData.thumbnail || ''}" playsinline preload="metadata" controlsList="nodownload"></video>
        
        <div class="uhv-big-play"><i class="fa-solid fa-play"></i></div>
        
        <div class="uhv-loading-overlay"><div class="uhv-spinner"></div></div>
        
        <div class="uhv-error-overlay">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <h3>Playback Error</h3>
          <p class="error-msg">Unable to play this video right now. Please try again later.</p>
          <button class="uhv-btn-retry" style="margin-top: 15px; padding: 8px 16px; background: var(--primary, #00f3ff); border: none; border-radius: 4px; color: #000; cursor: pointer; font-weight: bold;">Retry</button>
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
              <button class="uhv-btn uhv-pip-toggle" aria-label="Picture in Picture" title="Picture in Picture"><i class="fa-solid fa-window-restore"></i></button>
              <button class="uhv-btn uhv-fullscreen-toggle" aria-label="Fullscreen" title="Fullscreen"><i class="fa-solid fa-expand"></i></button>
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
    this.pipBtn = this.container.querySelector('.uhv-pip-toggle');
    this.speedBtn = this.container.querySelector('.uhv-playback-rate');
    this.loadingOverlay = this.container.querySelector('.uhv-loading-overlay');
    this.errorOverlay = this.container.querySelector('.uhv-error-overlay');
    this.retryBtn = this.container.querySelector('.uhv-btn-retry');

    // Hide PiP button if not supported
    if (!document.pictureInPictureEnabled) {
      this.pipBtn.style.display = 'none';
    }
  }

  loadSource() {
    this.retryCount = 0;
    this.errorOverlay.classList.remove('active');
    
    // Always use the native player instead of falling back to iframe for MP4s/Sources.
    if (this.videoData.sources && this.videoData.sources.length > 0) {
      this.video.src = this.videoData.sources[0].src;
    } else if (this.videoData.videoUrl) {
      this.video.src = this.videoData.videoUrl;
    } else {
      this.showError("No video source provided.");
    }
    
    this.video.load();
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
      this.updateMediaSessionState();
    });
    
    this.video.addEventListener('pause', () => {
      this.isPlaying = false;
      this.playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      this.bigPlayBtn.style.display = 'flex';
      this.wrapper.classList.remove('idle');
      this.updateMediaSessionState();
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

    // Picture in Picture
    this.pipBtn.addEventListener('click', () => this.togglePip());

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
    
    this.video.addEventListener('error', (e) => {
      console.error("Video Error:", this.video.error);
      this.handleError();
    });

    this.retryBtn.addEventListener('click', () => {
      this.loadSource();
      this.video.play().catch(e => console.warn('Retry play error:', e));
    });

    // Idle mouse tracking for controls
    this.wrapper.addEventListener('mousemove', () => this.startIdleTimer());
    this.wrapper.addEventListener('mouseleave', () => {
      if (this.isPlaying) this.wrapper.classList.add('idle');
    });

    // Keyboard Accessibility
    this.wrapper.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  handleError() {
    this.loadingOverlay.classList.remove('active');
    if (this.retryCount < 2 && this.videoData.videoUrl) {
      // Auto-retry a couple of times for network hiccups
      this.retryCount++;
      console.log(`Retrying video load... Attempt ${this.retryCount}`);
      setTimeout(() => {
        const currentTime = this.video.currentTime;
        this.video.load();
        this.video.currentTime = currentTime;
        this.video.play().catch(e => console.warn('Auto-retry play error:', e));
      }, 1500);
    } else {
      this.showError();
    }
  }

  handleKeyboard(e) {
    const tagName = document.activeElement.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') return;

    switch(e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'f':
        e.preventDefault();
        this.toggleFullscreen();
        break;
      case 'm':
        e.preventDefault();
        this.toggleMute();
        break;
      case 'arrowright':
        e.preventDefault();
        this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 10);
        break;
      case 'arrowleft':
        e.preventDefault();
        this.video.currentTime = Math.max(0, this.video.currentTime - 10);
        break;
      case 'arrowup':
        e.preventDefault();
        this.video.volume = Math.min(1, this.video.volume + 0.1);
        this.volumeInput.value = this.video.volume;
        this.updateVolumeIcon();
        break;
      case 'arrowdown':
        e.preventDefault();
        this.video.volume = Math.max(0, this.video.volume - 0.1);
        this.volumeInput.value = this.video.volume;
        this.updateVolumeIcon();
        break;
    }
  }

  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && this.isPlaying && !document.pictureInPictureElement) {
          this.video.pause();
        }
      });
    }, { threshold: 0.1 });
    
    this.observer.observe(this.wrapper);
  }

  setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.videoData.title || 'UHV CELL Video',
        artist: 'UHV CELL NBKRIST',
        artwork: this.videoData.thumbnail ? [
          { src: this.videoData.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      });

      navigator.mediaSession.setActionHandler('play', () => this.video.play());
      navigator.mediaSession.setActionHandler('pause', () => this.video.pause());
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        this.video.currentTime = Math.max(0, this.video.currentTime - (details.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + (details.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in this.video) {
          this.video.fastSeek(details.seekTime);
        } else {
          this.video.currentTime = details.seekTime;
        }
      });
    }
  }

  updateMediaSessionState() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    }
  }

  togglePlay() {
    if (this.video.paused) {
      this.video.play().catch(e => {
        console.warn('Play error:', e);
        // Sometimes play is prevented by browser policies. We just log it.
      });
    } else {
      this.video.pause();
    }
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
      if (this.wrapper.requestFullscreen) {
        this.wrapper.requestFullscreen().catch(err => console.warn(err));
      } else if (this.video.webkitEnterFullscreen) {
        this.video.webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
  
  async togglePip() {
    if (!document.pictureInPictureEnabled) return;
    try {
      if (this.video !== document.pictureInPictureElement) {
        await this.video.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (error) {
      console.error('PiP failed', error);
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

  showError(msg) {
    this.loadingOverlay.classList.remove('active');
    this.errorOverlay.classList.add('active');
    if (msg) {
      const msgEl = this.errorOverlay.querySelector('.error-msg');
      if (msgEl) msgEl.textContent = msg;
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    clearTimeout(this.controlsTimeout);
  }
}

window.UHVVideoPlayer = UHVVideoPlayer;
