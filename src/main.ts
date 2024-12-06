import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board, Cell, Coin } from "./board.ts";

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

let serialCounter = 0; // To generate unique serial numbers
const collectedCoins: Coin[] = []; // Track the player's collected coins

function spawnCache(cell: Cell) {
  const bounds = board.getCellBounds(cell);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds).addTo(map);

  // Create coins for this cache
  const coins: Coin[] = [];
  const totalCoins = Math.floor(luck(`${cell.i},${cell.j}, coins`) * 5) + 1; // Random number of coins, here we spawn up to 5 coins

  for (let k = 0; k < totalCoins; k++) {
    const coin: Coin = {
      i: cell.i,
      j: cell.j,
      serial: serialCounter++, // Increment serial for each coin
    };
    coins.push(coin);
  }

  // Track remaining coins count for the cache
  let remainingCoins = totalCoins;

  // Handle interactions with the cache
  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");

    // Function to generate the list of coin identities
    const generateCoinList = () => {
      return coins
        .filter((coin) => coin !== null) // Filter out collected coins
        .map((coin) => `${coin.i}:${coin.j}#${coin.serial}`).join("<br>");
    };

    popupDiv.innerHTML = `
      <div>Cache at (${cell.i}, ${cell.j}) contains <span id="coin-count">${remainingCoins}</span> coins.</div>
      <div>Coins: <br>${generateCoinList()}</div> <!-- Display all coin identities -->
      <button id="collect">Collect</button>
      <button id="deposit">Deposit</button>
    `;

    // Collect button logic
    popupDiv.querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        if (coins.length > 0) {
          const coinToCollect = coins.pop(); // Remove the last coin from the list
          if (coinToCollect) {
            playerCoins++;
            remainingCoins--; // Decrement remaining coins
            collectedCoins.push(coinToCollect); // Store the collected coin
            statusPanel.innerHTML = `You have ${playerCoins} coins.`;
            popupDiv.querySelector("#coin-count")!.textContent =
              `${remainingCoins}`; // Update the remaining coins count
            popupDiv.querySelector("div:nth-of-type(2)")!.innerHTML =
              `Coins: <br>${generateCoinList()}`; // Update coin list display
          }
        }
      });

    // Deposit button logic
    popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        if (collectedCoins.length > 0) {
          const coinToDeposit = collectedCoins.pop(); // Get the last collected coin
          if (coinToDeposit) {
            playerCoins--;
            remainingCoins++; // Increase the cache's coin count

            // Deposit the collected coin back into the cache
            coins.push(coinToDeposit); // Add the same coin back to the cache's list

            statusPanel.innerHTML = `You have ${playerCoins} coins.`;
            popupDiv.querySelector("#coin-count")!.textContent =
              `${remainingCoins}`; // Update the cache's coin count
            popupDiv.querySelector("div:nth-of-type(2)")!.innerHTML =
              `Coins: <br>${generateCoinList()}`; // Update coin list display
          }
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
