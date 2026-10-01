import test from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityRegistry } from '../src/capabilities.js';
import { EncoderError, EncoderRegistry, MessageCompiler, PreviewEncoder } from '../src/encoder.js';
import { MessageResolver } from '../src/message-resolver.js';

test('compiles a document through capability resolution and preview encoding', () => {
  const capabilities = new CapabilityRegistry({ initial: {
    'message.card': { status: 'advanced', confidence: 'tested' },
    'message.text': { status: 'stable', confidence: 'verified' }
  }});
  const resolver = new MessageResolver({ capabilities });
  const encoders = new EncoderRegistry();
  encoders.register('message.card', new PreviewEncoder());
  const compiler = new MessageCompiler({ resolver, encoders });
  const compiled = compiler.compile({
    version: 1,
    type: 'card',
    content: { title: 'Hello', body: 'Preview' },
    capabilities: ['message.card'],
    metadata: { messageId: 'm1' }
  });
  assert.equal(compiled.messageId, 'm1');
  assert.equal(compiled.selectedCapability, 'message.card');
  assert.equal(compiled.encoded.format, 'preview-html');
  assert.match(compiled.encoded.html, /Hello/);
});

test('compiler uses a registered fallback encoder', () => {
  const capabilities = new CapabilityRegistry({ initial: {
    'message.rich_response': { status: 'unknown' },
    'message.text': { status: 'stable', confidence: 'verified' }
  }});
  const resolver = new MessageResolver({ capabilities });
  const encoders = new EncoderRegistry();
  encoders.register('message.text', new PreviewEncoder());
  const compiler = new MessageCompiler({ resolver, encoders });
  const compiled = compiler.compile({
    version: 1,
    type: 'text',
    content: { text: 'Fallback' },
    capabilities: ['message.rich_response'],
    fallback: 'message.text'
  });
  assert.equal(compiled.selectedCapability, 'message.text');
  assert.equal(compiled.fallbackUsed, true);
});

test('fails clearly when selected capability has no encoder', () => {
  const capabilities = new CapabilityRegistry({ initial: { 'message.text': { status: 'stable' } } });
  const compiler = new MessageCompiler({ resolver: new MessageResolver({ capabilities }), encoders: new EncoderRegistry() });
  assert.throws(() => compiler.compile({ version: 1, type: 'text', content: { text: 'Missing encoder' } }), EncoderError);
});

test('rejects duplicate encoders and protects compiled output', () => {
  const encoders = new EncoderRegistry();
  encoders.register('message.text', new PreviewEncoder());
  assert.throws(() => encoders.register('message.text', new PreviewEncoder()), EncoderError);
  const capabilities = new CapabilityRegistry({ initial: { 'message.text': { status: 'stable' } } });
  const compiler = new MessageCompiler({ resolver: new MessageResolver({ capabilities }), encoders });
  const compiled = compiler.compile({ version: 1, type: 'text', content: { text: 'immutable' } });
  assert.throws(() => { compiled.encoded.html = 'changed'; }, TypeError);
});
