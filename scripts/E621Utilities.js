// ==UserScript==
// @name         E621 Utilities
// @namespace    http://tampermonkey.net/
// @version      1.0.25
// @description  My various utilities for e621.
// @author       Donovan_DMC
// @match        https://e621.net/*
// @icon         https://www.google.com/s2/favicons?domain=e621.net
// @grant        none
// @updateURL    https://raw.githubusercontent.com/DonovanDMC/TampermonkeyScripts/master/scripts/E621Utilities.js
// @downloadURL  https://raw.githubusercontent.com/DonovanDMC/TampermonkeyScripts/master/scripts/E621Utilities.js
// @run-at       document-start
// ==/UserScript==


class E621Utilities {
	static POSTS_PER_PAGE = 75;
	static HIDE_LIST = [];
	static DONE = false;
	static REGEX = {
		POST_LIST: /^\/posts$/,
		POST: /^\/posts\/[0-9]{2,}$/,
		EDIT_USER: /^\/users\/[0-9]{1,}\/edit$/
	};
	static load() {
		if (this.DONE === true) return;
		this.enforceConsistentSpacing();
		this.handle503();
		this.addLoaded();
		this.addNotes();
		this.makeHeaderSticky();
		if (this.REGEX.POST_LIST.test(window.location.pathname)) {
			this.getHideList().then(v => {
				this.hidePosts([...v.hidden, ...this.HIDE_LIST]);
				this.markLockedPosts(v.locked);
				this.checkEmptyPosts();
				this.addPostCounts();
			});
		}
		if (this.REGEX.POST.test(window.location.pathname)) {
			this.setupQuickEdit();
			this.collapseTags();
		}
		if (this.REGEX.EDIT_USER.test(window.location.pathname)) this.resizeAbout();
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
			case "MENU": return document.querySelector("nav#nav").querySelectorAll("menu")[1];
			case "TAG_LIST": return Array.from(document.querySelectorAll("h2.tag-list-header")).map(v => ({ [v.classList[0].split("-")[0]]: v })).reduce((a, b) => ({ ...a, ...b }), {});
			case "PARENT_ID": return document.querySelector("input#post_parent_id");
			case "POSTS": return Array.from(document.querySelectorAll("div#posts-container article"));
			case "EDIT_REASON": return document.querySelector("input#post_edit_reason");
			case "TAGS": return document.querySelector("textarea#post_tag_string");
			case "EXPLICIT": return document.querySelector("input[type=radio][value=e]");
			case "QUESTIONABLE": return document.querySelector("input[type=radio][value=q]");
			case "SAFE": return document.querySelector("input[type=radio][value=s]");
			case "ABOUT": return document.querySelector("textarea[name='user[profile_about]']");
			case "EDIT": return document.querySelector("a#post-edit-link");
			case "HEADER": return document.querySelector("header#top");
			case "PAGINATOR": return document.querySelector("div.paginator");
			default: return;
		}
	}

	static addNotes() {
		if (this.REGEX.POST_LIST.test(window.location.pathname)) {
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="open"><a href="javascript:E621Utilities.openAllPosts()">Open All Posts</a></li>';
		}

		if (this.REGEX.POST.test(window.location.pathname)) {
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="hide-post"><a href="javascript:E621Utilities.hide(true)">Hide Post</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-1"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(1)">1 - Explicit Bulge</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-2"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(2)">2 - Penis Outline</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-3"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(3)">3 - 1 & 2</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-4"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(4)">4 - Balls Outline</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-5"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(5)">5 - Balls not vis</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-6"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(6)">6 - Penis not vis</a></li>';
			this.getElement("MENU").innerHTML += '<li>|</li>';
			this.getElement("MENU").innerHTML += '<li id="digit-7"><a href="javascript:E621Utilities.manuallyTriggerQuickEdit(7)">7 - 5 & 6</a></li>';
		}
	}

	static makeHeaderSticky() {
		this.getElement("HEADER").style.position = "sticky";

		this.getElement("HEADER").style.top = "0";
	}

	static hidePosts(p) {
		for (const h of p) {
			const e = document.querySelector(`article#post_${h}`);
			if (e) e.parentNode.removeChild(e);
		}
	}

	static markLockedPosts(p) {
		for (const h of p) {
			const e = document.querySelector(`article#post_${h}`);
			if (e) e.style.border = "1px solid red";
		}
	}

	static addPostCounts() {
		const p = this.getPage();
		const prev = this.POSTS_PER_PAGE * (p - 1);
		const cur = this.getElement("POSTS").length;
		const hid = this.POSTS_PER_PAGE - cur;
		const next = Number(Array.from(this.getElement("PAGINATOR").querySelectorAll("li.numbered-page")).slice(-1)[0].innerText) - p;
		const pag = this.POSTS_PER_PAGE * next;
		this.getElement("MENU").innerHTML += '<li>|</li>';
		this.getElement("MENU").innerHTML += `<li id="previous-posts"><a href="javascript:void(0)">${prev} Previous Post${prev === 1 ? "" : "s"} (${(p - 1)} Page${(p - 1) === 1 ? "" : "s"})</a></li>`;
		this.getElement("MENU").innerHTML += '<li>|</li>';
		this.getElement("MENU").innerHTML += `<li id="current-posts"><a href="javascript:void(0)">${cur} Current Post${cur === 1 ? "" : "s"}</a></li>`;
		this.getElement("MENU").innerHTML += '<li>|</li>';
		this.getElement("MENU").innerHTML += `<li id="hidden-posts"><a href="javascript:void(0)">${hid} Hidden Post${hid === 1 ? "" : "s"}</a></li>`;
		this.getElement("MENU").innerHTML += '<li>|</li>';
		this.getElement("MENU").innerHTML += `<li id="next-posts"><a href="javascript:void(0)">${pag} Next Post${pag === 1 ? "" : "s"} (${(next - 1)} Page${(next - 1) === 1 ? "" : "s"})</a></li>`;

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
			switch (ev.code) {
				case "Digit1": {
					this.getElement("EXPLICIT").click();
					this.getElement("EDIT_REASON").value = "Explicit bulge.";
					break;
				}

				case "Digit2": {
					this.getElement("EXPLICIT").click();
					this.getElement("EDIT_REASON").value = "Penis outline.";
					break;
				}

				case "Digit3": {
					this.getElement("EXPLICIT").click();
					this.getElement("EDIT_REASON").value = "Explicit bulge, penis outline.";
					break;
				}

				case "Digit4": {
					this.getElement("EXPLICIT").click();
					this.getElement("EDIT_REASON").value = "Balls outline.";
					break;
				}

				case "Digit5": {
					this.getElement("EDIT_REASON").value = "Balls are not immediately visible.";
					this.removeTags("balls", "genitals", "backsack", "big_balls", "hyper_balls", "huge_balls", "hyper_genitalia");
					break;
				}

				case "Digit6": {
					this.getElement("EDIT_REASON").value = "Penis is not immediately visible.";
					this.removeTags("penis", "genitals", "big_penis", "hyper_penis", "hyper_genitalia");
					break;
				}

				case "Digit7": {
					this.getElement("EDIT_REASON").value = "Penis & balls are not immediately visible.";
					this.removeTags("penis", "genitals", "big_penis", "hyper_penis", "hyper_genitalia", "penis", "genitals", "big_penis", "hyper_penis");
					break;
				}

				case "Digit9": {
					this.markLocked();
					break;
				}

				case "Digit0": {
					this.hide(false);
					break;
				}

				case "Numpad1": {
					this.getElement("EXPLICIT").click();
					break;
				}

				case "Numpad2": {
					this.getElement("QUESTIONABLE").click();
					break;
				}

				case "Numpad3": {
					this.getElement("SAFE").click();
					break;
				}
				default: return;
			}
		});

		document.addEventListener("keyup", () => {
			//const tt = t.value.split("\n").map(v => v.split(" ").filter(v => !["1", "2", "3"].includes(v)).join(" ")).join("\n");
			if (["1", "2", "3", "4", "5", "6", "7"].includes(this.getElement("PARENT_ID").value)) this.getElement("PARENT_ID").value = "";
			if (["1", "2", "3", "4", "5", "6", "7"].some(v => this.getElement("TAGS").value.trim().endsWith(v))) this.getElement("TAGS").value = this.getElement("TAGS").value.slice(0, -1);
		});
	}

	static async openAllPosts() {
		for (const e of this.getElement("POSTS")) {
			const w = window.open(`${e.querySelector("a").href}&current=${this.getElement("POSTS").indexOf(e) + 1}&total=${this.getElement("POSTS").length}`);
			w.blur();
			window.focus();
			await new Promise((a, b) => w.onload = a);
		}
	}

	static resizeAbout() {
		this.getElement("ABOUT").style.height = "400px";
	}

	static openEditMode() {
		this.getElement("EDIT").click();
	}

	static removeTags(...tags) {
		this.getElement("TAGS").value = this.getElement("TAGS").value.trim().split("\n").map(v => v.trim().split(/\s/).filter(j => !tags.includes(j)).join(" ")).join("\n");
	}

	static manuallyTriggerQuickEdit(e) {
		this.openEditMode();
		const code = /^[0-9]$/.test(e) ? `Digit${e}` : e;
		document.dispatchEvent(new KeyboardEvent("keydown", { code }));
	}

	/**
	 * 
	 * @returns {Promise<{ hidden: number[]; locked: number[]; }>}
	 */
	static async getHideList() {
		return fetch("https://e621-hide.local/", {
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
			const { q: tags } = this.getQuery();
			const id = window.location.pathname.match(/\/posts\/([0-9]{2,})/)?.[1];
			if (!tags) return alert("error.2");
			if (!id) return alert("error.3");
			return fetch(`https://e621-hide.local/${md5(decodeURIComponent(tags || "no-tags"))}/${id}`, {
				method: "PUT"
			}).then(res => {
				if (res.status !== 204) return alert("non-204");
				alert("Done.");
			}).catch(alert);
		}
	}

	static enforceConsistentSpacing() {
		const n = window.location.search.replace(/%20/g, "+");
		if (window.location.search !== n) window.location.href = `${window.location.pathname}${n}`;
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
		window.location.href = `${window.location.pathname}?${Object.entries(q).map(([a, b]) => `${a}=${b}`).join("&")}`;
	}

	static checkEmptyPosts() {
		if (this.getElement("POSTS").length === 0) this.changePage();
		else this.resetLastEmpty();
	}

	static markLocked() {
		const c = force || confirm("Are you sure you want to hide this post?");
		if (c === false) return alert("Cancelled.");
		else {
			const { q: tags } = this.getQuery();
			const id = window.location.pathname.match(/\/posts\/([0-9]{2,})/)?.[1];
			if (!tags) return alert("error.2");
			if (!id) return alert("error.3");
			return fetch(`https://e621-hide.local/locked/${id}`, {
				method: "PUT"
			}).then(res => {
				if (res.status !== 204) return alert("non-204");
				alert("Done.");
			}).catch(alert);
		}
	}
}

window.E621Utilities = E621Utilities;

document.addEventListener("visibilitychange", () => {
	if (document.hidden === false) E621Utilities.load();
});
document.addEventListener("DOMContentLoaded", () => {
	/* md5 script */
	const scr = document.createElement("script");
	scr.src = "https://www.myersdaily.org/joseph/javascript/md5.js";
	document.querySelector("head").appendChild(scr);

	try {
		document.querySelector("nav#nav").querySelectorAll("menu")[1].innerHTML += '<li class="rm">|</li><li id="subnav-notloaded"><a href="javascript:E621Utilities.load()">Not Loaded</a></li>';
	} catch (e) { }
	setTimeout(() => {
		if (document.hidden === false) E621Utilities.load();
	}, 500);
});
