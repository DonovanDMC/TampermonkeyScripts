// ==UserScript==
// @name         Remove Discord guilds.join Scope
// @namespace    https://discord.com
// @version      1.0.1
// @description  Remove the guilds.join scope from oauth urls.
// @author       Donovan_DMC
// @match        https://discord.com/oauth2/authorize*
// @icon         https://www.google.com/s2/favicons?domain=discord.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/DonovanDMC/TampermonkeyScripts/master/RemoveDiscordGuildsDotJoinScope.js
// @downloadURL  https://raw.githubusercontent.com/DonovanDMC/TampermonkeyScripts/master/RemoveDiscordGuildsDotJoinScope.js
// ==/UserScript==

(function () {
	'use strict';

	const query = window.location.href.split("?")[1].split("&").map(v => ({ [v.split("=")[0]]: v.split("=")[1] })).reduce((a, b) => ({ ...a, ...b }), {});
	const o = String(query.scope);
	query.scope = decodeURIComponent(query.scope).split(" ").filter(j => j !== "guilds.join").join(query.scope.indexOf("+") !== -1 ? "+" : "%20");
	if (o !== query.scope) window.location.href = `${window.location.href.split("?")[0]}?${Object.entries(query).map(([a, b]) => `${a}=${b}`).join("&")}`;
})();
