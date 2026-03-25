'use strict';

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { getDb } = require('../db/database');

// Color palette
const COLORS = {
  primary: '#1a237e',     // deep blue
  accent: '#e53935',      // red
  lightGray: '#f5f5f5',
  midGray: '#bdbdbd',
  darkGray: '#424242',
  white: '#ffffff',
  black: '#000000',
  statusEN_ATTENTE: '#f57c00',
  statusVALIDE: '#2e7d32',
  statusREFUSE: '#c62828',
  statusEN_COURS: '#1565c0',
};

function getStatutColor(statut) {
  return COLORS[`status${statut}`] || COLORS.darkGray;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  // dateStr may be YYYY-MM-DD or a full datetime
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function drawPageHeader(doc, pageNumber, totalPages) {
  const pageWidth = doc.page.width;
  const margin = 40;

  // Header background bar
  doc.rect(0, 0, pageWidth, 50).fill(COLORS.primary);

  // Title
  doc.fillColor(COLORS.white)
     .fontSize(18)
     .font('Helvetica-Bold')
     .text('FERAILLE APP', margin, 15, { align: 'left' });

  // Subtitle
  doc.fillColor(COLORS.white)
     .fontSize(10)
     .font('Helvetica')
     .text('Export des Fiches', margin + 180, 20, { align: 'left' });

  // Page number
  doc.fillColor(COLORS.white)
     .fontSize(9)
     .text(`Page ${pageNumber} / ${totalPages}`, 0, 20, { align: 'right', width: pageWidth - margin });

  // Red accent line
  doc.rect(0, 50, pageWidth, 4).fill(COLORS.accent);

  doc.fillColor(COLORS.black);
}

function drawFicheCard(doc, fiche, yStart) {
  const margin = 40;
  const pageWidth = doc.page.width;
  const cardWidth = pageWidth - margin * 2;

  let y = yStart;

  // Card background
  doc.roundedRect(margin, y, cardWidth, 12, 3).fill(COLORS.primary);

  // Card header text
  doc.fillColor(COLORS.white)
     .fontSize(11)
     .font('Helvetica-Bold')
     .text(`Fiche #${fiche.id}  —  ${formatDate(fiche.date)}`, margin + 10, y + 1, {
       width: cardWidth - 20,
       height: 12,
     });

  y += 18;

  // Info rows background
  doc.rect(margin, y, cardWidth, 56).fill(COLORS.lightGray);

  // Info fields
  const col1X = margin + 10;
  const col2X = margin + cardWidth / 2 + 10;
  const labelColor = COLORS.darkGray;
  const valueColor = COLORS.black;

  // Row 1
  doc.fillColor(labelColor).fontSize(8).font('Helvetica').text('Employé:', col1X, y + 6);
  doc.fillColor(valueColor).fontSize(9).font('Helvetica-Bold').text(fiche.employe_nom || 'N/A', col1X + 50, y + 6);

  doc.fillColor(labelColor).fontSize(8).font('Helvetica').text('Client:', col2X, y + 6);
  doc.fillColor(valueColor).fontSize(9).font('Helvetica-Bold').text(fiche.client || 'N/A', col2X + 40, y + 6);

  // Row 2
  doc.fillColor(labelColor).fontSize(8).font('Helvetica').text('Source:', col1X, y + 24);
  doc.fillColor(valueColor).fontSize(9).font('Helvetica').text(fiche.source || 'N/A', col1X + 50, y + 24);

  doc.fillColor(labelColor).fontSize(8).font('Helvetica').text('Statut:', col2X, y + 24);
  const statutColor = getStatutColor(fiche.statut);
  doc.roundedRect(col2X + 40, y + 22, 80, 14, 3).fill(statutColor);
  doc.fillColor(COLORS.white).fontSize(8).font('Helvetica-Bold')
     .text(fiche.statut || 'N/A', col2X + 42, y + 25, { width: 76, align: 'center' });

  // Row 3
  if (fiche.commentaire_secretaire) {
    doc.fillColor(labelColor).fontSize(8).font('Helvetica').text('Commentaire:', col1X, y + 42);
    doc.fillColor(valueColor).fontSize(8).font('Helvetica')
       .text(fiche.commentaire_secretaire, col1X + 70, y + 42, { width: cardWidth - 90 });
  }

  y += 64;

  // Notes texte section
  if (fiche.notes_texte) {
    doc.rect(margin, y, cardWidth, 14).fill(COLORS.midGray);
    doc.fillColor(COLORS.darkGray).fontSize(9).font('Helvetica-Bold')
       .text('Notes', margin + 10, y + 3);
    y += 18;

    doc.rect(margin, y, cardWidth, 1).fill(COLORS.midGray);
    y += 4;

    const notesStartY = y;
    doc.fillColor(COLORS.black).fontSize(9).font('Helvetica')
       .text(fiche.notes_texte, margin + 10, y, { width: cardWidth - 20 });
    y = doc.y + 8;

    doc.rect(margin, notesStartY - 4, cardWidth, y - notesStartY + 4).stroke(COLORS.midGray);
  }

  // Drawing / image section
  if (fiche.notes_dessin) {
    try {
      let imageBuffer = null;

      if (typeof fiche.notes_dessin === 'string' && fiche.notes_dessin.startsWith('data:')) {
        // data URL: data:image/png;base64,<data>
        const commaIndex = fiche.notes_dessin.indexOf(',');
        if (commaIndex !== -1) {
          const base64Data = fiche.notes_dessin.substring(commaIndex + 1);
          imageBuffer = Buffer.from(base64Data, 'base64');
        }
      } else if (typeof fiche.notes_dessin === 'string') {
        // raw base64
        imageBuffer = Buffer.from(fiche.notes_dessin, 'base64');
      }

      if (imageBuffer && imageBuffer.length > 0) {
        // Section header
        doc.rect(margin, y, cardWidth, 14).fill(COLORS.midGray);
        doc.fillColor(COLORS.darkGray).fontSize(9).font('Helvetica-Bold')
           .text('Dessin / Croquis', margin + 10, y + 3);
        y += 18;

        // Image max dimensions
        const maxImgWidth = cardWidth - 20;
        const maxImgHeight = 200;

        // Embed image
        doc.image(imageBuffer, margin + 10, y, {
          fit: [maxImgWidth, maxImgHeight],
          align: 'center',
        });

        y += maxImgHeight + 10;
      }
    } catch (imgErr) {
      console.warn(`Could not embed image for fiche #${fiche.id}:`, imgErr.message);
      doc.fillColor(COLORS.accent).fontSize(8)
         .text('[Dessin non lisible]', margin + 10, y);
      y += 14;
    }
  }

  // Separator line
  y += 6;
  doc.rect(margin, y, cardWidth, 1).fill(COLORS.midGray);
  y += 12;

  return y;
}

async function generatePDF(fiches, res) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      info: {
        Title: 'Export Fiches - Feraille App',
        Author: 'Feraille App',
        CreationDate: new Date(),
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fiches-export-${Date.now()}.pdf"`);

    doc.pipe(res);

    doc.on('error', reject);
    res.on('error', reject);

    const FICHES_PER_PAGE = 1; // one fiche per page for clarity with images
    const totalPages = Math.ceil(fiches.length / FICHES_PER_PAGE);

    fiches.forEach((fiche, index) => {
      const pageNumber = index + 1;

      if (index > 0) {
        doc.addPage();
      }

      drawPageHeader(doc, pageNumber, totalPages);

      // Generation date
      doc.fillColor(COLORS.darkGray)
         .fontSize(8)
         .font('Helvetica')
         .text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 40, 62, {
           align: 'right',
           width: doc.page.width - 80,
         });

      drawFicheCard(doc, fiche, 78);
    });

    // If no fiches
    if (fiches.length === 0) {
      drawPageHeader(doc, 1, 1);
      doc.fillColor(COLORS.darkGray)
         .fontSize(14)
         .font('Helvetica')
         .text('Aucune fiche trouvée pour les critères sélectionnés.', 40, 100, {
           align: 'center',
           width: doc.page.width - 80,
         });
    }

    doc.end();
    doc.on('end', resolve);
  });
}

// GET /api/export/pdf
// Query params:
//   mode: 'single' | 'lot' | 'plage'
//   ids: comma-separated ids (for single/lot)
//   date_debut, date_fin: date strings (for plage)
router.get('/pdf', async (req, res, next) => {
  try {
    const db = getDb();
    const { mode, ids, date_debut, date_fin } = req.query;

    let fiches = [];

    if (mode === 'single' || mode === 'lot') {
      if (!ids) {
        const err = new Error('Parameter "ids" is required for mode single/lot.');
        err.type = 'validation';
        return next(err);
      }

      const idList = ids.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(Number)
        .filter(n => !isNaN(n));

      if (idList.length === 0) {
        const err = new Error('No valid ids provided.');
        err.type = 'validation';
        return next(err);
      }

      const placeholders = idList.map(() => '?').join(', ');
      fiches = db.prepare(`SELECT * FROM fiches WHERE id IN (${placeholders}) ORDER BY date DESC`).all(...idList);

    } else if (mode === 'plage') {
      if (!date_debut || !date_fin) {
        const err = new Error('Parameters "date_debut" and "date_fin" are required for mode plage.');
        err.type = 'validation';
        return next(err);
      }

      fiches = db.prepare(
        'SELECT * FROM fiches WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC'
      ).all(date_debut, date_fin);

    } else {
      const err = new Error('Parameter "mode" must be one of: single, lot, plage.');
      err.type = 'validation';
      return next(err);
    }

    await generatePDF(fiches, res);
  } catch (err) {
    if (!res.headersSent) {
      next(err);
    }
  }
});

module.exports = router;
