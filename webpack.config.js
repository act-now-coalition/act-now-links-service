const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: { "./src/index": "./src/index.ts", "./src/panel": "./src/panel.ts" },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    path: path.resolve(__dirname, "public/dist"),
    filename: "[name].js",
  },

  plugins: [
    // fix "process is not defined" error:
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ],

  devServer: {
    static: path.join(__dirname, "dist"),
    compress: true,
    port: 4000,
  },
};
