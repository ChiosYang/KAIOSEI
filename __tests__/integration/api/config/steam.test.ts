import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/config/steam/route';
import { auth } from '@/auth';
import { 
  saveUserSteamConfig, 
  getUserSteamConfig, 
  deleteUserSteamConfig, 
  testSteamConfig 
} from '@/lib/services/config';
import { revalidateTag } from 'next/cache';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/services/config');
jest.mock('next/cache', () => ({
  revalidateTag: jest.fn()
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockSaveUserSteamConfig = saveUserSteamConfig as jest.MockedFunction<typeof saveUserSteamConfig>;
const mockGetUserSteamConfig = getUserSteamConfig as jest.MockedFunction<typeof getUserSteamConfig>;
const mockDeleteUserSteamConfig = deleteUserSteamConfig as jest.MockedFunction<typeof deleteUserSteamConfig>;
const mockTestSteamConfig = testSteamConfig as jest.MockedFunction<typeof testSteamConfig>;
const mockRevalidateTag = revalidateTag as jest.MockedFunction<typeof revalidateTag>;

describe('/api/config/steam', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('应该在未认证时返回401', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该成功返回用户配置（部分隐藏API Key）', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserSteamConfig.mockResolvedValue({
        steamApiKey: 'ABCDEFGH1234567890ABCDEFGH1234567890',
        steamId: '76561198000000000'
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.config).toEqual({
        steamApiKey: 'ABCDEFGH••••••••••••••••••••••••',
        steamId: '76561198000000000'
      });
    });

    it('应该在没有配置时返回null', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserSteamConfig.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.config).toBeNull();
    });

    it('应该处理获取配置错误', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockGetUserSteamConfig.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get configuration');
    });
  });

  describe('POST', () => {
    it('应该在未认证时返回401', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/config/steam', {
        method: 'POST',
        body: JSON.stringify({
          steamApiKey: 'test-key',
          steamId: 'test-id'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该在缺少必要字段时返回400', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      const request = new NextRequest('http://localhost/api/config/steam', {
        method: 'POST',
        body: JSON.stringify({
          steamApiKey: 'test-key'
          // 缺少 steamId
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Steam API Key and Steam ID are required');
    });

    it('应该在配置验证失败时返回400', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockTestSteamConfig.mockResolvedValue({
        valid: false,
        error: 'Invalid API key'
      });

      const request = new NextRequest('http://localhost/api/config/steam', {
        method: 'POST',
        body: JSON.stringify({
          steamApiKey: 'invalid-key',
          steamId: 'test-id'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Configuration test failed: Invalid API key');
      expect(mockSaveUserSteamConfig).not.toHaveBeenCalled();
    });

    it('应该成功保存配置', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockTestSteamConfig.mockResolvedValue({
        valid: true
      });

      mockSaveUserSteamConfig.mockResolvedValue({
        success: true
      });

      const request = new NextRequest('http://localhost/api/config/steam', {
        method: 'POST',
        body: JSON.stringify({
          steamApiKey: 'valid-key',
          steamId: '76561198000000000'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Configuration saved successfully');
      expect(data.tested).toBe(true);
      expect(mockTestSteamConfig).toHaveBeenCalledWith({
        steamApiKey: 'valid-key',
        steamId: '76561198000000000'
      });
      expect(mockSaveUserSteamConfig).toHaveBeenCalledWith('user-123', {
        steamApiKey: 'valid-key',
        steamId: '76561198000000000'
      });
      expect(mockRevalidateTag).toHaveBeenCalledWith('steam-profile');
    });

    it('应该处理保存失败', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockTestSteamConfig.mockResolvedValue({
        valid: true
      });

      mockSaveUserSteamConfig.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const request = new NextRequest('http://localhost/api/config/steam', {
        method: 'POST',
        body: JSON.stringify({
          steamApiKey: 'valid-key',
          steamId: '76561198000000000'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Database error');
    });
  });

  describe('DELETE', () => {
    it('应该在未认证时返回401', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('应该成功删除配置', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockDeleteUserSteamConfig.mockResolvedValue(true);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Configuration deleted successfully');
      expect(mockDeleteUserSteamConfig).toHaveBeenCalledWith('user-123');
      expect(mockRevalidateTag).toHaveBeenCalledWith('steam-profile');
    });

    it('应该处理删除失败', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockDeleteUserSteamConfig.mockResolvedValue(false);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete configuration');
    });

    it('应该处理删除时的异常', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date().toISOString()
      } as any);

      mockDeleteUserSteamConfig.mockRejectedValue(new Error('Database error'));

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete configuration');
    });
  });
});