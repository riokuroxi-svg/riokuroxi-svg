import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileDeviceStore } from '../src/file-device-store.js';

test('persists values and restores them in a new store instance', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'kuroxi-store-'));
  const filePath = join(directory, 'state.json');
  try {
    const first = new FileDeviceStore({ filePath });
    await first.put('deliveries', 'm1', { status: 'pending', attempts: 0 });
    await first.close();
    const second = new FileDeviceStore({ filePath });
    assert.deepEqual(await second.get('deliveries', 'm1'), { status: 'pending', attempts: 0 });
    await second.close();
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('writes valid versioned JSON and persists transactions atomically', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'kuroxi-store-'));
  const filePath = join(directory, 'nested', 'state.json');
  try {
    const store = new FileDeviceStore({ filePath });
    await store.transaction(tx => {
      tx.set('a', 'one', { value: 1 });
      tx.set('a', 'two', { value: 2 });
    });
    const snapshot = JSON.parse(await readFile(filePath, 'utf8'));
    assert.equal(snapshot.format, 1);
    assert.deepEqual(snapshot.namespaces.a.one, { value: 1 });
    assert.deepEqual(snapshot.namespaces.a.two, { value: 2 });
    await store.close();
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('serializes concurrent file mutations without losing values', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'kuroxi-store-'));
  try {
    const store = new FileDeviceStore({ filePath: join(directory, 'state.json') });
    await Promise.all([...Array(12)].map((_, index) => store.put('items', `k${index}`, { index })));
    const dump = await store.dump();
    assert.equal(dump.get('items').size, 12);
    await store.close();
  } finally { await rm(directory, { recursive: true, force: true }); }
});
