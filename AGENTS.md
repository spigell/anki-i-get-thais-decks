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
yarn build
```

These commands ensure dependencies are installed and the TypeScript code compiles.

## Deck Structure
- Deck YAML files live in `decks/`. Each file must include `deck_name`, `model_name`, `primary_field`, and a `notes` array.
- Each note entry should provide a `fields` mapping for card data and an optional `tags` list.

## Adding New Decks
- Source unproccessed metadata lives under `decks/processing/`.
- Convert each metadata file there into a deck YAML under `decks/` using the same base name.
 - Keep deck names hierarchical with `::` separators to match Anki sub-decks (you can create a new directories).
 - When creating a deck from a metadata variant, also generate a `.metadata.json` (or add to existing) file
   in the deck folder containing the date from unprocessed metadata and date of processing.

## Metadata
- `.metadata.json` files must be valid JSON. Verify with `python -m json.tool` or `jq .` before committing.
- After processing a metadata file into a deck, delete the original JSON from `decks/processing/`.

## Pull Request Notes
- Summaries must mention the purpose of the change and reference relevant files with line numbers.
- Include a testing section describing command results. If commands cannot run due to environment restrictions, state so explicitly.
