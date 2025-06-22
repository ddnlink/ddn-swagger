'use strict';

const path = require('path');
const staticCache = require('koa-static-cache');
const { documentInit, getFuncBundler } = require('../document/index');
const { convertControllerPath } = require('./util');

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

    for (let obj of funcBundler) {
      let instance = require(obj.filePath);

      let fileExtname = path.extname(obj.filePath);
      let direct = `${obj.filePath.split(fileExtname)[0].split('app' + path.sep)[1]}`;

      if (fileExtname === '.ts') {
        instance = instance.default;
      }

      for (let req of obj.routers) {

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
        const route = req.route.replace('{', ':').replace('}', '');
        if (middlewares.length > 0) {
          router[req.method](route, ...middlewares, controllerMethod);
          app.logger.info(`[@ddn/swagger-docs] register router with security: ${req.method} ${req.route} for ${direct.replace(path.sep, '-')}-${req.func} (middlewares: ${middlewares.length})`);
        } else {
          router[req.method](route, controllerMethod);
          app.logger.info(`[@ddn/swagger-docs] register router: ${req.method} ${req.route} for ${direct.replace(path.sep, '-')}-${req.func}`);
        }
        // }
      }

    }
  },

};

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
            app.logger.info(`[@ddn/swagger-docs] 添加安全中间件: ${securityName} -> ${middlewarePath}`);
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
