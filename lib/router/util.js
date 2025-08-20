'use strict';
module.exports = {
  convertControllerPath: (controllerName, controller) => {
    if (!controllerName) {
      console.warn('[@ddn/swagger-docs] controllerName is undefined, returning controller directly');
      return controller;
    }

    let returnObj = {};
    const strArr = controllerName.split('.').slice(1);// controllerName格式：controller.data.apis.user.userController，转换成数组后需要把controller删除掉

    if (strArr.length === 0) {
      console.warn('[@ddn/swagger-docs] Invalid controllerName format:', controllerName);
      return controller;
    }

    const iter = strArr[Symbol.iterator]();
    function convertObj(obj) {
      const next = iter.next();
      if (!next.done) {
        const tmp = next.value;
        if (!obj || !obj[tmp]) {
          console.warn(`[@ddn/swagger-docs] Controller path not found: ${tmp} in`, Object.keys(obj || {}));
          return obj;
        }
        const tmpObj = {};
        tmpObj[next.value] = obj[tmp];
        returnObj = tmpObj;
        convertObj(obj[tmp]);
      }
      return returnObj;
    }

    try {
      const rs = convertObj(controller);
      const lastKey = strArr.pop();
      return rs && rs[lastKey] ? rs[lastKey] : controller;
    } catch (error) {
      console.error('[@ddn/swagger-docs] Error in convertControllerPath:', error);
      return controller;
    }
  },

};
