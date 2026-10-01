import test from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityError, CapabilityRegistry } from '../src/capabilities.js';

test('unknown capabilities are never assumed to be supported', () => {
  const registry = new CapabilityRegistry({ clock: () => 100 });
  const item = registry.get('message.text');
  assert.equal(item.status, 'unknown');
  assert.equal(item.supported, false);
  assert.equal(registry.supports('message.text'), false);
  assert.equal(item.lastVerifiedAt, 100);
});

test('registers stable, advanced and experimental capabilities', () => {
  const registry = new CapabilityRegistry({ clock: () => 200 });
  registry.set('message.text', { status: 'stable', version: '1', confidence: 'verified' });
  registry.set('message.native_flow', { status: 'advanced', version: '3', confidence: 'tested', fallback: 'message.list' });
  registry.set('message.html_app', { status: 'experimental', confidence: 'observed', supported: true });
  assert.equal(registry.supports('message.text'), true);
  assert.equal(registry.supports('message.native_flow'), true);
  assert.equal(registry.supports('message.html_app'), true);
  assert.equal(registry.supports('message.html_app', { includeExperimental: false }), false);
  assert.equal(registry.get('message.native_flow').fallback, 'message.list');
});

test('resolves the first supported capability and explicit fallback', () => {
  const registry = new CapabilityRegistry({
    initial: {
      'message.rich_response': { status: 'unknown' },
      'message.list': { status: 'stable', confidence: 'verified' },
      'message.text': { status: 'stable', confidence: 'verified' }
    }
  });
  assert.equal(registry.resolve(['message.rich_response', 'message.list']).name, 'message.list');
  assert.equal(registry.resolve(['message.rich_response'], { fallback: 'message.text' }).name, 'message.text');
  assert.throws(() => registry.resolve(['message.rich_response']), CapabilityError);
});

test('lists by status and protects returned descriptors', () => {
  const registry = new CapabilityRegistry();
  registry.set('message.text', { status: 'stable' });
  registry.set('message.list', { status: 'advanced' });
  const stable = registry.list({ status: 'stable' });
  assert.deepEqual(stable.map(item => item.name), ['message.text']);
  const descriptor = registry.get('message.text');
  assert.throws(() => { descriptor.status = 'experimental'; }, TypeError);
  assert.equal(registry.get('message.text').status, 'stable');
});

test('rejects contradictory or malformed descriptors', () => {
  const registry = new CapabilityRegistry();
  assert.throws(() => registry.set('invalid', { status: 'stable' }), TypeError);
  assert.throws(() => registry.set('message.text', { status: 'unknown', supported: true }), TypeError);
  assert.throws(() => registry.set('message.text', { status: 'unsupported', supported: true }), TypeError);
  assert.throws(() => registry.set('message.text', { status: 'stable', confidence: 'made-up' }), TypeError);
});

test('closes and rejects further operations', () => {
  const registry = new CapabilityRegistry();
  registry.close();
  assert.throws(() => registry.get('message.text'), CapabilityError);
  assert.throws(() => registry.set('message.text', { status: 'stable' }), CapabilityError);
});
