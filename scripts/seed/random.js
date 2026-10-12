/**
 * Seeded pseudo-random generator (mulberry32) plus small helpers.
 * Every random decision in the seed goes through one instance, so the same
 * seed always produces exactly the same dataset.
 */
function createRandom(seed) {
  let state = seed >>> 0;

  /** Uniform float in [0, 1). */
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const rng = {
    next,
    /** Integer in [min, max], both inclusive. */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    float: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
    /** Picks a key of `{ key: weight }` proportionally to its weight. */
    weighted(weights) {
      const entries = Object.entries(weights);
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [key, weight] of entries) {
        roll -= weight;
        if (roll < 0) return key;
      }
      return entries[entries.length - 1][0];
    },
    /** `count` distinct items from `list`, in random order. */
    sample(list, count) {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, Math.min(count, copy.length));
    },
    /** RFC 4122 v4-shaped UUID built from the seeded stream (valid for the API validator). */
    uuid() {
      const hex = Array.from({ length: 32 }, () => Math.floor(next() * 16).toString(16));
      hex[12] = '4';
      hex[16] = ['8', '9', 'a', 'b'][Math.floor(next() * 4)];
      const h = hex.join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    },
    /** Short uppercase code for order references. */
    code(length) {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      return Array.from({ length }, () => alphabet[Math.floor(next() * alphabet.length)]).join('');
    },
  };
  return rng;
}

module.exports = { createRandom };
