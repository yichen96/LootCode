import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode, type CSSProperties, type ChangeEvent } from "react";
import SAMPLE_PROBLEMS from "./leetcode_problems.json";

// --- TYPES ---
interface Example {
  input: string;
  output: string;
  explanation: string;
}

interface MCQ {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface CodeBlock {
  id: string;
  code: string;
}

interface CodePuzzleData {
  description: string;
  blocks: CodeBlock[];
  distractors?: CodeBlock[];
  correctOrder: (string | string[])[];
}

interface Problem {
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  examples: Example[];
  constraints: string[];
  mcq: MCQ[];
  codePuzzle: CodePuzzleData;
}

// --- PROMPT TEMPLATE ---
const PROMPT_TEMPLATE = `I need you to convert the following LeetCode problems into a specific JSON data format for my practice app. For each problem number I provide, generate a JSON object following this EXACT structure. Return ONLY a valid JSON array, no other text.

**Format for each problem:**
\`\`\`json
{
  "id": <problem_number>,
  "title": "<problem_title>",
  "difficulty": "Easy" | "Medium" | "Hard",
  "description": "<full problem description with markdown formatting>",
  "examples": [
    {
      "input": "<input as string>",
      "output": "<output as string>",
      "explanation": "<explanation or empty string>"
    }
  ],
  "constraints": ["<constraint1>", "<constraint2>"],
  "mcq": [
    {
      "question": "What algorithm/data structure should the best solution use?",
      "options": ["<wrong1>", "<correct>", "<wrong2>", "<wrong3>"],
      "correct": <index_of_correct_option_0_based>,
      "explanation": "<why this is the best approach, 2-3 sentences>"
    },
    {
      "question": "What is the time complexity of the best solution?",
      "options": ["<option1>", "<option2>", "<option3>", "<option4>"],
      "correct": <index_of_correct_option_0_based>,
      "explanation": "<why, 2-3 sentences>"
    },
    {
      "question": "What is the space complexity of the best solution?",
      "options": ["<option1>", "<option2>", "<option3>", "<option4>"],
      "correct": <index_of_correct_option_0_based>,
      "explanation": "<why, 2-3 sentences>"
    }
  ],
  "codePuzzle": {
    "description": "Arrange the correct code blocks to form the solution. Beware — some lines are distractors!",
    "blocks": [
      { "id": "a", "code": "<line1>" },
      { "id": "b", "code": "<line2>" }
    ],
    "distractors": [
      { "id": "x1", "code": "<plausible_but_wrong_line1>" },
      { "id": "x2", "code": "<plausible_but_wrong_line2>" },
      { "id": "x3", "code": "<plausible_but_wrong_line3>" }
    ],
    "correctOrder": ["a", ["b", "c"], "d"]
  }
}
\`\`\`

**Rules:**
- For MCQ options, randomize the position of the correct answer (don't always put it at index 1).
- For the code puzzle, use the optimal Python solution. Each block should be one logical line with proper indentation preserved. Use letter IDs (a, b, c...) for correct blocks.
- **correctOrder format**: A flat string ID means that line must be at exactly that position. An array of IDs like \`["b", "c"]\` means those lines are interchangeable — they must all appear in that slot but in any order. Use this for lines where ordering doesn't matter (e.g. two variable declarations that are independent). Example: \`["a", ["b", "c"], "d", "e"]\` means line "a" first, then "b" and "c" in either order, then "d", then "e".
- Include exactly 3 distractor lines (id: "x1", "x2", "x3"). Distractors must be plausible-looking Python code that could trick someone — e.g. a similar but wrong variable assignment, an alternative loop that doesn't work, sorting when sorting isn't needed, or an off-by-one style mistake. They should have correct indentation for where someone might try to place them. Do NOT make distractors obviously wrong (like syntax errors).
- Make MCQ wrong answers plausible — they should be real algorithms/complexities, not obviously wrong.
- Description should use backticks for code terms.

**Here are the LeetCode problem numbers I want:**
`;

// --- ICONS ---
const Icons = {
  timer: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  copy: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  grip: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="9" cy="6" r="1.5" fill="currentColor" />
      <circle cx="15" cy="6" r="1.5" fill="currentColor" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="9" cy="18" r="1.5" fill="currentColor" />
      <circle cx="15" cy="18" r="1.5" fill="currentColor" />
    </svg>
  ),
  up: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  down: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
};

// --- DIFFICULTY BADGE ---
function DiffBadge({ d }: { d: Problem["difficulty"] }) {
  const c = d === "Easy" ? "#22c55e" : d === "Medium" ? "#f59e0b" : "#ef4444";
  return (
    <span
      style={{
        background: c + "18",
        color: c,
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        border: `1px solid ${c}40`,
      }}
    >
      {d}
    </span>
  );
}

// --- TIMER COMPONENT ---
function Timer({ seconds, total }: { seconds: number; total: number }) {
  const pct = seconds / total;
  const clr = pct > 0.5 ? "#22c55e" : pct > 0.2 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: clr, display: "flex", alignItems: "center" }}>{Icons.timer}</span>
      <div style={{ flex: 1, height: 4, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            background: clr,
            borderRadius: 4,
            transition: "width 1s linear, background 0.5s",
          }}
        />
      </div>
      <span style={{ color: clr, fontSize: "0.85rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, minWidth: 40, textAlign: "right" }}>
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </span>
    </div>
  );
}

// --- MODAL ---
function Modal({ show, children, onClose }: { show: boolean; children: ReactNode; onClose: () => void }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 16,
          padding: 24,
          maxWidth: 480,
          width: "100%",
          animation: "modalIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// --- PHASE: PROBLEM DISPLAY ---
function ProblemView({ problem, onReady }: { problem: Problem; onReady: () => void }) {
  const [timer, setTimer] = useState(180);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  useEffect(() => {
    if (timer === 0) onReady();
  }, [timer, onReady]);

  return (
    <div style={{ animation: "fadeUp 0.3s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>#{problem.id}</span>
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#f1f5f9", fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{problem.title}</h2>
        <DiffBadge d={problem.difficulty} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Timer seconds={timer} total={180} />
      </div>

      <div
        style={{
          background: "#0c1222",
          border: "1px solid #1e293b",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          fontSize: "0.88rem",
          lineHeight: 1.7,
          color: "#cbd5e1",
          maxHeight: "40vh",
          overflowY: "auto",
        }}
      >
        {problem.description.split("\n").map((line, i) => (
          <p key={i} style={{ margin: "6px 0" }}>
            {line.split("`").map((seg, j) =>
              j % 2 === 1 ? (
                <code
                  key={j}
                  style={{
                    background: "#1e293b",
                    color: "#f59e0b",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontSize: "0.82rem",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {seg}
                </code>
              ) : (
                <span key={j}>{seg}</span>
              )
            )}
          </p>
        ))}
      </div>

      {problem.examples.map((ex, i) => (
        <div
          key={i}
          style={{
            background: "#0c1222",
            border: "1px solid #1e293b",
            borderRadius: 12,
            padding: 14,
            marginBottom: 10,
            fontSize: "0.82rem",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <div style={{ color: "#94a3b8", marginBottom: 4, fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Example {i + 1}</div>
          <div style={{ color: "#f59e0b" }}>
            <span style={{ color: "#64748b" }}>Input: </span>
            {ex.input}
          </div>
          <div style={{ color: "#fbbf24" }}>
            <span style={{ color: "#64748b" }}>Output: </span>
            {ex.output}
          </div>
          {ex.explanation && <div style={{ color: "#94a3b8", marginTop: 4, fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem" }}>💡 {ex.explanation}</div>}
        </div>
      ))}

      <div style={{ marginTop: 12, marginBottom: 20 }}>
        <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Constraints</div>
        {problem.constraints.map((c, i) => (
          <div key={i} style={{ color: "#94a3b8", fontSize: "0.8rem", padding: "3px 0", fontFamily: "'JetBrains Mono', monospace" }}>
            • {c}
          </div>
        ))}
      </div>

      <button onClick={onReady} style={btnPrimary}>
        I'm ready — Start Quiz {Icons.arrow}
      </button>
    </div>
  );
}

// --- PHASE: MCQ QUIZ ---
function MCQPhase({ problem, onComplete }: { problem: Problem; onComplete: (time: number) => void }) {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timer, setTimer] = useState(60);
  const [totalTime, setTotalTime] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const q = problem.mcq[qIdx];
  const isCorrect = selected === q.correct;

  useEffect(() => {
    setTimer(60);
    setSelected(null);
    setShowResult(false);
    setTimedOut(false);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [qIdx]);

  // Auto-reveal correct answer when timer hits 0 with no selection
  useEffect(() => {
    if (timer === 0 && selected === null && !showResult) {
      setTimedOut(true);
      setShowResult(true);
      setTotalTime((t) => t + 60);
    }
  }, [timer, selected, showResult]);

  const handleSelect = (idx: number) => {
    if (showResult || timer === 0) return;
    clearInterval(timerRef.current!);
    setSelected(idx);
    setShowResult(true);
    setTotalTime((t) => t + (60 - timer));
  };

  const handleNext = () => {
    if (qIdx < 2) {
      setQIdx(qIdx + 1);
    } else {
      onComplete(totalTime);
    }
  };

  const qLabels = ["Algorithm / Data Structure", "Time Complexity", "Space Complexity"];

  return (
    <div style={{ animation: "fadeUp 0.3s ease-out" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Question {qIdx + 1} of 3
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: i < qIdx ? "#22c55e" : i === qIdx ? "#f59e0b" : "#334155",
                  transition: "all 0.3s",
                }}
              />
            ))}
          </div>
        </div>
        <Timer seconds={timer} total={60} />
      </div>

      <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ color: "#f59e0b", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          {qLabels[qIdx]}
        </div>
        <p style={{ color: "#f1f5f9", fontSize: "0.95rem", margin: 0, fontWeight: 600, lineHeight: 1.5, fontFamily: "'Outfit', sans-serif" }}>{q.question}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {q.options.map((opt, i) => {
          let bg = "#0f172a";
          let border = "#1e293b";
          let color = "#cbd5e1";
          if (showResult || timer === 0) {
            if (i === q.correct) {
              bg = "#22c55e18";
              border = "#22c55e60";
              color = "#22c55e";
            } else if (i === selected && !isCorrect) {
              bg = "#ef444418";
              border = "#ef444460";
              color = "#ef4444";
            }
          } else if (selected === i) {
            bg = "#f59e0b18";
            border = "#f59e0b60";
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              style={{
                background: bg,
                border: `1.5px solid ${border}`,
                borderRadius: 10,
                padding: "12px 14px",
                color: color,
                fontSize: "0.88rem",
                fontFamily: "'JetBrains Mono', monospace",
                cursor: showResult || timer === 0 ? "default" : "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "all 0.2s",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: showResult && i === q.correct ? "#22c55e" : showResult && i === selected && !isCorrect ? "#ef4444" : "#1e293b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: showResult && (i === q.correct || (i === selected && !isCorrect)) ? "#fff" : "#64748b",
                  flexShrink: 0,
                }}
              >
                {showResult && i === q.correct ? Icons.check : showResult && i === selected && !isCorrect ? Icons.x : String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {showResult && timedOut && (
        <Modal show={true} onClose={handleNext}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f59e0b20", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <span style={{ fontSize: "1.4rem" }}>⏰</span>
            </div>
            <h3 style={{ color: "#f59e0b", margin: "0 0 4px", fontFamily: "'Outfit', sans-serif" }}>Time's up!</h3>
          </div>
          <div style={{ background: "#22c55e12", border: "1px solid #22c55e30", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
            <div style={{ color: "#64748b", fontSize: "0.7rem", fontWeight: 600, marginBottom: 2 }}>CORRECT ANSWER</div>
            <div style={{ color: "#22c55e", fontSize: "0.9rem", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{q.options[q.correct]}</div>
          </div>
          <p style={{ color: "#cbd5e1", fontSize: "0.85rem", lineHeight: 1.6, margin: "0 0 16px", textAlign: "center" }}>{q.explanation}</p>
          <button onClick={handleNext} style={{ ...btnPrimary, width: "100%" }}>
            {qIdx < 2 ? "Next Question" : "Start Code Puzzle"} {Icons.arrow}
          </button>
        </Modal>
      )}

      {showResult && !timedOut && !isCorrect && (
        <Modal show={true} onClose={handleNext}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ef444420", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </div>
            <h3 style={{ color: "#ef4444", margin: "0 0 4px", fontFamily: "'Outfit', sans-serif" }}>Not quite!</h3>
          </div>
          <p style={{ color: "#cbd5e1", fontSize: "0.85rem", lineHeight: 1.6, margin: "0 0 16px", textAlign: "center" }}>{q.explanation}</p>
          <button onClick={handleNext} style={{ ...btnPrimary, width: "100%" }}>
            {qIdx < 2 ? "Next Question" : "Start Code Puzzle"} {Icons.arrow}
          </button>
        </Modal>
      )}

      {showResult && isCorrect && (
        <div
          style={{ background: "#22c55e18", border: "1px solid #22c55e40", borderRadius: 12, padding: 14, marginBottom: 14, textAlign: "center" }}
        >
          <div style={{ color: "#22c55e", fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>✓ Correct!</div>
          <button onClick={handleNext} style={{ ...btnPrimary, width: "100%" }}>
            {qIdx < 2 ? "Next Question" : "Start Code Puzzle"} {Icons.arrow}
          </button>
        </div>
      )}
    </div>
  );
}

// --- PHASE: CODE PUZZLE ---
function CodePuzzle({ problem, quizTime, onComplete }: { problem: Problem; quizTime: number; onComplete: () => void }) {
  const puzzle = problem.codePuzzle;
  const allBlocks = [...puzzle.blocks, ...(puzzle.distractors || [])];
  const distractorIds = new Set((puzzle.distractors || []).map((d) => d.id));
  const correctCount = puzzle.correctOrder.reduce((sum: number, entry) => sum + (Array.isArray(entry) ? entry.length : 1), 0);

  const [placed, setPlaced] = useState<CodeBlock[]>([]);
  const [available, setAvailable] = useState<CodeBlock[]>(() => {
    const arr = [...allBlocks];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  const [result, setResult] = useState<boolean | null>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const addBlock = (block: CodeBlock) => {
    setPlaced([...placed, block]);
    setAvailable(available.filter((b) => b.id !== block.id));
  };

  const removeBlock = (block: CodeBlock) => {
    setAvailable([...available, block]);
    setPlaced(placed.filter((b) => b.id !== block.id));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...placed];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setPlaced(arr);
  };

  const moveDown = (idx: number) => {
    if (idx === placed.length - 1) return;
    const arr = [...placed];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    setPlaced(arr);
  };

  const isCorrectPlacement = useCallback((placedIds: string[]) => {
    const order = puzzle.correctOrder;
    const slots: { ids: Set<string>; count: number }[] = [];
    for (const entry of order) {
      if (Array.isArray(entry)) {
        slots.push({ ids: new Set(entry), count: entry.length });
      } else {
        slots.push({ ids: new Set([entry]), count: 1 });
      }
    }
    const totalExpected = slots.reduce((sum, s) => sum + s.count, 0);
    if (placedIds.length !== totalExpected) return false;

    let pi = 0;
    for (const slot of slots) {
      const chunk = placedIds.slice(pi, pi + slot.count);
      const chunkSet = new Set(chunk);
      if (chunkSet.size !== slot.count) return false;
      for (const id of chunk) {
        if (!slot.ids.has(id)) return false;
      }
      pi += slot.count;
    }
    return true;
  }, [puzzle.correctOrder]);

  const validPositionsMap = useMemo(() => {
    const map: Record<string, Set<number>> = {};
    const order = puzzle.correctOrder;
    let pos = 0;
    for (const entry of order) {
      if (Array.isArray(entry)) {
        const positions = entry.map((_, i) => pos + i);
        for (const id of entry) {
          map[id] = new Set(positions);
        }
        pos += entry.length;
      } else {
        map[entry] = new Set([pos]);
        pos += 1;
      }
    }
    return map;
  }, [puzzle.correctOrder]);

  const checkSolution = () => {
    clearInterval(timerRef.current!);
    const placedIds = placed.map((b) => b.id);
    const correct = isCorrectPlacement(placedIds);
    setResult(correct);
  };

  const getBlockError = (block: CodeBlock, idx: number): string | null => {
    if (result !== false) return null;
    if (distractorIds.has(block.id)) return "distractor";
    const validPos = validPositionsMap[block.id];
    if (!validPos || !validPos.has(idx)) return "wrong-pos";
    return null;
  };

  const placedDistractorCount = placed.filter((b) => distractorIds.has(b.id)).length;
  const hasDistractorsInSolution = placedDistractorCount > 0;

  const reset = () => {
    const arr = [...allBlocks];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setAvailable(arr);
    setPlaced([]);
    setResult(null);
    setTimer(0);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  };

  if (result === true) {
    return (
      <div style={{ animation: "fadeUp 0.3s ease-out", textAlign: "center", padding: "30px 0" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: "#22c55e", fontFamily: "'Outfit', sans-serif", margin: "0 0 8px" }}>Puzzle Solved!</h2>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 20px" }}>
          Quiz: {Math.floor(quizTime / 60)}m {quizTime % 60}s · Puzzle: {Math.floor(timer / 60)}m {timer % 60}s
        </p>
        <div
          style={{
            background: "#0c1222",
            border: "1px solid #22c55e40",
            borderRadius: 12,
            padding: 16,
            textAlign: "left",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.78rem",
            lineHeight: 1.8,
            color: "#fbbf24",
            marginBottom: 20,
          }}
        >
          {puzzle.correctOrder.flatMap((entry) => Array.isArray(entry) ? entry : [entry]).map((id) => {
            const block = puzzle.blocks.find((b) => b.id === id);
            return <div key={id}>{block?.code}</div>;
          })}
        </div>
        <button onClick={onComplete} style={btnPrimary}>
          Back to Problems {Icons.arrow}
        </button>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp 0.3s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ color: "#f1f5f9", margin: 0, fontSize: "1rem", fontFamily: "'Outfit', sans-serif" }}>Code Puzzle</h3>
        <span style={{ color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem" }}>
          {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
        </span>
      </div>

      <p style={{ color: "#94a3b8", fontSize: "0.8rem", margin: "0 0 6px" }}>{puzzle.description}</p>
      <p style={{ color: "#f59e0b", fontSize: "0.75rem", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: "0.85rem" }}>⚠</span>
        {distractorIds.size} distractor{distractorIds.size !== 1 ? "s" : ""} hidden among {allBlocks.length} blocks — don't include them!
      </p>

      {/* Solution zone */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "#f59e0b", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Your Solution</span>
          <span style={{ color: placed.length === correctCount && !hasDistractorsInSolution ? "#22c55e" : "#64748b" }}>
            {placed.length} / {correctCount} lines needed
          </span>
        </div>
        <div
          style={{
            background: "#0c1222",
            border: "1px solid #1e293b",
            borderRadius: 12,
            minHeight: 80,
            padding: placed.length ? 8 : 16,
          }}
        >
          {placed.length === 0 && (
            <p style={{ color: "#334155", fontSize: "0.8rem", textAlign: "center", margin: 0 }}>Tap blocks below to add them here</p>
          )}
          {placed.map((block, idx) => {
            const err = getBlockError(block, idx);
            const isDistractor = err === "distractor";
            const isWrongPos = err === "wrong-pos";
            const hasError = isDistractor || isWrongPos;
            return (
              <div
                key={block.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 10px",
                  background: isDistractor ? "#f59e0b18" : hasError ? "#ef444418" : "#1e293b",
                  border: `1px solid ${isDistractor ? "#f59e0b60" : hasError ? "#ef444460" : "#334155"}`,
                  borderRadius: 8,
                  marginBottom: 4,
                  fontSize: "0.78rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: isDistractor ? "#fbbf24" : hasError ? "#fca5a5" : "#fbbf24",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button onClick={() => moveUp(idx)} style={microBtn} disabled={idx === 0}>
                    {Icons.up}
                  </button>
                  <button onClick={() => moveDown(idx)} style={microBtn} disabled={idx === placed.length - 1}>
                    {Icons.down}
                  </button>
                </div>
                <pre style={{ margin: 0, flex: 1, whiteSpace: "pre", overflowX: "auto", wordBreak: "normal" }}>{block.code}</pre>
                {isDistractor && result === false && (
                  <span style={{ fontSize: "0.65rem", color: "#f59e0b", fontWeight: 700, whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>TRAP</span>
                )}
                <button
                  onClick={() => removeBlock(block)}
                  style={{ ...microBtn, color: "#ef4444" }}
                >
                  {Icons.x}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Available blocks */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "#64748b", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Available Blocks ({available.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {available.map((block) => (
            <button
              key={block.id}
              onClick={() => addBlock(block)}
              style={{
                background: "#0f172a",
                border: "1.5px solid #334155",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#cbd5e1",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.78rem",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.15s",
              }}
            >
              <span style={{ color: "#334155" }}>{Icons.grip}</span>
              <pre style={{ margin: 0, whiteSpace: "pre", overflowX: "auto", wordBreak: "normal" }}>{block.code}</pre>
            </button>
          ))}
        </div>
      </div>

      {result === false && (
        <div style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 12, padding: 14, marginBottom: 14, textAlign: "center" }}>
          <p style={{ color: "#fca5a5", fontSize: "0.85rem", margin: "0 0 4px" }}>
            {hasDistractorsInSolution
              ? `You included ${placedDistractorCount} distractor${placedDistractorCount > 1 ? "s" : ""} (marked as TRAP). Remove them!`
              : "Not in the right order yet. Incorrect lines are highlighted."}
          </p>
          <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "0 0 8px" }}>
            The solution needs exactly {correctCount} lines.
          </p>
          <button onClick={() => setResult(null)} style={{ ...btnSmall, color: "#f1f5f9", background: "#1e293b" }}>
            Try Again
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={reset} style={{ ...btnSmall, flex: 1, background: "#1e293b", color: "#94a3b8" }}>
          Reset
        </button>
        <button
          onClick={checkSolution}
          disabled={placed.length !== correctCount}
          style={{
            ...btnPrimary,
            flex: 2,
            opacity: placed.length !== correctCount ? 0.4 : 1,
            cursor: placed.length !== correctCount ? "not-allowed" : "pointer",
          }}
        >
          Check Solution ({placed.length}/{correctCount})
        </button>
      </div>
    </div>
  );
}

// --- PROMPT GENERATOR PAGE ---
function PromptPage({ onBack }: { onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(PROMPT_TEMPLATE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ animation: "fadeUp 0.3s ease-out" }}>
      <button onClick={onBack} style={{ ...btnSmall, color: "#94a3b8", background: "none", padding: 0, marginBottom: 16 }}>
        ← Back
      </button>
      <h2 style={{ color: "#f1f5f9", margin: "0 0 8px", fontFamily: "'Outfit', sans-serif", fontSize: "1.15rem" }}>Generate Problem Data</h2>
      <p style={{ color: "#94a3b8", fontSize: "0.82rem", lineHeight: 1.6, margin: "0 0 16px" }}>
        Copy the prompt below and paste it into Claude. Add the LeetCode problem numbers you want at the end. Then paste the JSON output into the "Import JSON" field on the main page.
      </p>

      <div style={{ position: "relative" }}>
        <pre
          style={{
            background: "#0c1222",
            border: "1px solid #1e293b",
            borderRadius: 12,
            padding: 14,
            fontSize: "0.72rem",
            color: "#94a3b8",
            lineHeight: 1.6,
            maxHeight: "50vh",
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {PROMPT_TEMPLATE}
        </pre>
        <button
          onClick={handleCopy}
          style={{
            position: "sticky",
            bottom: 0,
            width: "100%",
            marginTop: 8,
            ...btnPrimary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: copied ? "#22c55e" : "#f59e0b",
            color: "#0f172a",
          }}
        >
          {copied ? (
            <>
              {Icons.check} Copied!
            </>
          ) : (
            <>
              {Icons.copy} Copy Prompt to Clipboard
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// --- IMPORT MODAL (file upload) ---
function ImportModal({ show, onClose, onImport }: { show: boolean; onClose: () => void; onImport: (problems: Problem[]) => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const processJSON = (text: string) => {
    try {
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      const data = JSON.parse(cleaned);
      const arr: Problem[] = Array.isArray(data) ? data : [data];
      for (const p of arr) {
        if (!p.id || !p.title || !p.mcq || !p.codePuzzle) {
          throw new Error(`Problem "${p.title || p.id}" is missing required fields.`);
        }
      }
      onImport(arr);
      setError("");
      setFileName("");
      setLoading(false);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => processJSON(evt.target?.result as string);
    reader.onerror = () => { setError("Failed to read file."); setLoading(false); };
    reader.readAsText(file);
  };

  return (
    <Modal show={show} onClose={onClose}>
      <h3 style={{ color: "#f1f5f9", margin: "0 0 10px", fontFamily: "'Outfit', sans-serif", fontSize: "1rem" }}>Import Problems</h3>
      <p style={{ color: "#94a3b8", fontSize: "0.78rem", margin: "0 0 16px" }}>Upload a JSON file generated from the prompt.</p>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFile}
        style={{ display: "none" }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        style={{
          width: "100%",
          padding: "20px 16px",
          background: "#0c1222",
          border: "2px dashed #334155",
          borderRadius: 12,
          color: "#94a3b8",
          fontSize: "0.85rem",
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer",
          textAlign: "center",
          transition: "all 0.15s",
        }}
      >
        {loading ? (
          <span style={{ color: "#f59e0b" }}>Processing...</span>
        ) : fileName ? (
          <span style={{ color: "#22c55e" }}>✓ {fileName}</span>
        ) : (
          <>
            <span style={{ fontSize: "1.5rem", display: "block", marginBottom: 6 }}>📁</span>
            Tap to choose .json file
          </>
        )}
      </button>

      {error && <p style={{ color: "#ef4444", fontSize: "0.78rem", margin: "10px 0 0", lineHeight: 1.4 }}>{error}</p>}
    </Modal>
  );
}

// --- RESPONSIVE HOOK ---
function useBreakpoint() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 480);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { isMobile: width < 640, isTablet: width >= 640 && width < 1024, isDesktop: width >= 1024, width };
}

type PageType = "home" | "prompt" | "problem";
type PhaseType = "read" | "quiz" | "puzzle";
type DifficultyFilter = "All" | "Easy" | "Medium" | "Hard";

// --- MAIN APP ---
export default function App() {
  const { isMobile, isDesktop } = useBreakpoint();
  const [problems, setProblems] = useState<Problem[]>(SAMPLE_PROBLEMS as Problem[]);
  const [page, setPage] = useState<PageType>("home");
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [phase, setPhase] = useState<PhaseType>("read");
  const [quizTime, setQuizTime] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [numberInput, setNumberInput] = useState("");
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>("All");
  const [loaded, setLoaded] = useState(false);

  const filteredProblems = diffFilter === "All" ? problems : problems.filter((p) => p.difficulty === diffFilter);

  // Load from persistent storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("leetdrill-problems");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProblems(parsed);
        }
      }
    } catch {
      // No saved data or storage unavailable — use defaults
    }
    setLoaded(true);
  }, []);

  // Save to persistent storage whenever problems change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("leetdrill-problems", JSON.stringify(problems));
    } catch {
      // Storage write failed — silent
    }
  }, [problems, loaded]);

  const handleSelectByNumber = () => {
    const num = parseInt(numberInput.trim());
    if (!num) return;
    const p = problems.find((pr) => pr.id === num);
    if (p) {
      setSelectedProblem(p);
      setPhase("read");
      setPage("problem");
      setNumberInput("");
    }
  };

  const handleImport = (arr: Problem[]) => {
    setProblems((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const newOnes = arr.filter((p) => !ids.has(p.id));
      const merged = [...prev, ...newOnes];
      merged.sort((a, b) => a.id - b.id);
      return merged;
    });
    setShowImport(false);
  };

  // Clear all imported data
  const handleReset = () => {
    setProblems(SAMPLE_PROBLEMS as Problem[]);
    try { localStorage.removeItem("leetdrill-problems"); } catch { /* silent */ }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#f1f5f9",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; padding: 0; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
        button, [role="button"] { -webkit-user-select: none; user-select: none; touch-action: manipulation; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        textarea:focus, input:focus { outline: none; border-color: #f59e0b !important; }
        button:active { transform: scale(0.97); }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>

      <div style={{ maxWidth: isDesktop ? 720 : isMobile ? 480 : 600, margin: "0 auto", padding: isMobile ? "16px 16px 40px" : "24px 32px 60px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            paddingBottom: 14,
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div
            onClick={() => { setPage("home"); setSelectedProblem(null); }}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
          >
            <img src="/logo.png" alt="LootCode" style={{ width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, objectFit: "contain" }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: isMobile ? "1.05rem" : "1.3rem", color: "#f1f5f9" }}>
              Loot<span style={{ color: "#4ade80" }}>Code</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setPage("prompt")} style={{ ...btnSmall, fontSize: "0.7rem", padding: "6px 10px" }}>
              Prompt
            </button>
            <button onClick={() => setShowImport(true)} style={{ ...btnSmall, fontSize: "0.7rem", padding: "6px 10px", background: "#f59e0b20", color: "#f59e0b", border: "1px solid #f59e0b40" }}>
              + Import
            </button>
          </div>
        </div>

        {/* Pages */}
        {page === "prompt" && <PromptPage onBack={() => setPage("home")} />}

        {page === "home" && (
          <div style={{ animation: "fadeUp 0.3s ease-out" }}>
            {/* Search by number */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input
                type="number"
                placeholder="Problem #"
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSelectByNumber()}
                style={{
                  flex: 1,
                  background: "#0c1222",
                  border: "1.5px solid #1e293b",
                  borderRadius: 10,
                  color: "#f1f5f9",
                  padding: "10px 14px",
                  fontSize: "0.9rem",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
              <button onClick={handleSelectByNumber} style={btnPrimary}>
                Go
              </button>
            </div>

            {/* Difficulty filter */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {(["All", "Easy", "Medium", "Hard"] as const).map((d) => {
                const active = diffFilter === d;
                const color = d === "Easy" ? "#22c55e" : d === "Medium" ? "#f59e0b" : d === "Hard" ? "#ef4444" : "#94a3b8";
                return (
                  <button
                    key={d}
                    onClick={() => setDiffFilter(d)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      background: active ? color + "18" : "transparent",
                      border: `1.5px solid ${active ? color + "60" : "#1e293b"}`,
                      borderRadius: 8,
                      color: active ? color : "#64748b",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Problem list */}
            <div style={{ color: "#64748b", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{filteredProblems.length}{diffFilter !== "All" ? ` ${diffFilter}` : ""} Problems</span>
              {problems.length > 0 && (
                <button onClick={handleReset} style={{ background: "none", border: "none", color: "#ef444480", fontSize: "0.65rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  Clear All
                </button>
              )}
            </div>
            {filteredProblems.length === 0 && problems.length === 0 && (
              <button
                onClick={() => setShowImport(true)}
                style={{
                  width: "100%",
                  padding: "28px 16px",
                  background: "#0c1222",
                  border: "2px dashed #334155",
                  borderRadius: 14,
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: "1.8rem", display: "block", marginBottom: 8 }}>📁</span>
                <span style={{ fontWeight: 600, color: "#f59e0b" }}>Import your first problems</span>
                <br />
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Upload a .json file — data persists across sessions</span>
              </button>
            )}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 8 : 10 }}>
              {filteredProblems.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProblem(p);
                    setPhase("read");
                    setPage("problem");
                  }}
                  style={{
                    background: "#0c1222",
                    border: "1.5px solid #1e293b",
                    borderRadius: 12,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                    color: "#f1f5f9",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.8rem",
                      color: "#64748b",
                      minWidth: 36,
                    }}
                  >
                    #{p.id}
                  </span>
                  <span style={{ flex: 1, fontSize: "0.9rem", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>{p.title}</span>
                  <DiffBadge d={p.difficulty} />
                </button>
              ))}
            </div>
          </div>
        )}

        {page === "problem" && selectedProblem && (
          <>
            {phase !== "read" && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>#{selectedProblem.id}</span>
                  <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "0.95rem", fontFamily: "'Outfit', sans-serif" }}>{selectedProblem.title}</span>
                  <DiffBadge d={selectedProblem.difficulty} />
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["Quiz", "Puzzle"] as const).map((label, i) => {
                    const active = (phase === "quiz" && i === 0) || (phase === "puzzle" && i === 1);
                    const done = phase === "puzzle" && i === 0;
                    return (
                      <div
                        key={label}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 3,
                          background: active ? "#f59e0b" : done ? "#22c55e" : "#1e293b",
                          transition: "all 0.3s",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {phase === "read" && (
              <ProblemView
                problem={selectedProblem}
                onReady={() => setPhase("quiz")}
              />
            )}
            {phase === "quiz" && (
              <MCQPhase
                problem={selectedProblem}
                onComplete={(time) => {
                  setQuizTime(time);
                  setPhase("puzzle");
                }}
              />
            )}
            {phase === "puzzle" && (
              <CodePuzzle
                problem={selectedProblem}
                quizTime={quizTime}
                onComplete={() => {
                  setPage("home");
                  setSelectedProblem(null);
                }}
              />
            )}
          </>
        )}
      </div>

      <ImportModal show={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />
    </div>
  );
}

// --- SHARED STYLES ---
const btnPrimary: CSSProperties = {
  background: "#f59e0b",
  color: "#0f172a",
  border: "none",
  borderRadius: 10,
  padding: "12px 20px",
  fontSize: "0.85rem",
  fontWeight: 700,
  fontFamily: "'Outfit', sans-serif",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "all 0.15s",
};

const btnSmall: CSSProperties = {
  background: "#1e293b",
  color: "#cbd5e1",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: "0.78rem",
  fontWeight: 600,
  fontFamily: "'DM Sans', sans-serif",
  cursor: "pointer",
  transition: "all 0.15s",
};

const microBtn: CSSProperties = {
  background: "none",
  border: "none",
  color: "#64748b",
  cursor: "pointer",
  padding: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 32,
  minHeight: 32,
};
