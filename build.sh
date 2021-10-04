#!/bin/sh

printf "export const VERSION = 'v%s';\n" $(date '+%Y.%m.%d') > ./ui-app/src/version.js

cd ui-app
yarn build
cd ..
cp -rf ./www/ ./docker/


CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -tags netgo -a -installsuffix cgo -o ./docker/bin/linux/arm64/pod-inspector
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -tags netgo -a -installsuffix cgo -o ./docker/bin/linux/amd64/pod-inspector


#https://medium.com/@artur.klauser/building-multi-architecture-docker-images-with-buildx-27d80f7e2408
# sudo apt-get install qemu binfmt-support qemu-user-static
# docker buildx create --use

cd docker
IMAGE_URI=wangjia184/pod-inspector:$(date '+%Y%m%d') 

docker buildx build -t ${IMAGE_URI} \
  --platform linux/amd64,linux/arm64/v8 --push .

docker buildx build -t wangjia184/pod-inspector:latest \
  --platform linux/amd64,linux/arm64/v8 --push .

docker buildx imagetools inspect ${IMAGE_URI}

echo $IMAGE_URI
