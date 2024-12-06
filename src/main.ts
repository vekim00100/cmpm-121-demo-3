import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board, Cell } from "./board.ts";

// Location of our classroom
const playerLocation = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Create the map
const map = leaflet.map(document.getElementById("map")!, {
  center: playerLocation,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Add map tiles
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(playerLocation);
// playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Display the player's coins
let playerCoins = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = `You have ${playerCoins} coins.`;

// Create a Board
const board = new Board(
  TILE_DEGREES, // tileWidth
  NEIGHBORHOOD_SIZE, // tileVisibilityRadius
  CACHE_SPAWN_PROBABILITY, // cacheSpawnProb
);

// Add caches to the map by cell numbers
function spawnCache(cell: Cell) {
  const bounds = board.getCellBounds(cell);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds).addTo(map);

  // Each cache has a random point value
  let coinValue = Math.floor(luck(`${cell.i},${cell.j}, coins`) * 10) + 1;

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>Cache at (${cell.i}, ${cell.j}) contains <span id="coin-count">${coinValue}</span> coins.</div>
      <button id="collect">Collect</button>
      <button id="deposit">Deposit</button>
    `;

    popupDiv.querySelector<HTMLButtonElement>("#collect")!
      .addEventListener(
        "click",
        () => {
          if (coinValue != 0) {
            coinValue--;
            playerCoins++;
            statusPanel.innerHTML = `You have ${playerCoins} coins.`;
            popupDiv.querySelector("#coin-count")!.textContent = `${coinValue}`;
          }
        },
      );

    popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        if (playerCoins > 0) {
          coinValue++;
          playerCoins--;
          statusPanel.innerHTML = `You have ${playerCoins} coins.`;
          popupDiv.querySelector("#coin-count")!.textContent = `${coinValue}`;
        }
      },
    );

    return popupDiv;
  });
}

// Look around the player's neighborhood for caches to spawn
const cellsNearPlayer = board.getCellsNearPoint(playerLocation);

cellsNearPlayer.forEach((cell) => {
  spawnCache(cell);
});
