// ==UserScript==
// @name         RE621 Utilities
// @namespace    http://tampermonkey.net/
// @version      1.0.44
// @description  My various utilities for e621.
// @author       Donovan_DMC
// @match        https://e621.net/*
// @icon         https://www.google.com/s2/favicons?domain=e621.net
// @grant        none
// @updateURL    https://raw.githubusercontent.com/DonovanDMC/TampermonkeyScripts/master/scripts/RE621Utilities.js
// @downloadURL  https://raw.githubusercontent.com/DonovanDMC/TampermonkeyScripts/master/scripts/RE621Utilities.js
// @run-at       document-start
// ==/UserScript==


class E621Utilities {
	static BASE = "https://hide.e621.net/";
	static POSTS_PER_PAGE = 75;
	static HIDE_LIST = [];
	static DONE = false;
	static KEYBINDS_DISABLED = false;
	static HIDDEN = 0;
	static REGEX = {
		POST_LIST: /^\/posts$/,
		POST: /^\/posts\/[0-9]{2,}$/,
		EDIT_USER: /^\/users\/[0-9]{1,}\/edit$/,
		UPLOAD: /^\/uploads\/new$/
	};
	static BREAKS = [];
	static SETS = {
		SAFE: 27220,
		QUESTIONABLE: 27221,
		EXPLICIT: 27222
	};
	static load() {
		if (this.DONE === true) return;
		this.enforceConsistentSpacing();
		this.handle503();
		this.addLoaded();
		this.addNotes();
		if (this.REGEX.POST_LIST.test(window.location.pathname)) {
			setTimeout(() => this.getHideList().then(v => {
				this.hidePosts([...v.hidden, ...this.HIDE_LIST]);
				this.markLockedPosts(v.locked);
				// setTimeout(this.checkEmptyPosts.bind(this), 1e3);
				this.addPostCounts();
			}), 1e3);
			setInterval(() => {
				document.querySelectorAll("post-break").forEach((b) => {
					if (!this.BREAKS.includes(b.id)) {
						this.BREAKS.push(b.id);
						setTimeout(() => this.getHideList().then(v => {
							this.hidePosts([...v.hidden, ...this.HIDE_LIST]);
							this.markLockedPosts(v.locked);
							// setTimeout(this.checkEmptyPosts.bind(this), 1e3);
							this.addPostCounts();
						}), 1e3);
					}
				}, 500);

			});
		}
		if (this.REGEX.POST.test(window.location.pathname)) {
			this.setupQuickEdit();
			this.collapseTags();
			setInterval(() => {
				this.checkTagLockNSFW();
			}, 1e3);
		}
		if (this.REGEX.UPLOAD.test(window.location.pathname)) setInterval(this.fixTwitterFileUrl.bind(this), 500);
		if (this.REGEX.EDIT_USER.test(window.location.pathname)) this.resizeAbout();
		setTimeout(() => {
			this.setupChecked();
		});
		this.DONE = true;
	}

	static addLoaded() {
		try {
			this.getElement("MENU").removeChild(this.getElement("MENU").querySelector("li.rm"));
			this.getElement("MENU").removeChild(this.getElement("MENU").querySelector("li#subnav-notloaded"));
		} catch (e) { }
		this.getElement("MENU").innerHTML += '<li>|</li><li id="subnav-loaded"><a href="javascript:window.location.reload()">Loaded</a></li>';
	}

	static getElement(e) {
		switch (e.toString().toUpperCase()) {
			case "EDIT": return document.querySelector("a#post-edit-link");
			case "MENU": return Array.from(document.querySelector("nav#nav").querySelectorAll("menu")).filter(v => v.classList.length === 0)[0];
			case "TAG_LIST": return Array.from(document.querySelectorAll("h2.tag-list-header")).map(v => ({ [v.classList[0].split("-")[0]]: v })).reduce((a, b) => ({ ...a, ...b }), {});
			case "PARENT_ID": return document.querySelector("input#post_parent_id");
			case "POSTS": return Array.from(document.querySelectorAll("section#content post"));
			case "EDIT_REASON": return document.querySelector("input#post_edit_reason");
			case "TAGS": return document.querySelector("textarea#post_tag_string");
			case "EXPLICIT": return document.querySelector("input[type=radio][value=e]");
			case "QUESTIONABLE": return document.querySelector("input[type=radio][value=q]");
			case "SAFE": return document.querySelector("input[type=radio][value=s]");
			case "RATING": return document.querySelector("span#post-rating-text");
			case "ABOUT": return document.querySelector("textarea[name='user[profile_about]']");
			case "EDIT": return document.querySelector("a#post-edit-link");
			case "HEADER": return document.querySelector("header#top");
			case "PAGINATOR": return document.querySelector("paginator");
			case "FILE": return document.querySelector("div#section-file").querySelector("input[type=text]");
			case "CHECK": return Array.from(document.querySelectorAll(".pv-post.pv-content"));
			default: return;
		}
	}

	static async fixTwitterFileUrl() {
		if (!document.hasFocus()) return;
		const v = await navigator.clipboard.readText();
		if (/^https:\/\/pbs\.twimg\.com\/media\/.*\?format=.*&name=.*$/.test(v)) {
			await navigator.clipboard.writeText(`${v.split("?")[0]}.jpg:orig`);
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="content-changed"><a href="javascript:void(0)">Content Changed.</a></li>';

		}
	}

	static addNotes() {
		if (this.REGEX.POST_LIST.test(window.location.pathname)) {
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="open"><a href="javascript:E621Utilities.openAllPosts()">Open All Posts</a></li>';
		}

		if (this.REGEX.POST.test(window.location.pathname)) {
			// remove useless links
			this.getElement("MENU").removeChild(document.querySelector("nav#nav menu li#subnav-hot"));
			this.getElement("MENU").removeChild(document.querySelector("nav#nav menu li#subnav-popular"));
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="hide-post"><a href="javascript:E621Utilities.hide(true)">Hide Post</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="hide-post"><a href="javascript:E621Utilities.toggleQuickEdits()">QE: <span id="t">Enabled</span></a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-1"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(1)">1 - Explicit Bulge</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-2"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(2)">2 - Penis Outline</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-3"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(3)">3 - Balls Outline</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-3"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(4)">4 - 2 & 3</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-5"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(5)">5 - Penis nv</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-6"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(6)">6 - Balls nv</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-7"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(7)">7 - 5 & 6</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-8"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(8)">8 - NB</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="locked"><a href="javascript:E621Utilities.markLocked()">Lock</a></li>';
		}
	}

	static hidePosts(p) {
		for (const h of p) {
			const e = document.querySelector(`post#entry_${h}`);
			if (e) {
				e.dataset.done = "true";
				this.HIDDEN++;
				e.style.border = "3px solid yellow";
			}
		}
	}

	static markLockedPosts(p) {
		for (const h of p) {
			const e = document.querySelector(`post#entry_${h}`);
			if (e) {
				e.dataset.locked = "true";
				e.style.border = "3px solid red";
			}
		}
	}

	static addPostCounts() {
		const p = this.getPage();
		const prev = this.POSTS_PER_PAGE * (p - 1);
		const cur = this.getElement("POSTS").length;
		const next = Number(Array.from(this.getElement("PAGINATOR").querySelectorAll("div.paginator-numbers a")).slice(-1)[0]?.innerText ?? 1) - p;
		const pag = this.POSTS_PER_PAGE * next;
		this.getElement("MENU").innerHTML += '<li>|</li>';
		this.getElement("MENU").innerHTML += `<li id="previous-posts"><a href="javascript:void(0)">${prev} Previous Post${prev === 1 ? "" : "s"} (${(p - 1)} Page${(p - 1) === 1 ? "" : "s"})</a></li>`;
		this.getElement("MENU").innerHTML += '<li>|</li>';
		this.getElement("MENU").innerHTML += `<li id="current-posts"><a href="javascript:void(0)">${cur} Current Post${cur === 1 ? "" : "s"}</a></li>`;
		this.getElement("MENU").innerHTML += '<li>|</li>';
		this.getElement("MENU").innerHTML += `<li id="hidden-posts"><a href="javascript:void(0)">${this.HIDDEN} Done Post${this.HIDDEN === 1 ? "" : "s"}</a></li>`;
		this.getElement("MENU").innerHTML += '<li>|</li>';
		this.getElement("MENU").innerHTML += `<li id="next-posts"><a href="javascript:void(0)">${pag} Next Post${pag === 1 ? "" : "s"} (${next} Page${(next - 1) === 1 ? "" : "s"})</a></li>`;

	}

	static collapseTags() {
		Object.entries(this.getElement("TAG_LIST")).map(e => e[1].click());
	}

	static async handle503() {
		const h = document.querySelector("h1");
		if (h && h.innerText === "503 Rate Limited") setTimeout(window.location.reload.bind(window.location), 2e3);
	}

	static setupQuickEdit() {
		document.addEventListener("keydown", (ev) => {
			if (this.KEYBINDS_DISABLED && ev.code !== "NumpadDecimal") return;
			if (ev.shiftKey) return;
			switch (ev.code) {
				case "Digit1": {
					if (this.getRating() !== "e") this.getElement("EXPLICIT")?.click();
					this.setEditReason("Explicit bulge.");
					break;
				}

				case "Digit2": {
					if (this.getRating() !== "e") this.getElement("EXPLICIT")?.click();
					this.setEditReason("Penis outline.");
					this.addTags("penis_outline");
					break;
				}

				case "Digit3": {
					if (this.getRating() !== "e") this.getElement("EXPLICIT")?.click();
					this.setEditReason("Balls outline.");
					this.addTags("balls_outline");
					break;
				}

				case "Digit4": {
					if (this.getRating() !== "e") this.getElement("EXPLICIT")?.click();
					this.setEditReason("Balls & penis outline.");
					this.addTags("balls_outline", "penis_outline");
					break;
				}

				case "Digit5": {
					this.setEditReason("Penis is not immediately visible.");
					this.removeTags("diphallism", "flaccid", "poking_out", "half-erect", "cock_ring", "hemipenes", "multi_penis");
					this.removeTagsFilter((t) => ["penis", "genital", "knot", "foreskin", "uncut", "circumcised", "in_panties"].some(v => t.indexOf(v) !== -1) && ["outline"].some(v => t.indexOf(v) === -1));
					break;
				}

				case "Digit6": {
					this.setEditReason("Balls are not immediately visible.");
					this.removeTags("backsack", "ball_fondling");
					this.removeTagsFilter((t) => ["balls", "genital", "in_panties"].some(v => t.indexOf(v) !== -1) && ["outline"].some(v => t.indexOf(v) === -1));
					break;
				}

				case "Digit7": {
					this.manuallyTriggerQuickEdit(5);
					this.manuallyTriggerQuickEdit(6);
					this.setEditReason("Penis & balls are not immediately visible.");
					break;
				}

				case "Digit8": {
					this.setEditReason("There is not a penis (clothing) bulge present.");
					this.removeTags("penis_outline", "balls_outline", "genital_outline");
					this.removeTagsFilter((t) => ["bulge", "penis_shaped_bulge"].some(v => t.indexOf(v) !== -1) && ["abdominal"].some(v => t.indexOf(v) === -1));
					break;
				}

				case "Digit9": {
					this.setEditReason("There are no directly visible genitals.");
					this.removeTagsFilter((t) =>
						["genital"].some(v => t.indexOf(v) !== -1) &&
						["outline", "genital_fluids"].some(v => t.indexOf(v) === -1)
					);
					setTimeout(() => this.getElement("QUESTIONABLE")?.click(), 750);
					break;
				}

				case "Digit0": {
					this.setEditReason("Anus is not immediately visible.");
					this.removeTagsFilter((t) => ["anus"].some(v => t.indexOf(v) !== -1));
					break;
				}

				/* case "Digit9": {
					this.markLocked();
					break;
				}

				case "Digit0": {
					this.hide(false);
					break;
				} */

				case "Numpad5": {
					if (this.getRating() !== "e") this.getElement("EXPLICIT")?.click();
					this.setEditReason("Sex toys are always explicit.");
					break;
				}

				case "Numpad1": {
					this.getElement("EXPLICIT")?.click();
					break;
				}

				case "Numpad2": {
					this.getElement("QUESTIONABLE")?.click();
					break;
				}

				case "Numpad3": {
					this.getElement("SAFE")?.click();
					break;
				}

				case "Numpad7": {
					this.addToSet(this.SETS.EXPLICIT);
					break;
				}

				case "Numpad8": {
					this.addToSet(this.SETS.QUESTIONABLE);
					break;
				}

				case "Numpad9": {
					this.addToSet(this.SETS.SAFE);
					break;
				}

				case "Numpad0": {
					document.querySelector("div.edit-submit.input input[name=commit]").click();
					break;
				}

				case "NumpadDecimal": {
					this.toggleQuickEdits();
					break;
				}

				default: return;
			}
		});

		document.addEventListener("keyup", () => {
			//const tt = t.value.split("\n").map(v => v.split(" ").filter(v => !["1", "2", "3"].includes(v)).join(" ")).join("\n");
			if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(this.getElement("PARENT_ID").value)) this.getElement("PARENT_ID").value = "";
			if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].some(v => this.getElement("TAGS").value.trim().endsWith(v))) this.getElement("TAGS").value = this.getElement("TAGS").value.slice(0, -1);
		});
	}

	static async openAllPosts() {
		const p = this.getElement("POSTS");
		for (const e of p) {
			if (e.dataset.locked === "true" || e.dataset.done === "true") continue;
			const w = window.open(`/posts/${e.id.split("_")[1]}?current=${this.getElement("POSTS").indexOf(e) + 1}&total=${this.getElement("POSTS").length}`);
			w.blur();
			window.focus();
			await new Promise((a, b) => {
				window.openTimeout = setTimeout(a, 5e3);
				w.addEventListener("load", () => {
					clearTimeout(window.openTimeout);
					a();
				});
			});
			delete window.openTimeout;
		}
	}

	static checkTagLockNSFW() {
		const tags = this.getTags();
		const lockTags = [
			"balls",
			"penis",
			"sheath",
			"genitals",

			"balls_outline",
			"penis_outline",
			"sheath_outline",
			"genital_outline",

			"bulge_frottage",
			"masturbation",
			"sex_toy"
		];
		for (const t of lockTags) {
			if (tags.includes(t)) {
				if (document.body.dataset.tagLock === "true") return;
				this.getElement("EXPLICIT").checked = true;
				this.getElement("QUESTIONABLE").disabled = true;
				this.getElement("SAFE").disabled = true;
				document.querySelector("label[for=post_blank]").innerText = `Rating (Locked: "${t}" tag)`;
				document.body.dataset.tagLock = true;
				return;
			}
		}

		if (document.body.dataset.tagLock === "true") {
			document.querySelector("label[for=post_blank]").innerText = "Rating";
			this.getElement("QUESTIONABLE").disabled = false;
			this.getElement("SAFE").disabled = false;
			document.body.dataset.tagLock = false;
		}
	}

	static resizeAbout() {
		this.getElement("ABOUT").style.height = "400px";
	}

	static openEditMode() {
		this.getElement("EDIT").click();
	}

	static setEditReason(e) {
		this.getElement("EDIT_REASON").value = e;
	}

	static getRating() {
		return this.getElement("RATING").innerText === "Safe" ? "s" : this.getElement("RATING").innerText === "Questionable" ? "q" : "e";
	}

	/** @returns {Array<string>} */
	static getTags() {
		return this.getElement("TAGS").value.trim().split("\n").map(v => v.trim().split(/\s/)).reduce((a, b) => a.concat(b), []);
	}

	/** @param {Array<string>} tags */
	static removeTags(...tags) {
		if (Array.isArray(tags[0])) tags = [...tags[0]];
		this.getElement("TAGS").value = this.getElement("TAGS").value.trim().split("\n").map(v => v.trim().split(/\s/).filter(j => !tags.includes(j)).join(" ")).join("\n");
	}

	/** @param {(tag: string) => boolean} f */
	static removeTagsFilter(f) {
		this.removeTags(...this.getElement("TAGS").value.trim().split("\n").map(v => v.trim().split(/\s/)).reduce((a, b) => a.concat(b)).filter(f));
	}

	/** @param {Array<string>} tags */
	static addTags(...tags) {
		this.getElement("TAGS").value = [...this.getElement("TAGS").value.split("\n"), tags.join(" ")].join("\n");
	}

	static manuallyTriggerQuickEdit(e) {
		this.openEditMode();
		const code = /^[0-9]$/.test(e) ? `Digit${e}` : e;
		document.dispatchEvent(new KeyboardEvent("keydown", { code }));
	}

	/**
	 * @param {string} [t]
	 * @returns {Promise<{ hidden: number[]; locked: number[]; } | number[]>}
	 */
	static async getHideList(t) {
		return fetch(`${this.BASE}${t ?? ""}`, {
			method: "GET"
		}).then(res => {
			if (res.status !== 200) {
				if (res.status === 404) return;
				alert("non-200/404");
			} else return res.json();
			// this.hidePosts()
		}).catch(alert);

	}

	static async hide(force = false) {
		const c = force || confirm("Are you sure you want to hide this post?");
		if (c === false) return alert("Cancelled.");
		else {
			const id = window.location.pathname.match(/\/posts\/([0-9]{2,})/)?.[1];
			if (!id) return alert("error.3");
			// padding isn't required, and it's easier to just toss it out
			return fetch(`${this.BASE}${encodeURIComponent(btoa("no-tags").replace(/=/g, ""))}/${id}`, {
				method: "PUT"
			}).then(res => {
				if (res.status !== 204) return alert("non-204");
				alert("Done, hidden.");
			}).catch(alert);
		}
	}

	static async setupChecked() {
		const l = await this.getHideList("ver");

		if (window.location.pathname === "/post_versions") {
			const { locked } = await this.getHideList();
			const c = this.getElement("CHECK");
			for (const v of c) {
				const j = v.querySelector("a");
				const id = Number(j.href.split("/posts/")[1]);
				if (locked.includes(id)) v.parentNode.style.border = "2px solid red";
				else if (l.includes(id)) v.parentNode.style.border = "2px solid purple";
				else {
					v.addEventListener("auxclick", (e) => {
						if (e.button !== 1) return;
						this.markChecked(id);
						v.parentNode.style.border = "2px solid purple";
					});
				}
			}
		} else if (window.location.pathname === "/posts") {
			const c = this.getElement("POSTS");
			for (const v of c) {
				const id = Number(v.id.split("_")[1]);
				if (l.includes(id) && v.style.border === undefined) v.style.border = "3px solid purple";
				else {
					v.addEventListener("auxclick", (e) => {
						if (e.button !== 1) return;
						this.markChecked(id);
						v.style.border = "3px solid purple";
					});
				}
			}
		}
	}

	static async markChecked(id) {
		return fetch(`${this.BASE}ver/${id}`, {
			method: "PUT"
		}).then(res => {
			if (res.status !== 204) return alert("non-204");
		}).catch(alert);
	}

	static enforceConsistentSpacing() {
		const n = window.location.search.replace(/\+/g, "%20");
		if (window.location.search !== n) window.history.replaceState(undefined, document.title, `${window.location.pathname}${n}`);
	}

	static getQuery() {
		return window.location.search.slice(1).split("&").map(v => ({
			[v.split("=")[0]]: v.split("=")[1]
		}))
			.reduce((a, b) => ({ ...a, ...b }), {});
	}

	static getPage() {
		const { page } = this.getQuery();
		return Number(page) || 1;
	}

	static changePage(p) {
		let q = this.getQuery();
		if (!q.page) q.page = 1;
		q.page++;
		if (p) q.page = p;
		q.lastEmpty = (Number(q.lastEmpty) || 0) + 1;
		if (q.lastEmpty > 3) return alert("More than 3 redirects, not continuing.");
		window.location.href = `${window.location.pathname}?${Object.entries(q).map(([a, b]) => `${a}=${b}`).join("&")}`;
	}

	static resetLastEmpty() {
		const q = this.getQuery();
		if (!q.lastEmpty) return;
		delete q.lastEmpty;
		window.history.replaceState(undefined, document.title, `${window.location.pathname}?${Object.entries(q).map(([a, b]) => `${a}=${b}`).join("&")}`);
	}

	static checkEmptyPosts() {
		if (this.getQuery().r === "false") return;
		if (this.getElement("POSTS").length === 0) this.changePage();
		else this.resetLastEmpty();
	}

	static getPostId() {
		return Danbooru.Post.currentPost().id ?? undefined;
	}

	static markLocked() {
		const id = this.getPostId();
		if (!id) return alert("error.3");
		return fetch(`${this.BASE}locked/${id}`, {
			method: "PUT"
		}).then(res => {
			if (res.status !== 204) return alert("non-204");
			alert("Done, locked.");
		}).catch(alert);
	}

	/** @param {boolean} [override] */
	static toggleQuickEdits(override) {
		override = override ?? !this.KEYBINDS_DISABLED;
		this.KEYBINDS_DISABLED = override;
		this.getElement("MENU").querySelector("li a span#t").innerText = this.KEYBINDS_DISABLED ? "Disabled" : "Enabled";
	}

	static async addToSet(id) {
		document.querySelector("#set").click();
		setTimeout(() => {
			const b = document.querySelector("#add-to-set-id");
			b.value = String(id);
			document.querySelector("#add-to-set-submit").click();
		}, 250);
		/* return fetch(`https://e621.net/post_sets/${id}/add_posts.json`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: `post_ids[]=${this.getPostId()}`
		})
			.then(async (res) => console.log(res.status, await res.json())); */
	}
}

window.E621Utilities = E621Utilities;

document.addEventListener("visibilitychange", () => {
	if (document.hidden === false) E621Utilities.load();
});
document.addEventListener("DOMContentLoaded", () => {
	try {
		Array.from(document.querySelector("nav#nav").querySelectorAll("menu")).filter(v => v.classList.length === 0).innerHTML += '<li class="rm">|</li><li id="subnav-notloaded"><a href="javascript:E621Utilities.load()">Not Loaded</a></li>';
	} catch (e) { }
	setTimeout(() => {
		if (document.hidden === false) E621Utilities.load();
	}, 500);
});;
