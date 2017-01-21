// Registers a cron(-ish) job for tippecanoe that executes daily at midnight
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');
var pgp = require('pg-promise')();
var path = require('path');

function runTippecanoe() {
  // Build the tippecanoe Dockerfile
  var dockerBuild = spawn('docker', [
    'build',
    '-t',
    'tippecanoe',
    'tippecanoe-docker/'
  ]);

  dockerBuild.on('error', function(err) {
    throw err;
  });

  dockerBuild.stdout.on('data', function(d) {
    console.log('docker stdout: ' + d);
  });

  dockerBuild.stderr.on('data', function(d) {
    console.log('docker stderr: ' + d);
  });

  dockerBuild.on('close', function(code) {
    console.log('Dockerfile built');
    console.log('    Exited with code ' + code);
  });

  // Run the tippecanoe Dockerfile
  // convert to mbtiles file using tippecanoe
  // var cmd = 'tippecanoe -f -o pedestrian -L sidewalks:sidewalks.mbtiles -L crossings:crossings.mbtiles';
  var pedestrian = spawn('docker', [
    'run', '-v', process.cwd() + ':/home/tippecanoe', 'tippecanoe',
    '-z', '20',
    '-f', '-o', 'data/mbtiles/pedestrian.mbtiles',
    '-L', 'sidewalks:data/overlay/sidewalks.geojson',
    '-L', 'crossings:data/overlay/crossings.geojson'
  ]);

  pedestrian.stdout.on('data', function(d) {
    console.log('tippecanoe stdout: ' + d);
  });

  pedestrian.stderr.on('data', function(d) {
    console.log('tippecanoe stderr: ' + d);
  });

  pedestrian.on('close', function(code) {
    console.log('Mbtiles created');
    console.log('    Exited with code ' + code);
  });

  pedestrian.on('error', function(err) {
    throw err;
  });

  // `live` layer
  var live = spawn('docker', [
    'run', '-v', process.cwd() + ':/home/tippecanoe', 'tippecanoe',
    '-z', '20',
    '-r', '0',
    '-f', '-o', 'data/mbtiles/live.mbtiles',
    '-L', 'construction:data/overlay/construction.geojson'
  ]);

  live.stdout.on('data', function(d) {
    console.log('tippecanoe stdout: ' + d);
  });

  live.stderr.on('data', function(d) {
    console.log('tippecanoe stderr: ' + d);
  });

  live.on('close', function(code) {
    console.log('Mbtiles created');
    console.log('    Exited with code ' + code);
  });

  live.on('error', function(err) {
    throw err;
  });
}

function updateTiles(cb) {
  // connect to database, write geojson file
  var client = pgp(process.env.DATABASE_URL);
  client.connect();

  // TODO: implement query helper(s)?

  // Get sidewalks layer
  var fetchSidewalks = client.query(`
    (SELECT array_to_json(array_agg(f))
       FROM (SELECT 'Feature' as type,
                    ST_AsGeoJSON(geom)::json as geometry,
                    json_build_object('grade', grade) AS properties
               FROM sidewalks) f)`, []);


  fetchSidewalks.then(function(data) {
    console.log('Extracted sidewalks');
  });
  fetchSidewalks.catch(function(err) {
    console.log('Error with sidewalks SQL query');
  });

  // Get crossings layer
  var fetchCrossings = client.query(`
    (SELECT array_to_json(array_agg(f))
       FROM (SELECT 'Feature' as type,
                    ST_AsGeoJSON(geom)::json as geometry,
                    json_build_object('grade', grade,
                                      'curbramps', curbramps) AS properties
               FROM crossings) f)`, []);
  fetchCrossings.then(function(data) {
    console.log('Extracted crossings');
  });
  fetchCrossings.catch(function(err) {
    console.log('Error with crossings SQL query');
  });

  // Get construction layer
  var fetchConstruction = client.query(`
    (SELECT array_to_json(array_agg(f))
       FROM (SELECT 'Feature' as type,
                    ST_AsGeoJSON(geom)::json as geometry,
                    json_build_object('address', address,
                                      'permit_number', permit_number,
                                      'start_date', to_char(start_date, 'YYYY-MM-DD'),
                                      'end_date', to_char(end_date, 'YYYY-MM-DD'),
                                      'closed', closed) AS properties
               FROM construction) f)`, []);
  fetchConstruction.then(function(data) {
    console.log('Extracted construction');
  })
  .catch(function(err) {
    console.log('Error with crossings SQL query');
  });

  Promise.all([
    fetchSidewalks,
    fetchCrossings,
    fetchConstruction
  ])
  .then((d) => {
    console.log('Writing sidewalks to file');
    var sidewalks = {
      type: 'FeatureCollection',
      features: d[0][0]['array_to_json']
    }
    fs.writeFileSync(path.join(process.cwd(),
                               './data/overlay/sidewalks.geojson'),
                     JSON.stringify(sidewalks));

    console.log('Writing crossings to file');
    var crossings = {
      type: 'FeatureCollection',
      features: d[1][0]['array_to_json']
    }
    fs.writeFileSync(path.join(process.cwd(),
                               './data/overlay/crossings.geojson'),
                     JSON.stringify(crossings));

    console.log('Writing crossings to file');
    var construction = {
      type: 'FeatureCollection',
      features: d[2][0]['array_to_json']
    }
    fs.writeFileSync(path.join(process.cwd(),
                               './data/overlay/construction.geojson'),
                     JSON.stringify(construction));

    runTippecanoe();
    cb();
  })
  .catch(function(err) {
    cb('Error building Mbtiles');
  });
}

module.exports = updateTiles;
