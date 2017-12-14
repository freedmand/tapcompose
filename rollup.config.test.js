import babel from 'rollup-plugin-babel'
import multiEntry from 'rollup-plugin-multi-entry'

export default {
  input: 'src/lib/*_test.js',
  plugins: [
    babel({
      exclude: 'node_modules/**',
    }),
    multiEntry()
  ],
  intro: 'require("source-map-support").install()',
  output: {
    file: 'test/test-bundle.js',
    format: 'cjs'
  },
  sourcemap: true
}
