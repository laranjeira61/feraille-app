'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/settings
// Returns all settings as a flat { key: value } object
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/:key
// Returns { key, value } for a single setting
router.get('/:key', (req, res, next) => {
  try {
    const db = getDb();
    const { key } = req.params;
    const row = db.prepare('SELECT key, value FROM settings WHERE key = ?').get(key);
    if (!row) {
      return res.status(404).json({ error: `Setting "${key}" not found.` });
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/:key
// Body: { value: string } — upserts the setting and refreshes updated_at
router.put('/:key', (req, res, next) => {
  try {
    const db = getDb();
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      const err = new Error('Field "value" is required.');
      err.type = 'validation';
      return next(err);
    }

    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run(key, String(value));

    const updated = db.prepare('SELECT key, value, updated_at FROM settings WHERE key = ?').get(key);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
