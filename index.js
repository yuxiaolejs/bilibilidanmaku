const WebSocket = require('ws');
const zlib = require('zlib');
const axios = require('axios');
const { EventEmitter } = require('events');

const textEncoder = new TextEncoder('utf-8');
const textDecoder = new TextDecoder('utf-8');

const readInt = function (buffer, start, len) {
  let result = 0
  for (let i = len - 1; i >= 0; i--) {
    result += Math.pow(256, len - i - 1) * buffer[start + i]
  }
  return result
}

const writeInt = function (buffer, start, len, value) {
  let i = 0
  while (i < len) {
    buffer[start + i] = value / Math.pow(256, len - i - 1)
    i++
  }
}

const encode = function (str, op) {
  let data = textEncoder.encode(str);
  let packetLen = 16 + data.byteLength;
  let header = [0, 0, 0, 0, 0, 16, 0, 1, 0, 0, 0, op, 0, 0, 0, 1]
  writeInt(header, 0, 4, packetLen)
  return new Buffer.from((new Uint8Array(header.concat(...data))).buffer)
}
const decode = function (blob) {
  return new Promise(function (resolve, reject) {
    let buffer = new Uint8Array(blob)
    let result = {}
    result.packetLen = readInt(buffer, 0, 4)
    result.headerLen = readInt(buffer, 4, 2)
    result.ver = readInt(buffer, 6, 2)
    result.op = readInt(buffer, 8, 4)
    result.seq = readInt(buffer, 12, 4)
    if (result.ver == 2) {
      zlib.inflate(blob.slice(result.headerLen, blob.byteLength), function (err, body) {
        if (err) {
          reject(err)
        } else {
          decode(body).then(function (res) {
            resolve(res)
          })
        }
      })
      return;
    }
    let body = blob//.slice(result.headerLen, blob.byteLength)
    if (result.op === 5) {
      result.body = []
      let offset = 0
      while (offset < body.length) {
        let packetLen = readInt(body, offset + 0, 4)
        let headerLen = 16 //readInt(body,offset+4,2)
        let data = body.slice(offset + headerLen, offset + packetLen)
        let json = {}
        try {
          json = JSON.parse(textDecoder.decode(data))
        } catch (e) {
          console.log(e)
        }
        result.body.push(json)
        offset += packetLen
      }
    } else if (result.op === 3) {
      result.body = {
        count: readInt(body, 0, 4)
      }
    }
    resolve(result)
  })
}

let mainHeader = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
  "Cookie": "",
  Accept: `*/*`,
}

let service = axios.create({
  baseURL: 'https://api.live.bilibili.com',
  headers: mainHeader,
  timeout: 3000
});

class Danmaku {
  constructor(bilibiliCookie) {
    this.cookie = bilibiliCookie;
    // Create Event Emitter
    this.emitter = new EventEmitter();
    // Bind emitter to class
    this.on = this.emitter.on.bind(this.emitter);
    this.emit = this.emitter.emit.bind(this.emitter);
  }

  #cookieStrToObj() {
    let cookieStr = this.cookie;
    let cookieObj = {};
    cookieStr.split(';').forEach(function (item) {
      let arr = item.split('=');
      cookieObj[arr[0].trim()] = arr[1];
    });
    return cookieObj;
  }

  connect(roomId) {
    this.roomId = roomId;
    let header = Object.assign({}, mainHeader);
    header.Cookie = this.cookie;
    const that = this;
    service({
      method: 'get',
      url: `/xlive/web-room/v1/index/getDanmuInfo?id=${roomId}&type=0`,
      headers: header
    }).then(function (res) {
      // service({
      //   method: 'post',
      //   url: 'https://api.live.bilibili.com/xlive/web-room/v1/index/roomEntryAction',
      //   data: {
      //     room_id: roomId,
      //     platform: "pc",
      //     csrf_token: "",
      //     csrf: "",
      //     visit_id: ""
      //   }
      // }).then(function (res1) {
      //   console.log(res1.data);
      // })
      that.#startWs(res.data.data.token);
      //   console.log
    }).catch(function (err) {
      this.emit('error', err);
    })
  }

  #startWs(Token) {
    const wsUrl = 'wss://hw-sg-live-comet-03.chat.bilibili.com/sub';

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'nodebuffer';

    let cookieObj = this.#cookieStrToObj();
    if (!cookieObj.DedeUserID || isNaN(parseInt(cookieObj.DedeUserID))) {
      this.emit('error', 'Cookie Error: DedeUserID is not a number');
      return;
    }
    const that = this;
    ws.on('open', function open() {
      that.emit('open');
      ws.send(encode(JSON.stringify({
        uid: parseInt(cookieObj.DedeUserID),
        roomid: that.roomId,
        platform: "web",
        type: 2,
        key: Token,
      }), 7));
    });

    setInterval(function () {
      ws.send(encode('', 2));
    }, 30000);


    // Listen for messages from the server
    ws.on('message', function incoming(data) {
      decode(data).then(function (res) {
        if (res.body && res.body.length > 0) {
          for (let i = 0; i < res.body.length; i++) {
            that.emit('data', res.body[i]);
          }
        }
      });
    });

    // Handle any errors that occur
    ws.on('error', function error(error) {
      this.emit('error', error);
    });

    ws.on('close', function close() {
      this.emit('close');
    });
  }
}

module.exports = Danmaku;