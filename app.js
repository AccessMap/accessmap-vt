var Tilesplash = require('tilesplash');
var app = new Tilesplash(process.env.DATABASE_URL);

// Allow any origin to use these tiles
app.server.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

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

app.server.listen(process.env.port || 3001);
