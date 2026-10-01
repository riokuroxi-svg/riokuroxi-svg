export const ConnectionState = Object.freeze({
  IDLE: 'idle',
  CONNECTING: 'connecting',
  HANDSHAKING: 'handshaking',
  AUTHENTICATING: 'authenticating',
  SYNCING: 'syncing',
  READY: 'ready',
  RECONNECTING: 'reconnecting',
  CLOSING: 'closing',
  CLOSED: 'closed',
  FATAL: 'fatal'
});

const transitions = Object.freeze({
  [ConnectionState.IDLE]: new Set([ConnectionState.CONNECTING, ConnectionState.CLOSING]),
  [ConnectionState.CONNECTING]: new Set([ConnectionState.HANDSHAKING, ConnectionState.RECONNECTING, ConnectionState.CLOSING, ConnectionState.FATAL]),
  [ConnectionState.HANDSHAKING]: new Set([ConnectionState.AUTHENTICATING, ConnectionState.RECONNECTING, ConnectionState.CLOSING, ConnectionState.FATAL]),
  [ConnectionState.AUTHENTICATING]: new Set([ConnectionState.SYNCING, ConnectionState.RECONNECTING, ConnectionState.CLOSING, ConnectionState.FATAL]),
  [ConnectionState.SYNCING]: new Set([ConnectionState.READY, ConnectionState.RECONNECTING, ConnectionState.CLOSING, ConnectionState.FATAL]),
  [ConnectionState.READY]: new Set([ConnectionState.RECONNECTING, ConnectionState.CLOSING, ConnectionState.FATAL]),
  [ConnectionState.RECONNECTING]: new Set([ConnectionState.CONNECTING, ConnectionState.CLOSING, ConnectionState.FATAL]),
  [ConnectionState.CLOSING]: new Set([ConnectionState.CLOSED, ConnectionState.FATAL]),
  [ConnectionState.CLOSED]: new Set([ConnectionState.CONNECTING, ConnectionState.CLOSING]),
  [ConnectionState.FATAL]: new Set([])
});

export class InvalidTransitionError extends Error {
  constructor(from, to) {
    super(`Invalid connection transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
    this.code = 'KUROXI_INVALID_TRANSITION';
    this.from = from;
    this.to = to;
  }
}

export class ConnectionMachine {
  #state = ConnectionState.IDLE;
  #generation = 0;
  #listeners = new Set();
  #reconnectTimer = null;
  #reconnectAttempt = 0;
  #closed = false;
  #clock;
  #scheduler;
  #canceller;
  #maxReconnectAttempts;
  #baseDelayMs;
  #maxDelayMs;

  constructor({
    clock = () => Date.now(),
    scheduler = (fn, delay) => setTimeout(fn, delay),
    canceller = (handle) => clearTimeout(handle),
    maxReconnectAttempts = 5,
    baseDelayMs = 100,
    maxDelayMs = 30_000
  } = {}) {
    if (!Number.isInteger(maxReconnectAttempts) || maxReconnectAttempts < 0) {
      throw new TypeError('maxReconnectAttempts must be a non-negative integer');
    }
    if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
      throw new TypeError('baseDelayMs must be a non-negative number');
    }
    if (!Number.isFinite(maxDelayMs) || maxDelayMs < baseDelayMs) {
      throw new TypeError('maxDelayMs must be >= baseDelayMs');
    }
    this.#clock = clock;
    this.#scheduler = scheduler;
    this.#canceller = canceller;
    this.#maxReconnectAttempts = maxReconnectAttempts;
    this.#baseDelayMs = baseDelayMs;
    this.#maxDelayMs = maxDelayMs;
  }

  get state() { return this.#state; }
  get generation() { return this.#generation; }
  get reconnectAttempt() { return this.#reconnectAttempt; }

  on(listener) {
    if (typeof listener !== 'function') throw new TypeError('listener must be a function');
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  start() {
    if (this.#state === ConnectionState.IDLE || this.#state === ConnectionState.CLOSED) {
      this.#closed = false;
      this.#generation += 1;
      this.#reconnectAttempt = 0;
      this.#transition(ConnectionState.CONNECTING, { reason: 'start' });
      return { started: true, generation: this.#generation };
    }
    if (this.#state === ConnectionState.CLOSING) return { started: false, reason: 'closing' };
    if (this.#state === ConnectionState.FATAL) return { started: false, reason: 'fatal' };
    return { started: false, reason: 'already_active' };
  }

  advance(nextState, meta = {}) {
    if (!Object.values(ConnectionState).includes(nextState)) {
      throw new TypeError(`Unknown connection state: ${nextState}`);
    }
    this.#transition(nextState, meta);
  }

  requestReconnect(reason = 'recoverable_error') {
    if (this.#closed || this.#state === ConnectionState.CLOSING || this.#state === ConnectionState.CLOSED || this.#state === ConnectionState.FATAL) {
      return { scheduled: false, reason: 'not_reconnectable' };
    }
    if (this.#reconnectTimer !== null) return { scheduled: false, reason: 'already_scheduled' };
    if (this.#reconnectAttempt >= this.#maxReconnectAttempts) {
      this.#transition(ConnectionState.FATAL, { reason: 'reconnect_limit', originalReason: reason });
      return { scheduled: false, reason: 'reconnect_limit' };
    }
    this.#reconnectAttempt += 1;
    const attempt = this.#reconnectAttempt;
    const delay = Math.min(this.#maxDelayMs, this.#baseDelayMs * (2 ** (attempt - 1)));
    if (this.#state !== ConnectionState.RECONNECTING) {
      this.#transition(ConnectionState.RECONNECTING, { reason, attempt, delay });
    }
    this.#reconnectTimer = this.#scheduler(() => {
      this.#reconnectTimer = null;
      if (this.#closed || this.#state !== ConnectionState.RECONNECTING) return;
      this.#generation += 1;
      this.#transition(ConnectionState.CONNECTING, { reason: 'reconnect', attempt });
    }, delay);
    return { scheduled: true, attempt, delay };
  }

  close(reason = 'local_shutdown') {
    this.#closed = true;
    this.#clearReconnectTimer();
    if (this.#state === ConnectionState.CLOSED) return { closed: false, reason: 'already_closed' };
    if (this.#state === ConnectionState.FATAL) return { closed: false, reason: 'fatal' };
    if (this.#state !== ConnectionState.CLOSING) this.#transition(ConnectionState.CLOSING, { reason });
    this.#transition(ConnectionState.CLOSED, { reason });
    return { closed: true };
  }

  fail(reason = 'fatal_error') {
    this.#closed = true;
    this.#clearReconnectTimer();
    if (this.#state !== ConnectionState.FATAL) this.#transition(ConnectionState.FATAL, { reason });
  }

  #transition(nextState, meta) {
    if (nextState === this.#state) return;
    if (!transitions[this.#state]?.has(nextState)) throw new InvalidTransitionError(this.#state, nextState);
    const previous = this.#state;
    this.#state = nextState;
    const event = Object.freeze({
      type: 'connection.state',
      previous,
      current: nextState,
      generation: this.#generation,
      at: this.#clock(),
      meta: Object.freeze({ ...meta })
    });
    for (const listener of [...this.#listeners]) listener(event);
  }

  #clearReconnectTimer() {
    if (this.#reconnectTimer !== null) this.#canceller(this.#reconnectTimer);
    this.#reconnectTimer = null;
  }
}
