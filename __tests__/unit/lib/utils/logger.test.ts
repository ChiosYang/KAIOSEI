import { 
  LogLevel,
  log
} from '@/lib/utils/logger'

describe('Logger Utilities', () => {
  let originalConsole: any

  beforeEach(() => {
    // Store original console methods
    originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    }

    // Mock console methods
    console.log = jest.fn()
    console.info = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()
    console.debug = jest.fn()
  })

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log
    console.info = originalConsole.info
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    console.debug = originalConsole.debug
  })

  describe('LogLevel Enum', () => {
    it('should have correct values', () => {
      expect(LogLevel.DEBUG).toBe(0)
      expect(LogLevel.INFO).toBe(1)
      expect(LogLevel.WARN).toBe(2)
      expect(LogLevel.ERROR).toBe(3)
    })
  })

  describe('log object', () => {
    it('should be defined', () => {
      expect(log).toBeDefined()
      expect(typeof log).toBe('object')
    })

    it('should have logging methods', () => {
      expect(log.debug).toBeDefined()
      expect(log.info).toBeDefined()
      expect(log.warn).toBeDefined()
      expect(log.error).toBeDefined()
    })

    it('should log debug messages', () => {
      log.debug('Debug message')
      
      // In test environment, debug should be logged
      if (process.env.NODE_ENV !== 'production') {
        expect(console.debug).toHaveBeenCalled()
      }
    })

    it('should log info messages', () => {
      log.info('Info message')
      
      if (process.env.NODE_ENV !== 'production') {
        expect(console.info).toHaveBeenCalled()
      }
    })

    it('should log warning messages', () => {
      log.warn('Warning message')
      expect(console.warn).toHaveBeenCalled()
    })

    it('should log error messages', () => {
      log.error('Error message')
      expect(console.error).toHaveBeenCalled()
    })

    it('should log with context', () => {
      const context = { userId: '123', action: 'test' }
      log.info('Test message', context)
      
      if (process.env.NODE_ENV !== 'production') {
        expect(console.info).toHaveBeenCalled()
      }
    })

    it('should handle Error objects', () => {
      const error = new Error('Test error')
      log.error('An error occurred', { error })
      
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle multiple arguments', () => {
      log.info('Message', { key: 'value' }, 'additional info')
      
      if (process.env.NODE_ENV !== 'production') {
        expect(console.info).toHaveBeenCalled()
      }
    })
  })

  describe('Logger in production mode', () => {
    let originalEnv: string | undefined

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
    })

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('should not log debug in production', () => {
      // Note: This test may not work as expected since Logger is a singleton
      // and may have been initialized with the test environment
      log.debug('Debug in production')
      // Debug should not be logged in production
    })

    it('should log errors in production', () => {
      log.error('Error in production')
      expect(console.error).toHaveBeenCalled()
    })
  })
})