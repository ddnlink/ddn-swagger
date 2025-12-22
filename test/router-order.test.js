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

  it('should preserve definition order for different paths (No Conflict)', () => {
    // Even though 'b' comes after 'a' alphabetically, if 'b' is defined first, it should stay first
    // unless there is a specific conflict rule (like static vs param).
    // In our logic: /api/v1/auth and /api/v1/users are "different types" at the last segment?
    // Actually, they are both Static segments. So typeA === typeB.
    // Then it falls through to: return (a._index || 0) - (b._index || 0);
    const entries = addIndex([
      { req: { method: 'get', route: '/api/v1/users' } },
      { req: { method: 'get', route: '/api/v1/auth' } },
    ]);

    const sorted = sortRouteEntries(entries);
    assert.strictEqual(sorted[0].req.route, '/api/v1/users');
    assert.strictEqual(sorted[1].req.route, '/api/v1/auth');
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

    // Expected order:
    // 1. /api/v1/users/profile (Static > Param for /users/...)
    // 2. /api/v1/users/{id}    (Param > Wildcard for /users/...)
    // 3. /api/v1/users/*       (Wildcard)
    // BUT wait, how does /api/v1/posts interact?
    // /api/v1/posts vs /api/v1/users/profile:
    // segments: posts vs users. Both Static.
    // They are different strings. Logic: if (sA === sB) continue; ... if (typeA !== typeB) ... return index - index.
    // So 'posts' vs 'users' -> types are same (Static). Returns index order.
    // So /api/v1/posts (index 2) should stay after things with index 0 and 1?
    // Let's trace:
    // A: users/{id} (0), B: users/profile (1). 'users'=='users'. '{id}'(Param) vs 'profile'(Static). Static wins. B < A.
    // A: users/{id} (0), B: posts (2). 'users' vs 'posts'. Both Static. Index 0 < 2. A < B.
    // This implies: users/profile < users/{id} < posts.
    // Let's check users/profile (1) vs posts (2). 'users' vs 'posts'. Both Static. Index 1 < 2. users/profile < posts.
    // So order: users/profile, users/{id}, posts, users/*

    assert.strictEqual(sorted[0].req.route, '/api/v1/users/profile');
    assert.strictEqual(sorted[1].req.route, '/api/v1/users/{id}');
    assert.strictEqual(sorted[2].req.route, '/api/v1/posts');
    assert.strictEqual(sorted[3].req.route, '/api/v1/users/*');
  });

  it('should normalize multiple path params', () => {
    assert.strictEqual(
      normalizeRoutePath('/api/v1/daos/{id}/tags/{tagId}'),
      '/api/v1/daos/:id/tags/:tagId'
    );
  });
});
