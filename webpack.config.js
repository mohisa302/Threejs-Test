const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    app: './src/app.js',
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      // ... other rules
      {
        test: /\.(glb|gltf)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'assets/', // The folder where the file will be placed
            },
          },
        ],
      },
    ],
  },
};
