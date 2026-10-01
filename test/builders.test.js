import test from 'node:test';
import assert from 'node:assert/strict';
import { BuilderError, Kuroxi } from '../src/builders.js';

test('builds immutable text messages', () => {
  const message = Kuroxi.text('Hola Kuroxi')
    .messageId('m1')
    .theme('kuroxi')
    .locale('es-MX')
    .build();
  assert.deepEqual(message.content, { text: 'Hola Kuroxi' });
  assert.equal(message.metadata.messageId, 'm1');
  assert.throws(() => { message.content.text = 'changed'; }, TypeError);
});

test('builds cards with validated actions', () => {
  const message = Kuroxi.card()
    .title('Recarga completada')
    .body('Selecciona una opción')
    .reply('balance', 'Ver saldo')
    .url('https://example.com', 'Abrir sitio')
    .copy('PROMO20', 'Copiar cupón')
    .capabilities('message.card', 'message.list', 'message.text')
    .fallback('message.text')
    .build();
  assert.equal(message.type, 'card');
  assert.equal(message.actions.length, 3);
  assert.equal(message.actions[0].id, 'balance');
  assert.equal(message.actions[1].url, 'https://example.com');
  assert.equal(message.actions[2].value, 'PROMO20');
});

test('builds a list with sections and rows', () => {
  const message = Kuroxi.list()
    .title('Menú principal')
    .body('Selecciona una categoría')
    .section('Planes', section => {
      section.row('basic', 'Básico', '10 GB');
      section.row('pro', 'Pro', 'Ilimitado');
    })
    .section('Ayuda', section => section.row('support', 'Soporte'))
    .build();
  assert.equal(message.content.sections.length, 2);
  assert.equal(message.content.sections[0].rows[1].id, 'pro');
});

test('builders reject incomplete or invalid input', () => {
  assert.throws(() => Kuroxi.text().build(), BuilderError);
  assert.throws(() => Kuroxi.card().title('x').reply('', 'Bad').build(), BuilderError);
  assert.throws(() => Kuroxi.card().title('x').url('not-empty', 'Open').build(), /URL|url/);
  assert.throws(() => Kuroxi.list().title('x').build(), /sections/);
  assert.throws(() => Kuroxi.card().title('x').capabilities().build(), BuilderError);
});

test('builders do not expose mutable internal arrays', () => {
  const builder = Kuroxi.card().title('Title').body('Body').reply('a', 'A');
  const first = builder.build();
  const second = builder.build();
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.throws(() => { first.actions.push({}); }, TypeError);
});
