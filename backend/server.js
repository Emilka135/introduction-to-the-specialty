const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (for demo purposes)
let passwords = [];
let idCounter = 1;

// Generate secure password
app.post('/api/generate', (req, res) => {
  try {
    const { length, useUppercase, useLowercase, useNumbers, useSymbols } = req.body;
    
    if (!length || length < 4 || length > 128) {
      return res.status(400).json({ error: 'Длина пароля должна быть от 4 до 128 символов' });
    }

    let charset = '';
    if (useLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (useUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useNumbers) charset += '0123456789';
    if (useSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset === '') {
      return res.status(400).json({ error: 'Выберите хотя бы один тип символов' });
    }

    let password = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }

    // Calculate strength
    const strength = calculateStrength(password, length);

    res.json({ password, strength });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка генерации пароля' });
  }
});

// Calculate password strength
function calculateStrength(password, length) {
  let score = 0;
  if (length >= 8) score++;
  if (length >= 12) score++;
  if (length >= 16) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { value: 'weak', label: 'Слабый', color: '#ef4444' };
  if (score <= 4) return { value: 'medium', label: 'Средний', color: '#f59e0b' };
  return { value: 'strong', label: 'Надёжный', color: '#10b981' };
}

// Save password to vault
app.post('/api/vault', async (req, res) => {
  try {
    const { title, username, password, notes } = req.body;

    if (!title || !password) {
      return res.status(400).json({ error: 'Название и пароль обязательны' });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const newPassword = {
      id: idCounter++,
      title,
      username: username || '',
      password: hashedPassword,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    passwords.push(newPassword);
    res.status(201).json({ message: 'Пароль сохранён', password: { ...newPassword, password: '***' } });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сохранения пароля' });
  }
});

// Get all passwords
app.get('/api/vault', (req, res) => {
  try {
    const safePasswords = passwords.map(p => ({
      ...p,
      password: '***'
    }));
    res.json(safePasswords);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});

// Get single password
app.get('/api/vault/:id', (req, res) => {
  try {
    const password = passwords.find(p => p.id === parseInt(req.params.id));
    if (!password) {
      return res.status(404).json({ error: 'Пароль не найден' });
    }
    res.json({ ...password, password: '***' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения пароля' });
  }
});

// Delete password
app.delete('/api/vault/:id', (req, res) => {
  try {
    const index = passwords.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Пароль не найден' });
    }
    passwords.splice(index, 1);
    res.json({ message: 'Пароль удалён' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка удаления пароля' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Password Manager API is running' });
});

app.listen(PORT, () => {
  console.log(`🔐 Server running on http://localhost:${PORT}`);
});