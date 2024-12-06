import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board, Cell, Coin } from "./board.ts";
import { Geocache } from "./memento.ts";

// Location of our classroom
let playerLocation = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4; // Granularity for movement
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
// const CACHE_RADIUS = 0.01; // Radius to check for nearby caches (in degrees)

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
playerMarker.addTo(map);

// Display the player's coins
let playerCoins = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = `You have ${playerCoins} coins.`;

// Create a Board
const board = new Board(
  TILE_DEGREES, // tileWidth
  NEIGHBORHOOD_SIZE, // tileVisibilityRadius
  CACHE_SPAWN_PROBABILITY, // cacheSpawnProb
);

let serialCounter = 0;
const collectedCoins: Coin[] = [];
const cacheStates: Map<string, string> = new Map();

updateVisibleCaches();
console.log("Initial Cache States:", Array.from(cacheStates.entries()));

function spawnCache(cell: Cell) {
  const cacheKey = `${cell.i}:${cell.j}`;
  let cache: Geocache;

  // If the cache has been previously saved, load its state
  if (cacheStates.has(cacheKey)) {
    cache = new Geocache(cell.i, cell.j, []);
    cache.fromMomento(cacheStates.get(cacheKey)!); // Restore cache state
  } else {
    // If the cache has not been saved, create a new one with random coins
    const coins: Coin[] = [];
    const totalCoins = Math.floor(luck(`${cell.i},${cell.j}, coins`) * 5) + 1;
    for (let k = 0; k < totalCoins; k++) {
      coins.push({ i: cell.i, j: cell.j, serial: serialCounter++ });
    }
    cache = new Geocache(cell.i, cell.j, coins);
  }

  // Store the cache state in the cacheStates map
  cacheStates.set(cacheKey, cache.toMomento());

  const bounds = board.getCellBounds(cell);
  const rect = leaflet.rectangle(bounds).addTo(map);

  // Bind popup to cache rectangle
  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");

    // Function to update popup content after a coin is collected or deposited
    const updatePopupContent = () => {
      // Create a string to display each coin's identity (i, j, serial)
      const coinInfo = cache.coins
        .map(
          (coin) => `Coin: ${coin.i}, ${coin.j} #${coin.serial}`,
        )
        .join("<br>");

      popupDiv.innerHTML = `
        <div>Cache at (${cache.i}, ${cache.j}) contains ${cache.coins.length} coins:</div>
        <div>${coinInfo}</div>
        <button id="collect">Collect</button>
        <button id="deposit">Deposit</button>
      `;

      // Collect button logic
      popupDiv.querySelector<HTMLButtonElement>("#collect")!.addEventListener(
        "click",
        (event) => {
          event.stopPropagation(); // Prevent the popup from closing
          event.preventDefault(); // Prevent any default behavior (closing)

          if (cache.coins.length > 0) {
            const coinToCollect = cache.coins.pop(); // Remove the coin from the cache
            if (coinToCollect) {
              collectedCoins.push(coinToCollect); // Track collected coins
              playerCoins++; // Increment the player's coin count
              statusPanel.innerHTML = `You have ${playerCoins} coins.`; // Update status panel

              // Update the cache state after collecting a coin
              cacheStates.set(cacheKey, cache.toMomento());

              // Update the popup content after collecting a coin
              updatePopupContent();
            }
          }
        },
      );

      // Deposit button logic
      popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
        "click",
        (event) => {
          event.stopPropagation(); // Prevent the popup from closing
          event.preventDefault(); // Prevent any default behavior (closing)

          const coinToDeposit = collectedCoins.pop(); // Remove the last collected coin from the player's collection
          if (coinToDeposit) {
            cache.coins.push(coinToDeposit); // Add the coin back to the cache
            playerCoins--; // Decrement the player's coin count
            statusPanel.innerHTML = `You have ${playerCoins} coins.`; // Update status panel

            // Update the cache state after depositing a coin
            cacheStates.set(cacheKey, cache.toMomento());

            // Update the popup content after depositing a coin
            updatePopupContent();
          }
        },
      );
    };

    // Initial popup content update
    updatePopupContent();

    return popupDiv;
  });
}

function updateVisibleCaches() {
  map.eachLayer((layer: leaflet.Layer) => {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });

  const cellsNearPlayer = board.getCellsNearPoint(playerLocation);
  cellsNearPlayer.forEach((cell) => {
    spawnCache(cell);
  });
}

// Replace updateCaches calls with updateVisibleCaches
document.getElementById("north")?.addEventListener("click", () => {
  playerLocation = leaflet.latLng(
    playerLocation.lat + TILE_DEGREES,
    playerLocation.lng,
  );
  playerMarker.setLatLng(playerLocation);
  updateVisibleCaches();
});

document.getElementById("south")?.addEventListener("click", () => {
  playerLocation = leaflet.latLng(
    playerLocation.lat - TILE_DEGREES,
    playerLocation.lng,
  );
  playerMarker.setLatLng(playerLocation);
  updateVisibleCaches();
});

document.getElementById("west")?.addEventListener("click", () => {
  playerLocation = leaflet.latLng(
    playerLocation.lat,
    playerLocation.lng - TILE_DEGREES,
  );
  playerMarker.setLatLng(playerLocation);
  updateVisibleCaches();
});

document.getElementById("east")?.addEventListener("click", () => {
  playerLocation = leaflet.latLng(
    playerLocation.lat,
    playerLocation.lng + TILE_DEGREES,
  );
  playerMarker.setLatLng(playerLocation);
  updateVisibleCaches();
});
