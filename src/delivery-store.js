const STATUSES = Object.freeze(['pending', 'sending', 'retrying', 'acknowledged', 'failed', 'cancelled']);
const TRANSITIONS = Object.freeze({
  pending: new Set(['sending', 'cancelled']),
  sending: new Set(['acknowledged', 'retrying', 'failed', 'cancelled']),
  retrying: new Set(['sending', 'failed', 'cancelled']),
  acknowledged: new Set([]),
  failed: new Set(['pending', 'cancelled']),
  cancelled: new Set(['pending'])
});

export class DeliveryStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DeliveryStateError';
    this.code = 'KUROXI_DELIVERY_STATE_ERROR';
  }
}

export class DeliveryStore {
  #store;
  #clock;
  #namespace;

  constructor({ store, clock = () => Date.now(), namespace = 'deliveries' } = {}) {
    if (!store || typeof store.get !== 'function' || typeof store.put !== 'function') throw new TypeError('store must implement get and put');
    if (typeof clock !== 'function') throw new TypeError('clock must be a function');
    if (typeof namespace !== 'string' || namespace.length === 0) throw new TypeError('namespace must be a non-empty string');
    this.#store = store;
    this.#clock = clock;
    this.#namespace = namespace;
  }

  async begin(messageId, payload) {
    validateId(messageId);
    const existing = await this.get(messageId);
    if (existing?.status === 'acknowledged') return Object.freeze({ completed: true, record: existing });
    const record = {
      messageId,
      payload: structuredClone(payload),
      status: 'pending',
      attempts: 0,
      updatedAt: this.#clock(),
      result: undefined,
      error: undefined
    };
    await this.#store.put(this.#namespace, messageId, record);
    return Object.freeze({ completed: false, record: freezeRecord(record) });
  }

  async transition(messageId, nextStatus, patch = {}) {
    validateId(messageId);
    if (!STATUSES.includes(nextStatus)) throw new DeliveryStateError(`unknown delivery status: ${nextStatus}`);
    const current = await this.get(messageId);
    if (!current) throw new DeliveryStateError(`delivery not found: ${messageId}`);
    if (!TRANSITIONS[current.status].has(nextStatus)) {
      throw new DeliveryStateError(`invalid delivery transition: ${current.status} -> ${nextStatus}`);
    }
    const next = {
      ...current,
      ...structuredClone(patch),
      messageId,
      status: nextStatus,
      updatedAt: this.#clock()
    };
    await this.#store.put(this.#namespace, messageId, next);
    return freezeRecord(next);
  }

  async get(messageId) {
    validateId(messageId);
    const record = await this.#store.get(this.#namespace, messageId);
    return record ? freezeRecord(record) : undefined;
  }

  async list() {
    if (typeof this.#store.dump !== 'function') throw new DeliveryStateError('underlying store does not support listing');
    const dump = await this.#store.dump();
    const bucket = dump.get(this.#namespace) ?? new Map();
    return [...bucket.values()].map(freezeRecord);
  }
}

function validateId(messageId) {
  if (typeof messageId !== 'string' || messageId.length === 0) throw new TypeError('messageId must be a non-empty string');
}

function freezeRecord(record) {
  return deepFreeze(structuredClone(record));
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    Object.freeze(value);
  }
  return value;
}

export { STATUSES };
