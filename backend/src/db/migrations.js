'use strict';

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS employes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      actif INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fiches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      employe_id INTEGER REFERENCES employes(id),
      employe_nom TEXT NOT NULL,
      client TEXT NOT NULL,
      notes_dessin TEXT,
      notes_texte TEXT,
      statut TEXT DEFAULT 'EN_ATTENTE',
      commentaire_secretaire TEXT,
      source TEXT DEFAULT 'FERRAILLE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Database migrations applied successfully.');
}

module.exports = { runMigrations };
