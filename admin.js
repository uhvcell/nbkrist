document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus();
    checkAppMode();
});

function checkAdminStatus() {
    const isLoggedIn = localStorage.getItem('uhvAdminLoggedIn') === 'true';
    const body = document.body;

    if (isLoggedIn) {
        body.classList.add('admin-mode');

        // Add Admin Toolbar/Floating Action Button
        if (!document.querySelector('.admin-toolbar')) {
            const adminName = localStorage.getItem('uhvAdminName') || 'Admin';
            const toolbar = document.createElement('div');
            toolbar.className = 'admin-toolbar';
            toolbar.innerHTML = `
                <span style="color: var(--white); font-weight: bold; margin-right: 10px;">Hi, ${adminName} (Edit Mode)</span>
                <button onclick="logoutAdmin()" class="btn btn-secondary" style="padding: 5px 15px; font-size: 0.8rem;">Logout</button>
            `;
            body.appendChild(toolbar);
        }

        // Make text elements editable
        const editableSelectors = 'h1, h2, h3, p, span, .profile-name, .profile-role, .profile-detail';
        const elements = document.querySelectorAll(editableSelectors);

        elements.forEach(el => {
            // Avoid editing structural/nav elements to prevent breaking layout
            if (!el.closest('.nav-links') && !el.closest('script')) {
                el.setAttribute('contenteditable', 'true');
                el.setAttribute('title', 'Click to edit');
            }
        });

        // Image Editing Hint (Simulated)
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.style.cursor = 'pointer';
            img.setAttribute('title', 'Admin: Click to replace image (Demo)');
            img.addEventListener('click', (e) => {
                if (e.ctrlKey || confirm('Admin Action: Replace this image?\n(This is a demo. In a real app, a file uploader would appear.)')) {
                    // Demo action
                    // img.src = prompt('Enter new image URL:', img.src) || img.src;
                }
            });
        });
    } else {
        body.classList.remove('admin-mode');
    }
}

function logoutAdmin() {
    localStorage.removeItem('uhvAdminLoggedIn');
    window.location.reload();
}

function checkAppMode() {
    // Check for custom User-Agent set by Android App
    if (navigator.userAgent.includes("MyWebsiteAndroidApp")) {
        const downloadItems = document.querySelectorAll('.download-item');
        downloadItems.forEach(item => {
            item.style.display = 'none';
        });
    }
}
// Export functions to window for inline event handlers
window.logoutAdmin = logoutAdmin;
window.checkAdminStatus = checkAdminStatus;
