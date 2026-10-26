//#region lib/types/host/paths.js
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
//#endregion

//#region lib/types/host/locate-route.js
/**
 * Sidebar folder-drop plugin, node half.
 *
 * A browser page is never handed a dropped folder's path, and a deployment whose
 * composed directory picker serves the operating-system chooser answers no
 * directory listing either — so the only thing that can turn "the user dropped a
 * folder named X" into a path is this process, which can read the filesystem.
 * This half answers exactly that question over one same-origin route and nothing
 * else: a name and a bounded list of seeds in, candidate directories out. The
 * browser half owns what to do with them.
 *
 * @module dsh-workspace-folder-drop
 */
/** Route the browser half posts a folder name to. */
export const LOCATE_PATH = "/workspace-folder-drop/locate";
/** Directory levels walked below each seed. */
const MAX_DEPTH = 3;
/** Directories visited per request, so one drop can never walk a whole disk. */
const MAX_DIRECTORIES = 4000;
/** Wall-clock bound on one request, in milliseconds. */
const TIME_BUDGET_MS = 2000;
/** Candidates one response may carry. */
const MAX_CANDIDATES = 20;
/** Bound on one request body, in bytes. */
const MAX_BODY_BYTES = 64 * 1024;
/**
 * Directory names never worth walking: build output, version-control metadata,
 * and operating-system trees that never hold a project the user would drop.
 */
const SKIP_NAMES = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	".hg",
	".svn",
	"$RECYCLE.BIN",
	"System Volume Information",
	"AppData",
	"ProgramData",
	"Program Files",
	"Program Files (x86)",
	"Windows"
]);

/**
 * Read one directory level's child directories. A directory that cannot be read —
 * permissions, a vanished entry, a file where a directory was expected — is an
 * empty level rather than a failed request.
 * @param path - absolute directory path.
 * @returns the child directory names, noise excluded.
 */
async function childDirectories(path) {
	try {
		const entries = await readdir(path, { withFileTypes: true });
		const names = [];
		for (const entry of entries) {
			if (!entry.isDirectory() || SKIP_NAMES.has(entry.name)) continue;
			names.push(entry.name);
		}
		return names;
	} catch {
		return [];
	}
}

/**
 * Walk the seeds breadth-first for directories carrying one name. Breadth-first
 * order is what makes the budget safe: every shallow level completes before a
 * deeper one starts, so a cut search still holds the nearest candidates.
 * @param name - the directory name to find.
 * @param seeds - absolute directories to search, in the caller's priority order.
 * @returns candidates with their seed index and depth, plus the walk's own tally.
 */
async function locate(name, seeds) {
	const wanted = name.toLocaleLowerCase();
	const seen = /* @__PURE__ */ new Set();
	const queue = [];
	for (let index = 0; index < seeds.length; index += 1) {
		const seed = seeds[index];
		if (typeof seed !== "string" || seed === "" || !isAbsolute(seed) || seen.has(seed)) continue;
		seen.add(seed);
		queue.push({
			path: seed,
			depth: 0,
			root: index
		});
	}
	const candidates = [];
	const deadline = Date.now() + TIME_BUDGET_MS;
	let visited = 0;
	let truncated = false;
	while (queue.length > 0) {
		if (visited >= MAX_DIRECTORIES || Date.now() > deadline) {
			truncated = true;
			break;
		}
		const current = queue.shift();
		visited += 1;
		for (const child of await childDirectories(current.path)) {
			const path = join(current.path, child);
			if (child.toLocaleLowerCase() === wanted) {
				if (candidates.length >= MAX_CANDIDATES) truncated = true;
				else candidates.push({
					path,
					depth: current.depth + 1,
					root: current.root,
					exact: child === name
				});
			}
			if (current.depth + 1 < MAX_DEPTH) queue.push({
				path,
				depth: current.depth + 1,
				root: current.root
			});
		}
	}
	return {
		candidates,
		truncated,
		visited
	};
}

/** Read and parse one bounded JSON request body. */
async function readJsonBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > MAX_BODY_BYTES) throw new Error("request body too large");
		chunks.push(chunk);
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/** Answer one bounded locate request; the handler owns the whole response. */
async function locateHandler(req, res) {
	const json = (status, body) => {
		res.writeHead(status, {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store"
		});
		res.end(JSON.stringify(body));
	};
	if (req.method !== "POST") {
		json(405, { error: "method-not-allowed" });
		return;
	}
	let payload;
	try {
		payload = await readJsonBody(req);
	} catch {
		json(400, { error: "bad-request" });
		return;
	}
	const name = typeof payload?.name === "string" ? payload.name.trim() : "";
	if (name === "" || name.includes("/") || name.includes("\\")) {
		json(400, { error: "bad-request" });
		return;
	}
	const seeds = Array.isArray(payload?.seeds) ? payload.seeds.slice(0, 64) : [];
	if (payload?.home === true) seeds.push(homedir());
	json(200, await locate(name, seeds));
}

/**
 * Host plugin body: register the locate route for the lifetime of the plugin, and
 * nothing when this Host composes no HTTP server or no authenticated browser
 * carrier at all.
 * @param ctx - Host root Context.
 */
function apply(ctx) {
	ctx.inject(["webServer", "connection"], (webCtx) => {
		/**
		 * Apply the application's own Host/Origin fence and browser-session check
		 * before the handler reads a seed or touches the filesystem. The desktop
		 * shell forwards its requests with the same host-issued cookie, so the
		 * custom-protocol page passes exactly like the Web page.
		 * @param req - incoming request.
		 * @param res - response owned here when the request is rejected.
		 * @returns true when this function answered the request.
		 */
		const unauthorized = (req, res) => {
			const rejection = webCtx.connection.requestRejection(req);
			if (rejection === undefined) return false;
			req.resume?.();
			res.writeHead(rejection, {
				"cache-control": "no-store",
				"content-type": "text/plain; charset=utf-8"
			});
			res.end(rejection === 401
				? "dsh web authentication required; reopen the URL printed by dsh web.\n"
				: "forbidden\n");
			return true;
		};
		webCtx.effect(() => webCtx.webServer.register({
			kind: "exact",
			path: LOCATE_PATH,
			handler: (req, res) => {
				if (unauthorized(req, res)) return;
				return locateHandler(req, res);
			}
		}), "workspace-folder-drop: locate route");
	});
}
//#endregion

export { apply };
