# LeetCram

Interactive LeetCode practice app with MCQs and code puzzles. Aanswers looted from LLM.

For people who have little time brushing up their algo knowledge.

Use it anywhere - rest time between sets in the gym, or commuting on the train.

## Demo

![LeetCram Demo](demo.gif)

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

## Generating Custom Problems

LeetCram includes a built-in prompt template for generating new problems with Claude (or any LLM).

1. Click **Prompt** in the app header
2. Copy the prompt to your clipboard
3. Paste it into LLM and append the LeetCode problem numbers you want, e.g. `1, 42, 200`
4. LLM returns a JSON array in the exact format the app expects
5. Save the output as a `.json` file
6. Click **+ Import** in the app and upload the file

The generated JSON includes problem descriptions, 3 MCQs, and a code puzzle with distractors — ready to use.

## Build locally

```bash
npm install
npm run dev
```

## License

[MIT](LICENSE)
