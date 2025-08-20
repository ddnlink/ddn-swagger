# 接口开发规范

## 目录

- [概述](#概述)
- [接口设计原则](#接口设计原则)
- [认证授权规范](#认证授权规范)
- [请求响应格式标准](#请求响应格式标准)
- [错误处理规范](#错误处理规范)
- [API版本管理](#api版本管理)
- [文档编写标准](#文档编写标准)
- [代码示例和最佳实践](#代码示例和最佳实践)
- [开发工具和配置](#开发工具和配置)
- [测试规范](#测试规范)
- [部署和维护](#部署和维护)

## 概述

本文档基于 DDN 项目的 `@ddn/swagger-docs` 插件，为 DDN 生态系统中的接口开发制定统一的规范和标准。该规范旨在确保接口的一致性、可维护性和安全性，同时提供自动化的文档生成和认证机制。

### 核心特性

- **注解驱动**：通过标准化注解自动生成 OpenAPI 3.0 文档
- **安全认证**：支持多种认证方式的自动映射和中间件集成
- **自动路由**：基于注解自动注册路由和中间件
- **类型验证**：Contract 定义自动生成验证规则
- **文档同步**：代码与文档保持实时同步

### 技术栈

- **框架**：Egg.js
- **文档标准**：OpenAPI 3.0.3
- **UI界面**：Swagger UI
- **认证方式**：API Key、OAuth2、自定义认证
- **数据验证**：基于 Contract 的自动验证

## 接口设计原则

### 1. RESTful 设计原则

#### 1.1 资源导向设计

接口应以资源为中心进行设计，使用名词而非动词：

```javascript
// ✅ 正确示例
GET    /api/users          // 获取用户列表
GET    /api/users/{id}     // 获取特定用户
POST   /api/users          // 创建用户
PUT    /api/users/{id}     // 更新用户
DELETE /api/users/{id}     // 删除用户

// ❌ 错误示例
GET    /api/getUsers       // 使用动词
POST   /api/createUser     // 使用动词
```

#### 1.2 HTTP 方法语义

严格按照 HTTP 方法的语义使用：

| 方法 | 用途 | 幂等性 | 安全性 |
|------|------|--------|--------|
| GET | 获取资源 | ✅ | ✅ |
| POST | 创建资源 | ❌ | ❌ |
| PUT | 完整更新资源 | ✅ | ❌ |
| PATCH | 部分更新资源 | ❌ | ❌ |
| DELETE | 删除资源 | ✅ | ❌ |

#### 1.3 状态码规范

使用标准 HTTP 状态码：

```javascript
// 成功响应
200 OK          // 请求成功
201 Created     // 资源创建成功
204 No Content  // 请求成功但无返回内容

// 客户端错误
400 Bad Request     // 请求参数错误
401 Unauthorized    // 未认证
403 Forbidden       // 无权限
404 Not Found       // 资源不存在
409 Conflict        // 资源冲突
422 Unprocessable Entity // 参数验证失败

// 服务器错误
500 Internal Server Error // 服务器内部错误
502 Bad Gateway          // 网关错误
503 Service Unavailable  // 服务不可用
```

### 2. 接口命名规范

#### 2.1 URL 路径规范

```javascript
// 基础格式
/api/{version}/{resource}[/{id}][/{sub-resource}]

// 示例
/api/v1/users                    // 用户资源
/api/v1/users/123               // 特定用户
/api/v1/users/123/orders        // 用户的订单
/api/v1/courses/456/chapters    // 课程的章节
```

#### 2.2 查询参数规范

```javascript
// 分页参数
?page=1&limit=20&offset=0

// 排序参数
?sort=created_at&order=desc

// 过滤参数
?status=active&category=tech

// 搜索参数
?search=keyword&fields=title,content

// 字段选择
?fields=id,name,email
```

### 3. 数据格式规范

#### 3.1 请求数据格式

```javascript
// JSON 格式（推荐）
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "age": 25
}

// 表单格式（文件上传）
Content-Type: multipart/form-data

// URL 编码格式（简单表单）
Content-Type: application/x-www-form-urlencoded
```

#### 3.2 响应数据格式

统一的响应格式：

```javascript
// 成功响应
{
  "status": 0,           // 0 表示成功
  "msg": "success",      // 状态消息
  "data": {              // 实际数据
    "id": 123,
    "name": "张三"
  }
}

// 列表响应
{
  "status": 0,
  "msg": "success",
  "data": {
    "items": [...],      // 数据列表
    "total": 100,        // 总数
    "page": 1,           // 当前页
    "limit": 20          // 每页数量
  }
}

// 错误响应
{
  "status": 400,         // 错误状态码
  "msg": "参数错误",      // 错误消息
  "data": {
    "errors": [          // 详细错误信息
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  }
}
```

## 认证授权规范

基于 ddn-swagger 的安全认证功能，支持多种认证方式的自动映射和中间件集成。

### 1. 认证方式概述

#### 1.1 支持的认证类型

| 认证类型 | 适用场景 | 安全级别 | 实现复杂度 |
|----------|----------|----------|------------|
| API Key | 服务间调用、第三方集成 | 中 | 低 |
| OAuth2 | 用户授权、第三方应用 | 高 | 高 |
| JWT Token | 用户会话、移动应用 | 高 | 中 |
| Session | Web 应用、管理后台 | 中 | 低 |

#### 1.2 认证配置结构

```javascript
// config/config.default.js
exports.swaggerdoc = {
  // 启用安全功能
  enableSecurity: true,
  
  // 启用自动路由注册
  routerMap: true,
  
  // 安全方案定义
  securitySchemes: {
    // API Key 认证
    apikey: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: '管理员认证令牌'
    },
    
    // 自定义 API Key
    apiId: {
      type: 'apiKey',
      name: 'X-API-Id',
      in: 'header',
      description: 'API 密钥认证'
    },
    
    // OAuth2 认证
    oauth2: {
      type: 'oauth2',
      tokenUrl: 'https://api.example.com/oauth/token',
      flow: 'password',
      scopes: {
        'read': '读取权限',
        'write': '写入权限',
        'admin': '管理员权限'
      }
    }
  },
  
  // 中间件映射
  securityMiddlewareMap: {
    'apikey': 'sys.authAdminToken',      // 管理员认证
    'apiId': 'apiAuth',                  // API 密钥认证
    'oauth2': 'oauth.tokenValidator'     // OAuth2 认证
  }
};
```

### 2. API Key 认证

#### 2.1 配置示例

```javascript
// 安全方案定义
securitySchemes: {
  apikey: {
    type: 'apiKey',
    name: 'Authorization',    // HTTP 头名称
    in: 'header',            // 位置：header/query/cookie
    description: 'Bearer token for admin authentication'
  }
}

// 中间件映射
securityMiddlewareMap: {
  'apikey': 'sys.authAdminToken'
}
```

#### 2.2 中间件实现

```javascript
// app/middleware/sys/authAdminToken.js
'use strict';

module.exports = options => {
  return async function authAdminToken(ctx, next) {
    // 支持排除特定路径
    if (options && ctx.helper._.find(options.exclude, o => ctx.url.indexOf(o) !== -1)) {
      return await next();
    }

    // 获取认证信息
    const token = ctx.session.adminToken || ctx.get('Authorization');
    
    // 解析 Bearer token
    const bearerToken = token && token.startsWith('Bearer ') 
      ? token.slice(7) 
      : token;
    
    const userInfo = ctx.helper.deToken(bearerToken);

    if (userInfo) {
      // 设置用户上下文
      ctx.userInfo = userInfo;
      ctx.isAdmin = userInfo.admin || false;
      await next();
    } else {
      // 认证失败处理
      if (ctx.request.accepts(['json', 'html']) === 'html') {
        ctx.session.adminToken = null;
        ctx.redirect('/admin/login');
      } else {
        ctx.status = 401;
        ctx.body = {
          status: 401,
          msg: '未登录或令牌无效',
          data: { isLogin: false }
        };
      }
    }
  };
};
```

#### 2.3 控制器使用

```javascript
/**
 * @Controller 用户管理
 */
class UserController extends Controller {
  /**
   * @summary 获取用户列表
   * @description 获取系统中的所有用户信息
   * @router get /api/users
   * @request query integer page eg:1 页码
   * @request query integer limit eg:20 每页数量
   * @response 200 userListResponse 用户列表
   * @apikey  // 需要管理员认证
   */
  async list() {
    const { ctx } = this;
    
    // 此时 ctx.userInfo 和 ctx.isAdmin 已被中间件设置
    console.log('当前用户:', ctx.userInfo);
    console.log('是否管理员:', ctx.isAdmin);
    
    // 业务逻辑...
  }
}
```

### 3. OAuth2 认证

#### 3.1 配置示例

```javascript
securitySchemes: {
  oauth2: {
    type: 'oauth2',
    tokenUrl: 'https://api.example.com/oauth/token',
    flow: 'password',  // 支持：password, clientCredentials, authorizationCode
    scopes: {
      'read': '读取数据权限',
      'write': '写入数据权限',
      'admin': '管理员权限'
    }
  }
}
```

#### 3.2 中间件实现

```javascript
// app/middleware/oauth/tokenValidator.js
'use strict';

module.exports = options => {
  return async function oauthTokenValidator(ctx, next) {
    const token = ctx.get('Authorization');

    if (!token || !token.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = {
        status: 401,
        msg: '缺少访问令牌',
        data: null
      };
      return;
    }

    const accessToken = token.slice(7);

    try {
      // 验证 OAuth2 令牌
      const tokenInfo = await ctx.service.oauth.validateToken(accessToken);

      if (tokenInfo && tokenInfo.valid) {
        ctx.oauth = {
          clientId: tokenInfo.clientId,
          scopes: tokenInfo.scopes,
          userId: tokenInfo.userId
        };
        await next();
      } else {
        ctx.status = 401;
        ctx.body = {
          status: 401,
          msg: '访问令牌无效或已过期',
          data: null
        };
      }
    } catch (error) {
      ctx.logger.error('OAuth2 令牌验证失败:', error);
      ctx.status = 500;
      ctx.body = {
        status: 500,
        msg: '令牌验证服务异常',
        data: null
      };
    }
  };
};
```

### 4. 自定义认证

#### 4.1 多重认证示例

```javascript
/**
 * @summary 敏感操作接口
 * @description 需要同时验证管理员身份和API密钥
 * @router post /api/admin/sensitive-operation
 * @request body sensitiveOperationRequest *body 操作参数
 * @response 200 operationResponse 操作结果
 * @apikey    // 管理员认证
 * @apiId     // API 密钥认证
 */
async sensitiveOperation() {
  const { ctx } = this;

  // 此时已通过两重认证
  console.log('管理员信息:', ctx.userInfo);
  console.log('API密钥信息:', ctx.state.apiKey);

  // 业务逻辑...
}
```

#### 4.2 条件认证

```javascript
// app/middleware/conditionalAuth.js
'use strict';

module.exports = options => {
  return async function conditionalAuth(ctx, next) {
    const { path, method } = ctx;

    // 根据路径和方法决定认证策略
    if (path.startsWith('/api/public/')) {
      // 公开接口，无需认证
      await next();
    } else if (path.startsWith('/api/admin/')) {
      // 管理接口，需要管理员认证
      await ctx.app.middleware.sys.authAdminToken()(ctx, next);
    } else {
      // 普通接口，需要用户认证
      await ctx.app.middleware.userAuth()(ctx, next);
    }
  };
};
```

### 5. 认证最佳实践

#### 5.1 令牌管理

```javascript
// app/extend/helper.js
module.exports = {
  // 生成令牌
  generateToken(payload, expiresIn = '24h') {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, this.app.config.jwt.secret, { expiresIn });
  },

  // 解析令牌
  deToken(token) {
    if (!token) return null;

    try {
      const jwt = require('jsonwebtoken');
      return jwt.verify(token, this.app.config.jwt.secret);
    } catch (error) {
      this.app.logger.warn('令牌解析失败:', error.message);
      return null;
    }
  },

  // 刷新令牌
  refreshToken(oldToken) {
    const payload = this.deToken(oldToken);
    if (!payload) return null;

    // 移除过期时间字段
    delete payload.iat;
    delete payload.exp;

    return this.generateToken(payload);
  }
};
```

#### 5.2 权限控制

```javascript
// app/middleware/permission.js
'use strict';

module.exports = (requiredPermissions = []) => {
  return async function permission(ctx, next) {
    const userPermissions = ctx.userInfo?.permissions || [];

    // 检查是否有所需权限
    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (hasPermission) {
      await next();
    } else {
      ctx.status = 403;
      ctx.body = {
        status: 403,
        msg: '权限不足',
        data: {
          required: requiredPermissions,
          current: userPermissions
        }
      };
    }
  };
};
```

## 请求响应格式标准

### 1. 请求格式规范

#### 1.1 Content-Type 标准

```javascript
// JSON 请求（推荐）
Content-Type: application/json

// 表单请求
Content-Type: application/x-www-form-urlencoded

// 文件上传
Content-Type: multipart/form-data

// 文本请求
Content-Type: text/plain
```

#### 1.2 请求头规范

```javascript
// 必需头部
Content-Type: application/json
Accept: application/json

// 认证头部
Authorization: Bearer <token>
X-API-Key: <api-key>

// 自定义头部
X-Request-ID: <unique-id>      // 请求追踪ID
X-Client-Version: <version>    // 客户端版本
X-Platform: <platform>         // 平台标识
```

#### 1.3 请求参数类型

基于 ddn-swagger 的 @Request 注解规范：

```javascript
/**
 * @Request {position} {type} {name} {description}
 *
 * position: path/query/header/body/formData
 * type: string/integer/number/boolean/array/object
 * name: 参数名称（*开头表示必需）
 * description: 参数描述
 */

// 路径参数
/**
 * @Request path string *userId 用户ID
 */

// 查询参数
/**
 * @Request query integer page eg:1 页码
 * @Request query integer limit eg:20 每页数量
 * @Request query string search 搜索关键词
 */

// 请求头参数
/**
 * @Request header string Authorization 认证令牌
 * @Request header string X-Request-ID 请求ID
 */

// 请求体参数
/**
 * @Request body createUserRequest *body 用户信息
 */

// 表单参数
/**
 * @Request formData string *username 用户名
 * @Request formData file avatar 头像文件
 */
```

### 2. 响应格式规范

#### 2.1 统一响应结构

基于 DDN 项目的响应格式标准：

```javascript
// 基础响应格式
{
  "status": 0,           // 状态码：0=成功，其他=失败
  "msg": "success",      // 状态消息
  "data": {}             // 响应数据
}

// 成功响应示例
{
  "status": 0,
  "msg": "操作成功",
  "data": {
    "id": 123,
    "name": "张三",
    "email": "zhangsan@example.com"
  }
}

// 列表响应示例
{
  "status": 0,
  "msg": "获取成功",
  "data": {
    "items": [
      { "id": 1, "name": "项目1" },
      { "id": 2, "name": "项目2" }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5
    }
  }
}

// 错误响应示例
{
  "status": 400,
  "msg": "请求参数错误",
  "data": {
    "errors": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "邮箱格式不正确"
      }
    ]
  }
}
```

#### 2.2 Contract 定义规范

使用 Contract 定义请求和响应的数据结构：

```javascript
// app/contract/request/user.js
module.exports = {
  createUserRequest: {
    name: {
      type: 'string',
      required: true,
      example: '张三',
      description: '用户姓名'
    },
    email: {
      type: 'string',
      required: true,
      example: 'zhangsan@example.com',
      format: 'email'
    },
    age: {
      type: 'integer',
      required: false,
      example: 25,
      minimum: 0,
      maximum: 150
    },
    tags: {
      type: 'array',
      itemType: 'string',
      example: ['developer', 'javascript']
    },
    profile: {
      type: 'UserProfile',
      required: false
    }
  },

  updateUserRequest: {
    name: { type: 'string', required: false },
    email: { type: 'string', required: false },
    age: { type: 'integer', required: false }
  }
};

// app/contract/response/user.js
module.exports = {
  userResponse: {
    id: {
      type: 'integer',
      required: true,
      example: 123
    },
    name: {
      type: 'string',
      required: true,
      example: '张三'
    },
    email: {
      type: 'string',
      required: true,
      example: 'zhangsan@example.com'
    },
    createdAt: {
      type: 'string',
      required: true,
      format: 'date-time',
      example: '2024-01-01T00:00:00Z'
    }
  },

  userListResponse: {
    items: {
      type: 'array',
      itemType: 'userResponse',
      required: true
    },
    pagination: {
      type: 'paginationInfo',
      required: true
    }
  }
};

// app/contract/dto/common.js
module.exports = {
  paginationInfo: {
    total: { type: 'integer', required: true, example: 100 },
    page: { type: 'integer', required: true, example: 1 },
    limit: { type: 'integer', required: true, example: 20 },
    pages: { type: 'integer', required: true, example: 5 }
  },

  baseResponse: {
    status: { type: 'integer', required: true, example: 0 },
    msg: { type: 'string', required: true, example: 'success' },
    data: { type: 'object', required: false }
  }
};
```

#### 2.3 响应注解规范

```javascript
/**
 * @Response {HttpStatus} {Type} {Description}
 *
 * HttpStatus: HTTP状态码
 * Type: 响应类型（Contract中定义的类型）
 * Description: 响应描述
 */

/**
 * @summary 创建用户
 * @router post /api/users
 * @request body createUserRequest *body 用户信息
 * @response 200 userResponse 创建成功
 * @response 400 baseResponse 请求参数错误
 * @response 401 baseResponse 未认证
 * @response 409 baseResponse 用户已存在
 * @response 500 baseResponse 服务器错误
 */
```

### 3. 数据类型规范

#### 3.1 基础数据类型

```javascript
// 字符串类型
{
  type: 'string',
  minLength: 1,
  maxLength: 100,
  pattern: '^[a-zA-Z0-9]+$',  // 正则表达式
  enum: ['active', 'inactive'], // 枚举值
  format: 'email'              // 格式：email, date, date-time, uri
}

// 数值类型
{
  type: 'integer',  // 或 'number'
  minimum: 0,
  maximum: 100,
  multipleOf: 5     // 倍数
}

// 布尔类型
{
  type: 'boolean',
  default: false
}

// 数组类型
{
  type: 'array',
  itemType: 'string',  // 或自定义类型
  minItems: 1,
  maxItems: 10,
  uniqueItems: true
}

// 对象类型
{
  type: 'UserProfile',  // 引用其他 Contract
  required: true
}
```

#### 3.2 复杂数据类型

```javascript
// 嵌套对象
module.exports = {
  userWithProfile: {
    id: { type: 'integer', required: true },
    name: { type: 'string', required: true },
    profile: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'uri' },
        bio: { type: 'string', maxLength: 500 },
        social: {
          type: 'object',
          properties: {
            github: { type: 'string' },
            twitter: { type: 'string' }
          }
        }
      }
    }
  }
};

// 联合类型（使用 oneOf）
module.exports = {
  searchResult: {
    type: {
      type: 'string',
      enum: ['user', 'project', 'article']
    },
    data: {
      oneOf: [
        { $ref: '#/components/schemas/userResponse' },
        { $ref: '#/components/schemas/projectResponse' },
        { $ref: '#/components/schemas/articleResponse' }
      ]
    }
  }
};
```

## 错误处理规范

### 1. 错误分类

#### 1.1 错误类型定义

```javascript
// 错误类型枚举
const ErrorTypes = {
  // 客户端错误 (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',       // 参数验证错误
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR', // 认证错误
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',   // 授权错误
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',         // 资源不存在
  CONFLICT_ERROR: 'CONFLICT_ERROR',           // 资源冲突
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',       // 请求频率限制

  // 服务器错误 (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',           // 内部服务器错误
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE', // 服务不可用
  DATABASE_ERROR: 'DATABASE_ERROR',           // 数据库错误
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR'    // 外部API错误
};
```

#### 1.2 错误状态码映射

```javascript
const ErrorStatusMap = {
  [ErrorTypes.VALIDATION_ERROR]: 422,
  [ErrorTypes.AUTHENTICATION_ERROR]: 401,
  [ErrorTypes.AUTHORIZATION_ERROR]: 403,
  [ErrorTypes.NOT_FOUND_ERROR]: 404,
  [ErrorTypes.CONFLICT_ERROR]: 409,
  [ErrorTypes.RATE_LIMIT_ERROR]: 429,
  [ErrorTypes.INTERNAL_ERROR]: 500,
  [ErrorTypes.SERVICE_UNAVAILABLE]: 503,
  [ErrorTypes.DATABASE_ERROR]: 500,
  [ErrorTypes.EXTERNAL_API_ERROR]: 502
};
```

### 2. 错误响应格式

#### 2.1 标准错误响应

```javascript
// 基础错误响应格式
{
  "status": 400,              // HTTP 状态码
  "msg": "请求参数错误",       // 错误消息
  "data": {
    "code": "VALIDATION_ERROR", // 错误代码
    "timestamp": "2024-01-01T00:00:00Z", // 错误时间
    "path": "/api/users",       // 请求路径
    "method": "POST",           // 请求方法
    "requestId": "req-123456",  // 请求ID
    "errors": [                 // 详细错误信息
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "邮箱格式不正确",
        "value": "invalid-email"
      }
    ]
  }
}

// 简单错误响应
{
  "status": 404,
  "msg": "用户不存在",
  "data": {
    "code": "USER_NOT_FOUND",
    "userId": 123
  }
}

// 业务逻辑错误
{
  "status": 409,
  "msg": "操作失败",
  "data": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "账户余额不足",
    "currentBalance": 100,
    "requiredAmount": 200
  }
}
```

#### 2.2 错误响应 Contract

```javascript
// app/contract/response/error.js
module.exports = {
  errorResponse: {
    status: {
      type: 'integer',
      required: true,
      example: 400,
      description: 'HTTP状态码'
    },
    msg: {
      type: 'string',
      required: true,
      example: '请求参数错误',
      description: '错误消息'
    },
    data: {
      type: 'errorData',
      required: false,
      description: '错误详情'
    }
  },

  errorData: {
    code: {
      type: 'string',
      required: false,
      example: 'VALIDATION_ERROR',
      description: '错误代码'
    },
    timestamp: {
      type: 'string',
      required: false,
      format: 'date-time',
      example: '2024-01-01T00:00:00Z'
    },
    path: {
      type: 'string',
      required: false,
      example: '/api/users'
    },
    method: {
      type: 'string',
      required: false,
      example: 'POST'
    },
    requestId: {
      type: 'string',
      required: false,
      example: 'req-123456'
    },
    errors: {
      type: 'array',
      itemType: 'fieldError',
      required: false
    }
  },

  fieldError: {
    field: {
      type: 'string',
      required: true,
      example: 'email',
      description: '字段名称'
    },
    code: {
      type: 'string',
      required: true,
      example: 'INVALID_FORMAT',
      description: '错误代码'
    },
    message: {
      type: 'string',
      required: true,
      example: '邮箱格式不正确',
      description: '错误消息'
    },
    value: {
      type: 'string',
      required: false,
      example: 'invalid-email',
      description: '错误值'
    }
  }
};
```

### 3. 错误处理中间件

#### 3.1 全局错误处理

```javascript
// app/middleware/errorHandler.js
'use strict';

module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      await next();
    } catch (error) {
      // 记录错误日志
      ctx.logger.error('请求处理异常:', {
        error: error.message,
        stack: error.stack,
        url: ctx.url,
        method: ctx.method,
        headers: ctx.headers,
        body: ctx.request.body,
        query: ctx.query,
        params: ctx.params
      });

      // 生成请求ID
      const requestId = ctx.get('X-Request-ID') || ctx.helper.generateRequestId();

      // 根据错误类型设置响应
      if (error.name === 'ValidationError') {
        ctx.status = 422;
        ctx.body = {
          status: 422,
          msg: '参数验证失败',
          data: {
            code: 'VALIDATION_ERROR',
            timestamp: new Date().toISOString(),
            path: ctx.path,
            method: ctx.method,
            requestId,
            errors: error.errors.map(err => ({
              field: err.field,
              code: err.code,
              message: err.message,
              value: err.value
            }))
          }
        };
      } else if (error.status) {
        // 已知的HTTP错误
        ctx.status = error.status;
        ctx.body = {
          status: error.status,
          msg: error.message || '请求处理失败',
          data: {
            code: error.code || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString(),
            path: ctx.path,
            method: ctx.method,
            requestId
          }
        };
      } else {
        // 未知错误
        ctx.status = 500;
        ctx.body = {
          status: 500,
          msg: ctx.app.config.env === 'prod' ? '服务器内部错误' : error.message,
          data: {
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
            path: ctx.path,
            method: ctx.method,
            requestId
          }
        };
      }
    }
  };
};
```

#### 3.2 自定义错误类

```javascript
// app/extend/error.js
'use strict';

class BaseError extends Error {
  constructor(message, code, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
  }
}

class ValidationError extends BaseError {
  constructor(errors, message = '参数验证失败') {
    super(message, 'VALIDATION_ERROR', 422);
    this.errors = errors;
  }
}

class NotFoundError extends BaseError {
  constructor(resource, id, message) {
    super(message || `${resource} 不存在`, 'NOT_FOUND_ERROR', 404);
    this.resource = resource;
    this.id = id;
  }
}

class ConflictError extends BaseError {
  constructor(message, details) {
    super(message, 'CONFLICT_ERROR', 409);
    this.details = details;
  }
}

class AuthenticationError extends BaseError {
  constructor(message = '认证失败') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

class AuthorizationError extends BaseError {
  constructor(message = '权限不足') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

module.exports = {
  BaseError,
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthenticationError,
  AuthorizationError
};
```

#### 3.3 业务错误处理

```javascript
// app/service/user.js
'use strict';

const Service = require('egg').Service;
const { NotFoundError, ConflictError, ValidationError } = require('../extend/error');

class UserService extends Service {
  async create(userData) {
    const { ctx } = this;

    // 检查用户是否已存在
    const existingUser = await ctx.model.User.findOne({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new ConflictError('用户已存在', {
        email: userData.email,
        existingUserId: existingUser.id
      });
    }

    // 验证数据
    const errors = [];
    if (!userData.name || userData.name.length < 2) {
      errors.push({
        field: 'name',
        code: 'TOO_SHORT',
        message: '姓名至少需要2个字符',
        value: userData.name
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    try {
      return await ctx.model.User.create(userData);
    } catch (error) {
      ctx.logger.error('创建用户失败:', error);
      throw new BaseError('创建用户失败', 'USER_CREATE_FAILED', 500);
    }
  }

  async findById(id) {
    const { ctx } = this;

    const user = await ctx.model.User.findByPk(id);
    if (!user) {
      throw new NotFoundError('用户', id);
    }

    return user;
  }
}

module.exports = UserService;
```

### 4. 参数验证

#### 4.1 基于 Contract 的验证

```javascript
// app/middleware/validate.js
'use strict';

const { ValidationError } = require('../extend/error');

module.exports = (ruleName) => {
  return async function validate(ctx, next) {
    try {
      // 使用 Contract 生成的验证规则
      ctx.validate(ctx.rule[ruleName], ctx.request.body);
      await next();
    } catch (error) {
      // 转换验证错误格式
      const errors = error.errors.map(err => ({
        field: err.field,
        code: err.code || 'INVALID_VALUE',
        message: err.message,
        value: err.value
      }));

      throw new ValidationError(errors);
    }
  };
};
```

#### 4.2 控制器中的验证

```javascript
/**
 * @Controller 用户管理
 */
class UserController extends Controller {
  /**
   * @summary 创建用户
   * @router post /api/users
   * @request body createUserRequest *body 用户信息
   * @response 201 userResponse 创建成功
   * @response 422 errorResponse 参数验证失败
   * @response 409 errorResponse 用户已存在
   */
  async create() {
    const { ctx, service } = this;

    try {
      // 参数验证
      ctx.validate(ctx.rule.createUserRequest, ctx.request.body);

      // 创建用户
      const user = await service.user.create(ctx.request.body);

      ctx.status = 201;
      ctx.success(user, '用户创建成功');
    } catch (error) {
      // 错误会被全局错误处理中间件捕获
      throw error;
    }
  }
}
```

## API版本管理

### 1. 版本策略

#### 1.1 版本控制方案

```javascript
// 方案1：URL路径版本控制（推荐）
/api/v1/users
/api/v2/users

// 方案2：请求头版本控制
Accept: application/vnd.api+json;version=1
API-Version: v1

// 方案3：查询参数版本控制
/api/users?version=v1
```

#### 1.2 版本命名规范

```javascript
// 语义化版本控制
v1.0.0  // 主版本.次版本.修订版本
v1.1.0  // 新增功能，向后兼容
v2.0.0  // 重大变更，不向后兼容

// 简化版本控制（推荐）
v1      // 主版本
v2      // 主版本
```

### 2. 版本实现

#### 2.1 路由版本控制

```javascript
// config/config.default.js
exports.swaggerdoc = {
  dirScanner: './app/controller',
  apiInfo: {
    title: 'DDN API',
    description: 'DDN 项目 API 文档',
    version: '2.0.0',
  },
  servers: [
    {
      url: 'http://localhost:7001/api/v1',
      description: 'API v1 服务器'
    },
    {
      url: 'http://localhost:7001/api/v2',
      description: 'API v2 服务器'
    }
  ]
};
```

#### 2.2 版本化控制器

```javascript
// app/controller/v1/user.js
/**
 * @Controller 用户管理 v1
 */
class UserV1Controller extends Controller {
  /**
   * @summary 获取用户信息 (v1)
   * @router get /api/v1/users/{id}
   * @request path integer *id 用户ID
   * @response 200 userV1Response 用户信息
   */
  async show() {
    const { ctx, service } = this;
    const user = await service.user.findById(ctx.params.id);

    // v1 版本的响应格式
    ctx.success({
      id: user.id,
      name: user.name,
      email: user.email
    });
  }
}

// app/controller/v2/user.js
/**
 * @Controller 用户管理 v2
 */
class UserV2Controller extends Controller {
  /**
   * @summary 获取用户信息 (v2)
   * @router get /api/v2/users/{id}
   * @request path integer *id 用户ID
   * @response 200 userV2Response 用户信息
   */
  async show() {
    const { ctx, service } = this;
    const user = await service.user.findById(ctx.params.id);

    // v2 版本的响应格式（增加了更多字段）
    ctx.success({
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  }
}
```

#### 2.3 版本化 Contract

```javascript
// app/contract/v1/user.js
module.exports = {
  userV1Response: {
    id: { type: 'integer', required: true, example: 123 },
    name: { type: 'string', required: true, example: '张三' },
    email: { type: 'string', required: true, example: 'zhangsan@example.com' }
  }
};

// app/contract/v2/user.js
module.exports = {
  userV2Response: {
    id: { type: 'integer', required: true, example: 123 },
    name: { type: 'string', required: true, example: '张三' },
    email: { type: 'string', required: true, example: 'zhangsan@example.com' },
    profile: { type: 'userProfile', required: false },
    createdAt: { type: 'string', format: 'date-time', required: true },
    updatedAt: { type: 'string', format: 'date-time', required: true }
  }
};
```

### 3. 版本兼容性

#### 3.1 向后兼容策略

```javascript
// app/service/user.js
class UserService extends Service {
  async getUserData(id, version = 'v1') {
    const user = await this.findById(id);

    switch (version) {
      case 'v1':
        return {
          id: user.id,
          name: user.name,
          email: user.email
        };
      case 'v2':
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          profile: user.profile,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };
      default:
        throw new Error(`不支持的API版本: ${version}`);
    }
  }
}
```

#### 3.2 版本废弃处理

```javascript
// app/middleware/deprecation.js
'use strict';

module.exports = (options = {}) => {
  return async function deprecation(ctx, next) {
    const { version, deprecatedDate, sunsetDate } = options;

    // 添加废弃警告头
    if (deprecatedDate) {
      ctx.set('Deprecation', deprecatedDate);
      ctx.set('Sunset', sunsetDate);
      ctx.set('Link', '</api/v2>; rel="successor-version"');
    }

    // 记录废弃API使用情况
    ctx.logger.warn(`使用了废弃的API版本: ${version}`, {
      url: ctx.url,
      userAgent: ctx.get('User-Agent'),
      ip: ctx.ip
    });

    await next();
  };
};

// 在路由中使用
/**
 * @summary 获取用户信息 (v1 - 已废弃)
 * @deprecated
 * @router get /api/v1/users/{id}
 */
async show() {
  // 添加废弃中间件
  await this.app.middleware.deprecation({
    version: 'v1',
    deprecatedDate: '2024-01-01',
    sunsetDate: '2024-06-01'
  })(this.ctx, async () => {
    // 原有逻辑
  });
}
```

## 文档编写标准

### 1. 注解规范

#### 1.1 控制器注解

```javascript
/**
 * @Controller {ControllerName} {Description}
 *
 * ControllerName: 控制器名称（可选，默认为文件名）
 * Description: 控制器描述
 */

/**
 * @Controller 用户管理
 * @description 用户相关的CRUD操作接口
 */
class UserController extends Controller {
  // 控制器方法...
}
```

#### 1.2 方法注解

```javascript
/**
 * @summary {接口标题}
 * @description {接口详细描述}
 * @router {method} {path}
 * @request {position} {type} {name} {description}
 * @response {status} {type} {description}
 * @deprecated  // 标记为废弃
 * @ignore     // 跳过文档生成
 * @apikey     // 需要认证
 */

/**
 * @summary 创建用户
 * @description 在系统中创建一个新用户，需要提供用户的基本信息
 * @router post /api/users
 * @request body createUserRequest *body 用户信息
 * @request header string Authorization 认证令牌
 * @response 201 userResponse 创建成功
 * @response 400 errorResponse 请求参数错误
 * @response 401 errorResponse 未认证
 * @response 409 errorResponse 用户已存在
 * @apikey
 */
async create() {
  // 方法实现...
}
```

### 2. 文档组织结构

#### 2.1 目录结构

```
app/
├── controller/           # 控制器（包含API注解）
│   ├── v1/              # v1版本控制器
│   ├── v2/              # v2版本控制器
│   └── admin/           # 管理后台控制器
├── contract/            # 数据契约定义
│   ├── request/         # 请求数据结构
│   ├── response/        # 响应数据结构
│   └── dto/             # 数据传输对象
└── middleware/          # 中间件（包含认证逻辑）
    ├── auth/            # 认证中间件
    └── validation/      # 验证中间件
```

#### 2.2 Contract 组织

```javascript
// app/contract/request/user.js - 用户请求相关
module.exports = {
  createUserRequest: { /* ... */ },
  updateUserRequest: { /* ... */ },
  queryUserRequest: { /* ... */ }
};

// app/contract/response/user.js - 用户响应相关
module.exports = {
  userResponse: { /* ... */ },
  userListResponse: { /* ... */ },
  userStatsResponse: { /* ... */ }
};

// app/contract/dto/common.js - 通用数据结构
module.exports = {
  paginationInfo: { /* ... */ },
  baseResponse: { /* ... */ },
  errorResponse: { /* ... */ }
};
```

### 3. 文档质量标准

#### 3.1 描述规范

```javascript
// ✅ 好的描述
/**
 * @summary 获取用户列表
 * @description 分页获取系统中的用户列表，支持按姓名、邮箱搜索，支持按创建时间排序
 * @router get /api/users
 * @request query integer page eg:1 页码，从1开始
 * @request query integer limit eg:20 每页数量，最大100
 * @request query string search 搜索关键词，匹配姓名或邮箱
 * @request query string sort eg:created_at 排序字段
 * @request query string order eg:desc 排序方向：asc/desc
 * @response 200 userListResponse 用户列表
 */

// ❌ 不好的描述
/**
 * @summary 获取用户
 * @router get /api/users
 * @response 200 userListResponse
 */
```

#### 3.2 示例数据

```javascript
// Contract 中提供示例数据
module.exports = {
  createUserRequest: {
    name: {
      type: 'string',
      required: true,
      example: '张三',
      description: '用户真实姓名，2-50个字符'
    },
    email: {
      type: 'string',
      required: true,
      example: 'zhangsan@example.com',
      format: 'email',
      description: '用户邮箱地址，用于登录和通知'
    },
    age: {
      type: 'integer',
      required: false,
      example: 25,
      minimum: 0,
      maximum: 150,
      description: '用户年龄'
    }
  }
};
```

### 4. 文档生成配置

#### 4.1 Swagger 配置

```javascript
// config/config.default.js
exports.swaggerdoc = {
  openapi: '3.0.3',
  dirScanner: './app/controller',

  apiInfo: {
    title: 'DDN 项目 API',
    description: `
# DDN 项目 API 文档

这是 DDN 项目的 RESTful API 文档。

## 认证方式

API 支持以下认证方式：
- **API Key**: 用于服务间调用
- **Bearer Token**: 用于用户认证

## 响应格式

所有 API 响应都遵循统一的格式：

\`\`\`json
{
  "status": 0,
  "msg": "success",
  "data": {}
}
\`\`\`

## 错误处理

错误响应包含详细的错误信息：

\`\`\`json
{
  "status": 400,
  "msg": "请求参数错误",
  "data": {
    "code": "VALIDATION_ERROR",
    "errors": [...]
  }
}
\`\`\`
    `,
    version: '2.0.0',
    contact: {
      name: 'DDN 开发团队',
      email: 'dev@ddn.net',
      url: 'https://www.ddn.net'
    },
    license: {
      name: 'AGPL-3.0',
      url: 'https://www.gnu.org/licenses/agpl-3.0.html'
    }
  },

  servers: [
    {
      url: 'http://localhost:7001',
      description: '开发环境'
    },
    {
      url: 'https://api-test.ddn.net',
      description: '测试环境'
    },
    {
      url: 'https://api.ddn.net',
      description: '生产环境'
    }
  ],

  // 安全方案
  securitySchemes: {
    apikey: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'Bearer token 认证'
    },
    apiId: {
      type: 'apiKey',
      name: 'X-API-Key',
      in: 'header',
      description: 'API 密钥认证'
    }
  },

  // 启用功能
  enableSecurity: true,
  routerMap: true,
  enable: true
};
```

## 代码示例和最佳实践

### 1. 完整的控制器示例

#### 1.1 用户管理控制器

```javascript
// app/controller/user.js
'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 用户管理
 * @description 用户相关的CRUD操作，包括用户注册、查询、更新和删除
 */
class UserController extends Controller {
  /**
   * @summary 获取用户列表
   * @description 分页获取用户列表，支持搜索和排序
   * @router get /api/users
   * @request query integer page eg:1 页码
   * @request query integer limit eg:20 每页数量
   * @request query string search 搜索关键词
   * @request query string sort eg:created_at 排序字段
   * @request query string order eg:desc 排序方向
   * @response 200 userListResponse 用户列表
   * @response 400 errorResponse 请求参数错误
   * @apikey
   */
  async index() {
    const { ctx, service } = this;
    const { page = 1, limit = 20, search, sort, order } = ctx.query;

    try {
      const result = await service.user.list({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        sort,
        order
      });

      ctx.paginate(result.users, result.total, page, limit);
    } catch (error) {
      ctx.logger.error('获取用户列表失败:', error);
      ctx.error(500, '获取用户列表失败');
    }
  }

  /**
   * @summary 获取用户详情
   * @description 根据用户ID获取用户的详细信息
   * @router get /api/users/{id}
   * @request path integer *id 用户ID
   * @response 200 userResponse 用户信息
   * @response 404 errorResponse 用户不存在
   * @apikey
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    try {
      const user = await service.user.findById(id);
      ctx.success(user);
    } catch (error) {
      if (error.code === 'USER_NOT_FOUND') {
        ctx.error(404, '用户不存在');
      } else {
        ctx.logger.error('获取用户详情失败:', error);
        ctx.error(500, '获取用户详情失败');
      }
    }
  }

  /**
   * @summary 创建用户
   * @description 创建新用户账户
   * @router post /api/users
   * @request body createUserRequest *body 用户信息
   * @response 201 userResponse 创建成功
   * @response 422 errorResponse 参数验证失败
   * @response 409 errorResponse 用户已存在
   * @apikey
   */
  async create() {
    const { ctx, service } = this;

    try {
      // 参数验证
      ctx.validate(ctx.rule.createUserRequest, ctx.request.body);

      // 创建用户
      const user = await service.user.create(ctx.request.body);

      ctx.status = 201;
      ctx.success(user, '用户创建成功');
    } catch (error) {
      // 错误处理由全局中间件处理
      throw error;
    }
  }

  /**
   * @summary 更新用户
   * @description 更新用户信息
   * @router put /api/users/{id}
   * @request path integer *id 用户ID
   * @request body updateUserRequest *body 更新信息
   * @response 200 userResponse 更新成功
   * @response 404 errorResponse 用户不存在
   * @response 422 errorResponse 参数验证失败
   * @apikey
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    try {
      // 参数验证
      ctx.validate(ctx.rule.updateUserRequest, ctx.request.body);

      // 更新用户
      const user = await service.user.update(id, ctx.request.body);

      ctx.success(user, '用户更新成功');
    } catch (error) {
      throw error;
    }
  }

  /**
   * @summary 删除用户
   * @description 软删除用户账户
   * @router delete /api/users/{id}
   * @request path integer *id 用户ID
   * @response 204 删除成功
   * @response 404 errorResponse 用户不存在
   * @apikey
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    try {
      await service.user.delete(id);
      ctx.status = 204;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserController;
```

#### 1.2 对应的 Service 实现

```javascript
// app/service/user.js
'use strict';

const Service = require('egg').Service;
const { NotFoundError, ConflictError } = require('../extend/error');

class UserService extends Service {
  async list({ page = 1, limit = 20, search, sort = 'created_at', order = 'desc' }) {
    const { ctx } = this;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[ctx.app.Sequelize.Op.or] = [
        { name: { [ctx.app.Sequelize.Op.like]: `%${search}%` } },
        { email: { [ctx.app.Sequelize.Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await ctx.model.User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]],
      attributes: { exclude: ['password'] }
    });

    return {
      users: rows,
      total: count
    };
  }

  async findById(id) {
    const { ctx } = this;

    const user = await ctx.model.User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      throw new NotFoundError('用户', id);
    }

    return user;
  }

  async create(userData) {
    const { ctx } = this;

    // 检查邮箱是否已存在
    const existingUser = await ctx.model.User.findOne({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new ConflictError('邮箱已被使用', { email: userData.email });
    }

    // 密码加密
    const hashedPassword = await ctx.helper.bcrypt.hash(userData.password);

    const user = await ctx.model.User.create({
      ...userData,
      password: hashedPassword
    });

    // 返回时排除密码
    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  async update(id, updateData) {
    const { ctx } = this;

    const user = await this.findById(id);

    // 如果更新邮箱，检查是否冲突
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await ctx.model.User.findOne({
        where: {
          email: updateData.email,
          id: { [ctx.app.Sequelize.Op.ne]: id }
        }
      });

      if (existingUser) {
        throw new ConflictError('邮箱已被使用', { email: updateData.email });
      }
    }

    // 如果更新密码，进行加密
    if (updateData.password) {
      updateData.password = await ctx.helper.bcrypt.hash(updateData.password);
    }

    await user.update(updateData);

    // 返回更新后的用户信息（排除密码）
    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  async delete(id) {
    const { ctx } = this;

    const user = await this.findById(id);

    // 软删除
    await user.update({
      deletedAt: new Date(),
      email: `${user.email}.deleted.${Date.now()}`  // 避免邮箱冲突
    });

    return true;
  }
}

module.exports = UserService;
```

### 2. Contract 定义示例

#### 2.1 用户相关 Contract

```javascript
// app/contract/request/user.js
module.exports = {
  createUserRequest: {
    name: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50,
      example: '张三',
      description: '用户姓名，2-50个字符'
    },
    email: {
      type: 'string',
      required: true,
      format: 'email',
      example: 'zhangsan@example.com',
      description: '用户邮箱地址'
    },
    password: {
      type: 'string',
      required: true,
      minLength: 6,
      maxLength: 20,
      example: 'password123',
      description: '用户密码，6-20个字符'
    },
    age: {
      type: 'integer',
      required: false,
      minimum: 0,
      maximum: 150,
      example: 25,
      description: '用户年龄'
    },
    gender: {
      type: 'string',
      required: false,
      enum: ['male', 'female', 'other'],
      example: 'male',
      description: '用户性别'
    },
    tags: {
      type: 'array',
      itemType: 'string',
      required: false,
      example: ['developer', 'javascript'],
      description: '用户标签'
    }
  },

  updateUserRequest: {
    name: {
      type: 'string',
      required: false,
      minLength: 2,
      maxLength: 50,
      example: '李四',
      description: '用户姓名'
    },
    email: {
      type: 'string',
      required: false,
      format: 'email',
      example: 'lisi@example.com',
      description: '用户邮箱地址'
    },
    age: {
      type: 'integer',
      required: false,
      minimum: 0,
      maximum: 150,
      example: 30,
      description: '用户年龄'
    },
    gender: {
      type: 'string',
      required: false,
      enum: ['male', 'female', 'other'],
      example: 'female',
      description: '用户性别'
    }
  }
};

// app/contract/response/user.js
module.exports = {
  userResponse: {
    id: {
      type: 'integer',
      required: true,
      example: 123,
      description: '用户ID'
    },
    name: {
      type: 'string',
      required: true,
      example: '张三',
      description: '用户姓名'
    },
    email: {
      type: 'string',
      required: true,
      example: 'zhangsan@example.com',
      description: '用户邮箱'
    },
    age: {
      type: 'integer',
      required: false,
      example: 25,
      description: '用户年龄'
    },
    gender: {
      type: 'string',
      required: false,
      example: 'male',
      description: '用户性别'
    },
    tags: {
      type: 'array',
      itemType: 'string',
      required: false,
      example: ['developer', 'javascript'],
      description: '用户标签'
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      required: true,
      example: '2024-01-01T00:00:00Z',
      description: '创建时间'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      required: true,
      example: '2024-01-01T00:00:00Z',
      description: '更新时间'
    }
  },

  userListResponse: {
    items: {
      type: 'array',
      itemType: 'userResponse',
      required: true,
      description: '用户列表'
    },
    pagination: {
      type: 'paginationInfo',
      required: true,
      description: '分页信息'
    }
  }
};
```

### 3. 最佳实践总结

#### 3.1 代码组织

```javascript
// ✅ 推荐的项目结构
app/
├── controller/
│   ├── v1/              # 版本化控制器
│   │   ├── user.js
│   │   └── order.js
│   └── admin/           # 管理后台控制器
│       ├── user.js
│       └── system.js
├── service/             # 业务逻辑层
│   ├── user.js
│   └── order.js
├── contract/            # 数据契约
│   ├── request/
│   ├── response/
│   └── dto/
├── middleware/          # 中间件
│   ├── auth/
│   ├── validation/
│   └── errorHandler.js
└── extend/              # 扩展
    ├── context.js
    ├── helper.js
    └── error.js
```

#### 3.2 命名规范

```javascript
// 文件命名：小写+下划线
user_controller.js
order_service.js
auth_middleware.js

// 类命名：大驼峰
class UserController extends Controller {}
class OrderService extends Service {}

// 方法命名：小驼峰
async getUserList() {}
async createOrder() {}

// 常量命名：大写+下划线
const ERROR_CODES = {};
const DEFAULT_PAGE_SIZE = 20;
```

#### 3.3 错误处理

```javascript
// ✅ 统一的错误处理
try {
  const result = await service.user.create(userData);
  ctx.success(result);
} catch (error) {
  // 让全局错误处理中间件处理
  throw error;
}

// ❌ 避免在控制器中直接处理所有错误
try {
  const result = await service.user.create(userData);
  ctx.success(result);
} catch (error) {
  if (error.code === 'USER_EXISTS') {
    ctx.error(409, '用户已存在');
  } else if (error.code === 'VALIDATION_ERROR') {
    ctx.error(422, '参数验证失败');
  } else {
    ctx.error(500, '服务器错误');
  }
}
```

#### 3.4 安全实践

```javascript
// ✅ 安全的密码处理
const hashedPassword = await ctx.helper.bcrypt.hash(password);

// ✅ 排除敏感字段
const user = await ctx.model.User.findByPk(id, {
  attributes: { exclude: ['password', 'salt'] }
});

// ✅ 参数验证
ctx.validate(ctx.rule.createUserRequest, ctx.request.body);

// ✅ 权限检查
if (!ctx.isAdmin) {
  throw new AuthorizationError('需要管理员权限');
}
```

## 开发工具和配置

### 1. 开发环境配置

#### 1.1 插件配置

```javascript
// config/plugin.js
exports.swaggerdoc = {
  enable: true,
  package: '@ddn/swagger-docs',
};

exports.validate = {
  enable: true,
  package: 'egg-validate',
};

exports.sequelize = {
  enable: true,
  package: 'egg-sequelize',
};
```

#### 1.2 环境配置

```javascript
// config/config.default.js
exports.swaggerdoc = {
  openapi: '3.0.3',
  dirScanner: './app/controller',
  apiInfo: {
    title: 'DDN API',
    description: 'DDN 项目 API 文档',
    version: '1.0.0',
  },
  servers: [
    { url: 'http://localhost:7001', description: '开发环境' }
  ],
  securitySchemes: {
    apikey: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
    }
  },
  securityMiddlewareMap: {
    'apikey': 'sys.authAdminToken'
  },
  enableSecurity: true,
  routerMap: true,
  enable: true,
};

// config/config.prod.js
exports.swaggerdoc = {
  enable: false,  // 生产环境关闭 Swagger UI
};
```

### 2. 开发工具

#### 2.1 VSCode 配置

```json
// .vscode/settings.json
{
  "files.associations": {
    "*.js": "javascript"
  },
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "eslint.validate": [
    "javascript"
  ],
  "eslint.autoFixOnSave": true
}
```

#### 2.2 ESLint 配置

```javascript
// .eslintrc.js
module.exports = {
  extends: 'eslint-config-egg',
  rules: {
    // 自定义规则
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-unused-vars': 'error'
  }
};
```

### 3. 调试和测试

#### 3.1 API 测试

```javascript
// test/app/controller/user.test.js
const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/controller/user.test.js', () => {
  it('should GET /api/users', async () => {
    const result = await app.httpRequest()
      .get('/api/users')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    assert(result.body.status === 0);
    assert(Array.isArray(result.body.data.items));
  });

  it('should POST /api/users', async () => {
    const userData = {
      name: '测试用户',
      email: 'test@example.com',
      password: 'password123'
    };

    const result = await app.httpRequest()
      .post('/api/users')
      .set('Authorization', 'Bearer test-token')
      .send(userData)
      .expect(201);

    assert(result.body.status === 0);
    assert(result.body.data.name === userData.name);
  });
});
```

## 测试规范

### 1. 测试策略

#### 1.1 测试金字塔

```
    /\
   /  \     E2E Tests (少量)
  /____\
 /      \   Integration Tests (适量)
/________\  Unit Tests (大量)
```

#### 1.2 测试类型

```javascript
// 单元测试 - Service 层
describe('UserService', () => {
  it('should create user successfully', async () => {
    const userData = { name: '张三', email: 'test@example.com' };
    const user = await app.mockService('user', 'create', userData);
    assert(user.name === userData.name);
  });
});

// 集成测试 - Controller 层
describe('UserController', () => {
  it('should handle user creation', async () => {
    const result = await app.httpRequest()
      .post('/api/users')
      .send({ name: '张三', email: 'test@example.com' })
      .expect(201);

    assert(result.body.status === 0);
  });
});

// E2E 测试 - 完整流程
describe('User Management Flow', () => {
  it('should complete user lifecycle', async () => {
    // 创建用户
    const createResult = await app.httpRequest()
      .post('/api/users')
      .send(userData);

    // 获取用户
    const getResult = await app.httpRequest()
      .get(`/api/users/${createResult.body.data.id}`);

    // 更新用户
    const updateResult = await app.httpRequest()
      .put(`/api/users/${createResult.body.data.id}`)
      .send(updateData);

    // 删除用户
    await app.httpRequest()
      .delete(`/api/users/${createResult.body.data.id}`)
      .expect(204);
  });
});
```

### 2. 测试工具配置

#### 2.1 测试环境

```javascript
// config/config.unittest.js
exports.sequelize = {
  datasources: [{
    delegate: 'model',
    baseDir: 'model',
    database: 'test_database',
    username: 'test_user',
    password: 'test_password',
  }]
};

exports.swaggerdoc = {
  enable: false,  // 测试环境关闭 Swagger
};
```

#### 2.2 Mock 数据

```javascript
// test/fixtures/user.js
module.exports = {
  validUser: {
    name: '张三',
    email: 'zhangsan@example.com',
    password: 'password123',
    age: 25
  },

  invalidUser: {
    name: '',  // 无效的姓名
    email: 'invalid-email',  // 无效的邮箱
    password: '123'  // 密码太短
  }
};
```

## 部署和维护

### 1. 部署配置

#### 1.1 生产环境配置

```javascript
// config/config.prod.js
exports.swaggerdoc = {
  enable: false,  // 生产环境关闭文档访问
  routerMap: true,  // 保持自动路由功能
};

exports.security = {
  csrf: { enable: false },
  domainWhiteList: ['https://your-domain.com'],
};

exports.logger = {
  level: 'INFO',
  consoleLevel: 'ERROR',
};
```

#### 1.2 Docker 配置

```dockerfile
# Dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 7001

CMD ["npm", "start"]
```

### 2. 监控和日志

#### 2.1 API 监控

```javascript
// app/middleware/monitor.js
module.exports = () => {
  return async function monitor(ctx, next) {
    const start = Date.now();

    await next();

    const duration = Date.now() - start;

    // 记录 API 调用统计
    ctx.logger.info('API调用统计', {
      method: ctx.method,
      url: ctx.url,
      status: ctx.status,
      duration,
      userAgent: ctx.get('User-Agent'),
      ip: ctx.ip
    });

    // 慢查询告警
    if (duration > 5000) {
      ctx.logger.warn('慢查询告警', {
        method: ctx.method,
        url: ctx.url,
        duration
      });
    }
  };
};
```

#### 2.2 错误监控

```javascript
// app/middleware/errorMonitor.js
module.exports = () => {
  return async function errorMonitor(ctx, next) {
    try {
      await next();
    } catch (error) {
      // 发送错误到监控系统
      if (ctx.app.config.env === 'prod') {
        // 发送到 Sentry、钉钉等
        await ctx.service.monitor.reportError(error, {
          url: ctx.url,
          method: ctx.method,
          userAgent: ctx.get('User-Agent'),
          ip: ctx.ip
        });
      }

      throw error;
    }
  };
};
```

### 3. 版本发布

#### 3.1 发布流程

```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 更新 API 文档版本
# 在 config/config.default.js 中更新 apiInfo.version

# 3. 生成变更日志
npm run changelog

# 4. 提交代码
git add .
git commit -m "chore: release v1.0.1"
git push

# 5. 创建标签
git tag v1.0.1
git push --tags

# 6. 部署
npm run deploy
```

#### 3.2 API 兼容性检查

```javascript
// scripts/check-compatibility.js
const fs = require('fs');
const path = require('path');

// 检查 API 变更是否向后兼容
function checkApiCompatibility() {
  const oldSpec = JSON.parse(fs.readFileSync('docs/api-spec-old.json'));
  const newSpec = JSON.parse(fs.readFileSync('docs/api-spec-new.json'));

  // 检查是否有破坏性变更
  const breakingChanges = [];

  // 检查删除的端点
  for (const path in oldSpec.paths) {
    if (!newSpec.paths[path]) {
      breakingChanges.push(`删除了端点: ${path}`);
    }
  }

  // 检查必需参数变更
  // ... 更多检查逻辑

  if (breakingChanges.length > 0) {
    console.error('发现破坏性变更:');
    breakingChanges.forEach(change => console.error(`- ${change}`));
    process.exit(1);
  }

  console.log('API 兼容性检查通过');
}

checkApiCompatibility();
```

## 总结

本文档基于 DDN 项目的 `@ddn/swagger-docs` 插件，提供了完整的接口开发规范，涵盖了从设计原则到部署维护的全流程。

### 核心要点

1. **注解驱动**：使用标准化注解自动生成文档和路由
2. **安全认证**：支持多种认证方式的自动映射
3. **统一格式**：标准化的请求响应格式
4. **错误处理**：完善的错误分类和处理机制
5. **版本管理**：支持 API 版本控制和兼容性管理
6. **质量保证**：完整的测试和监控体系

### 开发流程

1. 定义 Contract 数据结构
2. 编写控制器和注解
3. 实现业务逻辑 Service
4. 配置认证和中间件
5. 编写测试用例
6. 生成和验证文档
7. 部署和监控

遵循本规范可以确保 DDN 项目中所有接口的一致性、可维护性和安全性，提高开发效率和代码质量。
