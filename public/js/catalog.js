let cache = null;

/** Loads the catalogue once per page and memoises it. */
export async function getProducts() {
  if (!cache) {
    cache = fetch('/api/products').then((res) => {
      if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
      return res.json();
    });
  }
  return cache;
}

export async function getProductBySlug(slug) {
  const products = await getProducts();
  return products.find((p) => p.slug === slug) ?? null;
}

export async function getProductById(id) {
  const products = await getProducts();
  return products.find((p) => p.id === id) ?? null;
}

export const isOnSale = (product) => product.compareAtPrice != null && product.compareAtPrice > product.price;
