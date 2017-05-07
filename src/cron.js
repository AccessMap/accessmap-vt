// Registers a cron(-ish) job for tippecanoe that executes daily at midnight
var cron = require('cron');
var updateTiles = require('./tippecanoe');

var cronJob = cron.job('0 0 0 * * *', function() {
  updateTiles(function(err) {
    return
  });
});

cronJob.start();
