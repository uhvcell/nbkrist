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

    // Performance utilities
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
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

        const closeMenu = () => {
            setMenuOpen(false);
            // Return focus to the toggle for keyboard users.
            if (document.body.classList.contains('menu-was-open')) {
                menuToggle.focus();
                document.body.classList.remove('menu-was-open');
            }
        };
        const openMenu = () => {
            updateHeaderOffset();
            setMenuOpen(true);
            document.body.classList.add('menu-was-open');
            // Move focus to the first nav link in the drawer.
            const firstLink = navLinks.querySelector('a');
            if (firstLink) firstLink.focus();
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

        // Swipe-to-close gesture
        let touchStartX = 0;
        navLinks.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        navLinks.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            if (touchEndX - touchStartX > 50) {
                closeMenu();
            }
        }, { passive: true });

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

    async function ensureVideoPlayerLoaded() {
        if (window.UHVVideoPlayer) return true;
        if (!document.querySelector('link[href*="video-player.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'video-player.css';
            document.head.appendChild(link);
        }
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'video-player.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    }

    function initVideoModal() {
        window.openVideo = async function (video) {
            if (!video) return;
            const hasSource = video.videoUrl || video.videoId || video.id || (video.sources && video.sources.length > 0);
            if (!hasSource) return;

            let modal = document.getElementById('videoModal');
            let playerContainer = document.getElementById('custom-player-container') || document.getElementById('dailymotion-player');

            // If modal doesn't exist on page, create it dynamically
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'videoModal';
                modal.className = 'video-modal';
                modal.style.cssText = 'display:none; position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,0.95); backdrop-filter:blur(10px); align-items:center; justify-content:center; padding:15px; overflow-y:auto;';
                modal.innerHTML = `
                    <div class="video-modal-content" style="background:#111; border-radius:16px; overflow:hidden; max-width:1000px; width:100%; position:relative; box-shadow:0 0 50px rgba(0,243,255,0.2); border:1px solid rgba(0,243,255,0.2); display:flex; flex-direction:column; margin:auto;">
                        <button class="close-modal" aria-label="Close video" style="position:absolute; right:15px; top:15px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:38px; height:38px; cursor:pointer; font-size:1.2rem; z-index:30; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-xmark"></i></button>
                        <div class="video-container" style="position:relative; width:100%; aspect-ratio:16/9; background:#000; flex-shrink:0;">
                            <div id="custom-player-container" style="position:absolute; inset:0; width:100%; height:100%;"></div>
                        </div>
                        <div class="video-info" style="padding:20px;">
                            <h3 id="modalTitle" style="color:var(--primary, #00f3ff); margin-bottom:8px;"></h3>
                            <p id="modalDesc" style="color:#94a3b8; font-size:0.9rem;"></p>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                playerContainer = modal.querySelector('#custom-player-container');

                const doClose = () => {
                    modal.style.display = 'none';
                    if (window.currentVideoPlayer) {
                        try {
                            if (window.currentVideoPlayer.video) window.currentVideoPlayer.video.pause();
                            if (window.currentVideoPlayer.destroy) window.currentVideoPlayer.destroy();
                        } catch (e) { /* noop */ }
                        window.currentVideoPlayer = null;
                    }
                    if (playerContainer) playerContainer.innerHTML = '';
                    document.body.style.overflow = '';
                };

                const closeBtn = modal.querySelector('.close-modal');
                if (closeBtn) closeBtn.addEventListener('click', doClose);
                window.addEventListener('click', (e) => { if (e.target === modal) doClose(); });
            }

            const modalTitle = modal.querySelector('#modalTitle') || document.getElementById('modalTitle');
            const modalDesc = modal.querySelector('#modalDesc') || document.getElementById('modalDesc');

            if (modalTitle) modalTitle.textContent = video.title || 'Video Resource';
            if (modalDesc) modalDesc.textContent = video.description || '';
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // Ensure player script is loaded
            await ensureVideoPlayerLoaded();

            if (!playerContainer) {
                playerContainer = modal.querySelector('#custom-player-container') || modal.querySelector('#dailymotion-player') || modal.querySelector('.video-container');
            }

            if (!playerContainer) return;
            playerContainer.innerHTML = ''; // Clear loading state

            try {
                const normalizedVideo = { ...video };

                if (window.UHVVideoUtils && window.UHVVideoUtils.resolveVideoThumbnail && !normalizedVideo.thumbnail) {
                    normalizedVideo.thumbnail = window.UHVVideoUtils.resolveVideoThumbnail(normalizedVideo);
                }

                // Create the player instance
                window.currentVideoPlayer = new window.UHVVideoPlayer(playerContainer, normalizedVideo);

                // Auto-play the native player if applicable
                if (window.currentVideoPlayer.video) {
                    window.currentVideoPlayer.video.play().catch(e => console.log('Autoplay prevented:', e));
                }
            } catch (err) {
                console.error("Video Player Error:", err);
                playerContainer.innerHTML = '<div style="color:#ff4d4d; padding:30px; text-align:center;"><i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;margin-bottom:10px;display:block;"></i>Failed to initialize video player. Please check your network connection.</div>';
            }
        };

        // Global click handler for video links (Dailymotion & Internet Archive)
        document.addEventListener('click', (e) => {
          const link = e.target.closest('a');
          if (!link || !link.href) return;
          const href = link.href;
          if (/dailymotion\.com|geo\.dailymotion\.com|archive\.org/.test(href)) {
            e.preventDefault();
            const videoObj = { videoUrl: href };
            if (typeof window.openVideo === 'function') {
              window.openVideo(videoObj);
            }
          }
        });

        const hideModal = () => {
            const modal = document.getElementById('videoModal');
            if (!modal) return;
            modal.style.display = 'none';
            if (window.currentVideoPlayer) {
                try {
                    if (window.currentVideoPlayer.video) window.currentVideoPlayer.video.pause();
                    if (window.currentVideoPlayer.destroy) window.currentVideoPlayer.destroy();
                } catch (e) { /* noop */ }
                window.currentVideoPlayer = null;
            }
            const playerContainer = document.getElementById('custom-player-container') || document.getElementById('dailymotion-player');
            if (playerContainer) playerContainer.innerHTML = '';
            document.body.style.overflow = '';
        };

        const closeModalButtons = document.querySelectorAll('.close-modal');
        closeModalButtons.forEach(btn => btn.addEventListener('click', hideModal));

        const existingModal = document.getElementById('videoModal');
        if (existingModal) {
            existingModal.addEventListener('click', (event) => {
                if (event.target === existingModal) hideModal();
            });
        }

        document.addEventListener('keydown', (event) => {
            const modal = document.getElementById('videoModal');
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

        // Branding via stable CMS hooks (preferred over substring guessing).
        if (settings.logoMain) {
            document.querySelectorAll('[data-cms-logo="main"]').forEach(el => {
                if (el.tagName === 'IMG') el.src = settings.logoMain;
            });
        }
        if (settings.logoSecondary) {
            document.querySelectorAll('[data-cms-logo="second"]').forEach(el => {
                if (el.tagName === 'IMG') el.src = settings.logoSecondary;
            });
        }
        if (settings.siteName) {
            document.querySelectorAll('[data-cms-title]').forEach(el => {
                el.textContent = settings.siteName;
            });
        }
        if (settings.siteSubtitle) {
            document.querySelectorAll('[data-cms-subtitle]').forEach(el => {
                el.textContent = settings.siteSubtitle;
            });
        }
        if (settings.favicon) {
            document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach(el => {
                el.href = settings.favicon;
            });
        }

        // Footer fields via stable hooks (fallback to existing substring logic below).
        document.querySelectorAll('[data-cms-footer="email"]').forEach(el => {
            el.textContent = settings.email || defaultSettings.email;
        });
        document.querySelectorAll('[data-cms-footer="phone"]').forEach(el => {
            el.textContent = settings.phone || defaultSettings.phone;
        });
        document.querySelectorAll('[data-cms-footer="address"]').forEach(el => {
            el.textContent = settings.address || defaultSettings.address;
        });
        document.querySelectorAll('[data-cms-footer="copyright"]').forEach(el => {
            if (settings.copyright) el.textContent = settings.copyright;
        });

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
                const escAttr = (s) => String(s == null ? '' : s)
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                navLinksUl.innerHTML = window.UHV_NAVIGATION.items.map((item, i) => {
                    const isActive = currentPath === item.href;
                    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                    if (!hasChildren) {
                        return `<li><a href="${escAttr(item.href)}"${isActive ? ' class="active" aria-current="page"' : ''}>${escAttr(item.label)}</a></li>`;
                    }
                    // One-level dropdown: keyboard-operable disclosure.
                    const submenuId = `nav-submenu-${i}`;
                    const childActive = item.children.some(ch => ch.href === currentPath);
                    const kids = item.children.map(ch => {
                        const chActive = ch.href === currentPath;
                        return `<li><a href="${escAttr(ch.href)}"${chActive ? ' class="active" aria-current="page"' : ''}>${escAttr(ch.label)}</a></li>`;
                    }).join('');
                    return `<li class="nav-has-children">
                        <button type="button" class="nav-dropdown-toggle${(isActive || childActive) ? ' active' : ''}" aria-expanded="false" aria-controls="${submenuId}">${escAttr(item.label)} <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button>
                        <ul class="nav-submenu" id="${submenuId}">${kids}</ul>
                    </li>`;
                }).join('') + (appDownloadLi ? appDownloadLi.outerHTML : '');

                // Wire dropdown behavior (keyboard + outside-click close).
                navLinksUl.querySelectorAll('.nav-has-children').forEach(li => {
                    const btn = li.querySelector('.nav-dropdown-toggle');
                    const submenu = li.querySelector('.nav-submenu');
                    if (!btn || !submenu) return;
                    const setOpen = (open) => {
                        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                        li.classList.toggle('open', open);
                    };
                    btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
                    btn.addEventListener('keydown', (e) => {
                        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); const a = submenu.querySelector('a'); if (a) a.focus(); }
                        else if (e.key === 'Escape') { setOpen(false); btn.focus(); }
                    });
                    submenu.addEventListener('keydown', (e) => {
                        const links = Array.from(submenu.querySelectorAll('a'));
                        const idx = links.indexOf(document.activeElement);
                        if (e.key === 'ArrowDown') { e.preventDefault(); if (links[idx + 1]) links[idx + 1].focus(); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) links[idx - 1].focus(); else btn.focus(); }
                        else if (e.key === 'Escape') { setOpen(false); btn.focus(); }
                    });
                    li.addEventListener('focusout', (e) => {
                        if (!li.contains(e.relatedTarget)) setOpen(false);
                    });
                    document.addEventListener('click', (e) => {
                        if (!li.contains(e.target)) setOpen(false);
                    });
                });
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

        // Remove any {{...}} placeholder that survived substitution, both in element
        // text and in attribute values, so an unresolved token can never render as a
        // literal src/text node again. Scoped to a single rendered list item.
        function stripUnresolvedTokens(rootEl) {
            if (!rootEl) return;
            const TOKEN = /{{\s*[\w.$-]+\s*}}/g;
            // Attribute values across the item and its descendants.
            const scope = [rootEl, ...rootEl.querySelectorAll('*')];
            scope.forEach((el) => {
                for (const attr of Array.from(el.attributes)) {
                    if (attr.value.indexOf('{{') === -1) continue;
                    const cleaned = attr.value.replace(TOKEN, '');
                    if (attr.name === 'src' && cleaned.trim() === '') {
                        // An emptied src would resolve to the page URL; drop it so the
                        // standard placeholder/onerror handling applies instead.
                        el.removeAttribute('src');
                    } else {
                        el.setAttribute(attr.name, cleaned);
                    }
                }
            });
            // Text nodes.
            const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
            let node;
            while ((node = walker.nextNode())) {
                if (node.nodeValue.indexOf('{{') !== -1) {
                    node.nodeValue = node.nodeValue.replace(TOKEN, '');
                }
            }
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

                // Token matcher: supports dotted/indexed paths like {{images.0}} and
                // nested objects, resolved via the same getNestedValue helper used by
                // data-cms-bind / data-cms-src / data-cms-href.
                const TOKEN_RE = /{{\s*([\w.$-]+)\s*}}/g;

                arrayData.forEach((item) => {
                    let itemHtml = templateHtml;
                    if (item && typeof item === 'object') {
                        // Resolve EVERY placeholder path against the item (not just
                        // top-level keys), so dotted/indexed paths like {{images.0}}
                        // and {{nested.key}} resolve. A bare {{title}} is just a
                        // 1-segment path, so top-level keys keep working.
                        itemHtml = itemHtml.replace(TOKEN_RE, (match, path) => {
                            // {{value}} and {{index}} are reserved for data-cms-each
                            // sub-templates and are resolved during that expansion
                            // (below), so leave them intact here.
                            if (path === 'value' || path === 'index') return match;
                            const resolved = getNestedValue(item, path);
                            return resolved === undefined || resolved === null ? '' : String(resolved);
                        });
                    } else if (typeof item === 'string') {
                        // Primitive string arrays keep the {{value}} contract.
                        itemHtml = itemHtml.replace(/{{\s*value\s*}}/g, item || '');
                    }

                    templateContainer.insertAdjacentHTML('beforeend', itemHtml);
                    const itemEl = templateContainer.lastElementChild;
                    if (!itemEl) return;

                    // Generic nested-array expansion: any element carrying
                    // data-cms-each="<path>" is treated as a sub-template whose first
                    // element child is cloned once per entry of the array at <path>
                    // (resolved relative to the current item). Inside each clone,
                    // {{value}} is the entry and {{index}} is its position. This lets
                    // the workshops gallery render exactly as many <img> as the day has.
                    if (item && typeof item === 'object') {
                        itemEl.querySelectorAll('[data-cms-each]').forEach((container) => {
                            const eachPath = container.getAttribute('data-cms-each');
                            const list = getNestedValue(item, eachPath);
                            container.removeAttribute('data-cms-each');
                            const cloneTemplate = container.firstElementChild;
                            if (!cloneTemplate) return;
                            const cloneHtml = cloneTemplate.outerHTML;
                            container.innerHTML = '';
                            if (Array.isArray(list)) {
                                list.forEach((entry, index) => {
                                    const html = cloneHtml
                                        .replace(/{{\s*value\s*}}/g, entry === undefined || entry === null ? '' : String(entry))
                                        .replace(/{{\s*index\s*}}/g, String(index));
                                    container.insertAdjacentHTML('beforeend', html);
                                });
                            }
                        });
                    }

                    // Prevent-recurrence safeguard: strip any placeholder that did not
                    // resolve so no literal {{token}} can ever survive into the DOM
                    // (neither as element text nor as an attribute value such as src).
                    stripUnresolvedTokens(itemEl);
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
            window.addEventListener('scroll', throttle(() => {
                if (window.scrollY > 300) {
                    backToTopBtn.classList.add('visible');
                } else {
                    backToTopBtn.classList.remove('visible');
                }
            }, 100), { passive: true });

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

