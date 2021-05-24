// ==UserScript==
// @name         Antimatter Dimensions Autobuy
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  autobuy stuff
// @author       Donovan_DMC
// @match        https://ivark.github.io/
// @icon         https://www.google.com/s2/favicons?domain=github.io
// @grant        none
// @updateURL    https://raw.githubusercontent.com/DonovanDMC/TampermonkeyScripts/master/scripts/AntimatterDimensionsAutoBuy.js
// @downloadURL  https://raw.githubusercontent.com/DonovanDMC/TampermonkeyScripts/master/scripts/AntimatterDimensionsAutoBuy.js
// ==/UserScript==

(function () {
	'use strict';

	setInterval(() => {
		const t = document.querySelector("#tickSpeed");
		if (t.classList.contains("storebtn")) t.click();
		document.querySelector("#parent").querySelectorAll(".storebtn").forEach(e => {
			if (e.id.indexOf("Max") === -1) return;
			e.click();
		});
	}, 500);
})();
