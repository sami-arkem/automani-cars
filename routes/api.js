const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');

// Multer config for photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        cb(null, ext && mime);
    }
});

// Auth middleware
function requireAdmin(req, res, next) {
    if (req.session && req.session.admin) return next();
    res.status(401).json({ error: 'Unauthorized' });
}

// GET /api/cars — List with filters, search, pagination
router.get('/cars', (req, res) => {
    try {
        let where = [];
        let params = {};

        // Filters
        if (req.query.make) { where.push('make = @make'); params.make = req.query.make; }
        if (req.query.model) { where.push('model LIKE @model'); params.model = `%${req.query.model}%`; }
        if (req.query.year) { where.push('year = @year'); params.year = parseInt(req.query.year); }
        if (req.query.fuel) { where.push('fuel = @fuel'); params.fuel = req.query.fuel; }
        if (req.query.transmission) { where.push('transmission = @transmission'); params.transmission = req.query.transmission; }
        if (req.query.status) { where.push('status = @status'); params.status = req.query.status; }
        if (req.query.minPrice) { where.push('price >= @minPrice'); params.minPrice = parseInt(req.query.minPrice); }
        if (req.query.maxPrice) { where.push('price <= @maxPrice'); params.maxPrice = parseInt(req.query.maxPrice); }
        if (req.query.minKms) { where.push('kms >= @minKms'); params.minKms = parseInt(req.query.minKms); }
        if (req.query.maxKms) { where.push('kms <= @maxKms'); params.maxKms = parseInt(req.query.maxKms); }
        if (req.query.search) {
            where.push('(make LIKE @search OR model LIKE @search OR description LIKE @search)');
            params.search = `%${req.query.search}%`;
        }

        const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

        // Sort
        const validSorts = { 'price_asc': 'price ASC', 'price_desc': 'price DESC', 'year_desc': 'year DESC', 'year_asc': 'year ASC', 'newest': 'created_at DESC', 'kms_asc': 'kms ASC' };
        const sort = validSorts[req.query.sort] || 'created_at DESC';

        // Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
        const offset = (page - 1) * limit;

        const total = db.prepare(`SELECT COUNT(*) as count FROM cars ${whereClause}`).get(params).count;
        const cars = db.prepare(`SELECT * FROM cars ${whereClause} ORDER BY ${sort} LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });

        res.json({
            cars,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error listing cars:', err);
        res.status(500).json({ error: 'Failed to fetch cars' });
    }
});

// GET /api/cars/featured — 6 newest available cars
router.get('/cars/featured', (req, res) => {
    try {
        const cars = db.prepare('SELECT * FROM cars WHERE status = ? ORDER BY created_at DESC LIMIT 6').all('available');
        res.json(cars);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch featured cars' });
    }
});

// GET /api/cars/makes — distinct makes for filter dropdown
router.get('/cars/makes', (req, res) => {
    try {
        const makes = db.prepare('SELECT DISTINCT make FROM cars ORDER BY make').all();
        res.json(makes.map(m => m.make));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch makes' });
    }
});

// GET /api/cars/:id
router.get('/cars/:id', (req, res) => {
    try {
        const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
        if (!car) return res.status(404).json({ error: 'Car not found' });
        res.json(car);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch car' });
    }
});

// POST /api/cars — Create (admin only)
router.post('/cars', requireAdmin, upload.array('photos', 10), (req, res) => {
    try {
        const { make, model, year, price, fuel, transmission, kms, owners, reg_city, insurance_validity, description, status, badge } = req.body;
        const photos = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];

        const result = db.prepare(`
      INSERT INTO cars (make, model, year, price, fuel, transmission, kms, owners, reg_city, insurance_validity, description, status, badge, photos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(make, model, parseInt(year), parseInt(price), fuel || 'Petrol', transmission || 'Manual', parseInt(kms) || 0, parseInt(owners) || 1, reg_city || '', insurance_validity || '', description || '', status || 'available', badge || '', JSON.stringify(photos));

        const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(car);
    } catch (err) {
        console.error('Error creating car:', err);
        res.status(500).json({ error: 'Failed to create car' });
    }
});

// PUT /api/cars/:id — Update (admin only)
router.put('/cars/:id', requireAdmin, upload.array('photos', 10), (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Car not found' });

        const { make, model, year, price, fuel, transmission, kms, owners, reg_city, insurance_validity, description, status, badge, existingPhotos } = req.body;

        let photos = [];
        // Keep existing photos that weren't removed
        if (existingPhotos) {
            try { photos = JSON.parse(existingPhotos); } catch (e) { photos = []; }
        }
        // Add newly uploaded photos
        if (req.files && req.files.length > 0) {
            photos = photos.concat(req.files.map(f => '/uploads/' + f.filename));
        }

        db.prepare(`
      UPDATE cars SET make=?, model=?, year=?, price=?, fuel=?, transmission=?, kms=?, owners=?, reg_city=?, insurance_validity=?, description=?, status=?, badge=?, photos=?
      WHERE id=?
    `).run(make, model, parseInt(year), parseInt(price), fuel, transmission, parseInt(kms), parseInt(owners), reg_city || '', insurance_validity || '', description || '', status || 'available', badge || '', JSON.stringify(photos), req.params.id);

        const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
        res.json(car);
    } catch (err) {
        console.error('Error updating car:', err);
        res.status(500).json({ error: 'Failed to update car' });
    }
});

// DELETE /api/cars/:id — Delete (admin only)
router.delete('/cars/:id', requireAdmin, (req, res) => {
    try {
        const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
        if (!car) return res.status(404).json({ error: 'Car not found' });

        // Delete associated photos
        try {
            const photos = JSON.parse(car.photos || '[]');
            photos.forEach(p => {
                const filePath = path.join(__dirname, '..', p);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        } catch (e) { }

        db.prepare('DELETE FROM cars WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete car' });
    }
});

// POST /api/leads — Submit lead form
router.post('/leads', (req, res) => {
    try {
        const { car_id, name, phone, message } = req.body;
        db.prepare('INSERT INTO leads (car_id, name, phone, message) VALUES (?, ?, ?, ?)').run(car_id || null, name, phone, message || '');
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit lead' });
    }
});

// GET /api/leads — List leads (admin only)
router.get('/leads', requireAdmin, (req, res) => {
    try {
        const leads = db.prepare(`
      SELECT leads.*, cars.make, cars.model, cars.year
      FROM leads
      LEFT JOIN cars ON leads.car_id = cars.id
      ORDER BY leads.created_at DESC
    `).all();
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

module.exports = router;
