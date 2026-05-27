'use strict';

const assert = require('assert');
const { isRouteRegistered } = require('../lib/router/index');

describe('test/router-register.test.js', () => {

  function createMockRouter(routes) {
    return {
      stack: (routes || []).map(r => ({
        path: r.path,
        methods: r.methods || ['GET'],
      })),
    };
  }

  it('should return true when route exists with same method and path', () => {
    const router = createMockRouter([
      { path: '/api/v1/users', methods: ['GET'] },
      { path: '/api/v1/posts', methods: ['POST'] },
    ]);
    assert.strictEqual(isRouteRegistered(router, 'GET', '/api/v1/users'), true);
  });

  it('should return true when route exists with different method case', () => {
    const router = createMockRouter([
      { path: '/api/v1/users', methods: ['get'] },
    ]);
    assert.strictEqual(isRouteRegistered(router, 'GET', '/api/v1/users'), true);
  });

  it('should return false when route does not exist', () => {
    const router = createMockRouter([
      { path: '/api/v1/users', methods: ['GET'] },
    ]);
    assert.strictEqual(isRouteRegistered(router, 'GET', '/api/v1/nonexistent'), false);
  });

  it('should return false when method differs but path matches', () => {
    const router = createMockRouter([
      { path: '/api/v1/users', methods: ['GET'] },
    ]);
    assert.strictEqual(isRouteRegistered(router, 'POST', '/api/v1/users'), false);
  });

  it('should return false when path differs but method matches', () => {
    const router = createMockRouter([
      { path: '/api/v1/posts', methods: ['GET'] },
    ]);
    assert.strictEqual(isRouteRegistered(router, 'GET', '/api/v1/users'), false);
  });

  it('should normalize {param} to :param when checking', () => {
    const router = createMockRouter([
      { path: '/api/v1/users/:id', methods: ['GET'] },
    ]);
    // Auto-registration uses {param} which gets normalized
    assert.strictEqual(isRouteRegistered(router, 'GET', '/api/v1/users/{id}'), true);
  });

  it('should handle empty router.stack', () => {
    const router = createMockRouter([]);
    assert.strictEqual(isRouteRegistered(router, 'GET', '/api/v1/users'), false);
  });

  it('should handle undefined router.stack', () => {
    const router = {};
    assert.strictEqual(isRouteRegistered(router, 'GET', '/api/v1/users'), false);
  });

  it('should handle routes without path property', () => {
    const router = {
      stack: [
        { methods: ['GET'] }, // missing path
      ],
    };
    assert.strictEqual(isRouteRegistered(router, 'GET', '/api/v1/users'), false);
  });

  it('should handle multiple HTTP methods on same route', () => {
    const router = createMockRouter([
      { path: '/api/v1/users', methods: ['GET', 'POST', 'PUT'] },
    ]);
    assert.strictEqual(isRouteRegistered(router, 'GET', '/api/v1/users'), true);
    assert.strictEqual(isRouteRegistered(router, 'POST', '/api/v1/users'), true);
    assert.strictEqual(isRouteRegistered(router, 'PUT', '/api/v1/users'), true);
    assert.strictEqual(isRouteRegistered(router, 'DELETE', '/api/v1/users'), false);
  });
});
