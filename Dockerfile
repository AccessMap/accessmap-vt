FROM ubuntu:16.04

### Install curl - gonna use it a bunch
RUN apt-get update && \
      apt-get install -y \
        curl

### Install tippecanoe
RUN apt-get update \
  && apt-get -y upgrade \
  && apt-get -y install build-essential libsqlite3-dev zlib1g-dev

RUN mkdir -p /tmp/tippecanoe-src
WORKDIR /tmp/tippecanoe-src
RUN curl -O -L https://github.com/mapbox/tippecanoe/archive/1.27.1.tar.gz
RUN tar xf ./*.tar.gz
WORKDIR /tmp/tippecanoe-src/tippecanoe-1.27.1

RUN make \
  && make install

RUN rm -r /tmp/tippecanoe-src

### Install newer node version
RUN echo "deb http://deb.nodesource.com/node_6.x xenial main" > /etc/apt/sources.list.d/nodesource.list
RUN echo "deb-src http://deb.nodesource.com/node_6.x xenial main" >> /etc/apt/sources.list.d/nodesource.list
RUN curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -

### Install accessmap-vt
RUN apt-get update && \
      apt-get install -y \
        nodejs \
        libsqlite3-dev

RUN npm install -g yarn

WORKDIR /www/

COPY . /www/

RUN if [ -d node_modules ]; then rm -r node_modules; fi

RUN yarn
