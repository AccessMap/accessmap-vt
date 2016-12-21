var Tilesplash = require('tilesplash');
var app = new Tilesplash(process.env.DATABASE_URL);

// Allow any origin to use these tiles
app.server.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader('Content-Type', 'application/x-protobuf')
  next();
});

// FIXME: tilesplash will return an empty tile with status 200 if there's no
// data in the query (e.g. zooming to a region outside the data's extent).
// This happens because there is basically zero data checking after the SQL
// query has been turned into GeoJSON -> mapnik VectorTile. What should a
// 'real' empty tile look like? Should we switch to another library?
app.layer('seattle', function(tile, render) {
  render({
    sidewalks: 'SELECT ST_AsGeoJSON(geom) AS the_geom_geojson, \
                       grade \
                  FROM sidewalks \
                 WHERE ST_Intersects(geom, !bbox_4326!)',
    crossings: 'SELECT ST_AsGeoJSON(geom) AS the_geom_geojson, \
                       grade, \
                       curbramps \
                  FROM crossings \
                 WHERE ST_Intersects(geom, !bbox_4326!)',
  });
});

app.layer('live', function(tile, render) {
  render({
    construction: 'SELECT ST_AsGeoJSON(geom) AS the_geom_geojson, \
                          address, \
                          to_char(start_date, \'YYYY-MM-DD\') AS start_date, \
                          to_char(end_date, \'YYYY-MM-DD\') AS end_date, \
                          closed \
                     FROM construction \
                    WHERE ST_Intersects(geom, !bbox_4326!)'
  });
});

app.server.listen(process.env.port || 3001);
