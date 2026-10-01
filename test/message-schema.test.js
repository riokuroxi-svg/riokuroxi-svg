import test from 'node:test';
import assert from 'node:assert/strict';
import { MessageSchemaError, normalizeMessageDocument, validateMessageDocument } from '../src/message-schema.js';
import { CapabilityRegistry } from '../src/capabilities.js';
import { MessageResolver } from '../src/message-resolver.js';

test('validates and normalizes a card document', () => {
  const source = {
    type: 'card',
    content: { title: 'Welcome', body: 'Choose an option' },
    actions: [{ type: 'reply', id: 'menu', label: 'Open menu' }]
  };
  const normalized = normalizeMessageDocument(source);
  assert.equal(normalized.version, 1);
  assert.deepEqual(normalized.capabilities, ['message.card']);
  assert.throws(() => { normalized.content.title = 'changed'; }, TypeError);
  assert.equal(source.version, undefined);
});

test('validates lists, carousels and commerce documents', () => {
  assert.equal(validateMessageDocument({
    version: 1,
    type: 'list',
    content: { sections: [{ title: 'Plans', rows: [{ id: 'pro', title: 'Pro' }] }] }
  }), true);
  assert.equal(validateMessageDocument({
    version: 1,
    type: 'carousel',
    content: { cards: [{ title: 'One' }, { title: 'Two' }] }
  }), true);
  assert.equal(validateMessageDocument({
    version: 1,
    type: 'catalog',
    content: { products: [{ id: 'p1', title: 'Product' }] }
  }), true);
});

test('rejects invalid type-specific content and action data', () => {
  assert.throws(() => validateMessageDocument({ version: 1, type: 'text', content: {} }), MessageSchemaError);
  assert.throws(() => validateMessageDocument({ version: 1, type: 'carousel', content: { cards: [] } }), MessageSchemaError);
  assert.throws(() => validateMessageDocument({ version: 1, type: 'carousel', content: { cards: Array.from({ length: 11 }, () => ({ title: 'x' })) } }), MessageSchemaError);
  assert.throws(() => validateMessageDocument({ version: 1, type: 'card', content: { title: 'x' }, actions: [{ type: 'url', label: 'Open' }] }), MessageSchemaError);
  assert.throws(() => validateMessageDocument({ version: 2, type: 'card', content: { title: 'x' } }), MessageSchemaError);
});

test('resolver accepts a normalized document and still applies fallback', () => {
  const resolver = new MessageResolver({ capabilities: new CapabilityRegistry({ initial: {
    'message.card': { status: 'advanced', confidence: 'tested' },
    'message.text': { status: 'stable', confidence: 'verified' }
  }}) });
  const result = resolver.resolveDocument({
    type: 'card',
    content: { title: 'Unavailable format' },
    capabilities: ['message.rich_response'],
    fallback: 'message.text',
    metadata: { messageId: 'm1' }
  });
  assert.equal(result.messageId, 'm1');
  assert.equal(result.selected, 'message.text');
  assert.equal(result.fallbackUsed, true);
});
