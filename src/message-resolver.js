import { CapabilityError } from './capabilities.js';
import { normalizeMessageDocument } from './message-schema.js';

export class MessageValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MessageValidationError';
    this.code = 'KUROXI_MESSAGE_VALIDATION_ERROR';
  }
}

export class MessageResolver {
  #capabilities;

  constructor({ capabilities } = {}) {
    if (!capabilities || typeof capabilities.resolve !== 'function') {
      throw new TypeError('capabilities must be a CapabilityRegistry');
    }
    this.#capabilities = capabilities;
  }

  resolveDocument(document) {
    const normalized = normalizeMessageDocument(document);
    return this.resolve({
      messageId: normalized.metadata?.messageId,
      capabilities: normalized.capabilities,
      fallback: normalized.fallback,
      content: normalized
    });
  }

  resolve(message) {
    validateMessage(message);
    const selected = this.#capabilities.resolve(message.capabilities, {
      fallback: message.fallback,
      includeExperimental: message.allowExperimental === true
    });
    const fallbackUsed = selected.name !== message.capabilities[0];
    return Object.freeze({
      messageId: message.messageId ?? undefined,
      requested: Object.freeze([...message.capabilities]),
      selected: selected.name,
      status: selected.status,
      confidence: selected.confidence,
      fallbackUsed,
      content: deepFreeze(structuredClone(message.content))
    });
  }
}

function validateMessage(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    throw new MessageValidationError('message must be an object');
  }
  if (!Array.isArray(message.capabilities) || message.capabilities.length === 0) {
    throw new MessageValidationError('message capabilities must be a non-empty array');
  }
  if (message.fallback !== undefined && typeof message.fallback !== 'string') {
    throw new MessageValidationError('message fallback must be a string');
  }
  if (message.messageId !== undefined && (typeof message.messageId !== 'string' || message.messageId.length === 0)) {
    throw new MessageValidationError('messageId must be a non-empty string');
  }
  if (message.content === undefined) throw new MessageValidationError('message content is required');
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    Object.freeze(value);
  }
  return value;
}

export { CapabilityError };
