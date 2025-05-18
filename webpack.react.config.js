//@ts-check
'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'web',
  mode: 'development',
  entry: './src/webviews/sidebar-react/index.tsx',
  output: {
    path: path.resolve(__dirname, 'src/webviews/sidebar-react'),
    filename: 'index.js',
    libraryTarget: 'commonjs2'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                jsx: 'react-jsx'
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  externals: {
    vscode: 'commonjs vscode'
  }
};

module.exports = config;
