// Load custom tasks from the `tasks` directory
try {
  require('require-dir')('tasks');
} catch (err) {}
