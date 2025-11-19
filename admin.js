// Configuration
const CONFIG = {
    // IMPORTANT: Replace this with your Google Apps Script Web App URL
    // Instructions in SETUP_GUIDE.md
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyFM7_xchF7Ar1d4qR13eMVJpO38D8fbc2KHnPZ5_mmz9UGaUfQ0z_5WfP_qtjzlBQFCQ/exec',
    
    // Change this password! (stored in localStorage)
    ADMIN_PASSWORD: 'WesterlyNov22!'
};

// Check if user is logged in
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
        loadSettings();
        loadConfirmations();
    }
});

// Password handling
function handlePasswordKeypress(event) {
    if (event.key === 'Enter') {
        checkPassword();
    }
}

function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    const error = document.getElementById('loginError');
    
    if (input === CONFIG.ADMIN_PASSWORD) {
        localStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
        loadSettings();
        loadConfirmations();
    } else {
        error.style.display = 'block';
        setTimeout(() => {
            error.style.display = 'none';
        }, 3000);
    }
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    location.reload();
}

// Settings
function saveSettings() {
    const logoUrl = document.getElementById('logoUrl').value;
    const customDomain = document.getElementById('customDomain').value;
    
    localStorage.setItem('logoUrl', logoUrl);
    localStorage.setItem('customDomain', customDomain);
    
    document.getElementById('settingsSaved').style.display = 'block';
    setTimeout(() => {
        document.getElementById('settingsSaved').style.display = 'none';
    }, 3000);
}

function loadSettings() {
    const logoUrl = localStorage.getItem('logoUrl') || '';
    const customDomain = localStorage.getItem('customDomain') || 'confirmaddress.app';
    
    document.getElementById('logoUrl').value = logoUrl;
    document.getElementById('customDomain').value = customDomain;
}

// Create Form
async function createForm() {
    const name = document.getElementById('recipientName').value.trim();
    const address = document.getElementById('preFilledAddress').value.trim();
    
    if (!name) {
        alert('Please enter a recipient name');
        return;
    }
    
    // Generate code from name
    const code = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    
    // Get settings
    const logoUrl = localStorage.getItem('logoUrl') || '';
    const customDomain = localStorage.getItem('customDomain') || 'confirmaddress.app';
    
    // Show loading state
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Creating...';
    button.disabled = true;
    
    try {
        // Call Google Apps Script
        const response = await fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'createForm',
                name: name,
                address: address,
                code: code,
                logoUrl: logoUrl
            })
        });
        
        // Since we're using no-cors, we can't read the response
        // We'll assume it worked and show the URL
        
        // Generate URL
        const baseUrl = customDomain.startsWith('http') ? customDomain : `https://${customDomain}`;
        const url = `${baseUrl}/confirm.html?code=${code}`;
        
        // Show result
        document.getElementById('generatedUrl').value = url;
        document.getElementById('linkResult').style.display = 'block';
        
        // Hide form
        document.querySelector('.card:nth-child(3)').style.display = 'none';
        
    } catch (error) {
        console.error('Error creating form:', error);
        alert('Error creating form. Please check your Google Apps Script URL in config.js');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

function resetForm() {
    document.getElementById('recipientName').value = '';
    document.getElementById('preFilledAddress').value = '';
    document.getElementById('linkResult').style.display = 'none';
    document.querySelector('.card:nth-child(3)').style.display = 'block';
    loadConfirmations(); // Refresh list
}

function copyLink() {
    const input = document.getElementById('generatedUrl');
    input.select();
    input.setSelectionRange(0, 99999); // For mobile
    
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = 'Copy';
        }, 2000);
    });
}

// Load Confirmations
async function loadConfirmations() {
    const list = document.getElementById('confirmationsList');
    list.innerHTML = '<p class="loading">Loading...</p>';
    
    try {
        // Call Google Apps Script to get data
        const response = await fetch(`${CONFIG.SCRIPT_URL}?action=getConfirmations`);
        const data = await response.json();
        
        if (data.confirmations && data.confirmations.length > 0) {
            // Sort by date, most recent first
            data.confirmations.sort((a, b) => new Date(b.created) - new Date(a.created));
            
            // Show only last 10
            const recent = data.confirmations.slice(0, 10);
            
            list.innerHTML = recent.map(item => `
                <div class="confirmation-item">
                    <h3>${item.name}</h3>
                    <p>${item.status === 'confirmed' ? item.confirmedAddress : 'Pending confirmation...'}</p>
                    <p><span class="status-${item.status}">${item.status === 'confirmed' ? '✓ Confirmed' : 'Pending'}</span> • ${formatDate(item.created)}</p>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p class="loading">No confirmations yet. Create your first link above!</p>';
        }
    } catch (error) {
        console.error('Error loading confirmations:', error);
        list.innerHTML = '<p class="loading">Unable to load confirmations. Make sure your Google Apps Script is set up correctly.</p>';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

function openGoogleSheet() {
    // This URL will be different for each user - they need to replace it
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1a9pHl6nLzZlCelmJyvSfk0EDGFx7XHorTO8kWdXgd14/edit';
    window.open(sheetUrl, '_blank');
}
