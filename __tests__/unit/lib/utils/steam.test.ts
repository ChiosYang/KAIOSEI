import { 
  getPersonaState,
  formatDate,
  formatDateTime,
  isProfileError
} from '@/lib/utils/steam'

describe('Steam Utilities', () => {
  describe('getPersonaState', () => {
    it('should return correct persona state', () => {
      expect(getPersonaState(0)).toEqual({ 
        text: 'Offline', 
        color: 'text-gray-500',
        bgColor: 'bg-gray-400'
      })
      expect(getPersonaState(1)).toEqual({ 
        text: 'Online', 
        color: 'text-green-500',
        bgColor: 'bg-green-500'
      })
      expect(getPersonaState(2)).toEqual({ 
        text: 'Busy', 
        color: 'text-red-500',
        bgColor: 'bg-red-500'
      })
      expect(getPersonaState(3)).toEqual({ 
        text: 'Away', 
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500'
      })
      expect(getPersonaState(4)).toEqual({ 
        text: 'Snooze', 
        color: 'text-purple-500',
        bgColor: 'bg-purple-500'
      })
      expect(getPersonaState(5)).toEqual({ 
        text: 'Looking to trade', 
        color: 'text-blue-500',
        bgColor: 'bg-blue-500'
      })
      expect(getPersonaState(6)).toEqual({ 
        text: 'Looking to play', 
        color: 'text-green-600',
        bgColor: 'bg-green-600'
      })
    })

    it('should return unknown for invalid state', () => {
      expect(getPersonaState(99)).toEqual({ 
        text: 'Unknown', 
        color: 'text-gray-500',
        bgColor: 'bg-gray-400'
      })
      expect(getPersonaState(-1)).toEqual({ 
        text: 'Unknown', 
        color: 'text-gray-500',
        bgColor: 'bg-gray-400'
      })
    })
  })

  describe('formatDate', () => {
    it('should format Unix timestamp to date string', () => {
      // Test with a known timestamp: 2024-01-01 00:00:00 UTC
      const timestamp = 1704067200
      const result = formatDate(timestamp)
      
      expect(result).toContain('2024')
      expect(result).toContain('1') // January
    })

    it('should handle zero timestamp', () => {
      const result = formatDate(0)
      expect(result).toContain('1970')
    })

    it('should handle current timestamp', () => {
      const now = Math.floor(Date.now() / 1000)
      const result = formatDate(now)
      
      const currentYear = new Date().getFullYear()
      expect(result).toContain(currentYear.toString())
    })
  })

  describe('formatDateTime', () => {
    it('should format Unix timestamp to datetime string', () => {
      const timestamp = 1704067200
      const result = formatDateTime(timestamp)
      
      expect(result).toContain('2024')
      expect(result.length).toBeGreaterThan(10) // Should include time
    })

    it('should include time in the format', () => {
      const timestamp = 1704067200
      const result = formatDateTime(timestamp)
      
      // Should contain time separators
      expect(result).toMatch(/\d+:\d+/)
    })

    it('should handle zero timestamp', () => {
      const result = formatDateTime(0)
      expect(result).toContain('1970')
    })
  })

  describe('isProfileError', () => {
    it('should identify error objects', () => {
      const error = { error: 'Steam API error' }
      expect(isProfileError(error)).toBe(true)
    })

    it('should identify valid profile objects', () => {
      const profile = {
        steamid: '76561198000000000',
        personaname: 'TestUser',
        avatarfull: 'https://example.com/avatar.jpg'
      }
      expect(isProfileError(profile)).toBe(false)
    })

    it('should handle empty objects', () => {
      expect(isProfileError({})).toBe(false)
    })

    it('should handle null and undefined', () => {
      expect(isProfileError(null as any)).toBe(false)
      expect(isProfileError(undefined as any)).toBe(false)
    })
  })

  describe('PersonaState Type', () => {
    it('should have correct structure', () => {
      const state = getPersonaState(1) // Online state
      
      expect(state).toHaveProperty('text')
      expect(state).toHaveProperty('color')
      expect(state).toHaveProperty('bgColor')
      expect(typeof state.text).toBe('string')
      expect(typeof state.color).toBe('string')
      expect(typeof state.bgColor).toBe('string')
    })
  })

  describe('Date Formatting Edge Cases', () => {
    it('should handle negative timestamps', () => {
      const result = formatDate(-1)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should handle very large timestamps', () => {
      const farFuture = 9999999999
      const result = formatDate(farFuture)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should handle decimal timestamps', () => {
      const decimalTimestamp = 1704067200.5
      const result = formatDate(decimalTimestamp)
      expect(result).toBeDefined()
      expect(result).toContain('2024')
    })
  })
})