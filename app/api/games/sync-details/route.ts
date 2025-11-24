import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncUserLibrary, getSyncedGamesCount } from '@/lib/services/gamedata_service';
import { testEmbeddingService } from '@/lib/services/embedding_service';

export async function POST(request: NextRequest) {
    try {
        // 验证用户身份
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ 
                error: "未授权访问" 
            }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const withEmbedding = body?.withEmbedding ?? true;
        const userId = session.user.id;
        console.log(`用户 ${userId} 请求同步游戏库详情`);

        // 验证embedding服务是否正常
        if (withEmbedding) {
            const isEmbeddingServiceReady = await testEmbeddingService();
            if (!isEmbeddingServiceReady) {
                return NextResponse.json({
                    error: "AI服务未配置正确，请检查Google AI API密钥"
                }, { status: 500 });
            }
        }

        // 异步执行同步任务，立即返回响应避免前端超时
        syncUserLibrary(userId, { withEmbedding })
            .then(result => {
                console.log(`用户 ${userId} 游戏库同步完成:`, result);
            })
            .catch(error => {
                console.error(`用户 ${userId} 游戏库同步失败:`, error);
            });

        // 获取当前已同步的游戏数量
        const currentCount = await getSyncedGamesCount();

        return NextResponse.json({
            success: true,
            message: "游戏库详情同步任务已在后台启动",
            details: {
                currentSyncedCount: currentCount,
                estimatedTime: "根据游戏数量可能需要5-30分钟",
                status: "running"
            },
            options: { withEmbedding },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("同步API错误:", error);
        return NextResponse.json({
            error: "启动同步任务失败",
            details: error instanceof Error ? error.message : "未知错误"
        }, { status: 500 });
    }
}

// 获取同步状态的GET端点
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ 
                error: "未授权访问" 
            }, { status: 401 });
        }

        const syncedCount = await getSyncedGamesCount();
        
        return NextResponse.json({
            success: true,
            syncedGamesCount: syncedCount,
            lastCheck: new Date().toISOString()
        });

    } catch (error) {
        console.error("获取同步状态失败:", error);
        return NextResponse.json({
            error: "获取同步状态失败"
        }, { status: 500 });
    }
}
