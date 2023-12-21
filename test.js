const Danmaku = require('./index');

let danmaku = new Danmaku(`buvid3=; b_nut=; i-wanna-go-back=-1; b_ut=7; _uuid=; enable_web_push=DISABLE; ...`);
danmaku.connect(68905);
danmaku.on('data', (data) => {
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