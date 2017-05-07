#!/usr/bin/env node

"use strict";

var fs = require('fs');

require('sqlite3').verbose();
var express = require('express');
var path = require("path");
var tilelive = require('@mapbox/tilelive');

require('@mapbox/mbtiles').registerProtocols(tilelive);
// require('tilelive-file').registerProtocols(tilelive);
// require('tilelive-mapnik').registerProtocols(tilelive);
require('@mapbox/tilelive-overlay').registerProtocols(tilelive);
require('@mapbox/tilejson').registerProtocols(tilelive);
require('@mapbox/tilelive-bridge').registerProtocols(tilelive);

var env = process.env.NODE_ENV || 'development';


var updateTiles = require('./rebuild');
require('./cron');

var app = express();

// CORS
if (env === 'development') {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers",
               "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
}

var configfile = 'config.json';
var sourcesfile = 'sources.json';

var config = JSON.parse(fs.readFileSync(configfile, 'utf-8'))
var tilesSQL = JSON.parse(fs.readFileSync(sourcesfile, 'utf-8'))

// Process multi-line SQL from sources SQL
for (let tileName of Object.keys(tilesSQL)) {
  let layers = tilesSQL[tileName];
  for (let layerName of Object.keys(layers)) {
    let sqlArray = layers[layerName];
    layers[layerName] = sqlArray.join('\n');
  }
}

var port = process.argv[3] || 3000;

var sources = {};

updateTiles(tilesSQL, function(err) {
  if (err) {
    throw 'Failed to build mbtiles';
  }
  var layers = ['live', 'pedestrian'];
  for (var i = 0; i < layers.length; i++) {
    tilelive.load(config[layers[i]], function(err, source) {
      sources[layers[i]] = source;
    });
  }
});

function loadSource(name, callback) {
	tilelive.load(config[name], function(err, source) {
		if (err) {
			console.error(err.message);
		}
		callback(err, source);
	});
}

function getInfo(source, res){
	source.getInfo(function(err, info) {
		if (err) {
			res.status(500)
			res.send(err.message);
		}
		else {
			res.send(info);
		}
	});
}

function getTile(source, z, x, y, res){
	source.getTile(z, x, y, function(err, tile, headers) {
		if (err) {
			res.status(204)
			res.send(err.message);
			console.log(err.message);
		}
		else {
			res.set(headers);
			res.send(tile);
		}
	});
}

function startServer(port){

	app.use(express.static(path.join(__dirname, 'public')));


	app.get('/', function(req, res){

		var index_html = '';
		for (var layer in config){
			index_html += '<a href="/' + layer + '.json">/' + layer + '.json</a><br />';
			index_html += '<a href="/preview.html?name=' + layer + '">/preview.html?name=' + layer + '</a><br />';
		}
		res.send(index_html);

		//res.send('<a href="/index.json">/index.json</a><br /><a href="/preview.html">/preview.html</a>');
	});

	app.get('/:name([^&\/]+).json', function(req, res){
		var name = req.params.name;
		if (sources[name] === undefined){
			loadSource(name, function(err, source){
				if (err) {
					res.status(404)
					res.send(err.message);
					return;
				}
				sources[name] = source;
				getInfo(sources[name],res);
			});
		} else {
			getInfo(sources[name],res);
		}
	});

	app.get('/:name([^&\/]+)/:z(\\d+)/:x(\\d+)/:y(\\d+).:format([\\w\\.]+)?', function(req, res){
		var name = req.params.name,
			z = req.params.z | 0,
			x = req.params.x | 0,
			y = req.params.y | 0,
			format = req.params.format;

		console.log('get tile, z = %d, x = %d, y = %d', z, x, y);

		if (sources[name] === undefined) {
			loadSource(name, function(err, source) {
				if (err) {
					res.status(404)
					res.send(err.message);
					return;
				}
				sources[name] = source;
				getTile(sources[name],z,x,y,res);
			});
		} else {
			getTile(sources[name],z,x,y,res);
		}
	});

	var server = app.listen(port, function() {
		console.log('Listening on port %d', server.address().port);
	});
}


startServer(port);
