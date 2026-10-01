import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, EventBusError, SENSITIVITY } from '../src/event-bus.js';

test('publishes a canonical immutable event envelope', () => {
  const bus = new EventBus({ clock: () => 123, idFactory: () => 'evt_1' });
  const received = [];
  bus.on('message.received', event => received.push(event));
  const payload = { messageId: 'm1', nested: { ok: true } };
  const event = bus.publish('message.received', payload, {
    sessionId: 'session-1',
    connectionGeneration: 4,
    sensitivity: SENSITIVITY.SENSITIVE,
    correlationId: 'corr-1'
  });
  payload.nested.ok = false;
  assert.equal(received.length, 1);
  assert.deepEqual(event, {
    id: 'evt_1',
    type: 'message.received',
    occurredAt: 123,
    sessionId: 'session-1',
    connectionGeneration: 4,
    correlationId: 'corr-1',
    sensitivity: 'sensitive',
    payload: { messageId: 'm1', nested: { ok: true } }
  });
  assert.throws(() => { event.payload.nested.ok = false; }, TypeError);
  assert.equal(event.payload.nested.ok, true);
});

test('supports exact, any and once listeners', () => {
  const bus = new EventBus({ idFactory: (() => { let n = 0; return () => `e${++n}`; })() });
  const calls = [];
  bus.on('connection.state', () => calls.push('exact'));
  bus.onAny(event => calls.push(`any:${event.type}`));
  bus.once('connection.state', () => calls.push('once'));
  bus.publish('connection.state', { state: 'ready' });
  bus.publish('connection.state', { state: 'closed' });
  assert.deepEqual(calls, ['exact', 'once', 'any:connection.state', 'exact', 'any:connection.state']);
});

test('listener failure does not stop other listeners and is reported', () => {
  const failures = [];
  const bus = new EventBus({ onListenerError: (error, event) => failures.push({ error, event }) });
  const calls = [];
  bus.on('message.sent', () => { throw new Error('listener failed'); });
  bus.on('message.sent', () => calls.push('continued'));
  bus.publish('message.sent', { id: 'm1' });
  assert.deepEqual(calls, ['continued']);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].event.type, 'message.sent');
  assert.match(failures[0].error.message, /listener failed/);
});

test('unsubscribe, clear and close work', () => {
  const bus = new EventBus();
  let count = 0;
  const unsubscribe = bus.on('sync.completed', () => { count += 1; });
  bus.publish('sync.completed', {});
  unsubscribe();
  bus.publish('sync.completed', {});
  assert.equal(count, 1);
  bus.on('sync.started', () => { count += 1; });
  bus.clear('sync.started');
  bus.publish('sync.started', {});
  assert.equal(count, 1);
  bus.close();
  assert.throws(() => bus.publish('sync.started', {}), EventBusError);
});

test('rejects invalid event types and sensitivity', () => {
  const bus = new EventBus();
  assert.throws(() => bus.on('invalid', () => {}), TypeError);
  assert.throws(() => bus.publish('Message.Received', {}), TypeError);
  assert.throws(() => bus.publish('message.received', {}, { sensitivity: 'secret' }), TypeError);
});
