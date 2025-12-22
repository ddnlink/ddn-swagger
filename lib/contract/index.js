'use strict';

const path = require('path');
const fs = require('fs');
const { type, itemType } = require('../constant/index');

/**
 * contract Objectr
 */
let CONTRACT;
let VALIDATERULE;
/**
 * 获取应用中的contract定义
 * @param {EggApplication} app
 */
function generateContract(app) {

  CONTRACT = {};
  let baseDir = path.join(app.config.baseDir, 'app/contract');

  if (!fs.existsSync(baseDir)) {
    app.logger.warn('[@ddn/swagger-docs] can not found contract in app`s directory');
    return;
  }

  contractLoader(app, baseDir, '');
}

/**
 * 递归获取定义的Contract
 * @param {EggApplication} app Egg应用
 * @param {String} baseDir 根目录
 * @param {String} directory 相对目录
 */
function contractLoader(app, baseDir, directory) {

  const contractDir = path.join(baseDir, directory);

  const names = fs.readdirSync(contractDir);
  for (let name of names) {

    const filepath = path.join(contractDir, name);
    const stat = fs.statSync(filepath);

    if (stat.isDirectory()) {
      contractLoader(app, contractDir, name);
      continue;
    }

    if (stat.isFile() && ['.js', '.ts'].indexOf(path.extname(filepath)) !== -1) {
      let def = require(filepath.split(/\.(js|ts)/)[0]);

      for (let object in def) {
        CONTRACT[object] = {
          path: `app${filepath.split('app')[1]}`,
          content: def[object],
        };
      }
    }
  }
}

/**
 * 构建definition
 * @param {object} source contract超集
 */
function buildDefinition(source) {
  let result = {};
  for (let object in source) {
    let target = {
      type: 'object',
      required: [],
      properties: {},
    };
    let def = source[object].content;
    let path = source[object].path;

    for (let field in def) {

      if (def[field].hasOwnProperty('required') && def[field].required) {
        target.required.push(field);
      }
      delete def[field].required;

      if (!def[field].hasOwnProperty('type')) {
        throw new Error(`[@ddn/swagger-docs] ${path}: ${object}.${field}.type is necessary`);
      }

      if (!type.includes(def[field].type)) {
        // 检查引用的类型是否存在
        if (source[def[field].type] && source[def[field].type].content) {
          def[field]['$ref'] = `#/components/schemas/${def[field].type}`;
          delete def[field].type;
        } else {
          // 如果引用的类型不存在，使用 object 类型
          if (def[field].type !== 'object') {
            console.warn(`[@ddn/swagger-docs] Warning: Referenced type "${def[field].type}" not found for "${object}.${field}". Using 'object' type instead.`);
          }
          def[field].type = 'object';
        }
      }

      // #region 对array数组的处理
      if (def[field].type === 'array') {
        if (!def[field].hasOwnProperty('itemType')) {
          throw new Error(`[@ddn/swagger-docs] ${path}: ${object}.${field}.itemType is necessary`);
        }

        if (!itemType.includes(def[field].itemType)) {
          // 检查引用的类型是否存在
          if (source[def[field].itemType] && source[def[field].itemType].content) {
            let itemType = { $ref: `#/components/schemas/${def[field].itemType}` };
            def[field]['items'] = itemType;
          } else {
            // 如果引用的类型不存在，使用 object 类型
            if (def[field].itemType !== 'object') {
              console.warn(`[@ddn/swagger-docs] Warning: Referenced itemType "${def[field].itemType}" not found for "${object}.${field}". Using 'object' type instead.`);
            }
            let itemType = { type: 'object' };
            def[field]['items'] = itemType;
          }
        } else {
          let itemType = { type: def[field].itemType };
          def[field]['items'] = itemType;
        }
        delete def[field].itemType;
      }

      // 移除swagger非必要的属性
      if (def[field].type !== 'string') {
        delete def[field].format;
      }

      if ((def[field].format !== 'date-time' && def[field].format !== 'date')) {
        delete def[field].format;
      }

      delete def[field].max;
      delete def[field].min;
      delete def[field].allowEmpty;
      delete def[field].test;
    }

    target.properties = def;
    result[object] = target;
  }
  return result;
}

/**
 * 生成验证规则
 * @param {Object} source
 */
function buildValidateRule(source) {
  VALIDATERULE = {};
  for (let object in source) {
    // 检查 source[object] 和 source[object].content 是否存在
    if (!source[object] || !source[object].content) {
      console.warn(`[@ddn/swagger-docs] Warning: Invalid contract definition for "${object}". Skipping.`);
      continue; // 跳过无效的定义
    }

    let def = source[object].content;
    for (let field in def) {
      // 检查 def[field] 是否存在
      if (!def[field]) {
        console.warn(`[@ddn/swagger-docs] Warning: Invalid field definition for "${object}.${field}". Skipping.`);
        continue; // 跳过无效的字段定义
      }

      if (!type.includes(def[field].type)) {
        // 检查 source[def[field].type] 是否存在
        const referencedType = source[def[field].type];
        if (!referencedType || !referencedType.content) {
          // 只有在真正找不到类型定义时才显示警告
          if (def[field].type !== 'object') {
            console.warn(`[@ddn/swagger-docs] Warning: Referenced type "${def[field].type}" not found for "${object}.${field}". Using 'object' type instead.`);
          }
          def[field]['rule'] = {}; // 使用空对象作为默认规则
        } else {
          def[field]['rule'] = referencedType.content;
        }
        def[field].type = 'object';
      }

      // #region 对array数组的处理
      if (def[field].type === 'array') {
        if (!itemType.includes(def[field].itemType)) {
          // 检查 source[def[field].itemType] 是否存在
          const referencedItemType = source[def[field].itemType];
          if (!referencedItemType || !referencedItemType.content) {
            // 只有在真正找不到类型定义时才显示警告
            if (def[field].itemType !== 'object') {
              console.warn(`[@ddn/swagger-docs] Warning: Referenced itemType "${def[field].itemType}" not found for "${object}.${field}". Using empty object rule instead.`);
            }
            def[field]['rule'] = {}; // 使用空对象作为默认规则
          } else {
            def[field]['rule'] = referencedItemType.content;
          }
          def[field]['itemType'] = 'object';
        } else {
          def[field]['rule'] = { type: def[field].itemType };
        }
      }

      if (def[field].hasOwnProperty('enum')) {
        delete def[field].type;
        def[field] = def[field].enum;
        delete def[field].enum;
      }
      if (def[field].hasOwnProperty('format') &&
        (def[field].format === 'date-time' || def[field].format === 'date')) {
        delete def[field].format;
      }
      delete def[field].description;
      delete def[field].example;
    }
    VALIDATERULE[object] = def;
  }
}

module.exports = {
  /**
   * 获取定义的request/response object
   * @param {EggApplication} app egg应用
   */
  getDefinitions: app => {
    if (!CONTRACT) {
      generateContract(app);
    }

    let source = JSON.parse(JSON.stringify(CONTRACT));
    let definitions = buildDefinition(source);
    return definitions;
  },

  getValidateRuler: app => {
    if (!CONTRACT) {
      generateContract(app);
    }
    if (!VALIDATERULE) {
      let source = JSON.parse(JSON.stringify(CONTRACT)); // 创建深拷贝，避免修改原始对象
      buildValidateRule(source);
    }
    return VALIDATERULE;
  },
};

