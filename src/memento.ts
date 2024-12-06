import { Coin } from "./board.ts"; // Ensure Coin is properly imported

// Define the structure of the cache state to resolve the 'any' type warning
interface CacheState {
  i: number;
  j: number;
  coins: Coin[];
}

export interface Memento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

export class Geocache implements Memento<string> {
  i: number;
  j: number;
  coins: Coin[];

  constructor(i: number, j: number, coins: Coin[]) {
    this.i = i;
    this.j = j;
    this.coins = coins;
  }

  // Serialize the state of the cache
  toMomento(): string {
    return JSON.stringify({
      i: this.i,
      j: this.j,
      coins: this.coins,
    });
  }

  // Restore the state of the cache
  fromMomento(momento: string): void {
    // Parse the string and cast it to CacheState to avoid 'any' type
    const state: CacheState = JSON.parse(momento);
    this.i = state.i;
    this.j = state.j;
    this.coins = state.coins;
  }
}
