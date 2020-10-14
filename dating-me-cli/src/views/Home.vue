<template>
  <div class="home">
    <div class="me">
      <video ref="myVideo" v-if="showMe" playsinline="true"></video>
      <div v-else>
        摄像头未开启
      </div>
    </div>
    <div class="other">
      <video ref="otherVideo" v-if="showOther" playsinline="true"></video>
      <div v-else>
        无对方摄像头数据
      </div>
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client';
import * as mediasoup from 'mediasoup-client';

const device = new mediasoup.Device();

const CAM_VIDEO_SIMULCAST_ENCODINGS = [
  { maxBitrate: 680000, scaleResolutionDownBy: 1 },
];

let socket;
let routerRtpCapabilities;

export default {
  name: 'Home',
  data() {
    const data = {};
    data.showMe = false;
    data.showOther = false;
    data.myInfo = {};
    return data;
  },
  components: {
  },
  methods: {
    async createTransport(type, transportOptions) {
      let transport;
      if (type === 'send') {
        transport = await device.createSendTransport(transportOptions);
      }
      if (type === 'revc') {
        transport = await device.createRecvTransport(transportOptions);
      }
      transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        socket.emit('connect-transport', { transportId: transportOptions.id, type, dtlsParameters }, (isSuccess) => {
          if (isSuccess) {
            callback();
          } else {
            errback();
          }
        });
      });
      transport.on('connectionstatechange', (connectionState) => {
        console.log(`connectionstatechange: ${connectionState}`);
      });
      if (type === 'send') {
        transport.on('produce', async ({ kind, rtpParameters }) => {
          socket.emit('send-track', {
            transportId: transportOptions.id,
            kind,
            rtpParameters,
          }, async () => {});
        });
      }
      return transport;
    },
    async sendVideo() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 600,
          height: 800,
        },
        audio: true,
      });
      this.playVideo('myVideo', stream);
      socket.emit('create-transport', 'send', async (params) => {
        const { transportOptions } = params;
        if (!device.loaded) {
          await device.load({ routerRtpCapabilities });
        }
        if (!device.canProduce('video')) {
          console.warn('cannot produce video');
        }
        if (!device.canProduce('audio')) {
          console.warn('cannot produce audio');
        }
        const sendTransport = await this.createTransport('send', transportOptions);
        const producer = await sendTransport.produce({
          track: stream.getVideoTracks()[0],
          encodings: CAM_VIDEO_SIMULCAST_ENCODINGS,
        });
        socket.emit('resume-producer', {
          producerId: producer.id,
        }, async () => {
          await producer.resume();
        });
      });
    },
    async revcVideo(targetParams) {
      socket.emit('create-transport', 'revc', async (params) => {
        const { transportOptions } = params;
        socket.emit('revc-track', {
          transportId: transportOptions.id,
          rtpCapabilities: device.rtpCapabilities,
          ...targetParams,
        }, async (consumerParameters) => {
          console.log('consumerParameters');
          console.log(consumerParameters);
          const recvTransport = await this.createTransport('revc', transportOptions);
          const consumer = await recvTransport.consume({
            ...consumerParameters,
          });
          socket.emit('resume-consumer', {
            consumerId: consumer.id,
          }, async () => {
            await consumer.resume();
            if (!(consumer && consumer.track)) {
              return;
            }

            this.playVideo('otherVideo', new MediaStream([consumer.track.clone()]));
          });
        });
      });
    },
    playVideo(type, stream) {
      if (type === 'myVideo') {
        this.showMe = true;
      } else {
        this.showOther = true;
      }
      this.$nextTick(() => {
        const video = this.$refs[type];
        console.log(type);
        console.log(stream);
        video.srcObject = stream;
        video.play();
      });
    },
  },
  async mounted() {
    socket = io('http://localhost:3000?name=test', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('connect');
    });
    socket.on('my-info', (data) => {
      this.myInfo = data;
    });

    socket.on('joined', async (joinData) => {
      routerRtpCapabilities = joinData.routerRtpCapabilities;
      this.sendVideo();
    });

    socket.on('new-dating', async (targetParams) => {
      // if (targetParams.userId !== this.myInfo.id) {
      this.revcVideo(targetParams);
      // }
    });
  },
};
</script>

<style lang="less">
  html, body {
    margin: 0;
    padding: 0;
  }
  .me,.other {
    video {
      width: 100%;
      height: 100%;
      object-fit: fill;
    }
  }
  .me {
    position: absolute;
    width: 120px;
    height: 160px;
    left: 20px;
    top: 20px;
    box-shadow: 0 0 10px #000;
    border-radius: 4px;
    overflow: hidden;
  }
  .other {
    width: 100%;
    height: 100%;
  }
</style>
