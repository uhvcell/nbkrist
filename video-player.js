/**
 * Highly Advanced Internet Archive Video Player
 * Premium, colourful, and robust HTML5 video player for UHV CELL platform
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
      <div class="uhv-video-wrapper advanced-glass-player" id="uhv_wrapper_${this.videoData.id || 'default'}" tabindex="0">
        <!-- Native video element with strict security attributes to hide footprints and downloads -->
        <video class="uhv-video-element" id="uhv_video_${this.videoData.id || 'default'}" poster="${this.videoData.thumbnail || ''}" playsinline preload="metadata" controlsList="nodownload nofullscreen noremoteplayback" oncontextmenu="return false;"></video>
        
        <div class="uhv-big-play pulse-animation"><i class="fa-solid fa-play"></i></div>
        
        <div class="uhv-loading-overlay"><div class="uhv-spinner"></div></div>
        
        <div class="uhv-error-overlay">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <h3>Playback Error</h3>
          <p class="error-msg">Unable to load the video smoothly. Retrying...</p>
          <button class="uhv-btn-retry">Retry Connection</button>
        </div>
        
        <div class="uhv-video-controls glass-controls">
          <div class="uhv-progress-container">
            <div class="uhv-progress-hover-time">0:00</div>
            <div class="uhv-progress-loaded"></div>
            <div class="uhv-progress-current">
              <div class="uhv-progress-scrubber"></div>
            </div>
          </div>
          
          <div class="uhv-controls-row">
            <div class="uhv-controls-group">
              <button class="uhv-btn uhv-play-pause btn-hover-effect" aria-label="Play/Pause"><i class="fa-solid fa-play"></i></button>
              
              <div class="uhv-volume-container">
                <button class="uhv-btn uhv-mute-toggle btn-hover-effect" aria-label="Mute/Unmute"><i class="fa-solid fa-volume-high"></i></button>
                <div class="uhv-volume-slider">
                  <input type="range" class="uhv-volume-input" min="0" max="1" step="0.05" value="1" aria-label="Volume">
                  <div class="uhv-volume-progress"></div>
                </div>
              </div>
              
              <div class="uhv-time-display">
                <span class="uhv-current-time">0:00</span> <span class="time-separator">/</span> <span class="uhv-duration">0:00</span>
              </div>
            </div>
            
            <div class="uhv-controls-group">
              <button class="uhv-btn uhv-playback-rate btn-hover-effect" aria-label="Playback Speed">1x</button>
              <button class="uhv-btn uhv-cast-toggle btn-hover-effect" aria-label="Cast to TV" title="Cast to TV" style="display:none;"><i class="fa-solid fa-tv"></i></button>
              <button class="uhv-btn uhv-pip-toggle btn-hover-effect" aria-label="Picture in Picture" title="Picture in Picture"><i class="fa-solid fa-window-restore"></i></button>
              <button class="uhv-btn uhv-fullscreen-toggle btn-hover-effect" aria-label="Fullscreen" title="Fullscreen"><i class="fa-solid fa-expand"></i></button>
            </div>
          </div>
        </div>
        
        <div class="double-tap-indicator double-tap-left"><i class="fa-solid fa-backward-fast"></i> 10s</div>
        <div class="double-tap-indicator double-tap-right"><i class="fa-solid fa-forward-fast"></i> 10s</div>
      </div>
    `;

    // Map DOM elements
    this.wrapper = this.container.querySelector('.uhv-video-wrapper');
    this.video = this.container.querySelector('.uhv-video-element');
    this.playPauseBtn = this.container.querySelector('.uhv-play-pause');
    this.bigPlayBtn = this.container.querySelector('.uhv-big-play');
    this.muteBtn = this.container.querySelector('.uhv-mute-toggle');
    this.volumeInput = this.container.querySelector('.uhv-volume-input');
    this.volumeProgress = this.container.querySelector('.uhv-volume-progress');
    this.currentTimeEl = this.container.querySelector('.uhv-current-time');
    this.durationEl = this.container.querySelector('.uhv-duration');
    this.progressContainer = this.container.querySelector('.uhv-progress-container');
    this.progressCurrent = this.container.querySelector('.uhv-progress-current');
    this.progressLoaded = this.container.querySelector('.uhv-progress-loaded');
    this.progressHoverTime = this.container.querySelector('.uhv-progress-hover-time');
    this.fullscreenBtn = this.container.querySelector('.uhv-fullscreen-toggle');
    this.pipBtn = this.container.querySelector('.uhv-pip-toggle');
    this.speedBtn = this.container.querySelector('.uhv-playback-rate');
    this.loadingOverlay = this.container.querySelector('.uhv-loading-overlay');
    this.errorOverlay = this.container.querySelector('.uhv-error-overlay');
    this.retryBtn = this.container.querySelector('.uhv-btn-retry');

    // Double tap elements
    this.dtLeft = this.container.querySelector('.double-tap-left');
    this.dtRight = this.container.querySelector('.double-tap-right');

    if (!document.pictureInPictureEnabled) {
      this.pipBtn.style.display = 'none';
    }

    // Set initial volume progress
    this.updateVolumeUI();
  }

  async loadSource() {
    this.retryCount = 0;
    this.errorOverlay.classList.remove('active');
    
    let sourceUrl = '';
    // Always prioritize the native MP4
    if (this.videoData.sources && this.videoData.sources.length > 0) {
      sourceUrl = this.videoData.sources[0].src;
    } else if (this.videoData.videoUrl) {
      sourceUrl = this.videoData.videoUrl;
    } else {
      this.showError("No valid video source provided.");
      return;
    }

    // Advanced resolver for Internet Archive links to bypass redirects
    if (sourceUrl.includes('archive.org/download/')) {
      try {
        const urlParts = sourceUrl.split('/download/')[1].split('/');
        const id = urlParts[0];
        const filename = urlParts.slice(1).join('/');
        
        // Fetch metadata to find the direct server
        const response = await fetch(`https://archive.org/metadata/${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.server && data.dir) {
            // Construct direct node URL, avoiding the main archive.org redirect
            sourceUrl = `https://${data.server}${data.dir}/${filename}`;
            console.log("Resolved direct Internet Archive URL:", sourceUrl);
          }
        }
      } catch (err) {
        console.warn("Failed to resolve direct URL, falling back to original:", err);
      }
    }
    
    this.video.src = sourceUrl;
    // Fast start
    this.video.load();
  }

  bindEvents() {
    if (!this.video) return;

    // Strict Security
    this.video.addEventListener('contextmenu', e => e.preventDefault());
    
    // Basic Playback
    this.playPauseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.togglePlay(); });
    this.bigPlayBtn.addEventListener('click', (e) => { e.stopPropagation(); this.togglePlay(); });
    
    // Video Click & Double Tap Logic
    let lastTap = 0;
    this.video.addEventListener('click', (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 300 && tapLength > 0) {
        // Double tap
        const rect = this.video.getBoundingClientRect();
        const xPos = e.clientX - rect.left;
        if (xPos > rect.width / 2) {
          this.seekOffset(10);
          this.showDoubleTapIndicator(this.dtRight);
        } else {
          this.seekOffset(-10);
          this.showDoubleTapIndicator(this.dtLeft);
        }
      } else {
        // Single tap
        this.togglePlay();
      }
      lastTap = currentTime;
    });
    
    this.video.addEventListener('play', () => {
      this.isPlaying = true;
      this.playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      this.bigPlayBtn.classList.add('hidden');
      this.wrapper.classList.remove('is-paused');
      this.startIdleTimer();
      this.updateMediaSessionState();
    });
    
    this.video.addEventListener('pause', () => {
      this.isPlaying = false;
      this.playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      this.bigPlayBtn.classList.remove('hidden');
      this.wrapper.classList.add('is-paused');
      this.wrapper.classList.remove('idle');
      this.updateMediaSessionState();
    });

    // Time & Progress
    this.video.addEventListener('timeupdate', () => this.updateProgress());
    this.video.addEventListener('loadedmetadata', () => {
      this.durationEl.textContent = this.formatTime(this.video.duration);
    });
    this.video.addEventListener('progress', () => this.updateBuffer());

    // Seeking interactions
    let isDragging = false;
    
    const updateSeekFromEvent = (e) => {
      const rect = this.progressContainer.getBoundingClientRect();
      let pos = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      pos = Math.max(0, Math.min(pos, rect.width)) / rect.width;
      this.video.currentTime = pos * this.video.duration;
    };

    this.progressContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      updateSeekFromEvent(e);
    });
    
    this.progressContainer.addEventListener('touchstart', (e) => {
      isDragging = true;
      updateSeekFromEvent(e);
    }, {passive: true});

    document.addEventListener('mouseup', () => { isDragging = false; });
    document.addEventListener('touchend', () => { isDragging = false; });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) updateSeekFromEvent(e);
    });
    
    document.addEventListener('touchmove', (e) => {
      if (isDragging) updateSeekFromEvent(e);
    }, {passive: true});

    // Hover time
    this.progressContainer.addEventListener('mousemove', (e) => {
      const rect = this.progressContainer.getBoundingClientRect();
      let pos = (e.clientX - rect.left) / rect.width;
      pos = Math.max(0, Math.min(pos, 1));
      const time = pos * this.video.duration;
      this.progressHoverTime.textContent = this.formatTime(time);
      this.progressHoverTime.style.left = `${pos * 100}%`;
      this.progressHoverTime.style.opacity = '1';
    });
    
    this.progressContainer.addEventListener('mouseleave', () => {
      this.progressHoverTime.style.opacity = '0';
    });

    // Volume & Mute
    this.muteBtn.addEventListener('click', () => this.toggleMute());
    this.volumeInput.addEventListener('input', (e) => {
      this.video.volume = e.target.value;
      this.video.muted = e.target.value === '0';
      this.updateVolumeUI();
    });

    // Fullscreen
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this.updateFullscreenIcon());

    // PiP
    this.pipBtn.addEventListener('click', () => this.togglePip());

    // Cast / AirPlay
    this.castBtn = this.container.querySelector('.uhv-cast-toggle');
    const supportsRemote = !!(this.video.remote && this.video.remote.state);
    const supportsAirPlay = window.WebKitPlaybackTargetAvailabilityEvent;

    if (supportsRemote || supportsAirPlay) {
      this.castBtn.style.display = 'flex';
      
      this.castBtn.addEventListener('click', () => {
        if (supportsRemote) {
          this.video.remote.prompt().catch(e => console.warn('Cast prompt failed:', e));
        } else if (this.video.webkitShowPlaybackTargetPicker) {
          this.video.webkitShowPlaybackTargetPicker();
        }
      });

      if (supportsRemote) {
        this.video.remote.addEventListener('connect', () => this.castBtn.style.color = 'var(--player-primary)');
        this.video.remote.addEventListener('disconnect', () => this.castBtn.style.color = '');
      }
      if (supportsAirPlay) {
        this.video.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', () => {
          this.castBtn.style.color = this.video.webkitCurrentPlaybackTargetIsWireless ? 'var(--player-primary)' : '';
        });
      }
    }

    // Speed
    const speeds = [1, 1.25, 1.5, 2, 0.5];
    let speedIdx = 0;
    this.speedBtn.addEventListener('click', () => {
      speedIdx = (speedIdx + 1) % speeds.length;
      this.video.playbackRate = speeds[speedIdx];
      this.speedBtn.textContent = speeds[speedIdx] + 'x';
    });

    // Buffering and Errors
    this.video.addEventListener('waiting', () => this.loadingOverlay.classList.add('active'));
    this.video.addEventListener('playing', () => this.loadingOverlay.classList.remove('active'));
    this.video.addEventListener('canplay', () => this.loadingOverlay.classList.remove('active'));
    
    this.video.addEventListener('error', (e) => {
      console.error("Video Error:", this.video.error);
      this.handleError();
    });

    this.retryBtn.addEventListener('click', async () => {
      await this.loadSource();
      this.video.play().catch(e => console.warn('Retry play error:', e));
    });

    // Idle
    this.wrapper.addEventListener('mousemove', () => this.startIdleTimer());
    this.wrapper.addEventListener('mouseleave', () => {
      if (this.isPlaying) this.wrapper.classList.add('idle');
    });

    // Keys
    this.wrapper.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  showDoubleTapIndicator(el) {
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 500);
  }

  seekOffset(seconds) {
    if (!this.video.duration) return;
    this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + seconds));
  }

  handleError() {
    this.loadingOverlay.classList.remove('active');
    if (this.retryCount < 3 && this.videoData.videoUrl) {
      this.retryCount++;
      console.log(`Retrying video... Attempt ${this.retryCount}`);
      setTimeout(() => {
        const currentTime = this.video.currentTime;
        this.video.load();
        if (currentTime > 0) this.video.currentTime = currentTime;
        this.video.play().catch(e => console.warn('Auto-retry error:', e));
      }, 2000);
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
      case 'l':
        e.preventDefault();
        this.seekOffset(10);
        break;
      case 'arrowleft':
      case 'j':
        e.preventDefault();
        this.seekOffset(-10);
        break;
      case 'arrowup':
        e.preventDefault();
        this.video.volume = Math.min(1, this.video.volume + 0.1);
        this.volumeInput.value = this.video.volume;
        this.updateVolumeUI();
        break;
      case 'arrowdown':
        e.preventDefault();
        this.video.volume = Math.max(0, this.video.volume - 0.1);
        this.volumeInput.value = this.video.volume;
        this.updateVolumeUI();
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
      navigator.mediaSession.setActionHandler('seekbackward', (d) => this.seekOffset(-(d.seekOffset || 10)));
      navigator.mediaSession.setActionHandler('seekforward', (d) => this.seekOffset(d.seekOffset || 10));
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
    this.updateVolumeUI();
  }

  updateVolumeUI() {
    const v = this.video.muted ? 0 : this.video.volume;
    this.volumeInput.value = v;
    this.volumeProgress.style.width = (v * 100) + '%';
    
    if (v === 0) {
      this.muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    } else if (v < 0.5) {
      this.muteBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
    } else {
      this.muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
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
      }, 2500);
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
    if (this.observer) this.observer.disconnect();
    clearTimeout(this.controlsTimeout);
  }
}

window.UHVVideoPlayer = UHVVideoPlayer;
