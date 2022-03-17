### build

```
npm install
```


### locally run with docker 

1. run zookeeper
```
docker build -t test-zoo:v1 . -f Dockefile.zookeeper

docker run --name test-zoo -d -p 2181:2181 test-zoo:v1

```

2. run redis 
```
docker build -t test-redis:v1 . -f Dockefile.redis

docker run --name test-redis -d -p 6379:6379 test-redis:v1

```

3. make json bin file 

```
cd bin
cp channel_sample.json channel.json
cp session_sample.json session.json 
```

4. check zookeeper's ip and redis's ip and enter ip in bin
```
docker network inspect bridge

vim ./bin/channel.json //and rewrite it
vim ./bin/session.json //and rewrite it

```

3. run channel-server
```
docker build -t test-channel:v1 . -f Dockerfile.channel

docker run --rm -p 9000:9000  -it --entrypoint bash  test-channel:v1
cd /chic-rtc-channel-server/bin && npm run build && node --inspect=0.0.0.0:9229 start.js --channel --config channel.json

```

4. run session-server
```
docker build -t test-session:v1 . -f Dockerfile.session

docker run -p 8080:8080 -it --entrypoint bash test-session:v1
cd /chic-rtc-session-server/bin && npm run build && node start.js --inspect=0.0.0.0:9229 --session --config session.json


```

