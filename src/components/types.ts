export type KnownCell = [number, number, number];

export interface Cell {
  zone: number;
  values: number[];
  color: string;
}

export interface ZoneGridProps {
  knownCells?: KnownCell[];
}