import { Client } from '@notionhq/client';
import fs from 'fs/promises';
import path from 'path';
import { log } from '@/lib/utils/logger';

const NOTION_VERSION = '2025-09-03';
const ENV_PATH = path.join(process.cwd(), '.env.local');

interface NotionSetupResult {
  databaseId: string;
  dataSourceId: string | null;
  created: boolean;
  persisted: boolean;
}

type SimplePropertyConfig =
  | { title: Record<string, never> }
  | { number: Record<string, never> }
  | { date: Record<string, never> }
  | { url: Record<string, never> };

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  notionVersion: NOTION_VERSION,
});

let setupMemo: NotionSetupResult | null = null;

function ensureApiKey() {
  if (!process.env.NOTION_API_KEY) {
    throw new Error('Notion 配置缺失：请设置 NOTION_API_KEY');
  }
}

async function persistEnvValue(key: string, value: string): Promise<boolean> {
  // 在 Vercel 等无持久化环境中跳过写入，返回 false
  if (process.env.VERCEL === '1') return false;

  try {
    let content = '';
    try {
      content = await fs.readFile(ENV_PATH, 'utf8');
    } catch {
      content = '';
    }

    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    if (pattern.test(content)) {
      content = content.replace(pattern, line);
    } else {
      if (content.length && !content.endsWith('\n')) content += '\n';
      content += `${line}\n`;
    }

    await fs.writeFile(ENV_PATH, content, 'utf8');
    return true;
  } catch (error) {
    log.warn('写入 .env.local 失败，请手动添加 NOTION_* 环境变量', {
      error,
    });
    return false;
  }
}

async function createDatabaseWithSchema(pageId: string) {
  const properties: Record<string, SimplePropertyConfig> = {
    Name: { title: {} },
    'App ID': { number: {} },
    Playtime: { number: {} },
    'Last Played': { date: {} },
    'Steam Link': { url: {} },
    'Synced At': { date: {} },
  };

  const args: Parameters<typeof notion.databases.create>[0] = {
    parent: { type: 'page_id', page_id: pageId },
    title: [
      {
        type: 'text',
        text: { content: 'Steam Game Library' },
      },
    ],
    initial_data_source: { properties },
  };

  const db = await notion.databases.create(args);

  const dataSources = (db as { data_sources?: { id: string }[] }).data_sources;
  const dataSourceId = dataSources?.[0]?.id || null;

  return { databaseId: db.id, dataSourceId };
}

async function getDataSourceFromExistingDatabase(databaseId: string) {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const dataSources = (db as { data_sources?: { id: string }[] }).data_sources;
  const dataSourceId = dataSources?.[0]?.id || null;
  return dataSourceId;
}

export async function ensureNotionSetup(): Promise<NotionSetupResult> {
  ensureApiKey();
  if (setupMemo) return setupMemo;

  let databaseId = process.env.NOTION_DATABASE_ID || '';
  let dataSourceId = process.env.NOTION_DATA_SOURCE_ID || '';
  let created = false;
  let persisted = false;
  const autoProvision = process.env.NOTION_AUTO_PROVISION !== 'false';

  if (databaseId && dataSourceId) {
    setupMemo = { databaseId, dataSourceId, created, persisted };
    return setupMemo;
  }

  if (databaseId && !dataSourceId) {
    const fetched = await getDataSourceFromExistingDatabase(databaseId);
    dataSourceId = fetched || '';
    if (fetched) {
      persisted = (await persistEnvValue('NOTION_DATA_SOURCE_ID', fetched)) || persisted;
    } else {
      log.warn('未能在现有数据库中找到 data source，将仅使用 database_id 进行写入');
    }
    setupMemo = { databaseId, dataSourceId: fetched || null, created, persisted };
    return setupMemo;
  }

  // 缺少数据库时，需要用户提供根 Page ID（integration 已被共享）
  const pageId = process.env.NOTION_ROOT_PAGE_ID;
  if (!pageId) {
    throw new Error(
      '缺少 NOTION_DATABASE_ID 且未提供 NOTION_ROOT_PAGE_ID。请在 Notion 中创建/选择一个页面（已与该集成共享），将其 Page ID 写入 NOTION_ROOT_PAGE_ID 后再重试。'
    );
  }

  if (!autoProvision) {
    throw new Error(
      '未开启自动建库（NOTION_AUTO_PROVISION=false），请手动创建数据库并填入 NOTION_DATABASE_ID/NOTION_DATA_SOURCE_ID。'
    );
  }

  const createdIds = await createDatabaseWithSchema(pageId);
  databaseId = createdIds.databaseId;
  dataSourceId = createdIds.dataSourceId || '';
  created = true;

  persisted =
    (await persistEnvValue('NOTION_DATABASE_ID', databaseId)) || persisted;
  if (dataSourceId) {
    persisted = (await persistEnvValue('NOTION_DATA_SOURCE_ID', dataSourceId)) || persisted;
  }

  setupMemo = { databaseId, dataSourceId: dataSourceId || null, created, persisted };
  return setupMemo;
}
