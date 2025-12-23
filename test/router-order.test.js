'use strict';

const assert = require('assert');

const {
  sortRouteEntries,
  normalizeRoutePath,
} = require('../lib/router/index');

describe('test/router-order.test.js', () => {

  // Helper to simulate the _index added by RouterRegister
  function addIndex(entries) {
    return entries.map((e, i) => ({ ...e, _index: i }));
  }

  it('should sort static route before param route (Conflict Resolution)', () => {
    const entries = addIndex([
      { req: { method: 'get', route: '/api/v1/daos/{id}' } },
      { req: { method: 'get', route: '/api/v1/daos/categories' } },
    ]);

    const sorted = sortRouteEntries(entries);
    assert.strictEqual(sorted[0].req.route, '/api/v1/daos/categories');
    assert.strictEqual(sorted[1].req.route, '/api/v1/daos/{id}');
  });

  it('should sort param route before wildcard route (Conflict Resolution)', () => {
    const entries = addIndex([
      { req: { method: 'get', route: '/api/v1/files/*' } },
      { req: { method: 'get', route: '/api/v1/files/{id}' } },
    ]);

    const sorted = sortRouteEntries(entries);
    assert.strictEqual(sorted[0].req.route, '/api/v1/files/{id}');
    assert.strictEqual(sorted[1].req.route, '/api/v1/files/*');
  });

  it('should group different static paths alphabetically', () => {
    // To avoid mixing routes (e.g. /dao and /daos), we sort static segments alphabetically
    const entries = addIndex([
      { req: { method: 'get', route: '/api/v1/users' } },
      { req: { method: 'get', route: '/api/v1/auth' } },
    ]);

    const sorted = sortRouteEntries(entries);
    assert.strictEqual(sorted[0].req.route, '/api/v1/auth');
    assert.strictEqual(sorted[1].req.route, '/api/v1/users');
  });

  it('should preserve definition order for same path different methods', () => {
    const entries = addIndex([
      { req: { method: 'post', route: '/api/v1/users' } },
      { req: { method: 'get', route: '/api/v1/users' } },
    ]);

    const sorted = sortRouteEntries(entries);
    assert.strictEqual(sorted[0].req.method, 'post');
    assert.strictEqual(sorted[1].req.method, 'get');
  });

  it('should handle complex mixed scenarios', () => {
    const entries = addIndex([
      { req: { method: 'get', route: '/api/v1/users/{id}' } },       // 0. Param
      { req: { method: 'get', route: '/api/v1/users/profile' } },    // 1. Static (Should move up)
      { req: { method: 'get', route: '/api/v1/posts' } },            // 2. Static (Different path, keep order relative to others)
      { req: { method: 'get', route: '/api/v1/users/*' } },          // 3. Wildcard (Should move down)
    ]);

    const sorted = sortRouteEntries(entries);

    // New Expected order (Alphabetical Grouping for Static):
    // 1. /api/v1/posts         (posts < users)
    // 2. /api/v1/users/profile (Static > Param for /users/...)
    // 3. /api/v1/users/{id}    (Param > Wildcard for /users/...)
    // 4. /api/v1/users/*       (Wildcard)

    assert.strictEqual(sorted[0].req.route, '/api/v1/posts');
    assert.strictEqual(sorted[1].req.route, '/api/v1/users/profile');
    assert.strictEqual(sorted[2].req.route, '/api/v1/users/{id}');
    assert.strictEqual(sorted[3].req.route, '/api/v1/users/*');
  });

  it('should normalize multiple path params', () => {
    assert.strictEqual(
      normalizeRoutePath('/api/v1/daos/{id}/tags/{tagId}'),
      '/api/v1/daos/:id/tags/:tagId'
    );
  });
});
