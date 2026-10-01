import { mkdir, readFile, rename, unlink, writeFile, open } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { MemoryDeviceStore } from './device-store.js';

// Durable adapter for the existing DeviceStore contract. One JSON snapshot is
// replaced atomically after each committed mutation; it is intentionally not a
// multi-process database or a high-throughput store.
export class FileDeviceStore {
  #filePath;
  #memory;
  #ready;
  #tail = Promise.resolve();
  #closed = false;

  constructor({ filePath } = {}) {
    if (typeof filePath !== 'string' || filePath.length === 0) throw new TypeError('filePath must be a non-empty string');
    this.#filePath = filePath;
    this.#memory = new MemoryDeviceStore();
    this.#ready = this.#load();
  }

  async get(namespace, key) { await this.#ensureOpen(); return this.#memory.get(namespace, key); }
  async has(namespace, key) { await this.#ensureOpen(); return this.#memory.has(namespace, key); }
  async dump() { await this.#ensureOpen(); return this.#memory.dump(); }

  async put(namespace, key, value) {
    return this.transaction(tx => tx.set(namespace, key, value));
  }

  async delete(namespace, key) {
    return this.transaction(tx => tx.delete(namespace, key));
  }

  async transaction(work) {
    await this.#ensureOpen();
    if (typeof work !== 'function') throw new TypeError('work must be a function');
    const run = async () => {
      await this.#ensureOpen();
      const result = await this.#memory.transaction(work);
      await this.#persist();
      return result;
    };
    const current = this.#tail.then(run, run);
    this.#tail = current.catch(() => undefined);
    return current;
  }

  async close() {
    if (this.#closed) return;
    await this.#ready;
    await this.#tail;
    this.#closed = true;
    this.#memory.close();
  }

  async #ensureOpen() {
    await this.#ready;
    if (this.#closed) throw new Error('File device store is closed');
  }

  async #load() {
    await mkdir(dirname(this.#filePath), { recursive: true });
    let raw;
    try {
      raw = await readFile(this.#filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    let snapshot;
    try { snapshot = JSON.parse(raw); } catch { throw new Error(`invalid store file: ${this.#filePath}`); }
    if (!snapshot || snapshot.format !== 1 || !snapshot.namespaces || typeof snapshot.namespaces !== 'object') {
      throw new Error(`unsupported store file: ${this.#filePath}`);
    }
    await this.#memory.transaction(tx => {
      for (const [namespace, entries] of Object.entries(snapshot.namespaces)) {
        if (!entries || typeof entries !== 'object') throw new Error('invalid store namespace');
        for (const [key, value] of Object.entries(entries)) tx.set(namespace, key, value);
      }
    });
  }

  async #persist() {
    const dump = await this.#memory.dump();
    const namespaces = {};
    for (const [namespace, entries] of dump) namespaces[namespace] = Object.fromEntries(entries);
    const content = `${JSON.stringify({ format: 1, namespaces }, null, 2)}\n`;
    const tempPath = `${this.#filePath}.${randomUUID()}.tmp`;
    try {
      const handle = await open(tempPath, 'w');
      try {
        await handle.writeFile(content, 'utf8');
        await handle.sync();
      } finally { await handle.close(); }
      await rename(tempPath, this.#filePath);
    } catch (error) {
      await unlink(tempPath).catch(() => {});
      throw error;
    }
  }
}
