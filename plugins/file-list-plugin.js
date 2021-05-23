const crypto = require('crypto');
const interactiveReg = /\/interactive\/index\.html/;
const interactiveManifestReg = /\/interactive-manifest\/index\.html/;
const htmlDefaultPath = 'static/html/interactive/';

const boe = 'https://gglmind.bytedance.net';
const online = 'https://mind.ggl.cn';

function generateFileHash256(
  content,
  hashType = 'sha256',
  hashDigestLength = 8
) {
  const fileHash = crypto.createHash(hashType);
  fileHash.update(content);

  return fileHash.digest('hex').substr(0, hashDigestLength);
}

module.exports = class FileListPlugin {
  apply(compiler) {
    let originContent = '';
    let hash = '';

    compiler.hooks.emit.tapAsync('FileListPlugin', (compilation, cb) => {
      for (const filename in compilation.assets) {
        if (interactiveReg.test(filename)) {
          originContent = compilation.assets[filename].source();
          hash = generateFileHash256(originContent);
        }
      }

      for (const filename in compilation.assets) {
        if (interactiveManifestReg.test(filename)) {
          // 输出html类型的manifest文件
          const json = `{
            "boe": "${boe}/interactive/redirect?htmlHash=${hash}",
            "online": "${online}/interactive/redirect?htmlHash=${hash}"
          }`;
          compilation.assets[filename] = {
            source: () => json,
            size: () => json.length,
          };
        }
      }

      // 输出带hash html文件
      compilation.assets[htmlDefaultPath + `index.${hash}.html`] = {
        source: () => originContent + '<!-- take hash -->',
        size: () => originContent.length,
      };

      cb();
    });
  }
};
