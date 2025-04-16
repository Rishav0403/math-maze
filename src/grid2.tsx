// MathPuzzleGame.tsx
import React, { useRef, useEffect, useState } from 'react';

// Types
interface Cell {
  x: number;
  y: number;
  row: number;
  col: number;
  value: string;
}

interface Puzzle {
  grid: string[][];
  result: number;
}

const CELL_SIZE = 80;
const RADIUS = 30;

// Generate a puzzle
function generatePuzzle(size: number): Puzzle {
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));

  // Fill with numbers and operators alternatively along a path
  const path: [number, number][] = [];
  let r = 0, c = 0;
  while (r < size - 1 || c < size - 1) {
    path.push([r, c]);
    if (r === size - 1) c++;
    else if (c === size - 1) r++;
    else Math.random() < 0.5 ? r++ : c++;
  }
  path.push([r, c]);

  let expr = '';
  path.forEach(([row, col], i) => {
    if (i % 2 === 0) {
      const num = Math.floor(Math.random() * 9) + 1;
      grid[row][col] = String(num);
      expr += num;
    } else {
      const op = Math.random() < 0.5 ? '+' : '-';
      grid[row][col] = op;
      expr += op;
    }
  });

  const result = eval(expr);

  // Fill other cells randomly
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!grid[row][col]) {
        grid[row][col] = (Math.random() < 0.5
          ? String(Math.floor(Math.random() * 9) + 1)
          : ['+', '-'][Math.floor(Math.random() * 2)]);
      }
    }
  }

  return { grid, result };
}

// Main Component
export default function MathPuzzleGame() {
  const [size, setSize] = useState(3);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle(3));
  const [path, setPath] = useState<Cell[]>([]);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cells: Cell[] = puzzle.grid.flatMap((row, rowIndex) =>
    row.map((value, colIndex) => ({
      row: rowIndex,
      col: colIndex,
      x: colIndex * CELL_SIZE + CELL_SIZE / 2,
      y: rowIndex * CELL_SIZE + CELL_SIZE / 2,
      value,
    }))
  );

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cells.forEach((cell) => {
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'black';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.value, cell.x, cell.y);
    });

    ctx.strokeStyle = 'dodgerblue';
    ctx.lineWidth = 3;
    ctx.beginPath();
    path.forEach((cell, i) => {
      if (i === 0) ctx.moveTo(cell.x, cell.y);
      else ctx.lineTo(cell.x, cell.y);
    });
    ctx.stroke();

    if (path.length && hoverPos) {
      const last = path[path.length - 1];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(hoverPos.x, hoverPos.y);
      ctx.strokeStyle = 'red';
      ctx.stroke();
    }
  }, [path, hoverPos, puzzle]);

  const getCellAt = (x: number, y: number): Cell | null => {
    return (
      cells.find(
        (cell) => Math.hypot(cell.x - x, cell.y - y) <= RADIUS &&
          !path.some((p) => p.row === cell.row && p.col === cell.col)
      ) || null
    );
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = getCellAt(x, y);
    if (cell && cell.row === 0 && cell.col === 0) {
      setPath([cell]);
      setHoverPos({ x, y });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!path.length) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverPos({ x, y });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!path.length) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = getCellAt(x, y);
    if (cell) setPath([...path, cell]);
    setHoverPos(null);
  };

  const expression = path.map((c) => c.value).join('');
  const isWin = path.length > 0 && path[path.length - 1]?.row === size - 1 && path[path.length - 1]?.col === size - 1 && eval(expression) === puzzle.result;

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold">🔢 Math Puzzle</h1>

      <div className="flex gap-2">
        {[3, 5, 7].map((n) => (
          <button
            key={n}
            className={`px-4 py-2 rounded ${size === n ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => {
              setSize(n);
              setPuzzle(generatePuzzle(n));
              setPath([]);
            }}
          >
            {n}x{n}
          </button>
        ))}
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={() => {
            setPuzzle(generatePuzzle(size));
            setPath([]);
          }}
        >
          🔄 New Puzzle
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={size * CELL_SIZE}
        height={size * CELL_SIZE}
        className="border shadow-md rounded"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      <div className="text-xl font-mono">Expression: {expression || '–'}</div>
      <div className="text-xl font-mono">= {eval(expression) || '?'}</div>
      <div className="text-xl font-bold text-green-600">{isWin ? '🎉 Congrats! You solved it!' : ''}</div>
      <div className="text-md">Goal: Reach <strong>{puzzle.result}</strong> from top-left to bottom-right</div>
    </div>
  );
}
