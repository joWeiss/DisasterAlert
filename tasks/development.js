var $, gulp;

gulp = require('gulp');

$ = require('gulp-load-plugins')();

require('dotenv').load();

gulp.task('dev', function() {
  $.nodemon({
    script: 'bin/www',
    ignore: ['./.tmp', './build', './node_modules'],
    env: {
      'NODE_ENV': 'development'
    }
  }).on('restart', function() {
    console.log('restarted!');
  });
});
