const SENSITIVITY = Object.freeze({ PUBLIC: 'public', INTERNAL: 'internal', SENSITIVE: 'sensitive' });

export class EventBusError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EventBusError';
    this.code = 'KUROXI_EVENT_BUS_ERROR';
  }
}

export class EventBus {
  #listeners = new Map();
  #anyListeners = new Set();
  #clock;
  #idFactory;
  #onListenerError;
  #closed = false;
  #sequence = 0;

  constructor({
    clock = () => Date.now(),
    idFactory = () => `evt_${Date.now()}_${++this.#sequence}`,
    onListenerError = () => {}
  } = {}) {
    if (typeof clock !== 'function') throw new TypeError('clock must be a function');
    if (typeof idFactory !== 'function') throw new TypeError('idFactory must be a function');
    if (typeof onListenerError !== 'function') throw new TypeError('onListenerError must be a function');
    this.#clock = clock;
    this.#idFactory = idFactory;
    this.#onListenerError = onListenerError;
  }

  on(type, listener) {
    this.#assertOpen();
    assertEventType(type);
    assertListener(listener);
    if (!this.#listeners.has(type)) this.#listeners.set(type, new Set());
    const listeners = this.#listeners.get(type);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  onAny(listener) {
    this.#assertOpen();
    assertListener(listener);
    this.#anyListeners.add(listener);
    return () => this.#anyListeners.delete(listener);
  }

  once(type, listener) {
    assertListener(listener);
    let unsubscribe;
    const wrapped = event => {
      unsubscribe();
      return listener(event);
    };
    unsubscribe = this.on(type, wrapped);
    return unsubscribe;
  }

  publish(type, payload, {
    sessionId = undefined,
    connectionGeneration = undefined,
    sensitivity = SENSITIVITY.INTERNAL,
    correlationId = undefined
  } = {}) {
    this.#assertOpen();
    assertEventType(type);
    assertSensitivity(sensitivity);
    const event = deepFreeze({
      id: this.#idFactory(),
      type,
      occurredAt: this.#clock(),
      sessionId,
      connectionGeneration,
      correlationId,
      sensitivity,
      payload: clone(payload)
    });

    const listeners = [
      ...(this.#listeners.get(type) ?? []),
      ...this.#anyListeners
    ];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        this.#onListenerError(error, event);
      }
    }
    return event;
  }

  clear(type) {
    this.#assertOpen();
    if (type === undefined) {
      this.#listeners.clear();
      this.#anyListeners.clear();
      return;
    }
    assertEventType(type);
    this.#listeners.delete(type);
  }

  close() {
    this.#closed = true;
    this.#listeners.clear();
    this.#anyListeners.clear();
  }

  #assertOpen() {
    if (this.#closed) throw new EventBusError('event bus is closed');
  }
}

function assertEventType(type) {
  if (typeof type !== 'string' || !/^[a-z][a-z0-9]*(\.[a-z0-9_-]+)+$/.test(type)) {
    throw new TypeError('event type must use dot notation, for example message.received');
  }
}

function assertListener(listener) {
  if (typeof listener !== 'function') throw new TypeError('listener must be a function');
}

function assertSensitivity(sensitivity) {
  if (!Object.values(SENSITIVITY).includes(sensitivity)) throw new TypeError(`invalid sensitivity: ${sensitivity}`);
}

function clone(value) {
  return structuredClone(value);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    Object.freeze(value);
  }
  return value;
}

export { SENSITIVITY };
