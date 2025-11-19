// Configuration
const CONFIG = {
    // Your Google Apps Script Web App URL
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyFM7_xchF7Ar1d4qR13eMVJpO38D8fbc2KHnPZ5_mmz9UGaUfQ0z_5WfP_qtjzlBQFCQ/exec'
};

// Get code from URL
function getCodeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('code');
}

// Load form data on page load
window.addEventListener('DOMContentLoaded', async () => {
    const code = getCodeFromURL();
    
    if (!code) {
        showNotFound();
        return;
    }
    
    await loadFormData(code);
});

// Load form data from Google Sheets
async function loadFormData(code) {
    try {
        const response = await fetch(`${CONFIG.SCRIPT_URL}?action=getForm&code=${code}`);
        const data = await response.json();
        
        if (!data || !data.name) {
            showNotFound();
            return;
        }
        
        // Store form data globally
        window.formData = data;
        
        // Show form
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('confirmationForm').style.display = 'block';
        
        // Set greeting
        const greeting = data.name 
            ? `Hi ${data.name}, I'd like to send you a card. Confirm your address?`
            : `I'd like to send you something. Please confirm your address?`;
        document.getElementById('greeting').textContent = greeting;
        
        // Show logo if provided
        if (data.logoUrl) {
            document.getElementById('companyLogo').src = data.logoUrl;
            document.getElementById('footerLogo').style.display = 'block';
        }
        
        // If address is pre-filled, show preview mode
        if (data.address && data.address.trim()) {
            populatePreview(data.name, data.address);
            document.getElementById('previewMode').style.display = 'block';
            document.getElementById('editMode').style.display = 'none';
        } else {
            // No pre-fill, go straight to edit mode
            populateForm(data.name, '');
            document.getElementById('previewMode').style.display = 'none';
            document.getElementById('editMode').style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error loading form:', error);
        showNotFound();
    }
}

// Populate preview with pre-filled data
function populatePreview(name, address) {
    document.getElementById('previewName').textContent = name;
    
    const lines = address.split('\n').filter(l => l.trim());
    const addressHtml = lines.map(line => `<div class="address-line">${line}</div>`).join('');
    document.getElementById('previewAddress').innerHTML = addressHtml;
    
    // Also populate form fields for when user clicks edit
    populateForm(name, address);
}

// Populate form fields
function populateForm(name, address) {
    document.getElementById('name').value = name || '';
    
    if (address) {
        const lines = address.split('\n').filter(l => l.trim());
        
        // Try to parse address
        document.getElementById('line1').value = lines[0] || '';
        
        if (lines.length > 1) {
            // Check if second line is apt/suite or city
            const lastLine = lines[lines.length - 1];
            if (lastLine.match(/,/)) {
                // Last line is city, state, zip
                document.getElementById('line2').value = lines.length > 2 ? lines[1] : '';
                
                const parts = lastLine.split(',');
                document.getElementById('city').value = parts[0]?.trim() || '';
                
                if (parts[1]) {
                    const stateZip = parts[1].trim().split(' ');
                    document.getElementById('state').value = stateZip[0] || '';
                    document.getElementById('zip').value = stateZip[1] || '';
                }
            } else {
                document.getElementById('line2').value = lines[1] || '';
            }
        }
    }
}

// Enable editing
function enableEditing() {
    document.getElementById('previewMode').style.display = 'none';
    document.getElementById('editMode').style.display = 'block';
    document.getElementById('previewBtn').style.display = 'block';
}

// Show preview
function showPreview() {
    const name = document.getElementById('name').value;
    const line1 = document.getElementById('line1').value;
    const line2 = document.getElementById('line2').value;
    const city = document.getElementById('city').value;
    const state = document.getElementById('state').value;
    const zip = document.getElementById('zip').value;
    
    if (!line1 || !city || !state || !zip) {
        alert('Please fill in all required address fields');
        return;
    }
    
    // Build address string
    let address = line1;
    if (line2) address += '\n' + line2;
    address += `\n${city}, ${state} ${zip}`;
    
    populatePreview(name, address);
    
    document.getElementById('previewMode').style.display = 'block';
    document.getElementById('editMode').style.display = 'none';
}

// Confirm address
async function confirmAddress() {
    const name = document.getElementById('name').value.trim();
    const line1 = document.getElementById('line1').value.trim();
    const line2 = document.getElementById('line2').value.trim();
    const city = document.getElementById('city').value.trim();
    const state = document.getElementById('state').value.trim();
    const zip = document.getElementById('zip').value.trim();
    
    // Validation
    if (!name || !line1 || !city || !state || !zip) {
        alert('Please fill in all required fields (Name, Street, City, State, ZIP)');
        enableEditing();
        return;
    }
    
    // Build confirmed address
    let confirmedAddress = line1;
    if (line2) confirmedAddress += ', ' + line2;
    confirmedAddress += `, ${city}, ${state} ${zip}`;
    
    // Show loading state
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Confirming...';
    button.disabled = true;
    
    try {
        const code = getCodeFromURL();
        
        // Submit to Google Apps Script
        await fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'confirmAddress',
                code: code,
                name: name,
                confirmedAddress: confirmedAddress
            })
        });
        
        // Show success
        document.getElementById('confirmationForm').style.display = 'none';
        document.getElementById('successScreen').style.display = 'block';
        
    } catch (error) {
        console.error('Error confirming address:', error);
        alert('There was an error confirming your address. Please try again.');
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Show not found screen
function showNotFound() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('notFoundScreen').style.display = 'block';
}
