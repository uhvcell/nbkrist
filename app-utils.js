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

        window.addEventListener('resize', () => {
            updateHeaderOffset();
            if (window.innerWidth > 1200) closeMenu();
        });
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
            if (!img.closest('header')) img.loading = 'lazy';
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

            const match = video.videoUrl.match(/video=([^&]+)/);
            const videoId = match ? match[1] : null;
            if (!videoId) return;

            playerContainer.innerHTML = '';
            window.dmPlayer = null;

            try {
                await loadDailymotionSDK();
                const player = await dailymotion.createPlayer('dailymotion-player', {
                    video: videoId,
                    player: 'x8p5u',
                    params: { autoplay: true, mute: false, controls: true }
                });
                window.dmPlayer = player;
                window.dmPlayer.on(dailymotion.events.PLAYER_PLAY, () => {
                    window.dmPlayer.setFullscreen(true);
                });
            } catch (err) {
                console.error('Video player error:', err);
            }
        };

        const closeModal = document.querySelector('.close-modal');
        const modal = document.getElementById('videoModal');

        const hideModal = () => {
            if (!modal) return;
            modal.style.display = 'none';
            if (window.dmPlayer) window.dmPlayer.pause();
            document.body.style.overflow = '';
        };

        if (closeModal) closeModal.addEventListener('click', hideModal);

        window.addEventListener('click', (event) => {
            if (event.target === modal) hideModal();
        });
    }

    function init() {
        initAppMode();
        updateHeaderOffset();
        initMobileMenu();
        initYear();
        initLazyImages();
        initVideoModal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
