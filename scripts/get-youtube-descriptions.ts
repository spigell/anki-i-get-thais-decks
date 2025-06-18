import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { fileURLToPath } from 'url';

// ESM __dirname workaround
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Disable proxy usage for axios requests in restricted environments
axios.defaults.proxy = false;

// Environment check
let API_KEY: string | undefined = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  const keyPath = path.resolve(__dirname, '../.youtube_api_key');
  if (fs.existsSync(keyPath)) {
    API_KEY = fs.readFileSync(keyPath, 'utf-8').trim();
  }
}

if (!API_KEY) {
  console.error(
    '❌ Missing YOUTUBE_API_KEY environment variable and scripts/.youtube_api_key file.'
  );
  process.exit(1);
}

// Constants
const INPUT_FILE = 'videos.txt';
const OUTPUT_DIR = 'output';

// Interfaces
interface YouTubeSnippet {
  title: string;
  description: string;
}

interface YouTubeApiResponse {
  items: Array<{
    snippet: YouTubeSnippet;
  }>;
}

interface VideoMetadata {
  id: string;
  title: string;
  description: string;
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Extract the YouTube video ID from a URL
function extractVideoId(url: string): string | null {
  const match = url.match(/v=([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}


const proxy = 'http://proxy:8080';
const agent = new HttpsProxyAgent(proxy);

// Fetch metadata using the YouTube API
async function fetchMetadata(videoId: string): Promise<VideoMetadata> {
  const url = 'https://www.googleapis.com/youtube/v3/videos';

    const response = await axios.get<YouTubeApiResponse>(url, {
      //proxy: false,
      httpsAgent: agent,
      params: {
        part: 'snippet',
        id: videoId,
        key: API_KEY,
      },
    })

    const items = response.data.items;
    if (items.length === 0) {
      throw new Error(`⚠️ video not found for ID: ${videoId}`);
    }

    const snippet = items[0].snippet;
    
    return {
      id: videoId,
      title: snippet.title,
      description: snippet.description,
    };
}

// Main processor: read file and save metadata
async function processFile(): Promise<void> {
  const fileStream = fs.createReadStream(INPUT_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const videoId = extractVideoId(trimmed);
    if (!videoId) {
      console.warn(`⚠️ Skipping invalid URL: ${trimmed}`);
      continue;
    }

    const metadata = await fetchMetadata(videoId);
    if (metadata) {
      const outputPath = path.join(OUTPUT_DIR, `${videoId}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
      console.log(`✅ Saved: ${outputPath}`);
    }
  }
}

// Run it
processFile();
