const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  mode: "production",
  target: "web",
  node: {
	  fs: 'empty'
	},
  output: {
    filename: 'scripts.js',
    path: path.resolve(__dirname, 'docs')
  },
  optimization: {
    minimizer: [new TerserPlugin()],
  },
};