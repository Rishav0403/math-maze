import React, { useRef, useEffect, useState } from 'react';

type Cell = { x: number; y: number; row: number; col: number; value: string };

type Props = {
  grid: string[][];
  result: number;
  cellSize?: number;
};

const MathPuzzleConnector: React.FC<Props> = ({ grid, result, cellSize = 80 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [path, setPath] = useState<Cell[]>([]);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const numRows = grid.length;
  const numCols = grid[0].length;

  // Convert grid to list of cells with coordinates
  const getCells = (): Cell[] => {
    const cells: Cell[] = [];
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        cells.push({
          row,
          col,
          x: col * cellSize + cellSize / 2,
          y: row * cellSize + cellSize / 2,
          value: grid[row][col],
        });
      }
    }
    return cells;
  };

  const cells = getCells();

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid cells
    cells.forEach((cell) => {
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, 30, 0, 2 * Math.PI);
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

    // Draw selected path
    ctx.strokeStyle = 'dodgerblue';
    ctx.lineWidth = 3;
    ctx.beginPath();
    path.forEach((cell, idx) => {
      if (idx === 0) {
        ctx.moveTo(cell.x, cell.y);
      } else {
        ctx.lineTo(cell.x, cell.y);
      }
    });
    ctx.stroke();

    // Draw line while dragging
    if (path.length > 0 && hoverPos) {
      const last = path[path.length - 1];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(hoverPos.x, hoverPos.y);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [path, hoverPos, grid]);

  const getCellAt = (x: number, y: number): Cell | null => {
    return (
      cells.find(
        (cell) =>
          Math.hypot(cell.x - x, cell.y - y) <= 30 &&
          !path.some((p) => p.row === cell.row && p.col === cell.col)
      ) || null
    );
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cell = getCellAt(x, y);
    if (!cell) return;

    // If starting, ensure it's top-left
    if (path.length === 0 && (cell.row !== 0 || cell.col !== 0)) return;

    setPath([cell]);
    setHoverPos({ x, y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (path.length === 0) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverPos({ x, y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (path.length === 0) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = getCellAt(x, y);

    if (cell) {
      setPath([...path, cell]);
    }

    setHoverPos(null);
  };

  const expression = path.map((c) => c.value).join('');
  const value = safeEval(expression);
  const isCorrect = path.length > 0 && path.at(-1)?.row === numRows - 1 && path.at(-1)?.col === numCols - 1 && value === result;

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={numCols * cellSize}
        height={numRows * cellSize}
        style={{ border: '1px solid #ccc', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div className="text-lg font-mono">
        <span className="mr-2">Expression:</span>
        {expression || '–'}
      </div>
      <div className="text-lg font-mono">
        <span className="mr-2">= {value}</span>
        {isCorrect ? (
          <span className="text-green-600 font-bold ml-2">✔️ Correct!</span>
        ) : (
          path.length > 0 && <span className="text-red-600 font-bold ml-2">❌ Try again</span>
        )}
      </div>
    </div>
  );
};

// Simple left-to-right evaluator (no operator precedence)
function safeEval(expr: string): number | string {
  try {
    const tokens = expr.match(/\d+|[+*\-]/g);
    if (!tokens) return '';
    let result = parseInt(tokens[0]);
    for (let i = 1; i < tokens.length; i += 2) {
      const op = tokens[i];
      const num = parseInt(tokens[i + 1]);
      switch (op) {
        case '+':
          result += num;
          break;
        case '-':
          result -= num;
          break;
        case '*':
          result *= num;
          break;
      }
    }
    return result;
  } catch {
    return '';
  }
}

export default MathPuzzleConnector;
