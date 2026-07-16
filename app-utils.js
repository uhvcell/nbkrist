/**
 * App Detection & Utils
 * Mobile menu, video modal, app mode, and shared UI helpers.
 */
(function () {
    if (window.__uhvAppUtilsInit) return;
    window.__uhvAppUtilsInit = true;

    const DM_SDK = 'https://geo.dailymotion.com/libs/player/x8p5u.js';
    let dmSdkPromise = null;

    function loadDailymotionSDK() {
        if (typeof dailymotion !== 'undefined') return Promise.resolve();
        if (dmSdkPromise) return dmSdkPromise;

        dmSdkPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-dm-sdk="true"]');
            if (existing) {
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error('Dailymotion SDK failed')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = DM_SDK;
            script.defer = true;
            script.dataset.dmSdk = 'true';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Dailymotion SDK failed'));
            document.head.appendChild(script);
        });

        return dmSdkPromise;
    }

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
        window.dmPlayer = null;

        window.openVideo = async function (video) {
            const modal = document.getElementById('videoModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalDesc = document.getElementById('modalDesc');
            const playerContainer = document.getElementById('dailymotion-player');

            if (!modal || !playerContainer || !video?.videoUrl) return;

            modalTitle.textContent = video.title || 'Video';
            modalDesc.textContent = video.description || '';
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            playerContainer.innerHTML = '';
            window.dmPlayer = null;

            // Normalize and parse input (it can be an iframe code or standard link)
            let embedUrl = video.videoUrl.trim();
            const iframeMatch = embedUrl.match(/src=["']([^"']+)["']/i);
            if (iframeMatch) {
                embedUrl = iframeMatch[1];
            }

            // Clean Dailymotion links to directly embed
            if (embedUrl.includes('dailymotion.com/video/')) {
                const parts = embedUrl.split('/video/');
                const id = parts[parts.length - 1].split('?')[0];
                embedUrl = `https://geo.dailymotion.com/player/x8p5u.html?video=${id}&autoplay=1`;
            } else if (embedUrl.includes('dailymotion.com') && embedUrl.includes('video=')) {
                const match = embedUrl.match(/video=([^&]+)/);
                if (match) {
                    embedUrl = `https://geo.dailymotion.com/player/x8p5u.html?video=${match[1]}&autoplay=1`;
                }
            }

            // Auto-append autoplay flags if supported
            if (embedUrl.includes('archive.org/embed/') && !embedUrl.includes('autoplay=1')) {
                embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1';
            }

            // Create wrapper with a transparent security shield to prevent right clicks and external link intercepts
            playerContainer.style.position = 'relative';
            playerContainer.style.overflow = 'hidden';
            playerContainer.style.background = '#000';

            playerContainer.innerHTML = `
                <div class="secure-player-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 10; border: 1px solid rgba(40, 247, 255, 0.2);"></div>
                
                <!-- Transparent Right Click Blockers -->
                <div class="secure-player-shield" style="position: absolute; inset: 0; z-index: 5; background: transparent;"></div>
                
                <iframe 
                    src="${embedUrl}" 
                    style="width: 100%; height: 100%; border: none; position: absolute; left: 0; top: 0; z-index: 1;" 
                    allow="autoplay; fullscreen; picture-in-picture" 
                    allowfullscreen
                    sandbox="allow-scripts allow-same-origin allow-presentation">
                </iframe>
            `;

            // Disable Context Menu (Right Click to Save Video)
            const shield = playerContainer.querySelector('.secure-player-shield');
            if (shield) {
                shield.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });

                // Let clicks pass through for playback controls but intercept branding area coordinates (top right/bottom right)
                // to prevent external page redirects
                shield.addEventListener('click', (e) => {
                    const rect = shield.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    // Logo redirect hotspots (top-right corner & bottom-right corner)
                    const isHotspot = (x > rect.width - 90 && y < 50) || (x > rect.width - 90 && y > rect.height - 55) || (x < 90 && y < 50);
                    if (isHotspot) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });
            }
        };

        const closeModal = document.querySelector('.close-modal');
        const modal = document.getElementById('videoModal');

        const hideModal = () => {
            if (!modal) return;
            modal.style.display = 'none';
            if (window.dmPlayer) {
                try { window.dmPlayer.pause(); } catch (e) { /* ignore */ }
                window.dmPlayer = null;
            }
            // Clear player container to stop any active video and free resources
            const playerContainer = document.getElementById('dailymotion-player');
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

    function initSettings() {
        const defaultSettings = {
            email: "uhvcell@nbkrist.org",
            phone: "+91 89858 42025",
            address: "Vidyanagar, Nellore District",
            correspondent: "SRI N.RAM KUMAR"
        };

        const localSettings = localStorage.getItem('uhv_settings');
        const settings = localSettings ? JSON.parse(localSettings) : defaultSettings;

        // Apply Correspondent Name
        document.querySelectorAll('.correspondent-name').forEach(el => {
            el.textContent = settings.correspondent || defaultSettings.correspondent;
        });

        // Apply Email links and text
        document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
            el.href = `mailto:${settings.email || defaultSettings.email}`;
            el.textContent = settings.email || defaultSettings.email;
        });
        // General text emails
        document.querySelectorAll('.footer-col p').forEach(el => {
            if (el.textContent.includes('@nbkrist.org') || el.textContent.includes(defaultSettings.email)) {
                el.textContent = settings.email || defaultSettings.email;
            }
        });

        // Apply Phone numbers (footer + contact info section)
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

        // Apply Address (footer only — contact page keeps its detailed address)
        document.querySelectorAll('.footer-col p').forEach(el => {
            if (el.textContent.includes('Vidyanagar') || el.textContent.includes(defaultSettings.address)) {
                el.textContent = settings.address || defaultSettings.address;
            }
        });
    }

    function init() {
        initSettings();
        initAppMode();
        updateHeaderOffset();
        initMobileMenu();
        initYear();
        initLazyImages();
        initTimerPause();
        initTouchMarqueePause();
        initVideoModal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
