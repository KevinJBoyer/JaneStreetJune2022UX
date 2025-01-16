export type KnownCell = [number, number, number];

export interface Cell {
  zone: number;
  value: number | null;
  possibleValues: number[];
  color: string;
}

export interface ZoneGridProps {
  knownCells?: KnownCell[];
}