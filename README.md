# dsh-workspace-folder-drop

Dropping a folder from the operating system's file manager onto the sidebar's
**Workspaces** region registers that folder as a Workspace and opens it, instead
of attaching a folder reference to the conversation that happens to be open.

The shipped client already treats every operating-system file drag as composer
intake: `@deepseek-ai/dsh-client-ui-attachment` installs a document-level `drop`
handler that hands the payload to `@deepseek-ai/dsh-client-ui-conversation`,
which turns a dropped directory into a `reference` attachment in the current
draft. That is why dropping a folder on the left column felt reversed — the
gesture belongs to the Workspaces region it was dropped on, not to the composer.

## What it changes

- A drag that can still become a workspace, hovering the Workspaces region, is
  claimed by this plugin in the **capture** phase, so the composer intake never
  sees the drop. The region is the outlet's whole subtree, so the header, the
  rows and the empty space below them all count.
- The region shows a dashed brand-colored invitation naming the folder and what
  the drop will do.
- On drop, every folder is adopted through `ctx.workspaces.create({ path })`
  (idempotent: an already registered path resolves to its existing Workspace)
  and the first one is opened through `ctx.uiWorkspace.openWorkspace(id)`, the
  same path the sidebar's own **Add workspace…** action takes.
- A short notice reports the outcome; a failure is reported instead of being
  swallowed.
- Everything else is untouched: a folder dropped on the conversation area, a
  drag that resolved to plain files, a mixed drag, a non-file drag, and a
  document whose `file:` dragboard URL points at something that is not a
  directory.

### What the browser reveals about a drag

`DataTransferItem.webkitGetAsEntry()` is the only way to tell a dropped folder
from a dropped empty file, and **a protected drag withholds it** — and, in some
browsers, the file list too — until the drop; some browsers never answer it.
The plugin therefore reads a drag as one of four verdicts and never asks for
proof it may not get:

| Verdict | Claimed | Why |
|---|---|---|
| `folders` | yes | Every member answered as a directory. |
| `unknown` | yes | Nothing answered: the drop is treated as a folder, which is what a workspace region is for. |
| `files` | no | Every member answered as a file; the composer keeps the gesture. |
| `mixed` / `none` | no | Ambiguous or not a file drag at all. |

An unidentifiable drag says so in its invitation before the drop
("the drag could not be identified … the drop will be treated as a folder") when
no Desktop path bridge is present. With the bridge, the invitation names the
dropped path and says the workspace will be created from it. Either way the
gesture is never silently reinterpreted.

### Leaving the composer's own drag state alone

The shipped intake drives a full-screen "drop files here" invitation from
document-level `dragenter`/`drop` handlers and resets it **from that drop
handler**. A claimed drop suppresses the handler, and an operating-system drag
fires no `dragend` of its own, so the plugin takes the gesture away from the
intake on `dragenter` (the invitation never appears for a drag it is about to
own) and dispatches one synthetic `dragend` when it claims a drop, so a
suppressed intake cannot leave its overlay stuck over the page.

## The lanes a drop falls through

Where the folder's absolute path comes from depends entirely on the document, so
the plugin tries each source in the order of how much it knows and stops at the
first that answers:

| # | Source | When it answers | Result |
|---|---|---|---|
| 1 | **Desktop path bridge** | `window.__DSH_HOST_PATHS__` exists (`dsh-app://app`) | The exact path, straight from `webUtils.getPathForFile`. No guessing and no reliance on the entry API. |
| 2 | **Dragboard path** | The file manager also published a `file:` URL or an absolute path on the dragboard | That path is adopted; the workspace create is what checks it. |
| 3 | **This package's Host half** | A browser-facing Host over http(s) | The Host walks the open project, its parent, every registered workspace and each one's parent (plus the account's home) for that folder name and answers its candidates. See below. |
| 4 | **Host directory listings** | The composed picker serves the `browse` capability | The same name search, driven by the client over `ctx.uiWorkspace.listDirectory`. |
| 5 | **Operating-system chooser** | Always, as the last resort | `ctx.uiWorkspace.pickDirectory()` opens the host's folder chooser and the returned path is registered. The shipped **Add workspace…** command is only the fallback for that call. |

A browser never hands a page a dropped folder's path, which is why steps 3–5
exist at all. The chooser's own starting folder **cannot be set**: the picker
seam's `pick` takes only an abort signal (`@Remote('pick') async pick(signal)`,
no start path), so it opens wherever the operating system last left it. The
mitigation is to need it less often, which steps 1–4 do.

### The Host locate route

`lib/index.js` registers one exact route, `POST /workspace-folder-drop/locate`. It
takes a folder name and a bounded list of absolute seeds, and walks
breadth-first — so every shallow level completes before a deeper one starts —
returning candidate directories with their seed index, depth, and whether the
name matched exactly. The browser half owns the policy (nearest seed rank first,
then an exact name, then one path or a choice); the Host owns only the walk.

Bounds: 3 levels below each seed, 4 000 directories, 2 seconds, 20 candidates,
64 seeds, a 64 KiB body, and a skip list for build output, version-control
metadata and operating-system trees. A GET, a malformed body, or a name
containing a separator is refused with 405/400; an unauthenticated or
foreign-authority request is refused with 401/403.

This route is the one place where the plugin widens what the page may ask the
Host: it makes named directories discoverable under seeds the page names. That is
narrower than the `browse` picker composition (which exposes direct listing), but
it is wider than a native-chooser composition's intent. Before reading the name or
seeds, the route applies the application's own Host/Origin fence and signed
browser-session check through `ctx.connection.requestRejection`; an unauthenticated
or foreign-authority request receives 401/403 and the browser falls through to the
next lane. Removing the host half's `apply` body restores the chooser-only behavior.

### Locating by name over listings

Step 4 ranks its seeds closest-first and stops at the first rank that matches,
so a sibling folder never competes with a same-named one elsewhere: the open
project and its parent, every registered workspace and each one's parent, the
account's home two levels down, then the drive roots (Windows) or `/`. It is
bounded — 48 listings, 4 in flight, 8 seconds.

An exact name outranks a case-insensitive one, so `Demo` never answers a drop of
`demo` while `demo` exists. One match is adopted silently; several open a small
choice surface; none opens the same surface with a single **Choose a folder…**
action.

## Package shape

| Face | File | Role |
|---|---|---|
| Host half | `lib/index.js` | Registers the locate route, and nothing when the Host composes no HTTP server. |
| Browser half | `lib/client.js` | Hand-written `window.__ModuleLoader__.load({ id, factory })` bundle. It requires nothing, so it needs no build step and no `dsh.client.external` entry. |
| Bundle layer | `cordis.patch.yml` | Inserts the `workspace-folder-drop` entry. |

`package.json` declares `dsh.bundle.patch` so the profile's plugin manager can
install the folder as a bundle, and `dsh.client.platform: "web"` so the host
serves `lib/client.js` under `/plugins`.

## Test

`test/client.test.mjs` loads the real browser bundle against a minimal DOM stub
and drives the drag events a folder drop produces — every verdict, every lane,
the claimed drop, the untouched file drag, the mixed drag, a dragboard `file:`
URL, the locate route's unique, ambiguous, ranked, missing and unreachable
answers, and both picker compositions:

```
node test/client.test.mjs
```

`test/host.test.mjs` loads the real node half, captures the route it registers,
and drives it against a real temporary directory tree — depth cap, skip list,
exact versus case-insensitive matches, seed order, and every refusal:

```
node test/host.test.mjs
```

## Install

Per profile. The Desktop application runs the `desktop` profile and `dsh web`
runs its own (`web` by default), so each needs its own installation:

```
dsh plugin --profile desktop install <path-to-this-folder>
dsh plugin --profile web install <path-to-this-folder>
```

or, from a session, the `plugin_manager` tool with
`action: install_bundle, target: <path-to-this-folder>` — it always acts on the
session's own profile. Live profiles recompose immediately; a startup-only
profile needs a restart. After installation the entry appears in **Plugins** as
`dsh-workspace-folder-drop` and can be switched off there without uninstalling
it.

### Which half needs what

- **Browser half** (`lib/client.js`): served per request and versioned by file
  metadata, so a change arrives on a page refresh.
- **Host half** (`lib/index.js`): imported once per process, so a change — the
  locate route included — needs a **restart of the host** (`dsh web` or the
  Desktop application). Until then the plugin behaves as it did before the
  change, falling through to the next lane.

## Remove

`plugin_manager` → `remove_bundle` with the package name, or
`dsh plugin --profile <profile> remove dsh-workspace-folder-drop`.
