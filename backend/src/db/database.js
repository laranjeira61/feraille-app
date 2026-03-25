'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { runMigrations } = require('./migrations');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/feraille.db');

// Ensure the data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    console.log(`Connected to SQLite database at: ${DB_PATH}`);
  }
  return db;
}

module.exports = { getDb };
