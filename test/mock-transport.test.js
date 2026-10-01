import test from 'node:test';
import assert from 'node:assert/strict';
import { DeliveryError, DeliveryManager, MockTransport, TransportError } from '../src/mock-transport.js';
import { DeliveryStore } from '../src/delivery-store.js';
import { MemoryDeviceStore } from '../src/device-store.js';

test('delivers a message and returns an acknowledgement', async () => {
  const transport = new MockTransport();
  const manager = new DeliveryManager({ transport });
  const result = await manager.send('m1', { text: 'hello' });
  assert.deepEqual(result, { messageId: 'm1', status: 'acknowledged', attempt: 1 });
  assert.deepEqual(transport.sent, [{ messageId: 'm1', payload: { text: 'hello' }, attempt: 1 }]);
});

test('retries transient failures and succeeds', async () => {
  const failures = new Set([1, 2]);
  const transport = new MockTransport({ failurePlan: envelope => {
    if (failures.delete(envelope.attempt)) return new TransportError('temporary');
  }});
  const manager = new DeliveryManager({ transport, maxAttempts: 3 });
  const result = await manager.send('m2', { text: 'retry me' });
  assert.equal(result.attempt, 3);
  assert.deepEqual(transport.sent.map(item => item.attempt), [1, 2, 3]);
});

test('stops immediately on non-retryable failure', async () => {
  const transport = new MockTransport({ failurePlan: () => new TransportError('auth failed', { retryable: false }) });
  const manager = new DeliveryManager({ transport, maxAttempts: 5 });
  await assert.rejects(manager.send('m3', {}), error => {
    assert.ok(error instanceof DeliveryError);
    assert.equal(error.attempts, 1);
    assert.equal(error.causeCode, 'KUROXI_TRANSPORT_ERROR');
    return true;
  });
  assert.equal(transport.sent.length, 1);
});

test('deduplicates concurrent and completed sends', async () => {
  const transport = new MockTransport({ ackDelayMs: 10 });
  const manager = new DeliveryManager({ transport });
  const first = manager.send('m4', { text: 'once' });
  const second = manager.send('m4', { text: 'different payload ignored' });
  assert.equal(first, second);
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a, b);
  const third = manager.send('m4', { text: 'again ignored' });
  assert.equal(third, a);
  assert.equal(transport.sent.length, 1);
});

test('failed messages can be explicitly retried later', async () => {
  let fail = true;
  const transport = new MockTransport({ failurePlan: () => {
    if (fail) return new TransportError('offline');
  }});
  const manager = new DeliveryManager({ transport, maxAttempts: 1 });
  await assert.rejects(manager.send('m5', {}), DeliveryError);
  fail = false;
  const result = await manager.send('m5', { text: 'retry later' });
  assert.equal(result.status, 'acknowledged');
  assert.equal(transport.sent.length, 2);
});

test('persists delivery lifecycle through the manager', async () => {
  const store = new DeliveryStore({ store: new MemoryDeviceStore() });
  let fail = true;
  const transport = new MockTransport({ failurePlan: () => {
    if (fail) return new TransportError('offline');
  }});
  const manager = new DeliveryManager({ transport, maxAttempts: 1, deliveryStore: store });
  await assert.rejects(manager.send('m6', { text: 'persist me' }), DeliveryError);
  assert.equal((await store.get('m6')).status, 'failed');
  fail = false;
  const result = await manager.send('m6', { text: 'retry me' });
  assert.equal(result.status, 'acknowledged');
  assert.equal((await store.get('m6')).status, 'acknowledged');
});

test('a recreated manager resumes from the delivery store', async () => {
  const store = new DeliveryStore({ store: new MemoryDeviceStore() });
  const transport = new MockTransport();
  const first = new DeliveryManager({ transport, deliveryStore: store });
  const expected = await first.send('m7', { text: 'once' });
  const second = new DeliveryManager({ transport, deliveryStore: store });
  const actual = await second.send('m7', { text: 'different payload' });
  assert.deepEqual(actual, expected);
  assert.equal(transport.sent.length, 1);
});

test('validates message IDs and constructor options', () => {
  assert.throws(() => new MockTransport({ ackDelayMs: -1 }), TypeError);
  assert.throws(() => new DeliveryManager({ transport: new MockTransport(), maxAttempts: 0 }), TypeError);
  const manager = new DeliveryManager({ transport: new MockTransport() });
  assert.throws(() => manager.send('', {}), TypeError);
});
