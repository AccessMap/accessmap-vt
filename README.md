# Overview

This server is adapted from the server written by @hanchao, available at
https://github.com/hanchao/TileServer.git.

The purpose of this server is to provide vector tiles for AccessMapSeattle.com.

Differences between this server at that written by @hanchao:

- It pulls data from AccessMap's database
- That data is processed into mbtiles using
  [tippecanoe](https://github.com/mapbox/tippecanoe)
- This data-pulling process happens on first run of the server and nightly at
  midnight

# Usage

1. Install tippecanoe

a. `accessmap-vt` defaults to using docker to run tippecanoe, expecting an
image tagged as `tippecanoe`. To create this image, run
`docker build -t tippecanoe tippecanoe-docker` in the cloned `accessmap-vt`
directory.

b. Install manually following the instructions at the
[tippecanoe](https://github.com/mapbox/tippecanoe) repository. Edit the
`src/rebuild.js` file and set docker: false when the `Tippecanoe` object is
initialized.

2. Install the dependencies

`npm install`

3. Run the server

`npm run app`

# License

MIT (@hanchao's is available under WTFPL)
