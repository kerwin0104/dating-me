module.exports = {
  listenIp: '0.0.0.0',
  listenPort: 3000,
  sslCrt: '',
  sslKey: '',
  mediasoup: {
    // Worker settings
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
    },
    // Router settings
    router: {
      mediaCodecs:
        [   
          {   
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2
          },  
          {   
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
            parameters:
              {   
//                'x-google-start-bitrate': 1000
              }   
          },  
          {   
            kind       : 'video',
            mimeType   : 'video/h264',
            clockRate  : 90000,
            parameters :
            {   
              'packetization-mode'      : 1,
              'profile-level-id'        : '42e01f',
              'level-asymmetry-allowed' : 1,
//              'x-google-start-bitrate'  : 1000
            }   
          }   
        ]   
    },
    // WebRtcTransport settings
    webRtcTransport: {
      listenIps: [
        {
          ip: '127.0.0.1',
          announcedIp: null,
        },
        // { ip: '10.26.234.136', announcedIp: null },
        { ip: '10.0.0.8', announcedIp: null },
      ],
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    }
  }
};

