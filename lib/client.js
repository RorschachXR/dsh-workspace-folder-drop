window.__ModuleLoader__.load({
	id: "dsh-workspace-folder-drop",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		//#region lib/types/client/identity.js
		/** Locale namespace owned by this plugin. */
		const NS = "workspace-folder-drop";
		/** Stylesheet identity, so a reload replaces its tag instead of stacking copies. */
		const CSS_TAG_ID = "dsh-workspace-folder-drop/overlay.css";
		/**
		* Sidebar outlets that own the Workspaces region, widest last: the browsing
		* region itself, then the sidebar shell for the collapsed icon rail.
		*/
		const REGION_SELECTORS = ["[data-slot=\"sidebar.workspaces\"]", "[data-slot=\"sidebar\"]"];
		/** Transient invitation shown over the region while a folder hovers it. */
		const OVERLAY_CLASS = "dshwfd_overlay";
		/** Self-contained notice used for adoption outcomes. */
		const TOAST_CLASS = "dshwfd_toast";
		/** Resolution surface: candidate folders, or the fallback onto the shipped picker. */
		const PANEL_CLASS = "dshwfd_panel";
		/** How long an adoption notice stays on screen, in milliseconds. */
		const TOAST_MS = 4200;
		/** Bound on host directory listings one drop may spend, so a browse never runs away. */
		const SEARCH_LISTING_LIMIT = 48;
		/** How many listings one level issues at once. */
		const SEARCH_CONCURRENCY = 4;
		/** Wall-clock bound on one drop's whole name search, in milliseconds. */
		const SEARCH_TIMEOUT_MS = 8000;
		/** Directory levels a name-search rank descends below its seed. */
		const SEARCH_DEPTH = 2;
		/** Workspace seeds one rank contributes, newest first. */
		const SEARCH_WORKSPACE_LIMIT = 24;
		/** The shipped command that opens the composed directory picker. */
		const ADD_WORKSPACE_COMMAND = "workspace.add";
		/** The hole whose occupant is the composed picker; empty means no picking affordance. */
		const DIRECTORY_FLOW_SLOT = "sidebar.workspaces.directoryFlow";
		//#endregion

		//#region lib/types/client/dictionaries.js
		/** Simplified Chinese copy. */
		const zh = {
			"drop.title": "松开即新建工作区",
			"drop.detail": "文件夹：{name}",
			"drop.detailByName": "文件夹：{name}（按名称定位）",
			"drop.detailPicker": "文件夹：{name}（将打开文件夹选择器）",
			"drop.detailPath": "松开后按拖入的路径新建工作区：{name}",
			"drop.detailPathUnknown": "松开后按拖入的路径新建工作区",
			"drop.detailUnknown": "未能确认拖放内容（条目 {items}／文件 {files}），松开将按文件夹处理",
			"drop.detailMany": "{count} 个文件夹",
			"notice.adopted": "已新建工作区：{name}",
			"notice.adoptedMany": "已新建 {count} 个工作区",
			"notice.createFailed": "新建工作区失败（{name}）：{message}",
			"notice.pathUnavailable": "无法读取拖入文件夹的路径，已按普通引用处理",
			"resolve.searching": "正在定位文件夹「{name}」…",
			"resolve.choose": "找到 {count} 个名为「{name}」的文件夹，请选择要打开的那一个",
			"resolve.none": "未能自动定位「{name}」",
			"resolve.hint": "浏览器不会把文件夹的完整路径交给页面，这里按名称在已注册工作区、个人目录与磁盘根目录中查找。",
			"resolve.picker": "选择文件夹…",
			"resolve.pickerNote": "浏览器不会把拖放文件夹的路径交给页面，已打开文件夹选择器",
			"resolve.cancel": "取消",
			"resolve.noPicker": "当前部署没有目录选择器，请改用侧边栏的「添加工作区」"
		};
		/** English copy. */
		const en = {
			"drop.title": "Drop to create a workspace",
			"drop.detail": "Folder: {name}",
			"drop.detailByName": "Folder: {name} (located by name)",
			"drop.detailPicker": "Folder: {name} (the folder chooser will open)",
			"drop.detailPath": "Drop to create a workspace from the dropped path: {name}",
			"drop.detailPathUnknown": "Drop to create a workspace from the dropped path",
			"drop.detailUnknown": "The drag could not be identified ({items} items / {files} files); the drop will be treated as a folder",
			"drop.detailMany": "{count} folders",
			"notice.adopted": "Workspace created: {name}",
			"notice.adoptedMany": "{count} workspaces created",
			"notice.createFailed": "Could not create a workspace for {name}: {message}",
			"notice.pathUnavailable": "The dropped folder has no readable path, so it was left as a plain reference",
			"resolve.searching": "Locating the folder \"{name}\"…",
			"resolve.choose": "{count} folders named \"{name}\" were found; choose the one to open",
			"resolve.none": "\"{name}\" could not be located automatically",
			"resolve.hint": "A browser never hands the page a folder's full path, so this drop searched registered workspaces, your home directory and the drive roots by name.",
			"resolve.picker": "Choose a folder…",
			"resolve.pickerNote": "A browser never hands the page the dropped folder's path, so the folder chooser opened instead",
			"resolve.cancel": "Cancel",
			"resolve.noPicker": "This deployment composes no directory picker; use the sidebar's Add workspace action"
		};
		//#endregion

		//#region lib/types/client/styles.js
		const CSS = `.${OVERLAY_CLASS}{position:fixed;z-index:2147483000;box-sizing:border-box;pointer-events:none;border:2px dashed var(--dsw-alias-brand-primary);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);display:flex;align-items:flex-start;justify-content:center}.${OVERLAY_CLASS}[hidden]{display:none}.${OVERLAY_CLASS} .dshwfd_pill{box-sizing:border-box;margin-top:12px;max-width:min(80%,320px);padding:8px 14px;border-radius:10px;background:var(--dsw-alias-bg-overlay);box-shadow:0 8px 28px rgba(0,0,0,.18);display:flex;flex-direction:column;gap:2px;text-align:center;font-family:var(--dsw-font-family,system-ui);font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary)}.${OVERLAY_CLASS} .dshwfd_detail{font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.${TOAST_CLASS}{position:fixed;left:50%;bottom:28px;z-index:2147483000;transform:translateX(-50%);box-sizing:border-box;max-width:min(80vw,520px);padding:10px 14px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);box-shadow:0 8px 28px rgba(0,0,0,.18);font-family:var(--dsw-font-family,system-ui);font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}.${TOAST_CLASS}[hidden]{display:none}.${TOAST_CLASS}[data-kind=error]{color:var(--dsw-alias-state-error-primary)}.${PANEL_CLASS}{position:fixed;left:50%;bottom:28px;z-index:2147483000;transform:translateX(-50%);box-sizing:border-box;width:min(560px,calc(100vw - 32px));max-height:min(60vh,420px);display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:12px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);box-shadow:0 12px 36px rgba(0,0,0,.22);font-family:var(--dsw-font-family,system-ui);font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary)}.${PANEL_CLASS}[hidden]{display:none}.${PANEL_CLASS} .dshwfd_panelTitle{font-weight:500;overflow-wrap:anywhere}.${PANEL_CLASS} .dshwfd_hint{font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary)}.${PANEL_CLASS} .dshwfd_options{display:flex;flex-direction:column;gap:4px;overflow:auto}.${PANEL_CLASS} .dshwfd_option{display:block;width:100%;text-align:left;padding:7px 9px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1);background:transparent;color:inherit;font:inherit;cursor:pointer;overflow-wrap:anywhere}.${PANEL_CLASS} .dshwfd_option:hover{background:var(--dsw-alias-interactive-bg-hover)}.${PANEL_CLASS} .dshwfd_actions{display:flex;gap:8px;justify-content:flex-end}.${PANEL_CLASS} .dshwfd_action{padding:6px 12px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:inherit;font:inherit;cursor:pointer}.${PANEL_CLASS} .dshwfd_actionPrimary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted)}`;

		/** Install the plugin stylesheet once per document. */
		function ensureStyles() {
			if (document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_TAG_ID) + "]") !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-workspace-folder-drop";
			tag.dataset.pluginCss = CSS_TAG_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region lib/types/client/paths.js
		/**
		* Drop trailing separators, keeping a bare root intact.
		* @param path - any absolute path.
		* @returns the same path without a trailing separator.
		*/
		function trimTrailing(path) {
			const trimmed = path.replace(/[\\/]+$/, "");
			if (trimmed === "") return path;
			if (/^[A-Za-z]:$/.test(trimmed)) return `${trimmed}\\`;
			return trimmed;
		}
		/** Separator index of a path's last segment, or -1 when it has none. */
		function separatorIndex(path) {
			return Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
		}
		/**
		* The containing directory of an absolute path, without touching the filesystem.
		* @param path - any absolute path.
		* @returns the parent directory, or the path itself at a root.
		*/
		function dirnameOf(path) {
			const clean = trimTrailing(path);
			const index = separatorIndex(clean);
			if (index < 0) return clean;
			if (index === 0) return clean.slice(0, 1);
			const head = clean.slice(0, index);
			return /^[A-Za-z]:$/.test(head) ? `${head}\\` : head;
		}
		/**
		* The last segment of an absolute path, without touching the filesystem.
		* @param path - any absolute path.
		* @returns the directory or file name.
		*/
		function baseNameOf(path) {
			const clean = trimTrailing(path);
			const index = separatorIndex(clean);
			if (index < 0) return clean;
			const base = clean.slice(index + 1);
			return base === "" ? clean : base;
		}
		/**
		* How well a listed child carries the dropped folder's name. An exact match
		* always wins; the case-insensitive comparison exists for Windows and macOS
		* hosts, where the drag reports the name in the shell's own casing.
		* @param candidate - the listed child's name.
		* @param wanted - the dropped folder's name.
		* @returns 0 for no match, 1 for a case-insensitive match, 2 for an exact one.
		*/
		function nameMatchQuality(candidate, wanted) {
			if (candidate === wanted) return 2;
			return candidate.toLocaleLowerCase() === wanted.toLocaleLowerCase() ? 1 : 0;
		}
		/**
		* Whether a transfer text carries an absolute path we can trust. A file
		* manager that puts a `file:` URL or a plain path on the dragboard is the one
		* browser case where the page is handed the real location.
		* @param text - a `text/uri-list` or `text/plain` payload.
		* @returns the absolute path, or null when the text names none.
		*/
		function pathOfTransferText(text) {
			for (const raw of String(text ?? "").split(/\r?\n/)) {
				const line = raw.trim();
				if (line === "" || line.startsWith("#")) continue;
				if (line.startsWith("file://")) {
					try {
						const decoded = decodeURIComponent(new URL(line).pathname);
						return /^\/[A-Za-z]:/.test(decoded) ? decoded.slice(1).replace(/\//g, "\\") : decoded;
					} catch {
						continue;
					}
				}
				if (/^[A-Za-z]:[\\/]/.test(line) || line.startsWith("\\\\") || line.startsWith("/")) return line;
			}
			return null;
		}
		//#endregion

		//#region lib/types/client/drop-events.js
		/** The Desktop shell's path bridge; absent in a plain browser document. */
		function hostPathBridge() {
			const bridge = globalThis.__DSH_HOST_PATHS__;
			return bridge !== null && typeof bridge === "object" && typeof bridge.pathFor === "function" ? bridge : void 0;
		}
		/** Whether this drag carries operating-system files. */
		function isFileDrag(dataTransfer) {
			return dataTransfer !== null && dataTransfer !== void 0 && Array.from(dataTransfer.types ?? []).includes("Files");
		}
		/**
		* Read one file drag: its members and what they look like. The `File` a
		* directory drop yields is indistinguishable from an empty file, so the
		* entry API is the only source of that fact — and a protected drag withholds
		* both the file list and the entry objects until the drop, which is why
		* "unknown" is a verdict rather than a rejection. Members come from the item
		* list so a hover still names the folder, and from the file list alone when
		* no item survived.
		* @param dataTransfer - the drag's payload.
		* @returns the members, the verdict, and the tally a diagnostic line reports.
		*/
		function classifyDrag(dataTransfer) {
			const files = Array.from(dataTransfer.files ?? []);
			const members = [];
			let fileIndex = 0;
			for (const item of Array.from(dataTransfer.items ?? [])) {
				if (item.kind !== "file") continue;
				const file = files[fileIndex];
				fileIndex += 1;
				let entry = null;
				if (typeof item.webkitGetAsEntry === "function") {
					try {
						entry = item.webkitGetAsEntry();
					} catch {
						entry = null;
					}
				}
				const name = entry !== null && entry !== void 0 && typeof entry.name === "string" && entry.name !== "" ? entry.name : file === void 0 ? "" : file.name;
				members.push({
					name,
					file,
					kind: entry === null || entry === void 0 ? "unknown" : entry.isDirectory === true ? "directory" : "file"
				});
			}
			if (members.length === 0) {
				for (const file of files) members.push({
					name: file.name,
					file,
					kind: "unknown"
				});
			}
			const verdict = members.length === 0 ? "none" : members.every((member) => member.kind === "directory") ? "folders" : members.every((member) => member.kind === "file") ? "files" : members.every((member) => member.kind === "unknown") ? "unknown" : "mixed";
			return {
				members,
				verdict,
				tally: {
					items: Array.from(dataTransfer.items ?? []).filter((item) => item.kind === "file").length,
					files: files.length
				}
			};
		}
		//#endregion

		//#region lib/types/client/region.js
		/**
		* Resolved region cache: the outlet anchor that owns the Workspaces region.
		* The anchor is `display:contents`, so it never has a box of its own; the
		* region is its whole subtree, and both the hit test and the invitation box
		* are derived from that subtree rather than from one guessed descendant.
		*/
		let regionCache = null;
		/** Bounded walk over the anchor's layout boxes, never descending into a boxed node. */
		const REGION_BOX_LIMIT = 8;
		const REGION_NODE_LIMIT = 64;
		/** The laid-out boxes the outlet renders, coalesced at their outermost elements. */
		function regionBoxes(anchor) {
			const boxes = [];
			const queue = [anchor];
			let visited = 0;
			while (queue.length > 0 && boxes.length < REGION_BOX_LIMIT && visited < REGION_NODE_LIMIT) {
				const element = queue.shift();
				visited += 1;
				const rect = element.getBoundingClientRect();
				if (rect.width >= 24 && rect.height >= 24) {
					boxes.push(rect);
					continue;
				}
				queue.push(...element.children);
			}
			return boxes;
		}
		/** The union of a region's boxes, or null while nothing is laid out. */
		function unionRect(rects) {
			let left = Number.POSITIVE_INFINITY;
			let top = Number.POSITIVE_INFINITY;
			let right = Number.NEGATIVE_INFINITY;
			let bottom = Number.NEGATIVE_INFINITY;
			for (const rect of rects) {
				left = Math.min(left, rect.left);
				top = Math.min(top, rect.top);
				right = Math.max(right, rect.right);
				bottom = Math.max(bottom, rect.bottom);
			}
			if (left === Number.POSITIVE_INFINITY) return null;
			return {
				left,
				top,
				width: right - left,
				height: bottom - top
			};
		}
		/** The outlet anchor that owns the Workspaces region, or null while none is mounted. */
		function regionAnchor() {
			if (regionCache !== null && regionCache.isConnected) return regionCache;
			regionCache = null;
			for (const selector of REGION_SELECTORS) {
				const anchor = document.querySelector(selector);
				if (anchor === null) continue;
				if (regionBoxes(anchor).length === 0) continue;
				regionCache = anchor;
				return anchor;
			}
			return null;
		}
		/** The box the invitation is pinned to. */
		function regionRect(anchor) {
			return unionRect(regionBoxes(anchor));
		}
		/** Whether a drag event landed inside the region's own subtree. */
		function withinRegion(event, anchor) {
			const target = event.target;
			return target instanceof Element && (target === anchor || anchor.contains(target));
		}
		//#endregion

		//#region lib/types/client/search.js
		/**
		* Whether the composed picker also answers directory listings. Only the
		* in-app browse backend serves that capability; an operating-system chooser
		* refuses every listing, and then a browser drop cannot locate a folder by
		* name and must hand over to the chooser instead.
		*/
		let browseState = "unknown";
		/** The wire code the picker seam answers when the composed backend serves no browsing capability. */
		const PICKER_UNAVAILABLE = "directory-picker/unavailable";
		/**
		* Sample the browsing capability once per page, then remember it: the
		* composition is fixed for a boot, and the drop path needs the answer before
		* it starts spending listings.
		* @param ctx - Client root Context.
		* @returns true only when a listing was answered.
		*/
		async function browseAvailable(ctx) {
			if (browseState !== "unknown") return browseState === "available";
			try {
				await ctx.uiWorkspace.listDirectory();
				browseState = "available";
			} catch (reason) {
				/* An unrelated read failure leaves the answer unknown and re-samples next time. */
				if ((reason?.rpcError?.code ?? reason?.code) === PICKER_UNAVAILABLE) browseState = "unavailable";
			}
			return browseState === "available";
		}
		/** Run one worker per item with a bounded number in flight. */
		async function mapLimit(items, limit, worker) {
			const results = [];
			let index = 0;
			const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
				while (index < items.length) {
					const current = index;
					index += 1;
					results[current] = await worker(items[current]);
				}
			});
			await Promise.all(runners);
			return results;
		}
		/**
		* One directory level from the host. A root of `undefined` asks for the host
		* account's home directory, which is how the widest rank seeds itself.
		* @param ctx - Client root Context.
		* @param path - the directory to list, or undefined for home.
		* @param state - shared listing budget and deadline for one drop.
		* @returns the child directories, or none when the level is unreadable or out of budget.
		*/
		async function childrenOf(ctx, path, state) {
			if (state.listings >= SEARCH_LISTING_LIMIT || Date.now() > state.deadline) return [];
			state.listings += 1;
			try {
				const listing = await ctx.uiWorkspace.listDirectory(path);
				return Array.isArray(listing?.entries) ? listing.entries : [];
			} catch {
				return [];
			}
		}
		/**
		* List every root and keep the children that carry the dropped name. An exact
		* name always outranks a case-insensitive one, so `Demo` never answers a drop
		* of `demo` while `demo` is present.
		* @returns the matching paths and the discovered child directories.
		*/
		async function listAndMatch(ctx, roots, name, state) {
			const perRoot = await mapLimit(roots, SEARCH_CONCURRENCY, (root) => childrenOf(ctx, root, state));
			const matches = [];
			const children = [];
			let best = 0;
			for (const entries of perRoot) {
				for (const entry of entries) {
					const path = typeof entry?.path === "string" ? entry.path : "";
					if (path === "") continue;
					children.push(path);
					const quality = nameMatchQuality(typeof entry.name === "string" && entry.name !== "" ? entry.name : baseNameOf(path), name);
					if (quality === 0) continue;
					if (quality > best) {
						best = quality;
						matches.length = 0;
					}
					if (quality === best) matches.push(path);
				}
			}
			return {
				matches,
				children
			};
		}
		/**
		* Descend one rank: match the seed's children, then their children, stopping
		* at the first level that matches anything.
		* @returns the matching paths at the first matching level.
		*/
		async function searchRank(ctx, seeds, name, state) {
			let roots = seeds;
			for (let depth = 0; depth < SEARCH_DEPTH && roots.length > 0; depth += 1) {
				if (state.listings >= SEARCH_LISTING_LIMIT || Date.now() > state.deadline) return [];
				const { matches, children } = await listAndMatch(ctx, roots, name, state);
				if (matches.length > 0) return matches;
				roots = children;
			}
			return [];
		}
		/** The directory of the session the user is looking at, when one is selected. */
		function currentDirectory(ctx) {
			const sessions = ctx.get("sessions");
			if (sessions === void 0) return void 0;
			const current = Object.values(sessions.list.getSnapshot().byId).find((row) => (row?.retainedBy?.mainView ?? 0) > 0);
			return typeof current?.cwd === "string" && current.cwd !== "" ? current.cwd : void 0;
		}
		/** Every registered workspace path, newest first. */
		function workspacePaths(ctx) {
			const items = ctx.workspaces.list.getSnapshot().items;
			return items.map((workspace) => workspace.path).filter((path) => typeof path === "string" && path !== "").slice(0, SEARCH_WORKSPACE_LIMIT);
		}
		/** Distinct non-blank entries, preserving order. */
		function distinctPaths(paths) {
			const seen = new Set();
			const out = [];
			for (const path of paths) {
				if (path === void 0 || path === "" || seen.has(path)) continue;
				seen.add(path);
				out.push(path);
			}
			return out;
		}
		/**
		* The ranks a browser drop falls back on, closest first: the open project, its
		* neighbourhood, the other registered workspaces, the account's home tree and
		* finally the drive roots. The first rank that matches anything wins, so a
		* sibling folder never competes with a same-named one somewhere else.
		* @param ctx - Client root Context.
		* @returns the seed directories of each rank, in order.
		*/
		function searchRanks(ctx) {
			const cwd = currentDirectory(ctx);
			const cwdParent = cwd === void 0 ? void 0 : dirnameOf(cwd);
			const workspaces = workspacePaths(ctx);
			return [
				distinctPaths([cwd]),
				distinctPaths([cwdParent]),
				distinctPaths([...workspaces, ...workspaces.map((path) => dirnameOf(path))]),
				[void 0],
				distinctPaths(driveRoots([...workspaces, cwd]))
			].filter((rank) => rank.length > 0);
		}
		/**
		* The drive roots the known paths sit on, for the widest search rank. Derived
		* from those paths rather than from a platform probe, so the browser bundle
		* reads no Node global; a POSIX path set yields the filesystem root.
		* @param paths - absolute paths already known to this page.
		* @returns the roots to seed, deduplicated.
		*/
		function driveRoots(paths) {
			const roots = [];
			for (const path of paths) {
				if (typeof path !== "string") continue;
				const match = /^([A-Za-z]):[\\/]/.exec(path);
				if (match !== null) roots.push(`${match[1]}:\\`);
			}
			return roots.length > 0 ? roots : ["/"];
		}
		/** The route this package's own Host half answers when a browser drop needs a path. */
		const LOCATE_PATH = "/workspace-folder-drop/locate";
		/**
		* The seeds this page can justify, in priority order: the open project, its
		* parent, then every registered workspace and each one's parent. The Host
		* adds the account's home directory itself and walks each seed three levels.
		*/
		function locateSeeds(ctx) {
			const cwd = currentDirectory(ctx);
			const workspaces = workspacePaths(ctx);
			return distinctPaths([cwd, cwd === void 0 ? void 0 : dirnameOf(cwd), ...workspaces, ...workspaces.map((path) => dirnameOf(path))]);
		}
		/**
		* Ask this package's Host half to locate a dropped folder by name. Only a
		* browser-facing Host answers, and only over http(s): the Desktop shell, whose
		* bridge already knows the exact path, keeps its own lane.
		* @param ctx - Client root Context.
		* @param name - the dropped folder's name.
		* @returns one resolved path, several candidates, nothing found, or null when no Host answered.
		*/
		async function locateOnHost(ctx, name) {
			const protocol = globalThis.location?.protocol;
			if (typeof fetch !== "function" || protocol !== "http:" && protocol !== "https:") return null;
			try {
				const response = await fetch(LOCATE_PATH, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						name,
						seeds: locateSeeds(ctx),
						home: true
					})
				});
				if (!response.ok) return null;
				return decideCandidates(await response.json());
			} catch (reason) {
				console.warn("workspace-folder-drop: the Host could not be asked to locate the folder:", reason);
				return null;
			}
		}
		/**
		* Choose among the Host's candidates: the best seed rank first, then an exact
		* name over a case-insensitive one, then one path or a choice.
		* @param payload - the route's answer.
		* @returns the verdict the caller acts on.
		*/
		function decideCandidates(payload) {
			const rows = (Array.isArray(payload?.candidates) ? payload.candidates : []).filter((row) => typeof row?.path === "string" && row.path !== "");
			if (rows.length === 0) return {
				kind: "none",
				paths: []
			};
			const rank = Math.min(...rows.map((row) => typeof row.root === "number" ? row.root : 0));
			const inRank = rows.filter((row) => (typeof row.root === "number" ? row.root : 0) === rank);
			const exact = inRank.filter((row) => row.exact !== false);
			const paths = distinctPaths((exact.length > 0 ? exact : inRank).map((row) => row.path));
			return paths.length === 1 ? {
				kind: "resolved",
				paths
			} : {
				kind: "ambiguous",
				paths
			};
		}
		/**
		* Locate a dropped folder the browser could only name.
		* @returns one resolved path, several candidates, or nothing found.
		*/
		async function locateFolder(ctx, name) {
			const state = {
				listings: 0,
				deadline: Date.now() + SEARCH_TIMEOUT_MS
			};
			for (const rank of searchRanks(ctx)) {
				const matches = await searchRank(ctx, rank, name, state);
				if (matches.length === 1) return {
					kind: "resolved",
					paths: matches
				};
				if (matches.length > 1) return {
					kind: "ambiguous",
					paths: matches
				};
			}
			return {
				kind: "none",
				paths: []
			};
		}
		//#endregion

		//#region lib/types/client/surfaces.js
		/** The transient surfaces one drop renders: hover invitation, notice, resolution panel. */
		function createSurfaces(ctx, t) {
			ensureStyles();
			const overlay = document.createElement("div");
			overlay.className = OVERLAY_CLASS;
			overlay.hidden = true;
			overlay.setAttribute("aria-hidden", "true");
			const pill = document.createElement("div");
			pill.className = "dshwfd_pill";
			const title = document.createElement("div");
			const detail = document.createElement("div");
			detail.className = "dshwfd_detail";
			pill.append(title, detail);
			overlay.append(pill);
			document.body.append(overlay);
			const toast = document.createElement("div");
			toast.className = TOAST_CLASS;
			toast.hidden = true;
			toast.setAttribute("role", "status");
			document.body.append(toast);
			const panel = document.createElement("div");
			panel.className = PANEL_CLASS;
			panel.hidden = true;
			panel.setAttribute("role", "dialog");
			document.body.append(panel);
			let toastTimer = 0;
			let panelOpen = false;
			/** Show one transient notice and restart its dismissal timer. */
			const notify = (text, kind) => {
				toast.textContent = text;
				toast.hidden = false;
				if (kind === void 0) delete toast.dataset.kind;
				else toast.dataset.kind = kind;
				window.clearTimeout(toastTimer);
				toastTimer = window.setTimeout(() => {
					toast.hidden = true;
				}, TOAST_MS);
			};
			const hideOverlay = () => {
				overlay.hidden = true;
			};
			/** Pin the invitation over the region box, naming what the drop will do. */
			const showOverlay = (rect, detailText) => {
				overlay.style.left = `${rect.left}px`;
				overlay.style.top = `${rect.top}px`;
				overlay.style.width = `${rect.width}px`;
				overlay.style.height = `${rect.height}px`;
				title.textContent = t("drop.title");
				detail.textContent = detailText;
				overlay.hidden = false;
			};
			const closePanel = () => {
				panelOpen = false;
				panel.hidden = true;
				panel.replaceChildren();
			};
			/** Render a titled surface with candidate rows and its actions. */
			const showPanel = (surface) => {
				panel.replaceChildren();
				const heading = document.createElement("div");
				heading.className = "dshwfd_panelTitle";
				heading.textContent = surface.title;
				panel.append(heading);
				if (surface.hint !== void 0) {
					const hint = document.createElement("div");
					hint.className = "dshwfd_hint";
					hint.textContent = surface.hint;
					panel.append(hint);
				}
				if (surface.options.length > 0) {
					const options = document.createElement("div");
					options.className = "dshwfd_options";
					for (const option of surface.options) {
						const button = document.createElement("button");
						button.type = "button";
						button.className = "dshwfd_option";
						button.textContent = option.label;
						button.addEventListener("click", (event) => {
							event.stopPropagation();
							closePanel();
							option.onSelect();
						});
						options.append(button);
					}
					panel.append(options);
				}
				const actions = document.createElement("div");
				actions.className = "dshwfd_actions";
				for (const action of surface.actions) {
					const button = document.createElement("button");
					button.type = "button";
					button.className = action.primary === true ? "dshwfd_action dshwfd_actionPrimary" : "dshwfd_action";
					button.textContent = action.label;
					button.addEventListener("click", (event) => {
						event.stopPropagation();
						closePanel();
						action.onSelect();
					});
					actions.append(button);
				}
				panel.append(actions);
				panel.hidden = false;
				panelOpen = true;
			};
			/** Escape and an outside press both dismiss the resolution surface. */
			const onKeyDown = (event) => {
				if (panelOpen && event.key === "Escape") closePanel();
			};
			const onPointerDown = (event) => {
				if (!panelOpen) return;
				const target = event.target;
				if (target instanceof Node && panel.contains(target)) return;
				closePanel();
			};
			window.addEventListener("keydown", onKeyDown, true);
			window.addEventListener("pointerdown", onPointerDown, true);
			return {
				notify,
				hideOverlay,
				showOverlay,
				showPanel,
				dispose() {
					window.removeEventListener("keydown", onKeyDown, true);
					window.removeEventListener("pointerdown", onPointerDown, true);
					window.clearTimeout(toastTimer);
					overlay.remove();
					toast.remove();
					panel.remove();
				}
			};
		}
		//#endregion

		//#region lib/types/client/install.js
		/** Error text for a rejected promise of any shape. */
		function messageOf(reason) {
			if (reason instanceof Error) return reason.message;
			return String(reason);
		}
		/** Read one dragboard payload, tolerating a transfer that refuses the type. */
		function safeGetData(dataTransfer, type) {
			try {
				return dataTransfer.getData(type);
			} catch {
				return "";
			}
		}
		/**
		* Own the sidebar as a folder drop target: intercept the operating-system
		* drag in the capture phase, before the document-level attachment intake sees
		* the drop, register each dropped folder as a Workspace, and open the first.
		*
		* The Desktop shell hands the page each folder's absolute path. A browser
		* document never does, so there the folder is located by name through the
		* host's own directory listings, and the shipped directory picker is offered
		* whenever that search cannot decide.
		* @param ctx - Client root Context.
		* @param t - translator for this plugin's namespace.
		* @returns disposer for the listeners and the transient UI.
		*/
		function installDropTarget(ctx, t) {
			const ui = createSurfaces(ctx, t);
			/** Register every dropped folder, then open the first one. */
			const adopt = async (picked) => {
				const opened = [];
				for (const item of picked) {
					try {
						const workspace = await ctx.workspaces.create({ path: item.path });
						opened.push(workspace.workspaceId);
					} catch (reason) {
						ui.notify(t("notice.createFailed", {
							name: item.name,
							message: messageOf(reason)
						}), "error");
					}
				}
				if (opened.length === 0) return;
				ui.notify(opened.length === 1 ? t("notice.adopted", { name: picked[0].name }) : t("notice.adoptedMany", { count: String(opened.length) }));
				try {
					await ctx.uiWorkspace.openWorkspace(opened[0]);
				} catch (reason) {
					console.warn("workspace-folder-drop: opening the new Workspace failed:", reason);
				}
			};
			/**
			* Open the shipped add-workspace flow. It is only the fallback: the flow's
			* own state machine decides whether it can open, and this plugin prefers to
			* ask the host for a path itself.
			*/
			const openShippedPicker = () => {
				try {
					const slots = ctx.get("slots");
					const shortcuts = ctx.get("shortcuts");
					if (slots !== void 0 && slots.entries(DIRECTORY_FLOW_SLOT).length === 0) {
						ui.notify(t("resolve.noPicker"), "error");
						return;
					}
					if (shortcuts === void 0 || typeof shortcuts.invoke !== "function") {
						ui.notify(t("resolve.noPicker"), "error");
						return;
					}
					shortcuts.invoke(ADD_WORKSPACE_COMMAND, { modal: null });
				} catch (reason) {
					console.warn("workspace-folder-drop: the add-workspace command failed:", reason);
					ui.notify(t("resolve.noPicker"), "error");
				}
			};
			/**
			* Ask the host itself for a path. A picker that composes only the operating
			* system chooser answers no directory listing, and then this is the one call
			* that can turn a browser drop into an absolute path — no sidebar state, no
			* command dispatch, nothing that can decline on the user's behalf.
			* @param member - the dropped member, used only for its label.
			*/
			const pickWithHostChooser = async (member) => {
				try {
					const picked = await ctx.uiWorkspace.pickDirectory();
					if (typeof picked !== "string" || picked === "") return;
					await adopt([{
						path: picked,
						name: member.name
					}]);
					return;
				} catch (reason) {
					console.warn("workspace-folder-drop: the host folder chooser failed:", reason);
				}
				openShippedPicker();
			};
			const pickerAction = () => ({
				label: t("resolve.picker"),
				primary: true,
				onSelect: openShippedPicker
			});
			const cancelAction = () => ({
				label: t("resolve.cancel"),
				onSelect: () => {}
			});
			/** Resolution surface for a folder the search placed in more than one spot. */
			const offerCandidates = (name, paths) => {
				ui.showPanel({
					title: t("resolve.choose", {
						name,
						count: String(paths.length)
					}),
					options: paths.map((path) => ({
						label: path,
						onSelect: () => {
							void adopt([{
								path,
								name
							}]);
						}
					})),
					actions: [pickerAction(), cancelAction()]
				});
			};
			/** Resolution surface for a folder the search could not place at all. */
			const offerPicker = (name) => {
				ui.showPanel({
					title: t("resolve.none", { name }),
					hint: t("resolve.hint"),
					options: [],
					actions: [pickerAction(), cancelAction()]
				});
			};
			/**
			* The browser lane, in the order of how much each step knows: the dragboard
			* path when the file manager published one, this package's own Host half
			* locating the name, the host's own directory listings when the composed
			* picker serves them, and finally the operating-system chooser.
			*/
			const resolveInBrowser = async (member, dataTransfer) => {
				const listed = await browseAvailable(ctx);
				const named = pathOfTransferText(safeGetData(dataTransfer, "text/uri-list")) ?? pathOfTransferText(safeGetData(dataTransfer, "text/plain"));
				/* A dragboard path is a claim about one location; the workspace create checks it. */
				if (named !== null) {
					await adopt([{
						path: named,
						name: member.name
					}]);
					return;
				}
				const located = await locateOnHost(ctx, member.name);
				if (located?.kind === "resolved") {
					await adopt([{
						path: located.paths[0],
						name: member.name
					}]);
					return;
				}
				if (located?.kind === "ambiguous") {
					offerCandidates(member.name, located.paths);
					return;
				}
				if (located === null && listed) {
					ui.notify(t("resolve.searching", { name: member.name }));
					const found = await locateFolder(ctx, member.name);
					if (found.kind === "resolved") {
						await adopt([{
							path: found.paths[0],
							name: member.name
						}]);
						return;
					}
					if (found.kind === "ambiguous") {
						offerCandidates(member.name, found.paths);
						return;
					}
					offerPicker(member.name);
					return;
				}
				if (located?.kind === "none" && listed) {
					offerPicker(member.name);
					return;
				}
				ui.notify(t("resolve.pickerNote", { name: member.name }));
				await pickWithHostChooser(member);
			};
			/** Resolve the dropped members by the lane this document supports. */
			const adoptDrop = (members, dataTransfer) => {
				const bridge = hostPathBridge();
				if (bridge !== void 0) {
					const picked = [];
					for (const member of members) {
						if (member.file === void 0) continue;
						let path = "";
						try {
							path = bridge.pathFor(member.file);
						} catch {
							path = "";
						}
						if (typeof path !== "string" || path === "") continue;
						picked.push({
							path,
							name: member.name
						});
					}
					if (picked.length === 0) {
						ui.notify(t("notice.pathUnavailable"), "error");
						return;
					}
					void adopt(picked);
					return;
				}
				void (async () => {
					for (const member of members) await resolveInBrowser(member, dataTransfer);
				})();
			};
			/** What the invitation promises, which depends on what the drag revealed. */
			const dragDetail = (drag) => {
				if (drag.members.length !== 1) return t("drop.detailMany", { count: String(drag.members.length) });
				const name = drag.members[0].name;
				const bridge = hostPathBridge();
				if (drag.verdict === "unknown") {
					if (bridge !== void 0) return name === "" ? t("drop.detailPathUnknown") : t("drop.detailPath", { name });
					return t("drop.detailUnknown", {
						items: String(drag.tally.items),
						files: String(drag.tally.files)
					});
				}
				if (bridge !== void 0) return t("drop.detail", { name });
				if (browseState === "unavailable") return t("drop.detailPicker", { name });
				return t("drop.detailByName", { name });
			};
			/** Whether a drag is one this plugin may turn into a workspace. */
			const ownedDrag = (drag) => drag.verdict === "folders" || drag.verdict === "unknown";
			/**
			* A hover claims every file drag the region can still turn into a workspace,
			* including one whose content the browser has not revealed yet: a protected
			* drag reports no entries until the drop, so waiting for proof here is what
			* let the shipped composer intake keep the gesture.
			*/
			const onDragOver = (event) => {
				if (!isFileDrag(event.dataTransfer)) return;
				const anchor = regionAnchor();
				if (anchor === null || !withinRegion(event, anchor)) {
					ui.hideOverlay();
					return;
				}
				const drag = classifyDrag(event.dataTransfer);
				if (!ownedDrag(drag)) {
					ui.hideOverlay();
					return;
				}
				const rect = regionRect(anchor);
				if (rect === null) {
					ui.hideOverlay();
					return;
				}
				event.preventDefault();
				event.stopPropagation();
				event.dataTransfer.dropEffect = "copy";
				ui.showOverlay(rect, dragDetail(drag));
			};
			/**
			* Take the drag's entry away from the document-level composer intake as soon
			* as it enters the region, so its full-screen "drop files here" invitation
			* never answers a gesture this plugin is about to own.
			*/
			const onDragEnter = (event) => {
				if (!isFileDrag(event.dataTransfer)) return;
				const anchor = regionAnchor();
				if (anchor === null || !withinRegion(event, anchor)) return;
				if (!ownedDrag(classifyDrag(event.dataTransfer))) return;
				event.preventDefault();
				event.stopPropagation();
			};
			/**
			* Release the document-level drag state a claimed drop would otherwise leave
			* behind: the shipped intake resets its invitation from its own drop
			* handler, which this claim suppressed, and an operating-system drag fires
			* no `dragend` of its own to do it.
			*/
			const releaseDragState = () => {
				try {
					window.dispatchEvent(new Event("dragend"));
				} catch (reason) {
					console.warn("workspace-folder-drop: could not reset the drag state:", reason);
				}
			};
			/** The drop decides for real: files, and anything mixed, stay with the composer. */
			const onDrop = (event) => {
				ui.hideOverlay();
				if (!isFileDrag(event.dataTransfer)) return;
				const anchor = regionAnchor();
				if (anchor === null || !withinRegion(event, anchor)) return;
				const drag = classifyDrag(event.dataTransfer);
				if (!ownedDrag(drag)) return;
				event.preventDefault();
				event.stopPropagation();
				releaseDragState();
				adoptDrop(drag.members, event.dataTransfer);
			};
			const onDragLeave = (event) => {
				if (event.clientX > 0 && event.clientY > 0 && event.clientX < window.innerWidth && event.clientY < window.innerHeight) return;
				ui.hideOverlay();
			};
			window.addEventListener("dragenter", onDragEnter, true);
			window.addEventListener("dragover", onDragOver, true);
			window.addEventListener("drop", onDrop, true);
			window.addEventListener("dragleave", onDragLeave, true);
			window.addEventListener("dragend", ui.hideOverlay, true);
			return () => {
				window.removeEventListener("dragenter", onDragEnter, true);
				window.removeEventListener("dragover", onDragOver, true);
				window.removeEventListener("drop", onDrop, true);
				window.removeEventListener("dragleave", onDragLeave, true);
				window.removeEventListener("dragend", ui.hideOverlay, true);
				ui.dispose();
			};
		}
		//#endregion

		//#region lib/types/client/index.js
		/** Services required by this plugin. */
		const inject = ["locale", "workspaces", "uiWorkspace"];
		/** Own the sidebar's folder-drop behavior for the active page. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "workspace-folder-drop: dictionaries");
			const t = ctx.locale.bind(NS);
			/* Sample the browsing capability up front so the drop invitation can promise the right thing. */
			if (hostPathBridge() === void 0) void browseAvailable(ctx);
			ctx.effect(() => installDropTarget(ctx, t), "workspace-folder-drop: sidebar folder drop");
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
