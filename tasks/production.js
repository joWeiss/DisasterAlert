var $, gulp;

gulp = require('gulp');

$ = require('gulp-load-plugins')();

require('dotenv').load();

gulp.task('prod', function() {
  $.nodemon({
    script: 'bin/www',
    ignore: ['./'],
    env: {
      'NODE_ENV': 'production'
    }
  }).on('restart', function() {
    console.log('restarted!');
  });
});
