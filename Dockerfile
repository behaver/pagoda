FROM node:4

# 此文件作者信息
MAINTAINER Stalker <qianxing@yeah.net>

# 容器对外暴露端口
EXPOSE 6666

# 主机的当前目录与容器中的/usr/src/pagoda通过挂载共享
VOLUME ["/media/stalker/dev/projects/data-collecter", "/usr/src/pagoda"]

# 容器中的工作路径
WORKDIR /usr/src/pagoda