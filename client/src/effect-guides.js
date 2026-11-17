export const guideSources = [
  { id: 'boss-guitar', name: 'BOSS · 吉他效果器顺序指南', url: 'https://articles.boss.info/the-ultimate-guide-to-guitar-effects-pedal-order-and-signal-chain/' },
  { id: 'strymon-chain', name: 'Strymon · 效果器顺序与 FX Loop', url: 'https://www.strymon.net/setting-up-your-effect-signal-chain/' },
  { id: 'boss-bass', name: 'BOSS · 贝斯效果器链指南', url: 'https://articles.boss.info/order-of-operation-a-guide-to-bass-effects-signal-chain/' },
  { id: 'boss-acoustic', name: 'BOSS · 木吉他效果器指南', url: 'https://articles.boss.info/the-complete-guide-to-acoustic-guitar-effects-pedals-and-signal-chain/' },
  { id: 'iridium', name: 'Strymon · Iridium 官方说明', url: 'https://www.strymon.net/product/iridium/' },
  { id: 'boss-ir2', name: 'BOSS · IR-2 官方说明', url: 'https://www.boss.info/global/products/ir-2/' },
  { id: 'nux-mg30', name: 'NUX · MG-30 接线与四线法', url: 'https://nuxaudio.com/product/mg-30/' },
  { id: 'strymon-power', name: 'Strymon · Ojai 供电规格说明', url: 'https://www.strymon.net/product/ojai/' },
]

export const chainPresets = [
  { id: 'clean', name: '清音 / 流行', tag: '从简单开始', description: '保留起音和分解和弦的清晰度，先只开一点压缩和短混响。', chains: [{ label: '接清音音箱', nodes: ['吉他', '调音', '轻压缩', '合唱（可选）', '延迟', '短混响', '清音音箱'] }], tips: ['压缩用到音量更均匀即可，保留拨弦起音。', '延迟先少量重复、低音量；伴奏里听得清每个音再加空间。'], sourceIds: ['boss-guitar', 'strymon-chain'] },
  { id: 'rock', name: '摇滚 / 高增益', tag: '增益与降噪', description: '先获得清楚的节奏失真，再整理停奏噪声，最后补空间。', chains: [{ label: '用踏板获得失真', nodes: ['吉他', '调音', '低增益过载', '失真', '噪声门', 'EQ（可选）', '延迟 / 混响', '清音音箱'] }], tips: ['失真已经很压缩时，不必再把压缩拉满。', '门槛从低处增加，检查弱音和长音是否被切断。使用音箱失真时，参考 FX Loop 教程。'], sourceIds: ['boss-guitar', 'strymon-chain'] },
  { id: 'ambient', name: '氛围 / 后摇', tag: '长尾音的层次', description: '以调制、延迟和混响构建层次，音量踏板用于柔和渐入。', chains: [{ label: '渐入与空间', nodes: ['吉他', '调音', '过载（可选）', '调制', '音量踏板', '延迟', '长混响', '清音音箱'] }], tips: ['音量踏板放延迟和混响前，收回脚踏时通常还能保留已有尾音。', '这是一套编辑起步方案；先缩短尾音，让节奏与低频保持清楚，再尝试混响在失真前的音墙。'], sourceIds: ['strymon-chain', 'boss-guitar'] },
  { id: 'bass', name: '贝斯 / 放克', tag: '保住低频主体', description: '优先控制动态、滤波响应和低频厚度，空间效果可先不加。', chains: [{ label: '贝斯踏板起点', nodes: ['贝斯', '调音', '压缩', '包络滤波', '八度', '过载（混原声）', 'EQ / 前级', '贝斯音箱 / DI'] }], tips: ['若压缩使包络滤波不够跟手，试把滤波放到压缩前，并重调灵敏度。', '增加失真后留意低频是否变薄；带 Blend 的产品可以混回原声。'], sourceIds: ['boss-bass'] },
  { id: 'direct', name: '耳机 / 直出', tag: '先确认音箱模拟', description: '没有真实吉他音箱时，通常需要音箱与箱体处理，再接声卡、PA 或全频监听。', chains: [{ label: '一种常见直出方案', nodes: ['吉他', '调音', '过载 / 失真', 'Amp + Cab / IR', '延迟 / 混响', '声卡 / PA / 全频监听'] }], tips: ['空间效果也可进模拟器的 FX Loop，或放在模拟器前；按具体设备接口与输出电平调整。', '耳机接支持耳机输出的设备；箱体 IR 不等于完整前级，也不等于可接音箱喇叭输出的负载盒。'], sourceIds: ['boss-ir2', 'iridium', 'boss-guitar'] },
  { id: 'acoustic', name: '木吉他 / 弹唱', tag: '自然与防反馈', description: '用前级与 EQ 整理拾音器声音，再增加少量空间；不需要把每种效果都串上。', chains: [{ label: '电箱琴演出起点', nodes: ['电箱琴', '调音', '木吉他前级 / EQ', '轻压缩（可选）', '合唱（可选）', '混响', 'DI / PA'] }], tips: ['优先处理浑浊和反馈，Notch 等功能要按实际舞台测试。', '前级带 DI 时，应按输出路由安排后续效果；某些效果可放在其环路内。'], sourceIds: ['boss-acoustic'] },
]

export const effectGuides = [
  { id: 'first-board', title: '第一块踏板板：为什么这样排？', category: '入门', minutes: 4, summary: '把“先整理、再增益、最后空间”变成能听出来的区别。', sourceIds: ['boss-guitar', 'strymon-chain'], sections: [
    { title: '先认识信号的方向', body: '信号从乐器输出到第一个踏板 INPUT，再从它的 OUTPUT 接下一个踏板。先只接乐器与音箱，确认有声，再逐块加入；不用一次打开所有效果。' },
    { title: '常见起点', body: '调音器与大多数移调效果通常靠前，收到较干净的信号；压缩与滤波用于整理动态和频谱；过载、失真负责增益；调制再处理已经形成的音色；延迟与混响通常靠后，让重复和尾音更清楚。' },
    { title: '次序可以改变音乐结果', body: '同一块相位放失真前后，扫动会有不同的突出程度。EQ 放失真前影响进入失真的频段与手感，放后面更像修整成品音色。先选一组设备比较两种位置，不必追求唯一标准答案。' },
  ] },
  { id: 'fx-loop', title: '音箱 FX Loop 与四线法怎么接', category: '接线', minutes: 5, summary: '用音箱本身的失真时，给延迟和混响安排合适位置。', sourceIds: ['strymon-chain', 'nux-mg30'], chains: [
    { label: '音箱前端', nodes: ['吉他', '调音 / Wah / 过载', '音箱 INPUT'] },
    { label: '音箱串联效果环路', nodes: ['音箱 SEND', '调制（可选）', '延迟', '混响', '音箱 RETURN'] },
    { label: '综合效果器四线法', nodes: ['① 吉他 → 综合 INPUT', '② 综合 SEND → 音箱 INPUT', '③ 音箱 SEND → 综合 RETURN', '④ 综合 OUTPUT → 音箱 RETURN'] },
  ], sections: [
    { title: '环路位于前级与后级之间', body: '如果失真来自音箱前级，把延迟、混响放在它后面的 FX Loop，通常比让重复和尾音再次进入失真更清楚。清音音箱则未必需要环路。音箱必须确实提供 SEND / RETURN。' },
    { title: '四线法还要设置内部路由', body: '综合效果器要支持外部 Send / Return，并在内部效果链加入对应环路模块。Wah、压缩与推子通常安排在外部前级前，延迟和混响在后。使用真实音箱前级与吉他箱体时，检查内部 Amp / Cab 的开关及电平。' },
    { title: '并行环路要另看说明', body: '串联环路让全信号经过效果器；并行环路会另保留原声。并行通常需要调整干湿、Kill Dry 与相位，不能照抄串联设置。音箱的喇叭输出不是 FX SEND，不能接普通踏板输入。' },
  ] },
  { id: 'gain-gate', title: '过载叠失真：增益、音量与噪声门', category: '调音色', minutes: 4, summary: '推子放前和放后，得到的结果并不相同。', sourceIds: ['boss-guitar', 'strymon-chain'], sections: [
    { title: '先配平，再判断', body: '先把每块踏板开启与关闭的听感音量调近，避免单纯因为更响就觉得更好。每次只改变一处，比较拨弦起音、低频收紧程度与和弦分离度。' },
    { title: '前推与后推', body: '推子在失真前，通常会更推动后面的削波，改变压缩、手感和频谱；推子在失真后且后级仍有余量时，更容易获得整体音量提升。实际效果还取决于音箱余量，不能保证一踩就增加独奏音量。' },
    { title: '门放空间效果之前', body: '简单链路可把噪声门放在主要增益后、延迟与混响前，避免关门时截断尾音。带检测和处理环路的噪声门应按本机说明书接线。门槛以停奏降噪又保留最轻演奏为目标。' },
  ] },
  { id: 'delay-reverb', title: '延迟与混响：清楚、有节奏的空间', category: '调音色', minutes: 4, summary: '先分清重复与尾音，再试一套简单的节奏延迟。', sourceIds: ['boss-guitar', 'strymon-chain'], sections: [
    { title: '从少量开始', body: '先只开延迟，用较低混合量和较少重复，听清楚每次回声，再加入短混响。主音可以多一点空间，密集节奏通常需要更克制。让整支乐队一起演奏后再调整。' },
    { title: '节拍换算', body: '四分音符延迟 = 60000 ÷ BPM 毫秒；八分音符为一半；附点八分为 0.75 倍。例如 120 BPM 时分别为 500、250、375 毫秒。页面下方可以输入速度换算；这只是编辑补充的节拍数学。' },
    { title: '尾音也会占位置', body: '通常先延迟后混响，让重复音处在同一个空间里。反过来会得到重复的混响尾音，适合实验。音箱前级失真很重时，先尝试把空间效果移入 FX Loop。' },
  ] },
  { id: 'volume-loop', title: '音量踏板与 Looper：你想录下哪种声音', category: '接线', minutes: 3, summary: '位置决定渐入手感、尾音保留和循环录到的内容。', sourceIds: ['strymon-chain', 'boss-guitar'], sections: [
    { title: '音量踏板在增益前', body: '减小进入失真的电平，常常同时减少破音，像调低吉他音量。若想控制已经形成的失真音量，把音量踏板放增益后、空间前是一种起点。还需匹配踏板阻抗与设备接口。' },
    { title: '把 Looper 当作一台录音机', body: 'Looper 放效果后，循环会记录当时的音色，后续换音色通常不改变已录部分；放效果前，干声循环会继续经过后面的效果，可用同一段演奏比较设置。放延迟前后也会改变循环边界与尾音表现。' },
    { title: '表情踏板与音量踏板不同', body: '表情踏板通常接设备的 EXP 控制口，发送控制信号；普通音量踏板接音频通路。不要因为外形相似就互换接口；TRS 接线与极性要求以接收设备说明为准。' },
  ] },
  { id: 'bass-chain', title: '贝斯效果器链：先把低频留住', category: '贝斯', minutes: 4, summary: '压缩、包络滤波、八度和失真怎样相互影响。', sourceIds: ['boss-bass'], sections: [
    { title: '常见顺序是起点', body: '调音、压缩、滤波、八度、增益、噪声抑制、EQ、调制、空间是一个常见起点。移调和滤波通常喜欢较干净的输入；若滤波对触弦反应减弱，可以比较它在压缩前后的不同。' },
    { title: '混回原声', body: '破音或调制可能让低频主体和起音变弱。带 Blend 的贝斯产品或并行链路能把原声和效果混合；先保住节奏与低频，再逐步增加效果。并不是所有吉他失真都适合直接替代贝斯前级。' },
    { title: '现场比独奏更关键', body: '房间里独奏听起来很厚的音色，在鼓和吉他进入后可能浑浊。用伴奏检查低频、起音和中频位置，避免靠大量提升最底端频率解决所有问题。' },
  ] },
  { id: 'direct-chain', title: '直入声卡 / PA：Amp、Cab、IR 分别做什么', category: '录音 / 直出', minutes: 5, summary: '理解前级与箱体，避免音色刺耳或重复滤波。', sourceIds: ['boss-guitar', 'boss-ir2', 'iridium'], sections: [
    { title: '两个环节，不是一回事', body: 'Amp 模拟通常负责音箱的增益、动态与均衡响应；Cab / IR 负责箱体、扬声器与收音相关的频谱特征。具体设备可能只提供其中一项。只有过载踏板而无箱体处理时，直入全频系统可能很尖锐。' },
    { title: '按最终输出设备选择', body: '直入声卡、PA 或全频监听，一般从包含 Amp + Cab 的设置起步；接真实吉他音箱前端或后级再接吉他箱体，通常需要检查关闭哪些模拟，避免重复处理。耳机要接实际提供耳机驱动的输出。' },
    { title: '空间效果位置可试', body: '可以把空间效果放模拟器后，或放带环路模拟器的 FX Loop；某些设备也允许前置。先使用厂商推荐接法和输出电平，确认没有输入过载，再比较位置。普通 IR 踏板不能承担电子管功放的扬声器负载。' },
  ] },
  { id: 'acoustic-chain', title: '弹唱木吉他：前级、反馈与少量空间', category: '木吉他', minutes: 3, summary: '先让拾音器自然、稳定地进入扩声系统。', sourceIds: ['boss-acoustic'], sections: [
    { title: '先解决基础声音', body: '检查拾音器和输入匹配，再用前级与 EQ 整理生硬、浑浊等问题。舞台有反馈时，结合站位、音量和设备的 Notch 等功能处理，不要只继续增加高频或混响。' },
    { title: '适量压缩和混响', body: '轻压缩可帮助扫弦与指弹音量更均匀，短混响给声音一个自然空间；需要十二弦般层次时可试浅合唱。以人声和吉他一起听到的结果为准。' },
    { title: 'Looper 为编曲服务', body: '循环可帮助单人弹唱叠加声部，但起止节拍需要练熟。放在效果前后决定它记录干声还是成品音色；同时检查前级 DI 的路由是否绕过了后面的踏板。' },
  ] },
  { id: 'troubleshoot', title: '没声、底噪、糊成一团：逐块排查', category: '排错', minutes: 4, summary: '从最短链路开始，找到问题发生在哪一步。', sourceIds: ['boss-guitar', 'strymon-chain', 'strymon-power'], sections: [
    { title: '没声音', body: '先乐器直连音箱确认有声，再逐块接入。核对 INPUT / OUTPUT、调音静音、音量踏板位置、线材和供电；进 FX RETURN 时，也确认设备与音箱的路由和电平设置。' },
    { title: '底噪与供电', body: '比较单块和整板的噪声变化，查看电压、直流或交流、极性、电流和插头要求。独立隔离输出可能减少部分互相干扰，但不是所有噪声的解药。供电参数以每块踏板说明书为准，不统一假定为 9V。' },
    { title: '音色过糊或弱音消失', body: '先减少增益、重复次数与混响时长，关闭不需要的效果。弱音消失时检查噪声门门槛和压缩设置；大失真后高频刺耳时，检查直出是否缺 Cab / IR 或输出过载。每次只改一项。' },
  ] },
]
