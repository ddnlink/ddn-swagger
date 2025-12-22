'use strict';

const path = require('path');
const fs = require('fs');
const { type, itemType } = require('../constant/index');

/**
 * Enhanced contract processor with type composition support
 */
let CONTRACT;

/**
 * 生成contract
 * @param {EggApplication} app egg应用
 */
function generateContract(app) {
  CONTRACT = {};
  const contractPath = path.join(app.baseDir, 'app/contract');

  if (!fs.existsSync(contractPath)) {
    console.warn(`[@ddn/swagger-docs] Contract path not found: ${contractPath}`);
    return;
  }

  loadContractFiles(contractPath);
  console.log(`[@ddn/swagger-docs] Loaded ${Object.keys(CONTRACT).length} contract definitions:`,
    Object.keys(CONTRACT).slice(0, 10));
}

/**
 * 递归加载contract文件
 * @param {string} dirPath 目录路径
 */
function loadContractFiles(dirPath) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filepath = path.join(dirPath, file);
    const stat = fs.statSync(filepath);

    if (stat.isDirectory()) {
      loadContractFiles(filepath);
    } else if (stat.isFile() && ['.js', '.ts'].includes(path.extname(filepath))) {
      try {
        const def = require(filepath.split(/\.(js|ts)/)[0]);

        for (const object in def) {
          CONTRACT[object] = {
            content: def[object],
            path: filepath,
          };
        }
      } catch (error) {
        console.error(`[@ddn/swagger-docs] Error loading contract file ${filepath}:`, error.message);
      }
    }
  }
}

/**
 * 增强版构建definition，支持类型组合
 * @param {object} source contract超集
 */
function buildDefinition(source) {
  const result = {};

  // 首先处理基础类型
  const processOrder = getProcessOrder(source);

  for (const objectName of processOrder) {
    if (!source[objectName]) continue;

    const target = {
      type: 'object',
      required: [],
      properties: {},
    };

    const def = source[objectName].content;
    const filePath = source[objectName].path;

    // 处理类型组合（extends, allOf等）
    if (def.extends) {
      mergeExtendedType(target, def.extends, source);
    }

    if (def.allOf) {
      mergeAllOfTypes(target, def.allOf, source);
    }

    // 处理普通字段
    for (const field in def) {
      if (['extends', 'allOf', 'oneOf', 'anyOf'].includes(field)) {
        continue; // 跳过组合关键字
      }

      const fieldDef = def[field];
      if (!fieldDef || typeof fieldDef !== 'object') continue;

      // 处理必需字段
      if (fieldDef.required) {
        target.required.push(field);
      }

      // 处理字段类型
      const processedField = processFieldType(fieldDef, source, objectName, field, filePath);
      target.properties[field] = processedField;
    }

    result[objectName] = target;
  }

  return result;
}

/**
 * 获取类型处理顺序（依赖关系排序）
 * @param {object} source
 */
function getProcessOrder(source) {
  const visited = new Set();
  const visiting = new Set();
  const result = [];

  function visit(typeName) {
    if (visited.has(typeName)) return;
    if (visiting.has(typeName)) {
      console.warn(`[@ddn/swagger-docs] Circular dependency detected: ${typeName}`);
      return;
    }

    visiting.add(typeName);

    const typeDef = source[typeName];
    if (typeDef && typeDef.content) {
      // 处理依赖
      const deps = getDependencies(typeDef.content, source);
      for (const dep of deps) {
        visit(dep);
      }
    }

    visiting.delete(typeName);
    visited.add(typeName);
    result.push(typeName);
  }

  for (const typeName in source) {
    visit(typeName);
  }

  return result;
}

/**
 * 获取类型依赖
 * @param {object} content
 * @param {object} source
 */
function getDependencies(content, source) {
  const deps = new Set();

  if (content.extends && source[content.extends]) {
    deps.add(content.extends);
  }

  if (content.allOf && Array.isArray(content.allOf)) {
    for (const item of content.allOf) {
      if (typeof item === 'string' && source[item]) {
        deps.add(item);
      }
    }
  }

  // 检查字段引用
  for (const field in content) {
    const fieldDef = content[field];
    if (fieldDef && typeof fieldDef === 'object') {
      if (fieldDef.type && !type.includes(fieldDef.type) && source[fieldDef.type]) {
        deps.add(fieldDef.type);
      }
      if (fieldDef.itemType && !itemType.includes(fieldDef.itemType) && source[fieldDef.itemType]) {
        deps.add(fieldDef.itemType);
      }
    }
  }

  return Array.from(deps);
}

/**
 * 合并继承类型
 * @param {object} target
 * @param {string} parentType
 * @param {object} source
 */
function mergeExtendedType(target, parentType, source) {
  const parent = source[parentType];
  if (!parent || !parent.content) {
    console.warn(`[@ddn/swagger-docs] Parent type not found: ${parentType}`);
    return;
  }

  // 递归处理父类型的继承
  if (parent.content.extends) {
    mergeExtendedType(target, parent.content.extends, source);
  }

  // 合并父类型字段
  for (const field in parent.content) {
    if (['extends', 'allOf', 'oneOf', 'anyOf'].includes(field)) continue;

    const fieldDef = parent.content[field];
    if (fieldDef && typeof fieldDef === 'object') {
      if (fieldDef.required) {
        target.required.push(field);
      }

      const processedField = processFieldType(fieldDef, source, parentType, field, parent.path);
      target.properties[field] = processedField;
    }
  }
}

/**
 * 合并allOf类型
 * @param {object} target
 * @param {array} allOfTypes
 * @param {object} source
 */
function mergeAllOfTypes(target, allOfTypes, source) {
  for (const typeName of allOfTypes) {
    if (typeof typeName === 'string' && source[typeName]) {
      mergeExtendedType(target, typeName, source);
    }
  }
}

/**
 * 处理字段类型
 * @param {object} fieldDef
 * @param {object} source
 * @param {string} objectName
 * @param {string} fieldName
 * @param {string} filePath
 */
function processFieldType(fieldDef, source, objectName, fieldName, filePath) {
  const result = Object.assign({}, fieldDef);
  delete result.required;

  // 处理自定义类型引用
  if (!type.includes(result.type)) {
    if (source[result.type] && source[result.type].content) {
      result['$ref'] = `#/components/schemas/${result.type}`;
      delete result.type;
    } else if (result.type !== 'object') {
      console.warn(`[@ddn/swagger-docs] Warning: Referenced type "${result.type}" not found for "${objectName}.${fieldName}". Using 'object' type instead.`);
      result.type = 'object';
    }
  }

  // 处理数组类型
  if (result.type === 'array') {
    if (!result.itemType) {
      throw new Error(`[@ddn/swagger-docs] ${filePath}: ${objectName}.${fieldName}.itemType is necessary`);
    }

    if (!itemType.includes(result.itemType)) {
      if (source[result.itemType] && source[result.itemType].content) {
        result.items = { $ref: `#/components/schemas/${result.itemType}` };
      } else if (result.itemType !== 'object') {
        console.warn(`[@ddn/swagger-docs] Warning: Referenced itemType "${result.itemType}" not found for "${objectName}.${fieldName}". Using 'object' type instead.`);
        result.items = { type: 'object' };
      } else {
        result.items = { type: 'object' };
      }
    } else {
      result.items = { type: result.itemType };
    }
    delete result.itemType;
  }

  // 清理不需要的属性
  if (result.type !== 'string') {
    delete result.format;
  }
  delete result.description;
  delete result.example;

  return result;
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

    const source = JSON.parse(JSON.stringify(CONTRACT));
    const definitions = buildDefinition(source);
    return definitions;
  },

  getValidateRuler: () => {
    // 这里可以复用原有的验证规则生成逻辑
    return {};
  },
};
