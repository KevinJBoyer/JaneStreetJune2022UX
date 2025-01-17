import { Cell } from "./types";

export const step = (grid: Cell[][]): Cell[][] => {
  const allCells = grid.flat();

  let prevUnknownValues = 0;
  let currentUnknownValues = totalUnknownValues(grid);
  while (prevUnknownValues !== currentUnknownValues) {
    prevUnknownValues = currentUnknownValues;

    removeKnownCellValuesFromOthersInZone(allCells);
    eliminateKnownWithinTaxicab(grid);
    onlyOneCandidateTaxicabAway(grid);
    checkZonesForSingleCellsWithPossibleValue(allCells);
    cellHasCandidateMatchInOtherZone(grid);

    currentUnknownValues = totalUnknownValues(grid);
  }

  // Todo: sudoku style constraint solving (2 cells with 2 guess == no other cell can have those)

  return grid;
};

export const backtrack = (grid: Cell[][], depth: number): Cell[][] | null => {
  const firstUnknownCell = grid.flat().find((cell) => cell.values.length > 1);
  if (firstUnknownCell === undefined) {
    return grid;
  }

  const [row, col] = findRowColOfCell(grid, firstUnknownCell) as [
    number,
    number
  ];

  for (let possibleValue of firstUnknownCell.values) {
    if (depth < 3)
      console.log(
        `Trying ${possibleValue} in ${row}, ${col} (depth: ${depth}), of ${firstUnknownCell.values}`
      );
    let nextGrid = JSON.parse(JSON.stringify(grid)) as Cell[][];
    nextGrid[row][col].values = [possibleValue];
    nextGrid = step(nextGrid);
    if (isValidGrid(nextGrid)) {
      let result = backtrack(nextGrid, depth + 1);
      if (result !== null) {
        return result;
      }
    }
  }

  return null;
};

const findRowColOfCell = (
  grid: Cell[][],
  cell: Cell
): [number, number] | null => {
  for (let [rowIndex, row] of grid.entries()) {
    for (let [colIndex, candidateCell] of row.entries()) {
      if (cell === candidateCell) {
        return [rowIndex, colIndex];
      }
    }
  }
  return null;
};

const totalUnknownValues = (grid: Cell[][]): number => {
  return grid.flat().reduce((acc, cell) => acc + cell.values.length, 0) - 100;
};

const isValidGrid = (grid: Cell[][]): Boolean => {
  return grid.flat().every((cell) => cell.values.length > 0);
};

const removeKnownCellValuesFromOthersInZone = (allCells: Cell[]) => {
  // If we know the value of a cell, then that's not a possible value for any other
  // cells in the same zone
  for (let knownCell of allCells.filter((cell) => cell.values.length === 1)) {
    for (let otherCellInZone of allCells.filter(
      (otherCell) =>
        knownCell !== otherCell && otherCell.zone === knownCell.zone
    )) {
      otherCellInZone.values = otherCellInZone.values.filter(
        (val) => val !== knownCell.values[0]
      );
    }
  }
};

const eliminateKnownWithinTaxicab = (grid: Cell[][]) => {
  // If we know the value of a cell, no cells within that taxicab distance
  // can have that as a possible value

  const travel = (
    grid: Cell[][],
    rowIndex: number,
    colIndex: number,
    originalCell: Cell,
    stepsRemaining: number
  ) => {
    if (
      rowIndex < 0 ||
      rowIndex > 9 ||
      colIndex < 0 ||
      colIndex > 9 ||
      stepsRemaining < 0
    ) {
      return;
    }

    // Don't remove this from the original cell!
    if (grid[rowIndex][colIndex] !== originalCell) {
      grid[rowIndex][colIndex].values = grid[rowIndex][colIndex].values.filter(
        (val) => val !== originalCell.values[0]
      );
    }

    travel(grid, rowIndex - 1, colIndex, originalCell, stepsRemaining - 1);
    travel(grid, rowIndex + 1, colIndex, originalCell, stepsRemaining - 1);
    travel(grid, rowIndex, colIndex - 1, originalCell, stepsRemaining - 1);
    travel(grid, rowIndex, colIndex + 1, originalCell, stepsRemaining - 1);
  };

  for (let [rowIndex, row] of grid.entries()) {
    for (let [colIndex, cell] of row.entries()) {
      if (cell.values.length === 1) {
        travel(grid, rowIndex, colIndex, cell, cell.values[0] - 1);
      }
    }
  }
};

const onlyOneCandidateTaxicabAway = (grid: Cell[][]) => {
  // If a cell has a known value, and there is only one other
  // cell with that possible value in a different zone
  // exactly the taxicab distance away, then that other cell
  // most have that value

  for (let [rowIndex, row] of grid.entries()) {
    for (let [colIndex, cell] of row.entries()) {
      if (cell.values.length === 1) {
        const candidateCells = findCellsNAway(
          grid,
          rowIndex,
          colIndex,
          cell.values[0]
        );
        const candidateCellsInOtherZones = candidateCells.filter(
          (c) => c.zone !== cell.zone
        );
        if (candidateCellsInOtherZones.length === 1) {
          candidateCellsInOtherZones[0].values =
            candidateCellsInOtherZones[0].values.filter(
              (value) => value === cell.values[0]
            );
        }
      }
    }
  }
};

const findCellsNAway = (
  grid: Cell[][],
  rowIndex: number,
  colIndex: number,
  n: number
): Cell[] => {
  // Utility function

  let possibleCoords: [number, number][] = [];

  let coord: [number, number] = [rowIndex - n, colIndex];
  let d: [number, number] = [1, 1];
  do {
    possibleCoords.push([coord[0], coord[1]]);
    if (coord[0] == rowIndex && coord[1] == colIndex + n) d = [1, -1];
    if (coord[0] == rowIndex + n && coord[1] == colIndex) d = [-1, -1];
    if (coord[0] == rowIndex && coord[1] == colIndex - n) d = [-1, 1];

    coord[0] += d[0];
    coord[1] += d[1];
  } while (!(coord[0] == rowIndex - n && coord[1] == colIndex));
  possibleCoords = possibleCoords.filter(
    (coord) => coord[0] >= 0 && coord[0] < 10 && coord[1] >= 0 && coord[1] < 10
  );
  return possibleCoords.map((coord) => grid[coord[0]][coord[1]]);
};

const checkZonesForSingleCellsWithPossibleValue = (allCells: Cell[]) => {
  // If a zone only has one cell with a possible value,
  // that cell must be that possible value

  // Only need to check the cells we don't already know
  for (let cell of allCells.filter((cell) => cell.values.length > 1)) {
    for (let value of cell.values) {
      const otherCellsInZoneWithValue = allCells.filter(
        (otherCell) =>
          otherCell !== cell &&
          otherCell.zone == cell.zone &&
          otherCell.values.includes(value)
      );
      if (otherCellsInZoneWithValue.length === 0) {
        cell.values = [value];
      }
    }
  }
};

const cellHasCandidateMatchInOtherZone = (grid: Cell[][]) => {
  // For a cell to have a possible value,
  // there must be a cell N steps away in a different zone with that
  // as a possible value, otherwise the original cell can't have that
  // as a possible value

  for (let [rowIndex, row] of grid.entries()) {
    for (let [colIndex, cell] of row.entries()) {
      for (let possibleValue of cell.values) {
        let candidates = findCellsNAway(
          grid,
          rowIndex,
          colIndex,
          possibleValue
        ).filter(
          (otherCell) =>
            otherCell.zone !== cell.zone &&
            otherCell.values.includes(possibleValue)
        );
        if (candidates.length === 0) {
          cell.values = cell.values.filter((value) => value !== possibleValue);
        }
      }
    }
  }
};
