'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/fiches
// Query filters: statut, source, date_debut, date_fin, client, employe_id
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { statut, source, date_debut, date_fin, client, employe_id, type_fiche } = req.query;

    let query = 'SELECT * FROM fiches WHERE 1=1';
    const params = [];

    if (statut) {
      query += ' AND statut = ?';
      params.push(statut);
    }
    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }
    if (date_debut) {
      query += ' AND date >= ?';
      params.push(date_debut);
    }
    if (date_fin) {
      query += ' AND date <= ?';
      params.push(date_fin);
    }
    if (client) {
      query += ' AND client LIKE ?';
      params.push(`%${client}%`);
    }
    if (employe_id) {
      query += ' AND employe_id = ?';
      params.push(Number(employe_id));
    }
    if (type_fiche) {
      query += ' AND type_fiche = ?';
      params.push(type_fiche);
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const fiches = db.prepare(query).all(...params);
    res.json(fiches);
  } catch (err) {
    next(err);
  }
});

// GET /api/fiches/:id
router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const fiche = db.prepare('SELECT * FROM fiches WHERE id = ?').get(Number(req.params.id));

    if (!fiche) {
      return res.status(404).json({ error: `Fiche with id ${req.params.id} not found.` });
    }

    res.json(fiche);
  } catch (err) {
    next(err);
  }
});

// POST /api/fiches
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { date, employe_id, employe_nom, client, notes_dessin, notes_texte, source, type_fiche } = req.body;

    // Validate required fields
    const missing = [];
    if (!date) missing.push('date');
    if (!employe_nom) missing.push('employe_nom');
    if (!client) missing.push('client');

    if (missing.length > 0) {
      const err = new Error(`Missing required fields: ${missing.join(', ')}`);
      err.type = 'validation';
      return next(err);
    }

    const validTypes = ['FACTURE', 'PROJET'];
    const ficheType = validTypes.includes(type_fiche) ? type_fiche : 'FACTURE';

    // Generate numero YYMMXXXX
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = yy + mm;
    const lastRow = db.prepare(
      "SELECT numero FROM fiches WHERE numero LIKE ? ORDER BY numero DESC LIMIT 1"
    ).get(prefix + '%');
    const seq = lastRow?.numero ? parseInt(lastRow.numero.slice(4), 10) + 1 : 1;
    const numero = prefix + String(seq).padStart(4, '0');

    const stmt = db.prepare(`
      INSERT INTO fiches (date, employe_id, employe_nom, client, notes_dessin, notes_texte, source, type_fiche, numero)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      date,
      employe_id ? Number(employe_id) : null,
      employe_nom.trim(),
      client.trim(),
      notes_dessin || null,
      notes_texte || null,
      source || 'FERRAILLE',
      ficheType,
      numero
    );

    const fiche = db.prepare('SELECT * FROM fiches WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(fiche);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/fiches/:id
router.delete('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const fiche = db.prepare('SELECT id FROM fiches WHERE id = ?').get(Number(id));
    if (!fiche) return res.status(404).json({ error: `Fiche ${id} introuvable.` });
    db.prepare('DELETE FROM fiches WHERE id = ?').run(Number(id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// PUT /api/fiches/:id
router.put('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { statut, commentaire_secretaire } = req.body;

    const fiche = db.prepare('SELECT * FROM fiches WHERE id = ?').get(Number(id));
    if (!fiche) {
      return res.status(404).json({ error: `Fiche with id ${id} not found.` });
    }

    const updates = ['updated_at = CURRENT_TIMESTAMP'];
    const params = [];

    if (statut !== undefined) {
      const validStatuts = ['EN_ATTENTE', 'TRAITEE', 'A_REVOIR'];
      if (!validStatuts.includes(statut)) {
        const err = new Error(`Invalid statut. Must be one of: ${validStatuts.join(', ')}`);
        err.type = 'validation';
        return next(err);
      }
      updates.push('statut = ?');
      params.push(statut);
    }

    if (commentaire_secretaire !== undefined) {
      updates.push('commentaire_secretaire = ?');
      params.push(commentaire_secretaire);
    }

    params.push(Number(id));
    db.prepare(`UPDATE fiches SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM fiches WHERE id = ?').get(Number(id));
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
