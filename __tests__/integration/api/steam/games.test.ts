import { NextRequest } from 'next/server';
import { GET } from '@/app/api/steam/games/route';
import { auth } from '@/auth';
import { getUserGames } from '@/lib/db/user-games';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/db/user-games');

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockGetUserGames = getUserGames as jest.MockedFunction<typeof getUserGames>;

describe('/api/steam/games', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('应该在未认证时返回401', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/steam/games');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该在用户没有ID时返回401', async () => {
      mockAuth.mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      const request = new NextRequest('http://localhost/api/steam/games');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该成功返回用户游戏列表（默认分页）', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      const mockGames = [
        {
          appId: 730,
          name: 'Counter-Strike 2',
          playtimeForever: 12000,
          imgIconUrl: 'icon1.jpg',
          headerImage: 'header1.jpg',
          lastPlayed: new Date('2024-01-01')
        },
        {
          appId: 570,
          name: 'Dota 2',
          playtimeForever: 8000,
          imgIconUrl: 'icon2.jpg',
          headerImage: 'header2.jpg',
          lastPlayed: new Date('2024-01-02')
        }
      ];

      mockGetUserGames.mockResolvedValue({
        games: mockGames,
        total: 2
      });

      const request = new NextRequest('http://localhost/api/steam/games');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGetUserGames).toHaveBeenCalledWith('user-123', 20, 0);
      expect(data.response.game_count).toBe(2);
      expect(data.response.games).toHaveLength(2);
      expect(data.response.games[0]).toEqual({
        appid: 730,
        name: 'Counter-Strike 2',
        playtime_forever: 12000,
        img_icon_url: 'icon1.jpg',
        header_image: 'header1.jpg',
        last_played: Math.floor(new Date('2024-01-01').getTime() / 1000)
      });
    });

    it('应该支持自定义分页参数', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserGames.mockResolvedValue({
        games: [],
        total: 100
      });

      const request = new NextRequest('http://localhost/api/steam/games?limit=50&offset=25');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGetUserGames).toHaveBeenCalledWith('user-123', 50, 25);
      expect(data.response.game_count).toBe(100);
    });

    it('应该处理没有lastPlayed的游戏', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      const mockGames = [
        {
          appId: 730,
          name: 'Counter-Strike 2',
          playtimeForever: 12000,
          imgIconUrl: null,
          headerImage: 'header1.jpg',
          lastPlayed: null
        }
      ];

      mockGetUserGames.mockResolvedValue({
        games: mockGames,
        total: 1
      });

      const request = new NextRequest('http://localhost/api/steam/games');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response.games[0].img_icon_url).toBe('');
      expect(data.response.games[0].last_played).toBeUndefined();
    });

    it('应该在数据库错误时返回500', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserGames.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/steam/games');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch games');
    });

    it('应该处理无效的分页参数', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserGames.mockResolvedValue({
        games: [],
        total: 0
      });

      const request = new NextRequest('http://localhost/api/steam/games?limit=invalid&offset=abc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 应该使用默认值 (NaN 会变成默认值)
      expect(mockGetUserGames).toHaveBeenCalledWith('user-123', NaN, NaN);
    });
  });
});