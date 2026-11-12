// Checks that catalog.json is a catalog the App Store reads, and that
// every entry's file is where the rule puts it and is the file the entry
// describes. With a base commit as its argument, also checks that no file
// already published was changed. Run from the repository's root.

import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';

const FORMAT = 'project02.catalog.v1';
const MOST_APPS = 100;
const LARGEST_APP = 256 * 1024;
const ID = /^[a-z][a-z0-9._-]{0,127}$/u;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const FIELDS = [
  'id',
  'name',
  'summary',
  'icon',
  'tint',
  'version',
  'changes',
  'wakes',
  'sha256',
];
// What an app may say beside them: the hosts it reaches on the internet,
// and the account of the person's it uses.
const MAY_HAVE = ['reaches', 'account'];
const MOST_HOSTS = 4;
const HOST =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$/u;

const problems = [];
const oneLine = text =>
  typeof text === 'string' && text.trim() !== '' && !/[\r\n]/u.test(text);

function checkEntry(entry, index, seen) {
  const at = `apps[${index}]`;

  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    problems.push(`${at} is not an object`);
    return;
  }

  const unknown = Object.keys(entry).filter(
    key => !FIELDS.includes(key) && !MAY_HAVE.includes(key),
  );
  const missing = FIELDS.filter(key => !(key in entry));

  if (unknown.length > 0 || missing.length > 0) {
    problems.push(
      `${at} must have ${FIELDS.join(', ')}, and may have ${MAY_HAVE.join(' and ')}` +
        (missing.length > 0 ? `; missing ${missing.join(', ')}` : '') +
        (unknown.length > 0 ? `; unknown ${unknown.join(', ')}` : ''),
    );
    return;
  }

  const named = `${at} (${String(entry.id)})`;

  if (typeof entry.id !== 'string' || !ID.test(entry.id)) {
    problems.push(
      `${at} id must begin with a lowercase letter and hold lowercase letters, digits, '.', '_' or '-'`,
    );
    return;
  }

  if (seen.has(entry.id)) {
    problems.push(`${named} is listed more than once`);
  }

  seen.add(entry.id);

  for (const field of ['name', 'summary', 'icon', 'tint', 'changes']) {
    if (!oneLine(entry[field])) {
      problems.push(`${named} ${field} must be one line that is not blank`);
    }
  }

  if (typeof entry.wakes !== 'boolean') {
    problems.push(`${named} wakes must be true or false`);
  }

  const reaches = entry.reaches ?? [];

  if (
    !Array.isArray(reaches) ||
    reaches.length > MOST_HOSTS ||
    new Set(reaches).size !== reaches.length ||
    !reaches.every(host => typeof host === 'string' && HOST.test(host))
  ) {
    problems.push(
      `${named} reaches must name at most ${MOST_HOSTS} hosts, each once: DNS names in lowercase with no scheme, port or path`,
    );
  }

  if (
    entry.account !== undefined &&
    (typeof entry.account !== 'string' || !ID.test(entry.account))
  ) {
    problems.push(`${named} account must be the id of an account, in lowercase`);
  }

  if (typeof entry.version !== 'string' || !VERSION.test(entry.version)) {
    problems.push(
      `${named} version must be three numbers with dots, such as 1.0.0`,
    );
    return;
  }

  if (typeof entry.sha256 !== 'string' || !SHA256.test(entry.sha256)) {
    problems.push(`${named} sha256 must be 64 lowercase hex digits`);
    return;
  }

  const file = `apps/${entry.id}/${entry.version}.js`;

  if (!existsSync(file)) {
    problems.push(`${named} has no file at ${file}`);
    return;
  }

  const bytes = readFileSync(file);

  if (bytes.length > LARGEST_APP) {
    problems.push(`${file} is larger than ${LARGEST_APP} bytes`);
  }

  const sha256 = createHash('sha256').update(bytes).digest('hex');

  if (sha256 !== entry.sha256) {
    problems.push(
      `${file} is not the file its entry describes: its SHA-256 is ${sha256}`,
    );
  }
}

function checkCatalog() {
  let catalog;

  try {
    catalog = JSON.parse(readFileSync('catalog.json', 'utf8'));
  } catch (error) {
    problems.push(`catalog.json does not read: ${error.message}`);
    return;
  }

  if (catalog?.format !== FORMAT) {
    problems.push(`catalog.json format must be "${FORMAT}"`);
  }

  if (!Array.isArray(catalog?.apps)) {
    problems.push('catalog.json apps must be a list');
    return;
  }

  if (catalog.apps.length > MOST_APPS) {
    problems.push(`catalog.json lists more than ${MOST_APPS} apps`);
  }

  const seen = new Set();

  catalog.apps.forEach((entry, index) => checkEntry(entry, index, seen));
}

/** A published file never changes: against `base`, files under apps/ are only ever added. */
function checkNothingPublishedChanged(base) {
  const changed = execFileSync(
    'git',
    ['diff', '--name-status', '--no-renames', `${base}...HEAD`, '--', 'apps'],
    {encoding: 'utf8'},
  )
    .split('\n')
    .filter(line => line !== '' && !line.startsWith('A\t'));

  for (const line of changed) {
    const [status, file] = line.split('\t');

    problems.push(
      `${file} was ${status === 'D' ? 'removed' : 'changed'}: a published file never changes, a change is a new version`,
    );
  }
}

checkCatalog();

if (process.argv[2] !== undefined) {
  checkNothingPublishedChanged(process.argv[2]);
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log('The catalog and its files agree.');
