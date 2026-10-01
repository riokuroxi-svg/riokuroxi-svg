import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressError, AddressServers, isUserAddress, normalizeAddress, parseAddress, sameAddress } from '../src/address.js';

test('parses canonical phone-number addresses', () => {
  const address = parseAddress('5215512345678:2@s.whatsapp.net');
  assert.deepEqual(address, {
    raw: '5215512345678:2@s.whatsapp.net',
    kind: 'pn',
    user: '5215512345678',
    device: 2,
    server: AddressServers.PN,
    canonical: '5215512345678:2@s.whatsapp.net'
  });
});

test('parses LID and preserves it as opaque identity', () => {
  const address = parseAddress('123456789012345:3@lid');
  assert.equal(address.kind, 'lid');
  assert.equal(address.user, '123456789012345');
  assert.equal(address.device, 3);
  assert.equal(normalizeAddress('123456789012345:3@LID'), '123456789012345:3@lid');
});

test('parses group, newsletter, broadcast and bot addresses', () => {
  assert.equal(parseAddress('521551234-1234567890@g.us').kind, 'group');
  assert.equal(parseAddress('1234567890@newsletter').kind, 'newsletter');
  assert.equal(parseAddress('status@broadcast').kind, 'broadcast');
  assert.equal(parseAddress('123456@bot').kind, 'bot');
});

test('supports hosted address kinds', () => {
  assert.equal(parseAddress('12345@hosted').kind, 'hosted-pn');
  assert.equal(parseAddress('12345:1@hosted.lid').kind, 'hosted-lid');
});

test('normalizes without confusing PN and LID', () => {
  assert.equal(sameAddress('12345@s.whatsapp.net', '12345@s.whatsapp.net'), true);
  assert.equal(sameAddress('12345@s.whatsapp.net', '12345@lid'), false);
  assert.equal(sameAddress('12345:1@s.whatsapp.net', '12345:2@s.whatsapp.net'), false);
  assert.equal(isUserAddress('12345@lid'), true);
  assert.equal(isUserAddress('123-456@g.us'), false);
});

test('rejects malformed and unsupported addresses', () => {
  const invalid = [
    '',
    '12345',
    '12345@',
    '@lid',
    '12@@lid',
    'abc@s.whatsapp.net',
    '123:999@s.whatsapp.net',
    '123-456-789@g.us',
    '123@unknown'
  ];
  for (const value of invalid) assert.throws(() => parseAddress(value), AddressError, value);
});

test('does not mutate the parsed result', () => {
  const address = parseAddress('12345@lid');
  assert.throws(() => { address.user = 'changed'; }, TypeError);
  assert.equal(address.user, '12345');
});
