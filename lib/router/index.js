'use strict';

const path = require('path');
const fs = require('fs');
const staticCache = require('koa-static-cache');
const { documentInit, getFuncBundler } = require('../document/index');
const { convertControllerPath } = require('./util');

function getSegmentType(segment) {
  if (segment === '*' || segment === '(.*)') return 2; // Wildcard
  if ((segment.startsWith('{') && segment.endsWith('}')) || segment.startsWith(':')) return 1; // Param
  return 0; // Static
}

function compareRouteEntries(a, b) {
  const routeA = normalizeRoutePath(a.req.route);
  const routeB = normalizeRoutePath(b.req.route);

  // 路径完全相同，按定义顺序排序
  if (routeA === routeB) {
    return (a._index || 0) - (b._index || 0);
  }

  const segsA = routeA.split('/').filter(Boolean);
  const segsB = routeB.split('/').filter(Boolean);
  const len = Math.min(segsA.length, segsB.length);

  for (let i = 0; i < len; i++) {
    const sA = segsA[i];
    const sB = segsB[i];
    if (sA === sB) continue;

    const typeA = getSegmentType(sA);
    const typeB = getSegmentType(sB);

    // 优先级：精准路径(0) > 动态参数(1) > 通配符(2)
    if (typeA !== typeB) {
      return typeA - typeB;
    }

    // 同类型不同路径（如 /dao/ 和 /daos/），按定义顺序排序
    return (a._index || 0) - (b._index || 0);
  }

  // 前缀相同但长度不同（如 /a/b 和 /a/b/c），按定义顺序排序
  return (a._index || 0) - (b._index || 0);
}

function sortRouteEntries(entries) {
  return (entries || []).slice().sort(compareRouteEntries);
}

function normalizeRoutePath(route) {
  // 支持多个 path param：/foo/{id}/bar/{name} -> /foo/:id/bar/:name
  return String(route || '').replace(/\{([^}]+)\}/g, ':$1');
}

module.exports = {

  /**
   * 注册SwaggerUI基础路由
   */
  basicRouterRegister: app => {

    // swaggerUI json字符串访问地址
    app.get('/swagger-doc', ctx => {
      ctx.response.status = 200;
      ctx.response.type = 'application/json';
      ctx.response.body = documentInit(app);
    });
    app.logger.info('[@ddn/swagger-docs] register router: get /swagger-doc');

    // swaggerUI的静态资源加入缓存，配置访问路由
    const swaggerH5 = path.join(__dirname, '../../app/public');
    app.use(staticCache(swaggerH5, {}, {}));
    app.logger.info('[@ddn/swagger-docs] register router: get /swagger-ui.html');

  },
  /**
   * 注册扫描到的路由
   */
  RouterRegister: app => {
    const funcBundler = getFuncBundler(app);
    // const rules = getValidateRuler(app);
    const { router, controller } = app;
    const config = app.config.swaggerdoc;

    // 关键：按“更具体的路径优先”排序，避免参数路由（如 /daos/:id）覆盖静态路由（如 /daos/categories）。
    // Egg/Koa Router 是按注册顺序匹配的：先注册的先命中。
    const routeEntries = [];
    let index = 0;
    for (const obj of funcBundler) {
      let instance = require(obj.filePath);
      const fileExtname = path.extname(obj.filePath);
      const direct = `${obj.filePath.split(fileExtname)[0].split('app' + path.sep)[1]}`;

      if (fileExtname === '.ts') {
        instance = instance.default;
      }

      for (const req of obj.routers) {
        routeEntries.push({ req, instance, direct, _index: index++ });
      }
    }

    routeEntries.sort(compareRouteEntries);

    // 导出路由列表（用于调试）
    const registeredRoutes = [];

    for (const entry of routeEntries) {
      const { req, instance, direct } = entry;

      // if (app.config.swaggerdoc.enableValidate && router.ruleName) {

      //   app[router.method](router.route.replace('{', ':').replace('}', ''), function (ctx, next) {

      //     app.logger.info(`[@ddn/swagger-docs] validate ${router.ruleName}`);
      //     // app.logger.info(JSON.stringify(rules[router.ruleName]));
      //     return next();
      //   }, controller[router.func]);

      // } else {

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
      const route = normalizeRoutePath(req.route);
      if (middlewares.length > 0) {
        router[req.method](route, ...middlewares, controllerMethod);
        if (config.routerCli) {
          app.logger.info(`[@ddn/swagger-docs] register router with security: ${req.method} ${req.route} for ${direct.replace(path.sep, '-')}-${req.func} (middlewares: ${middlewares.length})`);
        }
      } else {
        router[req.method](route, controllerMethod);
        if (config.routerCli) {
          app.logger.info(`[@ddn/swagger-docs] register router: ${req.method} ${req.route} for ${direct.replace(path.sep, '-')}-${req.func}`);
        }
      }

      // 记录路由信息
      registeredRoutes.push({
        method: req.method.toUpperCase(),
        path: route,
        controller: `${direct.replace(path.sep, '-')}.${req.func}`,
        middlewares: middlewares.map(m => m.name || 'anonymous').join(', '),
        summary: req.summary || '',
      });
      // }
    }

    // 如果配置了 routerPath，将路由列表写入文件
    if (config.routerPath) {
      try {
        const routerFilePath = path.isAbsolute(config.routerPath)
          ? config.routerPath
          : path.join(app.baseDir, config.routerPath);

        const header = '| Method | Path | Controller | Middlewares | Summary |\n| --- | --- | --- | --- | --- |\n';
        const content = registeredRoutes.map(r =>
          `| ${r.method} | ${r.path} | ${r.controller} | ${r.middlewares} | ${r.summary} |`
        ).join('\n');

        fs.writeFileSync(routerFilePath, header + content);
        app.logger.info(`[@ddn/swagger-docs] Router map exported to ${routerFilePath}`);
      } catch (error) {
        app.logger.error(`[@ddn/swagger-docs] Failed to export router map: ${error.message}`);
      }
    }
  },

};

// 导出纯函数，便于做单元测试（不依赖 Egg 启动）。
module.exports.sortRouteEntries = sortRouteEntries;
module.exports.normalizeRoutePath = normalizeRoutePath;
module.exports._compareRouteEntries = compareRouteEntries;

/**
 * 根据安全配置获取中间件
 * @param {Array} securities 安全配置数组
 * @param {Object} app Egg应用实例
 * @param {Object} config Swagger配置
 * @returns {Array} 中间件数组
 */
function getSecurityMiddlewares(securities, app, config) {
  const middlewares = [];
  const securityMiddlewareMap = config.securityMiddlewareMap || {};

  for (let security of securities) {
    for (let securityName in security) {
      const middlewarePath = securityMiddlewareMap[securityName];
      if (middlewarePath) {
        try {
          // 支持嵌套的中间件路径，如 'sys.authAdminToken'
          const middlewareParts = middlewarePath.split('.');
          let middleware = app.middleware;

          for (let part of middlewareParts) {
            middleware = middleware[part];
            if (!middleware) {
              app.logger.warn(`[@ddn/swagger-docs] 中间件路径不存在: ${middlewarePath}`);
              break;
            }
          }

          if (middleware && typeof middleware === 'function') {
            middlewares.push(middleware());
            if (config.routerCli) {
              app.logger.info(`[@ddn/swagger-docs] 添加安全中间件: ${securityName} -> ${middlewarePath}`);
            }
          }
        } catch (error) {
          app.logger.error(`[@ddn/swagger-docs] 加载中间件失败: ${middlewarePath}`, error);
        }
      } else {
        app.logger.warn(`[@ddn/swagger-docs] 未找到安全方案 ${securityName} 对应的中间件配置`);
      }
    }
  }

  return middlewares;
}
