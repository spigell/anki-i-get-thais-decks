# IGetThais Anki Decks

This repository contains Anki decks generated from the videos on the [I Get Thais](https://www.youtube.com/@IgetThais) YouTube channel. It provides YAML deck files and scripts for retrieving video metadata to build learning materials.

## Repository structure

- `decks/` – finalized decks and associated metadata.
- `decks/processing/` – raw metadata awaiting conversion.
- `models.yaml` – Anki note type definitions.
- `scripts/` – TypeScript utilities for fetching and preparing metadata.

## Generating metadata

The scripts require Node.js. To build the tools and retrieve metadata set the `YOUTUBE_API_KEY` environment variable then run:

```bash
cd scripts
yarn install
yarn get-metadata
```

The metadata for each video listed in `videos.txt` is saved under `decks/processing/`.

## License

See [LICENCE](./LICENCE) for license details.
