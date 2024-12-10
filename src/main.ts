// last one
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

// Create the polyline for movement history
const movementHistory: leaflet.LatLng[] = []; // Array to store movement points
const movementPolyline = leaflet.polyline([], { color: "blue", weight: 3 })
  .addTo(map);

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

function updatePlayerLocation(newLocation: leaflet.LatLng) {
  playerLocation = newLocation;
  playerMarker.setLatLng(playerLocation);
  map.setView(playerLocation); // Center map immediately
  movementHistory.push(playerLocation); // Add new position to movement history

  // Update polyline with the new path
  movementPolyline.setLatLngs(movementHistory);

  updateVisibleCaches();
}

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
              saveGameState();
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
            saveGameState();
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
  map.setView(playerLocation);

  // Start drawing polyline after first move
  movementHistory.push(playerLocation); // Add new position to movement history
  movementPolyline.setLatLngs(movementHistory); // Update polyline

  updateVisibleCaches();
  updatePlayerLocation(playerLocation);
  saveGameState();
});

document.getElementById("south")?.addEventListener("click", () => {
  playerLocation = leaflet.latLng(
    playerLocation.lat - TILE_DEGREES,
    playerLocation.lng,
  );
  playerMarker.setLatLng(playerLocation);
  map.setView(playerLocation);

  // Start drawing polyline after first move
  movementHistory.push(playerLocation); // Add new position to movement history
  movementPolyline.setLatLngs(movementHistory); // Update polyline

  updateVisibleCaches();
  updatePlayerLocation(playerLocation);
  saveGameState();
});

document.getElementById("west")?.addEventListener("click", () => {
  playerLocation = leaflet.latLng(
    playerLocation.lat,
    playerLocation.lng - TILE_DEGREES,
  );
  playerMarker.setLatLng(playerLocation);
  map.setView(playerLocation);

  // Start drawing polyline after first move
  movementHistory.push(playerLocation); // Add new position to movement history
  movementPolyline.setLatLngs(movementHistory); // Update polyline

  updateVisibleCaches();
  updatePlayerLocation(playerLocation);
  saveGameState();
});

document.getElementById("east")?.addEventListener("click", () => {
  playerLocation = leaflet.latLng(
    playerLocation.lat,
    playerLocation.lng + TILE_DEGREES,
  );
  playerMarker.setLatLng(playerLocation);
  map.setView(playerLocation);

  // Start drawing polyline after first move
  movementHistory.push(playerLocation); // Add new position to movement history
  movementPolyline.setLatLngs(movementHistory); // Update polyline

  updateVisibleCaches();
  updatePlayerLocation(playerLocation);
  saveGameState();
});

// Global variable to track whether auto update is enabled
let autoUpdateEnabled: boolean = false;

// Global variable to store the interval ID for clearing later (use `number` for Deno or browser)
let geoUpdateInterval: number | undefined;

// Add a button event listener to toggle auto update
const geoButton = document.getElementById("sensor")!; // Assuming you have the id "sensor" for the geo button

geoButton.addEventListener("click", () => {
  autoUpdateEnabled = !autoUpdateEnabled;

  if (autoUpdateEnabled) {
    // Start updating the player's position automatically
    geoButton.style.backgroundColor = "green"; // Change button color to green when enabled
    startGeolocationUpdates();

    // Log when location updates are enabled
    console.log("Location updates enabled.");
  } else {
    // Stop updating the player's position automatically
    geoButton.style.backgroundColor = ""; // Reset the button color when disabled
    stopGeolocationUpdates();

    // Log when location updates are disabled
    console.log("Location updates disabled.");
  }
});

let previousLocation = playerLocation; // Track previous location
const moveThreshold = 0.0001; // Define a threshold for movement (in degrees)

// Function to initialize the game and set the starting position
function initializeGame() {
  // Mark the starting position on the map and polyline
  movementHistory.push(playerLocation); // Add initial player location to movement history
  movementPolyline.setLatLngs(movementHistory); // Update the polyline with the initial point
  map.setView(playerLocation); // Center the map on the starting position
  playerMarker.setLatLng(playerLocation); // Place the marker at the starting location
}

initializeGame();

function startGeolocationUpdates() {
  if (navigator.geolocation) {
    // Immediately fetch the current position and center the map
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const newLocation = leaflet.latLng(lat, lng);

        // Update player location and center map
        playerLocation = newLocation;
        playerMarker.setLatLng(playerLocation);
        map.setView(playerLocation); // Center map immediately
        updateVisibleCaches(); // Update visible caches

        // Log the location update
        console.log(`Player location updated to: (${lat}, ${lng})`);

        // Set the new location as the previous location
        previousLocation = newLocation;
      },
      (error) => {
        console.error("Error getting geolocation: ", error);
      },
    );

    // Start periodic updates
    geoUpdateInterval = globalThis.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const newLocation = leaflet.latLng(lat, lng);

          // Only update if the distance exceeds the threshold
          const distance = previousLocation.distanceTo(newLocation);
          if (distance > moveThreshold) {
            playerLocation = newLocation;
            playerMarker.setLatLng(playerLocation);
            map.setView(playerLocation); // Auto-center the map
            updateVisibleCaches();

            // Log movement and update previous location
            console.log(`Player moved to: (${lat}, ${lng})`);
            previousLocation = newLocation;
          }
        },
        (error) => {
          console.error("Error getting geolocation: ", error);
        },
      );
    }, 1000); // Update every second
  }
}

// Function to stop geolocation updates
function stopGeolocationUpdates() {
  if (geoUpdateInterval !== undefined) {
    globalThis.clearInterval(geoUpdateInterval); // Use globalThis.clearInterval to stop the interval
  }
}

interface GameState {
  playerLocation: { lat: number; lng: number };
  playerCoins: number;
  cacheStates: Record<string, string>;
  collectedCoins: Coin[];
  movementHistory: leaflet.LatLng[];
}

function saveGameState() {
  const gameState: GameState = {
    playerLocation: {
      lat: playerLocation.lat,
      lng: playerLocation.lng,
    },
    playerCoins,
    cacheStates: Object.keys(cacheStates).reduce(
      (obj: Record<string, string>, key: string) => {
        obj[key] = cacheStates.get(key)!;
        return obj;
      },
      {},
    ),
    collectedCoins,
    movementHistory,
  };

  localStorage.setItem("gameState", JSON.stringify(gameState));
  console.log("Game state saved:");
}

function loadGameState() {
  const savedState = localStorage.getItem("gameState");
  if (savedState) {
    const gameState: GameState = JSON.parse(savedState);
    console.log("Loaded game state:", gameState);

    playerLocation = leaflet.latLng(
      gameState.playerLocation.lat,
      gameState.playerLocation.lng,
    );
    playerMarker.setLatLng(playerLocation);
    map.setView(playerLocation);

    // Restore movement history and update polyline
    movementHistory.length = 0; // Clear any existing history
    movementHistory.push(...gameState.movementHistory); // Restore the saved history
    movementPolyline.setLatLngs(movementHistory); // Update the polyline with the restored history

    playerCoins = gameState.playerCoins;
    statusPanel.innerHTML = `You have ${playerCoins} coins.`;

    cacheStates.clear();
    for (const key in gameState.cacheStates) {
      if (Object.prototype.hasOwnProperty.call(gameState.cacheStates, key)) {
        cacheStates.set(key, gameState.cacheStates[key]);
      }
    }

    collectedCoins.length = 0;
    collectedCoins.push(...gameState.collectedCoins);

    updateVisibleCaches();
  } else {
    console.log("No saved game state found.");
  }
}

document.getElementById("reset")?.addEventListener("click", resetGameState);

globalThis.addEventListener("load", () => {
  loadGameState(); // Restore game state if it exists
});

function resetGameState() {
  const userResponse = prompt(
    "Type 'YES' to erase your game state and reset the game.",
  );

  if (userResponse === "YES") {
    localStorage.removeItem("gameState");
    location.reload(); // Reload the game to reset
  } else {
    console.log("Game state reset canceled.");
  }
}

globalThis.addEventListener("load", loadGameState);
