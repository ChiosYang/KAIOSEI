import { NextRequest } from 'next/server';
import { POST } from '@/app/api/games/recommendation/route';
import { auth } from '@/auth';
import { getSimpleRagRecommendation, isRagServiceReady } from '@/lib/rag/simple_recommendation';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/rag/simple_recommendation');
jest.mock('@/lib/utils/logger', () => ({
  log: {
    api: {
      request: jest.fn(),
      response: jest.fn()
    },
    user: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockIsRagServiceReady = isRagServiceReady as jest.MockedFunction<typeof isRagServiceReady>;
const mockGetSimpleRagRecommendation = getSimpleRagRecommendation as jest.MockedFunction<typeof getSimpleRagRecommendation>;

describe('/api/games/recommendation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('应该在未认证时返回401', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该在用户没有ID时返回401', async () => {
      mockAuth.mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该在RAG服务未就绪时返回503', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockIsRagServiceReady.mockResolvedValue({
        ready: false,
        gameCount: 5
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('推荐服务未就绪');
      expect(data.error).toContain('当前已同步5个游戏');
    });

    it('应该成功返回游戏推荐', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockIsRagServiceReady.mockResolvedValue({
        ready: true,
        gameCount: 100
      });

      const mockRecommendation = {
        recommendation: {
          games: [
            {
              appid: 730,
              name: 'Counter-Strike 2',
              reason: '基于您玩过的射击游戏推荐'
            },
            {
              appid: 570,
              name: 'Dota 2',
              reason: '基于您的游戏时长推荐'
            }
          ],
          summary: '为您推荐了2款游戏'
        },
        metadata: {
          userTopGames: [
            { appid: 440, name: 'Team Fortress 2', playtime: 1000 }
          ],
          similarGamesFound: 2
        }
      };

      mockGetSimpleRagRecommendation.mockResolvedValue(mockRecommendation);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockIsRagServiceReady).toHaveBeenCalled();
      expect(mockGetSimpleRagRecommendation).toHaveBeenCalledWith('user-123');
      expect(data.success).toBe(true);
      expect(data.recommendation).toEqual(mockRecommendation.recommendation);
      expect(data.analysisData).toMatchObject({
        topGames: mockRecommendation.metadata.userTopGames,
        totalGames: 100
      });
      expect(data.analysisData.analysisTimestamp).toBeDefined();
    });

    it('应该处理RAG服务错误', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockIsRagServiceReady.mockResolvedValue({
        ready: true,
        gameCount: 100
      });

      mockGetSimpleRagRecommendation.mockRejectedValue(new Error('RAG service error'));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });

    it('应该处理空推荐结果', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockIsRagServiceReady.mockResolvedValue({
        ready: true,
        gameCount: 50
      });

      const mockRecommendation = {
        recommendation: {
          games: [],
          summary: '暂无推荐'
        },
        metadata: {
          userTopGames: [],
          similarGamesFound: 0
        }
      };

      mockGetSimpleRagRecommendation.mockResolvedValue(mockRecommendation);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recommendation.games).toEqual([]);
      expect(data.analysisData.topGames).toEqual([]);
    });

    it('应该处理服务就绪检查失败', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockIsRagServiceReady.mockRejectedValue(new Error('Service check failed'));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });
  });
});