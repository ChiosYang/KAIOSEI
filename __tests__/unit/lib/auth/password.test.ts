import { hashPassword, verifyPassword } from '@/lib/auth/password'

describe('Password Utilities', () => {
  const testPassword = 'TestPassword123!'
  
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hashedPassword = await hashPassword(testPassword)
      
      expect(hashedPassword).toBeDefined()
      expect(typeof hashedPassword).toBe('string')
      expect(hashedPassword).not.toBe(testPassword)
      expect(hashedPassword.length).toBeGreaterThan(0)
      // bcrypt hashes start with $2b$ or $2a$
      expect(hashedPassword).toMatch(/^\$2[ab]\$/)
    })

    it('should generate different hashes for the same password', async () => {
      const hash1 = await hashPassword(testPassword)
      const hash2 = await hashPassword(testPassword)
      
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty string', async () => {
      const hashedPassword = await hashPassword('')
      
      expect(hashedPassword).toBeDefined()
      expect(typeof hashedPassword).toBe('string')
    })

    it('should handle special characters', async () => {
      const specialPassword = '!@#$%^&*()_+{}[]|\\:";\'<>?,./~`'
      const hashedPassword = await hashPassword(specialPassword)
      
      expect(hashedPassword).toBeDefined()
      expect(typeof hashedPassword).toBe('string')
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hashedPassword = await hashPassword(testPassword)
      const isValid = await verifyPassword(testPassword, hashedPassword)
      
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const hashedPassword = await hashPassword(testPassword)
      const isValid = await verifyPassword('WrongPassword', hashedPassword)
      
      expect(isValid).toBe(false)
    })

    it('should be case sensitive', async () => {
      const hashedPassword = await hashPassword(testPassword)
      const isValid = await verifyPassword(testPassword.toLowerCase(), hashedPassword)
      
      expect(isValid).toBe(false)
    })

    it('should handle empty password verification', async () => {
      const hashedPassword = await hashPassword(testPassword)
      const isValid = await verifyPassword('', hashedPassword)
      
      expect(isValid).toBe(false)
    })

    it('should handle invalid hash format', async () => {
      const isValid = await verifyPassword(testPassword, 'invalid-hash')
      
      expect(isValid).toBe(false)
    })
  })
})