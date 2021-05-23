/*
 * @Author: zbling
 * @Description: 一个将px单位换算为rem/vw/vmin并支持多种配置的插件，也可同时转换为rem/vw
 * 支持的配置项说明：
 * @params {
 * viewportWidth: 针对vw的基础视图宽度尺寸，默认值为750，设置为false或0时关闭转换
 * viewportUnit: 配置转换的单位，支持vw和vmin，默认值为vw
 * remRoot: rem依据的html根元素字体大小，默认值为100，设置为false或0时关闭转换
 * minPixelValue: 小于等于该最小值时不转换，默认值为1px
 * unitPrecision: 换算后小数点后精度位数，默认值为5位
 * ignoreProperty: 过滤不做转换处理的属性，如['border']，默认值为空数组[]
 * exclude: 过滤不做转换处理的文件目录，格式为正则表达式，如/node_modules/，默认值为false
 * include: 包含需要转换的文件或目录路径，优先级比exclude低，格式为正则表达式，默认值为false，表示全部，不要随便设置
 * no|px: 单条css样式不做转换处理时可在末尾增加该关键字注释
 * }
 */

'use strict';

const postcss = require('postcss');

const PXREG = /"[^"]+"|'[^']+'|url\([^\)]+\)|(\d*\.?\d+)px/gi;
const TYPEREG = /px2remvw-plugin-ipad(:(\d+))?/i;
const IPAD_BASE = 768;
const defaultOptions = {
  viewportWidth: 750,
  remRoot: 100,
  viewportUnit: 'vw',
  minPixelValue: 1,
  unitPrecision: 5,
  ignoreProperty: [],
  exclude: false,
  include: false,
};

module.exports = postcss.plugin('px2remvw-plugin', function(options = {}) {
  const { viewportWidth, remRoot, viewportUnit, minPixelValue, unitPrecision, ignoreProperty, exclude, include } = {
    ...defaultOptions,
    ...options,
  };

  const ignorePropertyRegex = createIgnorePropertyRegex(ignoreProperty);
  let pxReplaceForVw = createPxReplace({
    ratio: +viewportWidth / 100,
    minPixelValue,
    unitPrecision,
    toUnit: viewportUnit,
  });
  const pxReplaceForRem = createPxReplace({
    ratio: remRoot,
    minPixelValue,
    unitPrecision,
    toUnit: 'rem',
  });
  return function(root) {
    const { file, css } = root.source.input;
    if ((exclude && exclude.test(file)) || (include && !include.test(file))) return;

    if (TYPEREG.test(css)) {
      const { $2 } = RegExp;
      const coverViewportWidth = typeof +$2 === 'number' ? +$2 || IPAD_BASE : IPAD_BASE;
      pxReplaceForVw = createPxReplace({
        ratio: coverViewportWidth / 100,
        minPixelValue,
        unitPrecision,
        toUnit: viewportUnit,
      });
    }

    root.walkRules(function(rule) {
      rule.walkDecls(function(decl, i) {
        const nextDecl = decl.next() || {};
        const value = decl.value;
        if (
          value.indexOf('px') === -1 ||
          (ignorePropertyRegex && ignorePropertyRegex.test(decl.prop)) ||
          (nextDecl.type === 'comment' && /^(px|no)$/.test(nextDecl.text))
        )
          return;
        if (viewportWidth) {
          decl.value = value.replace(PXREG, pxReplaceForVw);
        }
        if (remRoot) {
          const newValue = value.replace(PXREG, pxReplaceForRem);
          if (viewportWidth && newValue !== value) {
            return decl.parent.insertBefore(
              i,
              decl.clone({
                value: newValue,
              })
            );
          }
          decl.value = newValue;
        }
      });
    });
  };
});

function createPxReplace(opts) {
  const { ratio, minPixelValue, unitPrecision, toUnit } = opts;
  return function(m, $1) {
    if (!$1 || +$1 <= minPixelValue) return m;
    return toFixed(+$1 / +ratio, +unitPrecision) + toUnit;
  };
}

function toFixed(number, precision) {
  const multiplier = Math.pow(10, precision + 1);
  const wholeNumber = Math.floor(number * multiplier);
  return (Math.round(wholeNumber / 10) * 10) / multiplier;
}

function createIgnorePropertyRegex(property) {
  if (!property.length) return;
  const prefixer = ['-webkit-', '-moz-', '-o-', '-ms-'];
  return new RegExp('^(' + prefixer.join('|') + ')?(' + property.join('|') + ')$');
}
