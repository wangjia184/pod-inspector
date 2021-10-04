FROM alpine:3


# https://medium.com/@artur.klauser/building-multi-architecture-docker-images-with-buildx-27d80f7e2408

LABEL maintainer="Jerry.Wang"

RUN	apk --update add bash ca-certificates; \
    adduser -D -H -s /bin/false app_user app_user; \
    apk del bash;  \
    mkdir /app;


# The TARGETPLATFORM ARG variable is set automatically: https://docs.docker.com/engine/reference/builder/#automatic-platform-args-in-the-global-scope
ARG TARGETPLATFORM
COPY bin/${TARGETPLATFORM}/pod-inspector /app/pod-inspector
ADD www /app/www

RUN chmod +x /app/pod-inspector;

WORKDIR /app

EXPOSE 8080/tcp

#USER app_user
ENTRYPOINT ["/app/pod-inspector"]

