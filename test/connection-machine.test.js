import test from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionMachine, ConnectionState, InvalidTransitionError } from '../src/connection-machine.js';

function makeFakeScheduler() {
  const jobs = [];
  return {
    schedule(fn, delay) {
      const job = { fn, delay, cancelled: false };
      jobs.push(job);
      return job;
    },
    cancel(job) { job.cancelled = true; },
    runNext() {
      const job = jobs.shift();
      if (job && !job.cancelled) job.fn();
      return job;
    },
    jobs
  };
}

test('starts exactly once and increments generation', () => {
  const machine = new ConnectionMachine();
  assert.deepEqual(machine.start(), { started: true, generation: 1 });
  assert.deepEqual(machine.start(), { started: false, reason: 'already_active' });
  assert.equal(machine.state, ConnectionState.CONNECTING);
  assert.equal(machine.generation, 1);
});

test('enforces valid state transitions', () => {
  const machine = new ConnectionMachine();
  machine.start();
  machine.advance(ConnectionState.HANDSHAKING);
  machine.advance(ConnectionState.AUTHENTICATING);
  machine.advance(ConnectionState.SYNCING);
  machine.advance(ConnectionState.READY);
  assert.equal(machine.state, ConnectionState.READY);
  assert.throws(() => machine.advance(ConnectionState.IDLE), InvalidTransitionError);
});

test('schedules only one reconnect and uses exponential backoff', () => {
  const fake = makeFakeScheduler();
  const machine = new ConnectionMachine({ scheduler: fake.schedule.bind(fake), canceller: fake.cancel.bind(fake), baseDelayMs: 10, maxDelayMs: 100 });
  machine.start();
  machine.advance(ConnectionState.HANDSHAKING);
  assert.deepEqual(machine.requestReconnect('network'), { scheduled: true, attempt: 1, delay: 10 });
  assert.deepEqual(machine.requestReconnect('duplicate'), { scheduled: false, reason: 'already_scheduled' });
  fake.runNext();
  assert.equal(machine.state, ConnectionState.CONNECTING);
  assert.equal(machine.generation, 2);
  assert.deepEqual(machine.requestReconnect('network'), { scheduled: true, attempt: 2, delay: 20 });
});

test('close cancels a pending reconnect', () => {
  const fake = makeFakeScheduler();
  const machine = new ConnectionMachine({ scheduler: fake.schedule.bind(fake), canceller: fake.cancel.bind(fake), baseDelayMs: 10 });
  machine.start();
  machine.advance(ConnectionState.HANDSHAKING);
  machine.requestReconnect();
  const job = fake.jobs[0];
  machine.close();
  assert.equal(job.cancelled, true);
  assert.equal(machine.state, ConnectionState.CLOSED);
  fake.runNext();
  assert.equal(machine.generation, 1);
});

test('reconnect limit moves to fatal and never reconnects again', () => {
  const fake = makeFakeScheduler();
  const machine = new ConnectionMachine({ scheduler: fake.schedule.bind(fake), canceller: fake.cancel.bind(fake), maxReconnectAttempts: 1, baseDelayMs: 1 });
  machine.start();
  machine.advance(ConnectionState.HANDSHAKING);
  machine.requestReconnect('network');
  fake.runNext();
  machine.advance(ConnectionState.HANDSHAKING);
  assert.deepEqual(machine.requestReconnect('network'), { scheduled: false, reason: 'reconnect_limit' });
  assert.equal(machine.state, ConnectionState.FATAL);
  assert.deepEqual(machine.start(), { started: false, reason: 'fatal' });
});

test('listeners can unsubscribe and events contain connection generation', () => {
  const machine = new ConnectionMachine({ clock: () => 123 });
  const events = [];
  const unsubscribe = machine.on(event => events.push(event));
  machine.start();
  unsubscribe();
  machine.advance(ConnectionState.HANDSHAKING);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    type: 'connection.state',
    previous: ConnectionState.IDLE,
    current: ConnectionState.CONNECTING,
    generation: 1,
    at: 123,
    meta: { reason: 'start' }
  });
});

test('rejects invalid constructor configuration', () => {
  assert.throws(() => new ConnectionMachine({ maxReconnectAttempts: -1 }), TypeError);
  assert.throws(() => new ConnectionMachine({ baseDelayMs: -1 }), TypeError);
  assert.throws(() => new ConnectionMachine({ baseDelayMs: 10, maxDelayMs: 9 }), TypeError);
});
