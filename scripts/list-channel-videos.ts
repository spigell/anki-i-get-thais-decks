// List every video on a YouTube channel's Videos tab without an API key.
//
// Scrapes the channel page and follows the grid's continuation tokens through
// YouTube's internal browse endpoint. This depends on YouTube's page format and
// may break when it changes; use it for one-off backfills. For detecting new
// videos, prefer the channel RSS feed (latest 15 videos, no key needed).
//
// Output: one tab-separated line per video, newest first:
//   <url>\t<relative publish time>\t<title>
//
// Usage:
//   yarn list-videos [--channel @IgetThais] [--out videos.tsv]

import fs from 'fs';

const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' };
const MAX_PAGES = 50;
const TIMEOUT_MS = 20_000;

interface Video {
  id: string;
  title: string;
  published: string;
}

type Json = any;

async function fetchText(url: string, body?: unknown): Promise<string> {
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers:
      body === undefined
        ? HEADERS
        : { ...HEADERS, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return res.text();
}

class Collector {
  readonly videos: Video[] = [];
  private readonly seen = new Set<string>();
  private readonly usedTokens = new Set<string>();

  walk(node: Json, tokens: string[]): void {
    if (Array.isArray(node)) {
      for (const val of node) this.walk(val, tokens);
      return;
    }
    if (node === null || typeof node !== 'object') return;

    if ('richItemRenderer' in node) {
      this.item(node.richItemRenderer?.content ?? {});
      return;
    }
    if ('continuationItemRenderer' in node) {
      const token: string | undefined =
        node.continuationItemRenderer?.continuationEndpoint?.continuationCommand
          ?.token;
      if (token && !this.usedTokens.has(token)) {
        this.usedTokens.add(token);
        tokens.push(token);
      }
      return;
    }
    for (const val of Object.values(node)) this.walk(val, tokens);
  }

  private add(id: string | undefined, title: string, published: string): void {
    if (id && !this.seen.has(id)) {
      this.seen.add(id);
      this.videos.push({ id, title, published });
    }
  }

  private item(content: Json): void {
    // Current layout.
    const lv = content.lockupViewModel;
    if (lv) {
      const md = lv.metadata?.lockupMetadataViewModel ?? {};
      const rows: Json[] =
        md.metadata?.contentMetadataViewModel?.metadataRows ?? [];
      const parts: string[] = rows.flatMap((row) =>
        (row.metadataParts ?? []).map(
          (p: Json): string => p.text?.content ?? '',
        ),
      );
      const published = parts.find((p) => p.includes('ago')) ?? '';
      this.add(lv.contentId, md.title?.content ?? '', published);
      return;
    }
    // Legacy layout.
    const v = content.videoRenderer;
    if (v) {
      const title = (v.title?.runs ?? [])
        .map((r: Json): string => r.text ?? '')
        .join('');
      this.add(v.videoId, title, v.publishedTimeText?.simpleText ?? '');
    }
  }
}

function match(html: string, re: RegExp, what: string): string {
  const m = html.match(re);
  if (!m) throw new Error(`could not find ${what} in channel page`);
  return m[1];
}

function parseArgs(argv: string[]): { channel: string; out?: string } {
  const args: { channel: string; out?: string } = { channel: '@IgetThais' };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if ((flag === '--channel' || flag === '--out') && value) {
      if (flag === '--channel') args.channel = value;
      else args.out = value;
      i++;
    } else {
      console.error(
        'Usage: list-channel-videos [--channel @handle] [--out file.tsv]',
      );
      process.exit(2);
    }
  }
  return args;
}

async function main(): Promise<void> {
  const { channel, out } = parseArgs(process.argv.slice(2));

  const html = await fetchText(`https://www.youtube.com/${channel}/videos`);
  const data = JSON.parse(
    match(html, /var ytInitialData = (\{.*?\});<\/script>/s, 'ytInitialData'),
  );
  const key = match(html, /"INNERTUBE_API_KEY":"([^"]+)"/, 'API key');
  const version = match(
    html,
    /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/,
    'client version',
  );

  const collector = new Collector();
  const tokens: string[] = [];
  collector.walk(data, tokens);

  for (let page = 1; tokens.length > 0 && page <= MAX_PAGES; page++) {
    const body = {
      context: {
        client: { clientName: 'WEB', clientVersion: version, hl: 'en' },
      },
      continuation: tokens.pop(),
    };
    const resp = JSON.parse(
      await fetchText(
        `https://www.youtube.com/youtubei/v1/browse?key=${key}`,
        body,
      ),
    );
    collector.walk(resp.onResponseReceivedActions ?? [], tokens);
    console.error(`page ${page}: ${collector.videos.length} videos`);
  }

  if (collector.videos.length === 0) {
    console.error('No videos found: YouTube page format may have changed.');
    process.exit(1);
  }

  const lines = collector.videos
    .map(
      (v) =>
        `https://www.youtube.com/watch?v=${v.id}\t${v.published}\t${v.title}\n`,
    )
    .join('');
  if (out) fs.writeFileSync(out, lines, 'utf-8');
  else process.stdout.write(lines);
  console.error(`${collector.videos.length} videos`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
