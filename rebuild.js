// Registers a cron(-ish) job for tippecanoe that executes daily at midnight
var fs = require('fs');
var pgp = require('pg-promise')();
var QueryStream = require('pg-query-stream');
var JSONStream = require('JSONStream');
var path = require('path');
var Tippecanoe = require('./tippecanoe');


var tippecanoe = new Tippecanoe({
  maxzoom: 22,
  force: true,
  docker: true
});

function makeMbtiles(name, paths, cb) {
  console.log('Building tiles...');
  mbtilesName = name + '.mbtiles';
  tippecanoe.run(paths, path.join('build/mbtiles', mbtilesName), e => {
    if (e) {
      throw e
    }
    fs.rename(path.join('build/mbtiles', mbtilesName),
              path.join('data/mbtiles', mbtilesName),
              function(err) {
                if (err) {
                  cb(err);
                }
                console.log(name + ' tiles built...');
                cb()
              });
  });
}

function updateTiles(cb) {
  console.log('Extracting layers from database...');
  // connect to database, write geojson file
  var db = pgp(process.env.DATABASE_URL);
  db.connect();

  // TODO: implement query helper(s)?

  var QueryStream = require('pg-query-stream');
  var JSONStream = require('JSONStream');

  var tiles = {
    pedestrian: {
      sidewalks: `
      (SELECT array_to_json(array_agg(f))
         FROM (SELECT 'Feature' as type,
                      ST_AsGeoJSON(geom)::json as geometry,
                      json_build_object('grade', grade) AS properties
                 FROM sidewalks) f)`,
      crossings: `
      (SELECT array_to_json(array_agg(f))
         FROM (SELECT 'Feature' as type,
                      ST_AsGeoJSON(geom)::json as geometry,
                      json_build_object('grade', grade,
                                        'curbramps', curbramps) AS properties
                 FROM crossings) f)`
    },
    live: {
      construction: `
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
                  AND end_date >= current_timestamp) f)`
    }
  };

  for (let tileName of Object.keys(tiles)) {
    let layers = tiles[tileName];
    let promises = [];

    for (let layerName of Object.keys(layers)) {
      let sql = layers[layerName];
      let qs = new QueryStream(sql);
      let stream = db.stream(qs, s => {
        let filePath = path.join(process.cwd(),
                                 './data/overlay',
                                  layerName + '.geojson');
        let handle = fs.createWriteStream(filePath);
        s.pipe(JSONStream.stringify()).pipe(handle);
      });
      promises.push(stream);
    }

    Promise.all(promises)
      .then(d => {
        let paths = {};
        Object.keys(layers).forEach(l => {
          paths[l] = path.join('./data/overlay', l + '.geojson');
        });
        makeMbtiles(tileName, paths, cb);
      });
  }
}

module.exports = updateTiles;
