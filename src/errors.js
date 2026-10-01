const CATEGORIES = Object.freeze([
  'configuration',
  'validation',
  'address',
  'connection',
  'timeout',
  'authentication',
  'identity',
  'crypto',
  'protocol',
  'sync',
  'store',
  'media',
  'capability',
  'fatal'
]);

const SEVERITIES = Object.freeze(['info', 'warning', 'error', 'fatal']);
const ACTIONS = Object.freeze(['none', 'retry', 'reconnect', 'reauthenticate', 'resync', 'migrate', 'stop']);

export class KuroxiError extends Error {
  constructor(message, {
    code = 'KUROXI_UNKNOWN_ERROR',
    category = 'fatal',
    severity = 'error',
    action = 'stop',
    recoverable = false,
    retryable = false,
    details = undefined,
    cause = undefined
  } = {}) {
    super(message, { cause });
    this.name = 'KuroxiError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.action = action;
    this.recoverable = recoverable;
    this.retryable = retryable;
    this.details = sanitizeDetails(details);
    this.causeCode = cause instanceof KuroxiError ? cause.code : undefined;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      severity: this.severity,
      action: this.action,
      recoverable: this.recoverable,
      retryable: this.retryable,
      details: this.details,
      causeCode: this.causeCode
    };
  }
}

export class ConnectionError extends KuroxiError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? 'KUROXI_CONNECTION_ERROR', category: 'connection' });
    this.name = 'ConnectionError';
  }
}

export class IdentityError extends KuroxiError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? 'KUROXI_IDENTITY_ERROR', category: 'identity', action: options.action ?? 'reauthenticate' });
    this.name = 'IdentityError';
  }
}

export class StoreError extends KuroxiError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? 'KUROXI_STORE_ERROR', category: 'store' });
    this.name = 'StoreError';
  }
}

export function normalizeError(error, fallback = {}) {
  if (error instanceof KuroxiError) return error;
  if (error instanceof Error) {
    return new KuroxiError(error.message, { ...fallback, cause: error });
  }
  return new KuroxiError(String(error), fallback);
}

export const ErrorCategory = Object.freeze(Object.fromEntries(CATEGORIES.map(value => [value.toUpperCase(), value])));
export const ErrorSeverity = Object.freeze(Object.fromEntries(SEVERITIES.map(value => [value.toUpperCase(), value])));
export const ErrorAction = Object.freeze(Object.fromEntries(ACTIONS.map(value => [value.toUpperCase(), value])));

function sanitizeDetails(details) {
  if (details === undefined) return undefined;
  try {
    return sanitizeValue(details, new WeakSet());
  } catch {
    return { note: 'details omitted because they were not serializable' };
  }
}

function sanitizeValue(value, seen, key = '') {
  if (isSensitiveKey(key)) return '[REDACTED]';
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) throw new TypeError('circular details');
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => sanitizeValue(item, seen));
  const output = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    output[childKey] = sanitizeValue(childValue, seen, childKey);
  }
  seen.delete(value);
  return output;
}

function isSensitiveKey(key) {
  return /token|secret|password|credential|auth|private.?key|qr|pairing|signal.?key/i.test(key);
}
