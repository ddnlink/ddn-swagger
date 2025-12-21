'use strict';

const assert = require('assert');

const {
  sortRouteEntries,
  normalizeRoutePath,
} = require('../lib/router/index');

describe('test/router-order.test.js', () => {
  it('should sort static route before param route (same method)', () => {
    const entries = [
      { req: { method: 'get', route: '/api/v1/daos/{id}' } },
      { req: { method: 'get', route: '/api/v1/daos/categories' } },
    ];

    const sorted = sortRouteEntries(entries);
    assert.strictEqual(sorted[0].req.route, '/api/v1/daos/categories');
    assert.strictEqual(sorted[1].req.route, '/api/v1/daos/{id}');
  });

  it('should normalize multiple path params', () => {
    assert.strictEqual(
      normalizeRoutePath('/api/v1/daos/{id}/tags/{tagId}'),
      '/api/v1/daos/:id/tags/:tagId'
    );
  });
});
