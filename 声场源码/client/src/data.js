import importedQuestions from './imported-bank.json'
export const questions = importedQuestions
export const categories = [
  { id: 'interval', name: '音程', en: 'INTERVALS', icon: '↗', description: '听见两个音之间的距离', color: '#a9cdef' },
  { id: 'chord', name: '和弦', en: 'CHORDS', icon: '♬', description: '理解和声的色彩与结构', color: '#e6b6d0' },
  { id: 'mode', name: '调式', en: 'SCALES & MODES', icon: '≋', description: '找到旋律的方向与归属', color: '#c8bce6' },
  { id: 'rhythm', name: '节奏', en: 'RHYTHM', icon: '𝄽', description: '让每一拍都落在对的位置', color: '#a7cfdf' },
  { id: 'notation', name: '记谱法', en: 'NOTATION', icon: '♮', description: '读懂谱面上的音乐语言', color: '#edc1d4' }
]
export const legacyQuestions = [
  { id: 1, category: 'interval', stem: '从 C 向上到同一八度内的 E，构成什么音程？', options: ['小三度', '大三度', '纯四度', '纯五度'], answer: 1, explanation: 'C–D–E 包含三个音级，C 到 E 相距四个半音，因此是大三度。小三度则相距三个半音，例如 C 到 E♭。', tip: '先数音级判断度数，再数半音判断性质。', notes: ['C', 'E'] },
  { id: 2, category: 'interval', stem: '纯五度包含多少个半音？', options: ['5 个', '6 个', '7 个', '8 个'], answer: 2, explanation: '纯五度包含七个半音。以 C 到 G 为例，音级跨度为五度，半音距离为七。', tip: '纯四度五个半音，纯五度七个半音。', notes: ['C', 'G'] },
  { id: 3, category: 'interval', stem: '从 D 向上到 F，构成什么音程？', options: ['大二度', '小三度', '大三度', '纯四度'], answer: 1, explanation: 'D–E–F 是三个音级，D 到 F 相距三个半音，因此是小三度。', tip: '大三度四个半音，小三度三个半音。', notes: ['D', 'F'] },
  { id: 4, category: 'chord', stem: 'C 大三和弦由哪三个音构成？', options: ['C、E♭、G', 'C、E、G', 'C、F、G', 'C、E、G♯'], answer: 1, explanation: '大三和弦由根音、大三度和纯五度组成。以 C 为根音时，三个音分别为 C、E、G。', tip: '大三和弦从根音叠加 4 + 3 个半音。', notes: ['C', 'E', 'G'] },
  { id: 5, category: 'chord', stem: '小三和弦从根音开始的半音结构是？', options: ['4 + 3', '3 + 4', '3 + 3', '4 + 4'], answer: 1, explanation: '小三和弦下方是小三度（三个半音），上方是大三度（四个半音）。例如 A–C–E。', tip: '大三和弦 4 + 3，小三和弦 3 + 4。', notes: ['A', 'C', 'E'] },
  { id: 6, category: 'mode', stem: '自然大调的全音、半音排列是？', options: ['全 半 全 全 半 全 全', '全 全 半 全 全 全 半', '半 全 全 半 全 全 全', '全 全 全 半 全 全 半'], answer: 1, explanation: '自然大调音阶排列为全、全、半、全、全、全、半。半音位于第 3–4 级和第 7–8 级之间。', tip: '用 C 大调白键验证：E–F 和 B–C 为半音。', notes: ['C', 'D', 'E'] },
  { id: 7, category: 'mode', stem: 'C 大调的关系小调是？', options: ['C 小调', 'D 小调', 'A 小调', 'E 小调'], answer: 2, explanation: '关系大小调使用相同的调号。C 大调与 A 自然小调均无升降号；关系小调主音是大调的第六级。', tip: '从大调主音向下找小三度。', notes: ['C', 'A'] },
  { id: 8, category: 'rhythm', stem: '4/4 拍中，一个附点四分音符占几拍？', options: ['半拍', '一拍', '一拍半', '两拍'], answer: 2, explanation: '附点增加原音符时值的一半。四分音符为一拍，附点增加半拍，因此一共一拍半。', tip: '附点时值 = 原时值 × 1.5。', notes: ['♩', '·'] },
  { id: 9, category: 'rhythm', stem: '以四分音符为一拍时，两个八分音符的总时值是？', options: ['半拍', '一拍', '两拍', '四拍'], answer: 1, explanation: '每个八分音符是半拍，两个八分音符合计一拍。', tip: '音符名称与时值成比例，不等同于固定秒数。', notes: ['♪', '♪'] },
  { id: 10, category: 'notation', stem: '升号（♯）对一个自然音的作用是？', options: ['降低半音', '升高半音', '升高全音', '恢复原音高'], answer: 1, explanation: '升号将该音升高半音，降号降低半音，还原号取消此前相关的升降变化。', tip: 'C♯ 比 C 高一个半音。', notes: ['C', 'C♯'] },
  { id: 11, category: 'notation', stem: '高音谱号标记的第二线是什么音？', options: ['C4', 'E4', 'G4', 'A4'], answer: 2, explanation: '高音谱号也叫 G 谱号，符号中心环绕第二线，表示该线是 G4。', tip: '高音谱表五条线从下向上为 E、G、B、D、F。', notes: ['G'] }
]
export const demoRanks = [
  { name: '阿哲 / 吉他', instrument: '独立摇滚 · 吉他', rate: '96.8', total: 312, initial: '哲', color: '#b7ce89' },
  { name: '小鹿的低音', instrument: 'Funk · 贝斯', rate: '94.2', total: 208, initial: '鹿', color: '#c5afe5' },
  { name: '鼓手不打烊', instrument: 'Fusion · 鼓', rate: '92.6', total: 186, initial: '鼓', color: '#d8b57b' },
  { name: '海边的键盘', instrument: 'City Pop · 键盘', rate: '90.1', total: 152, initial: '海', color: '#8cb8c5' },
  { name: '周末排练中', instrument: 'Blues · 吉他', rate: '87.5', total: 120, initial: '周', color: '#d7a1b3' }
]
