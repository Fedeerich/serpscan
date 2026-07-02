export const WEIGHTS = {
  meta: 25,
  headings: 15,
  images: 10,
  links: 10,
  performance: 20,
  structuredData: 10,
  robots: 10,
};

export function calculateScore(categories) {
  let total = 0;

  for (const [key, category] of Object.entries(categories)) {
    const weight = WEIGHTS[key] ?? 0;
    total += (category.score / 100) * weight;
  }

  return Math.round(total);
}
