import axios from 'axios';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// -----------------------------
// 🔧 Config
// -----------------------------
const API_KEY: string | undefined = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error('❌ Missing YOUTUBE_API_KEY in environment variables.');
  process.exit(1);
}

const VIDEO_FILE = 'videos.txt';
const DECKS_DIR = '../decks';
const PROCESSING_DIR = '../decks/processing';

// -----------------------------
// 🧩 Types
// -----------------------------
interface MetadataJson {
  id: string;
  //[key: string]: unknown;
}

interface YouTubeSnippet {
  title: string;
  description: string;
}

interface YouTubeApiResponse {
  items: Array<{
    id: string;
    snippet: YouTubeSnippet;
  }>;
}

interface VideoMetadata {
  id: string;
  title: string;
  description: string;
}

// -----------------------------
// 🧰 Utilities
// -----------------------------

// Ensure output directory exists
if (!fs.existsSync(PROCESSING_DIR)) {
  fs.mkdirSync(PROCESSING_DIR);
}

function extractVideoId(url: string): string | null {
  const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function walkDecksAndCollectVideoIds(dir: string): Promise<Set<string>> {
  const videoIds = new Set<string>();

  async function walk(currentPath: string) {
    const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name === '.metadata.json') {
        try {
          const content = await fs.promises.readFile(fullPath, 'utf-8');
          const json = JSON.parse(content) as Partial<MetadataJson>;

          if (json.id && typeof json.id === 'string') {
            videoIds.add(json.id);
          } else {
            console.warn(`⚠️ Missing or invalid videoId in ${fullPath}`);
          }
        } catch (err: any) {
          console.error(`❌ Failed to read ${fullPath}: ${err.message}`);
        }
      }
    }
  }

  await walk(dir);
  return videoIds;
}


async function fetchMetadata(videoId: string): Promise<VideoMetadata> {
  const url = 'https://www.googleapis.com/youtube/v3/videos';

  const response = await axios.get<YouTubeApiResponse>(url, {
    params: {
      part: 'snippet',
      id: videoId,
      key: API_KEY,
    },
  });

  const items = response.data.items;
  if (!items || items.length === 0) {
    throw new Error(`⚠️ Video not found for ID: ${videoId}`);
  }

  const snippet = items[0].snippet;
  return {
    id: videoId,
    title: snippet.title,
    description: snippet.description,
  };
}

// -----------------------------
// 🚀 Main
// -----------------------------

async function main(): Promise<void> {
  const fileStream = fs.createReadStream(VIDEO_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const expectedIds: string[] = [];
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const id = extractVideoId(trimmed);
    if (!id) {
      console.warn(`⚠️ Invalid YouTube URL: ${trimmed}`);
      continue
    }

    expectedIds.push(id);
  }

  const foundIds = await walkDecksAndCollectVideoIds(DECKS_DIR);

  const missing = expectedIds.filter(id => !foundIds.has(id));

  for (const m of missing) {
    const metadata = await fetchMetadata(m)
    fs.writeFileSync(`${DECKS_DIR}/processing/${metadata.id}.json`, JSON.stringify(metadata, null, 2));
  }

}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
