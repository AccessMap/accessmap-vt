// Registers a cron(-ish) job for tippecanoe that executes daily at midnight
var fs = require('fs');
var pgp = require('pg-promise')();
var path = require('path');
var Tippecanoe = require('./tippecanoe');

var tippecanoe = new Tippecanoe({
  maxzoom: 20,
  force: true,
  docker: true
});

function makeMbtiles(cb) {
  console.log('Building tiles...');
  var pedestrian = {
    sidewalks: 'data/overlay/sidewalks.geojson',
    crossings: 'data/overlay/crossings.geojson'
  };
  tippecanoe.run(pedestrian, 'build/mbtiles/pedestrian.mbtiles', function(e) {
    if (e) {
      throw e
    }
    fs.rename('build/mbtiles/pedestrian.mbtiles',
              'data/mbtiles/pedestrian.mbtiles',
              function(err) {
                if (err) {
                  cb(err);
                }
                console.log('Pedestrian tiles built...');
                cb()
              });
  });

  var live = {
    construction: 'data/overlay/construction.geojson'
  }
  tippecanoe.run(live, 'build/mbtiles/live.mbtiles', function() {
    fs.rename('build/mbtiles/live.mbtiles',
              'data/mbtiles/live.mbtiles',
              function(err) {
                if (err) {
                  cb(err);
                }
                console.log('Live tiles built...');
                cb()
              });
  });
}

function updateTiles(cb) {
  console.log('Extracting layers from database...');
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
               FROM construction
              WHERE start_date <= current_timestamp
                AND end_date >= current_timestamp) f)`, []);
  fetchConstruction.then(function(data) {
    console.log('Extracted construction');
  })
  .catch(function(err) {
    console.log('Error with construction SQL query');
    console.error(err);
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

    makeMbtiles(cb);
  })
  .catch(function(err) {
    cb('Error building Mbtiles');
  });
}

module.exports = updateTiles;
