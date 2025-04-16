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
  solutionPath: [number, number][];
}

const CELL_SIZE = 80;
const RADIUS = 30;

// Generate a puzzle
function generatePuzzle(size: number): Puzzle {
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const solutionPath: [number, number][] = [];

  let r = 0, c = 0;
  while (r < size - 1 || c < size - 1) {
    solutionPath.push([r, c]);
    if (r === size - 1) c++;
    else if (c === size - 1) r++;
    else Math.random() < 0.5 ? r++ : c++;
  }
  solutionPath.push([r, c]);

  let expr = '';
  let current = Math.floor(Math.random() * 9) + 1;
  grid[solutionPath[0][0]][solutionPath[0][1]] = String(current);
  expr += current;

  const operators = ['+', '-', '*', '/'];

  for (let i = 1; i < solutionPath.length; i++) {
    const [row, col] = solutionPath[i];

    let value = '';
    if (i % 2 === 1) {
      // Operator step
      value = operators[Math.floor(Math.random() * operators.length)];
    } else {
      // Number step
      let num = Math.floor(Math.random() * 9) + 1;
      const op = grid[solutionPath[i - 1][0]][solutionPath[i - 1][1]];

      switch (op) {
        case '+':
          if (current + num > 100) num = Math.max(1, 100 - current);
          current += num;
          break;
        case '-':
          if (current - num < 0) num = Math.min(current, 9);
          current -= num;
          break;
        case '*':
          while (current * num > 100) num = Math.floor(Math.random() * 9) + 1;
          current *= num;
          break;
        case '/':
          // Try to make current divisible by num
          const divisors = Array.from({ length: 9 }, (_, i) => i + 1).filter(n => current % n === 0);
          num = divisors.length > 0 ? divisors[Math.floor(Math.random() * divisors.length)] : 1;
          current = Math.floor(current / num);
          break;
      }
      value = String(num);
    }

    grid[row][col] = value;
    expr += value;
  }

  const result = current;

  // Fill other cells with alternating numbers and operators
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!grid[row][col]) {
        const isEven = (row + col) % 2 === 0;
        grid[row][col] = isEven
          ? String(Math.floor(Math.random() * 9) + 1)
          : operators[Math.floor(Math.random() * operators.length)];
      }
    }
  }

  return { grid, result, solutionPath };
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

  const showSolution = () => {
    const solution = puzzle.solutionPath.map(([row, col]) =>
      cells.find((c) => c.row === row && c.col === col)!
    );
    setPath(solution);
  };

  const expression = path.map((c) => c.value).join('');
  let evaluated = NaN;
  try {
    evaluated = Math.floor(eval(expression));
  } catch (e) {}

  const isWin = path.length > 0 && path[path.length - 1]?.row === size - 1 && path[path.length - 1]?.col === size - 1 && evaluated === puzzle.result;

  return (
    <div className="">
      <h1 className="" style={{ textAlign: "center", fontSize: "1.1rem" }}>The Maths Maze</h1>

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
        <button
          className="px-4 py-2 bg-purple-500 text-white rounded"
          onClick={showSolution}
        >
          💡 Show Solution
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
      <div className="text-xl font-mono">= {isNaN(evaluated) ? '?' : evaluated}</div>
      <div className="text-xl font-bold text-green-600">{isWin ? '🎉 Congrats! You solved it!' : ''}</div>
      <div className="text-md">Goal: Reach <strong>{puzzle.result}</strong> from top-left to bottom-right</div>
    </div>
  );
}
