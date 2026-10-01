const MESSAGE_TYPES = Object.freeze(['text', 'card', 'list', 'carousel', 'rich_response', 'catalog', 'order', 'poll', 'media']);
const ACTION_TYPES = Object.freeze(['reply', 'url', 'call', 'copy', 'select']);

export class MessageSchemaError extends Error {
  constructor(message, path = '') {
    super(path ? `${path}: ${message}` : message);
    this.name = 'MessageSchemaError';
    this.code = 'KUROXI_MESSAGE_SCHEMA_ERROR';
    this.path = path;
  }
}

export function validateMessageDocument(document) {
  assertObject(document, 'message');
  if (document.version !== 1) fail('version must be 1', 'message.version');
  if (typeof document.type !== 'string' || !MESSAGE_TYPES.includes(document.type)) {
    fail(`type must be one of: ${MESSAGE_TYPES.join(', ')}`, 'message.type');
  }
  assertObject(document.content, 'message.content');
  if (document.capabilities !== undefined) validateCapabilities(document.capabilities);
  if (document.fallback !== undefined) validateCapabilityName(document.fallback, 'message.fallback');
  if (document.actions !== undefined) validateActions(document.actions);
  if (document.metadata !== undefined) validateMetadata(document.metadata);
  validateTypeContent(document.type, document.content);
  return true;
}

export function normalizeMessageDocument(input) {
  assertObject(input, 'message');
  const normalized = structuredClone(input);
  normalized.version ??= 1;
  normalized.capabilities ??= [`message.${normalized.type}`];
  validateMessageDocument(normalized);
  return deepFreeze(normalized);
}

function validateTypeContent(type, content) {
  switch (type) {
    case 'text':
      requireString(content.text, 'message.content.text');
      break;
    case 'card':
    case 'rich_response':
      requireAtLeastOneString(content, ['title', 'body', 'description'], `message.content`);
      break;
    case 'list':
      if (!Array.isArray(content.sections) || content.sections.length === 0) {
        fail('sections must be a non-empty array', 'message.content.sections');
      }
      content.sections.forEach((section, i) => {
        assertObject(section, `message.content.sections[${i}]`);
        requireString(section.title, `message.content.sections[${i}].title`);
        if (!Array.isArray(section.rows) || section.rows.length === 0) {
          fail('rows must be a non-empty array', `message.content.sections[${i}].rows`);
        }
      });
      break;
    case 'carousel':
      if (!Array.isArray(content.cards) || content.cards.length === 0 || content.cards.length > 10) {
        fail('cards must contain between 1 and 10 items', 'message.content.cards');
      }
      content.cards.forEach((card, i) => {
        assertObject(card, `message.content.cards[${i}]`);
        requireAtLeastOneString(card, ['title', 'body', 'description'], `message.content.cards[${i}]`);
      });
      break;
    case 'catalog':
      if (!Array.isArray(content.products) || content.products.length === 0) {
        fail('products must be a non-empty array', 'message.content.products');
      }
      content.products.forEach((product, i) => {
        assertObject(product, `message.content.products[${i}]`);
        requireString(product.id, `message.content.products[${i}].id`);
        requireString(product.title, `message.content.products[${i}].title`);
      });
      break;
    case 'order':
      requireString(content.orderId, 'message.content.orderId');
      break;
    case 'poll':
      requireString(content.question, 'message.content.question');
      if (!Array.isArray(content.options) || content.options.length < 2) fail('options must contain at least 2 items', 'message.content.options');
      break;
    case 'media':
      requireString(content.kind, 'message.content.kind');
      requireString(content.source, 'message.content.source');
      break;
  }
}

function validateCapabilities(capabilities) {
  if (!Array.isArray(capabilities) || capabilities.length === 0) fail('capabilities must be a non-empty array', 'message.capabilities');
  capabilities.forEach((value, i) => validateCapabilityName(value, `message.capabilities[${i}]`));
}

function validateCapabilityName(value, path) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9]*(\.[a-z0-9_-]+)+$/.test(value)) fail('invalid capability name', path);
}

function validateActions(actions) {
  if (!Array.isArray(actions)) fail('actions must be an array', 'message.actions');
  if (actions.length > 10) fail('actions cannot contain more than 10 items', 'message.actions');
  actions.forEach((action, i) => {
    assertObject(action, `message.actions[${i}]`);
    if (!ACTION_TYPES.includes(action.type)) fail(`type must be one of: ${ACTION_TYPES.join(', ')}`, `message.actions[${i}].type`);
    requireString(action.label, `message.actions[${i}].label`);
    if (action.type === 'reply' || action.type === 'select') requireString(action.id, `message.actions[${i}].id`);
    if (action.type === 'url') validateUrl(action.url, `message.actions[${i}].url`);
    if (action.type === 'call') validatePhone(action.phone, `message.actions[${i}].phone`);
    if (action.type === 'copy') requireString(action.value, `message.actions[${i}].value`);
  });
}

function validateMetadata(metadata) {
  assertObject(metadata, 'message.metadata');
  if (metadata.messageId !== undefined) requireString(metadata.messageId, 'message.metadata.messageId');
  if (metadata.theme !== undefined) requireString(metadata.theme, 'message.metadata.theme');
  if (metadata.locale !== undefined) requireString(metadata.locale, 'message.metadata.locale');
  if (metadata.expiresAt !== undefined && !Number.isFinite(metadata.expiresAt)) fail('expiresAt must be a finite number', 'message.metadata.expiresAt');
}

function validateUrl(value, path) {
  requireString(value, path);
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) fail('only http and https URLs are allowed', path);
  } catch {
    fail('must be a valid http or https URL', path);
  }
}

function validatePhone(value, path) {
  requireString(value, path);
  if (!/^\\+?[0-9]{6,20}$/.test(value)) fail('must be a valid phone number', path);
}

function requireAtLeastOneString(object, keys, path) {
  if (!keys.some(key => typeof object[key] === 'string' && object[key].length > 0)) {
    fail(`at least one of ${keys.join(', ')} is required`, path);
  }
}

function requireString(value, path) {
  if (typeof value !== 'string' || value.length === 0) fail('must be a non-empty string', path);
}

function assertObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('must be an object', path);
}

function fail(message, path) {
  throw new MessageSchemaError(message, path);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    Object.freeze(value);
  }
  return value;
}

export { ACTION_TYPES, MESSAGE_TYPES };
