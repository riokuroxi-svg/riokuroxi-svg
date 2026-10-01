import { normalizeMessageDocument } from './message-schema.js';

export class RenderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RenderError';
    this.code = 'KUROXI_RENDER_ERROR';
  }
}

export function renderMessage(input) {
  const message = normalizeMessageDocument(input);
  switch (message.type) {
    case 'text': return renderText(message);
    case 'card': return renderCard(message);
    case 'list': return renderList(message);
    case 'carousel': return renderCarousel(message);
    case 'rich_response': return renderRichResponse(message);
    case 'catalog': return renderCatalog(message);
    case 'order': return renderOrder(message);
    case 'poll': return renderPoll(message);
    case 'media': return renderMedia(message);
    default: throw new RenderError(`unsupported render type: ${message.type}`);
  }
}

function renderText(message) {
  return `<article class="kuroxi-message kuroxi-text"><p>${formatText(message.content.text)}</p></article>`;
}

function renderCard(message) {
  return `<article class="kuroxi-message kuroxi-card">${header(message.content)}${description(message.content)}${renderActions(message.actions)}</article>`;
}

function renderList(message) {
  const sections = message.content.sections.map(section => `<section class="kuroxi-list-section"><h3>${escape(section.title)}</h3><div class="kuroxi-list-rows">${section.rows.map(row => `<div class="kuroxi-list-row" data-id="${escape(row.id)}"><strong>${escape(row.title)}</strong>${row.description ? `<small>${escape(row.description)}</small>` : ''}</div>`).join('')}</div></section>`).join('');
  return `<article class="kuroxi-message kuroxi-list">${header(message.content)}${description(message.content)}${sections}${renderActions(message.actions)}</article>`;
}

function renderCarousel(message) {
  const cards = message.content.cards.map(card => `<article class="kuroxi-carousel-card">${header(card)}${description(card)}${renderActions(card.actions)}</article>`).join('');
  return `<article class="kuroxi-message kuroxi-carousel"><div class="kuroxi-carousel-track">${cards}</div></article>`;
}

function renderRichResponse(message) {
  const content = message.content;
  const table = Array.isArray(content.table) ? `<table class="kuroxi-table"><tbody>${content.table.map(row => `<tr>${row.map(cell => `<td>${escape(String(cell))}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
  const code = typeof content.code === 'string' ? `<pre class="kuroxi-code"><code>${escape(content.code)}</code></pre>` : '';
  return `<article class="kuroxi-message kuroxi-rich">${header(content)}${description(content)}${table}${code}${renderActions(message.actions)}</article>`;
}

function renderCatalog(message) {
  const products = message.content.products.map(product => `<article class="kuroxi-product" data-product-id="${escape(product.id)}"><strong>${escape(product.title)}</strong>${product.description ? `<p>${escape(product.description)}</p>` : ''}${product.price ? `<span class="kuroxi-price">${escape(String(product.price))}</span>` : ''}</article>`).join('');
  return `<article class="kuroxi-message kuroxi-catalog">${header(message.content)}<div class="kuroxi-products">${products}</div>${renderActions(message.actions)}</article>`;
}

function renderOrder(message) {
  return `<article class="kuroxi-message kuroxi-order"><h2>Pedido ${escape(message.content.orderId)}</h2>${message.content.status ? `<p>${escape(message.content.status)}</p>` : ''}${message.content.total ? `<strong>${escape(String(message.content.total))}</strong>` : ''}${renderActions(message.actions)}</article>`;
}

function renderPoll(message) {
  const options = message.content.options.map(option => `<button type="button" class="kuroxi-poll-option" data-option="${escape(String(option))}">${escape(String(option))}</button>`).join('');
  return `<article class="kuroxi-message kuroxi-poll"><h2>${escape(message.content.question)}</h2><div class="kuroxi-poll-options">${options}</div></article>`;
}

function renderMedia(message) {
  return `<article class="kuroxi-message kuroxi-media" data-media-kind="${escape(message.content.kind)}"><div class="kuroxi-media-placeholder">${escape(message.content.kind)}</div>${message.content.caption ? `<p>${escape(message.content.caption)}</p>` : ''}</article>`;
}

function renderActions(actions = []) {
  if (!actions.length) return '';
  return `<div class="kuroxi-actions">${actions.map(action => {
    const attrs = action.type === 'url' ? ` data-url="${escape(action.url)}"` : action.id ? ` data-id="${escape(action.id)}"` : '';
    return `<button type="button" class="kuroxi-action kuroxi-action-${escape(action.type)}"${attrs}>${escape(action.label)}</button>`;
  }).join('')}</div>`;
}

function header(content) {
  return content.title ? `<h2>${escape(content.title)}</h2>` : '';
}

function description(content) {
  const value = content.body ?? content.description;
  return value ? `<p>${formatText(value)}</p>` : '';
}

function formatText(value) {
  return escape(String(value)).replace(/\n/g, '<br>');
}

function escape(value) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
