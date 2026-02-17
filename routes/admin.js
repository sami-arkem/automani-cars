const express = require('express');
const router = express.Router();
const { db, hashPassword } = require('../database');

// POST /admin/login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = db.prepare('SELECT * FROM admin WHERE username = ? AND password_hash = ?').get(username, hashPassword(password));

        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.admin = { id: admin.id, username: admin.username };
        res.json({ success: true, username: admin.username });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /admin/logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// GET /admin/check — check if logged in
router.get('/check', (req, res) => {
    if (req.session && req.session.admin) {
        res.json({ authenticated: true, username: req.session.admin.username });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
