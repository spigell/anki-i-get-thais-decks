# Repo Workflow Guidelines

This repository contains scripts for managing Thai Anki decks and associated metadata. Please follow these rules when making contributions in this repo scope.

## Coding Style
- Use Prettier for formatting TypeScript files. Two-space indent, single quotes.
- YAML files should also use two-space indentation.
- Do not commit build artifacts or `node_modules`.

## Programmatic Checks
Run the following commands before committing if you modify any code under `scripts/`:

```bash
cd scripts
yarn install
npx tsc --build
```

These commands ensure dependencies are installed and the TypeScript code compiles.

## Pull Request Notes
- Summaries must mention the purpose of the change and reference relevant files with line numbers.
- Include a testing section describing command results. If commands cannot run due to environment restrictions, state so explicitly.
