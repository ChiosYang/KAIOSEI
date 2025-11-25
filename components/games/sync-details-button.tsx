'use client';

import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Database, CheckCircle } from 'lucide-react';

interface SyncStatus {
  syncedGamesCount: number;
  lastCheck: string;
}

export function SyncDetailsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [withEmbedding, setWithEmbedding] = useState(true);
  const [lastSyncedCount, setLastSyncedCount] = useState<number | null>(null);

  // 获取当前同步状态
  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/games/sync-details');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus({
          syncedGamesCount: data.syncedGamesCount,
          lastCheck: data.lastCheck
        });
        // 如果后台同步期间数量已增长，则认为同步结束
        if (
          isSyncing &&
          typeof data.syncedGamesCount === 'number' &&
          lastSyncedCount !== null &&
          data.syncedGamesCount > lastSyncedCount
        ) {
          setIsSyncing(false);
        }
        setLastSyncedCount(data.syncedGamesCount);
      }
    } catch (error) {
      console.error('获取同步状态失败:', error);
    }
  }, [isSyncing, lastSyncedCount]);

  // 组件加载时获取状态
  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  // 处理同步操作
  const handleSync = async () => {
    setIsLoading(true);
    setIsSyncing(true);
    
    try {
      const response = await fetch('/api/games/sync-details', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ withEmbedding })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success("同步任务已启动！", {
          description: data.message || "游戏库详情正在后台同步，请稍后刷新查看结果",
          duration: 5000,
        });
        
        // 更新同步状态
        if (data.details?.currentSyncedCount !== undefined) {
          setSyncStatus({
            syncedGamesCount: data.details.currentSyncedCount,
            lastCheck: new Date().toISOString()
          });
          setLastSyncedCount(data.details.currentSyncedCount);
        }
        
        // 10秒后刷新状态
        setTimeout(() => {
          fetchSyncStatus();
        }, 10000);
        
      } else {
        toast.error("同步启动失败", {
          description: data.error || "请稍后再试或检查网络连接",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('同步请求失败:', error);
      toast.error("请求失败", {
        description: "网络错误，请检查连接后重试",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新状态
  const refreshStatus = async () => {
    await fetchSyncStatus();
    toast.info("状态已刷新");
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              游戏库详情同步
            </h3>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            使用RAG技术分析您的游戏库，为每个游戏生成向量化表示，提供更精准的推荐。
          </p>
          {(isLoading || isSyncing) && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-4">
              后台同步任务正在运行，请稍候...
            </p>
          )}
          
          <div className="flex items-center space-x-2 mb-4 text-sm text-gray-700 dark:text-gray-200">
            <input
              id="with-embedding"
              type="checkbox"
              checked={withEmbedding}
              onChange={(e) => setWithEmbedding(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="with-embedding">
              生成向量（用于智能推荐）。关闭则仅同步基础详情，速度更快但无法使用推荐功能。
            </label>
          </div>
          
          {/* 同步状态显示 */}
          {syncStatus && (
            <div className="flex items-center space-x-4 mb-4 text-sm">
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  已同步 {syncStatus.syncedGamesCount} 个游戏
                </span>
              </div>
              
              <button
                onClick={refreshStatus}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                刷新状态
              </button>
            </div>
          )}
          
          {/* 功能说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              RAG推荐系统优势：
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• 基于游戏内容语义相似度进行推荐</li>
              <li>• 考虑游戏类型、标签、开发商等多维度信息</li>
              <li>• 使用Google Gemini embedding技术，完全免费</li>
              <li>• 推荐质量显著优于传统方法</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col space-y-2 ml-4">
          <Button 
            onClick={handleSync} 
            disabled={isLoading || isSyncing} 
            variant="default"
            size="sm"
            className="min-w-[120px]"
          >
            {isLoading || isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                同步中...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                开始同步
              </>
            )}
          </Button>
          
          {syncStatus && (
            <div className="text-xs text-center text-gray-500 dark:text-gray-400">
              最后检查:<br />
              {new Date(syncStatus.lastCheck).toLocaleString('zh-CN')}
            </div>
          )}
        </div>
      </div>

      {/* 注意事项 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>注意：</strong>首次同步可能需要5-30分钟，具体时间取决于您的游戏库大小。
          同步过程在后台进行，您可以继续使用其他功能。
        </p>
      </div>
    </div>
  );
}
