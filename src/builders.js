import { normalizeMessageDocument } from './message-schema.js';

export class BuilderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BuilderError';
    this.code = 'KUROXI_BUILDER_ERROR';
  }
}

export class ActionBuilder {
  #action;

  constructor(type, label) {
    if (typeof type !== 'string' || typeof label !== 'string' || label.length === 0) {
      throw new BuilderError('action type and label are required');
    }
    this.#action = { type, label };
  }

  id(value) { this.#action.id = requireText(value, 'action id'); return this; }
  url(value) { this.#action.url = requireText(value, 'action url'); return this; }
  phone(value) { this.#action.phone = requireText(value, 'action phone'); return this; }
  value(value) { this.#action.value = requireText(value, 'action value'); return this; }
  build() { return Object.freeze(structuredClone(this.#action)); }
}

export class TextBuilder {
  #document = { version: 1, type: 'text', content: {} };

  constructor(text = undefined) {
    if (text !== undefined) this.text(text);
  }

  text(value) { this.#document.content.text = requireText(value, 'text'); return this; }
  messageId(value) { this.#metadata().messageId = requireText(value, 'messageId'); return this; }
  locale(value) { this.#metadata().locale = requireText(value, 'locale'); return this; }
  theme(value) { this.#metadata().theme = requireText(value, 'theme'); return this; }
  capabilities(...values) { this.#document.capabilities = flatten(values); return this; }
  fallback(value) { this.#document.fallback = requireText(value, 'fallback'); return this; }
  build() { return buildDocument(this.#document); }

  #metadata() {
    this.#document.metadata ??= {};
    return this.#document.metadata;
  }
}

export class CardBuilder {
  #document = { version: 1, type: 'card', content: {}, actions: [] };

  title(value) { this.#document.content.title = requireText(value, 'title'); return this; }
  body(value) { this.#document.content.body = requireText(value, 'body'); return this; }
  description(value) { this.#document.content.description = requireText(value, 'description'); return this; }
  messageId(value) { this.#metadata().messageId = requireText(value, 'messageId'); return this; }
  theme(value) { this.#metadata().theme = requireText(value, 'theme'); return this; }
  locale(value) { this.#metadata().locale = requireText(value, 'locale'); return this; }
  capabilities(...values) { this.#document.capabilities = flatten(values); return this; }
  fallback(value) { this.#document.fallback = requireText(value, 'fallback'); return this; }
  action(action) { this.#document.actions.push(buildAction(action)); return this; }
  reply(id, label) { return this.action(new ActionBuilder('reply', label).id(id)); }
  url(url, label) { return this.action(new ActionBuilder('url', label).url(url)); }
  call(phone, label) { return this.action(new ActionBuilder('call', label).phone(phone)); }
  copy(value, label) { return this.action(new ActionBuilder('copy', label).value(value)); }
  build() { return buildDocument(this.#document); }

  #metadata() {
    this.#document.metadata ??= {};
    return this.#document.metadata;
  }
}

export class ListBuilder {
  #document = { version: 1, type: 'list', content: { sections: [] } };

  title(value) { this.#document.content.title = requireText(value, 'title'); return this; }
  body(value) { this.#document.content.body = requireText(value, 'body'); return this; }
  messageId(value) { this.#metadata().messageId = requireText(value, 'messageId'); return this; }
  theme(value) { this.#metadata().theme = requireText(value, 'theme'); return this; }
  capabilities(...values) { this.#document.capabilities = flatten(values); return this; }
  fallback(value) { this.#document.fallback = requireText(value, 'fallback'); return this; }
  section(title, configure) {
    const section = { title: requireText(title, 'section title'), rows: [] };
    if (configure !== undefined && typeof configure !== 'function') throw new BuilderError('section configure must be a function');
    if (configure) configure(new SectionBuilder(section));
    this.#document.content.sections.push(section);
    return this;
  }
  build() { return buildDocument(this.#document); }

  #metadata() {
    this.#document.metadata ??= {};
    return this.#document.metadata;
  }
}

class SectionBuilder {
  #section;
  constructor(section) { this.#section = section; }
  row(id, title, description = undefined) {
    const row = { id: requireText(id, 'row id'), title: requireText(title, 'row title') };
    if (description !== undefined) row.description = requireText(description, 'row description');
    this.#section.rows.push(row);
    return this;
  }
}

export const Kuroxi = Object.freeze({
  text: text => new TextBuilder(text),
  card: () => new CardBuilder(),
  list: () => new ListBuilder(),
  action: (type, label) => new ActionBuilder(type, label)
});

function buildDocument(document) {
  try {
    return normalizeMessageDocument(document);
  } catch (error) {
    throw new BuilderError(error.message);
  }
}

function buildAction(action) {
  if (action instanceof ActionBuilder) return action.build();
  if (!action || typeof action !== 'object') throw new BuilderError('action must be an ActionBuilder or object');
  return structuredClone(action);
}

function flatten(values) {
  const result = values.flat(Infinity);
  if (result.length === 0) throw new BuilderError('at least one capability is required');
  return result.map(value => requireText(value, 'capability'));
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new BuilderError(`${label} must be a non-empty string`);
  return value;
}
