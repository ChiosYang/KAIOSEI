import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/steam/sync-games/route';
import { auth } from '@/auth';
import { getUserSteamConfig } from '@/lib/services/config';
import { upsertUserGames, getLastSyncTime } from '@/lib/db/user-games';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/services/config');
jest.mock('@/lib/db/user-games');

// Mock fetch
global.fetch = jest.fn();

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockGetUserSteamConfig = getUserSteamConfig as jest.MockedFunction<typeof getUserSteamConfig>;
const mockUpsertUserGames = upsertUserGames as jest.MockedFunction<typeof upsertUserGames>;
const mockGetLastSyncTime = getLastSyncTime as jest.MockedFunction<typeof getLastSyncTime>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('/api/steam/sync-games', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('POST', () => {
    it('应该在未认证时返回401', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/steam/sync-games');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该在缺少Steam配置时返回400', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserSteamConfig.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/steam/sync-games');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Steam API configuration not found');
    });

    it('应该在最近同步过时跳过同步', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserSteamConfig.mockResolvedValue({
        steamApiKey: 'test-api-key',
        steamId: 'test-steam-id'
      });

      const recentSyncTime = new Date(Date.now() - 30 * 60 * 1000); // 30分钟前
      mockGetLastSyncTime.mockResolvedValue(recentSyncTime);

      const request = new NextRequest('http://localhost/api/steam/sync-games', {
        method: 'POST',
        body: JSON.stringify({})
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.needsSync).toBe(false);
      expect(data.message).toBe('Games synced recently');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('应该在强制同步时忽略时间限制', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserSteamConfig.mockResolvedValue({
        steamApiKey: 'test-api-key',
        steamId: 'test-steam-id'
      });

      const recentSyncTime = new Date(Date.now() - 30 * 60 * 1000);
      mockGetLastSyncTime.mockResolvedValue(recentSyncTime);

      // Mock Steam API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: {
            game_count: 1,
            games: [
              {
                appid: 730,
                name: 'Counter-Strike 2',
                playtime_forever: 12000,
                img_icon_url: 'icon.jpg'
              }
            ]
          }
        })
      } as Response);

      const request = new NextRequest('http://localhost/api/steam/sync-games', {
        method: 'POST',
        body: JSON.stringify({ force: true })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Games synced successfully');
      expect(data.gamesCount).toBe(1);
      expect(mockUpsertUserGames).toHaveBeenCalled();
    });

    it('应该成功同步游戏', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserSteamConfig.mockResolvedValue({
        steamApiKey: 'test-api-key',
        steamId: 'test-steam-id'
      });

      mockGetLastSyncTime.mockResolvedValue(null); // 从未同步过

      // Mock Steam API response
      mockFetch.mockImplementation(async (url) => {
        const urlString = url.toString();
        
        if (urlString.includes('api.steampowered.com')) {
          return {
            ok: true,
            json: async () => ({
              response: {
                game_count: 2,
                games: [
                  {
                    appid: 730,
                    name: 'Counter-Strike 2',
                    playtime_forever: 12000,
                    img_icon_url: 'icon1.jpg'
                  },
                  {
                    appid: 570,
                    name: 'Dota 2',
                    playtime_forever: 8000,
                    img_icon_url: 'icon2.jpg'
                  }
                ]
              }
            })
          } as Response;
        }
        
        // Mock Store API response for app details
        if (urlString.includes('store.steampowered.com')) {
          const appId = new URL(urlString).searchParams.get('appids');
          return {
            ok: true,
            json: async () => ({
              [appId!]: {
                success: true,
                data: {
                  header_image: `header_${appId}.jpg`
                }
              }
            })
          } as Response;
        }
        
        throw new Error('Unexpected URL');
      });

      const request = new NextRequest('http://localhost/api/steam/sync-games', {
        method: 'POST',
        body: JSON.stringify({})
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Games synced successfully');
      expect(data.gamesCount).toBe(2);
      expect(mockUpsertUserGames).toHaveBeenCalledWith('user-123', expect.arrayContaining([
        expect.objectContaining({
          appid: 730,
          name: 'Counter-Strike 2',
          header_image: 'header_730.jpg'
        }),
        expect.objectContaining({
          appid: 570,
          name: 'Dota 2',
          header_image: 'header_570.jpg'
        })
      ]));
    });

    it('应该处理没有游戏的情况', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserSteamConfig.mockResolvedValue({
        steamApiKey: 'test-api-key',
        steamId: 'test-steam-id'
      });

      mockGetLastSyncTime.mockResolvedValue(null);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: {
            game_count: 0,
            games: []
          }
        })
      } as Response);

      const request = new NextRequest('http://localhost/api/steam/sync-games', {
        method: 'POST',
        body: JSON.stringify({})
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('No games found');
      expect(data.gamesCount).toBe(0);
      expect(mockUpsertUserGames).not.toHaveBeenCalled();
    });

    it('应该处理Steam API错误', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserSteamConfig.mockResolvedValue({
        steamApiKey: 'test-api-key',
        steamId: 'test-steam-id'
      });

      mockGetLastSyncTime.mockResolvedValue(null);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403
      } as Response);

      const request = new NextRequest('http://localhost/api/steam/sync-games', {
        method: 'POST',
        body: JSON.stringify({})
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to sync games');
      expect(data.details).toContain('Steam API request failed');
    });
  });

  describe('GET', () => {
    it('应该返回同步状态', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      const lastSyncTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2小时前
      mockGetLastSyncTime.mockResolvedValue(lastSyncTime);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.lastSync).toBe(lastSyncTime.toISOString());
      expect(data.needsSync).toBe(true);
      expect(data.syncAge).toBeGreaterThan(0);
    });

    it('应该在未认证时返回401', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该处理从未同步的情况', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetLastSyncTime.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.lastSync).toBeNull();
      expect(data.needsSync).toBe(true);
      expect(data.syncAge).toBeNull();
    });
  });
});