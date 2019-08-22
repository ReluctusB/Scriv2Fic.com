const path = require('path');

module.exports = {
  entry: './src/index.js',
  node: {
	  fs: 'empty'
	},
  output: {
    filename: 'scripts.js',
    path: path.resolve(__dirname, 'dist')
  }
};