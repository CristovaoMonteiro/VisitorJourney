const express = require('express');
const products = require('../../data/products.json');

const router = express.Router();

// The catalogue is static, so it is loaded once at startup and cached by the browser.
router.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(products);
});

router.get('/:slug', (req, res) => {
  const product = products.find((p) => p.slug === req.params.slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

module.exports = router;
