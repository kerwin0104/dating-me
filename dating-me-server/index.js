const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mediasoup = require('mediasoup');

const config = require('./config');
const UserController = require('./controllers/UserController');

let worker, router;

async function startWorkerAndRouter() {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
}

startWorkerAndRouter();

let gid = 0;
let users = new Map();

app.get('/', (req, res) => {
  res.send('Express is running.');
});

function getAllUserParams () {
  const allUserParams = [];
  for (let user of users) {
    if (user.producers && user.producers.size() > 0) {
      for (let producer of user.producers) {
        allUserParams.push({ userId: user.id, producerId: producer.id });
      }
    }
  }
  return allUserParams;
}

io.on('connection', (socket) => {
  const name = socket.handshake.query.name;
  console.log(`新用户[${name}]已连接...`);

  const user = new UserController();
  user.setId(gid++);
  user.setName(name);
  user.setRouter(router);

  socket.emit('my-info', { id:user.id, name: user.name });

  const allUserParams = getAllUserParams();
  allUserParams.forEach((userParam) => {
    socket.emit('new-dating', userParam);
  });
  users.set(user.id, user); 
  
  socket.join('dating-room', () => {
    io.to('dating-room').emit('joined', { routerRtpCapabilities: router.rtpCapabilities });
  })

  socket.on('create-transport', async (type, callback) => {
    const { id, iceParameters, iceCandidates, dtlsParameters } = await user.createTransport(type);
    callback({ transportOptions: { id, iceParameters, iceCandidates, dtlsParameters } });
  });

  socket.on('connect-transport', async (params, callback) => {
    callback(await user.connectTransport(params));
  });

  socket.on('send-track', async (params, callback) => {
    const producer = await user.sendTrack(params);
    callback({ id: producer.id });
    io.to('dating-room').emit('new-dating', { userId: user.id, producerId: producer.id });
  });

  socket.on('revc-track', async (params, callback) => {
    const { userId, producerId } = params;
    const targetUser = users.get(userId);
    if (targetUser) {
      const producer = targetUser.producers.get(producerId);
      if (producer) {
        const consumer = await user.revcTrack(params, producer);
        callback({
          producerId: producer.id,
          id: consumer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          type: consumer.type,
          producerPaused: consumer.producerPaused,
        });
      } else {}
    } else {}
  });

  socket.on('resume-producer', async (params, callback) => {
    const { producerId } = params;
    if (user.resumeProducer(producerId)) {
      callback();
    } else {}
  });

  socket.on('resume-consumer', async (params, callback) => {
    const { consumerId } = params;
    if (user.resumeConsumer(consumerId)) {
      callback();
    } else {}
  });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});
