// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
const { TextDecoder, TextEncoder } = require('util')

// Add TextDecoder/TextEncoder globals for Node environment
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.AUTH_SECRET = 'test-auth-secret-key-for-testing-only'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.GITHUB_CLIENT_ID = 'test-github-client-id'
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

// Mock fetch for Node.js environment
if (typeof fetch === 'undefined') {
  global.fetch = jest.fn(() => 
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    })
  )
}

// Mock Request/Response for Next.js
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(url, init) {
      this.url = url
      this.method = (init && init.method) || 'GET'
      this.headers = new Map()
      this.body = init && init.body
    }
  }
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body
      this.status = (init && init.status) || 200
      this.statusText = (init && init.statusText) || 'OK'
      this.headers = new Map()
      this.ok = this.status >= 200 && this.status < 300
    }
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
  }
}

// Mock ReadableStream for Node.js environment
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor() {}
  }
}

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => {
      const response = new Response(JSON.stringify(body), init)
      response.json = async () => body
      return response
    })
  },
  NextRequest: class NextRequest {
    constructor(url, init) {
      this._url = url
      this.method = (init && init.method) || 'GET'
      this.headers = new Map()
      this.body = init && init.body
    }
    get url() {
      return this._url
    }
    async json() {
      return this.body ? JSON.parse(this.body) : {}
    }
  }
}))