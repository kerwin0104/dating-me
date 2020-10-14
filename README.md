# Dating-me

dating-me-cli是vue+Electron的客户端
dating-me-server是express+socket.io的服务器端

dating-me-server/config.js里的webRtcTransport.listenIps必须有局域网ip或者公网ip才可以从第二台电脑链接

项目只实现基础推拉视频流，音频流同理需要另外进行推拉
