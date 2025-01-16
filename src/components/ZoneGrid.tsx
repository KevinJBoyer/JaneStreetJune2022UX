import React, { useState, useEffect, useMemo } from "react";
import _ from "lodash";
import { Cell, ZoneGridProps } from "./types";

// Most of this code written by Claude to generate the UI!
// The actual solving code goes in performStep

export const ZoneGrid: React.FC<ZoneGridProps> = ({
  knownCells = [
    [0, 1, 3],
    [0, 5, 7],
    [1, 3, 4],
    [2, 9, 2],
    [3, 3, 1],
    [4, 0, 6],
    [4, 2, 1],
    [5, 7, 3],
    [5, 9, 6],
    [6, 6, 2],
    [7, 1, 2],
    [8, 6, 6],
    [9, 4, 5],
    [9, 8, 2],
  ],
}) => {
  const sampleZones = useMemo(
    () => [
      [0, 1, 1, 1, 2, 2, 2, 2, 2, 2],
      [0, 0, 1, 1, 1, 2, 3, 3, 2, 2],
      [0, 0, 4, 4, 5, 5, 6, 3, 7, 7],
      [0, 0, 8, 4, 9, 6, 6, 6, 7, 7],
      [0, 8, 8, 9, 9, 10, 11, 6, 6, 7],
      [0, 12, 8, 13, 14, 10, 15, 15, 7, 7],
      [0, 16, 17, 13, 13, 13, 15, 18, 18, 18],
      [16, 16, 17, 19, 13, 20, 21, 22, 22, 21],
      [16, 16, 16, 19, 19, 21, 21, 22, 22, 21],
      [16, 16, 16, 16, 19, 19, 21, 21, 21, 21],
    ],
    []
  );

  const colorSchemes = useMemo(
    () => [
      { h: 0, s: 70, l: 60 }, // Red
      { h: 30, s: 90, l: 45 }, // Orange
      { h: 60, s: 80, l: 50 }, // Yellow
      { h: 120, s: 60, l: 40 }, // Green
      { h: 180, s: 70, l: 55 }, // Cyan
      { h: 240, s: 80, l: 65 }, // Blue
      { h: 280, s: 75, l: 45 }, // Purple
      { h: 320, s: 85, l: 55 }, // Pink
      { h: 20, s: 50, l: 50 }, // Brown
      { h: 40, s: 60, l: 45 }, // Orange-brown
      { h: 150, s: 65, l: 40 }, // Forest green
      { h: 200, s: 75, l: 60 }, // Sky blue
      { h: 260, s: 70, l: 50 }, // Violet
      { h: 340, s: 80, l: 60 }, // Rose
      { h: 90, s: 65, l: 45 }, // Olive
      { h: 170, s: 75, l: 35 }, // Deep teal
      { h: 290, s: 60, l: 55 }, // Lavender
      { h: 15, s: 85, l: 50 }, // Rust
      { h: 45, s: 70, l: 55 }, // Golden
      { h: 210, s: 80, l: 45 }, // Royal blue
      { h: 300, s: 65, l: 40 }, // Deep purple
      { h: 160, s: 75, l: 40 }, // Emerald
    ],
    []
  );

  const generateColor = useMemo(
    () =>
      (zoneId: number): string => {
        const scheme = colorSchemes[zoneId % colorSchemes.length];
        return `hsla(${scheme.h}, ${scheme.s}%, ${scheme.l}%, 0.3)`;
      },
    [colorSchemes]
  );

  const [grid, setGrid] = useState<Cell[][]>([]);

  // Initialize grid only once when component mounts
  useEffect(() => {
    const zoneCounts: { [key: number]: number } = {};
    sampleZones.forEach((row) => {
      row.forEach((zone) => {
        zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
      });
    });

    const initialGrid: Cell[][] = sampleZones.map((row) => {
      return row.map((zone) => ({
        zone,
        value: null,
        possibleValues: _.range(1, zoneCounts[zone] + 1),
        color: generateColor(zone),
      }));
    });

    // Apply known cells
    knownCells.forEach(([row, col, value]) => {
      if (initialGrid[row] && initialGrid[row][col]) {
        initialGrid[row][col].value = value;
      }
    });

    setGrid(initialGrid);
  }, []); // Empty dependency array since we only want to initialize once

  const performStep = (currentGrid: Cell[][]): Cell[][] => {
    // Deep clone the grid to avoid mutating state directly
    const nextGrid = JSON.parse(JSON.stringify(currentGrid)) as Cell[][];

    const flatCells = nextGrid.flat();

    // Hygiene: if a cell's value is known, restrict possibleValues to just that value
    for (let cell of flatCells.filter((cell) => cell.value)) {
      cell.possibleValues = [cell.value!];
    }

    // If there's only one possible value for the cell, update it
    for (let cell of flatCells) {
      if (cell.possibleValues.length === 1) {
        cell.value = cell.possibleValues[0];
      }
    }

    // For each cell with a known value in a zone, remove that from the
    // possible values of the other cells in the zone
    for (let cell of flatCells) {
      if (cell.value) {
        for (let otherCell of flatCells.filter(
          (otherCell) => otherCell.zone == cell.zone
        )) {
          otherCell.possibleValues = otherCell.possibleValues.filter(
            (val) => val != cell.value
          );
        }
      }
    }

    // TODO: Remove possible values from known cells in zone
    // E.g., if there's a "5" in the zone

    // Sophia:
    // Use taxicab radiaii for known values!
    // Especially for higher digits (e.g., 6) -- there will
    // be fewer cells that can hold that number
    for (let [rowIndex, row] of grid.entries()) {
      for (let [colIndex, cell] of row.entries()) {
        if (cell.value) {
          const candidates = findCellsNAway(
            grid,
            rowIndex,
            colIndex,
            cell.value
          );
          const filteredCandidates = candidates.filter((candidateCell) =>
            candidateCell.possibleValues.includes(cell.value!)
          );
          if (filteredCandidates.length == 1) {
            filteredCandidates[0].value = cell.value;
          }
        }
      }
    }

    // Jakub:
    // You can eliminate from possibleValues anything closer
    // So cells that are closer than taxi-cab distance 6 can't
    // be 6, etc.
    eliminateKnownWithinTaxicab(grid);

    return nextGrid;
  };

  const findCellsNAway = (
    grid: Cell[][],
    rowIndex: number,
    colIndex: number,
    stepsRemaining: number
  ): Cell[] => {
    if (rowIndex < 0 || rowIndex > 9 || colIndex < 0 || colIndex > 9) {
      return [];
    }
    if (stepsRemaining == 0) {
      return [grid[rowIndex][colIndex]];
    }

    return [
      ...findCellsNAway(grid, rowIndex - 1, colIndex, stepsRemaining - 1),
      ...findCellsNAway(grid, rowIndex + 1, colIndex, stepsRemaining - 1),
      ...findCellsNAway(grid, rowIndex, colIndex - 1, stepsRemaining - 1),
      ...findCellsNAway(grid, rowIndex, colIndex + 1, stepsRemaining - 1),
    ];
  };

  const eliminateKnownWithinTaxicab = (grid: Cell[][]) => {
    const travel = (
      grid: Cell[][],
      rowIndex: number,
      colIndex: number,
      valueToEliminate: number,
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

      grid[rowIndex][colIndex].possibleValues = grid[rowIndex][
        colIndex
      ].possibleValues.filter((val) => val != valueToEliminate);

      travel(
        grid,
        rowIndex - 1,
        colIndex,
        valueToEliminate,
        stepsRemaining - 1
      );
      travel(
        grid,
        rowIndex + 1,
        colIndex,
        valueToEliminate,
        stepsRemaining - 1
      );
      travel(
        grid,
        rowIndex,
        colIndex - 1,
        valueToEliminate,
        stepsRemaining - 1
      );
      travel(
        grid,
        rowIndex,
        colIndex + 1,
        valueToEliminate,
        stepsRemaining - 1
      );
    };

    for (let [rowIndex, row] of grid.entries()) {
      for (let [colIndex, cell] of row.entries()) {
        if (cell.value) {
          travel(grid, rowIndex, colIndex, cell.value, cell.value - 1);
        }
      }
    }
  };

  const handleStep = () => {
    setGrid((currentGrid) => performStep(currentGrid));
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="grid grid-cols-10 gap-1 mb-4">
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="aspect-square border border-gray-300 p-1 text-xs flex items-center justify-center"
              style={{ backgroundColor: cell.color }}
            >
              <div className="text-center">
                {cell.value !== null ? (
                  <span className="font-bold text-lg">{cell.value}</span>
                ) : (
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {cell.possibleValues.map((val) => (
                      <span key={val} className="text-[0.6rem]">
                        {val}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <button
        onClick={handleStep}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Step
      </button>
    </div>
  );
};

export default ZoneGrid;
