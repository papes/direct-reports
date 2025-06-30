import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => require('next-router-mock'))

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}))

// Mock process.cwd
jest.mock('process', () => ({
  cwd: jest.fn(() => '/mock/path'),
}))

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}))

// Setup global fetch mock
global.fetch = jest.fn()

// Clean up mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})