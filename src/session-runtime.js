import { ConnectionMachine, ConnectionState } from './connection-machine.js';
import { EventBus, SENSITIVITY } from './event-bus.js';
import { MemoryDeviceStore } from './device-store.js';
import { normalizeError } from './errors.js';
import { CapabilityRegistry } from './capabilities.js';
import { MessageResolver } from './message-resolver.js';

export class SessionRuntime {
  #sessionId;
  #machine;
  #store;
  #bus;
  #messageResolver;
  #unsubscribeMachine;
  #writes = Promise.resolve();
  #closed = false;

  constructor({
    sessionId,
    machine = new ConnectionMachine(),
    store = new MemoryDeviceStore(),
    bus = new EventBus(),
    capabilities = new CapabilityRegistry()
  } = {}) {
    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      throw new TypeError('sessionId must be a non-empty string');
    }
    if (!machine || typeof machine.start !== 'function' || typeof machine.on !== 'function') {
      throw new TypeError('machine must be a connection machine');
    }
    if (!store || typeof store.put !== 'function' || typeof store.get !== 'function') {
      throw new TypeError('store must implement put and get');
    }
    if (!bus || typeof bus.publish !== 'function') throw new TypeError('bus must implement publish');
    if (!capabilities || typeof capabilities.resolve !== 'function') throw new TypeError('capabilities must implement resolve');
    this.#sessionId = sessionId;
    this.#machine = machine;
    this.#store = store;
    this.#bus = bus;
    this.#messageResolver = new MessageResolver({ capabilities });
    this.#unsubscribeMachine = machine.on(event => this.#onMachineEvent(event));
  }

  get sessionId() { return this.#sessionId; }
  get state() { return this.#machine.state; }
  get generation() { return this.#machine.generation; }
  get machine() { return this.#machine; }
  get bus() { return this.#bus; }

  start() {
    this.#assertOpen();
    return this.#machine.start();
  }

  advance(nextState, meta = {}) {
    this.#assertOpen();
    this.#machine.advance(nextState, meta);
  }

  reconnect(reason = 'recoverable_error') {
    this.#assertOpen();
    return this.#machine.requestReconnect(reason);
  }

  resolveMessage(message) {
    this.#assertOpen();
    return this.#messageResolver.resolve(message);
  }

  resolveDocument(document) {
    this.#assertOpen();
    return this.#messageResolver.resolveDocument(document);
  }

  close(reason = 'local_shutdown') {
    if (this.#closed) return { closed: false, reason: 'runtime_closed' };
    const result = this.#machine.close(reason);
    this.#closed = true;
    this.#unsubscribeMachine();
    return result;
  }

  fail(reason = 'fatal_error') {
    this.#assertOpen();
    const error = normalizeError(reason, {
      code: 'KUROXI_FATAL_SESSION_ERROR',
      category: 'fatal',
      severity: 'fatal',
      action: 'stop'
    });
    this.#bus.publish('connection.error', error.toJSON(), {
      sessionId: this.#sessionId,
      connectionGeneration: this.#machine.generation,
      sensitivity: error.category === 'crypto' || error.category === 'identity' ? SENSITIVITY.SENSITIVE : SENSITIVITY.INTERNAL
    });
    this.#machine.fail(error.code);
  }

  async flush() {
    await this.#writes;
  }

  async getPersistedState() {
    return this.#store.get('sessions', this.#sessionId);
  }

  #onMachineEvent(machineEvent) {
    const event = this.#bus.publish('connection.state', {
      previous: machineEvent.previous,
      current: machineEvent.current,
      reason: machineEvent.meta?.reason,
      attempt: machineEvent.meta?.attempt
    }, {
      sessionId: this.#sessionId,
      connectionGeneration: machineEvent.generation,
      sensitivity: SENSITIVITY.INTERNAL
    });
    this.#writes = this.#writes.then(() => this.#store.put('sessions', this.#sessionId, {
      sessionId: this.#sessionId,
      state: machineEvent.current,
      generation: machineEvent.generation,
      lastEventId: event.id,
      updatedAt: machineEvent.at,
      reconnectAttempt: this.#machine.reconnectAttempt
    }));
  }

  #assertOpen() {
    if (this.#closed) throw new Error('session runtime is closed');
  }
}

export { ConnectionState };
