import { normalizeMessageDocument } from './message-schema.js';
import { MessageResolver } from './message-resolver.js';
import { renderMessage } from './render-message.js';

export class EncoderError extends Error {
  constructor(message, code = 'KUROXI_ENCODER_ERROR') {
    super(message);
    this.name = 'EncoderError';
    this.code = code;
  }
}

export class EncoderRegistry {
  #encoders = new Map();
  #closed = false;

  register(capability, encoder) {
    this.#assertOpen();
    if (typeof capability !== 'string' || capability.length === 0) throw new TypeError('capability must be a non-empty string');
    if (!encoder || typeof encoder.encode !== 'function') throw new TypeError('encoder must implement encode');
    if (this.#encoders.has(capability)) throw new EncoderError(`encoder already registered: ${capability}`, 'KUROXI_ENCODER_DUPLICATE');
    this.#encoders.set(capability, encoder);
    return this;
  }

  get(capability) {
    this.#assertOpen();
    return this.#encoders.get(capability);
  }

  has(capability) {
    this.#assertOpen();
    return this.#encoders.has(capability);
  }

  close() {
    this.#closed = true;
    this.#encoders.clear();
  }

  #assertOpen() {
    if (this.#closed) throw new EncoderError('encoder registry is closed', 'KUROXI_ENCODER_CLOSED');
  }
}

export class PreviewEncoder {
  constructor({ format = 'preview-html' } = {}) {
    this.format = format;
  }

  encode(document, resolution) {
    return Object.freeze({
      format: this.format,
      selectedCapability: resolution.selected,
      fallbackUsed: resolution.fallbackUsed,
      html: renderMessage(document)
    });
  }
}

export class MessageCompiler {
  #resolver;
  #encoders;

  constructor({ resolver, encoders } = {}) {
    if (!(resolver instanceof MessageResolver)) throw new TypeError('resolver must be a MessageResolver');
    if (!(encoders instanceof EncoderRegistry)) throw new TypeError('encoders must be an EncoderRegistry');
    this.#resolver = resolver;
    this.#encoders = encoders;
  }

  compile(input) {
    const document = normalizeMessageDocument(input);
    const resolution = this.#resolver.resolveDocument(document);
    const encoder = this.#encoders.get(resolution.selected);
    if (!encoder) throw new EncoderError(`no encoder registered for ${resolution.selected}`, 'KUROXI_ENCODER_MISSING');
    const encoded = encoder.encode(document, resolution);
    if (!encoded || typeof encoded !== 'object') throw new EncoderError('encoder returned an invalid result');
    return Object.freeze({
      messageId: resolution.messageId,
      requested: resolution.requested,
      selectedCapability: resolution.selected,
      fallbackUsed: resolution.fallbackUsed,
      encoded: Object.freeze(structuredClone(encoded))
    });
  }
}
