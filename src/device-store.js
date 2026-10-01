export class StoreClosedError extends Error {
  constructor() {
    super('Device store is closed');
    this.name = 'StoreClosedError';
    this.code = 'KUROXI_STORE_CLOSED';
  }
}

export class StoreConflictError extends Error {
  constructor(message = 'Store transaction conflict') {
    super(message);
    this.name = 'StoreConflictError';
    this.code = 'KUROXI_STORE_CONFLICT';
  }
}

const clone = (value) => structuredClone(value);

function assertNamespace(namespace) {
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throw new TypeError('namespace must be a non-empty string');
  }
}

function assertKey(key) {
  if (typeof key !== 'string' || key.length === 0) {
    throw new TypeError('key must be a non-empty string');
  }
}

export class MemoryDeviceStore {
  #data = new Map();
  #version = 0;
  #tail = Promise.resolve();
  #closed = false;

  get version() { return this.#version; }

  close() {
    this.#closed = true;
    this.#data.clear();
  }

  async get(namespace, key) {
    this.#assertOpen();
    assertNamespace(namespace);
    assertKey(key);
    const bucket = this.#data.get(namespace);
    if (!bucket || !bucket.has(key)) return undefined;
    return clone(bucket.get(key));
  }

  async has(namespace, key) {
    this.#assertOpen();
    assertNamespace(namespace);
    assertKey(key);
    return this.#data.get(namespace)?.has(key) ?? false;
  }

  async put(namespace, key, value) {
    return this.transaction(async tx => {
      tx.set(namespace, key, value);
    });
  }

  async delete(namespace, key) {
    return this.transaction(async tx => {
      tx.delete(namespace, key);
    });
  }

  async transaction(work) {
    this.#assertOpen();
    if (typeof work !== 'function') throw new TypeError('work must be a function');

    const run = async () => {
      this.#assertOpen();
      const draft = cloneMap(this.#data);
      const tx = new MemoryTransaction(draft);
      const result = await work(tx);
      this.#assertOpen();
      this.#data = draft;
      this.#version += 1;
      return clone(result);
    };

    const current = this.#tail.then(run, run);
    this.#tail = current.catch(() => undefined);
    return current;
  }

  async dump() {
    this.#assertOpen();
    return cloneMap(this.#data);
  }

  #assertOpen() {
    if (this.#closed) throw new StoreClosedError();
  }
}

class MemoryTransaction {
  #data;

  constructor(data) {
    this.#data = data;
  }

  get(namespace, key) {
    assertNamespace(namespace);
    assertKey(key);
    const bucket = this.#data.get(namespace);
    if (!bucket || !bucket.has(key)) return undefined;
    return clone(bucket.get(key));
  }

  has(namespace, key) {
    assertNamespace(namespace);
    assertKey(key);
    return this.#data.get(namespace)?.has(key) ?? false;
  }

  set(namespace, key, value) {
    assertNamespace(namespace);
    assertKey(key);
    if (!this.#data.has(namespace)) this.#data.set(namespace, new Map());
    this.#data.get(namespace).set(key, clone(value));
  }

  delete(namespace, key) {
    assertNamespace(namespace);
    assertKey(key);
    const bucket = this.#data.get(namespace);
    if (!bucket) return false;
    const deleted = bucket.delete(key);
    if (bucket.size === 0) this.#data.delete(namespace);
    return deleted;
  }
}

function cloneMap(source) {
  const target = new Map();
  for (const [namespace, bucket] of source) {
    const copiedBucket = new Map();
    for (const [key, value] of bucket) copiedBucket.set(key, clone(value));
    target.set(namespace, copiedBucket);
  }
  return target;
}
