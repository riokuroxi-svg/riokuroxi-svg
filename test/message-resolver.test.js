import test from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityRegistry } from '../src/capabilities.js';
import { MessageResolver, MessageValidationError } from '../src/message-resolver.js';

test('selects the first supported message capability', () => {
  const capabilities = new CapabilityRegistry({ initial: {
    'message.rich_response': { status: 'advanced', confidence: 'tested' },
    'message.text': { status: 'stable', confidence: 'verified' }
  }});
  const resolver = new MessageResolver({ capabilities });
  const result = resolver.resolve({
    messageId: 'm1',
    capabilities: ['message.rich_response', 'message.text'],
    content: { title: 'Report', body: 'Ready' }
  });
  assert.equal(result.selected, 'message.rich_response');
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.status, 'advanced');
});

test('uses a safe fallback when the preferred capability is unknown', () => {
  const capabilities = new CapabilityRegistry({ initial: {
    'message.list': { status: 'stable', confidence: 'verified' },
    'message.text': { status: 'stable', confidence: 'verified' }
  }});
  const resolver = new MessageResolver({ capabilities });
  const result = resolver.resolve({
    capabilities: ['message.rich_response'],
    fallback: 'message.text',
    content: { body: 'Plain summary' }
  });
  assert.equal(result.selected, 'message.text');
  assert.equal(result.fallbackUsed, true);
});

test('does not enable experimental capabilities without explicit permission', () => {
  const capabilities = new CapabilityRegistry({ initial: {
    'message.html_app': { status: 'experimental', confidence: 'observed' },
    'message.text': { status: 'stable', confidence: 'verified' }
  }});
  const resolver = new MessageResolver({ capabilities });
  const result = resolver.resolve({
    capabilities: ['message.html_app', 'message.text'],
    content: { body: 'Safe fallback' }
  });
  assert.equal(result.selected, 'message.text');
  assert.equal(result.fallbackUsed, true);
  const experimental = resolver.resolve({
    capabilities: ['message.html_app'],
    allowExperimental: true,
    content: { body: 'Lab only' }
  });
  assert.equal(experimental.selected, 'message.html_app');
});

test('clones and freezes message content', () => {
  const capabilities = new CapabilityRegistry({ initial: { 'message.text': { status: 'stable' } } });
  const resolver = new MessageResolver({ capabilities });
  const content = { body: 'immutable', data: { ok: true } };
  const result = resolver.resolve({ capabilities: ['message.text'], content });
  content.data.ok = false;
  assert.equal(result.content.data.ok, true);
  assert.throws(() => { result.content.data.ok = false; }, TypeError);
});

test('rejects invalid messages', () => {
  const resolver = new MessageResolver({ capabilities: new CapabilityRegistry() });
  assert.throws(() => resolver.resolve(null), MessageValidationError);
  assert.throws(() => resolver.resolve({ capabilities: [], content: {} }), MessageValidationError);
  assert.throws(() => resolver.resolve({ capabilities: ['message.text'] }), MessageValidationError);
  assert.throws(() => resolver.resolve({ capabilities: ['message.text'], fallback: 2, content: {} }), MessageValidationError);
});
