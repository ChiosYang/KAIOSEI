/**
 * 一次性脚本：为指定的 Notion 数据库创建缺失的列
 * 使用：node scripts/ensure-notion-props.js
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// 简单读取 .env.local（避免额外依赖 dotenv）
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function ensureProps() {
  loadEnv();

  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    throw new Error('请在 .env.local 中配置 NOTION_API_KEY 与 NOTION_DATABASE_ID');
  }

  const notion = new Client({ auth: apiKey });

  await notion.databases.update({
    database_id: databaseId,
    properties: {
      // Name 通常已存在 Title 类型，不在此覆盖
      'App ID': { number: {} },
      Playtime: { number: {} },
      'Last Played': { date: {} },
      'Steam Link': { url: {} },
      'Synced At': { date: {} },
    },
  });

  console.log('✅ Notion 数据库属性已创建/更新');
}

ensureProps().catch((err) => {
  console.error('❌ 创建属性失败:', err.message);
  process.exit(1);
});
