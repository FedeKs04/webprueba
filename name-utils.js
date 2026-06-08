export function normalizeFullName(value = '') {
  return value.trim().replace(/\s+/g, ' ');
}

export function hasFirstAndLastName(value = '') {
  const parts = normalizeFullName(value).split(' ').filter(Boolean);
  return parts.length >= 2 && parts.every(part => part.length >= 1);
}

export function abbreviatedName(value = '') {
  const parts = normalizeFullName(value).split(' ').filter(Boolean);
  if (parts.length < 2) return '';
  return `${parts[0]} ${parts[1][0].toLocaleUpperCase('es-UY')}.`;
}
