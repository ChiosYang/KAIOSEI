'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SyncGamesButtonProps {
  className?: string;
}

interface SyncStatus {
  lastSync: string | null;
  needsSync: boolean;
  syncAge: number | null;
}

interface SyncResponse {
  message: string;
  gamesCount?: number;
  syncedAt: string;
  needsSync: boolean;
}

export default function SyncGamesButton({ className }: SyncGamesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/steam/sync-games');
      if (response.ok) {
        const status: SyncStatus = await response.json();
        setSyncStatus(status);
        return status;
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
    return null;
  };

  const handleSync = async (force = false) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/steam/sync-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force }),
      });

      const data: SyncResponse = await response.json();

      if (response.ok) {
        toast.success(data.message, {
          description: data.gamesCount ? `同步了 ${data.gamesCount} 个游戏` : undefined,
        });
        
        // 更新同步状态
        setSyncStatus({
          lastSync: data.syncedAt,
          needsSync: data.needsSync,
          syncAge: 0
        });
      } else {
        toast.error('同步失败', {
          description: '请检查Steam配置是否正确',
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('同步失败', {
        description: '网络错误，请稍后重试',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatSyncAge = (syncAge: number | null) => {
    if (!syncAge) return '刚刚';
    
    const minutes = Math.floor(syncAge / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小时前`;
    if (minutes > 0) return `${minutes} 分钟前`;
    return '刚刚';
  };

  // 初始化时获取同步状态
  useEffect(() => {
    fetchSyncStatus();
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {syncStatus && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {syncStatus.needsSync ? (
            <>
              <Clock className="h-4 w-4" />
              <span>需要同步</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>
                {syncStatus.lastSync 
                  ? `上次同步: ${formatSyncAge(syncStatus.syncAge)}` 
                  : '从未同步'
                }
              </span>
            </>
          )}
        </div>
      )}
      
      <Button
        onClick={() => handleSync(false)}
        disabled={isLoading}
        variant={syncStatus?.needsSync ? "default" : "outline"}
        size="sm"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? '同步中...' : '同步游戏库'}
      </Button>
      
      {/* {syncStatus && !syncStatus.needsSync && (
        <Button
          onClick={() => handleSync(true)}
          disabled={isLoading}
          variant="ghost"
          size="sm"
        >
          强制同步
        </Button>
      )} */}
    </div>
  );
}
