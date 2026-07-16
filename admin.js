document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus();
    checkAppMode();
});

function checkAdminStatus() {
    // Use same key as admin-panel.html
    const isLoggedIn = localStorage.getItem('uhvAdminLoggedIn') === 'true';
    const body = document.body;

    if (isLoggedIn) {
        body.classList.add('admin-mode');

        // Add floating Admin Toolbar
        if (!document.querySelector('.admin-toolbar')) {
            const adminName = localStorage.getItem('uhvAdminName') || 'Admin';
            const toolbar = document.createElement('div');
            toolbar.className = 'admin-toolbar';
            toolbar.style.cssText = 'display:flex; align-items:center; gap:12px;';
            toolbar.innerHTML = `
                <i class="fa-solid fa-shield-halved" style="color:var(--primary);"></i>
                <span style="color: var(--white); font-weight: bold; font-size:0.9rem;">Hi, ${adminName}</span>
                <a href="admin-panel.html" class="btn btn-primary" style="padding: 5px 15px; font-size: 0.8rem; text-decoration: none;">
                    <i class="fa-solid fa-gauge-high"></i> Dashboard
                </a>
                <button onclick="logoutAdmin()" class="btn btn-secondary" style="padding: 5px 15px; font-size: 0.8rem; cursor: pointer;">
                    <i class="fa-solid fa-sign-out-alt"></i> Logout
                </button>
            `;
            body.appendChild(toolbar);
        }
    } else {
        body.classList.remove('admin-mode');
    }
}

function logoutAdmin() {
    // Clear both keys to ensure full logout
    localStorage.removeItem('uhvAdminLoggedIn');
    localStorage.removeItem('uhvAdminName');
    window.location.reload();
}

function checkAppMode() {
    // Hide download button when running inside Android WebView app
    if (navigator.userAgent.includes('MyWebsiteAndroidApp')) {
        document.querySelectorAll('.download-item').forEach(item => {
            item.style.display = 'none';
        });
    }
}

// Export functions for inline event handlers
window.logoutAdmin = logoutAdmin;
window.checkAdminStatus = checkAdminStatus;
