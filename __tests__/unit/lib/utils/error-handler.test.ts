import { 
  ErrorCode, 
  AppError
} from '@/lib/utils/error-handler'

describe('Error Handler Utilities', () => {
  describe('ErrorCode Enum', () => {
    it('should have error codes defined', () => {
      expect(ErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR')
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED')
      expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN')
      expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND')
      expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR')
      expect(ErrorCode.STEAM_API_ERROR).toBe('STEAM_API_ERROR')
    })
  })

  describe('AppError Class', () => {
    it('should create an error with default values', () => {
      const error = new AppError('Test error')
      
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR)
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(true)
      expect(error.name).toBe('AppError')
    })

    it('should create an error with custom values', () => {
      const error = new AppError(
        'Not found',
        ErrorCode.NOT_FOUND,
        404,
        true,
        { resourceId: '123' }
      )
      
      expect(error.message).toBe('Not found')
      expect(error.code).toBe(ErrorCode.NOT_FOUND)
      expect(error.statusCode).toBe(404)
      expect(error.isOperational).toBe(true)
      expect(error.context).toEqual({ resourceId: '123' })
    })

    it('should create validation error', () => {
      const error = new AppError(
        'Invalid input',
        ErrorCode.VALIDATION_ERROR,
        400
      )
      
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(error.statusCode).toBe(400)
    })

    it('should create unauthorized error', () => {
      const error = new AppError(
        'Unauthorized',
        ErrorCode.UNAUTHORIZED,
        401
      )
      
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED)
      expect(error.statusCode).toBe(401)
    })

    it('should create forbidden error', () => {
      const error = new AppError(
        'Forbidden',
        ErrorCode.FORBIDDEN,
        403
      )
      
      expect(error.code).toBe(ErrorCode.FORBIDDEN)
      expect(error.statusCode).toBe(403)
    })

    it('should create database error', () => {
      const error = new AppError(
        'Database connection failed',
        ErrorCode.DATABASE_ERROR,
        500,
        false
      )
      
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR)
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(false)
    })

    it('should create Steam API error', () => {
      const error = new AppError(
        'Steam API request failed',
        ErrorCode.STEAM_API_ERROR,
        502,
        true,
        { endpoint: '/api/steam/games' }
      )
      
      expect(error.code).toBe(ErrorCode.STEAM_API_ERROR)
      expect(error.statusCode).toBe(502)
      expect(error.context).toHaveProperty('endpoint')
    })

    it('should inherit from Error', () => {
      const error = new AppError('Test')
      
      expect(error.stack).toBeDefined()
      expect(error.toString()).toContain('AppError')
    })
  })
})