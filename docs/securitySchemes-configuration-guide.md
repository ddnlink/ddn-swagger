# DDN-Swagger securitySchemes 配置指南

## 概述

本文档详细说明了 DDN-Swagger 中 `securitySchemes` 的配置方法，包括标准 OpenAPI 3.0 认证类型和自定义认证字段的支持。

## 标准 OpenAPI 3.0 认证类型

### 1. API Key 认证

```javascript
securitySchemes: {
  // Header 中的 API Key
  apiKeyHeader: {
    type: 'apiKey',
    name: 'X-API-Key',
    in: 'header',
    description: 'API 密钥认证'
  },
  
  // Query 参数中的 API Key
  apiKeyQuery: {
    type: 'apiKey',
    name: 'api_key',
    in: 'query',
    description: 'Query 参数 API 密钥'
  },
  
  // Cookie 中的 API Key
  apiKeyCookie: {
    type: 'apiKey',
    name: 'session_token',
    in: 'cookie',
    description: 'Cookie 认证'
  }
}
```

### 2. HTTP 认证方案

```javascript
securitySchemes: {
  // Basic 认证
  basicAuth: {
    type: 'http',
    scheme: 'basic',
    description: 'HTTP Basic 认证'
  },
  
  // Bearer Token 认证
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT Bearer Token 认证'
  }
}
```

### 3. OAuth 2.0 认证

```javascript
securitySchemes: {
  oauth2: {
    type: 'oauth2',
    flows: {
      authorizationCode: {
        authorizationUrl: 'https://example.com/oauth/authorize',
        tokenUrl: 'https://example.com/oauth/token',
        scopes: {
          'read': '读取权限',
          'write': '写入权限',
          'admin': '管理员权限'
        }
      }
    },
    description: 'OAuth 2.0 认证'
  }
}
```

### 4. OpenID Connect

```javascript
securitySchemes: {
  openIdConnect: {
    type: 'openIdConnect',
    openIdConnectUrl: 'https://example.com/.well-known/openid-configuration',
    description: 'OpenID Connect 认证'
  }
}
```

## 自定义认证字段支持

### 问题分析

在 DDN-Hub 项目中发现了不符合 OpenAPI 规范的配置：

```javascript
// ❌ 错误配置 - 不符合 OpenAPI 规范
securitySchemes: {
  appAuth: {
    type: 'appAuth',  // 非标准类型
    name: 'Authorization',
    in: 'header',
  }
}
```

### 解决方案

#### 方案一：修正为标准类型（推荐）

```javascript
// ✅ 正确配置 - 符合 OpenAPI 规范
securitySchemes: {
  appAuth: {
    type: 'apiKey',  // 使用标准 apiKey 类型
    name: 'Authorization',
    in: 'header',
    description: '应用认证令牌'
  },
  
  appSecret: {
    type: 'apiKey',
    name: 'X-App-Secret',
    in: 'header',
    description: '应用密钥'
  }
}
```

#### 方案二：扩展支持（已实现）

DDN-Swagger 现已支持自定义认证类型的向后兼容处理：

1. **自动转换**：自定义类型会被自动转换为 `apiKey` 类型
2. **警告提示**：会在控制台输出警告信息
3. **文档生成**：能正确生成 Swagger 文档

## 中间件映射配置

### securityMiddlewareMap 配置

```javascript
// 安全方案与中间件的映射关系
securityMiddlewareMap: {
  'appAuth': 'auth.appAuth',           // 对应 app.middleware.auth.appAuth()
  'apiKeyHeader': 'apiAuth',           // 对应 app.middleware.apiAuth()
  'bearerAuth': 'sys.authAdminToken',  // 对应 app.middleware.sys.authAdminToken()
  'oauth2': 'oauth.tokenValidator'     // 对应 app.middleware.oauth.tokenValidator()
}
```

### 映射规则

1. **键名匹配**：必须与 `securitySchemes` 中的键名完全一致
2. **路径格式**：支持点号分隔的嵌套路径（如 `auth.appAuth`）
3. **中间件要求**：中间件必须是返回中间件函数的工厂函数

## 完整配置示例

```javascript
// config/swagger.js
module.exports = {
  openapi: '3.0.3',
  dirScanner: './app/controller',
  
  // API 信息
  apiInfo: {
    title: 'DDN Hub API',
    description: 'DDN Hub 社区管理平台 API',
    version: '1.0.1',
  },
  
  // 安全方案定义
  securitySchemes: {
    // 管理员认证
    adminAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: '管理员认证令牌'
    },
    
    // API 密钥认证
    apiKeyAuth: {
      type: 'apiKey',
      name: 'X-API-Key',
      in: 'header',
      description: 'API 密钥认证'
    },
    
    // Bearer Token 认证
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT Bearer Token'
    }
  },
  
  // 中间件映射
  securityMiddlewareMap: {
    'adminAuth': 'sys.authAdminToken',
    'apiKeyAuth': 'apiAuth',
    'bearerAuth': 'auth.bearerAuth'
  },
  
  // 启用安全功能
  enableSecurity: true,
  routerMap: true,
  enable: true,
};
```

## 使用示例

### 控制器中的注解使用

```javascript
/**
 * @summary 获取用户信息
 * @description 需要管理员权限
 * @router get /api/users/:id
 * @request path integer id 用户ID
 * @response 200 userResponse 用户信息
 * @adminAuth  // 使用管理员认证
 */
async getUserInfo() {
  // 业务逻辑
}

/**
 * @summary 第三方API接口
 * @description 供外部系统调用
 * @router post /api/external/data
 * @request body externalRequest *body 请求数据
 * @response 200 externalResponse 响应数据
 * @apiKeyAuth  // 使用 API 密钥认证
 */
async externalApi() {
  // 业务逻辑
}
```

## 最佳实践

1. **使用标准类型**：优先使用 OpenAPI 3.0 标准认证类型
2. **描述清晰**：为每个安全方案添加清晰的描述
3. **命名规范**：使用有意义的安全方案名称
4. **中间件对应**：确保每个安全方案都有对应的中间件实现
5. **测试验证**：在开发环境中充分测试认证流程

## 故障排除

### 常见问题

1. **自定义类型不生效**
   - 检查是否使用了非标准的 `type` 值
   - 建议修改为标准的 `apiKey` 或 `http` 类型

2. **中间件未加载**
   - 检查 `securityMiddlewareMap` 配置
   - 确认中间件文件路径正确

3. **注解不匹配**
   - 确保控制器中的注解名称与 `securitySchemes` 键名一致
   - 检查注解格式是否正确（如 `@adminAuth`）

### 调试方法

1. 查看启动日志中的安全中间件加载信息
2. 检查 Swagger UI 中的安全配置显示
3. 使用浏览器开发者工具检查请求头
