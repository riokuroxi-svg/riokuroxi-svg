const SERVERS = Object.freeze({
  PN: 's.whatsapp.net',
  LID: 'lid',
  HOSTED: 'hosted',
  HOSTED_LID: 'hosted.lid',
  GROUP: 'g.us',
  NEWSLETTER: 'newsletter',
  BROADCAST: 'broadcast',
  BOT: 'bot'
});

const KIND_BY_SERVER = Object.freeze({
  [SERVERS.PN]: 'pn',
  [SERVERS.LID]: 'lid',
  [SERVERS.HOSTED]: 'hosted-pn',
  [SERVERS.HOSTED_LID]: 'hosted-lid',
  [SERVERS.GROUP]: 'group',
  [SERVERS.NEWSLETTER]: 'newsletter',
  [SERVERS.BROADCAST]: 'broadcast',
  [SERVERS.BOT]: 'bot'
});

export class AddressError extends Error {
  constructor(message, code = 'KUROXI_INVALID_ADDRESS') {
    super(message);
    this.name = 'AddressError';
    this.code = code;
  }
}

export function parseAddress(input) {
  if (typeof input !== 'string') throw new AddressError('address must be a string');
  const raw = input.trim();
  if (raw.length === 0 || raw.length > 320) throw new AddressError('address has invalid length');

  const at = raw.lastIndexOf('@');
  if (at <= 0 || at === raw.length - 1 || raw.indexOf('@') !== at) {
    throw new AddressError('address must contain exactly one @ separator');
  }

  const userPart = raw.slice(0, at);
  const server = raw.slice(at + 1).toLowerCase();
  const kind = KIND_BY_SERVER[server];
  if (!kind) throw new AddressError(`unsupported address server: ${server}`, 'KUROXI_UNSUPPORTED_ADDRESS');

  const { user, device } = parseUserAndDevice(userPart, kind);
  const canonical = `${user}${device === undefined ? '' : `:${device}`}@${server}`;
  return Object.freeze({
    raw,
    kind,
    user,
    device,
    server,
    canonical
  });
}

function parseUserAndDevice(userPart, kind) {
  const parts = userPart.split(':');
  if (parts.length > 2 || parts.some(part => part.length === 0)) {
    throw new AddressError('invalid user/device portion');
  }
  const user = parts[0];
  const device = parts.length === 2 ? parseDevice(parts[1]) : undefined;
  validateUser(user, kind);
  return { user, device };
}

function parseDevice(value) {
  if (!/^\d+$/.test(value)) throw new AddressError('device must be an integer');
  const device = Number(value);
  if (!Number.isSafeInteger(device) || device < 0 || device > 255) {
    throw new AddressError('device is outside the supported range');
  }
  return device;
}

function validateUser(user, kind) {
  if (user.length === 0 || user.length > 200) throw new AddressError('user has invalid length');
  if (/[@\s]/.test(user)) throw new AddressError('user contains invalid characters');
  if (kind === 'pn' || kind === 'hosted-pn') {
    if (!/^\d+$/.test(user)) throw new AddressError('phone-number user must contain digits only');
  }
  if (kind === 'group' && !/^\d+-\d+$/.test(user)) {
    throw new AddressError('group user must use the numeric-group format');
  }
}

export function normalizeAddress(input) {
  return parseAddress(input).canonical;
}

export function sameAddress(left, right) {
  const a = typeof left === 'string' ? parseAddress(left) : left;
  const b = typeof right === 'string' ? parseAddress(right) : right;
  return a.kind === b.kind && a.user === b.user && a.device === b.device;
}

export function isUserAddress(address) {
  const parsed = typeof address === 'string' ? parseAddress(address) : address;
  return ['pn', 'lid', 'hosted-pn', 'hosted-lid', 'bot'].includes(parsed.kind);
}

export const AddressServers = SERVERS;
