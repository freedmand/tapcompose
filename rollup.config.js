import babel from 'rollup-plugin-babel';
import buble from 'rollup-plugin-buble';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import uglify from 'rollup-plugin-uglify';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/lib/driver.js',
  output: {
    sourcemap: !production,
    format: 'iife',
    file: 'public/bundle.js'
  },
  name: 'app',
  plugins: [
    svelte({
      // enable run-time checks when not in production
      dev: !production,
      // we'll extract any component CSS out into
      // a separate file — better for performance
      css: css => {
        css.write('public/bundle.css');
      },

      // this results in smaller CSS files
      cascade: false
    }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration —
    // consult the documentation for details:
    // https://github.com/rollup/rollup-plugin-commonjs
    resolve(),
    commonjs(),

    // If we're building for production (npm run build
    // instead of npm run dev), transpile and minify
    production && babel({ exclude: 'node_modules/**' , runtimeHelpers: true }),
    production && buble({ exclude: 'node_modules/**' }),
    production && uglify()
  ]
};
