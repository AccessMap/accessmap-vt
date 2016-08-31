accessmap-vt: Vector Tiles for AccessMap
========================================

accessmap-vt is a node web server (basically just
[TileSplash](https://github.com/faradayio/tilesplash)) that serves up its
`sidewalk` and `crossings` tables as vector tiles. This powers the data seen on
the main AccessMap website.

### Running in dev mode

* run `npm install`
* set up the environment variables described in set_envs.sh_example
* run node ./app.js

The vector tiles will be served up at localhost:3001. Refer to TileSplash's
documentation (link above) for usage.


### Running in production
A systemd service script is included that will work out-of-the-box when the
&lt; &gt; fields are replaced by valid entries. It basically just needs to know
the same environment variables as set_envs.sh_example, what user you want to
run the app as (don't use root!), where the main app directory is (so it can
use `node_modules`), and where to find the right node executable.
