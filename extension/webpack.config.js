const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    content: "./src/content.ts",
    background: "./src/background.ts",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "public", to: "." }],
    }),
    // Inject backend URL at build time.
    // Dev:  npm run build  (defaults to localhost)
    // Prod: BACKEND_URL=https://your-app.onrender.com npm run build
    new webpack.DefinePlugin({
      BACKEND_URL: JSON.stringify(
        process.env.BACKEND_URL || "http://localhost:3000"
      ),
    }),
  ],
};
