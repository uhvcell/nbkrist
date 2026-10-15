/**
 * Highly Advanced Video Player for UHV CELL Platform
 * Seamlessly supports both Internet Archive and Dailymotion streaming
 * Features:
 *  - Continuous, robust multi-user streaming without bottlenecks
 *  - Dailymotion Geo player integration with auto-adaptation & clean UI
 *  - Internet Archive direct cluster resolver + automatic embed fallback
 *  - Custom Glassmorphism HTML5 controls (seeking, volume, speed, PiP, fullscreen, cast)
 *  - Automatic poster/thumbnail generation for Archive.org and Dailymotion
 */

(function (window) {
  'use strict';

  // --- Utility Functions ---

  function extractDailymotionId(urlOrId) {
    if (!urlOrId || typeof urlOrId !== 'string') return null;
    const str = urlOrId.trim();

    // Direct Dailymotion ID (typically starts with x or k, 5-9 alphanumeric chars)
    if (/^[xk][a-zA-Z0-9]{5,8}$/.test(str)) {
      return str;
    }

    // geo.dailymotion.com/player.html?video=xa2rzvy
    const geoMatch = str.match(/geo\.dailymotion\.com\/player\.html\?[^#]*\bvideo=([a-zA-Z0-9]+)/i);
    if (geoMatch) return geoMatch[1];

    // dailymotion.com/embed/video/xa2rzvy
    const embedMatch = str.match(/dailymotion\.com\/embed\/video\/([a-zA-Z0-9]+)/i);
    if (embedMatch) return embedMatch[1];

    // dailymotion.com/video/xa2rzvy or dai.ly/xa2rzvy
    const watchMatch = str.match(/(?:dailymotion\.com\/(?:video|hub)\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
    if (watchMatch) return watchMatch[1];

    return null;
  }

  function extractArchiveId(urlOrId) {
    if (!urlOrId || typeof urlOrId !== 'string') return null;
    const str = urlOrId.trim();
    const match = str.match(/archive\.org\/(?:details|download|embed)\/([^\/?#]+)/i);
    if (match) return match[1];
    return null;
  }

  function resolveVideoThumbnail(video) {
    if (!video) return 'assets/placeholder.svg';
    if (video.thumbnail && typeof video.thumbnail === 'string' && video.thumbnail.trim()) {
      return video.thumbnail.trim();
    }
    const raw = video.videoUrl || video.videoId || video.id || (video.sources && video.sources[0]?.src) || '';
    const dmId = extractDailymotionId(raw);
    if (dmId) {
      return `https://www.dailymotion.com/thumbnail/video/${dmId}`;
    }
    const iaId = extractArchiveId(raw);
    if (iaId) {
      return `https://archive.org/services/img/${iaId}`;
    }
    return 'assets/placeholder.svg';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Export utilities globally
  window.UHVVideoUtils = {
    extractDailymotionId,
    extractArchiveId,
    resolveVideoThumbnail,
    escapeHtml
  };

  // --- Main Player Class ---

  class UHVVideoPlayer {
    constructor(containerId, videoData) {
      this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
      if (!this.container) throw new Error('Container not found');

      this.videoData = videoData || {};
      this.rawSource = this.resolveSourceUrl();

      // Detect provider & IDs
      const rawCandidates = [
        this.rawSource,
        this.videoData.videoUrl,
        this.videoData.videoId,
        this.videoData.id,
        (this.videoData.sources && this.videoData.sources[0]?.src)
      ].filter(Boolean);

      let foundDmId = null;
      let foundIaId = null;

      for (const candidate of rawCandidates) {
        if (!foundDmId) foundDmId = extractDailymotionId(candidate);
        if (!foundIaId) foundIaId = extractArchiveId(candidate);
      }

      this.dailymotionId = foundDmId;
      this.archiveId = foundIaId;

      // Auto-populate thumbnail if empty
      if (!this.videoData.thumbnail) {
        this.videoData.thumbnail = resolveVideoThumbnail(this.videoData);
      }

      // Determine playback mode:
      // 1. Dailymotion: Always uses Dailymotion's high-speed CDN embed
      // 2. Archive Embed: If explicit embed or details without direct source
      // 3. Native HTML5: Direct file / Archive direct stream with auto-fallback
      if (this.videoData.provider === 'dailymotion' || this.dailymotionId) {
        this.mode = 'dailymotion';
      } else if (
        this.videoData.provider === 'internet_archive_embed' ||
        (this.rawSource && this.rawSource.includes('/embed/'))
      ) {
        this.mode = 'archive_embed';
      } else {
        this.mode = 'native';
      }

      this.isPlaying = false;
      this.isControlsActive = true;
      this.controlsTimeout = null;
      this.retryCount = 0;
      this.abortController = null;
      this._loading = false;
      this._loadTimeout = null;
      this._mediaSessionSet = false;
      this._docHandlers = [];
      this.observer = null;

      // DOM refs
      this.wrapper = null;
      this.video = null;
      this.iframe = null;

      if (this.mode === 'dailymotion') {
        this.initDailymotionUI();
      } else if (this.mode === 'archive_embed') {
        this.initArchiveEmbedUI();
      } else {
        this.initNativeUI();
        this.bindEvents();
        this.loadSource();
        this.setupIntersectionObserver();
      }

      this.setupMediaSession();
    }

    resolveSourceUrl() {
      if (this.videoData.sources && this.videoData.sources.length > 0) {
        return this.videoData.sources[0].src || '';
      }
      if (this.videoData.videoUrl) return this.videoData.videoUrl;
      if (this.videoData.videoId) return this.videoData.videoId;
      return '';
    }

    // ==========================================
    // DAILYMOTION EMBED MODE
    // ==========================================
    initDailymotionUI() {
      const dmId = this.dailymotionId || 'xa2rzvy';
      const embedUrl = `https://www.dailymotion.com/embed/video/${encodeURIComponent(dmId)}?autoplay=1&ui-logo=0&queue-enable=0&sharing-enable=0&ui-start-screen-info=0`;

      this.container.innerHTML = `
        <div class="uhv-video-wrapper advanced-glass-player uhv-embed-mode" id="uhv_wrapper_${this.videoData.id || dmId}" tabindex="0">
          <div class="uhv-embed-frame-wrapper">
            <iframe
              class="uhv-embedded-frame"
              id="uhv_iframe_${this.videoData.id || dmId}"
              src="${embedUrl}"
              allow="autoplay; fullscreen; picture-in-picture; web-share"
              allowfullscreen
              title="${escapeHtml(this.videoData.title || 'Dailymotion Video')}"
              loading="eager"
            ></iframe>
          </div>
          <div class="uhv-loading-overlay active"><div class="uhv-spinner"></div></div>
          <div class="uhv-error-overlay">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h3>Playback Connection Issue</h3>
            <p class="error-msg">Unable to connect to Dailymotion streaming servers. Please retry.</p>
            <button class="uhv-btn-retry">Retry Connection</button>
          </div>
        </div>
      `;

      this.wrapper = this.container.querySelector('.uhv-video-wrapper');
      this.iframe = this.container.querySelector('.uhv-embedded-frame');
      this.loadingOverlay = this.container.querySelector('.uhv-loading-overlay');
      this.errorOverlay = this.container.querySelector('.uhv-error-overlay');
      this.retryBtn = this.container.querySelector('.uhv-btn-retry');

      // Hide loading spinner once the iframe has loaded
      this.iframe.addEventListener('load', () => {
        setTimeout(() => {
          if (this.loadingOverlay) this.loadingOverlay.classList.remove('active');
        }, 500);
      });

      // Retry handler
      if (this.retryBtn) {
        this.retryBtn.addEventListener('click', () => {
          this.errorOverlay.classList.remove('active');
          this.loadingOverlay.classList.add('active');
          // Reload iframe
          const currentSrc = this.iframe.src;
          this.iframe.src = 'about:blank';
          setTimeout(() => { this.iframe.src = currentSrc; }, 100);
        });
      }
    }

    // ==========================================
    // INTERNET ARCHIVE EMBED FALLBACK MODE
    // ==========================================
    initArchiveEmbedUI(customEmbedUrl = null) {
      const iaId = this.archiveId || 'default';
      const embedUrl = customEmbedUrl || `https://archive.org/embed/${encodeURIComponent(iaId)}?autoplay=1`;

      this.container.innerHTML = `
        <div class="uhv-video-wrapper advanced-glass-player uhv-embed-mode" id="uhv_wrapper_${this.videoData.id || iaId}" tabindex="0">
          <div class="uhv-embed-frame-wrapper">
            <iframe
              class="uhv-embedded-frame"
              id="uhv_iframe_${this.videoData.id || iaId}"
              src="${embedUrl}"
              allow="autoplay; fullscreen; picture-in-picture; web-share"
              allowfullscreen
              title="${escapeHtml(this.videoData.title || 'Internet Archive Video')}"
              loading="eager"
            ></iframe>
          </div>
          <div class="uhv-loading-overlay active"><div class="uhv-spinner"></div></div>
          <div class="uhv-error-overlay">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h3>Playback Connection Issue</h3>
            <p class="error-msg">Unable to connect to Internet Archive. Please retry.</p>
            <button class="uhv-btn-retry">Retry Connection</button>
          </div>
        </div>
      `;

      this.wrapper = this.container.querySelector('.uhv-video-wrapper');
      this.iframe = this.container.querySelector('.uhv-embedded-frame');
      this.loadingOverlay = this.container.querySelector('.uhv-loading-overlay');
      this.errorOverlay = this.container.querySelector('.uhv-error-overlay');
      this.retryBtn = this.container.querySelector('.uhv-btn-retry');

      this.iframe.addEventListener('load', () => {
        setTimeout(() => {
          if (this.loadingOverlay) this.loadingOverlay.classList.remove('active');
        }, 600);
      });

      if (this.retryBtn) {
        this.retryBtn.addEventListener('click', () => {
          this.errorOverlay.classList.remove('active');
          this.loadingOverlay.classList.add('active');
          const currentSrc = this.iframe.src;
          this.iframe.src = 'about:blank';
          setTimeout(() => { this.iframe.src = currentSrc; }, 100);
        });
      }
    }

    switchToEmbed(embedUrl) {
      this.destroyNative();
      this.mode = this.archiveId ? 'archive_embed' : 'dailymotion';
      if (this.archiveId) {
        this.initArchiveEmbedUI(embedUrl);
      } else {
        this.initDailymotionUI();
      }
    }

    // ==========================================
    // NATIVE HTML5 GLASSMORPHIC PLAYER MODE
    // ==========================================
    initNativeUI() {
      const poster = this.videoData.thumbnail || '';
      const safeId = this.videoData.id || this.archiveId || 'default';

      this.container.innerHTML = `
        <div class="uhv-video-wrapper advanced-glass-player" id="uhv_wrapper_${safeId}" tabindex="0">
          <video
            class="uhv-video-element"
            id="uhv_video_${safeId}"
            poster="${poster}"
            playsinline
            preload="metadata"
            crossorigin="anonymous"
            controlsList="nodownload nofullscreen noremoteplayback"
            oncontextmenu="return false;"
          ></video>
          
          <div class="uhv-big-play pulse-animation"><i class="fa-solid fa-play"></i></div>
          
          <div class="uhv-loading-overlay"><div class="uhv-spinner"></div></div>
          
          <div class="uhv-error-overlay">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h3>Playback Error</h3>
            <p class="error-msg">Connecting to video source. Retrying...</p>
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

      this.dtLeft = this.container.querySelector('.double-tap-left');
      this.dtRight = this.container.querySelector('.double-tap-right');

      if (!document.pictureInPictureEnabled && this.pipBtn) {
        this.pipBtn.style.display = 'none';
      }

      this.updateVolumeUI();
    }

    async loadSource({ resetRetry = true } = {}) {
      if (resetRetry) this.retryCount = 0;
      if (this.errorOverlay) this.errorOverlay.classList.remove('active');

      if (this._loading) {
        this.abortInflight();
      }
      this._loading = true;

      let sourceUrl = this.resolveSourceUrl();
      if (!sourceUrl) {
        this._loading = false;
        this.showError('No valid video source provided.');
        return;
      }

      const rawDownloadUrl = sourceUrl;

      // Internet Archive metadata resolution to bypass central download redirector bottleneck:
      // Direct servers: https://${data.server}${data.dir}/${filename}
      if (sourceUrl.includes('archive.org/download/') || sourceUrl.includes('archive.org/details/')) {
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        let timedOut = false;
        this._loadTimeout = setTimeout(() => {
          timedOut = true;
          try { this.abortController.abort(); } catch (e) { /* noop */ }
        }, 6000);

        try {
          let itemId = this.archiveId;
          let filename = '';

          if (sourceUrl.includes('/download/')) {
            const urlParts = sourceUrl.split('/download/')[1].split('/');
            itemId = urlParts[0];
            filename = urlParts.slice(1).join('/');
          }

          if (itemId) {
            const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(itemId)}`, { signal });
            if (response.ok) {
              const data = await response.json();
              if (data && data.server && data.dir) {
                if (filename) {
                  sourceUrl = `https://${data.server}${data.dir}/${filename}`;
                } else if (data.files && Array.isArray(data.files)) {
                  // Find best MP4 video file
                  const videoFiles = data.files.filter(f => f.name && (f.name.endsWith('.mp4') || (f.format && f.format.includes('MPEG4'))));
                  const best = videoFiles[0];
                  if (best) {
                    sourceUrl = `https://${data.server}${data.dir}/${best.name}`;
                  }
                }
              }
            }
          }
        } catch (err) {
          if (err && err.name === 'AbortError') {
            if (!timedOut) {
              this.clearLoadTimeout();
              this._loading = false;
              return;
            }
            sourceUrl = rawDownloadUrl;
          } else {
            console.warn('Failed to resolve direct cluster URL, using default:', err);
            sourceUrl = rawDownloadUrl;
          }
        } finally {
          this.clearLoadTimeout();
        }
      }

      // If the URL is still an embed or details URL, switch seamlessly to embed
      if (sourceUrl.includes('/details/') || sourceUrl.includes('/embed/')) {
        this._loading = false;
        this.switchToEmbed(sourceUrl);
        return;
      }

      if (this.video) {
        this.video.src = sourceUrl;
        this.video.load();
      }
      this._loading = false;
    }

    clearLoadTimeout() {
      if (this._loadTimeout) {
        clearTimeout(this._loadTimeout);
        this._loadTimeout = null;
      }
    }

    abortInflight() {
      if (this.abortController) {
        try { this.abortController.abort(); } catch (e) { /* noop */ }
        this.abortController = null;
      }
      this.clearLoadTimeout();
    }

    bindEvents() {
      if (!this.video) return;

      this.video.addEventListener('contextmenu', e => e.preventDefault());

      this.playPauseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.togglePlay(); });
      this.bigPlayBtn.addEventListener('click', (e) => { e.stopPropagation(); this.togglePlay(); });

      let lastTap = 0;
      this.video.addEventListener('click', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
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

      this.video.addEventListener('timeupdate', () => this.updateProgress());
      this.video.addEventListener('loadedmetadata', () => {
        this.durationEl.textContent = this.formatTime(this.video.duration);
      });
      this.video.addEventListener('progress', () => this.updateBuffer());

      let isDragging = false;
      const updateSeekFromEvent = (e) => {
        const rect = this.progressContainer.getBoundingClientRect();
        let pos = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        pos = Math.max(0, Math.min(pos, rect.width)) / rect.width;
        if (this.video && this.video.duration) {
          this.video.currentTime = pos * this.video.duration;
        }
      };

      this.progressContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateSeekFromEvent(e);
      });

      this.progressContainer.addEventListener('touchstart', (e) => {
        isDragging = true;
        updateSeekFromEvent(e);
      }, { passive: true });

      const onDocMouseUp = () => { isDragging = false; };
      const onDocTouchEnd = () => { isDragging = false; };
      const onDocMouseMove = (e) => { if (isDragging) updateSeekFromEvent(e); };
      const onDocTouchMove = (e) => { if (isDragging) updateSeekFromEvent(e); };

      document.addEventListener('mouseup', onDocMouseUp);
      document.addEventListener('touchend', onDocTouchEnd);
      document.addEventListener('mousemove', onDocMouseMove);
      document.addEventListener('touchmove', onDocTouchMove, { passive: true });

      this._docHandlers.push(
        ['mouseup', onDocMouseUp],
        ['touchend', onDocTouchEnd],
        ['mousemove', onDocMouseMove],
        ['touchmove', onDocTouchMove]
      );

      this.progressContainer.addEventListener('mousemove', (e) => {
        const rect = this.progressContainer.getBoundingClientRect();
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(pos, 1));
        const time = pos * (this.video ? this.video.duration : 0);
        this.progressHoverTime.textContent = this.formatTime(time);
        this.progressHoverTime.style.left = `${pos * 100}%`;
        this.progressHoverTime.style.opacity = '1';
      });

      this.progressContainer.addEventListener('mouseleave', () => {
        this.progressHoverTime.style.opacity = '0';
      });

      this.muteBtn.addEventListener('click', () => this.toggleMute());
      this.volumeInput.addEventListener('input', (e) => {
        if (!this.video) return;
        this.video.volume = e.target.value;
        this.video.muted = e.target.value === '0';
        this.updateVolumeUI();
      });

      this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
      const onFsChange = () => this.updateFullscreenIcon();
      document.addEventListener('fullscreenchange', onFsChange);
      this._docHandlers.push(['fullscreenchange', onFsChange]);

      if (this.pipBtn) {
        this.pipBtn.addEventListener('click', () => this.togglePip());
      }

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

      const speeds = [1, 1.25, 1.5, 2, 0.5];
      let speedIdx = 0;
      this.speedBtn.addEventListener('click', () => {
        if (!this.video) return;
        speedIdx = (speedIdx + 1) % speeds.length;
        this.video.playbackRate = speeds[speedIdx];
        this.speedBtn.textContent = speeds[speedIdx] + 'x';
      });

      this.video.addEventListener('waiting', () => this.loadingOverlay.classList.add('active'));
      this.video.addEventListener('playing', () => this.loadingOverlay.classList.remove('active'));
      this.video.addEventListener('canplay', () => this.loadingOverlay.classList.remove('active'));

      this.video.addEventListener('error', () => {
        console.warn("Direct Video Stream Error:", this.video ? this.video.error : null);
        this.handleError();
      });

      this.retryBtn.addEventListener('click', async () => {
        this.abortInflight();
        await this.loadSource();
        if (this.video) {
          this.video.play().catch(e => console.warn('Retry play error:', e));
        }
      });

      this.wrapper.addEventListener('mousemove', () => this.startIdleTimer());
      this.wrapper.addEventListener('mouseleave', () => {
        if (this.isPlaying) this.wrapper.classList.add('idle');
      });

      this.wrapper.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    showDoubleTapIndicator(el) {
      if (!el) return;
      el.classList.add('active');
      setTimeout(() => el.classList.remove('active'), 500);
    }

    seekOffset(seconds) {
      if (!this.video || !this.video.duration) return;
      this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + seconds));
    }

    handleError() {
      if (this.loadingOverlay) this.loadingOverlay.classList.remove('active');

      // If this is an Internet Archive item, fall back to official Archive embed player
      if (this.archiveId && this.retryCount >= 2) {
        console.log('Direct stream unavailable, falling back to Internet Archive official embed player...');
        this.switchToEmbed(`https://archive.org/embed/${encodeURIComponent(this.archiveId)}?autoplay=1`);
        return;
      }

      // Dailymotion fallback after retries
      if (this.dailymotionId && this.retryCount >= 2) {
        console.log('Direct Dailymotion stream unavailable, falling back to official Dailymotion embed...');
        const embedUrl = `https://www.dailymotion.com/embed/video/${encodeURIComponent(this.dailymotionId)}?autoplay=1`;
        this.switchToEmbed(embedUrl);
        return;
      }

      const hasSource = (this.videoData.sources && this.videoData.sources.length) || this.videoData.videoUrl;
      if (this.retryCount < 2 && hasSource) {
        this.retryCount++;
        console.log(`Retrying video stream... Attempt ${this.retryCount}`);
        setTimeout(() => {
          const currentTime = this.video ? this.video.currentTime : 0;
          this.loadSource({ resetRetry: false }).then(() => {
            if (this.video && currentTime > 0) {
              try { this.video.currentTime = currentTime; } catch (e) { /* noop */ }
            }
            if (this.video) {
              this.video.play().catch(e => console.warn('Auto-retry error:', e));
            }
          });
        }, 1500);
      } else {
        // Ultimate fallback for Archive.org
        if (this.archiveId) {
          this.switchToEmbed(`https://archive.org/embed/${encodeURIComponent(this.archiveId)}?autoplay=1`);
        } else {
          this.showError('Unable to load video stream. Check your connection and retry.');
        }
      }
    }

    handleKeyboard(e) {
      const tagName = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tagName === 'input' || tagName === 'textarea') return;
      if (!this.video) return;

      switch (e.key.toLowerCase()) {
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
      if (!('IntersectionObserver' in window) || !this.wrapper) return;
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && this.isPlaying && !document.pictureInPictureElement && this.video) {
            this.video.pause();
          }
        });
      }, { threshold: 0.1 });
      this.observer.observe(this.wrapper);
    }

    setupMediaSession() {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: this.videoData.title || 'UHV CELL Video',
            artist: 'UHV CELL NBKRIST',
            artwork: this.videoData.thumbnail ? [
              { src: this.videoData.thumbnail, sizes: '512x512', type: 'image/jpeg' }
            ] : []
          });

          if (this.video) {
            navigator.mediaSession.setActionHandler('play', () => this.video && this.video.play());
            navigator.mediaSession.setActionHandler('pause', () => this.video && this.video.pause());
            navigator.mediaSession.setActionHandler('seekbackward', (d) => this.seekOffset(-(d.seekOffset || 10)));
            navigator.mediaSession.setActionHandler('seekforward', (d) => this.seekOffset(d.seekOffset || 10));
          }
          this._mediaSessionSet = true;
        } catch (e) {
          /* noop */
        }
      }
    }

    updateMediaSessionState() {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
        } catch (e) { /* noop */ }
      }
    }

    togglePlay() {
      if (!this.video) return;
      if (this.video.paused) {
        this.video.play().catch(e => console.warn('Play error:', e));
      } else {
        this.video.pause();
      }
    }

    toggleMute() {
      if (!this.video) return;
      this.video.muted = !this.video.muted;
      if (!this.video.muted && this.video.volume === 0) {
        this.video.volume = 1;
        this.volumeInput.value = 1;
      }
      this.updateVolumeUI();
    }

    updateVolumeUI() {
      if (!this.video || !this.volumeInput) return;
      const v = this.video.muted ? 0 : this.video.volume;
      this.volumeInput.value = v;
      if (this.volumeProgress) {
        this.volumeProgress.style.width = (v * 100) + '%';
      }
      if (this.muteBtn) {
        if (v === 0) {
          this.muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        } else if (v < 0.5) {
          this.muteBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
        } else {
          this.muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        }
      }
    }

    updateProgress() {
      if (!this.video || !this.video.duration || !this.progressCurrent) return;
      const percent = (this.video.currentTime / this.video.duration) * 100;
      this.progressCurrent.style.width = percent + '%';
      if (this.currentTimeEl) {
        this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);
      }
    }

    updateBuffer() {
      if (!this.video || !this.progressLoaded) return;
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
        if (this.wrapper && this.wrapper.requestFullscreen) {
          this.wrapper.requestFullscreen().catch(err => console.warn(err));
        } else if (this.video && this.video.webkitEnterFullscreen) {
          this.video.webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    async togglePip() {
      if (!document.pictureInPictureEnabled || !this.video) return;
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
      if (!this.fullscreenBtn) return;
      if (document.fullscreenElement) {
        this.fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
      } else {
        this.fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
      }
    }

    startIdleTimer() {
      if (!this.wrapper) return;
      this.wrapper.classList.remove('idle');
      clearTimeout(this.controlsTimeout);
      if (this.isPlaying) {
        this.controlsTimeout = setTimeout(() => {
          if (this.isPlaying && this.wrapper) this.wrapper.classList.add('idle');
        }, 2500);
      }
    }

    showError(msg) {
      if (this.loadingOverlay) this.loadingOverlay.classList.remove('active');
      if (this.errorOverlay) {
        this.errorOverlay.classList.add('active');
        const msgEl = this.errorOverlay.querySelector('.error-msg');
        if (msgEl && msg) msgEl.textContent = msg;
      }
    }

    formatTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return '0:00';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    }

    destroyNative() {
      this.abortInflight();
      if (this.observer) {
        try { this.observer.disconnect(); } catch (e) { /* noop */ }
        this.observer = null;
      }
      clearTimeout(this.controlsTimeout);

      if (this.video) {
        try {
          this.video.pause();
          this.video.removeAttribute('src');
          this.video.load();
        } catch (e) { /* noop */ }
        this.video = null;
      }

      if (this._docHandlers) {
        for (const [type, handler] of this._docHandlers) {
          try { document.removeEventListener(type, handler); } catch (e) { /* noop */ }
        }
        this._docHandlers = [];
      }
    }

    destroy() {
      this.destroyNative();

      if (this.iframe) {
        try {
          this.iframe.src = 'about:blank';
          this.iframe.remove();
        } catch (e) { /* noop */ }
        this.iframe = null;
      }

      if (this._mediaSessionSet && 'mediaSession' in navigator) {
        ['play', 'pause', 'seekbackward', 'seekforward'].forEach((action) => {
          try { navigator.mediaSession.setActionHandler(action, null); } catch (e) { /* noop */ }
        });
        this._mediaSessionSet = false;
      }

      if (this.container) {
        this.container.innerHTML = '';
      }
    }
  }

  window.UHVVideoPlayer = UHVVideoPlayer;
})(window);
