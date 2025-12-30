'use strict';
const fs = require('fs');

module.exports = {
  /**
   * 获取指定文件中的注释块集合
   * @param {String} filePath 文件路径
   * @return {Array} 返回注释块集合
   */
  generateCommentBlocks: filePath => {
    let buffer = fs.readFileSync(filePath);
    let fileString = buffer.toString();
    const block_regex = /\/\*\*([\s\S]*?)\*\//gm;
    let blocks = [];
    let match;

    while ((match = block_regex.exec(fileString)) !== null) {
      let comment = match[0];
      if (comment.indexOf('ontroller') > -1 || comment.indexOf('outer') > -1 || comment.indexOf('gnore') > -1) {
        // Look ahead for function name
        let endIndex = block_regex.lastIndex;
        let nextText = fileString.slice(endIndex);
        
        // Match function name:
        // 1. async method()
        // 2. method()
        // 3. async method = () =>
        // 4. method = () =>
        
        // Regex explanation:
        // ^\s*                                     # Skip leading whitespace
        // (?:async\s+)?                            # Optional async
        // (?:function\s+)?                         # Optional function keyword
        // ([a-zA-Z0-9_$]+)                         # Capture method name
        // \s*                                      # Optional whitespace
        // (?:\(|=\s*(?:async\s*)?\(|:)             # Followed by (, or = (, or = async (, or : (for TS types?)
        
        const funcRegex = /^\s*(?:async\s+)?(?:function\s+)?([a-zA-Z0-9_$]+)\s*(?:\(|=\s*(?:async\s*)?\(|:)/;
        const funcMatch = nextText.match(funcRegex);
        
        let funcName = null;
        if (funcMatch) {
          funcName = funcMatch[1];
        }
        
        blocks.push({ comment, funcName });
      }
    }
    return blocks;
  },
  /**
   * 获取块中包含指定标识的注释行，返回行中以空格分割的得到的数组
   * @param {String} commentBlock 注释
   * @param {String} regex 正则式
   * @return {*} 匹配成功返回行中以空格分割的得到的数组，否则false
   */
  getComment: (commentBlock, regex) => {
    let result = [];
    let comment_lines = commentBlock.match(regex);
    if (comment_lines) {
      for (let comment_line of comment_lines) {
        result.push(comment_line.slice(1, comment_line.length - 1).replace('\r', '').split(' '));
      }
      return result;
    }
    return false;
  },

};
