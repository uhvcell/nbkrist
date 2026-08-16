/**
 * App Detection & Utils
 * Mobile menu, video modal, app mode, and shared UI helpers.
 */
(function () {
    if (window.__uhvAppUtilsInit) return;
    window.__uhvAppUtilsInit = true;

    function updateHeaderOffset() {
        const header = document.querySelector('header');
        if (!header) return;
        document.documentElement.style.setProperty('--header-offset', `${header.offsetHeight}px`);
    }

    function initMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        if (!menuToggle || !navLinks) return;
        navLinks.setAttribute('aria-hidden', 'true');

        let overlay = document.querySelector('.nav-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'nav-overlay';
            overlay.setAttribute('aria-hidden', 'true');
            document.body.appendChild(overlay);
        }

        const setMenuOpen = (open) => {
            navLinks.classList.toggle('active', open);
            overlay.classList.toggle('active', open);
            document.body.classList.toggle('menu-open', open);
            menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
            navLinks.setAttribute('aria-hidden', open ? 'false' : 'true');
        };

        const closeMenu = () => setMenuOpen(false);
        const openMenu = () => {
            updateHeaderOffset();
            setMenuOpen(true);
        };

        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (navLinks.classList.contains('active')) closeMenu();
            else openMenu();
        });

        overlay.addEventListener('click', closeMenu);

        navLinks.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });

        let resizeRaf = 0;
        window.addEventListener('resize', () => {
            cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => {
                updateHeaderOffset();
                if (window.innerWidth > 1200) closeMenu();
            });
        }, { passive: true });
    }

    function initAppMode() {
        if (navigator.userAgent.includes('MyWebsiteAndroidApp')) {
            document.body.classList.add('is-app');
        }

        document.querySelectorAll('.btn-download-app').forEach((btn) => {
            btn.href = '#';
            btn.removeAttribute('target');
            btn.addEventListener('click', (e) => e.preventDefault());
        });
    }

    function initYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) yearElement.textContent = String(new Date().getFullYear());
    }

    function initLazyImages() {
        document.querySelectorAll('img:not([loading])').forEach((img) => {
            if (!img.closest('header') && !img.closest('.slider-slide')) {
                img.loading = 'lazy';
            }
        });

        document.querySelectorAll('img:not([decoding])').forEach((img) => {
            img.decoding = 'async';
        });

        document.querySelectorAll('iframe:not([loading])').forEach((frame) => {
            frame.loading = 'lazy';
        });
    }

    /** Pause JS timers when tab hidden; CSS animations keep running. */
    function initTimerPause() {
        const timers = new Set();
        window.UHV = window.UHV || {};

        UHV.registerInterval = function (id) {
            if (id != null) timers.add(id);
            return id;
        };

        UHV.clearRegisteredIntervals = function () {
            timers.forEach((id) => clearInterval(id));
        };

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                UHV.clearRegisteredIntervals();
            } else {
                window.dispatchEvent(new CustomEvent('uhv:resume-timers'));
            }
        }, { passive: true });
    }

    function initTouchMarqueePause() {
        document.querySelectorAll('.team-marquee-container').forEach((container) => {
            const track = container.querySelector('.team-marquee-track');
            if (!track) return;

            container.addEventListener('touchstart', () => {
                track.style.animationPlayState = 'paused';
            }, { passive: true });

            container.addEventListener('touchend', () => {
                track.style.animationPlayState = 'running';
            }, { passive: true });
        });
    }

    function initVideoModal() {
        window.openVideo = async function (video) {
            let modal = document.getElementById('videoModal');
            let playerContainer = document.getElementById('custom-player-container') || document.getElementById('dailymotion-player');

            // If modal doesn't exist on page, create it dynamically
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'videoModal';
                modal.className = 'modal';
                modal.style.display = 'none';
                modal.innerHTML = `
                    <div class="modal-content" style="background:#111; border-radius:12px; overflow:hidden; max-width:850px; width:90%; position:relative; box-shadow:0 0 40px rgba(0,243,255,0.2); border:1px solid rgba(255,255,255,0.1);">
                        <button class="close-modal" style="position:absolute; right:15px; top:15px; background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; font-size:1.2rem; z-index:10;"><i class="fa-solid fa-xmark"></i></button>
                        <div id="custom-player-container" style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; background:#000;"></div>
                        <div style="padding:20px;">
                            <h3 id="modalTitle" style="color:var(--primary); margin-bottom:8px;"></h3>
                            <p id="modalDesc" style="color:var(--text-muted); font-size:0.9rem;"></p>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                playerContainer = modal.querySelector('#custom-player-container');

                modal.querySelector('.close-modal').addEventListener('click', () => {
                    modal.style.display = 'none';
                    playerContainer.innerHTML = '';
                    document.body.style.overflow = '';
                });

                window.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                        playerContainer.innerHTML = '';
                        document.body.style.overflow = '';
                    }
                });
            }

            const modalTitle = document.getElementById('modalTitle');
            const modalDesc = document.getElementById('modalDesc');

            if (!video?.videoUrl) return;

            if (modalTitle) modalTitle.textContent = video.title || 'Video';
            if (modalDesc) modalDesc.textContent = video.description || '';
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            playerContainer.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Loading video...</div>';

            let embedUrl = video.videoUrl.trim();
            const iframeMatch = embedUrl.match(/src=["']([^"']+)["']/i);
            if (iframeMatch) {
                embedUrl = iframeMatch[1];
            }

            let videoSrc = embedUrl;
            let isDirectVideo = embedUrl.endsWith('.mp4');

            // Parse Internet Archive Links
            if (embedUrl.includes('archive.org/details/')) {
                const id = embedUrl.split('/details/')[1].split('/')[0].split('?')[0];
                try {
                    const res = await fetch(`https://archive.org/metadata/${id}`);
                    const data = await res.json();
                    const mp4File = data.files.find(f => f.name.endsWith('.mp4'));
                    if (mp4File) {
                        videoSrc = `https://archive.org/download/${id}/${mp4File.name}`;
                        isDirectVideo = true;
                    } else {
                        videoSrc = `https://archive.org/embed/${id}`;
                        isDirectVideo = false;
                    }
                } catch(e) {
                    videoSrc = `https://archive.org/embed/${id}`;
                    isDirectVideo = false;
                }
            } else if (embedUrl.includes('archive.org/embed/')) {
                 isDirectVideo = false;
            } else if (embedUrl.includes('archive.org/download/') && embedUrl.endsWith('.mp4')) {
                isDirectVideo = true;
            }

            playerContainer.style.position = 'relative';
            playerContainer.style.overflow = 'hidden';
            playerContainer.style.background = '#000';
            playerContainer.style.width = '100%';
            playerContainer.style.height = '100%';

            if (isDirectVideo) {
                playerContainer.innerHTML = `
                    <div class="custom-video-wrapper">
                        <video 
                            id="custom-html5-video"
                            src="${videoSrc}" 
                            autoplay
                            controlsList="nodownload"
                            disablePictureInPicture
                            playsinline
                            style="width: 100%; height: 100%; object-fit: contain; background: #000;"
                        ></video>
                        <div class="custom-video-controls">
                            <button class="ctrl-btn play-pause-btn"><i class="fa-solid fa-pause"></i></button>
                            <div class="progress-container">
                                <div class="progress-bar"><div class="progress-filled"></div></div>
                            </div>
                            <div class="time-display"><span class="current-time">0:00</span> / <span class="duration">0:00</span></div>
                            <button class="ctrl-btn mute-btn"><i class="fa-solid fa-volume-high"></i></button>
                            <input type="range" class="volume-slider" min="0" max="1" step="0.05" value="1">
                            <button class="ctrl-btn fullscreen-btn"><i class="fa-solid fa-expand"></i></button>
                        </div>
                    </div>
                `;
                initCustomPlayerLogic(playerContainer);
            } else {
                 playerContainer.innerHTML = `
                    <iframe 
                        src="${videoSrc}${videoSrc.includes('?') ? '&' : '?'}autoplay=1" 
                        style="width: 100%; height: 100%; border: none; position: absolute; left: 0; top: 0; z-index: 1;" 
                        allow="autoplay; fullscreen; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                `;
            }
        };

        const closeModal = document.querySelector('.close-modal');
        const modal = document.getElementById('videoModal');

        const hideModal = () => {
            if (!modal) return;
            modal.style.display = 'none';
            const playerContainer = document.getElementById('custom-player-container') || document.getElementById('dailymotion-player');
            if (playerContainer) playerContainer.innerHTML = '';
            document.body.style.overflow = '';
        };

        if (closeModal) closeModal.addEventListener('click', hideModal);

        window.addEventListener('click', (event) => {
            if (event.target === modal) hideModal();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
                hideModal();
            }
        });
    }

    function initCustomPlayerLogic(container) {
        const video = container.querySelector('video');
        const playPauseBtn = container.querySelector('.play-pause-btn');
        const playPauseIcon = playPauseBtn.querySelector('i');
        const progressContainer = container.querySelector('.progress-container');
        const progressFilled = container.querySelector('.progress-filled');
        const currentTimeEl = container.querySelector('.current-time');
        const durationEl = container.querySelector('.duration');
        const muteBtn = container.querySelector('.mute-btn');
        const muteIcon = muteBtn.querySelector('i');
        const volumeSlider = container.querySelector('.volume-slider');
        const fullscreenBtn = container.querySelector('.fullscreen-btn');
        const wrapper = container.querySelector('.custom-video-wrapper');

        if (!video) return;

        video.addEventListener('contextmenu', e => e.preventDefault());

        const formatTime = (time) => {
            if (isNaN(time)) return '0:00';
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        };

        video.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(video.duration);
        });

        const togglePlay = () => {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        };

        playPauseBtn.addEventListener('click', togglePlay);
        video.addEventListener('click', togglePlay);

        video.addEventListener('play', () => {
            playPauseIcon.className = 'fa-solid fa-pause';
        });

        video.addEventListener('pause', () => {
            playPauseIcon.className = 'fa-solid fa-play';
        });

        video.addEventListener('timeupdate', () => {
            const percent = (video.currentTime / video.duration) * 100;
            progressFilled.style.width = `${percent}%`;
            currentTimeEl.textContent = formatTime(video.currentTime);
        });

        progressContainer.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = pos * video.duration;
        });

        muteBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            if (video.muted || video.volume === 0) {
                muteIcon.className = 'fa-solid fa-volume-xmark';
                volumeSlider.value = 0;
            } else {
                muteIcon.className = 'fa-solid fa-volume-high';
                volumeSlider.value = video.volume;
            }
        });

        volumeSlider.addEventListener('input', (e) => {
            video.volume = e.target.value;
            video.muted = video.volume === 0;
            if (video.muted) {
                muteIcon.className = 'fa-solid fa-volume-xmark';
            } else if (video.volume < 0.5) {
                muteIcon.className = 'fa-solid fa-volume-low';
            } else {
                muteIcon.className = 'fa-solid fa-volume-high';
            }
        });

        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                if (wrapper.requestFullscreen) wrapper.requestFullscreen().catch(err => {});
                else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });
        
        let hideControlsTimeout;
        const controls = container.querySelector('.custom-video-controls');
        const showControls = () => {
            controls.style.opacity = '1';
            controls.style.pointerEvents = 'auto';
            wrapper.style.cursor = 'default';
            clearTimeout(hideControlsTimeout);
            if (!video.paused) {
                hideControlsTimeout = setTimeout(() => {
                    controls.style.opacity = '0';
                    controls.style.pointerEvents = 'none';
                    wrapper.style.cursor = 'none';
                }, 3000);
            }
        };

        wrapper.addEventListener('mousemove', showControls);
        wrapper.addEventListener('mouseleave', () => {
            if (!video.paused) {
                controls.style.opacity = '0';
                controls.style.pointerEvents = 'none';
            }
        });

        // Mobile Touch Support: Tap on video to toggle controls visibility
        let lastTap = 0;
        video.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                // Double tap - toggle play/pause
                e.preventDefault();
                togglePlay();
            } else {
                // Single tap - toggle controls
                if (controls.style.opacity === '1') {
                    if (!video.paused) {
                        controls.style.opacity = '0';
                        controls.style.pointerEvents = 'none';
                    }
                } else {
                    showControls();
                }
            }
            lastTap = currentTime;
        }, { passive: false });

        // Ensure controls stay open during touch scrubber interaction
        progressContainer.addEventListener('touchstart', () => {
            clearTimeout(hideControlsTimeout);
            controls.style.opacity = '1';
            controls.style.pointerEvents = 'auto';
        }, { passive: true });

        progressContainer.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const rect = progressContainer.getBoundingClientRect();
            let pos = (touch.clientX - rect.left) / rect.width;
            pos = Math.max(0, Math.min(1, pos));
            video.currentTime = pos * video.duration;
        }, { passive: true });

        video.addEventListener('play', showControls);
        video.addEventListener('pause', () => {
            clearTimeout(hideControlsTimeout);
            controls.style.opacity = '1';
            controls.style.pointerEvents = 'auto';
            wrapper.style.cursor = 'default';
        });
    }

    function initSettings() {
        const defaultSettings = {
            email: "uhvcell@nbkrist.org",
            phone: "+91 89858 42025",
            address: "Vidyanagar, Nellore District",
            correspondent: "SRI N.RAM KUMAR"
        };

        const publishedSettings = window.UHV_SITE_SETTINGS || null;
        const localSettings = localStorage.getItem('uhv_settings');
        const settings = publishedSettings
            || (localSettings ? JSON.parse(localSettings) : defaultSettings);

        // Apply Dynamic Theme Colors if specified in CMS Settings
        if (settings.primaryColor) {
            document.documentElement.style.setProperty('--primary', settings.primaryColor);
        }
        if (settings.secondaryColor) {
            document.documentElement.style.setProperty('--secondary', settings.secondaryColor);
        }
        if (settings.accentColor) {
            document.documentElement.style.setProperty('--accent', settings.accentColor);
        }

        // Apply Correspondent Name
        document.querySelectorAll('.correspondent-name').forEach(el => {
            el.textContent = settings.correspondent || defaultSettings.correspondent;
        });

        // Apply Email links and text
        document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
            el.href = `mailto:${settings.email || defaultSettings.email}`;
            el.textContent = settings.email || defaultSettings.email;
        });
        document.querySelectorAll('.footer-col p').forEach(el => {
            if (el.textContent.includes('@nbkrist.org') || el.textContent.includes(defaultSettings.email)) {
                el.textContent = settings.email || defaultSettings.email;
            }
        });

        // Apply Phone numbers
        document.querySelectorAll('.footer-col p').forEach(el => {
            if (el.textContent.includes('+91') || el.textContent.includes('89858') || el.textContent.includes('8985842025') || el.textContent.includes(defaultSettings.phone)) {
                el.textContent = settings.phone || defaultSettings.phone;
            }
        });
        document.querySelectorAll('.info-content p').forEach(el => {
            if (el.querySelector('a')) return;
            const text = el.textContent;
            if (text.includes('+91') || text.includes('89858') || text.includes('8985842025')) {
                el.textContent = settings.phone || defaultSettings.phone;
            }
        });

        // Apply Address
        document.querySelectorAll('.footer-col p').forEach(el => {
            if (el.textContent.includes('Vidyanagar') || el.textContent.includes(defaultSettings.address)) {
                el.textContent = settings.address || defaultSettings.address;
            }
        });

        // Dynamic Navigation Items if window.UHV_NAVIGATION is available
        if (window.UHV_NAVIGATION && window.UHV_NAVIGATION.items) {
            const navLinksUl = document.querySelector('.nav-links');
            if (navLinksUl) {
                const currentPath = window.location.pathname.split('/').pop() || 'index.html';
                const appDownloadLi = navLinksUl.querySelector('.download-item');
                navLinksUl.innerHTML = window.UHV_NAVIGATION.items.map(item => `
                    <li><a href="${item.href}" class="${currentPath === item.href ? 'active' : ''}">${item.label}</a></li>
                `).join('') + (appDownloadLi ? appDownloadLi.outerHTML : '');
            }
        }
    }

    function init() {
        initMobileMenu();
        initAppMode();
        initYear();
        initLazyImages();
        initTimerPause();
        initTouchMarqueePause();
        initVideoModal();
        initSettings();
        updateHeaderOffset();

        // --- CMS Injector Logic ---
        if (!window.UHV_PAGES) return;

        let path = window.location.pathname.split('/').pop() || 'index.html';
        let pageName = path.replace('.html', '');
        if (pageName === 'index') pageName = 'home';

        const pageData = window.UHV_PAGES[pageName];
        if (!pageData) return;

        function getNestedValue(obj, path) {
            if (!path || !obj) return undefined;
            return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        }

        document.querySelectorAll('[data-cms-bind]').forEach(el => {
            const keyPath = el.getAttribute('data-cms-bind');
            const value = getNestedValue(pageData, keyPath);
            if (value !== undefined && value !== null) {
                if (el.tagName === 'IMG') {
                    if (value.includes('pinterest.com/pin/') || value.includes('pin.it/')) {
                        const a = document.createElement('a');
                        a.setAttribute('data-pin-do', 'embedPin');
                        a.href = value;
                        el.parentNode.replaceChild(a, el);
                        if (!window.PinterestWidgetLoaded) {
                            const script = document.createElement('script');
                            script.async = true;
                            script.defer = true;
                            script.src = '//assets.pinterest.com/js/pinit.js';
                            document.head.appendChild(script);
                            window.PinterestWidgetLoaded = true;
                        }
                    } else {
                        el.src = value;
                    }
                } else if (el.tagName === 'A' && el.hasAttribute('href')) {
                    if (el.hasAttribute('data-cms-target') && el.getAttribute('data-cms-target') === 'href') {
                        el.href = value;
                    } else {
                        el.innerHTML = value;
                    }
                } else {
                    el.innerHTML = value;
                }
            }
        });

        document.querySelectorAll('[data-cms-href]').forEach(el => {
            const keyPath = el.getAttribute('data-cms-href');
            const value = getNestedValue(pageData, keyPath);
            if (value) el.href = value;
        });

        document.querySelectorAll('[data-cms-src]').forEach(el => {
            const keyPath = el.getAttribute('data-cms-src');
            const value = getNestedValue(pageData, keyPath);
            if (value) {
                if (el.tagName === 'IMG' && (value.includes('pinterest.com/pin/') || value.includes('pin.it/'))) {
                    const a = document.createElement('a');
                    a.setAttribute('data-pin-do', 'embedPin');
                    a.href = value;
                    el.parentNode.replaceChild(a, el);
                    if (!window.PinterestWidgetLoaded) {
                        const script = document.createElement('script');
                        script.async = true;
                        script.defer = true;
                        script.src = '//assets.pinterest.com/js/pinit.js';
                        document.head.appendChild(script);
                        window.PinterestWidgetLoaded = true;
                    }
                } else {
                    el.src = value;
                }
            }
        });

        document.querySelectorAll('[data-cms-list]').forEach(templateContainer => {
            const keyPath = templateContainer.getAttribute('data-cms-list');
            const arrayData = getNestedValue(pageData, keyPath);

            if (Array.isArray(arrayData) && arrayData.length > 0) {
                const templateItem = templateContainer.querySelector('.cms-list-item') || templateContainer.firstElementChild;
                if (!templateItem) return;

                const templateHtml = templateItem.outerHTML;
                templateContainer.innerHTML = '';

                arrayData.forEach((item) => {
                    let itemHtml = templateHtml;
                    if (typeof item === 'object') {
                        for (const [key, val] of Object.entries(item)) {
                            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                            itemHtml = itemHtml.replace(regex, val || '');
                        }
                    } else if (typeof item === 'string') {
                        itemHtml = itemHtml.replace(/{{\s*value\s*}}/g, item || '');
                    }
                    templateContainer.insertAdjacentHTML('beforeend', itemHtml);
                });
            }
        });
    }

    /* ==========================================================================
       Modern Advanced Web Features & Utilities
       ========================================================================== */

    function initToast() {
        window.UHV = window.UHV || {};
        window.UHV.toast = function (message, icon = 'fa-check') {
            let toastEl = document.getElementById('uhv-toast');
            if (!toastEl) {
                toastEl = document.createElement('div');
                toastEl.id = 'uhv-toast';
                toastEl.className = 'uhv-toast';
                document.body.appendChild(toastEl);
            }
            toastEl.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
            toastEl.classList.add('show');
            setTimeout(() => {
                toastEl.classList.remove('show');
            }, 3000);
        };
    }

    function initScrollReveal() {
        if (!('IntersectionObserver' in window)) return;

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        document.querySelectorAll('.card, .section-title, .section-subtitle, .member-card-box, .team-column-card, .org-node-card').forEach(el => {
            el.classList.add('reveal-item');
            revealObserver.observe(el);
        });
    }

    function initFloatingActions() {
        let container = document.querySelector('.floating-quick-actions');
        if (!container) {
            container = document.createElement('div');
            container.className = 'floating-quick-actions';
            container.innerHTML = `
                <button type="button" class="floating-action-btn" id="btn-share-page" aria-label="Share this page" title="Share page">
                    <i class="fa-solid fa-share-nodes"></i>
                </button>
                <button type="button" class="floating-action-btn" id="btn-back-to-top" aria-label="Back to top" title="Back to top">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
            `;
            document.body.appendChild(container);
        }

        const backToTopBtn = container.querySelector('#btn-back-to-top');
        const shareBtn = container.querySelector('#btn-share-page');

        if (backToTopBtn) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    backToTopBtn.classList.add('visible');
                } else {
                    backToTopBtn.classList.remove('visible');
                }
            }, { passive: true });

            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        if (shareBtn) {
            shareBtn.classList.add('visible');
            shareBtn.addEventListener('click', async () => {
                const shareData = {
                    title: document.title || 'UHV CELL NBKRIST',
                    text: 'Explore Universal Human Values Cell at NBKRIST',
                    url: window.location.href
                };

                if (navigator.share) {
                    try {
                        await navigator.share(shareData);
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            copyCurrentUrl();
                        }
                    }
                } else {
                    copyCurrentUrl();
                }
            });
        }

        function copyCurrentUrl() {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    if (window.UHV && window.UHV.toast) {
                        window.UHV.toast('Page link copied to clipboard!', 'fa-link');
                    }
                });
            }
        }
    }

    function initServiceWorker() {
        if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').then((reg) => {
                    console.log('UHV PWA Service Worker active:', reg.scope);
                }).catch((err) => {
                    console.debug('Service worker registration note:', err);
                });
            });
        }
    }

    function initAll() {
        init();
        initToast();
        initScrollReveal();
        initFloatingActions();
        initServiceWorker();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
})();

