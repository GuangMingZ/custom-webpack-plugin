/* eslint-disable */

const path = require("path");
const Px2remvwPlugin = require("./plugins/px2remvw-plugin");
const FileListPlugin = require("./plugins/file-list-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  server: {
    ssr: !true,
  },
  bff: {
    prefix: "/",
  },
  runtime: {
    features: {},
  },
  source: {
    envVars: [],
    disableDefaultEntries: true,
    entries: {},
    alias: {},
  },
  output: {
    publicUrl: "/",
    disableSourceMap: false,
    disableMinimize: false,
    // 默认会把文件 copy 到 dist
    copy: [{ from: "./public", to: "" }],
    scriptExt: {
      custom: [
        {
          test: /\.js$/,
          attribute: "crossorigin",
          value: "anonymous",
        },
        {
          test: /\.js$/,
          attribute: "charset",
          value: "utf-8",
        },
      ],
    },
  },
  tools: {
    babel: (
      opts,
      { addPlugins, removePlugins, addIncludes, addExcludes, addPresets }
    ) => {
      addIncludes([/packages\/.+\.ts/]);
    },
    postcss: (opts, { addPlugins }) => {
      addPlugins([
        Px2remvwPlugin({
          viewportWidth: 0,
          viewportUnit: "rem",
          minPixelValue: 1,
          remRoot: 100,
          unitPrecision: 5,
          ignoreProperty: [],
          exclude: /node_modules/i,
          include: false,
        }),
      ]);
    },
    webpack: (config, { appendPlugins }) => {
      addGlobalVariableRule(config);
      addUtilImportPlugin(config);
      // 线上环境去掉console/debugger等
      isOnline && addUglifyJsPlugin(config);

      const plugins = [new FileListPlugin()];

      !isDEV &&
        plugins.push(
          new DynamicCdnPlugin({
            publicPathList: [],
          })
        );

      appendPlugins(plugins);
    },
    devServer: {},
  },
};

function addGlobalVariableRule(config) {
  const lessRule = config.module.rules[1].oneOf.find(
    (rule) => rule.test.toString() === /\.less$/.toString()
  );
  lessRule &&
    lessRule.use.push({
      loader: "style-resources-loader",
      options: {
        patterns: path.resolve(__dirname, "./src/style/variables.less"),
      },
    });
  return config;
}

function addUtilImportPlugin(config) {
  const utilPlugin = config.module.rules[1].oneOf.find(
    (rule) => rule.test.toString() === /\.(js|mjs|jsx|ts|tsx)$/.toString()
  );
  utilPlugin && utilPlugin.options.plugins.push([HOOKS_DIR_NAME]);
  return config;
}

function addHtmlHash(config) {
  const { plugins } = config;
  const htmlWebpackPlugins = plugins.filter(
    (plugin) => plugin.constructor.name === "HtmlWebpackPlugin"
  );
  if (!htmlWebpackPlugins.length) return config;

  htmlWebpackPlugins.forEach((htmlWebpackPlugin) => {
    const htmlWebpackPluginOpitons = htmlWebpackPlugin.options;
    const filename = htmlWebpackPluginOpitons.filename.replace(
      /\.html$/,
      ".[contenthash:6].html"
    );
    htmlWebpackPluginOpitons.filename = filename;
    htmlWebpackPluginOpitons.hash = true;
  });
  return config;
}

function addUglifyJsPlugin(config) {
  const { minimizer } = config.optimization;
  if (Array.isArray(minimizer)) {
    minimizer.push(
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_debugger: true,
            drop_console: true,
            pure_funcs: ["console.log"],
          },
        },
        sourceMap: true,
        parallel: true,
      })
    );
  }

  return config;
}
