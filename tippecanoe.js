// Registers a cron(-ish) job for tippecanoe that executes daily at midnight
var extend = require('xtend');
var spawn = require('child_process').spawn;


function Tippecanoe(options) {
  this.options = extend({}, this.options, options);
  this.exec = this.options.exec;
  this.minzoom = this.options.minzoom;
  this.maxzoom = this.options.maxzoom;
  this.force = this.options.force;
  this.docker = this.options.docker;

  if (this.docker) {
    // Set up docker
    // Note: docker mode forces the executed command to use docker (exec option
    // is ignored).
    var docker = spawn('docker', [
      'build',
      '-t',
      'tippecanoe',
      'tippecanoe-docker/'
    ]);

    docker.on('error', function(err) {
      throw err;
    });

    docker.on('close', function(code) {
      if (code !== 0) {
        throw 'Could not build tippecanoe Docker image';
      }
    });
  }
}

Tippecanoe.prototype = {
  options: {
    'exec': 'tippecanoe',
    'maxzoom': 14,
    'minzoom': 0,
    'rate': 0,
    'force': false,
    'docker': false
  },

  run: function(inpaths, outpath, callback) {
    var exec = this.exec;
    var arglist = [];
    if (this.docker) {
      exec = 'docker';
      arglist.push('run');
      arglist.push('-v');
      arglist.push(process.cwd() + ':/home/tippecanoe');
      arglist.push('tippecanoe');
    }

    // TODO: make this user-configurable
    // Keep all detail past zoom 17
    arglist.push('-B');
    arglist.push(17);

    // Maximum zoom level for which to build tiles
    arglist.push('-z');
    arglist.push(this.maxzoom);

    // Minimum zoom level for which to build tiles
    arglist.push('-Z');
    arglist.push(this.minzoom);

    // Force overwriting .mbtiles file if one already exists
    if (this.force) {
      arglist.push('f')
    }

    // Drop rate for dots (lower zoom levels = dropped out points)
    arglist.push('-r');
    arglist.push(this.options.rate);

    // Path to which mbtiles will be written
    arglist.push('-o');
    arglist.push(outpath);

    // Parse inpaths. There are two options:
    // if string, it's just one layer.
    // If object, it must be in form {'name': 'path'}, i.e. naming of the
    // layer is required. There can be multiple key-value pairs for multiple
    // layers
    // FIXME: this is likely not the right way to do type checking
    if (typeof inpaths === 'string') {
      arglist.push(inpaths);
    } else if(typeof inpaths === 'object') {
      for (var p in inpaths) {
        if (inpaths.hasOwnProperty(p)) {
          arglist.push('-L');
          arglist.push(p + ':' + inpaths[p]);
        }
      }
    }

    var proc = spawn(exec, arglist);

    // TODO: catch stdout data, turn into % completion events
    proc.on('close', function(code) {
      // Move the build files to production dir, re-load the data source
      // FIXME: this should actually be handled in the callback cb
      callback();
    });
    proc.on('error', function(err) {
      callback(err);
    });
  }
}


module.exports = Tippecanoe;
