const mediasoup = require('mediasoup');
const config = require('../config');
class UserController {
  constructor () {
    this.sendTransports = new Map();
    this.revcTransports = new Map();
    this.producers = new Map();
    this.consumers = new Map();
  }

  setId(id) {
    this.id = id;
  }

  setName(name) {
    this.name = name;
  }

  setRouter(router) {
    this.router = router;
  }

  async _createWebRtcTransport() {
    const {
      maxIncomingBitrate,
      initialAvailableOutgoingBitrate
    } = config.mediasoup.webRtcTransport;

    const transport = await this.router.createWebRtcTransport({
      listenIps: config.mediasoup.webRtcTransport.listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate,
    });

    if (maxIncomingBitrate) {
      try {
        await transport.setMaxIncomingBitrate(maxIncomingBitrate);
      } catch (error) {
      }
    }

    return transport;
  }

  async createTransport(type) {
    const transport = await this._createWebRtcTransport();
    if (type === 'send') {
      this.sendTransports.set(transport.id, transport);
    }
    if (type === 'revc') {
      this.revcTransports.set(transport.id, transport);
    }
    return transport;
  }

  async connectTransport(params) {
    const { transportId, type, dtlsParameters }  = params;
    let transport;
    if (type === 'send') {
      transport = this.sendTransports.get(transportId);
    }
    if (type === 'revc') {
      transport = this.revcTransports.get(transportId);
    }
    if (transport) {
      await transport.connect({ dtlsParameters });
      return true;
    }
    return false;
  }

  async sendTrack(params) {
    let { transportId, kind, rtpParameters } = params;
    const sendTransport = this.sendTransports.get(transportId);

    if (!sendTransport) {
      console.error(`sendTransport not found - userId: ${this.id}, userName: ${this.name} transportId: ${transportId}`);
      return;
    }   

    const producer = await sendTransport.produce({
      kind,
      rtpParameters,
    }); 

    producer.on('transportclose', () => {}); 

    this.producers.set(producer.id, producer)

    return producer;
  }

  async resumeProducer(producerId) {
    const producer = this.producers.get(producerId);
    if (producer) {
      await producer.resume();
      return true;
    }
    return false;
  }

  async revcTrack(params, producer) {
    const { transportId, rtpCapabilities } = params;
    const revcTransport = this.revcTransports.get(transportId);

    if (!revcTransport) {
      console.error(`revcTransport not found - userId: ${this.id}, userName: ${this.name} transportId: ${transportId}`);
      return;
    }   

    if (!this.router.canConsume({ producerId: producer.id, rtpCapabilities })) {
      console.error(`recv-track: client cannot consume - userId: ${this.id}, userName: ${this.name} transportId: ${this.name}`);
      return;
    }

    const consumer = await revcTransport.consume({
      producerId: producer.id,
      rtpCapabilities,
    });

    this.consumers.set(consumer.id, consumer);

    return consumer;
  }

  async resumeConsumer(consumerId) {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      await consumer.resume();
      return true;
    }
    return false;
  }
}

module.exports = UserController;
