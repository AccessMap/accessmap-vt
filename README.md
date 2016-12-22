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

1. Install the dependencies

`npm install`

2. Run the server

`npm run app`

# License

MIT (@hanchao's is available under WTFPL)
