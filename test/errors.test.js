import test from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionError, ErrorAction, ErrorCategory, ErrorSeverity, IdentityError, KuroxiError, normalizeError, StoreError } from '../src/errors.js';

test('creates a structured, serializable Kuroxi error', () => {
  const error = new KuroxiError('temporary network problem', {
    code: 'KUROXI_SOCKET_TIMEOUT',
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.WARNING,
    action: ErrorAction.RECONNECT,
    recoverable: true,
    retryable: true,
    details: { timeoutMs: 5000 }
  });
  assert.equal(error.code, 'KUROXI_SOCKET_TIMEOUT');
  assert.deepEqual(error.toJSON(), {
    name: 'KuroxiError',
    code: 'KUROXI_SOCKET_TIMEOUT',
    category: 'timeout',
    severity: 'warning',
    action: 'reconnect',
    recoverable: true,
    retryable: true,
    details: { timeoutMs: 5000 },
    causeCode: undefined
  });
});

test('specialized errors provide safe defaults', () => {
  const connection = new ConnectionError('socket closed', { action: 'reconnect', recoverable: true });
  const identity = new IdentityError('identity changed');
  const store = new StoreError('transaction failed');
  assert.equal(connection.category, 'connection');
  assert.equal(identity.action, 'reauthenticate');
  assert.equal(store.category, 'store');
});

test('normalizes native errors without exposing the native stack in JSON', () => {
  const native = new Error('database unavailable');
  const normalized = normalizeError(native, { category: 'store', action: 'retry', retryable: true });
  assert.equal(normalized.message, 'database unavailable');
  assert.equal(normalized.causeCode, undefined);
  assert.equal(normalized.toJSON().stack, undefined);
});

test('preserves Kuroxi errors and links Kuroxi causes by code', () => {
  const cause = new IdentityError('identity changed', { code: 'KUROXI_IDENTITY_CHANGED' });
  const outer = normalizeError(cause, { code: 'ignored' });
  assert.equal(outer, cause);
  const wrapped = new KuroxiError('session stopped', { cause, category: 'fatal' });
  assert.equal(wrapped.causeCode, 'KUROXI_IDENTITY_CHANGED');
});

test('omits circular details and redacts sensitive fields', () => {
  const details = { token: 'do-not-log', nested: { qr: 'do-not-log' } };
  details.self = details;
  const circular = new KuroxiError('bad details', { details });
  assert.deepEqual(circular.details, { note: 'details omitted because they were not serializable' });
  const safe = new KuroxiError('safe details', { details: { token: 'secret', nested: { value: 1 } } });
  assert.deepEqual(safe.details, { token: '[REDACTED]', nested: { value: 1 } });
});
