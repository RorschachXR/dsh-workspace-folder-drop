// Harness: load the plugin's real host half, capture the route it registers, and
// drive it against a real temporary directory tree.
//
//   node test/host.test.mjs
//
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const hostHalf = await import('../lib/index.js');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  — ${detail}`}`);
};

/** Capture the route the host half registers on a fake webserver. */
let registered = null;
let disposed = 0;
const ctx = {
  inject(names, callback) {
    if (!names.includes('webServer') || !names.includes('connection')) throw new Error(`unexpected injection: ${JSON.stringify(names)}`);
    callback({
      effect: (factory) => {
        const dispose = factory();
        return () => {
          disposed += 1;
          dispose?.();
        };
      },
      connection: {
        requestRejection: (req) => req.rejection,
      },
      webServer: {
        register(route) {
          registered = route;
          return () => {};
        },
      },
    });
  },
};

/** One fake request with a JSON body and an optional auth rejection. */
function request(method, body, rejection) {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body), 'utf8')];
  return {
    method,
    rejection,
    resume() {},
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

/** One fake response capturing status and body. */
function response() {
  const captured = { status: 0, body: '' };
  return {
    captured,
    writeHead(status) {
      captured.status = status;
    },
    end(body) {
      captured.body = body ?? '';
    },
  };
}

const call = async (method, body, rejection) => {
  const res = response();
  await registered.handler(request(method, body, rejection), res);
  let parsed = null;
  try {
    parsed = JSON.parse(res.captured.body);
  } catch {
    parsed = null;
  }
  return { status: res.captured.status, body: parsed };
};

//#region the fixture tree
const root = await mkdtemp(join(tmpdir(), 'dsh-folder-drop-'));
const seed = join(root, 'seed');
await mkdir(join(root, 'alpha', 'demo'), { recursive: true });
await mkdir(join(root, 'beta', 'demo'), { recursive: true });
await mkdir(join(root, 'alpha', 'other'), { recursive: true });
await mkdir(join(root, 'deep', 'one', 'two', 'demo'), { recursive: true });
await mkdir(join(seed, 'node_modules', 'demo'), { recursive: true });
await mkdir(join(seed, 'Demo'), { recursive: true });
await writeFile(join(root, 'alpha', 'file.txt'), 'not a directory\n');
//#endregion

hostHalf.apply(ctx);
check('host: the locate route is registered', registered?.kind === 'exact' && registered?.path === '/workspace-folder-drop/locate', JSON.stringify({ kind: registered?.kind, path: registered?.path }));

const unauthenticated = await call('POST', { name: 'demo', seeds: [root] }, 401);
check('host: an unauthenticated request is refused', unauthenticated.status === 401 && unauthenticated.body === null, JSON.stringify(unauthenticated));
const foreign = await call('POST', { name: 'demo', seeds: [root] }, 403);
check('host: a foreign-authority request is refused', foreign.status === 403 && foreign.body === null, JSON.stringify(foreign));

const found = await call('POST', { name: 'demo', seeds: [root] });
check('host: matching directories are returned', found.status === 200 && found.body.candidates.length === 3, JSON.stringify(found.body?.candidates));
check('host: an exact match is flagged and preferred data reaches the client', found.body.candidates.filter((row) => row.exact === true).length === 2 && found.body.candidates.every((row) => typeof row.path === 'string' && row.depth === 2 && row.root === 0), JSON.stringify(found.body?.candidates));
check('host: a deeper match is outside the walk', !JSON.stringify(found.body.candidates).includes('two'), JSON.stringify(found.body?.candidates));
check('host: build noise is skipped', !JSON.stringify(found.body.candidates).includes('node_modules'), JSON.stringify(found.body?.candidates));
check('host: files are not candidates', !JSON.stringify(found.body.candidates).includes('file.txt'));

const casing = await call('POST', { name: 'demo', seeds: [seed] });
check('host: a case-insensitive match is flagged inexact', casing.body.candidates.length === 1 && casing.body.candidates[0].exact === false, JSON.stringify(casing.body?.candidates));

const ranked = await call('POST', { name: 'demo', seeds: [seed, root] });
check('host: several seeds are searched in order', ranked.body.candidates.some((row) => row.root === 0) && ranked.body.candidates.some((row) => row.root === 1), JSON.stringify(ranked.body?.candidates));

const missing = await call('POST', { name: 'nope-nowhere', seeds: [root] });
check('host: a miss answers an empty list', missing.status === 200 && missing.body.candidates.length === 0 && missing.body.truncated === false, JSON.stringify(missing.body));

check('host: a GET is refused', (await call('GET')).status === 405);
check('host: a malformed body is refused', (await call('POST', undefined)) === undefined ? false : (await call('POST', undefined)).status === 400);
check('host: a name with a separator is refused', (await call('POST', { name: 'a/b', seeds: [root] })).status === 400);
check('host: an empty name is refused', (await call('POST', { name: '   ', seeds: [root] })).status === 400);
const relative = await call('POST', { name: 'demo', seeds: ['relative/path', 42, null] });
check('host: a relative seed is ignored', relative.status === 200 && relative.body.candidates.length === 0, JSON.stringify(relative.body));

const homed = await call('POST', { name: 'this-name-should-not-exist-anywhere', seeds: [], home: true });
check('host: the home directory is searched too', homed.status === 200 && Array.isArray(homed.body.candidates), JSON.stringify({ visited: homed.body?.visited }));

await rm(root, { recursive: true, force: true });

const failures = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
process.exit(failures.length === 0 ? 0 : 1);
