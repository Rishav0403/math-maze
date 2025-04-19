import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles, Trophy, RefreshCw, Lightbulb, Info, X } from 'lucide-react';

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

// Constants
const CELL_SIZE = 80;
const RADIUS = 30;
const COLORS = {
  primary: '#4f46e5', // indigo-600
  secondary: '#e879f9', // fuchsia-400
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  background: '#f3f4f6', // gray-100
  text: '#1f2937', // gray-800
  lightText: '#6b7280', // gray-500
};

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

export default function MathPuzzleGame() {
  const [size, setSize] = useState(3);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle(3));
  const [path, setPath] = useState<Cell[]>([]);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [animateWin, setAnimateWin] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameStats, setGameStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    bestTime: Infinity,
  });
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number | null>(null);

  const cells: Cell[] = puzzle.grid.flatMap((row, rowIndex) =>
    row.map((value, colIndex) => ({
      row: rowIndex,
      col: colIndex,
      x: colIndex * CELL_SIZE + CELL_SIZE / 2,
      y: rowIndex * CELL_SIZE + CELL_SIZE / 2,
      value,
    }))
  );

  const expression = path.map((c) => c.value).join('');
  let evaluated = NaN;
  try {
    // Sequential evaluation (left to right)
    const expr = expression;
    let result = parseInt(expr[0]);
    for (let i = 1; i < expr.length; i += 2) {
      const op = expr[i];
      const num = parseInt(expr[i + 1]);
      if (op === '+') result += num;
      else if (op === '-') result -= num;
      else if (op === '*') result *= num;
      else if (op === '/') result = Math.floor(result / num);
    }
    evaluated = result;
  } catch (e) {}
  const isWin = path.length > 0 && 
                path[path.length - 1].row === size - 1 && 
                path[path.length - 1].col === size - 1 && 
                evaluated === puzzle.result;

  // Handle win condition
  useEffect(() => {
    if (isWin && !animateWin) {
      setAnimateWin(true);
      setShowConfetti(true);
      setIsTimerRunning(false);
      
      // Update stats
      setGameStats(prev => ({
        gamesPlayed: prev.gamesPlayed + 1,
        gamesWon: prev.gamesWon + 1,
        bestTime: Math.min(prev.bestTime, timer)
      }));
      
      // Save to localStorage
      const savedStats = localStorage.getItem('mathMazeStats');
      const parsedStats = savedStats ? JSON.parse(savedStats) : { gamesPlayed: 0, gamesWon: 0, bestTime: Infinity };
      const newStats = {
        gamesPlayed: parsedStats.gamesPlayed + 1,
        gamesWon: parsedStats.gamesWon + 1,
        bestTime: Math.min(parsedStats.bestTime, timer)
      };
      localStorage.setItem('mathMazeStats', JSON.stringify(newStats));
      
      // Schedule confetti to stop
      setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
    }
  }, [isWin, animateWin, timer]);

  // Timer logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Start timer when path begins
  useEffect(() => {
    if (path.length === 1 && !isTimerRunning) {
      setIsTimerRunning(true);
    }
  }, [path.length, isTimerRunning]);

  // Confetti animation
  useEffect(() => {
    if (!showConfetti || !confettiCanvasRef.current) return;
    
    const canvas = confettiCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speed: number;
      angle: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];
    
    // Create particles
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 2,
        color: [
          '#ff577f', '#ff884b', '#feca57', '#32ff7e', 
          '#7efff5', '#18dcff', '#7d5fff', '#cd84f1'
        ][Math.floor(Math.random() * 8)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }
    
    const animate = () => {
      if (!showConfetti) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
        
        p.y += p.speed;
        p.x += Math.sin(p.angle) * 0.5;
        p.rotation += p.rotationSpeed;
        
        if (p.y > canvas.height) {
          p.y = -p.size;
          p.x = Math.random() * canvas.width;
        }
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }, [showConfetti]);
  
  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, size * CELL_SIZE);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(size * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw start and end indicators
    ctx.fillStyle = 'rgba(74, 222, 128, 0.2)'; // light green
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    ctx.fillStyle = 'rgba(248, 113, 113, 0.2)'; // light red
    ctx.fillRect((size-1) * CELL_SIZE, (size-1) * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    // Draw cells
    cells.forEach((cell) => {
      const isInPath = path.some(p => p.row === cell.row && p.col === cell.col);
      const isStartOrEnd = (cell.row === 0 && cell.col === 0) || 
                          (cell.row === size - 1 && cell.col === size - 1);
      const isOperator = ['+', '-', '*', '/'].includes(cell.value);
      
      // Cell background
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, RADIUS, 0, 2 * Math.PI);
      
      // Choose cell color based on type and state
      if (isInPath) {
        ctx.fillStyle = isOperator ? '#d8b4fe' : '#93c5fd'; // purple for operators, blue for numbers
      } else {
        ctx.fillStyle = isOperator ? '#f5f3ff' : '#ffffff'; // light purple for operators, white for numbers
      }
      
      if (isStartOrEnd) {
        ctx.fillStyle = cell.row === 0 && cell.col === 0 ? '#bbf7d0' : '#fecaca'; // green for start, red for end
      }
      
      ctx.fill();
      
      // Cell border
      ctx.strokeStyle = isInPath ? COLORS.primary : 'rgba(0,0,0,0.2)';
      ctx.lineWidth = isInPath ? 3 : 1.5;
      ctx.stroke();

      // Cell text
      ctx.fillStyle = isOperator ? '#7c3aed' : '#1f2937'; // purple for operators, dark for numbers
      ctx.font = `bold ${isOperator ? '24px' : '22px'} 'Nunito', san-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.value, cell.x, cell.y);

      // Add subtle shadow for depth
      if (!isInPath) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
      } else {
        ctx.shadowColor = 'transparent';
      }
    });

    // Reset shadow for path drawing
    ctx.shadowColor = 'transparent';
    
    // Draw connection path
    if (path.length > 1) {
      ctx.strokeStyle = COLORS.primary;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      path.forEach((cell, i) => {
        if (i === 0) ctx.moveTo(cell.x, cell.y);
        else ctx.lineTo(cell.x, cell.y);
      });
      ctx.stroke();
      
      // Add glow effect
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.3)';
      ctx.lineWidth = 10;
      ctx.stroke();
    }

    // Draw hover line
    if (path.length && hoverPos) {
      const last = path[path.length - 1];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(hoverPos.x, hoverPos.y);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }, [path, hoverPos, puzzle, size]);

  const getCellAt = useCallback((x: number, y: number): Cell | null => {
    // Add neighbor check to only allow connecting to adjacent cells
    const lastCell = path.length > 0 ? path[path.length - 1] : null;
    
    return cells.find(cell => {
      // Check if within radius
      if (Math.hypot(cell.x - x, cell.y - y) > RADIUS) return false;
      
      // Check if not already in path
      if (path.some(p => p.row === cell.row && p.col === cell.col)) return false;
      
      // If we have a path started, only allow adjacent cells (horizontal, vertical)
      if (lastCell) {
        const rowDiff = Math.abs(cell.row - lastCell.row);
        const colDiff = Math.abs(cell.col - lastCell.col);
        
        // Can only move one cell at a time, either horizontally or vertically
        if (!((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1))) {
          return false;
        }
      }
      
      return true;
    }) || null;
  }, [cells, path]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (isWin) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = getCellAt(x, y);
    
    if (cell) {
      // If we're starting fresh, only allow starting from top-left
      if (path.length === 0 && (cell.row !== 0 || cell.col !== 0)) {
        return;
      }
      
      setPath([...path, cell]);
      setHoverPos({ x, y });
    } else if (path.length > 0) {
      // Allow undoing the last move by clicking away
      setPath(path.slice(0, -1));
      setHoverPos(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!path.length || isWin) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Provide hover feedback only when near valid cells
    const hoverCell = getCellAt(x, y);
    if (hoverCell) {
      setHoverPos({ x: hoverCell.x, y: hoverCell.y });
    } else {
      setHoverPos({ x, y });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!path.length || isWin) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = getCellAt(x, y);
    
    if (cell) {
      // Check if this completes a valid path
      const newPath = [...path, cell];
      setPath(newPath);
    }
    
    setHoverPos(null);
  };

  const startNewGame = useCallback(() => {
    setPuzzle(generatePuzzle(size));
    setPath([]);
    setAnimateWin(false);
    setTimer(0);
    setIsTimerRunning(false);
    setGameStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1
    }));
  }, [size]);

  const showSolution = () => {
    const solution = puzzle.solutionPath.map(([row, col]) =>
      cells.find((c) => c.row === row && c.col === col)!
    );
    setPath(solution);
    setIsTimerRunning(false);
  };

  const formatTime = (seconds: number) => {
    if (seconds === Infinity) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTutorial = () => {
    setShowTutorial(!showTutorial);
  };

  return (
    <div className="math-maze-container">
    {/* Game Header */}
    <div className="game-header">
      <div className="header-title">
        <Sparkles className="icon-yellow" size={24} />
        <h1 className="title-gradient">Math Maze</h1>
      </div>
      <div className="header-actions">
        <button onClick={toggleTutorial} className="info-button" aria-label="How to play">
          <Info size={20} className="icon-gray" />
        </button>
      </div>
    </div>

    {/* Tutorial Modal */}
    {showTutorial && (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title">How to Play</h2>
            <button onClick={toggleTutorial} className="close-button">
              <X size={20} className="icon-gray" />
            </button>
          </div>
          <div className="modal-body">
            <p>🎯 <strong>Goal:</strong> Create a path from the top-left to bottom-right that calculates to the target number.</p>
            <p>🔢 <strong>Rules:</strong></p>
            <ul>
              <li>Start at the top-left cell</li>
              <li>Move horizontally or vertically to adjacent cells</li>
              <li>The path alternates between numbers and operators</li>
              <li>Reach the bottom-right with a calculation equal to the target number</li>
            </ul>
            <p>👆 <strong>Controls:</strong> Click on cells to build your path. Click away from the path to undo the last move.</p>
          </div>
          <button onClick={toggleTutorial} className="modal-button">Got it!</button>
        </div>
      </div>
    )}

    {/* Game stats */}
    <div className="game-stats">
      <div className="stats-time">
        <div className="text-sm">Time</div>
        <div className="stat-value">{formatTime(timer)}</div>
      </div>
      <div className="stats-time">
        <div className="text-sm">Best</div>
        <div className="stat-value">{formatTime(gameStats.bestTime)}</div>
      </div>
      <div className="target-box">
        <span className="target-label">Target:</span>
        <span className="target-value">{puzzle.result}</span>
      </div>
    </div>

    {/* Controls */}
    <div className="controls">
      <div className="grid-size-controls">
        {[3, 4, 5, 7].map((n) => (
          <button
            key={n}
            className={`size-button ${size === n ? 'active' : ''}`}
            onClick={() => {
              setSize(n);
              setPuzzle(generatePuzzle(n));
              setPath([]);
              setTimer(0);
              setIsTimerRunning(false);
            }}
          >
            {n}×{n}
          </button>
        ))}
      </div>
      <div className="action-buttons">
        <button className="action-button new-game" onClick={startNewGame}>
          <RefreshCw size={16} />
          New
        </button>
        <button className="action-button hint" onClick={showSolution}>
          <Lightbulb size={16} />
          Hint
        </button>
      </div>
    </div>

    {/* Game Canvas */}
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={size * CELL_SIZE}
        height={size * CELL_SIZE}
        className="game-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: 'none' }}
      />
      {isWin && (
        <div className="win-overlay">
          <div className="win-message">
            <Trophy className="mr-2" />
            Solved!
          </div>
        </div>
      )}
    </div>

    {/* Expression */}
    <div className="expression-panel">
      <div className="text-sm">Expression</div>
      <div className="expression">{expression || '–'} = {isNaN(evaluated) ? '?' : evaluated}</div>
    </div>

    <div className="gesture-guide">
      <p>Tap on cells to build your path • Tap away to undo</p>
    </div>

    {showConfetti && (
      <canvas ref={confettiCanvasRef} className="confetti-canvas" />
    )}
  </div>
  );
}