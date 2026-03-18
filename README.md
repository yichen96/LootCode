# LootCode

Interactive LeetCode practice app with MCQs and code puzzles. Built with React + TypeScript + Vite.

## Features

- **88 built-in problems** spanning Easy, Medium, and Hard
- **3-phase study flow**: read problem → answer MCQs → solve code puzzle
- **MCQ quiz** with timed questions on algorithm choice, time complexity, and space complexity
- **Code puzzle** — arrange shuffled code blocks into the correct solution (with distractor traps)
- **Difficulty filter** — filter problems by Easy, Medium, or Hard
- **Problem search** — jump to any problem by number
- **Import custom problems** — generate and import your own problem sets (see below)
- **Persistent storage** — progress saved via localStorage
- **Responsive** — mobile-first design that works on desktop too

## Getting Started

```bash
npm install
npm run dev
```

## Generating Custom Problems

LootCode includes a built-in prompt template for generating new problems with Claude (or any LLM).

1. Click **Prompt** in the app header
2. Copy the prompt to your clipboard
3. Paste it into Claude and append the LeetCode problem numbers you want, e.g. `1, 42, 200`
4. Claude returns a JSON array in the exact format the app expects
5. Save the output as a `.json` file
6. Click **+ Import** in the app and upload the file

The generated JSON includes problem descriptions, 3 MCQs, and a code puzzle with distractors — ready to use.

## Deploy

Push to GitHub and import into [Vercel](https://vercel.com). It auto-detects Vite — zero config needed.

## Tech Stack

- React 18, TypeScript, Vite
- No external UI libraries — inline styles only
- No backend — fully client-side

## License

[MIT](LICENSE)
