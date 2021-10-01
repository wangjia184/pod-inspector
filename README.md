# Kubernetes Pod Inspector

Unlike other dashboardes for Kubernetes(Lens / Rancher / etc), Kubernetes Pod Inspector allows to check the file system and processes within running Linux pods without using kubectl. 
This is useful when we want to check the files within volumes mounted by pods


## How to Deploy


The docker image is available at [docker.io/wangjia184/pod-inspector](https://hub.docker.com/repository/docker/wangjia184/pod-inspector). 
Typically, it can be deployed into K8S cluster with following yaml.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pod-inspector-deployment
  labels:
    app: pod-inspector
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pod-inspector
  template:
    metadata:
      labels:
        app: pod-inspector
    spec:
      containers:
      - name: pod-inspector
        image: docker.io/wangjia184/pod-inspector:20211001
        args: ["-port", "8080", "-user", "", "-password", ""]
        ports:
        - containerPort: 8080 
        env:
          - name: K8S_NODE_NAME
            valueFrom:
              fieldRef:
                fieldPath: spec.nodeName
          - name: NODE_IP
            valueFrom:
              fieldRef:
                fieldPath: status.hostIP
          - name: POD_NAME
            valueFrom:
              fieldRef:
                fieldPath: metadata.labels['statefulset.kubernetes.io/pod-name']
          - name: POD_NAMESPACE
            valueFrom:
              fieldRef:
                fieldPath: metadata.namespace
          - name: POD_IP
            valueFrom:
              fieldRef:
                fieldPath: status.podIP
          - name: POD_SERVICE_ACCOUNT
            valueFrom:
              fieldRef:
                fieldPath: spec.serviceAccountName
        imagePullPolicy: Always
```

It listens on port 8080 for HTTP service. You can specify `user` and `password` in arguments to enable http authentication.

Next, expose port 8080 so that you can access it. Here is just an example:

```
apiVersion: v1
kind: Service
metadata:
  name: pod-inspector
spec:
  selector:
    app: pod-inspector
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
---
  apiVersion: networking.k8s.io/v1
  kind: Ingress
  metadata:
    name: pod-inspector
  spec:
    rules:
    - host: your.kubernetes.cluster.domain-name.local
      http:
        paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: pod-inspector
              port:
                number: 80

```
