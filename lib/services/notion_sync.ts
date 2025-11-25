import { Client } from '@notionhq/client';
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { Element, load } from 'cheerio';
import { sql } from '@/lib/db/connection';
import { log } from '@/lib/utils/logger';

interface NotionSyncRow {
  app_id: number;
  name: string | null;
  playtime_forever: number | null;
  last_played: string | null;
  header_image: string | null;
  description: string | null;
  ug_updated_at: string | null;
  gd_updated_at: string | null;
  notion_page_id: string | null;
  synced_at: string | null;
}

interface SyncResult {
  appId: number;
  notionPageId?: string;
  status: 'created' | 'updated' | 'skipped';
  error?: string;
}

const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const NOTION_DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID;
const NOTION_VERSION = '2025-09-03';
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  notionVersion: NOTION_VERSION,
});
const REQUEST_INTERVAL_MS = 400; // 粗略限流，约 2.5 rps
const MAX_BLOCKS = 50;

function ensureNotionConfig() {
  if (!process.env.NOTION_API_KEY || !NOTION_DATABASE_ID) {
    throw new Error('Notion 配置缺失，请设置 NOTION_API_KEY 和 NOTION_DATABASE_ID');
  }
}

let dataSourceIdMemo: string | null = NOTION_DATA_SOURCE_ID || null;

async function getDataSourceId(): Promise<string> {
  if (dataSourceIdMemo) return dataSourceIdMemo;
  // 尝试从数据库对象推断第一个 data source
  const db = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID as string });
  type DataSourceSummary = { id: string; name?: string | null };
  const dataSources = (db as { data_sources?: DataSourceSummary[] }).data_sources;
  const candidate = dataSources?.[0]?.id;
  if (!candidate) {
    throw new Error(
      '未找到可用的 Notion Data Source，请在 .env.local 中设置 NOTION_DATA_SOURCE_ID'
    );
  }
  dataSourceIdMemo = candidate;
  log.info('已自动推断 NOTION_DATA_SOURCE_ID，请写入 .env.local 以避免重复请求', {
    dataSourceId: candidate,
  });
  return candidate;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildProperties(row: NotionSyncRow) {
  const syncedAt = new Date().toISOString();
  return {
    Name: {
      title: [
        {
          text: { content: row.name || `App ${row.app_id}` },
        },
      ],
    },
    'App ID': { number: row.app_id },
    Playtime: row.playtime_forever != null ? { number: row.playtime_forever } : { number: 0 },
    'Last Played': row.last_played
      ? { date: { start: new Date(row.last_played).toISOString() } }
      : { date: null },
    'Steam Link': { url: `https://store.steampowered.com/app/${row.app_id}` },
    'Synced At': { date: { start: syncedAt } },
  };
}

function htmlToBlocks(html?: string | null) {
  const blocks: BlockObjectRequest[] = [
    {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '🎮' },
        rich_text: [
          {
            type: 'text',
            text: { content: '本页面由 Steam 数据自动同步生成。' },
          },
        ],
      },
    },
  ];

  if (!html) return blocks;

  const $ = load(html);
  const nodes = $.root().children();

  nodes.each((_, el) => {
    if (blocks.length >= MAX_BLOCKS) return false;

    const tag = (el as Element).tagName?.toLowerCase();
    if (!tag) return;

    if (tag === 'h1' || tag === 'h2') {
      const text = $(el).text().trim();
      if (!text) return;
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: text.slice(0, 2000) } }],
        },
      });
    } else if (tag === 'img') {
      const src = $(el).attr('src');
      if (!src) return;
      blocks.push({
        object: 'block',
        type: 'image',
        image: {
          type: 'external',
          external: { url: src },
        },
      });
    } else if (tag === 'p') {
      const text = $(el).text().trim();
      if (!text) return;
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: text.slice(0, 2000) } }],
        },
      });
    }
  });

  return blocks.slice(0, MAX_BLOCKS);
}

async function upsertMapping(appId: number, pageId: string) {
  await sql`
    INSERT INTO notion_mappings (app_id, notion_page_id, synced_at)
    VALUES (${appId}, ${pageId}, NOW())
    ON CONFLICT (app_id) DO UPDATE SET
      notion_page_id = EXCLUDED.notion_page_id,
      synced_at = EXCLUDED.synced_at,
      updated_at = NOW()
  `;
}

function isUpToDate(row: NotionSyncRow) {
  if (!row.notion_page_id || !row.synced_at) return false;
  const syncedAt = new Date(row.synced_at);
  const ugUpdated = row.ug_updated_at ? new Date(row.ug_updated_at) : null;
  const gdUpdated = row.gd_updated_at ? new Date(row.gd_updated_at) : null;

  const userFresh = !ugUpdated || ugUpdated <= syncedAt;
  const detailFresh = !gdUpdated || gdUpdated <= syncedAt;
  return userFresh && detailFresh;
}

export async function syncSingleGameToNotion(row: NotionSyncRow): Promise<SyncResult> {
  ensureNotionConfig();

  if (isUpToDate(row)) {
    return { appId: row.app_id, status: 'skipped', notionPageId: row.notion_page_id || undefined };
  }

  const properties = buildProperties(row);
  const cover = row.header_image
    ? {
        type: 'external' as const,
        external: { url: row.header_image },
      }
    : undefined;
  const children = htmlToBlocks(row.description);
  const dataSourceId = await getDataSourceId();

  try {
    if (!row.notion_page_id) {
      const page = await notion.pages.create({
        parent: { data_source_id: dataSourceId },
        properties,
        cover,
        children,
      });
      await upsertMapping(row.app_id, page.id);
      await sleep(REQUEST_INTERVAL_MS);
      return { appId: row.app_id, status: 'created', notionPageId: page.id };
    }

    await notion.pages.update({
      page_id: row.notion_page_id,
      properties,
      cover,
    });
    await upsertMapping(row.app_id, row.notion_page_id);
    await sleep(REQUEST_INTERVAL_MS);
    return { appId: row.app_id, status: 'updated', notionPageId: row.notion_page_id };
  } catch (error) {
    log.error('同步 Notion 失败', error, { appId: row.app_id });
    throw error;
  }
}

export async function syncNotionForUser(userId: string, options: { since?: Date } = {}) {
  ensureNotionConfig();

  const since = options.since ? options.since.toISOString() : null;
  const rows = await sql<NotionSyncRow>`
    SELECT 
      ug.app_id,
      ug.name,
      ug.playtime_forever,
      ug.last_played,
      ug.updated_at AS ug_updated_at,
      gd.description,
      gd.header_image,
      gd.last_updated AS gd_updated_at,
      nm.notion_page_id,
      nm.synced_at
    FROM user_games ug
    LEFT JOIN game_details gd ON ug.app_id = gd.app_id
    LEFT JOIN notion_mappings nm ON ug.app_id = nm.app_id
    WHERE ug.user_id = ${userId}
    ${since ? sql`AND (ug.updated_at > ${since} OR gd.last_updated > ${since})` : sql``}
    ORDER BY ug.updated_at DESC
  `;

  const results: SyncResult[] = [];

  for (const row of rows) {
    try {
      const res = await syncSingleGameToNotion(row);
      results.push(res);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({ appId: row.app_id, status: 'skipped', error: message });
    }
  }

  return {
    total: rows.length,
    created: results.filter((r) => r.status === 'created').length,
    updated: results.filter((r) => r.status === 'updated').length,
    skipped: results.filter((r) => r.status === 'skipped' && !r.error).length,
    failed: results.filter((r) => r.error).length,
    results,
  };
}
