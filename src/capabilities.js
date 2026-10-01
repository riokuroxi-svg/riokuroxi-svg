const STATUSES = Object.freeze(['stable', 'advanced', 'experimental', 'unsupported', 'unknown']);
const CONFIDENCE = Object.freeze(['unverified', 'observed', 'tested', 'verified']);

export class CapabilityError extends Error {
  constructor(message, code = 'KUROXI_CAPABILITY_ERROR') {
    super(message);
    this.name = 'CapabilityError';
    this.code = code;
  }
}

export class CapabilityRegistry {
  #items = new Map();
  #clock;
  #closed = false;

  constructor({ clock = () => Date.now(), initial = {} } = {}) {
    if (typeof clock !== 'function') throw new TypeError('clock must be a function');
    this.#clock = clock;
    for (const [name, descriptor] of Object.entries(initial)) this.set(name, descriptor);
  }

  set(name, descriptor) {
    this.#assertOpen();
    assertName(name);
    const normalized = normalizeDescriptor(name, descriptor, this.#clock());
    this.#items.set(name, normalized);
    return clone(normalized);
  }

  get(name) {
    this.#assertOpen();
    assertName(name);
    return clone(this.#items.get(name) ?? unknownCapability(name, this.#clock()));
  }

  has(name) {
    this.#assertOpen();
    assertName(name);
    return this.#items.has(name);
  }

  supports(name, { includeExperimental = true } = {}) {
    this.#assertOpen();
    const item = this.get(name);
    if (item.supported !== true) return false;
    if (!includeExperimental && item.status === 'experimental') return false;
    return true;
  }

  resolve(preferred, { fallback = undefined, includeExperimental = true } = {}) {
    this.#assertOpen();
    if (!Array.isArray(preferred) || preferred.length === 0) {
      throw new TypeError('preferred must be a non-empty array');
    }
    for (const name of preferred) {
      assertName(name);
      if (this.supports(name, { includeExperimental })) return this.get(name);
    }
    if (fallback !== undefined) {
      assertName(fallback);
      const fallbackCapability = this.get(fallback);
      if (this.supports(fallback)) return fallbackCapability;
    }
    throw new CapabilityError(`no supported capability found for: ${preferred.join(', ')}`, 'KUROXI_NO_CAPABILITY');
  }

  list({ status } = {}) {
    this.#assertOpen();
    if (status !== undefined && !STATUSES.includes(status)) throw new TypeError(`invalid capability status: ${status}`);
    return [...this.#items.values()]
      .filter(item => status === undefined || item.status === status)
      .map(clone);
  }

  close() {
    this.#closed = true;
    this.#items.clear();
  }

  #assertOpen() {
    if (this.#closed) throw new CapabilityError('capability registry is closed', 'KUROXI_CAPABILITY_CLOSED');
  }
}

function normalizeDescriptor(name, descriptor = {}, verifiedAt) {
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
    throw new TypeError('capability descriptor must be an object');
  }
  const status = descriptor.status ?? 'unknown';
  const confidence = descriptor.confidence ?? 'unverified';
  if (!STATUSES.includes(status)) throw new TypeError(`invalid capability status: ${status}`);
  if (!CONFIDENCE.includes(confidence)) throw new TypeError(`invalid capability confidence: ${confidence}`);
  if (descriptor.supported !== undefined && typeof descriptor.supported !== 'boolean') {
    throw new TypeError('capability supported must be boolean');
  }
  if (status === 'unsupported' && descriptor.supported === true) {
    throw new TypeError('unsupported capability cannot be marked supported');
  }
  if (status === 'unknown' && descriptor.supported === true) {
    throw new TypeError('unknown capability cannot be marked supported');
  }
  return Object.freeze({
    name,
    status,
    supported: descriptor.supported ?? (status === 'stable' || status === 'advanced' || status === 'experimental'),
    version: descriptor.version ?? undefined,
    confidence,
    lastVerifiedAt: descriptor.lastVerifiedAt ?? verifiedAt,
    fallback: descriptor.fallback ?? undefined,
    notes: descriptor.notes ?? undefined
  });
}

function unknownCapability(name, lastVerifiedAt) {
  return Object.freeze({
    name,
    status: 'unknown',
    supported: false,
    version: undefined,
    confidence: 'unverified',
    lastVerifiedAt,
    fallback: undefined,
    notes: undefined
  });
}

function assertName(name) {
  if (typeof name !== 'string' || !/^[a-z][a-z0-9]*(\.[a-z0-9_-]+)+$/.test(name)) {
    throw new TypeError('capability name must use dot notation, for example message.text');
  }
}

function clone(value) {
  return deepFreeze(structuredClone(value));
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    Object.freeze(value);
  }
  return value;
}

export { CONFIDENCE, STATUSES };
