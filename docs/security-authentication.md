# ddn-swagger 安全认证技术文档

## 目录

- [概述](#概述)
- [工作原理](#工作原理)
- [代码逻辑](#代码逻辑)
- [配置指南](#配置指南)
- [使用示例](#使用示例)
- [支持的注解](#支持的注解)
- [故障排除](#故障排除)

## 概述

ddn-swagger 的安全认证功能允许开发者通过注解的方式为 API 接口自动添加认证中间件。该功能不仅生成 Swagger 文档中的安全配置，还能在路由注册时自动应用相应的认证中间件，实现真正的安全验证。

### 核心特性

- **注解驱动**：通过 `@apikey`、`@oauth2` 等注解声明安全需求
- **自动映射**：根据配置自动将安全方案映射到 Egg.js 中间件
- **文档同步**：安全配置同时反映在 Swagger 文档中
- **灵活配置**：支持多种认证方式和自定义中间件

## 工作原理

### 1. 注解解析阶段

在文档生成过程中，ddn-swagger 扫描控制器文件中的注释块：

```
控制器文件 → 注释块提取 → 安全注解识别 → 安全配置生成
```

### 2. 路由注册阶段

在路由注册过程中，根据安全配置自动添加中间件：

```
安全配置 → 中间件映射 → 中间件加载 → 路由注册
```

### 3. 请求处理阶段

当请求到达时，按照以下顺序处理：

```
HTTP请求 → 安全中间件 → 业务控制器 → 响应返回
```

## 代码逻辑

### generateSecurity() 函数

位置：`lib/document/index.js:288-307`

```javascript
function generateSecurity(block, securitys, config) {
  let securityDoc = [];
  
  // 遍历所有配置的安全方案
  for (let security of securitys) {
    // 检查注释块中是否包含对应的安全注解
    if (block.indexOf(`@${security}`) > -1) {
      let securityItem = {};
      
      // 根据安全方案类型生成配置
      if (config.securitySchemes[security].type === 'apiKey') {
        securityItem[security] = [];
        securityItem[security].push(config.securitySchemes[security]);
      }
      
      if (config.securitySchemes[security].type === 'oauth2') {
        securityItem[security] = [];
        Object.keys(config.securitySchemes[security].scopes).forEach(i => {
          securityItem[security].push(i);
        });
      }
      
      securityDoc.push(securityItem);
    }
  }
  
  return securityDoc;
}
```

**功能说明**：
1. 解析注释块中的安全注解
2. 根据 `securitySchemes` 配置生成安全文档
3. 支持 `apiKey` 和 `oauth2` 两种认证类型
4. 返回格式化的安全配置数组

### getSecurityMiddlewares() 函数

位置：`lib/router/index.js:95-137`

```javascript
function getSecurityMiddlewares(securities, app, config) {
  const middlewares = [];
  const securityMiddlewareMap = config.securityMiddlewareMap || {};
  
  // 遍历安全配置
  for (let security of securities) {
    for (let securityName in security) {
      const middlewarePath = securityMiddlewareMap[securityName];
      
      if (middlewarePath) {
        try {
          // 支持嵌套的中间件路径，如 'sys.authAdminToken'
          const middlewareParts = middlewarePath.split('.');
          let middleware = app.middleware;
          
          // 逐级访问中间件对象
          for (let part of middlewareParts) {
            middleware = middleware[part];
            if (!middleware) {
              app.logger.warn(`中间件路径不存在: ${middlewarePath}`);
              break;
            }
          }
          
          // 加载中间件函数
          if (middleware && typeof middleware === 'function') {
            middlewares.push(middleware());
            app.logger.info(`添加安全中间件: ${securityName} -> ${middlewarePath}`);
          }
        } catch (error) {
          app.logger.error(`加载中间件失败: ${middlewarePath}`, error);
        }
      } else {
        app.logger.warn(`未找到安全方案 ${securityName} 对应的中间件配置`);
      }
    }
  }
  
  return middlewares;
}
```

**功能说明**：
1. 根据安全配置查找对应的中间件
2. 支持嵌套路径访问（如 `sys.authAdminToken`）
3. 动态加载并实例化中间件
4. 提供详细的日志输出用于调试

### 路由注册逻辑

位置：`lib/router/index.js:32-91`

```javascript
for (let req of obj.routers) {
  // 构建中间件数组
  let middlewares = [];
  
  // 根据安全配置添加中间件
  if (req.security && req.security.length > 0) {
    middlewares = getSecurityMiddlewares(req.security, app, config);
  }
  
  // 获取控制器方法
  let controllerMethod;
  if (instance.prototype) {
    const control = convertControllerPath(instance.prototype.pathName, controller);
    controllerMethod = control[req.func];
  } else {
    controllerMethod = instance[req.func];
  }
  
  // 注册路由（带中间件）
  const route = req.route.replace('{', ':').replace('}', '');
  if (middlewares.length > 0) {
    router[req.method](route, ...middlewares, controllerMethod);
    app.logger.info(`register router with security: ${req.method} ${req.route} (middlewares: ${middlewares.length})`);
  } else {
    router[req.method](route, controllerMethod);
    app.logger.info(`register router: ${req.method} ${req.route}`);
  }
}
```

**功能说明**：
1. 检查路由是否有安全配置
2. 如果有安全配置，则加载对应的中间件
3. 按照 `中间件1, 中间件2, ..., 控制器方法` 的顺序注册路由
4. 提供详细的注册日志

## 配置指南

### securitySchemes 配置

定义可用的安全方案：

```javascript
securitySchemes: {
  // API Key 认证
  apikey: {
    type: 'apiKey',
    name: 'Authorization',  // HTTP 头名称
    in: 'header',          // 位置：header/query/cookie
  },
  
  // 自定义 API Key
  customApiKey: {
    type: 'apiKey',
    name: 'X-API-Key',
    in: 'header',
    description: '自定义API密钥'
  },
  
  // OAuth2 认证
  oauth2: {
    type: 'oauth2',
    tokenUrl: 'https://example.com/oauth/token',
    flow: 'password',
    scopes: {
      'read': '读取权限',
      'write': '写入权限',
      'admin': '管理员权限'
    }
  }
}
```

### securityMiddlewareMap 配置

定义安全方案与中间件的映射关系：

```javascript
securityMiddlewareMap: {
  // 安全方案名 -> 中间件路径
  'apikey': 'sys.authAdminToken',        // app.middleware.sys.authAdminToken()
  'customApiKey': 'apiAuth',             // app.middleware.apiAuth()
  'oauth2': 'oauth.tokenValidator',      // app.middleware.oauth.tokenValidator()
  'basicAuth': 'auth.basic'              // app.middleware.auth.basic()
}
```

**映射规则**：
- 键名必须与 `securitySchemes` 中的键名一致
- 值为中间件在 `app.middleware` 中的路径
- 支持点号分隔的嵌套路径
- 中间件必须是返回中间件函数的工厂函数

### 核心配置选项

```javascript
module.exports = {
  // 启用安全功能
  enableSecurity: true,
  
  // 启用自动路由注册
  routerMap: true,
  
  // 安全方案定义
  securitySchemes: { /* ... */ },
  
  // 中间件映射
  securityMiddlewareMap: { /* ... */ }
};
```

**配置说明**：
- `enableSecurity`: 控制是否启用安全功能
- `routerMap`: 控制是否自动注册路由
- 只有当两者都为 `true` 时，安全中间件才会自动添加

## 使用示例

### 完整配置示例（基于 ddn-hub 项目）

#### 1. Swagger 配置文件

```javascript
// config/swagger.js
module.exports = {
  openapi: '3.0.3',
  dirScanner: './app/controller',

  // API 信息
  apiInfo: {
    title: 'DDN Hub API',
    description: 'DDN Hub 社区积分管理平台 API',
    version: '1.0.1',
  },

  // 安全方案定义
  securitySchemes: {
    // 管理员认证
    apikey: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
    },

    // API 密钥认证
    apiId: {
      type: 'apiKey',
      name: 'X-API-Id',
      in: 'header',
    },

    // 应用密钥认证
    AppSecret: {
      type: 'apiKey',
      in: 'header',
      name: 'X-App-Secret',
      description: '应用密钥'
    }
  },

  // 中间件映射
  securityMiddlewareMap: {
    'apikey': 'sys.authAdminToken',      // 管理员认证中间件
    'apiId': 'apiAuth',                  // API 密钥认证中间件
    'AppSecret': 'apiAuth'               // 应用密钥认证中间件
  },

  // 启用安全功能和自动路由
  enableSecurity: true,
  routerMap: true,
  enable: true,
};
```

#### 2. 控制器使用示例

```javascript
// app/controller/sys/app_runtime_api.js
'use strict';

const Controller = require('../../core/base_controller');

/**
 * @controller Sys App 运行时接口
 */
class SysAppRuntimeApiController extends Controller {
  /**
   * @summary 获取应用配置
   * @description 返回应用的完整 amis 配置
   * @router get /api/sys/app/:appName/config
   * @request path string appName 应用名称
   * @response 200 appConfigResponse 应用配置
   */
  async getAppConfig() {
    // 公开接口，无需认证
    const { ctx } = this;
    // 业务逻辑...
  }

  /**
   * @summary 创建新页面
   * @description 在应用中创建新页面
   * @router post /api/sys/app/:appName/pages
   * @request path string appName 应用名称
   * @request body createPageRequest *body 页面信息
   * @response 200 createPageResponse 创建结果
   * @apikey  // 需要管理员认证
   */
  async createPage() {
    const { ctx } = this;

    // 此时 ctx.userInfo 和 ctx.isAdmin 已被中间件设置
    console.log('用户信息:', ctx.userInfo);
    console.log('是否管理员:', ctx.isAdmin);

    // 业务逻辑...
  }

  /**
   * @summary 第三方API接口
   * @description 供第三方系统调用的接口
   * @router post /api/sys/external/data
   * @request body externalDataRequest *body 数据
   * @response 200 externalDataResponse 响应
   * @apiId  // 需要API密钥认证
   */
  async externalApi() {
    const { ctx } = this;

    // 此时 ctx.state.apiKey 包含验证后的API密钥信息
    console.log('API密钥信息:', ctx.state.apiKey);

    // 业务逻辑...
  }
}

module.exports = SysAppRuntimeApiController;
```

#### 3. 中间件实现示例

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
    const userInfo = ctx.helper.deToken(token);

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
          msg: '未登录',
          data: { isLogin: false },
        };
      }
    }
  };
};
```

#### 4. 前端请求示例

```javascript
// 管理员认证请求
async function createPage(appName, pageData) {
  const response = await fetch(`/api/sys/app/${appName}/pages`, {
    method: 'POST',
    credentials: 'include', // 包含 session cookie
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pageData)
  });

  return response.json();
}

// API 密钥认证请求
async function externalApiCall(data, apiKey) {
  const response = await fetch('/api/sys/external/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Id': apiKey
    },
    body: JSON.stringify(data)
  });

  return response.json();
}
```

## 支持的注解

### @apikey
- **用途**：API Key 认证
- **配置要求**：需要在 `securitySchemes` 中定义对应的 `apikey` 配置
- **中间件映射**：通过 `securityMiddlewareMap.apikey` 指定中间件

```javascript
/**
 * @apikey
 */
async protectedMethod() {
  // 需要 API Key 认证的方法
}
```

### @oauth2
- **用途**：OAuth2 认证
- **配置要求**：需要在 `securitySchemes` 中定义 `oauth2` 配置，包括 `tokenUrl`、`flow` 和 `scopes`
- **中间件映射**：通过 `securityMiddlewareMap.oauth2` 指定中间件

```javascript
/**
 * @oauth2
 */
async oauthProtectedMethod() {
  // 需要 OAuth2 认证的方法
}
```

### 自定义安全注解
可以定义任意名称的安全注解，只需要：

1. 在 `securitySchemes` 中定义安全方案
2. 在 `securityMiddlewareMap` 中配置中间件映射
3. 在控制器中使用 `@yourCustomSecurity` 注解

```javascript
// 配置
securitySchemes: {
  customAuth: {
    type: 'apiKey',
    name: 'X-Custom-Token',
    in: 'header'
  }
},
securityMiddlewareMap: {
  'customAuth': 'custom.authMiddleware'
}

// 使用
/**
 * @customAuth
 */
async customProtectedMethod() {
  // 使用自定义认证的方法
}
```

## 故障排除

### 1. 中间件未生效

**症状**：请求没有被认证中间件拦截，直接到达控制器

**可能原因**：
- `enableSecurity` 或 `routerMap` 未设置为 `true`
- `securityMiddlewareMap` 配置错误
- 中间件路径不存在

**解决方法**：
1. 检查配置：
   ```javascript
   enableSecurity: true,
   routerMap: true,
   ```

2. 验证中间件路径：
   ```javascript
   // 确保路径正确
   securityMiddlewareMap: {
     'apikey': 'sys.authAdminToken'  // app.middleware.sys.authAdminToken 必须存在
   }
   ```

3. 查看启动日志：
   ```
   [@ddn/swagger-docs] 添加安全中间件: apikey -> sys.authAdminToken
   [@ddn/swagger-docs] register router with security: post /api/path (middlewares: 1)
   ```

### 2. 注解名称不匹配

**症状**：控制器中的安全注解没有生效

**可能原因**：
- 注解名称与 `securitySchemes` 中的键名不一致
- 注解格式错误

**解决方法**：
1. 确保注解名称一致：
   ```javascript
   // 配置中
   securitySchemes: {
     apikey: { /* ... */ }
   }

   // 控制器中
   /**
    * @apikey  // 必须完全一致
    */
   ```

2. 检查注解格式：
   ```javascript
   // 正确格式
   /**
    * @apikey
    */

   // 错误格式
   /**
    * @apiKey  // 大小写错误
    * @api key // 包含空格
    * @apikey() // 包含括号
    */
   ```

### 3. 中间件加载失败

**症状**：启动时出现中间件加载错误

**可能原因**：
- 中间件文件不存在
- 中间件导出格式错误
- 路径配置错误

**解决方法**：
1. 检查中间件文件是否存在：
   ```bash
   # 对于 'sys.authAdminToken'
   ls app/middleware/sys/authAdminToken.js
   ```

2. 验证中间件导出格式：
   ```javascript
   // 正确格式
   module.exports = (options) => {
     return async function middlewareName(ctx, next) {
       // 中间件逻辑
     };
   };
   ```

3. 检查路径配置：
   ```javascript
   // 对于嵌套路径 'sys.authAdminToken'
   // 对应 app.middleware.sys.authAdminToken()
   ```

### 4. 认证信息解析失败

**症状**：中间件执行了，但 `ctx.userInfo` 为 `undefined`

**可能原因**：
- `ctx.helper.deToken` 方法未实现或实现错误
- 前端发送的认证信息格式错误
- Token 已过期或无效

**解决方法**：
1. 检查 `deToken` 方法：
   ```javascript
   // app/extend/helper.js
   deToken(token) {
     if (!token) return null;
     try {
       // 根据实际 token 格式实现解析逻辑
       return JSON.parse(Buffer.from(token, 'base64').toString());
     } catch (error) {
       console.error('Token 解析失败:', error);
       return null;
     }
   }
   ```

2. 验证前端请求格式：
   ```javascript
   // 确保请求头格式正确
   headers: {
     'Authorization': 'Bearer your-token-here',
     // 或
     'X-API-Key': 'your-api-key-here'
   }
   ```

### 5. 调试技巧

1. **启用详细日志**：
   ```javascript
   // 在中间件中添加调试日志
   console.log('认证中间件执行，token:', token);
   console.log('解析后的用户信息:', userInfo);
   ```

2. **检查路由注册**：
   ```bash
   # 启动应用时查看路由注册日志
   [@ddn/swagger-docs] register router with security: post /api/path (middlewares: 1)
   ```

3. **测试认证流程**：
   ```bash
   # 测试无认证访问
   curl -X POST http://localhost:7001/api/protected

   # 测试有认证访问
   curl -X POST http://localhost:7001/api/protected \
     -H "Authorization: Bearer your-token"
   ```
