// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import luck from "./luck.ts";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;
  readonly cacheSpawnProb: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(
    tileWidth: number,
    tileVisibilityRadius: number,
    cacheSpawnProb: number,
  ) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.cacheSpawnProb = cacheSpawnProb;
    this.knownCells = new Map<string, Cell>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = `${i}.${j}`;

    // Check if the cell already exists in the knownCells map
    if (!this.knownCells.has(key)) {
      // Add the cell to the map with its cacheSpawnProb value
      this.knownCells.set(key, cell);
    }

    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    // Convert geographic coordinates to grid coordinates (i, j)
    const i = Math.floor(point.lat / this.tileWidth);
    const j = Math.floor(point.lng / this.tileWidth);

    // Create a cell from the calculated (i, j) coordinates and get the canonical instance
    return this.getCanonicalCell({ i, j });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    // Calculate bounds for the cell based on its (i, j) coordinates
    const { i, j } = cell;
    const southWest = leaflet.latLng(
      i * this.tileWidth,
      j * this.tileWidth,
    );
    const northEast = leaflet.latLng(
      (i + 1) * this.tileWidth,
      (j + 1) * this.tileWidth,
    );
    return leaflet.latLngBounds(southWest, northEast);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    const { i, j } = originCell;

    // Create a range for surrounding cells within visibility radius
    const range = Array.from(
      { length: 2 * this.tileVisibilityRadius + 1 },
      (_, k) => k - this.tileVisibilityRadius,
    );

    // Push each visible cell into the resultCells array
    range.forEach((di) => {
      range.forEach((dj) => {
        if (luck([i + di, j + dj].toString()) < this.cacheSpawnProb) {
          const cell = this.getCanonicalCell({ i: i + di, j: j + dj });
          resultCells.push(cell);
        }
      });
    });
    console.log(resultCells);

    return resultCells;
  }
}
