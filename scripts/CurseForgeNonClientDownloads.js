// ==UserScript==
// @name         CurseForge ModPack Non-Client Downloads
// @namespace    https://curseforge.com
// @version      1.0.0
// @description  Replaces client downloads with non-client downloads.
// @author       Donovan_DMC
// @match        https://www.curseforge.com/minecraft/modpacks/*/files
// @icon         https://www.google.com/s2/favicons?domain=curseforge.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/DonovanDMC/TampermonkeyScripts/master/scripts/CurseForgeNonClientDownloads.js
// @downloadURL  https://raw.githubusercontent.com/DonovanDMC/TampermonkeyScripts/master/scripts/CurseForgeNonClientDownloads.js
// ==/UserScript==

(function () {
	'use strict';

	Array.from(document.querySelectorAll("a")).filter(v => v.href.endsWith("client=y")).map(v => void (v.href = v.href.replace(/client=y/, "client=n")));
})();
