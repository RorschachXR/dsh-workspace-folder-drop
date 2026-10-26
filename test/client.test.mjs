// Harness: load the plugin's real client bundle against a minimal DOM stub and
// drive the drag events a folder drop produces, across every lane and every
// thing a browser may or may not reveal about a drag.
//
//   node test/client.test.mjs
//
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const bundle = readFileSync(join(here, '..', 'lib', 'client.js'), 'utf8');

const HOME = 'C:\\Users\\PC';
const CWD = 'C:\\Users\\PC\\Documents\\deepseek-harness\\default-workspace';
const PLAYGROUND = 'C:\\Users\\PC\\Documents\\Playground';
const OTHER = `${PLAYGROUND}\\other`;

//#region DOM stub
class FakeElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parent = null;
    this.hidden = false;
    this.style = {};
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.isConnected = true;
    this.rect = { left: 0, top: 0, width: 0, height: 0 };
    this.attributes = {};
    this.listeners = new Map();
  }
  append(...nodes) {
    for (const node of nodes) {
      node.parent = this;
      this.children.push(node);
    }
  }
  appendChild(node) {
    this.append(node);
    return node;
  }
  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }
  remove() {
    if (this.parent === null) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
    this.isConnected = false;
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== listener));
  }
  click() {
    for (const listener of this.listeners.get('click') ?? []) listener({ stopPropagation() {} });
  }
  getBoundingClientRect() {
    return { ...this.rect, right: this.rect.left + this.rect.width, bottom: this.rect.top + this.rect.height };
  }
  contains(node) {
    if (node === this) return true;
    return this.children.some((child) => child.contains(node));
  }
  querySelectorAll() {
    return [];
  }
}

const slotAnchors = new Map();
const document = {
  head: new FakeElement('head'),
  body: new FakeElement('body'),
  createElement: (tag) => new FakeElement(tag),
  querySelector(selector) {
    const styleMatch = /^style\[data-plugin-css="(.*)"\]$/.exec(selector);
    if (styleMatch !== null) return document.head.children.find((el) => el.dataset.pluginCss === styleMatch[1]) ?? null;
    const slotMatch = /^\[data-slot="(.*)"\]$/.exec(selector);
    if (slotMatch !== null) return slotAnchors.get(slotMatch[1]) ?? null;
    return null;
  },
};

const windowListeners = new Map();
const window = {
  innerWidth: 1400,
  innerHeight: 900,
  addEventListener(type, listener) {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(listener);
  },
  removeEventListener(type, listener) {
    windowListeners.set(type, (windowListeners.get(type) ?? []).filter((entry) => entry !== listener));
  },
  dispatchEvent(event) {
    for (const listener of [...(windowListeners.get(event.type) ?? [])]) listener(event);
    return true;
  },
  setTimeout,
  clearTimeout,
};

class FakeEvent {
  constructor(type) {
    this.type = type;
  }
}

globalThis.window = window;
globalThis.document = document;
globalThis.Element = FakeElement;
globalThis.Node = FakeElement;
globalThis.Event = FakeEvent;
//#endregion

//#region host fixtures
const directoryTree = new Map([
  [HOME, ['Documents', 'Desktop', 'Downloads']],
  ['C:\\Users\\PC\\Documents', ['deepseek-harness', 'Playground']],
  ['C:\\Users\\PC\\Documents\\deepseek-harness', ['default-workspace', 'plugins']],
  [CWD, []],
  [PLAYGROUND, ['demo', 'other']],
  [OTHER, []],
  ['C:\\Users\\PC\\Desktop', []],
  ['C:\\Users\\PC\\Downloads', []],
  ['C:\\', ['Users']],
  ['C:\\Users', ['PC']],
  ['D:\\', ['projects']],
  ['D:\\projects', ['demo']],
]);

const childEntries = (path) => (directoryTree.get(path) ?? []).map((name) => ({
  name,
  path: `${path.replace(/[\\/]+$/, '')}\\${name}`,
  hidden: false,
}));
//#endregion

//#region context fixture
function makeContext({ bridge, pickerPresent = true, listingsUnavailable = false, hostPick = { kind: 'path', path: 'C:\\Users\\PC\\Picked\\chosen' } } = {}) {
  const created = [];
  const opened = [];
  const invoked = [];
  const listings = [];
  const picks = [];
  const disposers = [];
  if (bridge !== undefined) globalThis.__DSH_HOST_PATHS__ = bridge;
  else delete globalThis.__DSH_HOST_PATHS__;

  const ctx = {
    created,
    opened,
    invoked,
    listings,
    picks,
    workspaces: {
      list: {
        getSnapshot: () => ({
          items: [
            { workspaceId: 'ws-cwd', path: CWD },
            { workspaceId: 'ws-play', path: PLAYGROUND },
          ],
        }),
      },
      async create(input) {
        created.push(input);
        return { workspaceId: `ws-${created.length}`, path: input.path };
      },
    },
    uiWorkspace: {
      async openWorkspace(id) {
        opened.push(id);
      },
      async pickDirectory() {
        picks.push(hostPick.kind);
        if (hostPick.delayMs !== undefined) await new Promise((resolve) => setTimeout(resolve, hostPick.delayMs));
        if (hostPick.kind === 'throw') throw new Error('directoryPicker.pick needs the "pick" capability');
        if (hostPick.kind === 'cancel') return null;
        return hostPick.path;
      },
      async listDirectory(path) {
        const target = path === undefined ? HOME : path;
        listings.push(target);
        if (listingsUnavailable) {
          const error = new Error('directory browse failed: directory-picker/unavailable');
          error.rpcError = { code: 'directory-picker/unavailable', message: 'the composed picker serves "pick"' };
          throw error;
        }
        if (!directoryTree.has(target)) throw new Error(`directory-unreadable: ${target}`);
        return {
          path: target,
          entries: childEntries(target),
          home: HOME,
          crumbs: [],
          truncated: false,
        };
      },
    },
    locale: {
      dictionaries: new Map(),
      register(ns, dicts) {
        this.dictionaries.set(ns, dicts);
      },
      bind(ns) {
        return (key, params = {}) => {
          const value = this.dictionaries.get(ns)?.en?.[key] ?? key;
          return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
        };
      },
    },
    get(name) {
      if (name === 'sessions') {
        return {
          list: {
            getSnapshot: () => ({
              byId: { s1: { id: 's1', cwd: CWD, retainedBy: { mainView: 1 } } },
            }),
          },
        };
      }
      if (name === 'slots') return { entries: () => (pickerPresent ? [{ id: 'picker' }] : []) };
      if (name === 'shortcuts') return { invoke: (id, context) => invoked.push({ id, context }) };
      return undefined;
    },
    effect(factory) {
      const dispose = factory();
      disposers.push(() => dispose?.());
      return () => {};
    },
    disposeAll() {
      for (const dispose of disposers.splice(0)) dispose();
    },
  };
  return ctx;
}
//#endregion

//#region bundle + events
/**
 * Load one fresh instance of the bundle. A page has exactly one composition, so
 * the capability sample memoizes per module scope — a second composition needs a
 * second scope, exactly as a second page load would give it.
 */
function loadPlugin() {
  let loaded = null;
  globalThis.window.__ModuleLoader__ = {
    load(definition) {
      loaded = definition.factory(() => {
        throw new Error('this bundle must not require anything');
      });
    },
  };
  new Function('window', 'document', 'Element', 'Node', bundle)(window, document, FakeElement, FakeElement);
  return loaded;
}

const plugin = loadPlugin();

let mountedRegions = [];
/**
 * Mount one region outlet: the anchor is `display:contents` (no box) and its
 * children are the laid-out header and list, exactly as the real browser outlet
 * nests them.
 */
function makeRegion() {
  for (const element of mountedRegions) element.isConnected = false;
  mountedRegions = [];
  slotAnchors.clear();
  const anchor = new FakeElement('div');
  anchor.dataset.slot = 'sidebar.workspaces';
  anchor.rect = { left: 0, top: 0, width: 0, height: 0 };
  const header = new FakeElement('div');
  header.rect = { left: 0, top: 100, width: 260, height: 32 };
  const list = new FakeElement('div');
  list.rect = { left: 0, top: 132, width: 260, height: 468 };
  const row = new FakeElement('div');
  row.rect = { left: 8, top: 140, width: 240, height: 28 };
  list.append(row);
  anchor.append(header, list);
  slotAnchors.set('sidebar.workspaces', anchor);
  mountedRegions = [anchor, header, list, row];
  return { anchor, header, list, row };
}

function transfer({ entries = [], names = [], files = names.map((name) => ({ name, path: `C:\\Users\\PC\\Projects\\${name}` })), text = '' } = {}) {
  return {
    types: ['Files'],
    files,
    items: entries.map(() => ({ kind: 'file' })),
    getData: () => text,
  };
}

/** A drag whose entries are readable directories. */
function folderDrag(names = ['demo']) {
  const files = names.map((name) => ({ name, path: `C:\\Users\\PC\\Projects\\${name}` }));
  return {
    types: ['Files'],
    files,
    items: names.map((name) => ({ kind: 'file', webkitGetAsEntry: () => ({ isDirectory: true, name }) })),
    getData: () => '',
  };
}

/** A drag whose entries are readable files. */
function fileDrag(names = ['notes.txt']) {
  const files = names.map((name) => ({ name, path: `C:\\Users\\PC\\${name}` }));
  return {
    types: ['Files'],
    files,
    items: names.map((name) => ({ kind: 'file', webkitGetAsEntry: () => ({ isDirectory: false, name }) })),
    getData: () => '',
  };
}

/**
 * A protected drag: the browser names the members but reveals neither the file
 * list nor the entry objects until the drop, and this browser never reveals the
 * entries at all.
 */
function opaqueDrag(names = ['demo'], { files = [] } = {}) {
  return {
    types: ['Files'],
    files,
    items: names.map(() => ({ kind: 'file', webkitGetAsEntry: () => null })),
    getData: () => '',
  };
}

function uriDrag(text, name = 'other') {
  const drag = folderDrag([name]);
  drag.getData = (type) => (type === 'text/uri-list' ? text : '');
  return drag;
}

function event(type, target, dataTransfer) {
  const state = { prevented: false, stopped: false };
  return {
    type,
    target,
    dataTransfer,
    clientX: 100,
    clientY: 300,
    preventDefault() {
      state.prevented = true;
    },
    stopPropagation() {
      state.stopped = true;
    },
    get prevented() {
      return state.prevented;
    },
    get stopped() {
      return state.stopped;
    },
  };
}

const dispatch = (type, target, dataTransfer) => {
  const payload = event(type, target, dataTransfer);
  for (const listener of windowListeners.get(type) ?? []) listener(payload);
  return payload;
};

const settle = async (rounds = 8) => {
  for (let index = 0; index < rounds; index += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

const surfaceOf = (className) => document.body.children.find((el) => el.className === className);
const overlayOf = () => surfaceOf('dshwfd_overlay');
const toastOf = () => surfaceOf('dshwfd_toast');
const panelOf = () => surfaceOf('dshwfd_panel');
const overlayDetail = () => overlayOf()?.children[0]?.children[1]?.textContent ?? '';
const panelOptionLabels = () => (panelOf()?.children.find((child) => child.className === 'dshwfd_options')?.children ?? []).map((button) => button.textContent);
const panelAction = (label) => panelOf()?.children.find((child) => child.className === 'dshwfd_actions')?.children.find((button) => button.textContent === label);
//#endregion

//#region assertions
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  — ${detail}`}`);
};
//#endregion

const desktopBridge = { pathFor: (file) => file.path };

// ---------------------------------------------------------------- desktop lane
{
  const region = makeRegion();
  const ctx = makeContext({ bridge: desktopBridge });
  plugin.apply(ctx);
  check('bundle exports an inject list', Array.isArray(plugin.inject) && plugin.inject.includes('workspaces'), JSON.stringify(plugin.inject));
  check('styles installed', document.head.children.some((el) => el.dataset.pluginCss !== undefined));

  // a folder the browser identifies: straight to the bridge path
  const overHeader = dispatch('dragover', region.header, folderDrag());
  check('desktop: a folder hovering the header is claimed', overHeader.prevented && overHeader.stopped);
  const overRow = dispatch('dragover', region.row, folderDrag());
  check('desktop: a folder over a row is claimed too', overRow.prevented && overRow.stopped);
  check('desktop: invitation is pinned to the whole region', overlayOf().style.top === '100px' && overlayOf().style.height === '500px', `${overlayOf().style.top} ${overlayOf().style.height}`);
  check('desktop: invitation names the folder', overlayDetail() === 'Folder: demo', overlayDetail());
  const outside = dispatch('dragover', document.body, folderDrag());
  check('desktop: a hover outside the region is untouched', !outside.prevented && !outside.stopped);
  check('desktop: invitation hides outside the region', overlayOf().hidden === true);
  const drop = dispatch('drop', region.list, folderDrag());
  await settle();
  check('desktop: the folder drop is claimed', drop.prevented && drop.stopped);
  check('desktop: workspace created from the bridge path', ctx.created.length === 1 && ctx.created[0].path === 'C:\\Users\\PC\\Projects\\demo', JSON.stringify(ctx.created));
  check('desktop: the new workspace is opened', ctx.opened.length === 1 && ctx.opened[0] === 'ws-1', JSON.stringify(ctx.opened));
  check('desktop: no listing was needed', ctx.listings.length === 0, JSON.stringify(ctx.listings));

  // the regression case reported from the browser: entries never resolve
  ctx.created.length = 0;
  ctx.opened.length = 0;
  const protectedHover = dispatch('dragover', region.list, opaqueDrag());
  check('desktop: an opaque folder hover is claimed', protectedHover.prevented && protectedHover.stopped);
  check('desktop: the nameless opaque invitation names the bridge path', overlayDetail() === 'Drop to create a workspace from the dropped path', overlayDetail());
  const namedOpaque = dispatch('dragover', region.row, opaqueDrag(['demo'], { files: [{ name: 'demo', path: 'C:\\Users\\PC\\Projects\\demo' }] }));
  check('desktop: a named opaque drag names the bridge path', namedOpaque.prevented && overlayDetail() === 'Drop to create a workspace from the dropped path: demo', overlayDetail());
  const protectedDrop = dispatch('drop', region.list, opaqueDrag(['demo'], { files: [{ name: 'demo', path: 'C:\\Users\\PC\\Projects\\demo' }] }));
  await settle();
  check('desktop: an opaque drop is claimed', protectedDrop.prevented && protectedDrop.stopped);
  check('desktop: an opaque drop still resolves the real path', ctx.created.length === 1 && ctx.created[0].path === 'C:\\Users\\PC\\Projects\\demo', JSON.stringify(ctx.created));

  // ordinary files stay with the composer
  ctx.created.length = 0;
  const fileHover = dispatch('dragover', region.list, fileDrag());
  const fileDrop = dispatch('drop', region.list, fileDrag());
  await settle();
  check('desktop: a file drag is not claimed', !fileHover.prevented && !fileDrop.prevented && !fileDrop.stopped);
  check('desktop: a file drag creates no workspace', ctx.created.length === 0);

  // a mixed drag keeps its shipped meaning
  const mixedFiles = [{ name: 'demo', path: 'C:\\Users\\PC\\Projects\\demo' }, { name: 'a.txt', path: 'C:\\Users\\PC\\a.txt' }];
  const mixed = {
    types: ['Files'],
    files: mixedFiles,
    items: [
      { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: true, name: 'demo' }) },
      { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: false, name: 'a.txt' }) },
    ],
    getData: () => '',
  };
  const mixedHover = dispatch('dragover', region.list, mixed);
  const mixedDrop = dispatch('drop', region.list, mixed);
  await settle();
  check('desktop: a mixed drag is not claimed', !mixedHover.prevented && !mixedDrop.prevented && ctx.created.length === 0);

  // a drag that carries no files at all is none of our business
  const empty = dispatch('dragover', region.list, { types: ['text/plain'], files: [], items: [], getData: () => '' });
  check('desktop: a non-file drag is ignored', !empty.prevented);

  ctx.disposeAll();
  check('desktop: dispose removes the surfaces', overlayOf() === undefined && toastOf() === undefined && panelOf() === undefined);
}

// -------------------------------------------------------------------- web lane
{
  const region = makeRegion();
  const ctx = makeContext({ bridge: undefined });
  plugin.apply(ctx);
  await settle();
  check('web: the browsing capability is sampled on mount', ctx.listings.length === 1 && ctx.listings[0] === HOME, JSON.stringify(ctx.listings));
  ctx.listings.length = 0;

  const drop = dispatch('drop', region.list, folderDrag());
  await settle();
  check('web: the folder drop is claimed', drop.prevented && drop.stopped);
  check('web: the unique match is adopted', ctx.created.length === 1 && ctx.created[0].path === `${PLAYGROUND}\\demo`, JSON.stringify(ctx.created));
  check('web: search stayed inside the cheap ranks', ctx.listings.every((path) => path === CWD || path.startsWith('C:\\Users\\PC\\Documents')), JSON.stringify(ctx.listings));
  check('web: success notice shown', toastOf().hidden === false && toastOf().textContent === 'Workspace created: demo', toastOf().textContent);

  // the browser never reveals the entries: the drop must still resolve by name
  ctx.created.length = 0;
  ctx.opened.length = 0;
  ctx.listings.length = 0;
  const opaque = dispatch('drop', region.list, opaqueDrag(['demo'], { files: [{ name: 'demo', path: 'C:\\Users\\PC\\Projects\\demo' }] }));
  await settle();
  check('web: an opaque drop is claimed', opaque.prevented && opaque.stopped);
  check('web: an opaque drop resolves by name', ctx.created.length === 1 && ctx.created[0].path === `${PLAYGROUND}\\demo`, JSON.stringify(ctx.created));

  // a name that exists twice in the same rank
  ctx.created.length = 0;
  directoryTree.set('C:\\Users\\PC\\Documents', ['deepseek-harness', 'Playground', 'demo']);
  dispatch('drop', region.list, folderDrag());
  await settle();
  check('web: ambiguity opens the resolution panel', panelOf().hidden === false, JSON.stringify(panelOptionLabels()));
  check('web: both candidates are offered', panelOptionLabels().length === 2, JSON.stringify(panelOptionLabels()));
  panelOf().children.find((child) => child.className === 'dshwfd_options').children[0].click();
  await settle();
  check('web: the chosen candidate is adopted', ctx.created.length === 1 && ctx.created[0].path === `${PLAYGROUND}\\demo`, JSON.stringify(ctx.created));
  check('web: the panel closes after the choice', panelOf().hidden === true);
  directoryTree.set('C:\\Users\\PC\\Documents', ['deepseek-harness', 'Playground']);

  // a dragboard path short-circuits everything
  ctx.created.length = 0;
  ctx.listings.length = 0;
  dispatch('drop', region.list, uriDrag('file:///C:/Users/PC/Documents/Playground/other'));
  await settle();
  check('web: a dragboard file URL is adopted directly', ctx.created.length === 1 && ctx.created[0].path === OTHER, JSON.stringify(ctx.created));
  check('web: a dragboard path needs no listing', ctx.listings.length === 0, JSON.stringify(ctx.listings));

  // nothing found anywhere: hand over to the shipped picker
  ctx.created.length = 0;
  dispatch('drop', region.list, folderDrag(['missing']));
  await settle(30);
  check('web: an unfound folder offers the picker', panelOf().hidden === false);
  check('web: the panel explains the browser limit', panelOf().children[1].className === 'dshwfd_hint');
  panelAction('Choose a folder…').click();
  await settle();
  check('web: the picker action invokes the shipped command', ctx.invoked.length === 1 && ctx.invoked[0].id === 'workspace.add', JSON.stringify(ctx.invoked));
  check('web: nothing was adopted behind the picker', ctx.created.length === 0);

  // a deployment without any picker says so instead of invoking a dead command
  const bare = makeContext({ bridge: undefined, pickerPresent: false });
  ctx.disposeAll();
  plugin.apply(bare);
  dispatch('drop', region.list, folderDrag(['missing']));
  await settle(30);
  panelAction('Choose a folder…').click();
  await settle();
  check('web: no composed picker reports instead of invoking', bare.invoked.length === 0 && toastOf().textContent.includes('Add workspace'), toastOf().textContent);
  bare.disposeAll();
}

// ------------------------------------------------- native picker (web profile)
// The composition this deployment runs: the OS-chooser backend serves no
// listing capability, so a browser drop cannot be located by name at all and
// the host has to be asked for a path directly.
{
  const region = makeRegion();
  const ctx = makeContext({
    bridge: undefined,
    listingsUnavailable: true,
    hostPick: { kind: 'path', path: 'C:\\Users\\PC\\Picked\\chosen', delayMs: 5 },
  });
  const fresh = loadPlugin();
  fresh.apply(ctx);
  await settle();
  check('native: the refused listing is sampled once', ctx.listings.length === 1, JSON.stringify(ctx.listings));

  // the drag invitation stops the composer's own full-screen invitation
  const enter = dispatch('dragenter', region.list, folderDrag());
  check('native: entering the region claims the drag', enter.prevented && enter.stopped);
  const fileEnter = dispatch('dragenter', region.list, fileDrag());
  check('native: a file drag still reaches the intake', !fileEnter.prevented);
  dispatch('dragover', region.list, folderDrag());
  check('native: invitation announces the chooser', overlayDetail() === 'Folder: demo (the folder chooser will open)', overlayDetail());

  // a claimed drop must release the document-level drag state it suppressed
  let released = 0;
  const shippedReset = () => {
    released += 1;
  };
  window.addEventListener('dragend', shippedReset);
  const drop = dispatch('drop', region.list, folderDrag());
  await settle(1);
  check('native: the drop is claimed', drop.prevented && drop.stopped);
  check('native: the suppressed intake is released', released === 1, String(released));
  check('native: the notice explains the handover', toastOf().textContent === 'A browser never hands the page the dropped folder\'s path, so the folder chooser opened instead', toastOf().textContent);
  window.removeEventListener('dragend', shippedReset);

  await settle(20);
  check('native: the host chooser is asked directly', ctx.picks.length === 1, JSON.stringify(ctx.picks));
  check('native: the chosen path becomes the workspace', ctx.created.length === 1 && ctx.created[0].path === 'C:\\Users\\PC\\Picked\\chosen', JSON.stringify(ctx.created));
  check('native: the chosen workspace is opened', ctx.opened.length === 1, JSON.stringify(ctx.opened));
  check('native: the shipped command is not needed', ctx.invoked.length === 0, JSON.stringify(ctx.invoked));
  check('native: the outcome is reported', toastOf().textContent === 'Workspace created: demo', toastOf().textContent);
  check('native: no name search ran', ctx.listings.length === 1, JSON.stringify(ctx.listings));

  // an opaque drag in this composition takes the same handover
  ctx.created.length = 0;
  ctx.picks.length = 0;
  const opaqueDrop = dispatch('drop', region.list, opaqueDrag(['demo'], { files: [{ name: 'demo' }] }));
  await settle(20);
  check('native: an opaque drop asks the host too', opaqueDrop.prevented && ctx.picks.length === 1 && ctx.created.length === 1, JSON.stringify(ctx.picks));

  // cancelling the operating-system chooser imports nothing
  ctx.created.length = 0;
  const cancelling = makeContext({ bridge: undefined, listingsUnavailable: true, hostPick: { kind: 'cancel' } });
  ctx.disposeAll();
  fresh.apply(cancelling);
  await settle();
  dispatch('drop', region.list, folderDrag());
  await settle(20);
  check('native: a cancelled chooser imports nothing', cancelling.picks.length === 1 && cancelling.created.length === 0, JSON.stringify(cancelling.created));

  // a seam that refuses the chooser still reaches the shipped flow
  const refusing = makeContext({ bridge: undefined, listingsUnavailable: true, hostPick: { kind: 'throw' } });
  cancelling.disposeAll();
  fresh.apply(refusing);
  await settle();
  dispatch('drop', region.list, folderDrag());
  await settle(20);
  check('native: a refused chooser falls back to the shipped flow', refusing.invoked.length === 1 && refusing.invoked[0].id === 'workspace.add', JSON.stringify(refusing.invoked));
  refusing.disposeAll();
}

// --------------------------------------------------- host locate route (web)
// The deployment the user runs: the composed picker serves the OS chooser and no
// listing, so the plugin's own Host half answers the name instead.
{
  const region = makeRegion();
  const ctx = makeContext({
    bridge: undefined,
    listingsUnavailable: true,
    hostPick: { kind: 'path', path: 'C:\\Users\\PC\\Picked\\fallback', delayMs: 5 },
  });
  const fresh = loadPlugin();
  const calls = [];
  const jsonResponse = (payload) => ({ ok: true, json: async () => payload });
  const candidate = (path, root, exact = true) => ({ path, root, exact, depth: 1 });
  globalThis.location = { protocol: 'http:' };
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    if (body.name === 'demo') return jsonResponse({ candidates: [candidate(`${PLAYGROUND}\\demo`, 0)], truncated: false, visited: 12 });
    if (body.name === 'twin') return jsonResponse({ candidates: [candidate('C:\\a\\twin', 0), candidate('C:\\b\\twin', 0)], truncated: false, visited: 4 });
    if (body.name === 'ranked') return jsonResponse({ candidates: [candidate('C:\\far\\ranked', 1), candidate(`${PLAYGROUND}\\ranked`, 0)], truncated: false, visited: 4 });
    return jsonResponse({ candidates: [], truncated: false, visited: 9 });
  };
  fresh.apply(ctx);
  await settle();

  dispatch('drop', region.list, folderDrag(['demo']));
  await settle(20);
  check('route: the located path becomes the workspace', ctx.created.length === 1 && ctx.created[0].path === `${PLAYGROUND}\\demo`, JSON.stringify(ctx.created));
  check('route: the request carries this page\'s seeds', calls.length === 1 && calls[0].url === '/workspace-folder-drop/locate' && calls[0].body.seeds.includes(CWD) && calls[0].body.home === true, JSON.stringify(calls[0]?.body));
  check('route: the chooser is not needed', ctx.picks.length === 0, JSON.stringify(ctx.picks));

  ctx.created.length = 0;
  dispatch('drop', region.list, folderDrag(['twin']));
  await settle(20);
  check('route: two candidates open the choice surface', panelOf().hidden === false && panelOptionLabels().length === 2, JSON.stringify(panelOptionLabels()));
  check('route: nothing is adopted while the choice is open', ctx.created.length === 0);

  panelAction('Cancel').click();
  ctx.created.length = 0;
  dispatch('drop', region.list, folderDrag(['ranked']));
  await settle(20);
  check('route: the nearest seed rank wins', ctx.created.length === 1 && ctx.created[0].path === `${PLAYGROUND}\\ranked`, JSON.stringify(ctx.created));

  ctx.created.length = 0;
  ctx.picks.length = 0;
  dispatch('drop', region.list, folderDrag(['nothing-anywhere']));
  await settle(20);
  check('route: a miss hands over to the chooser', ctx.picks.length === 1 && ctx.created.length === 1 && ctx.created[0].path === 'C:\\Users\\PC\\Picked\\fallback', JSON.stringify(ctx.created));

  // a Host that cannot answer leaves the order below it intact
  const offlineCalls = [];
  globalThis.fetch = async () => {
    offlineCalls.push(1);
    throw new Error('offline');
  };
  ctx.created.length = 0;
  ctx.picks.length = 0;
  dispatch('drop', region.list, folderDrag(['demo']));
  await settle(20);
  check('route: an unreachable Host still ends at the chooser', offlineCalls.length === 1 && ctx.picks.length === 1, JSON.stringify(ctx.picks));

  // a document that is not served over http never asks
  globalThis.location = { protocol: 'dsh-app:' };
  ctx.picks.length = 0;
  offlineCalls.length = 0;
  const handled = dispatch('drop', region.list, folderDrag(['demo']));
  await settle(20);
  check('route: a non-http document asks nothing', offlineCalls.length === 0 && handled.prevented, JSON.stringify(offlineCalls));

  delete globalThis.location;
  delete globalThis.fetch;
  ctx.disposeAll();
}

const failures = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
process.exit(failures.length === 0 ? 0 : 1);
