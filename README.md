# 哔哩哔哩弹幕姬 For Node.js
又一个给nodejs开发的哔哩哔哩弹幕姬。之前用的那几个都不维护了，也用不了了，希望这个能维护下去吧~

# 特别鸣谢！
感谢 @lovelyyoshino 大佬提供的websocket协议！

引用文献：[https://github.com/lovelyyoshino/Bilibili-Live-API/blob/master/API.WebSocket.md](https://github.com/lovelyyoshino/Bilibili-Live-API/blob/master/API.WebSocket.md)

## 安装
```
npm i bilibilidanmaku
```

## 使用：
```
const Danmaku = require('bilibilidanmaku');
                            // 这里填入你哔哩哔哩的cookie (目前没找到优雅的获取方案...)
let danmaku = new Danmaku(`buvid3=; b_nut=; i-wanna-go-back=-1; b_ut=7; _uuid=; enable_web_push=DISABLE; ...`);
danmaku.connect(68905);
danmaku.on('data', (data) => {
    // 收到弹幕，礼物，通知等等会触发这个事件
    console.log(data)
})
danmaku.on('error', (err) => {
    console.log(err)
})
danmaku.on('close', () => {
    console.log('close')
})
danmaku.on('open', () => {
    console.log('open')
})
```