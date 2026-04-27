// API Configuration
const API_URL = 'http://localhost:3000/api';

// DOM Elements
const generatedPasswordInput = document.getElementById('generatedPassword');
const copyPasswordBtn = document.getElementById('copyPassword');
const generateBtn = document.getElementById('generateBtn');
const saveToVaultBtn = document.getElementById('saveToVault');
const passwordLengthSlider = document.getElementById('passwordLength');
const lengthValue = document.getElementById('lengthValue');
const useUppercase = document.getElementById('useUppercase');
const useLowercase = document.getElementById('useLowercase');
const useNumbers = document.getElementById('useNumbers');
const useSymbols = document.getElementById('useSymbols');
const strengthBar = document.querySelector('.strength-bar');
const strengthText = document.querySelector('.strength-text');
const passwordList = document.getElementById('passwordList');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const savePasswordForm = document.getElementById('savePasswordForm');
const notification = document.getElementById('notification');

// State
let currentGeneratedPassword = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadVault();
    setupEventListeners();
});

function setupEventListeners() {
    generateBtn.addEventListener('click', generatePassword);
    copyPasswordBtn.addEventListener('click', copyToClipboard);
    saveToVaultBtn.addEventListener('click', openModal);
    closeModal.addEventListener('click', closeModalHandler);
    savePasswordForm.addEventListener('submit', savePassword);
    
    passwordLengthSlider.addEventListener('input', (e) => {
        lengthValue.textContent = e.target.value;
    });

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalHandler();
        }
    });
}

// Generate Password
async function generatePassword() {
    try {
        const options = {
            length: parseInt(passwordLengthSlider.value),
            useUppercase: useUppercase.checked,
            useLowercase: useLowercase.checked,
            useNumbers: useNumbers.checked,
            useSymbols: useSymbols.checked
        };

        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(options)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка генерации');
        }

        const data = await response.json();
        currentGeneratedPassword = data.password;
        generatedPasswordInput.value = data.password;
        
        // Update strength indicator
        updateStrengthIndicator(data.strength);
        
        // Show save button
        saveToVaultBtn.style.display = 'block';
        
        showNotification('Пароль сгенерирован!', 'success');
    } catch (error) {
        showError(error.message);
    }
}

function updateStrengthIndicator(strength) {
    strengthBar.style.width = '100%';
    strengthBar.style.background = strength.color;
    strengthText.textContent = `Надёжность: ${strength.label}`;
    strengthText.style.color = strength.color;
}

// Copy to Clipboard
async function copyToClipboard() {
    if (!generatedPasswordInput.value) {
        showNotification('Сначала сгенерируйте пароль', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(generatedPasswordInput.value);
        showNotification('Пароль скопирован!', 'success');
    } catch (error) {
        // Fallback
        generatedPasswordInput.select();
        document.execCommand('copy');
        showNotification('Пароль скопирован!', 'success');
    }
}

// Vault Functions
async function loadVault() {
    try {
        const response = await fetch(`${API_URL}/vault`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const passwords = await response.json();
        renderVault(passwords);
    } catch (error) {
        showError('Не удалось загрузить хранилище');
    }
}

function renderVault(passwords) {
    if (passwords.length === 0) {
        passwordList.innerHTML = '<p class="empty-state">Хранилище пусто. Сгенерируйте и сохраните свой первый пароль!</p>';
        return;
    }

    passwordList.innerHTML = passwords.map(pwd => `
        <div class="password-item" data-id="${pwd.id}">
            <div class="password-item-header">
                <span class="password-item-title">${escapeHtml(pwd.title)}</span>
                <div class="password-item-actions">
                    <button class="btn-secondary" onclick="showPassword(${pwd.id})" title="Показать">👁️</button>
                    <button class="btn-secondary" onclick="copyVaultPassword(${pwd.id})" title="Копировать">📋</button>
                    <button class="btn-secondary" onclick="deletePassword(${pwd.id})" title="Удалить">🗑️</button>
                </div>
            </div>
            <div class="password-item-details">
                ${pwd.username ? `<div>👤 ${escapeHtml(pwd.username)}</div>` : ''}
                <div>📅 ${new Date(pwd.createdAt).toLocaleDateString('ru-RU')}</div>
            </div>
        </div>
    `).join('');
}

// Modal Functions
function openModal() {
    if (!currentGeneratedPassword) {
        showNotification('Сначала сгенерируйте пароль', 'error');
        return;
    }
    
    document.getElementById('savePassword').value = currentGeneratedPassword;
    document.getElementById('saveTitle').value = '';
    document.getElementById('saveUsername').value = '';
    document.getElementById('saveNotes').value = '';
    modal.classList.add('active');
}

function closeModalHandler() {
    modal.classList.remove('active');
}

async function savePassword(e) {
    e.preventDefault();
    
    const data = {
        title: document.getElementById('saveTitle').value,
        username: document.getElementById('saveUsername').value,
        password: document.getElementById('savePassword').value,
        notes: document.getElementById('saveNotes').value
    };

    try {
        const response = await fetch(`${API_URL}/vault`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка сохранения');
        }

        showNotification('Пароль сохранён!', 'success');
        closeModalHandler();
        loadVault();
    } catch (error) {
        showError(error.message);
    }
}

// Password Actions
// Показ пароля
async function showPassword(id) {
  try {
    const response = await fetch(`${API_URL}/vault/${id}/plain`);
    if (!response.ok) throw new Error('Ошибка');
    
    const data = await response.json();
    showNotification(`Пароль: ${data.password}`, 'success');
  } catch (error) {
    showError('Не удалось показать пароль');
  }
}

// Копирование пароля
async function copyVaultPassword(id) {
  try {
    const response = await fetch(`${API_URL}/vault/${id}/plain`);
    if (!response.ok) throw new Error('Ошибка');
    
    const data = await response.json();
    await navigator.clipboard.writeText(data.password);
    showNotification('Пароль скопирован!', 'success');
  } catch (error) {
    showError('Не удалось скопировать пароль');
  }
}

// Utility Functions
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type === 'error' ? 'error' : ''} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function showError(message) {
    showNotification(message, 'error');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Глобальный доступ для onclick
window.deletePassword = deletePassword;
window.copyVaultPassword = copyVaultPassword;
window.showPassword = showPassword;