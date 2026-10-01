export class TransportError extends Error {
  constructor(message, { code = 'KUROXI_TRANSPORT_ERROR', retryable = true } = {}) {
    super(message);
    this.name = 'TransportError';
    this.code = code;
    this.retryable = retryable;
  }
}

export class DeliveryError extends Error {
  constructor(message, { messageId, attempts, cause } = {}) {
    super(message, { cause });
    this.name = 'DeliveryError';
    this.code = 'KUROXI_DELIVERY_FAILED';
    this.messageId = messageId;
    this.attempts = attempts;
    this.causeCode = cause?.code;
  }
}

export class MockTransport {
  #ackDelayMs;
  #failurePlan;
  #closed = false;
  #sent = [];

  constructor({ ackDelayMs = 0, failurePlan = () => undefined } = {}) {
    if (!Number.isFinite(ackDelayMs) || ackDelayMs < 0) throw new TypeError('ackDelayMs must be non-negative');
    if (typeof failurePlan !== 'function') throw new TypeError('failurePlan must be a function');
    this.#ackDelayMs = ackDelayMs;
    this.#failurePlan = failurePlan;
  }

  get sent() { return structuredClone(this.#sent); }

  async send(envelope) {
    if (this.#closed) throw new TransportError('transport is closed', { retryable: false });
    validateEnvelope(envelope);
    this.#sent.push(structuredClone(envelope));
    if (this.#ackDelayMs > 0) await new Promise(resolve => setTimeout(resolve, this.#ackDelayMs));
    const failure = this.#failurePlan(envelope);
    if (failure) throw failure instanceof Error ? failure : new TransportError(String(failure));
    return Object.freeze({
      messageId: envelope.messageId,
      status: 'acknowledged',
      attempt: envelope.attempt
    });
  }

  close() { this.#closed = true; }
}

export class DeliveryManager {
  #transport;
  #inFlight = new Map();
  #completed = new Map();
  #maxAttempts;
  #retryDelayMs;
  #deliveryStore;

  constructor({ transport, maxAttempts = 3, retryDelayMs = 0, deliveryStore = undefined } = {}) {
    if (!transport || typeof transport.send !== 'function') throw new TypeError('transport must implement send');
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new TypeError('maxAttempts must be a positive integer');
    if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) throw new TypeError('retryDelayMs must be non-negative');
    if (deliveryStore !== undefined && (!deliveryStore.begin || !deliveryStore.transition)) throw new TypeError('deliveryStore must implement begin and transition');
    this.#transport = transport;
    this.#maxAttempts = maxAttempts;
    this.#retryDelayMs = retryDelayMs;
    this.#deliveryStore = deliveryStore;
  }

  send(messageId, payload) {
    validateMessageId(messageId);
    if (this.#completed.has(messageId)) return this.#completed.get(messageId);
    if (this.#inFlight.has(messageId)) return this.#inFlight.get(messageId);
    const promise = this.#deliver(messageId, payload);
    this.#inFlight.set(messageId, promise);
    promise.then(result => {
      this.#inFlight.delete(messageId);
      this.#completed.set(messageId, result);
    }, () => this.#inFlight.delete(messageId));
    return promise;
  }

  hasCompleted(messageId) { return this.#completed.has(messageId); }

  async #deliver(messageId, payload) {
    let lastError;
    let attemptsUsed = 0;
    if (this.#deliveryStore) {
      const started = await this.#deliveryStore.begin(messageId, payload);
      if (started.completed) return started.record.result;
    }
    for (let attempt = 1; attempt <= this.#maxAttempts; attempt += 1) {
      attemptsUsed = attempt;
      try {
        if (this.#deliveryStore) await this.#deliveryStore.transition(messageId, 'sending', { attempts: attempt });
        const result = await this.#transport.send({ messageId, payload: structuredClone(payload), attempt });
        if (this.#deliveryStore) await this.#deliveryStore.transition(messageId, 'acknowledged', { attempts: attempt, result });
        return result;
      } catch (error) {
        lastError = error;
        const final = error?.retryable === false || attempt === this.#maxAttempts;
        if (this.#deliveryStore) {
          await this.#deliveryStore.transition(messageId, final ? 'failed' : 'retrying', {
            attempts: attempt,
            error: { code: error?.code ?? 'KUROXI_TRANSPORT_ERROR', message: error?.message ?? String(error) }
          });
        }
        if (final) break;
        if (this.#retryDelayMs > 0) await new Promise(resolve => setTimeout(resolve, this.#retryDelayMs));
      }
    }
    throw new DeliveryError(`delivery failed after ${attemptsUsed} attempts`, {
      messageId,
      attempts: attemptsUsed,
      cause: lastError
    });
  }
}

function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') throw new TypeError('envelope must be an object');
  validateMessageId(envelope.messageId);
  if (!Number.isInteger(envelope.attempt) || envelope.attempt < 1) throw new TypeError('attempt must be a positive integer');
}

function validateMessageId(messageId) {
  if (typeof messageId !== 'string' || messageId.length === 0) throw new TypeError('messageId must be a non-empty string');
}
