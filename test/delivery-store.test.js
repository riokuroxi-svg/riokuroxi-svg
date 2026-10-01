import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDeviceStore } from '../src/device-store.js';
import { DeliveryStateError, DeliveryStore } from '../src/delivery-store.js';

test('creates and persists a pending delivery', async () => {
  const delivery = new DeliveryStore({ store: new MemoryDeviceStore(), clock: () => 100 });
  const started = await delivery.begin('m1', { text: 'hello' });
  assert.equal(started.completed, false);
  assert.equal(started.record.status, 'pending');
  assert.deepEqual(await delivery.get('m1'), {
    messageId: 'm1', payload: { text: 'hello' }, status: 'pending', attempts: 0, updatedAt: 100, result: undefined, error: undefined
  });
});

test('enforces delivery state transitions', async () => {
  const delivery = new DeliveryStore({ store: new MemoryDeviceStore() });
  await delivery.begin('m2', {});
  await delivery.transition('m2', 'sending', { attempts: 1 });
  await delivery.transition('m2', 'retrying', { error: { code: 'TEMP' } });
  await delivery.transition('m2', 'sending', { attempts: 2 });
  await delivery.transition('m2', 'acknowledged', { result: { status: 'acknowledged' } });
  assert.equal((await delivery.get('m2')).status, 'acknowledged');
  await assert.rejects(delivery.transition('m2', 'sending'), DeliveryStateError);
});

test('failed deliveries can be explicitly started again', async () => {
  const delivery = new DeliveryStore({ store: new MemoryDeviceStore() });
  await delivery.begin('m3', { text: 'first' });
  await delivery.transition('m3', 'sending', { attempts: 1 });
  await delivery.transition('m3', 'failed', { error: { code: 'OFFLINE' } });
  const restarted = await delivery.begin('m3', { text: 'second' });
  assert.equal(restarted.completed, false);
  assert.equal((await delivery.get('m3')).payload.text, 'second');
});

test('acknowledged delivery is idempotent', async () => {
  const delivery = new DeliveryStore({ store: new MemoryDeviceStore() });
  await delivery.begin('m4', {});
  await delivery.transition('m4', 'sending', { attempts: 1 });
  await delivery.transition('m4', 'acknowledged', { result: { status: 'acknowledged' } });
  const again = await delivery.begin('m4', { changed: true });
  assert.equal(again.completed, true);
  assert.equal(again.record.payload.changed, undefined);
});

test('lists persisted deliveries', async () => {
  const delivery = new DeliveryStore({ store: new MemoryDeviceStore() });
  await delivery.begin('m5', {});
  await delivery.begin('m6', {});
  const records = await delivery.list();
  assert.deepEqual(records.map(record => record.messageId).sort(), ['m5', 'm6']);
});
