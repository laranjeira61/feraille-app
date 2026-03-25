/**
 * Date formatting utilities for the Ferraille app.
 * Formats dates in French locale without relying on Intl.DateTimeFormat
 * (which may be incomplete on some Android builds).
 */

const JOURS: string[] = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

const MOIS: string[] = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/**
 * Returns today's date formatted as "Mercredi 25 mars 2026"
 */
export function formatDateLong(date: Date = new Date()): string {
  const jour = JOURS[date.getDay()];
  const num = date.getDate();
  const mois = MOIS[date.getMonth()];
  const annee = date.getFullYear();
  return `${jour} ${num} ${mois} ${annee}`;
}

/**
 * Returns today's date formatted as "DD/MM/YYYY"
 */
export function formatDateShort(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Returns current time formatted as "HH:MM:SS"
 */
export function formatTime(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
