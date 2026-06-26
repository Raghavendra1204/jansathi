/**
 * Joins CSS class names dynamically.
 * @param {...string} classes - List of class names to merge.
 * @returns {string} - Combined class list.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Formats a timestamp/date string into a user-friendly date.
 * @param {Date|string|number} date - Date to format.
 * @returns {string} - Formatted date.
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Abbreviates numbers (e.g. 1500 -> 1.5k).
 * @param {number} num - Number to format.
 * @returns {string} - Formatted number.
 */
export function formatCompactNumber(num) {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(num);
}
