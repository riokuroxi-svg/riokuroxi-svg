import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMessage } from '../src/render-message.js';

test('renders text and escapes HTML', () => {
  const html = renderMessage({ version: 1, type: 'text', content: { text: '<script>alert(1)</script>\nHola' } });
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /<br>/);
  assert.doesNotMatch(html, /<script>/);
});

test('renders cards and safe actions', () => {
  const html = renderMessage({
    version: 1,
    type: 'card',
    content: { title: 'Oferta', body: '50% off' },
    actions: [
      { type: 'reply', id: 'buy', label: 'Comprar' },
      { type: 'url', url: 'https://example.com/?x=1&y=2', label: 'Ver sitio' }
    ]
  });
  assert.match(html, /kuroxi-card/);
  assert.match(html, /data-id="buy"/);
  assert.match(html, /https:\/\/example\.com/);
  assert.match(html, /&amp;/);
});

test('renders lists, carousels and catalogs', () => {
  const list = renderMessage({ version: 1, type: 'list', content: { sections: [{ title: 'Planes', rows: [{ id: 'pro', title: 'Pro', description: 'Ilimitado' }] }] } });
  const carousel = renderMessage({ version: 1, type: 'carousel', content: { cards: [{ title: 'Uno' }, { title: 'Dos' }] } });
  const catalog = renderMessage({ version: 1, type: 'catalog', content: { products: [{ id: 'p1', title: 'Producto', price: 199 }] } });
  assert.match(list, /data-id="pro"/);
  assert.match(carousel, /kuroxi-carousel-track/);
  assert.match(catalog, /data-product-id="p1"/);
});

test('renders rich response without executing code', () => {
  const html = renderMessage({ version: 1, type: 'rich_response', content: { title: 'Código', code: '<script>bad()</script>', table: [['A', 'B'], ['1', '2']] } });
  assert.match(html, /kuroxi-code/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /kuroxi-table/);
});

test('renders polls, orders and media placeholders', () => {
  const poll = renderMessage({ version: 1, type: 'poll', content: { question: '¿Listo?', options: ['Sí', 'No'] } });
  const order = renderMessage({ version: 1, type: 'order', content: { orderId: 'A-1', status: 'Pagado', total: '$199' } });
  const media = renderMessage({ version: 1, type: 'media', content: { kind: 'image', source: 'local://image', caption: 'Vista' } });
  assert.match(poll, /data-option="Sí"/);
  assert.match(order, /A-1/);
  assert.match(media, /data-media-kind="image"/);
});
