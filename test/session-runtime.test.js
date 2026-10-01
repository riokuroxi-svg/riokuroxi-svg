import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionRuntime } from '../src/session-runtime.js';
import { ConnectionMachine, ConnectionState } from '../src/connection-machine.js';
import { EventBus } from '../src/event-bus.js';
import { MemoryDeviceStore } from '../src/device-store.js';
import { IdentityError } from '../src/errors.js';
import { CapabilityRegistry } from '../src/capabilities.js';

test('integrates machine, event bus and store', async () => {
  const store = new MemoryDeviceStore();
  const bus = new EventBus({ idFactory: (() => { let n = 0; return () => `event-${++n}`; })() });
  const runtime = new SessionRuntime({ sessionId: 'lab-1', store, bus });
  const events = [];
  bus.on('connection.state', event => events.push(event));

  runtime.start();
  runtime.advance(ConnectionState.HANDSHAKING);
  runtime.advance(ConnectionState.AUTHENTICATING);
  runtime.advance(ConnectionState.SYNCING);
  runtime.advance(ConnectionState.READY);
  await runtime.flush();

  assert.equal(runtime.state, ConnectionState.READY);
  assert.equal(events.length, 5);
  assert.equal(events[0].payload.current, ConnectionState.CONNECTING);
  assert.equal(events.at(-1).payload.current, ConnectionState.READY);
  assert.deepEqual(await runtime.getPersistedState(), {
    sessionId: 'lab-1',
    state: ConnectionState.READY,
    generation: 1,
    lastEventId: 'event-5',
    updatedAt: events.at(-1).occurredAt,
    reconnectAttempt: 0
  });
});

test('persists reconnect generation and attempt', async () => {
  const jobs = [];
  const scheduler = (fn, delay) => { const job = { fn, delay }; jobs.push(job); return job; };
  const canceller = () => {};
  const runtime = new SessionRuntime({
    sessionId: 'lab-2',
    store: new MemoryDeviceStore(),
    machine: new ConnectionMachine({ scheduler, canceller, baseDelayMs: 5 })
  });
  runtime.start();
  runtime.advance(ConnectionState.HANDSHAKING);
  assert.deepEqual(runtime.reconnect('network'), { scheduled: true, attempt: 1, delay: 5 });
  jobs.shift().fn();
  await runtime.flush();
  const persisted = await runtime.getPersistedState();
  assert.equal(persisted.state, ConnectionState.CONNECTING);
  assert.equal(persisted.generation, 2);
  assert.equal(persisted.reconnectAttempt, 1);
});

test('resolves messages through the runtime capability registry', () => {
  const capabilities = new CapabilityRegistry({ initial: {
    'message.list': { status: 'stable', confidence: 'verified' },
    'message.text': { status: 'stable', confidence: 'verified' }
  }});
  const runtime = new SessionRuntime({ sessionId: 'lab-capability', capabilities });
  const result = runtime.resolveMessage({
    capabilities: ['message.rich_response'],
    fallback: 'message.text',
    content: { body: 'fallback' }
  });
  assert.equal(result.selected, 'message.text');
  assert.equal(result.fallbackUsed, true);
});

test('publishes structured errors before entering fatal state', async () => {
  const bus = new EventBus({ idFactory: () => 'error-event' });
  const runtime = new SessionRuntime({ sessionId: 'lab-error', store: new MemoryDeviceStore(), bus });
  const errors = [];
  bus.on('connection.error', event => errors.push(event));
  runtime.start();
  runtime.fail(new IdentityError('identity changed', { code: 'KUROXI_IDENTITY_CHANGED' }));
  await runtime.flush();
  assert.equal(runtime.state, ConnectionState.FATAL);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].payload.code, 'KUROXI_IDENTITY_CHANGED');
  assert.equal(errors[0].sensitivity, 'sensitive');
});

test('close is idempotent and ignores future runtime operations', async () => {
  const runtime = new SessionRuntime({ sessionId: 'lab-3' });
  runtime.start();
  assert.deepEqual(runtime.close(), { closed: true });
  assert.deepEqual(runtime.close(), { closed: false, reason: 'runtime_closed' });
  assert.throws(() => runtime.start(), /runtime is closed/);
  await runtime.flush();
});
