import { productMatchesBike } from '@/utils/searchUtils';

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const productKey = (product) => String(product?.id ?? product?._id ?? '');

const meaningfulBikes = (product) =>
  (Array.isArray(product?.bikes) ? product.bikes : []).filter(
    (bike) => bike && normalizeText(bike) !== 'all'
  );

const scoreSimilarity = (current, candidate) => {
  if (productKey(candidate) === productKey(current)) return -1;
  if (!Number(candidate?.price) || Number(candidate.price) <= 0) return -1;

  let score = 0;

  if (
    current.subcategory &&
    candidate.subcategory &&
    normalizeText(current.subcategory) === normalizeText(candidate.subcategory)
  ) {
    score += 70;
  } else if (
    current.category &&
    candidate.category &&
    normalizeText(current.category) === normalizeText(candidate.category)
  ) {
    score += 40;
  }

  if (
    current.brand &&
    candidate.brand &&
    normalizeText(current.brand) === normalizeText(candidate.brand)
  ) {
    score += 30;
  }

  meaningfulBikes(current).forEach((bike) => {
    if (productMatchesBike(candidate, bike)) score += 25;
  });

  const compatCurrent = normalizeText(current.specifications?.Compatibility || '');
  const compatCandidate = normalizeText(candidate.specifications?.Compatibility || '');
  if (compatCurrent && compatCandidate) {
    if (compatCurrent === compatCandidate) score += 20;
    else if (compatCurrent.includes(compatCandidate) || compatCandidate.includes(compatCurrent)) {
      score += 12;
    }
  }

  const nameTokens = new Set(
    normalizeText(current.name || '')
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
  normalizeText(candidate.name || '')
    .split(/\s+/)
    .forEach((word) => {
      if (nameTokens.has(word)) score += 4;
    });

  return score;
};

/** Picks catalog items most similar to `current` (subcategory, brand, bike fitment). */
export const getSimilarProducts = (current, catalog = [], { limit = 4 } = {}) => {
  if (!current || !Array.isArray(catalog) || catalog.length === 0) return [];

  const ranked = catalog
    .map((candidate) => ({ candidate, score: scoreSimilarity(current, candidate) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const picked = ranked.slice(0, limit).map(({ candidate }) => candidate);

  if (picked.length >= limit) return picked;

  const pickedIds = new Set(picked.map(productKey));
  const fallback = catalog.filter(
    (candidate) =>
      productKey(candidate) !== productKey(current) &&
      !pickedIds.has(productKey(candidate)) &&
      Number(candidate?.price) > 0 &&
      candidate.category &&
      current.category &&
      normalizeText(candidate.category) === normalizeText(current.category)
  );

  return [...picked, ...fallback].slice(0, limit);
};