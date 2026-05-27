'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const comment = require('../lib/comment/index');
const { isRouteRegistered } = require('../lib/router/index');

describe('test/comment-parser.test.js', () => {
  let tmpDir;
  let testFile;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swagger-comment-test-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createController(content) {
    testFile = path.join(tmpDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
    fs.writeFileSync(testFile, content);
    return testFile;
  }

  it('should extract funcName from async method', () => {
    const file = createController(`
class Test {
  /**
   * @Controller test
   */
  index() {}

  /**
   * @summary test
   * @router get /api/test
   */
  async getData() {
    return 'ok';
  }
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[1].funcName, 'getData');
  });

  it('should extract funcName from sync method', () => {
    const file = createController(`
class Test {
  /**
   * @Controller test
   */
  index() {}

  /**
   * @summary test
   * @router get /api/test
   */
  getData() {
    return 'ok';
  }
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[1].funcName, 'getData');
  });

  it('should extract funcName from static async method', () => {
    const file = createController(`
class Test {
  /**
   * @Controller test
   */
  index() {}

  /**
   * @summary test
   * @router get /api/test
   */
  static async getData() {
    return 'ok';
  }
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[1].funcName, 'getData');
  });

  it('should extract funcName from static sync method', () => {
    const file = createController(`
class Test {
  /**
   * @Controller test
   */
  index() {}

  /**
   * @summary test
   * @router get /api/test
   */
  static getData() {
    return 'ok';
  }
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[1].funcName, 'getData');
  });

  it('should extract funcName from getter', () => {
    const file = createController(`
class Test {
  /**
   * @Controller test
   */
  index() {}

  /**
   * @summary test
   * @router get /api/test
   */
  get data() {
    return 'ok';
  }
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[1].funcName, 'data');
  });

  it('should extract funcName from setter', () => {
    const file = createController(`
class Test {
  /**
   * @Controller test
   */
  index() {}

  /**
   * @summary test
   * @router get /api/test
   */
  set data(val) {
    this._data = val;
  }
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[1].funcName, 'data');
  });

  it('should extract funcName from export function', () => {
    const file = createController(`
/**
 * @Controller test
 */
module.exports = class Test {
  /**
   * @summary test
   * @router get /api/test
   */
  async getData() {
    return 'ok';
  }
};
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[1].funcName, 'getData');
  });

  it('should extract funcName from arrow function assignment', () => {
    const file = createController(`
class Test {
  /**
   * @Controller test
   */
  index() {}

  /**
   * @summary test
   * @router get /api/test
   */
  getData = async () => {
    return 'ok';
  }
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[1].funcName, 'getData');
  });

  it('should extract funcName with TypeScript type annotation', () => {
    const file = createController(`
class Test {
  /**
   * @Controller test
   */
  index() {}

  /**
   * @summary test
   * @router get /api/test
   */
  async getData(): Promise<string> {
    return 'ok';
  }
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[1].funcName, 'getData');
  });

  it('should extract funcName when comment has blank line before function', () => {
    const file = createController(`
class Test {
  /**
   * @Controller test
   */
  index() {}

  /**
   * @summary test
   * @router get /api/test
   */

  async getData() {
    return 'ok';
  }
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[1].funcName, 'getData');
  });

  it('should extract funcName from multiple methods with mixed patterns', () => {
    const file = createController(`
class Test {
  /**
   * @Controller test
   */
  index() {}

  /**
   * @summary get
   * @router get /api/test/async
   */
  async getData() {}

  /**
   * @summary static
   * @router get /api/test/static
   */
  static async getStaticData() {}

  /**
   * @summary create
   * @router post /api/test
   */
  async create() {}

  /**
   * @summary delete
   * @router delete /api/test/{id}
   */
  static async deleteById() {}
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 5);
    assert.strictEqual(blocks[1].funcName, 'getData');
    assert.strictEqual(blocks[2].funcName, 'getStaticData');
    assert.strictEqual(blocks[3].funcName, 'create');
    assert.strictEqual(blocks[4].funcName, 'deleteById');
  });

  it('should return empty array for file without @Controller', () => {
    const file = createController(`
class Test {
  /**
   * @summary just a plain old method
   * @description no special annotations here
   */
  async getData() {}
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 0);
  });

  it('should include comment blocks with @ignore annotation', () => {
    const file = createController(`
class Test {
  /**
   * @Controller test
   */
  index() {}

  /**
   * @summary test
   * @router get /api/test
   * @ignore
   */
  async getData() {}
}
`);
    const blocks = comment.generateCommentBlocks(file);
    assert.strictEqual(blocks.length, 2);
    // Even ignored blocks should have funcName extracted
    assert.strictEqual(blocks[1].funcName, 'getData');
  });
});
