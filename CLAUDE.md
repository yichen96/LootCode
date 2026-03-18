# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeetCram is a LeetCode practice app built as a single-file React+TypeScript component (`leetcode-app.tsx`). It provides an interactive study flow: browse problems → read description → answer MCQs → solve code puzzles (drag-and-drop block arrangement).

## Architecture

The entire app lives in `leetcode-app.tsx` — a self-contained React component using Vite as the build tool. It uses inline styles (no CSS files).

### Key structure within the file:
- **Problem data** — 88 problems loaded from `leetcode_problems.json`
- **PROMPT_TEMPLATE** — LLM prompt template for generating new problems in the app's JSON format
- **Component hierarchy**: `App` (root) → `ProblemView` (read phase) → `MCQPhase` (quiz) → `CodePuzzle` (drag-and-drop puzzle)
- **ImportModal** — allows importing new problems via JSON file upload
- **Shared style objects** at bottom (`btnPrimary`, `btnSmall`, `microBtn`)

### App flow (state machine):
`home` (problem list) → `read` (problem description) → `quiz` (MCQ questions) → `puzzle` (code block arrangement) → back to `home`

### Data persistence:
Problems are stored via `localStorage`. New problems can be imported through the ImportModal using the JSON format defined in PROMPT_TEMPLATE.

## Development

- **Build**: `npm run build` (Vite)
- **Dev server**: `npm run dev`
- **Type check**: `npx tsc --noEmit`
- **Deploy**: Vercel (auto-detects Vite)
