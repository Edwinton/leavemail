// Global state
let settings = {};
let pendingEmailData = null;
let pendingResolve = null;

// Pattern lock variables
let currentPattern = [];
let storedPattern = '';
let isSettingPattern = true;
const SETTINGS_STORAGE_KEY = 'leavemail_settings_v1';
const HISTORY_STORAGE_KEY = 'leavemail_history_v1';
const LEGACY_CASUAL_TEMPLATES = [`<div style="font-family: 'Segoe UI', sans-serif;">
<p>Hi <strong>{recipient_name}</strong>,</p>

<p><strong>{student_name}</strong> will need to be away from <strong>{start_datetime}</strong> to <strong>{end_datetime}</strong>.</p>

<p><strong>Reason:</strong> {reason}</p>

<p>Thanks for understanding!<br>
<strong>{parent_name}</strong></p>
</div>`, `<div style="font-family: 'Segoe UI', sans-serif;">
<p>Hi <strong>{recipient_name}</strong>,</p>

<p>Just a quick heads-up that <strong>{student_name}</strong> will be out from <strong>{start_datetime}</strong> to <strong>{end_datetime}</strong>.</p>

<p>It's because of {reason}. Thanks so much for understanding!</p>

<p>Best,<br>
<strong>{parent_name}</strong></p>
</div>`];
const UPDATED_CASUAL_TEMPLATE = `<div style="font-family: 'Segoe UI', sans-serif;">
<p>Hi <strong>{recipient_name}</strong>,</p>

<p>I wanted to let you know that <strong>{student_name}</strong> will be away from <strong>{start_datetime}</strong> to <strong>{end_datetime}</strong>.</p>

<p>The reason for the absence is {reason}. Thank you for your understanding.</p>

<p>Best regards,<br>
<strong>{parent_name}</strong></p>
</div>`;
const LEGACY_ENTERTAINING_TEMPLATE = `<div style="font-family: 'Comic Sans MS', cursive, sans-serif;">
<p>\u{1F3AD} <strong>DRAMATIC LEAVE ANNOUNCEMENT</strong> \u{1F3AD}</p>

<p>Dear <strong>{recipient_name}</strong>,</p>

<p>By royal decree of the <strong>{parent_name}</strong> household, <strong>{student_name}</strong> shall be embarking on a magnificent journey away from academia from <strong>{start_datetime}</strong> until <strong>{end_datetime}</strong>.</p>

<p><strong>The official reason:</strong> {reason}</p>

<p>Fear not! {student_name} shall return with tales to tell and homework completed.</p>

<p>Dramatically yours,<br>
<strong>{parent_name}</strong> \u{2728}</p>
</div>`;
const UPDATED_ENTERTAINING_TEMPLATE = `<div style="font-family: 'Comic Sans MS', cursive, sans-serif;">
<p><strong>DRAMATIC LEAVE ANNOUNCEMENT</strong></p>

<p>Dear <strong>{recipient_name}</strong>,</p>

<p>By royal decree of the <strong>{parent_name}</strong> household, <strong>{student_name}</strong> shall be embarking on a magnificent journey away from academia from <strong>{start_datetime}</strong> until <strong>{end_datetime}</strong>.</p>

<p><strong>The official reason:</strong> {reason}</p>

<p>Fear not! {student_name} shall return with tales to tell and homework completed.</p>

<p>Dramatically yours,<br>
<strong>{parent_name}</strong></p>
</div>`;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    attachEventListeners();
    applyAccessibilitySettings();
    loadTheme();
    initSecuritySettings();
});

// Load settings from server
async function loadSettings() {
    try {
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (savedSettings) {
            settings = JSON.parse(savedSettings);
        } else {
            const response = await fetch('/api/get-settings');
            if (!response.ok) throw new Error('Could not load settings');
            settings = await response.json();
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        }
        if (LEGACY_CASUAL_TEMPLATES.some(template => settings.templates?.casual?.trim() === template.trim())) {
            settings.templates.casual = UPDATED_CASUAL_TEMPLATE;
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        }
        if (settings.templates?.entertaining?.trim() === LEGACY_ENTERTAINING_TEMPLATE.trim()) {
            settings.templates.entertaining = UPDATED_ENTERTAINING_TEMPLATE;
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        }
        
        // Populate form fields if on settings page
        if (document.getElementById('settingsForm')) {
            populateSettingsForm();
        }
        
        // Populate student info on main page
        if (document.getElementById('leaveForm')) {
            populateLeaveForm();
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast('Error loading settings');
    }
}

// Populate settings form
function populateSettingsForm() {
    // Basic info
    if (document.getElementById('studentName')) 
        document.getElementById('studentName').value = settings.student_name || '';
    if (document.getElementById('studentClass')) 
        document.getElementById('studentClass').value = settings.student_class || '';
    if (document.getElementById('parentName')) 
        document.getElementById('parentName').value = settings.parent_name || '';
    if (document.getElementById('parentPhone')) 
        document.getElementById('parentPhone').value = settings.parent_phone || '';
    if (document.getElementById('recipientName')) 
        document.getElementById('recipientName').value = settings.recipient_name || '';
    if (document.getElementById('recipientEmail')) 
        document.getElementById('recipientEmail').value = settings.recipient_email || '';
    
    // Email theme
    if (document.getElementById('emailTheme')) 
        document.getElementById('emailTheme').value = settings.email_theme || 'default';
    
    // Populate templates
    if (settings.templates) {
        for (const [key, template] of Object.entries(settings.templates)) {
            const textarea = document.getElementById(`template_${key}`);
            if (textarea) textarea.value = template;
        }
    }
    
    // Appearance
    if (document.getElementById('themeSelect')) 
        document.getElementById('themeSelect').value = settings.theme || 'default';
    
    const a11y = settings.accessibility || {};
    if (document.getElementById('highContrast')) 
        document.getElementById('highContrast').checked = a11y.high_contrast || false;
    if (document.getElementById('largeText')) 
        document.getElementById('largeText').checked = a11y.large_text || false;
    if (document.getElementById('reducedMotion')) 
        document.getElementById('reducedMotion').checked = a11y.reduced_motion || false;
    
    // Security
    const security = settings.security || {};
    if (document.getElementById('lockType')) 
        document.getElementById('lockType').value = security.lock_type || 'none';
    
    toggleSecuritySections();
    
    if (security.lock_type === 'pin' && security.pin_code) {
        if (document.getElementById('pinCode')) 
            document.getElementById('pinCode').value = security.pin_code;
        if (document.getElementById('pinConfirm')) 
            document.getElementById('pinConfirm').value = security.pin_code;
    }
    if (security.lock_type === 'password' && security.password) {
        if (document.getElementById('password')) 
            document.getElementById('password').value = security.password;
        if (document.getElementById('passwordConfirm')) 
            document.getElementById('passwordConfirm').value = security.password;
    }
    if (security.lock_type === 'pattern' && security.pattern) {
        storedPattern = security.pattern;
        if (document.getElementById('patternValue')) 
            document.getElementById('patternValue').value = security.pattern;
    }
}

// Populate leave form with saved data
function populateLeaveForm() {
    // Just store for generation, form fields are for input
}

// Calculate and display duration
function updateDuration() {
    const start = document.getElementById('startDatetime')?.value;
    const end = document.getElementById('endDatetime')?.value;
    const durationDisplay = document.getElementById('durationDisplay');
    
    if (start && end && durationDisplay) {
        const duration = calculateDuration(start, end);
        durationDisplay.textContent = `Duration: ${duration}`;
        durationDisplay.style.background = '#10B98120';
    } else if (durationDisplay) {
        durationDisplay.textContent = 'Duration: Not selected';
        durationDisplay.style.background = '';
    }
}

function calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;
    
    if (diffMs <= 0) return 'Invalid (end must be after start)';
    
    const hours = diffMs / (1000 * 60 * 60);
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    
    if (days > 0) {
        return `${days} day(s), ${remainingHours} hour(s)`;
    }
    return `${Math.floor(hours)} hour(s)`;
}

// Attach all event listeners
function attachEventListeners() {
    // Date pickers
    const startInput = document.getElementById('startDatetime');
    const endInput = document.getElementById('endDatetime');
    if (startInput && endInput) {
        startInput.addEventListener('change', updateDuration);
        endInput.addEventListener('change', updateDuration);
        
        // Set default dates (today and tomorrow)
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0);
        
        startInput.value = now.toISOString().slice(0, 16);
        endInput.value = tomorrow.toISOString().slice(0, 16);
        updateDuration();
    }
    
    // Voice input
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn && 'webkitSpeechRecognition' in window) {
        voiceBtn.addEventListener('click', startVoiceInput);
    } else if (voiceBtn) {
        voiceBtn.style.display = 'none';
    }
    
    // Quick presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const reason = btn.getAttribute('data-reason');
            const reasonField = document.getElementById('reason');
            if (reasonField) {
                reasonField.value = reason;
                showToast(`Reason set: ${reason}`);
            }
        });
    });
    
    // Template selection
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const template = btn.getAttribute('data-template');
            document.getElementById('selectedTemplate').value = template;
            
            const customGroup = document.getElementById('customTemplateGroup');
            if (customGroup) {
                customGroup.style.display = template === 'custom' ? 'block' : 'none';
            }
        });
    });
    
    // Preview button
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', generateAndPreview);
    }
    
    // Send button
    const sendForm = document.getElementById('leaveForm');
    if (sendForm) {
        sendForm.addEventListener('submit', (e) => {
            e.preventDefault();
            checkSecurityAndSend();
        });
    }
    
    // Quick send
    const quickSendBtn = document.getElementById('quickSendBtn');
    if (quickSendBtn) {
        quickSendBtn.addEventListener('click', quickSend);
    }
    
    // Settings form save
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveSettings();
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }
    
    // Theme selector
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            setTheme(e.target.value);
        });
    }
    
    // Accessibility checkboxes
    const highContrast = document.getElementById('highContrast');
    const largeText = document.getElementById('largeText');
    const reducedMotion = document.getElementById('reducedMotion');
    
    if (highContrast) highContrast.addEventListener('change', applyAccessibilitySettings);
    if (largeText) largeText.addEventListener('change', applyAccessibilitySettings);
    if (reducedMotion) reducedMotion.addEventListener('change', applyAccessibilitySettings);
    
    // Load history if on history page
    if (document.getElementById('historyList')) {
        loadHistory();
    }
    
    // Clear history button
    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearHistory);
    }
    
    // Reset pattern button
    const resetPatternBtn = document.getElementById('resetPatternBtn');
    if (resetPatternBtn) {
        resetPatternBtn.addEventListener('click', resetPatternSetup);
    }
}

// Initialize security settings
function initSecuritySettings() {
    const lockType = document.getElementById('lockType');
    if (lockType) {
        lockType.addEventListener('change', toggleSecuritySections);
    }
    
    // Initialize pattern grid if on settings page
    if (document.getElementById('patternGrid')) {
        initPatternGrid();
    }
}

// Toggle security sections
function toggleSecuritySections() {
    const lockType = document.getElementById('lockType')?.value || 'none';
    
    const pinSection = document.getElementById('pinSection');
    const passwordSection = document.getElementById('passwordSection');
    const patternSection = document.getElementById('patternSection');
    
    if (pinSection) pinSection.style.display = lockType === 'pin' ? 'block' : 'none';
    if (passwordSection) passwordSection.style.display = lockType === 'password' ? 'block' : 'none';
    if (patternSection) patternSection.style.display = lockType === 'pattern' ? 'block' : 'none';
    
    if (lockType === 'pattern') {
        resetPatternSetup();
    }
}

// Initialize pattern grid
function initPatternGrid() {
    const grid = document.getElementById('patternGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const dot = document.createElement('div');
        dot.className = 'pattern-dot';
        dot.dataset.index = i;
        dot.addEventListener('click', () => onPatternDotClick(i));
        grid.appendChild(dot);
    }
}

// Handle pattern dot click
function onPatternDotClick(index) {
    if (!isSettingPattern) return;
    
    if (!currentPattern.includes(index)) {
        currentPattern.push(index);
        
        const dots = document.querySelectorAll('#patternGrid .pattern-dot');
        if (dots[index]) dots[index].classList.add('selected');
        
        const status = document.getElementById('patternStatus');
        if (status) {
            status.textContent = `Selected ${currentPattern.length} dots`;
            
            if (currentPattern.length >= 4) {
                status.textContent = `Pattern set! Click to confirm`;
                setTimeout(() => {
                    if (currentPattern.length >= 4) {
                        confirmPattern();
                    }
                }, 1500);
            }
        }
    }
}

// Confirm pattern
function confirmPattern() {
    if (!isSettingPattern) return;
    
    const patternString = currentPattern.join('');
    
    if (storedPattern === '') {
        storedPattern = patternString;
        const status = document.getElementById('patternStatus');
        if (status) {
            status.textContent = 'Pattern saved. Draw again to confirm';
            status.className = 'pattern-status success';
        }
        currentPattern = [];
        clearPatternHighlights();
        
        setTimeout(() => {
            if (status) {
                status.innerHTML = 'Draw the same pattern again to confirm';
                status.className = 'pattern-status';
            }
            isSettingPattern = true;
        }, 1000);
    } else {
        if (patternString === storedPattern) {
            const status = document.getElementById('patternStatus');
            if (status) {
                status.textContent = 'Pattern confirmed';
                status.className = 'pattern-status success';
            }
            const patternValue = document.getElementById('patternValue');
            if (patternValue) patternValue.value = storedPattern;
            isSettingPattern = false;
        } else {
            const status = document.getElementById('patternStatus');
            if (status) {
                status.textContent = 'Patterns do not match. Try again';
                status.className = 'pattern-status error';
            }
            currentPattern = [];
            clearPatternHighlights();
        }
    }
}

// Clear pattern highlights
function clearPatternHighlights() {
    const dots = document.querySelectorAll('#patternGrid .pattern-dot');
    dots.forEach(dot => dot.classList.remove('selected'));
}

// Reset pattern setup
function resetPatternSetup() {
    currentPattern = [];
    storedPattern = '';
    isSettingPattern = true;
    clearPatternHighlights();
    const status = document.getElementById('patternStatus');
    if (status) {
        status.innerHTML = 'Draw a pattern (minimum 4 dots)';
        status.className = 'pattern-status';
    }
    const patternValue = document.getElementById('patternValue');
    if (patternValue) patternValue.value = '';
}

// Voice input
function startVoiceInput() {
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    showToast('Listening. Speak now');
    
    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        showToast(`Processing: "${transcript}"`);
        
        try {
            const response = await fetch('/api/voice-input', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript })
            });
            const data = await response.json();
            
            if (data.reason) {
                const reasonField = document.getElementById('reason');
                if (reasonField) reasonField.value = data.reason;
            }
            
            if (data.start_offset > 0) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + data.start_offset);
                startDate.setHours(9, 0, 0);
                const startInput = document.getElementById('startDatetime');
                if (startInput) startInput.value = startDate.toISOString().slice(0, 16);
                
                const endDate = new Date(startDate);
                endDate.setHours(endDate.getHours() + data.duration_hours);
                const endInput = document.getElementById('endDatetime');
                if (endInput) endInput.value = endDate.toISOString().slice(0, 16);
                updateDuration();
            }
            
            showToast('Voice input processed');
        } catch (error) {
            showToast('Error processing voice input');
        }
    };
    
    recognition.onerror = () => {
        showToast('Voice input failed. Please type instead.');
    };
    
    recognition.start();
}

// Generate email preview
async function generateAndPreview() {
    const emailData = collectFormData();
    
    try {
        const response = await fetch('/api/generate-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData)
        });
        if (!response.ok) throw new Error('Could not generate email');
        const data = await response.json();
        showEmailDraft(data);
    } catch (error) {
        console.error('Error:', error);
        showToast('Error generating preview');
    }
}

// Collect form data
function collectFormData() {
    return {
        student_name: settings.student_name || '',
        student_class: settings.student_class || '',
        parent_name: settings.parent_name || '',
        parent_phone: settings.parent_phone || '',
        recipient_name: settings.recipient_name || 'Teacher',
        recipient_email: settings.recipient_email || '',
        start_datetime: document.getElementById('startDatetime')?.value || '',
        end_datetime: document.getElementById('endDatetime')?.value || '',
        reason: document.getElementById('reason')?.value || 'Not specified',
        template_type: document.getElementById('selectedTemplate')?.value || 'professional',
        custom_template: document.getElementById('customTemplate')?.value || '',
        email_theme: settings.email_theme || 'default',
        templates: settings.templates || {}
    };
}

function rememberHistoryEntry(entry) {
    if (!entry) return;
    try {
        const history = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
        history.unshift(entry);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
    } catch (error) {
        console.error('Could not save leave history locally:', error);
        showToast('Draft created, but browser storage is full');
    }
}

function showEmailDraft(data) {
    const previewDiv = document.getElementById('emailPreview');
    const subjectDiv = document.getElementById('previewSubject');
    const bodyDiv = document.getElementById('previewBody');
    const openLink = document.getElementById('openEmailBtn');
    const copyButton = document.getElementById('copyEmailBtn');
    if (!previewDiv || !subjectDiv || !bodyDiv) return;

    subjectDiv.textContent = removeEmojis(data.subject || 'Leave request');
    bodyDiv.textContent = removeEmojis(data.body_plain || '');
    previewDiv.style.display = 'block';
    if (openLink) {
        openLink.href = data.mailto_link || '#';
        openLink.style.display = data.mailto_link ? 'inline-flex' : 'none';
    }
    if (copyButton) {
        copyButton.onclick = async () => {
            const text = `Subject: ${data.subject || ''}\n\n${data.body_plain || ''}`;
            try {
                await navigator.clipboard.writeText(text);
                showToast('Email subject and message copied');
            } catch (error) {
                showToast('Copy failed. Select and copy the preview text.');
            }
        };
    }
    rememberHistoryEntry(data.history_entry);
    previewDiv.scrollIntoView({ behavior: 'smooth' });
}

// Check security and send
function checkSecurityAndSend() {
    const security = settings.security || {};
    const lockType = security.lock_type || 'none';
    
    if (lockType !== 'none') {
        showSecurityModal(async (authenticated) => {
            if (authenticated) {
                await sendEmail();
            } else {
                showToast('Authentication cancelled');
            }
        });
    } else {
        sendEmail();
    }
}

// Show security modal
function showSecurityModal(callback) {
    const security = settings.security || {};
    const lockType = security.lock_type;
    
    // Create modal if doesn't exist
    let modal = document.getElementById('securityModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'securityModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    let content = '';
    if (lockType === 'pin') {
        content = `
            <div class="modal-content">
                <h3>Enter PIN</h3>
                <input type="password" id="securityInput" class="form-input security-input" maxlength="6" placeholder="Enter PIN" autofocus>
                <div class="modal-buttons">
                    <button id="securitySubmitBtn" class="btn btn-primary">Verify</button>
                    <button id="securityCancelBtn" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;
    } else if (lockType === 'password') {
        content = `
            <div class="modal-content">
                <h3>Enter Password</h3>
                <input type="password" id="securityInput" class="form-input" placeholder="Enter your password" autofocus>
                <div class="modal-buttons">
                    <button id="securitySubmitBtn" class="btn btn-primary">Verify</button>
                    <button id="securityCancelBtn" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;
    }
    
    modal.innerHTML = content;
    modal.style.display = 'flex';
    
    const input = document.getElementById('securityInput');
    if (input) input.focus();
    
    const submitBtn = document.getElementById('securitySubmitBtn');
    const cancelBtn = document.getElementById('securityCancelBtn');
    
    const onSubmit = () => {
        const value = input?.value || '';
        let isValid = false;
        
        if (lockType === 'pin') {
            isValid = value === security.pin_code;
        } else if (lockType === 'password') {
            isValid = value === security.password;
        }
        
        if (isValid) {
            modal.style.display = 'none';
            callback(true);
        } else {
            showToast('Invalid credentials');
            if (input) input.value = '';
            input?.focus();
        }
    };
    
    if (submitBtn) submitBtn.onclick = onSubmit;
    if (cancelBtn) cancelBtn.onclick = () => {
        modal.style.display = 'none';
        callback(false);
    };
    
    if (input) {
        input.onkeypress = (e) => {
            if (e.key === 'Enter') onSubmit();
        };
    }
}

// Send email
async function sendEmail() {
    const emailData = collectFormData();
    
    showToast('Generating email...');
    
    try {
        const response = await fetch('/api/generate-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData)
        });
        if (!response.ok) throw new Error('Could not generate email');
        const data = await response.json();
        showEmailDraft(data);
        showToast('Draft ready. Review it, then open your email app to send.');
        
        if (document.getElementById('historyList')) {
            setTimeout(() => loadHistory(), 500);
        }
    } catch (error) {
        showToast('Error sending email');
    }
}

// Quick send
async function quickSend() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0);
    
    const defaultReason = document.getElementById('reason')?.value || 'Emergency leave requested';
    
    const quickData = {
        student_name: settings.student_name || '',
        student_class: settings.student_class || '',
        parent_name: settings.parent_name || '',
        parent_phone: settings.parent_phone || '',
        recipient_name: settings.recipient_name || 'Teacher',
        recipient_email: settings.recipient_email || '',
        start_datetime: now.toISOString().slice(0, 16),
        end_datetime: tomorrow.toISOString().slice(0, 16),
        reason: defaultReason,
        template_type: 'professional',
        custom_template: '',
        email_theme: settings.email_theme || 'default',
        templates: settings.templates || {}
    };
    
    try {
        const response = await fetch('/api/generate-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quickData)
        });
        if (!response.ok) throw new Error('Could not generate email');
        const data = await response.json();
        showEmailDraft(data);
        showToast('Quick draft ready. Review it, then open your email app to send.');
    } catch (error) {
        showToast('Quick send failed');
    }
}

// Save settings
async function saveSettings() {
    const lockType = document.getElementById('lockType')?.value || 'none';
    let pinCode = '';
    let password = '';
    let pattern = '';
    
    if (lockType === 'pin') {
        const pin = document.getElementById('pinCode')?.value || '';
        const confirm = document.getElementById('pinConfirm')?.value || '';
        if (pin !== confirm) {
            showToast('PINs do not match');
            return;
        }
        if (pin && (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin))) {
            showToast('PIN must be 4-6 digits');
            return;
        }
        pinCode = pin;
    } else if (lockType === 'password') {
        const pwd = document.getElementById('password')?.value || '';
        const confirm = document.getElementById('passwordConfirm')?.value || '';
        if (pwd !== confirm) {
            showToast('Passwords do not match');
            return;
        }
        if (pwd && pwd.length < 4) {
            showToast('Password must be at least 4 characters');
            return;
        }
        password = pwd;
    } else if (lockType === 'pattern') {
        pattern = document.getElementById('patternValue')?.value || '';
    }
    
    const settingsData = {
        student_name: document.getElementById('studentName')?.value || '',
        student_class: document.getElementById('studentClass')?.value || '',
        parent_name: document.getElementById('parentName')?.value || '',
        parent_phone: document.getElementById('parentPhone')?.value || '',
        recipient_name: document.getElementById('recipientName')?.value || '',
        recipient_email: document.getElementById('recipientEmail')?.value || '',
        email_theme: document.getElementById('emailTheme')?.value || 'default',
        templates: {},
        theme: document.getElementById('themeSelect')?.value || 'default',
        accessibility: {
            high_contrast: document.getElementById('highContrast')?.checked || false,
            large_text: document.getElementById('largeText')?.checked || false,
            reduced_motion: document.getElementById('reducedMotion')?.checked || false
        },
        security: {
            lock_type: lockType,
            pin_code: pinCode,
            password: password,
            pattern: pattern
        }
    };
    
    // Collect templates
    const templateTypes = ['professional', 'casual', 'entertaining', 'custom'];
    for (const type of templateTypes) {
        const textarea = document.getElementById(`template_${type}`);
        if (textarea && textarea.value) {
            settingsData.templates[type] = textarea.value;
        }
    }
    
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsData));
        settings = settingsData;
        showToast('Settings saved on this device');
        applyAccessibilitySettings();
        setTheme(settingsData.theme);
    } catch (error) {
        showToast('Could not save settings in this browser');
    }
}

// Reset settings
async function resetSettings() {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        window.location.reload();
    }
}

// Apply accessibility settings
function applyAccessibilitySettings() {
    const a11y = settings.accessibility || {};
    
    if (a11y.high_contrast) {
        document.body.classList.add('high-contrast');
    } else {
        document.body.classList.remove('high-contrast');
    }
    
    if (a11y.large_text) {
        document.body.classList.add('large-text');
    } else {
        document.body.classList.remove('large-text');
    }
    
    if (a11y.reduced_motion) {
        document.body.classList.add('reduced-motion');
    } else {
        document.body.classList.remove('reduced-motion');
    }
}

// Set theme
function setTheme(themeName) {
    const themeLink = document.getElementById('themeStylesheet');
    if (themeLink) {
        themeLink.href = `/static/css/themes/${themeName}.css`;
    }
}

// Load theme from settings
function loadTheme() {
    const theme = settings.theme || 'default';
    setTheme(theme);
}

// Load history
function removeEmojis(value) {
    return String(value ?? '')
        .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu, '')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

async function loadHistory() {
    try {
        let history = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
        if (!localStorage.getItem(HISTORY_STORAGE_KEY)) {
            // One-time migration from the older server-side session history.
            const response = await fetch('/api/get-history');
            if (response.ok) {
                history = await response.json();
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
            }
        }
        
        const container = document.getElementById('historyList');
        const emptyState = document.getElementById('emptyState');
        
        if (!container) return;
        
        if (history.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            container.innerHTML = '';
            if (emptyState) container.appendChild(emptyState);
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        container.innerHTML = '';
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-date">${new Date(item.timestamp).toLocaleString()}</div>
                <div class="history-student">Student: ${escapeHtml(removeEmojis(item.student || 'Unknown'))}</div>
                <div class="history-reason">Reason: ${escapeHtml(removeEmojis((item.reason || '').substring(0, 100)))}${(item.reason || '').length > 100 ? '...' : ''}</div>
                <div class="history-dates">${escapeHtml(item.start?.substring(0, 10) || '?')} → ${escapeHtml(item.end?.substring(0, 10) || '?')}</div>
            `;
            div.addEventListener('click', () => showHistoryDetail(item));
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Show history detail
function showHistoryDetail(item) {
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
        <p><strong>Created:</strong> ${new Date(item.timestamp).toLocaleString()}</p>
        <p><strong>Student:</strong> ${escapeHtml(removeEmojis(item.student))}</p>
        <p><strong>Leave dates:</strong> ${escapeHtml(item.start?.substring(0, 16) || '?')} → ${escapeHtml(item.end?.substring(0, 16) || '?')}</p>
        <p><strong>Reason:</strong> ${escapeHtml(removeEmojis(item.reason))}</p>
        <p><strong>Subject:</strong> ${escapeHtml(removeEmojis(item.subject))}</p>
        <hr>
        <div class="preview-body" style="max-height: 300px; overflow-y: auto;">${escapeHtml(removeEmojis(item.body_plain || item.body || '')).replace(/\n/g, '<br>')}</div>
    `;
    
    modal.style.display = 'flex';
    
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Clear history
async function clearHistory() {
    if (confirm('Delete all leave history? This cannot be undone.')) {
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, '[]');
            showToast('History cleared');
            loadHistory();
        } catch (error) {
            showToast('Error clearing history');
        }
    }
}

// Show toast message
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Enhanced security modal with pattern support
function showSecurityModal(callback) {
    const security = settings.security || {};
    const lockType = security.lock_type;
    
    const modal = document.getElementById('securityModal');
    const modalContent = document.getElementById('securityModalContent');
    
    if (!modal || !modalContent) return;
    
    if (lockType === 'pin') {
        modalContent.innerHTML = `
                <h3>Enter PIN</h3>
                <input type="password" id="securityPinInput" class="form-input security-input" maxlength="6" pattern="[0-9]*" inputmode="numeric" placeholder="Enter PIN" autofocus>
            <div class="modal-buttons">
                <button id="securitySubmitBtn" class="btn btn-primary">Verify</button>
                <button id="securityCancelBtn" class="btn btn-secondary">Cancel</button>
            </div>
        `;
        modal.style.display = 'flex';
        
        const input = document.getElementById('securityPinInput');
        input.focus();
        
        const submitBtn = document.getElementById('securitySubmitBtn');
        const cancelBtn = document.getElementById('securityCancelBtn');
        
        const onSubmit = () => {
            if (input.value === security.pin_code) {
                modal.style.display = 'none';
                callback(true);
            } else {
                showToast('Invalid PIN');
                input.value = '';
                input.focus();
            }
        };
        
        submitBtn.onclick = onSubmit;
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            callback(false);
        };
        input.onkeypress = (e) => { if (e.key === 'Enter') onSubmit(); };
        
    } else if (lockType === 'password') {
        modalContent.innerHTML = `
                <h3>Enter Password</h3>
            <input type="password" id="securityPasswordInput" class="form-input" placeholder="Enter your password" autofocus>
            <div class="modal-buttons">
                <button id="securitySubmitBtn" class="btn btn-primary">Verify</button>
                <button id="securityCancelBtn" class="btn btn-secondary">Cancel</button>
            </div>
        `;
        modal.style.display = 'flex';
        
        const input = document.getElementById('securityPasswordInput');
        input.focus();
        
        const submitBtn = document.getElementById('securitySubmitBtn');
        const cancelBtn = document.getElementById('securityCancelBtn');
        
        const onSubmit = () => {
            if (input.value === security.password) {
                modal.style.display = 'none';
                callback(true);
            } else {
                showToast('Invalid Password');
                input.value = '';
                input.focus();
            }
        };
        
        submitBtn.onclick = onSubmit;
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            callback(false);
        };
        input.onkeypress = (e) => { if (e.key === 'Enter') onSubmit(); };
        
    } else if (lockType === 'pattern') {
        modalContent.innerHTML = `
            <h3>Draw Pattern</h3>
            <div class="pattern-container">
                <div class="pattern-grid" id="patternVerifyGrid"></div>
            </div>
            <div id="patternVerifyStatus" class="pattern-status">Draw your pattern (4+ dots)</div>
            <div class="modal-buttons">
                <button id="securityCancelBtn" class="btn btn-secondary">Cancel</button>
            </div>
        `;
        modal.style.display = 'flex';
        
        // Initialize pattern verification
        const storedPattern = security.pattern || '';
        let enteredPattern = [];
        
        const grid = document.getElementById('patternVerifyGrid');
        const status = document.getElementById('patternVerifyStatus');
        
        for (let i = 0; i < 9; i++) {
            const dot = document.createElement('div');
            dot.className = 'pattern-dot';
            dot.dataset.index = i;
            dot.addEventListener('click', () => {
                if (!enteredPattern.includes(i)) {
                    enteredPattern.push(i);
                    dot.classList.add('selected');
                    
                    status.textContent = `${enteredPattern.length} dots selected`;
                    
                    if (enteredPattern.length >= 4) {
                        const enteredStr = enteredPattern.join('');
                        if (enteredStr === storedPattern) {
                            status.textContent = 'Pattern correct';
                            status.className = 'pattern-status success';
                            setTimeout(() => {
                                modal.style.display = 'none';
                                callback(true);
                            }, 500);
                        } else {
                            status.textContent = 'Incorrect pattern. Try again';
                            status.className = 'pattern-status error';
                            setTimeout(() => {
                                enteredPattern = [];
                                document.querySelectorAll('#patternVerifyGrid .pattern-dot').forEach(d => d.classList.remove('selected'));
                                status.innerHTML = 'Draw your pattern (4+ dots)';
                                status.className = 'pattern-status';
                            }, 1000);
                        }
                    }
                }
            });
            grid.appendChild(dot);
        }
        
        const cancelBtn = document.getElementById('securityCancelBtn');
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            callback(false);
        };
    }
}
