'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/employes
// Optional query: ?actif=1
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { actif } = req.query;

    let query = 'SELECT * FROM employes';
    const params = [];

    if (actif !== undefined) {
      query += ' WHERE actif = ?';
      params.push(Number(actif));
    }

    query += ' ORDER BY nom ASC';

    const employes = db.prepare(query).all(...params);
    res.json(employes);
  } catch (err) {
    next(err);
  }
});

// POST /api/employes
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { nom } = req.body;

    if (!nom || typeof nom !== 'string' || nom.trim() === '') {
      const err = new Error('Field "nom" is required and must be a non-empty string.');
      err.type = 'validation';
      return next(err);
    }

    const stmt = db.prepare('INSERT INTO employes (nom) VALUES (?)');
    const result = stmt.run(nom.trim());

    const employe = db.prepare('SELECT * FROM employes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(employe);
  } catch (err) {
    next(err);
  }
});

// PUT /api/employes/:id
router.put('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { nom, actif } = req.body;

    const employe = db.prepare('SELECT * FROM employes WHERE id = ?').get(Number(id));
    if (!employe) {
      return res.status(404).json({ error: `Employee with id ${id} not found.` });
    }

    const updates = [];
    const params = [];

    if (nom !== undefined) {
      if (typeof nom !== 'string' || nom.trim() === '') {
        const err = new Error('Field "nom" must be a non-empty string.');
        err.type = 'validation';
        return next(err);
      }
      updates.push('nom = ?');
      params.push(nom.trim());
    }

    if (actif !== undefined) {
      updates.push('actif = ?');
      params.push(Number(actif) ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update.' });
    }

    params.push(Number(id));
    db.prepare(`UPDATE employes SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM employes WHERE id = ?').get(Number(id));
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employes/:id  (soft delete: set actif=0)
router.delete('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const employe = db.prepare('SELECT * FROM employes WHERE id = ?').get(Number(id));
    if (!employe) {
      return res.status(404).json({ error: `Employee with id ${id} not found.` });
    }

    db.prepare('UPDATE employes SET actif = 0 WHERE id = ?').run(Number(id));
    res.json({ message: `Employee ${id} deactivated successfully.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
