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

function drawPageHeader(doc, pageNumber, totalPages, logoBase64) {
  const pageWidth = doc.page.width;
  const margin = 40;

  const headerHeight = 60;

  if (logoBase64) {
    try {
      let imageBuffer = null;
      if (logoBase64.startsWith('data:')) {
        const commaIndex = logoBase64.indexOf(',');
        if (commaIndex !== -1) {
          imageBuffer = Buffer.from(logoBase64.substring(commaIndex + 1), 'base64');
        }
      } else {
        imageBuffer = Buffer.from(logoBase64, 'base64');
      }
      if (imageBuffer && imageBuffer.length > 0) {
        const maxLogoWidth = 180;
        const maxLogoHeight = headerHeight - 8;
        doc.image(imageBuffer, margin, 4, { fit: [maxLogoWidth, maxLogoHeight], align: 'left', valign: 'center' });
      }
    } catch {
      // Logo non lisible, on laisse vide
    }
  }

  // Page number (top right)
  doc.fillColor(COLORS.darkGray)
     .fontSize(9)
     .font('Helvetica')
     .text(`Page ${pageNumber} / ${totalPages}`, 0, 24, { align: 'right', width: pageWidth - margin });

  // Thin separator line
  doc.rect(margin, headerHeight, pageWidth - margin * 2, 1).fill(COLORS.midGray);

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

  // Drawing / image section — supports single base64 and multi-page JSON array
  if (fiche.notes_dessin) {
    let pages = [];
    try {
      const parsed = JSON.parse(fiche.notes_dessin);
      if (Array.isArray(parsed)) {
        pages = parsed.filter(p => typeof p === 'string' && p.length > 0);
      } else {
        pages = [fiche.notes_dessin];
      }
    } catch {
      pages = [fiche.notes_dessin];
    }

    for (let pi = 0; pi < pages.length; pi++) {
      try {
        let imageBuffer = null;
        const pageData = pages[pi];

        if (pageData.startsWith('data:')) {
          const commaIndex = pageData.indexOf(',');
          if (commaIndex !== -1) {
            imageBuffer = Buffer.from(pageData.substring(commaIndex + 1), 'base64');
          }
        } else {
          imageBuffer = Buffer.from(pageData, 'base64');
        }

        if (imageBuffer && imageBuffer.length > 0) {
          const label = pages.length > 1 ? `Dessin / Croquis — Page ${pi + 1}/${pages.length}` : 'Dessin / Croquis';
          doc.rect(margin, y, cardWidth, 14).fill(COLORS.midGray);
          doc.fillColor(COLORS.darkGray).fontSize(9).font('Helvetica-Bold').text(label, margin + 10, y + 3);
          y += 18;

          const maxImgWidth = cardWidth - 20;
          const maxImgHeight = 320;

          const imgObj = doc.openImage(imageBuffer);
          const scale = Math.min(maxImgWidth / imgObj.width, maxImgHeight / imgObj.height);
          const actualHeight = Math.round(imgObj.height * scale);

          doc.image(imageBuffer, margin + 10, y, { fit: [maxImgWidth, maxImgHeight], align: 'center' });
          y += actualHeight + 10;
        }
      } catch (imgErr) {
        console.warn(`Could not embed image page ${pi} for fiche #${fiche.id}:`, imgErr.message);
        doc.fillColor(COLORS.accent).fontSize(8).text('[Dessin non lisible]', margin + 10, y);
        y += 14;
      }
    }
  }

  // Separator line
  y += 6;
  doc.rect(margin, y, cardWidth, 1).fill(COLORS.midGray);
  y += 12;

  return y;
}

async function generatePDF(fiches, res, logoBase64) {
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

      drawPageHeader(doc, pageNumber, totalPages, logoBase64);

      // Generation date
      doc.fillColor(COLORS.darkGray)
         .fontSize(8)
         .font('Helvetica')
         .text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 40, 68, {
           align: 'right',
           width: doc.page.width - 80,
         });

      drawFicheCard(doc, fiche, 84);
    });

    // If no fiches
    if (fiches.length === 0) {
      drawPageHeader(doc, 1, 1, logoBase64);
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

    } else if (mode === 'month') {
      const { month } = req.query;
      if (!month) {
        const err = new Error('Parameter "month" is required for mode month (format: YYYY-MM).');
        err.type = 'validation';
        return next(err);
      }
      const debut = `${month}-01`;
      const fin = `${month}-31`;
      fiches = db.prepare(
        'SELECT * FROM fiches WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC'
      ).all(debut, fin);

    } else if (mode === 'range' || mode === 'plage') {
      if (!date_debut || !date_fin) {
        const err = new Error('Parameters "date_debut" and "date_fin" are required for mode range.');
        err.type = 'validation';
        return next(err);
      }

      fiches = db.prepare(
        'SELECT * FROM fiches WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC'
      ).all(date_debut, date_fin);

    } else {
      const err = new Error('Parameter "mode" must be one of: single, month, range.');
      err.type = 'validation';
      return next(err);
    }

    const logoRow = db.prepare("SELECT value FROM settings WHERE key = 'logo'").get();
    const logoBase64 = logoRow?.value || null;

    await generatePDF(fiches, res, logoBase64);
  } catch (err) {
    if (!res.headersSent) {
      next(err);
    }
  }
});

module.exports = router;
