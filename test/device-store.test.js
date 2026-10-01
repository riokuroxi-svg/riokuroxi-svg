import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDeviceStore, StoreClosedError } from '../src/device-store.js';

test('isolates namespaces and returns cloned values', async () => {
  const store = new MemoryDeviceStore();
  const value = { id: 'device-1', keys: [1, 2] };
  await store.put('credentials', 'main', value);
  value.keys.push(3);
  const loaded = await store.get('credentials', 'main');
  assert.deepEqual(loaded, { id: 'device-1', keys: [1, 2] });
  loaded.keys.push(9);
  assert.deepEqual(await store.get('credentials', 'main'), { id: 'device-1', keys: [1, 2] });
  assert.equal(await store.get('sessions', 'main'), undefined);
});

test('commits multiple changes atomically and increments version once', async () => {
  const store = new MemoryDeviceStore();
  await store.transaction(async tx => {
    tx.set('credentials', 'main', { user: 'kuroxi' });
    tx.set('metadata', 'schema', { version: 1 });
  });
  assert.equal(store.version, 1);
  assert.deepEqual(await store.get('credentials', 'main'), { user: 'kuroxi' });
  assert.deepEqual(await store.get('metadata', 'schema'), { version: 1 });
});

test('rolls back all changes when a transaction fails', async () => {
  const store = new MemoryDeviceStore();
  await store.put('credentials', 'main', { user: 'before' });
  const originalVersion = store.version;
  await assert.rejects(
    store.transaction(async tx => {
      tx.set('credentials', 'main', { user: 'after' });
      tx.set('sessions', 'a', { state: 'partial' });
      throw new Error('simulated failure');
    }),
    /simulated failure/
  );
  assert.equal(store.version, originalVersion);
  assert.deepEqual(await store.get('credentials', 'main'), { user: 'before' });
  assert.equal(await store.get('sessions', 'a'), undefined);
});

test('serializes concurrent transactions in submission order', async () => {
  const store = new MemoryDeviceStore();
  const order = [];
  const first = store.transaction(async tx => {
    order.push('first-start');
    await new Promise(resolve => setTimeout(resolve, 15));
    tx.set('counter', 'value', 1);
    order.push('first-end');
  });
  const second = store.transaction(async tx => {
    order.push('second-start');
    const value = tx.get('counter', 'value') ?? 0;
    tx.set('counter', 'value', value + 1);
    order.push('second-end');
  });
  await Promise.all([first, second]);
  assert.deepEqual(order, ['first-start', 'first-end', 'second-start', 'second-end']);
  assert.deepEqual(await store.get('counter', 'value'), 2);
});

test('delete is transactional and reports existence', async () => {
  const store = new MemoryDeviceStore();
  await store.put('pre-keys', '1', { public: 'a' });
  await store.delete('pre-keys', '1');
  assert.equal(await store.has('pre-keys', '1'), false);
  assert.equal(await store.get('pre-keys', '1'), undefined);
});

test('rejects invalid input and operations after close', async () => {
  const store = new MemoryDeviceStore();
  await assert.rejects(store.get('', 'x'), TypeError);
  await assert.rejects(store.put('x', '', 1), TypeError);
  store.close();
  await assert.rejects(store.get('x', 'y'), StoreClosedError);
});
