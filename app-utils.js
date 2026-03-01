/**
 * App Detection & Utils
 * Handles hiding the download button when viewed inside the Android app
 * and common UI interactions like the mobile menu.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Check for custom User-Agent set by Android App
    if (navigator.userAgent.includes("MyWebsiteAndroidApp")) {
        document.body.classList.add('is-app');
        console.log("App detected: MyWebsiteAndroidApp");
    }

    // 2. Mobile Menu Toggle Logic
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('active');
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });

        // Close menu when clicking anywhere else
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
    }
    // 3. Auto-update Current Year
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // 4. Universal Video Player Logic
    // This makes the Pro-Level Dailymotion player the default for all videos sitewide.
    window.dmPlayer = null;

    window.openVideo = async function (video) {
        const modal = document.getElementById('videoModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalDesc = document.getElementById('modalDesc');

        if (!modal) return;

        modalTitle.innerText = video.title;
        modalDesc.innerText = video.description;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        const videoId = video.videoUrl.split('video=')[1].split('&')[0];
        const playerContainer = document.getElementById('dailymotion-player');

        if (!playerContainer) return;

        // Reset container to ensure a fresh player instance for every click
        playerContainer.innerHTML = '';
        window.dmPlayer = null;

        if (typeof dailymotion !== 'undefined') {
            dailymotion.createPlayer('dailymotion-player', {
                video: videoId,
                player: 'x8p5u',
                params: {
                    autoplay: true,
                    mute: false,
                    controls: true
                    // Default settings allow for monetization/ads
                }
            }).then((p) => {
                window.dmPlayer = p;
                // Auto-fullscreen on play
                window.dmPlayer.on(dailymotion.events.PLAYER_PLAY, () => {
                    window.dmPlayer.setFullscreen(true);
                });
            }).catch(err => console.error("Video player error:", err));
        }
    };

    // Global Modal Close Handlers
    const closeModal = document.querySelector('.close-modal');
    const modal = document.getElementById('videoModal');

    if (closeModal) {
        closeModal.onclick = () => {
            if (modal) modal.style.display = 'none';
            if (window.dmPlayer) window.dmPlayer.pause();
            document.body.style.overflow = 'auto';
        };
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            if (closeModal) closeModal.onclick();
        }
    };

    // 5. Global Download App Link
    document.querySelectorAll('.btn-download-app').forEach(btn => {
        btn.href = "https://emotionallytonightintelligent.com/yefth1e9e?key=672ebfd27cb3a77872d539957b23a796";
        btn.target = "_blank";
    });
});
