// ==UserScript==
// @name         Performance Checker
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Displays FPS and such
// @author       elytrafae
// @match        https://*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    var lastFrame = null;
	var fps = [];
	var networkLagListHidden = true;
	
	window.requestAnimFrame = (function() {
		return window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function(callback, element) {
				window.setTimeout(function() {
					callback(+new Date);
				}, 1000 / 60);
			};
	})();
	
	var hud = document.createElement("DIV");
	hud.style = "position: fixed; top: 0; right: 0; background-color: black; border: 2px solid white; z-index: 999999; user-select: auto;"
	document.body.appendChild(hud);
	
	var fpsText = document.createElement("P");
	hud.appendChild(fpsText);
	
	var networkLagButton = document.createElement("BUTTON");
	networkLagButton.innerHTML = "Toggle Network Lag Log";
	hud.appendChild(networkLagButton);
	
	var networkLagList = document.createElement("UL");
	networkLagList.style = "display: none; max-height: 400px; max-width: 500px; overflow-y: auto;";
	hud.appendChild(networkLagList);
	
	//var socketGroups = {};
	
	networkLagButton.onclick = () => {
		networkLagListHidden = !networkLagListHidden;
		networkLagList.style.display = networkLagListHidden ? "none" : "block";
	}
	
	
	function showfps() {
		var averageFps = fps.length == 0 ? 0 : Math.round(fps.reduce((partialSum, a) => partialSum + a, 0) / fps.length);
		fps = []; // Clear array
		fpsText.innerHTML = averageFps + " FPS";
		var color = "#EEEEEE";
		if (averageFps < 50) {
			color = "#FF0000";
		} else if (averageFps < 58) {
			color = "#D3D602";
		}
		fpsText.style.color = color;
		setTimeout(showfps, 1000);
	}

    function fpsloop() {
		if (!lastFrame) {
			lastFrame = performance.now();
			requestAnimFrame(fpsloop);
			return;
		}
		var delta = (performance.now() - lastFrame) / 1000;
		lastFrame = performance.now();
		fps.push(1 / delta);
		requestAnimFrame(fpsloop);
    }
	fpsloop();
	setTimeout(showfps, 100);
	
	
	
	// Socket Watcher :hue:
	function AddNetworkWarningEntry(title, data, isBig = true) {
		var listElement = document.createElement("LI");
		listElement.innerHTML = title;
		listElement.style.color = isBig ? "#FF0000" : "#D3D602";
		
		var elementData = document.createElement("DIV");
		elementData.innerText = data;
		elementData.style = "padding: 5px; display: none; color: #AAAAAA"; // Represents my mental state pretty well
		
		listElement.onclick = () => {
			if (elementData.style.display === "none") {
				elementData.style.display = "block";
			} else {
				elementData.style.display = "none";
			}
		}
		
		networkLagList.appendChild(listElement);
		networkLagList.appendChild(elementData);
	}
	
	var OldWebSocketClass = window.WebSocket;
	class CustomWebSocket extends window.WebSocket {
		constructor() {
			super(...arguments);
			this._fae_startTime = null;
			console.log("Web socket created :3");
			if (this.url.includes("chat")) {
				console.log("Web socket is chat! Not logging! >:(")
				return; // Dirty workaround to exclude chat from readings. Should be removed later!
			}
			this.addEventListener("message", (event) => {
				if (this._fae_startTime) {
					var delta = performance.now() - this._fae_startTime;
					var deltaSec = delta/1000;
					if (deltaSec >= 0.5) {
						AddNetworkWarningEntry("Time between message send and receive: " + deltaSec + " seconds", event.data, deltaSec >= 1);
					}
					this._fae_startTime = null;
				}
			});
			this.addEventListener("error", (event) => {
				if (this._fae_startTime) {
					var delta = performance.now() - this._fae_startTime;
					var deltaSec = delta/1000;
					AddNetworkWarningEntry("Message error in " + deltaSec + " seconds", event.data || event.error, true);
					this._fae_startTime = null;
				} else {
					AddNetworkWarningEntry("Message error with no recorded time!", event.data || event.error, true);
				}
			});
		}
		
		send() {
			super.send(...arguments);
			this._fae_startTime = performance.now();
		}
	}
	
	window.WebSocket = CustomWebSocket;

})();