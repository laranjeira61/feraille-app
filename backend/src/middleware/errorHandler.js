'use strict';

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  console.error(err.stack);

  if (err.type === 'validation') {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({ error: 'Database constraint violation', detail: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
}

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

module.exports = { errorHandler, notFound };
