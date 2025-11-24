import { sql } from '@/lib/db/connection';
import { getGameDetails } from '@/lib/services/steam';
import { embedSingleText } from '@/lib/services/embedding_service';
import { getUserGames } from '@/lib/db/user-games';
import { log } from '@/lib/utils/logger';

// 游戏详情接口
interface GenreItem {
  description: string;
}

interface CategoryItem {
  description: string;
}

interface GameDetails {
  steam_appid: number;
  name: string;
  detailed_description?: string;
  short_description?: string;
  genres?: GenreItem[];
  categories?: CategoryItem[];
  developers?: string[];
  publishers?: string[];
  metacritic?: { score: number };
  release_date?: { date: string };
  header_image?: string;
}

// 构建用于embedding的文本
function buildEmbeddingText(details: GameDetails): string {
  const genres = details.genres?.map((g: GenreItem) => g.description).join(', ') || '未知';
  const tags = details.categories?.map((c: CategoryItem) => c.description).join(', ') || '';
  const developers = details.developers?.join(', ') || '未知';
  const description = details.short_description || '';
  
  return `
游戏名称: ${details.name}
类型: ${genres}
标签: ${tags}
开发商: ${developers}
简介: ${description}
  `.trim();
}

// 同步单个游戏的详情和embedding
export async function syncAndEmbedGame(
  appId: number,
  options: { withEmbedding?: boolean } = {}
): Promise<void> {
  const { withEmbedding = true } = options;
  log.info('开始同步游戏', { appId });
  
  try {
    // 获取游戏详情
    const details = await getGameDetails(appId.toString());
    if (!details || !details.name) {
      log.warn('获取游戏详情失败或数据不完整', { appId });
      return;
    }

    // 构建embedding文本
    const textToEmbed = buildEmbeddingText(details);
    log.debug('为游戏生成embedding文本', { appId, textPreview: textToEmbed.substring(0, 100) });
    
    let vectorString: string | null = null;
    if (withEmbedding) {
      const vector = await embedSingleText(textToEmbed);
      log.debug('为游戏生成向量成功', { appId, vectorDimension: vector.length });
      vectorString = `[${vector.join(',')}]`;
    } else {
      log.info('跳过生成embedding，仅同步游戏详情', { appId });
    }

    // 存储到数据库
    const embeddingValue = vectorString || null;
    await sql`
        INSERT INTO game_details (
            app_id, name, description, short_description, genres, tags,
            developer, publisher, metacritic_score, release_date, header_image, embedding
        )
        VALUES (
            ${details.steam_appid}, 
            ${details.name}, 
            ${details.detailed_description || null},
            ${details.short_description || null}, 
            ${JSON.stringify(details.genres?.map((g: GenreItem) => g.description) || [])},
            ${JSON.stringify(details.categories?.map((c: CategoryItem) => c.description) || [])},
            ${details.developers?.join(', ') || null}, 
            ${details.publishers?.join(', ') || null},
            ${details.metacritic?.score || null}, 
            ${details.release_date?.date || null},
            ${details.header_image || null}, 
            CAST(${embeddingValue} AS vector)
        )
        ON CONFLICT (app_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            short_description = EXCLUDED.short_description,
            genres = EXCLUDED.genres,
            tags = EXCLUDED.tags,
            developer = EXCLUDED.developer,
            publisher = EXCLUDED.publisher,
            metacritic_score = EXCLUDED.metacritic_score,
            release_date = EXCLUDED.release_date,
            header_image = EXCLUDED.header_image,
            embedding = COALESCE(EXCLUDED.embedding, game_details.embedding),
            last_updated = NOW()
    `;
    
    log.info('游戏数据存入数据库成功', { appId, gameName: details.name });

  } catch (error) {
    log.error('游戏详情同步失败', error, { appId });
    throw error;
  }
}

// 同步用户整个游戏库
export async function syncUserLibrary(
  userId: string,
  options: { withEmbedding?: boolean } = {}
): Promise<{
  success: number;
  failed: number;
  total: number;
}> {
  const withEmbedding = options.withEmbedding ?? true;

  log.info('开始同步用户游戏库', { userId });
  
  try {
    // 获取用户所有游戏
    const { games } = await getUserGames(userId, 5000, 0);
    log.info('获取用户游戏列表', { userId, totalGames: games.length });

    if (games.length === 0) {
      log.warn('用户游戏库为空', { userId });
      return { success: 0, failed: 0, total: 0 };
    }

    let successCount = 0;
    let failedCount = 0;
    
    // 批量处理，避免API限制
    const batchSize = 3; // 减少并发数以避免API限制
    
    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);
      const currentBatch = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(games.length/batchSize);
      log.debug('处理游戏同步批次', { currentBatch, totalBatches, batchSize: batch.length });
      
      // 并行处理当前批次
      const batchPromises = batch.map(async (game) => {
        try {
          await syncAndEmbedGame(game.appId, { withEmbedding });
          successCount++;
          return { appId: game.appId, success: true };
        } catch (error) {
          log.warn('游戏同步失败', { appId: game.appId, gameName: game.name, error: error instanceof Error ? error.message : String(error) });
          failedCount++;
          return { appId: game.appId, success: false, error };
        }
      });

      await Promise.all(batchPromises);
      
      // 批次间延迟，避免触发速率限制
      if (i + batchSize < games.length) {
        log.debug('等待避免API限制', { delayMs: 2000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const result = {
      success: successCount,
      failed: failedCount,
      total: games.length
    };
    
    log.info('用户游戏库同步完成', { userId, ...result });
    
    return result;

  } catch (error) {
    log.error('用户游戏库同步过程出错', error, { userId });
    throw error;
  }
}

// 检查游戏是否已经同步
export async function isGameSynced(appId: number): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT app_id FROM game_details WHERE app_id = ${appId}
    `;
    return rows.length > 0;
  } catch (error) {
    log.error('检查游戏同步状态失败', error, { appId });
    return false;
  }
}

// 获取已同步的游戏数量
export async function getSyncedGamesCount(): Promise<number> {
  try {
    const rows = await sql`
      SELECT COUNT(*) as count FROM game_details
    `;
    return parseInt(rows[0].count) || 0;
  } catch (error) {
    log.error('获取已同步游戏数量失败', error);
    return 0;
  }
}

// 删除指定游戏的详情数据
export async function deleteGameDetails(appId: number): Promise<void> {
  try {
    await sql`
      DELETE FROM game_details WHERE app_id = ${appId}
    `;
    log.info('已删除游戏详情数据', { appId });
  } catch (error) {
    log.error('删除游戏详情数据失败', error, { appId });
    throw error;
  }
}
