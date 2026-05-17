let isMuted = false;
        
let gameState = {
    mode: 'intro', // 'intro' (Fullscreen Tutorial) or 'game' (Levels)
    tutorialPage: 1, // 1 to 3
    currentLevelIndex: 0,
    isCurrentLevelSolved: false,
    wrongSelections: [],
    unlockedLevelIndex: 0,
    tourState: {
        active: false,
        step: 0
    }
};

// 共用 AudioContext 避免資源重複分配與瀏覽器阻擋政策
const _audioCtx = (() => {
    try { return new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; }
})();

// Synthesizing sound effects with Web Audio API (Fully offline and crash-proof)
// 🐾 已替換為您所提供的物理合成「高級擬真 Me-ow」音效曲線，且音量調低了 40% (0.3 -> 0.18)
function playMeow(pitchMultiplier = 1) {
    if (isMuted || !_audioCtx) return;
    try {
        // 自動重啟受瀏覽器自動播放政策限制而掛起的 AudioContext
        if (_audioCtx.state === 'suspended') {
            _audioCtx.resume();
        }
        const osc = _audioCtx.createOscillator();
        const gainNode = _audioCtx.createGain();
        const filterNode = _audioCtx.createBiquadFilter();

        osc.type = 'sawtooth';
        
        osc.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(_audioCtx.destination);

        const now = _audioCtx.currentTime;
        const duration = 0.85;

        // 🐾 音調曲線設定 (Me-ow) - 乘上 pitchMultiplier 以保留不同貓咪的聲音寬度
        osc.frequency.setValueAtTime(900 * pitchMultiplier, now);
        osc.frequency.exponentialRampToValueAtTime(1220 * pitchMultiplier, now + (duration * 0.22));
        osc.frequency.exponentialRampToValueAtTime(355 * pitchMultiplier, now + duration);

        // 🐾 濾波器設定 (讓聲音更溫和、更像軟萌的真貓)
        filterNode.type = 'lowpass';
        filterNode.Q.setValueAtTime(5.5, now);
        filterNode.frequency.setValueAtTime(1750, now);
        filterNode.frequency.exponentialRampToValueAtTime(788, now + duration);

        // 🐾 音量包絡設計 (音量調低40%：原 0.3 的 60% 為 0.18)
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.18, now + (duration * 0.08));
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    } catch (e) {
        console.log("Web Audio blocked/not supported.", e);
    }
}

// Play dual meow on game enter success
// 重複
function playSuccessMelody() {
    playMeow(1.0);
    setTimeout(() => {
        playMeow(1.25);
    }, 140);
}

function playPurr() {
    if (isMuted || !_audioCtx) return;
    try {
        if (_audioCtx.state === 'suspended') {
            _audioCtx.resume();
        }
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.type = 'sine';
        
        const t = _audioCtx.currentTime;
        osc.frequency.setValueAtTime(75, t);
        osc.frequency.linearRampToValueAtTime(85, t + 0.1);
        osc.frequency.linearRampToValueAtTime(75, t + 0.2);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    } catch(e){}
}

function playFailBuzzer() {
    if (isMuted || !_audioCtx) return;
    try {
        if (_audioCtx.state === 'suspended') {
            _audioCtx.resume();
        }
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.type = 'sawtooth';
        
        const t = _audioCtx.currentTime;
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.25);
        
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.26);
    } catch(e){}
}

function toggleMute() {
    isMuted = !isMuted;
    document.getElementById('soundIcon').innerText = isMuted ? '🔇' : '🔊';
    document.getElementById('soundText').innerText = isMuted ? '音效：關閉' : '音效：開啟';
    if(!isMuted) playMeow(1.2);
}

// Dynamic Modals Management
function showResetModal() {
    const modal = document.getElementById('resetModal');
    const content = document.getElementById('resetModalContent');
    playMeow(0.8);
    modal.classList.remove('hidden');
    modal.getBoundingClientRect();
    modal.classList.remove('opacity-0', 'pointer-events-none');
    content.classList.remove('scale-95');
    content.classList.add('scale-100');
}

// 修復4：Modal 競態問題（直接移除條件判斷，無條件在動畫後隱藏）
function hideResetModal() {
    const modal = document.getElementById('resetModal');
    const content = document.getElementById('resetModalContent');
    modal.classList.add('opacity-0', 'pointer-events-none');
    content.classList.add('scale-95');
    content.classList.remove('scale-100');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function confirmReset() {
    hideResetModal();
    gameState.currentLevelIndex = 0;
    gameState.unlockedLevelIndex = 0;
    gameState.isCurrentLevelSolved = false;
    gameState.wrongSelections = [];
    localStorage.removeItem('cat_flex_unlocked');
    localStorage.removeItem('cat_flex_tour_done');
    
    backToIntroTutorial();
}

function backToIntroTutorial() {
    gameState.mode = 'intro';
    gameState.tutorialPage = 1;
    playPurr();
    render();
}

// Drawing custom procedural SVGs for different cat skins and state expressions
function getCatSVG(type, state = 'happy') {
    let bodyColor = "text-amber-500"; 
    let patches = "";
    let specialFace = "";

    if (type === 'calico') {
        bodyColor = "text-orange-200"; 
        patches = `
            <path d="M 40 45 Q 35 55 45 65 Z" fill="#F4A261" />
            <path d="M 60 55 Q 70 50 65 70 Z" fill="#264653" />
            <path d="M 48 25 Q 52 35 45 38 Z" fill="#264653" />
        `;
    } else if (type === 'orange') {
        bodyColor = "text-[#fca311]";
        patches = `
            <path d="M 22 60 H 32" stroke="#e85d04" stroke-width="2" stroke-linecap="round"/>
            <path d="M 22 68 H 30" stroke="#e85d04" stroke-width="2" stroke-linecap="round"/>
            <path d="M 78 60 H 68" stroke="#e85d04" stroke-width="2" stroke-linecap="round"/>
            <path d="M 78 68 H 70" stroke="#e85d04" stroke-width="2" stroke-linecap="round"/>
        `;
    } else if (type === 'tuxedo') {
        bodyColor = "text-neutral-800";
        patches = `
            <path d="M 35 60 Q 50 45 65 60 Q 50 85 35 60 Z" fill="#FFFFFF" />
            <ellipse cx="32" cy="85" rx="5" ry="3" fill="#FFFFFF"/>
            <ellipse cx="68" cy="85" rx="5" ry="3" fill="#FFFFFF"/>
        `;
    } else if (type === 'black') {
        bodyColor = "text-neutral-800";
    } else if (type === 'persian') {
        bodyColor = "text-[#fefae0]"; 
    } else if (type === 'maine_coon') {
        bodyColor = "text-[#8d99ae]"; 
    } else if (type === 'king') {
        bodyColor = "text-amber-600";
    }

    let eyeScale = "rx=\"3.5\" ry=\"5\" fill=\"#2a9d8f\"";
    if (state === 'sparking') {
        eyeScale = "rx=\"3.5\" ry=\"5\" fill=\"#e9c46a\"";
        specialFace = `
            <ellipse cx="42" cy="42" rx="1.5" ry="4.5" fill="#000000" />
            <ellipse cx="58" cy="42" rx="1.5" ry="4.5" fill="#000000" />
            <text x="18" y="20" font-size="12" fill="#e76f51">&#128162;</text>
            <text x="70" y="20" font-size="12" fill="#e76f51">&#128162;</text>
        `;
    } else if (state === 'sleepy') {
        eyeScale = "rx=\"0\" ry=\"0\"";
        specialFace = `
            <path d="M 38 43 Q 42 47 46 43" stroke="#111827" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M 54 43 Q 58 47 62 43" stroke="#111827" stroke-width="2" stroke-linecap="round" fill="none"/>
        `;
    } else if (state === 'cozy_halo') {
        eyeScale = "rx=\"0\" ry=\"0\"";
        specialFace = `
            <path d="M 38 43 Q 42 47 46 43" stroke="#111827" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M 54 43 Q 58 47 62 43" stroke="#111827" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M 45 49 Q 50 53 55 49" stroke="#ef233c" stroke-width="2" stroke-linecap="round" fill="none"/>
        `;
    } else if (state === 'squished') {
        eyeScale = "rx=\"0\" ry=\"0\"";
        specialFace = `
            <path d="M 39 44 L 45 42" stroke="#111827" stroke-width="2.5" stroke-linecap="round" />
            <path d="M 55 42 L 61 44" stroke="#111827" stroke-width="2.5" stroke-linecap="round" />
            <path d="M 46 51 Q 50 46 54 51" stroke="#111827" stroke-width="1.5" stroke-linecap="round" fill="none" />
        `;
    } else {
        specialFace = `
            <ellipse cx="42" cy="42" ${eyeScale} />
            <ellipse cx="58" cy="42" ${eyeScale} />
            <circle cx="43.5" cy="40.5" r="1.2" fill="#FFFFFF" />
            <circle cx="59.5" cy="40.5" r="1.2" fill="#FFFFFF" />
        `;
    }

    // 修復1：還原 getCatSVG 中 King 貓皇冠帽子的處理邏輯
    let extraHat = "";
    if (type === 'king' && state === 'sleepy') {
        extraHat = `
            <g transform="translate(36, -5)">
                <polygon points="10,20 14,8 18,16 22,8 26,20" fill="#fbc42b" stroke="#e85d04" stroke-width="1" />
                <circle cx="14" cy="7" r="2" fill="#d90429" />
                <circle cx="18" cy="15" r="1.5" fill="#00b4d8" />
                <circle cx="22" cy="7" r="2" fill="#d90429" />
            </g>
        `;
    }

    return `
        <svg viewBox="0 0 100 100" class="w-full h-full ${bodyColor} fill-current drop-shadow-md cursor-pointer" onclick="meowBounce(this)">
            <polygon points="18,36 32,10 42,30" class="fill-current" />
            <polygon points="82,36 68,10 58,30" class="fill-current" />
            <polygon points="21,34 30,15 38,29" fill="#FFA3A5" />
            <polygon points="79,34 70,15 62,29" fill="#FFA3A5" />
            <path d="M 12 78 Q -2 68 2 54 Q 6 42 16 52 Q 8 60 18 70 Z" class="fill-current" />
            <ellipse cx="50" cy="65" rx="34" ry="24" class="fill-current" />
            ${patches}
            <circle cx="50" cy="44" r="21" class="fill-current" />
            ${specialFace}
            <polygon points="50,47 47,44 53,44" fill="#FFA3A5" />
            <path d="M 47 50 Q 50 52 53 50" stroke="#111827" stroke-width="1.5" stroke-linecap="round" fill="none" />
            <line x1="22" y1="46" x2="8" y2="44" stroke="#4b5563" stroke-width="1.5" stroke-linecap="round" />
            <line x1="22" y1="51" x2="10" y2="52" stroke="#4b5563" stroke-width="1.5" stroke-linecap="round" />
            <line x1="78" y1="46" x2="92" y2="44" stroke="#4b5563" stroke-width="1.5" stroke-linecap="round" />
            <line x1="78" y1="51" x2="90" y2="52" stroke="#4b5563" stroke-width="1.5" stroke-linecap="round" />
            <ellipse cx="33" cy="48" rx="3.5" ry="1.5" fill="#FFA3A5" opacity="0.8" />
            <ellipse cx="67" cy="48" rx="3.5" ry="1.5" fill="#FFA3A5" opacity="0.8" />
            ${extraHat}
        </svg>
    `;
}

// Action when clicking on any cat in the playground
function meowBounce(svgElement) {
    playMeow(0.9 + Math.random() * 0.4);
    svgElement.classList.add('animate-bounce');
    setTimeout(() => {
        svgElement.classList.remove('animate-bounce');
    }, 600);
}

// Creating custom carton boxes representing corresponding skin aesthetics
function getTargetBoxHTML(cat) {
    let boxBorder = "border-orange-400 bg-orange-400/5";
    let flapBg = "bg-orange-300";
    let boxLabel = "阿橘紙箱";
    let boxEmblem = "🐟"; 

    if (cat.type === 'calico') {
        boxBorder = "border-amber-500 bg-amber-500/5";
        flapBg = "bg-amber-400";
        boxLabel = "花花拼貼箱";
        boxEmblem = "🐾";
    } else if (cat.type === 'tuxedo') {
        boxBorder = "border-neutral-700 bg-neutral-700/5";
        flapBg = "bg-neutral-500";
        boxLabel = "紳士領結箱";
        boxEmblem = "🎀";
    } else if (cat.type === 'black') {
        boxBorder = "border-neutral-900 bg-neutral-900/5";
        flapBg = "bg-neutral-600";
        boxLabel = "暗影箱";
        boxEmblem = "🌙";
    } else if (cat.type === 'persian') {
        boxBorder = "border-yellow-200 bg-yellow-200/10";
        flapBg = "bg-yellow-100";
        boxLabel = "蓬鬆奶油箱";
        boxEmblem = "☁️";
    } else if (cat.type === 'maine_coon') {
        boxBorder = "border-slate-400 bg-slate-400/5";
        flapBg = "bg-slate-300";
        boxLabel = "巨無霸箱";
        boxEmblem = "🍖";
    } else if (cat.type === 'king') {
        boxBorder = "border-yellow-500 bg-yellow-500/5 animate-pulse";
        flapBg = "bg-yellow-400";
        boxLabel = "皇家金寶箱";
        boxEmblem = "👑";
    }

    return `
        <div class="target-box-wrapper w-full h-full p-1 flex flex-col justify-center items-center">
            <div class="relative w-full h-full border-2 border-dashed ${boxBorder} rounded-xl flex flex-col items-center justify-center p-2 opacity-30">
                <div class="absolute -top-1.5 -left-1 w-4 h-2 ${flapBg} opacity-50 rounded-sm transform -rotate-12"></div>
                <div class="absolute -top-1.5 -right-1 w-4 h-2 ${flapBg} opacity-50 rounded-sm transform rotate-12"></div>
                <div class="w-4/5 h-4/5 opacity-50 pointer-events-none">
                    ${getCatSVG(cat.type, 'sleepy')}
                </div>
                <div class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm text-[8px] font-bold text-amber-950 px-1.5 py-0.5 rounded border border-orange-200 shadow-sm whitespace-nowrap flex items-center gap-1">
                    <span>${boxEmblem}</span>
                    <span>${boxLabel}</span>
                </div>
            </div>
        </div>
    `;
}

const gameLevels = [
    {
        id: 1,
        title: "關卡 1：魔法紙箱大開張",
        scenario: "新買的玻璃紙箱送到了！但是外面的貓咪們找不到自己的專用收納箱。我們必須把玻璃外容器轉化為 Flexbox 空間，貓咪們才能感應到紙箱訊號！",
        syntax_desc: "<code>display: flex;</code> 是彈性佈局的起點，必須寫在包覆所有貓咪與專屬小紙箱的外容器（紙箱）上，才能啟動它的排列魔法。",
        options: [
            { key: "A", text: ".cat-item { display: flex; }" },
            { key: "B", text: ".cat-box { display: flex; }" },
            { key: "C", text: ".cat-box { cat-style: flex; }" }
        ],
        correct: "B",
        cats: [
            { type: 'calico', size: 'medium', name: '大福' },
            { type: 'orange', size: 'medium', name: '阿橘' },
            { type: 'tuxedo', size: 'medium', name: '皮皮' }
        ],
        initialStyles: { display: 'block', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'nowrap' },
        correctStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'nowrap' },
        visibleProperties: ['display'],
        activeProperties: ['display'],
        hint: "Flexbox 魔法只能對「外容器 (父元素)」施法。貓咪是內元件，紙箱才是外容器喔！"
    },
    {
        id: 2,
        title: "關卡 2：排排坐，吃果果",
        scenario: "一條長形的玻璃紙箱裡，３隻三花貓想要水平「由左到右」橫向走進屬於牠們的淺橘花色紙箱裡。",
        syntax_desc: "<code>flex-direction</code> 控制主軸的方向。預設值為 <code>row</code>，能命令所有內元件在水平線上由左至右整齊排開。",
        options: [
            { key: "A", text: "flex-direction: row;" },
            { key: "B", text: "flex-direction: column;" },
            { key: "C", text: "flex-direction: horizontal;" }
        ],
        correct: "A",
        cats: [
            { type: 'calico', size: 'medium', name: '花花' },
            { type: 'calico', size: 'medium', name: '草草' },
            { type: 'calico', size: 'medium', name: '露露' }
        ],
        initialStyles: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'nowrap' },
        correctStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'nowrap' },
        visibleProperties: ['display', 'flexDirection'],
        activeProperties: ['flexDirection'],
        hint: "Horizontal 是無效屬性。水平排列要用預設的 row 哦！"
    },
    {
        id: 3,
        title: "關卡 3：貓咪貓咪疊羅漢",
        scenario: "這是一個專為垂直高塔設計的玻璃箱，空間非常窄。三隻貓咪必須「由上往下」垂直排進各自對應的高塔小紙箱中！",
        syntax_desc: "當 <code>flex-direction</code> 被設為 <code>column</code> 時，主軸線會被旋轉 90 度，使內元件由上而下進行垂直堆疊排列。",
        options: [
            { key: "A", text: "flex-direction: row;" },
            { key: "B", text: "flex-direction: column;" },
            { key: "C", text: "flex-direction: vertical;" }
        ],
        correct: "B",
        cats: [
            { type: 'orange', size: 'medium', name: '阿橘' },
            { type: 'black', size: 'medium', name: '小黑' },
            { type: 'calico', size: 'medium', name: '花子' }
        ],
        initialStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'nowrap' },
        correctStyles: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'nowrap' },
        visibleProperties: ['display', 'flexDirection'],
        activeProperties: ['flexDirection'],
        hint: "Vertical 又是假造的無效語法！垂直排列的正確語法是像圓柱體一樣的 column 唷！"
    },
    {
        id: 4,
        title: "關卡 4：暖爐正下方的 C 位",
        scenario: "寒冬來襲，大玻璃箱正上方裝了發光的電暖爐。２隻凍壞的貓咪必須被平移到紙箱「水平正中央」的溫暖小紙箱裡吹暖氣！",
        syntax_desc: "<code>justify-content</code> 負責分配主軸（在預設 row 橫向時為水平向）上的剩餘空間。<code>center</code> 值可將所有元件向中間靠攏。",
        options: [
            { key: "A", text: "justify-content: flex-start;" },
            { key: "B", text: "align-items: center;" },
            { key: "C", text: "justify-content: center;" }
        ],
        correct: "C",
        cats: [
            { type: 'orange', size: 'medium', name: '胖橘' },
            { type: 'tuxedo', size: 'medium', name: '黑糖' }
        ],
        initialStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'nowrap' },
        correctStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'stretch', flexWrap: 'nowrap' },
        visibleProperties: ['display', 'flexDirection', 'justifyContent'],
        activeProperties: ['justifyContent'],
        hint: "現在是水平(主軸)的移動。align-items 是管交錯軸(垂直)的。應該用 justify-content: center 喔！"
    },
    {
        id: 5,
        title: "關卡 5：老大不見面！死守紙箱兩端",
        scenario: "箱子裡有兩隻脾氣暴躁的貓老大（黑貓與賓士貓），一碰頭就打架。請用排版指令把牠們推到「最左邊」與「最右邊」的邊牆收納紙箱裡！",
        syntax_desc: "<code>justify-content: space-between;</code> 會將多餘空間分配在元件之間。最左右端的元件將會死死貼緊邊緣。",
        options: [
            { key: "A", text: "justify-content: space-between;" },
            { key: "B", text: "justify-content: space-around;" },
            { key: "C", text: "align-items: space-between;" }
        ],
        correct: "A",
        cats: [
            { type: 'black', size: 'medium', name: '老大黑' },
            { type: 'tuxedo', size: 'medium', name: '老大白' }
        ],
        initialStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'stretch', flexWrap: 'nowrap' },
        correctStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch', flexWrap: 'nowrap' },
        visibleProperties: ['display', 'flexDirection', 'justifyContent'],
        activeProperties: ['justifyContent'],
        hint: "space-between 會讓頭尾完全靠牆。space-around 會在靠牆處留下一些社交距離空隙。"
    },
    {
        id: 6,
        title: "關卡 6：王之領域！大家都要專屬空間",
        scenario: "櫻花季節，３隻傲嬌的波斯貓想要各據一方。牠們要求各自的紙箱「左邊與右邊」都要有相等的留白，拒絕面壁貼牆！",
        syntax_desc: "<code>justify-content: space-around;</code> 讓每個元件兩側獲得等量空白，因此中間元件間的空隙會是兩側貼牆空隙的 2 倍。",
        options: [
            { key: "A", text: "justify-content: center;" },
            { key: "B", text: "justify-content: space-between;" },
            { key: "C", text: "justify-content: space-around;" }
        ],
        correct: "C",
        cats: [
            { type: 'persian', size: 'medium', name: '波波' },
            { type: 'persian', size: 'medium', name: '絲絲' },
            { type: 'persian', size: 'medium', name: '綿綿' }
        ],
        initialStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'nowrap' },
        correctStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'stretch', flexWrap: 'nowrap' },
        visibleProperties: ['display', 'flexDirection', 'justifyContent'],
        activeProperties: ['justifyContent'],
        hint: "space-between 靠牆處是零空隙的。只有 space-around 才可以讓靠牆的貓咪也有舒適的小空間。"
    },
    {
        id: 7,
        title: "關卡 7 : 高矮胖瘦一條線",
        scenario: "橫向箱中有大緬因貓與小奶貓。因為身高不同看起來歪斜，請讓大大小小的牠們在「垂直交錯軸」上完全置中，並完美入箱！",
        syntax_desc: "<code>align-items</code> 負責元件在交錯軸（垂直向）上的對齊。<code>center</code> 能把不同高度的貓咪對齊在水平基準線上。",
        options: [
            { key: "A", text: "justify-content: center;" },
            { key: "B", text: "align-items: center;" },
            { key: "C", text: "align-items: stretch;" }
        ],
        correct: "B",
        cats: [
            { type: 'maine_coon', size: 'large', name: '大庫恩' },
            { type: 'orange', size: 'small', name: '奶黃' },
            { type: 'calico', size: 'medium', name: '花皮' }
        ],
        initialStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', flexWrap: 'nowrap' },
        correctStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'nowrap' },
        visibleProperties: ['display', 'flexDirection', 'justifyContent', 'alignItems'],
        activeProperties: ['alignItems'],
        hint: "要將垂直方向(交錯軸)置中，必須使用 align-items: center 唷！"
    },
    {
        id: 8,
        title: "關卡 8：液體貓的大滿載！",
        scenario: "一條小長箱子卻塞了 10 隻橘貓。因為預設不換行，擠成了「瘦長地瓜條」。快開啟換行讓牠們掉進各自的黃橘小箱子裡！",
        syntax_desc: "Flexbox 預設為 <code>flex-wrap: nowrap;</code>，會強行擠扁寬度。開啟 <code>wrap</code> 後，裝不下的元件就會自動掉到下一排排列。",
        options: [
            { key: "A", text: "flex-wrap: wrap;" },
            { key: "B", text: "flex-wrap: nowrap;" },
            { key: "C", text: "flex-direction: wrap;" }
        ],
        correct: "A",
        cats: [
            { type: 'orange', size: 'fluid', name: '橘1' },
            { type: 'orange', size: 'fluid', name: '橘2' },
            { type: 'orange', size: 'fluid', name: '橘3' },
            { type: 'orange', size: 'fluid', name: '橘4' },
            { type: 'orange', size: 'fluid', name: '橘5' },
            { type: 'orange', size: 'fluid', name: '橘6' },
            { type: 'orange', size: 'fluid', name: '橘7' },
            { type: 'orange', size: 'fluid', name: '橘8' },
            { type: 'orange', size: 'fluid', name: '橘9' },
            { type: 'orange', size: 'fluid', name: '橘10' }
        ],
        initialStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'nowrap' },
        correctStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'wrap' },
        visibleProperties: ['display', 'flexDirection', 'justifyContent', 'alignItems', 'flexWrap'],
        activeProperties: ['flexWrap'],
        hint: "這時候要用到 wrap 換行魔法！選 A 可以把液體肥橘貓彈回第二行、第三行排列喔！"
    },
    {
        id: 9,
        title: "關卡 9：【⚠️大陷阱】貓樹高塔的左右對齊",
        scenario: "機台現在被限制在「直向模式 (column)」。高塔紙箱の中間有一個神祕圓形樹洞。貓咪們偏左，請將牠們橫向置中平移入洞！",
        syntax_desc: "經典陷阱題！在 <code>column</code> 垂直模式下，<b>主軸變垂直，交錯軸變水平。</b> 因此，要控制「左右水平對齊」必須改用負責交錯軸的 <code>align-items: center;</code>！",
        options: [
            { key: "A", text: "justify-content: center;" },
            { key: "B", text: "align-items: center;" },
            { key: "C", text: "flex-wrap: wrap;" }
        ],
        correct: "B",
        cats: [
            { type: 'black', size: 'medium', name: '影子' },
            { type: 'tuxedo', size: 'medium', name: '亮亮' }
        ],
        initialStyles: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', flexWrap: 'nowrap' },
        correctStyles: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'nowrap' },
        visibleProperties: ['display', 'flexDirection', 'justifyContent', 'alignItems'],
        activeProperties: ['alignItems'],
        hint: "小心！因為是直向 (column)，主軸變成垂直的。如果用 justify-content 會變成垂直居中喔，必須使用 align-items 來左右對齊。"
    },
    {
        id: 10,
        title: "關卡 10：終極貓咪大和諧",
        scenario: "最後一關！國王貓要在這個大紙箱的「幾何正核心（水平正中央 ＋ 垂直正中央）」登基！請在金黃色寶箱上同時雙軸置中！",
        syntax_desc: "要達到完美的「九宮格正中央」，必須將主軸置中（<code>justify-content: center;</code>）與交錯軸置中（<code>align-items: center;</code>）完美結合！",
        options: [
            { key: "A", text: "justify-content: space-between; + align-items: center;" },
            { key: "B", text: "justify-content: center; + flex-wrap: wrap;" },
            { key: "C", text: "justify-content: center; + align-items: center;" }
        ],
        correct: "C",
        cats: [
            { type: 'king', size: 'large', name: '國王喵' }
        ],
        initialStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', flexWrap: 'nowrap' },
        correctStyles: { display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'nowrap' },
        visibleProperties: ['display', 'flexDirection', 'justifyContent', 'alignItems'],
        activeProperties: ['justifyContent', 'alignItems'],
        hint: "想要幾何中心置中？那就把 justify-content: center 和 align-items: center 同時施展出來吧！"
    }
];

const tourSteps = [
    {
        elementId: "targetBox",
        title: "🎯 任務目標：讓貓咪完美入箱",
        text: "看到紙箱內淡色、半透明的<b>「目標小影子箱」</b>嗎？您的目標就是透過排版語法把實體貓咪送進對應色的影子中！",
    },
    {
        elementId: "cssEditorContainer",
        title: "💻 關鍵：找出壞掉的 CSS 語法",
        text: "右上角顯示了紙箱現在的樣式。<b>橘色框選、閃爍</b>的那一行，就是造成排隊出錯的壞掉語法！",
    },
    {
        elementId: "contentCard",
        title: "👇 解題：點選正確選項通關",
        text: "讀完講堂說明後，在左下角<b>點選正確的 Flexbox 代碼</b>。答對了貓咪就會一秒滑行入箱喔！",
    }
];

// START SPOTLIGHT ONBOARDING OVER GAME SCREEN
function startTour() {
    gameState.tourState.active = true;
    gameState.tourState.step = 0;
    
    const overlaySvg = document.getElementById('tourOverlaySvg');
    overlaySvg.classList.remove('hidden');
    overlaySvg.getBoundingClientRect();
    overlaySvg.classList.remove('opacity-0', 'pointer-events-none');
    overlaySvg.classList.add('opacity-100');
    
    const tooltip = document.getElementById('tourTooltip');
    tooltip.classList.remove('hidden');
    tooltip.getBoundingClientRect();
    tooltip.classList.remove('opacity-0', 'pointer-events-none');
    tooltip.classList.add('opacity-100');

    playPurr();
    showTourStep(0);
}

function showTourStep(stepIdx) {
    const step = tourSteps[stepIdx];
    const el = document.getElementById(step.elementId);
    if (!el) {
        endTour();
        return;
    }

    el.scrollIntoView({ behavior: 'auto', block: 'center' });
    
    const rect = el.getBoundingClientRect();
    const maskCutout = document.getElementById('maskCutout');
    const spotlightBorder = document.getElementById('spotlightBorder');

    const pad = 8; 
    const x = rect.left - pad;
    const y = rect.top - pad;
    const w = rect.width + (pad * 2);
    const h = rect.height + (pad * 2);

    maskCutout.setAttribute('x', x);
    maskCutout.setAttribute('y', y);
    maskCutout.setAttribute('width', w);
    maskCutout.setAttribute('height', h);

    spotlightBorder.setAttribute('x', x);
    spotlightBorder.setAttribute('y', y);
    spotlightBorder.setAttribute('width', w);
    spotlightBorder.setAttribute('height', h);

    const contentContainer = document.getElementById('tourTooltipContent');
    contentContainer.innerHTML = `
        <div class="flex justify-between items-center mb-1.5">
            <span class="text-[10px] font-extrabold text-amber-500 tracking-widest">🐾 快速指引 ${stepIdx + 1} / 3</span>
            <button onclick="endTour()" class="text-xs text-slate-400 hover:text-white transition">跳過 ✕</button>
        </div>
        <h4 class="text-sm font-bold text-white mb-1 flex items-center gap-1.5">${step.title}</h4>
        <p class="text-xs text-slate-300 leading-relaxed mb-3">${step.text}</p>
        <div class="flex justify-between items-center mt-3 border-t border-slate-800 pt-2.5">
            <button onclick="prevTourStep()" ${stepIdx === 0 ? 'disabled' : ''} class="text-[11px] font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition">
                ⬅ 上一步
            </button>
            <button onclick="nextTourStep()" class="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition shadow-md hover:-translate-y-0.5">
                ${stepIdx === tourSteps.length - 1 ? '開始遊玩！🐾' : '下一步 ➔'}
            </button>
        </div>
    `;

    const tooltip = document.getElementById('tourTooltip');
    const arrow = document.getElementById('tourArrow');
    const tooltipWidth = 320;
    const tooltipHeight = tooltip.offsetHeight || 165; 
    const margin = 20;

    let tooltipTop = 0;
    let tooltipLeft = 0;
    let arrowPos = 'top';

    if (rect.bottom + tooltipHeight + margin < window.innerHeight) {
        tooltipTop = rect.bottom + margin;
        arrowPos = 'top';
    } else if (rect.top - tooltipHeight - margin > 0) {
        tooltipTop = rect.top - tooltipHeight - margin;
        arrowPos = 'bottom';
    } else {
        tooltipTop = (window.innerHeight - tooltipHeight) / 2;
        arrowPos = 'none';
    }

    const targetCenter = rect.left + (rect.width / 2);
    tooltipLeft = targetCenter - (tooltipWidth / 2);

    const screenMargin = 16;
    if (tooltipLeft < screenMargin) {
        tooltipLeft = screenMargin;
    } else if (tooltipLeft + tooltipWidth > window.innerWidth - screenMargin) {
        tooltipLeft = window.innerWidth - tooltipWidth - screenMargin;
    }

    tooltip.style.top = `${tooltipTop}px`;
    tooltip.style.left = `${tooltipLeft}px`;

    if (arrowPos !== 'none') {
        arrow.style.opacity = '1';
        const relativeArrowLeft = targetCenter - tooltipLeft;
        const clampedArrowLeft = Math.max(20, Math.min(tooltipWidth - 20, relativeArrowLeft));
        arrow.style.left = `${clampedArrowLeft}px`;

        if (arrowPos === 'top') {
            arrow.style.top = `-8px`;
            arrow.style.borderWidth = `1px 0px 0px 1px`;
            arrow.style.bottom = `auto`;
        } else {
            arrow.style.bottom = `-8px`;
            arrow.style.borderWidth = `0px 1px 1px 0px`;
            arrow.style.top = `auto`;
        }
    } else {
        arrow.style.opacity = '0';
    }
}

// Move to the next Spotlight Tour step
// 重複
function nextTourStep() {
    if (gameState.tourState.step < tourSteps.length - 1) {
        gameState.tourState.step++;
        playPurr();
        showTourStep(gameState.tourState.step);
    } else {
        endTour();
    }
}

function prevTourStep() {
    if (gameState.tourState.step > 0) {
        gameState.tourState.step--;
        playPurr();
        showTourStep(gameState.tourState.step);
    }
}

function endTour() {
    gameState.tourState.active = false;
    
    const overlaySvg = document.getElementById('tourOverlaySvg');
    overlaySvg.classList.add('opacity-0', 'pointer-events-none');
    overlaySvg.classList.remove('opacity-100');
    setTimeout(() => {
        if (!gameState.tourState.active) {
            overlaySvg.classList.add('hidden');
        }
    }, 300);

    const tooltip = document.getElementById('tourTooltip');
    tooltip.classList.add('opacity-0', 'pointer-events-none');
    tooltip.classList.remove('opacity-100');
    setTimeout(() => {
        if (!gameState.tourState.active) {
            tooltip.classList.add('hidden');
        }
    }, 300);
    
    localStorage.setItem('cat_flex_tour_done', 'true');
    playMeow(1.1);
}

// Dynamic Axis Direction Updater
// 修復1（大小寫 ID 容錯）：加入 prefix + 'AxisMain' / 'AxisCross' 雙峰駝峰安全容錯
function updateAxisDisplay(direction, prefix = '') {
    const mainId = prefix ? (prefix + 'AxisMain') : 'axisMain';
    const crossId = prefix ? (prefix + 'AxisCross') : 'axisCross';
    const axisMain = document.getElementById(mainId);
    const axisCross = document.getElementById(crossId);
    if (!axisMain || !axisCross) return;

    if (direction === 'column') {
        axisMain.className = "axis-line absolute inset-y-6 left-1/2 border-l border-dashed border-sky-400/60 pointer-events-none z-20";
        axisMain.innerHTML = `<div class="absolute bottom-4 -left-7 text-[10px] text-sky-500 bg-white/95 px-2 py-0.5 rounded shadow font-bold">主軸 (Main Axis)</div>`;

        axisCross.className = "axis-line absolute inset-x-6 top-1/2 border-t border-dashed border-indigo-400/60 pointer-events-none z-20";
        axisCross.innerHTML = `<div class="absolute right-4 -top-2.5 text-[10px] text-indigo-500 bg-white/95 px-2 py-0.5 rounded shadow font-bold">交錯軸 (Cross Axis)</div>`;
    } else {
        axisMain.className = "axis-line absolute inset-x-6 top-1/2 border-t border-dashed border-sky-400/60 pointer-events-none z-20";
        axisMain.innerHTML = `<div class="absolute right-4 -top-2.5 text-[10px] text-sky-500 bg-white/95 px-2 py-0.5 rounded shadow font-bold">主軸 (Main Axis)</div>`;

        axisCross.className = "axis-line absolute inset-y-6 left-1/2 border-l border-dashed border-indigo-400/60 pointer-events-none z-20";
        axisCross.innerHTML = `<div class="absolute bottom-4 -left-7 text-[10px] text-indigo-500 bg-white/95 px-2 py-0.5 rounded shadow font-bold">交錯軸 (Cross Axis)</div>`;
    }
}

// 修復5：Resize 時 spotlight 加上 requestAnimationFrame，等 DOM 穩定後重算位置
window.addEventListener('resize', () => {
    if (gameState.tourState.active) {
        requestAnimationFrame(() => {
            showTourStep(gameState.tourState.step);
        });
    }
});

// CENTRALIZED RENDER DISPATCHER
function render() {
    if (gameState.mode === 'intro') {
        document.getElementById('introContainer').classList.remove('hidden');
        document.getElementById('gameContainer').classList.add('hidden');
        
        // Hide header guide/replay button while in intro
        document.getElementById('headerIntroBtn').classList.add('hidden');
        document.getElementById('tourGuideBtn').classList.add('hidden');
        
        renderIntroScreen();
    } else {
        document.getElementById('introContainer').classList.add('hidden');
        document.getElementById('gameContainer').classList.remove('hidden');
        
        // Show header navigation buttons in game mode
        document.getElementById('headerIntroBtn').classList.remove('hidden');
        document.getElementById('tourGuideBtn').classList.remove('hidden');
        
        renderGameScreen();
    }
}

// RENDER INTRO WALKTHROUGH (SCREEN 1)
function renderIntroScreen() {
    const leftPanel = document.getElementById('introLeftPanel');
    const previewBox = document.getElementById('introPreviewBox');
    
    const axisMain = document.getElementById('introAxisMain');
    const axisCross = document.getElementById('introAxisCross');

    // Reset dynamic overlays
    axisMain.style.opacity = '0';
    axisCross.style.opacity = '0';
    previewBox.className = "glass-box w-full max-w-[480px] h-[260px] rounded-2xl relative p-6 flex gap-4 transition-all duration-500 items-center justify-start";
    
    if (gameState.tutorialPage === 1) {
        // PAGE 1: Box is Boss
        previewBox.style.display = "flex";
        previewBox.style.flexDirection = "row";
        previewBox.style.justifyContent = "space-around";
        
        leftPanel.innerHTML = `
            <div>
                <span class="text-xs bg-orange-100 text-orange-600 font-bold px-3 py-1 rounded-full uppercase tracking-wider">開場指引 • 頁面 1 / 3</span>
                <h2 class="text-2xl font-black text-amber-950 mt-3 mb-4 flex items-center gap-2">
                    <span>💡</span> 觀念 1：外容器才是魔法核心！
                </h2>
                <div class="space-y-4 text-sm text-amber-900/90 leading-relaxed">
                    <p>歡迎來到貓咪咖啡廳！在這個 Flexbox 遊戲中：</p>
                    <ul class="space-y-2 font-bold">
                        <li class="text-orange-600 flex items-center gap-1.5">📦 玻璃紙箱 ➔ 代表「外容器」(父層)</li>
                        <li class="text-amber-800 flex items-center gap-1.5">🐱 貓咪 ➔ 代表「內元件」(子層)</li>
                    </ul>
                    <div class="bg-white/70 p-4 rounded-2xl border border-orange-200/50 text-xs text-orange-800 shadow-sm leading-relaxed">
                        <b>核心鐵律：</b> 想要下指令命令貓咪怎麼排隊，<b>所有的 Flexbox 指令必須寫在外容器（紙箱 .cat-box） 的 CSS 裡面！</b> 直接寫在貓咪（.cat-item）身上，貓咪是絕對不會聽你命令的。
                    </div>
                </div>
            </div>
            <div class="flex justify-between items-center mt-8">
                <button onclick="switchMode('game')" class="text-xs font-bold text-amber-800/60 hover:text-orange-600 transition tracking-wider">跳過教學直接闖關 ➔</button>
                <button onclick="changeIntroPage(1)" class="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-bold transition flex items-center gap-1.5 shadow-md hover:-translate-y-0.5">
                    下一步：雙軸線 ➔
                </button>
            </div>
        `;

        // Populating beautiful interactive preview cats
        previewBox.innerHTML = `
            <div class="cat-item w-20 h-20 relative p-1">
                ${getCatSVG('calico')}
                <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white/95 text-[9px] text-orange-800 font-bold px-1.5 py-0.5 rounded border border-orange-200 shadow-sm">.cat-item</div>
            </div>
            <div class="cat-item w-20 h-20 relative p-1">
                ${getCatSVG('orange')}
                <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white/95 text-[9px] text-orange-800 font-bold px-1.5 py-0.5 rounded border border-orange-200 shadow-sm">.cat-item</div>
            </div>
        `;

    } else if (gameState.tutorialPage === 2) {
        // PAGE 2: The Invisible Axes
        axisMain.style.opacity = '1';
        axisCross.style.opacity = '1';
        
        previewBox.style.display = "flex";
        previewBox.style.flexDirection = "row";
        previewBox.style.justifyContent = "space-around";
        
        // Sync labels based on current preview direction
        const currentDir = previewBox.style.flexDirection;
        updateAxisDisplay(currentDir, 'intro');

        leftPanel.innerHTML = `
            <div>
                <span class="text-xs bg-orange-100 text-orange-600 font-bold px-3 py-1 rounded-full uppercase tracking-wider">開場指引 • 頁面 2 / 3</span>
                <h2 class="text-2xl font-black text-amber-950 mt-3 mb-4 flex items-center gap-2">
                    <span>💡</span> 觀念 2：看不見的雙軸十字線！
                </h2>
                <div class="space-y-4 text-sm text-amber-900/90 leading-relaxed">
                    <p>每個紙箱裡都藏著兩條神秘的十字線：</p>
                    <ul class="space-y-2 text-xs">
                        <li class="text-sky-700"><span class="text-gray-800 font-bold"><b>主軸 (Main Axis)</b></span>：貓咪排隊前進與排列的主要方向。</li>
                        <li class="text-indigo-700"><span class="text-gray-800 font-bold"><b>交錯軸 (Cross Axis)</b></span>：與排隊前進方向垂直的另一條輔助對齊線。</li>
                    </ul>
                    
                    <!-- LIVE DEMO CONTROLLERS IN CARD -->
                    <div class="bg-amber-100/60 p-4 rounded-2xl border border-amber-200/60 flex flex-col gap-2.5">
                        <span class="text-xs font-bold text-amber-950">👇 點擊下方切換方向，看右側雙軸如何對調旋轉：</span>
                        <div class="grid grid-cols-2 gap-2">
                            <button id="introRowBtn" onclick="toggleIntroDirection('row')" class="py-2 px-3 rounded-xl border border-sky-300 bg-sky-50 text-sky-800 font-bold text-xs transition shadow-sm">
                                Row 橫向排列 ➡️
                            </button>
                            <button id="introColBtn" onclick="toggleIntroDirection('column')" class="py-2 px-3 rounded-xl border border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50 font-bold text-xs transition shadow-sm">
                                Column 縱向排列 ⬇️
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex justify-between items-center mt-8">
                <button onclick="changeIntroPage(-1)" class="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-100 border border-amber-200 text-amber-950 font-bold transition text-xs shadow-sm">
                    ⬅ 上一步
                </button>
                <button onclick="changeIntroPage(1)" class="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-bold transition flex items-center gap-1.5 shadow-md hover:-translate-y-0.5">
                    下一步：方向對決 ➔
                </button>
            </div>
        `;

        previewBox.innerHTML = `
            <div class="cat-item w-16 h-16 opacity-30">${getCatSVG('calico')}</div>
            <div class="cat-item w-16 h-16 opacity-30">${getCatSVG('orange')}</div>
        `;

    } else if (gameState.tutorialPage === 3) {
        // PAGE 3: Direction row vs column
        previewBox.style.display = "flex";
        previewBox.style.flexDirection = "row";
        previewBox.style.justifyContent = "space-around";

        leftPanel.innerHTML = `
            <div>
                <span class="text-xs bg-orange-100 text-orange-600 font-bold px-3 py-1 rounded-full uppercase tracking-wider">開場指引 • 頁面 3 / 3</span>
                <h2 class="text-2xl font-black text-amber-950 mt-3 mb-4 flex items-center gap-2">
                    <span>💡</span> 觀念 3：橫排 vs 疊羅漢
                </h2>
                <div class="space-y-4 text-sm text-amber-900/90 leading-relaxed">
                    <p>指揮官登場！<code>flex-direction</code> 屬性決定了誰是前進的主軸：</p>
                    <div class="grid grid-cols-1 gap-2.5">
                        <button onclick="toggleIntroDirection('row')" class="p-3 rounded-xl border border-orange-200 bg-white hover:bg-orange-50 text-left transition shadow-sm group">
                            <span class="font-extrabold text-orange-600 text-xs flex justify-between">
                                <span>row（預設橫向） ➡️</span>
                                <span class="text-[10px] text-amber-800 font-bold">點擊預覽</span>
                            </span>
                            <p class="text-[11px] text-gray-500 mt-1 leading-relaxed">主軸是水平的。貓咪會像小火車一樣橫排站立。</p>
                        </button>
                        <button onclick="toggleIntroDirection('column')" class="p-3 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-left transition shadow-sm group">
                            <span class="font-extrabold text-indigo-600 text-xs flex justify-between">
                                <span>column（直立疊羅漢） ⬇️</span>
                                <span class="text-[10px] text-amber-800 font-bold">點擊預覽</span>
                            </span>
                            <p class="text-[11px] text-gray-500 mt-1 leading-relaxed">主軸被強行旋轉90度。貓咪會像疊羅漢般頭頂著屁股由上往下站立。</p>
                        </button>
                    </div>
                </div>
            </div>
            <div class="flex justify-between items-center mt-8">
                <button onclick="changeIntroPage(-1)" class="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-100 border border-amber-200 text-amber-950 font-bold transition text-xs shadow-sm">
                    ⬅ 上一步
                </button>
                <button onclick="enterFormalGame()" class="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white font-black transition flex items-center gap-1.5 shadow-lg hover:-translate-y-0.5 animate-bounce text-sm">
                    😻 進入正式關卡！🐾
                </button>
            </div>
        `;

        previewBox.innerHTML = `
            <div class="cat-item w-16 h-16">${getCatSVG('calico')}</div>
            <div class="cat-item w-16 h-16">${getCatSVG('orange')}</div>
            <div class="cat-item w-16 h-16">${getCatSVG('tuxedo')}</div>
        `;
    }
}

function changeIntroPage(dir) {
    gameState.tutorialPage += dir;
    if (gameState.tutorialPage < 1) gameState.tutorialPage = 1;
    if (gameState.tutorialPage > 3) gameState.tutorialPage = 3;
    playPurr();
    render();
}

// Live Toggling direction in the Intro Sandbox
function toggleIntroDirection(dir) {
    const previewBox = document.getElementById('introPreviewBox');
    if (!previewBox) return;

    previewBox.style.flexDirection = dir;
    playMeow(dir === 'row' ? 1.15 : 0.85);

    // Dynamically adjust buttons styles in Card on Page 2
    const rowBtn = document.getElementById('introRowBtn');
    const colBtn = document.getElementById('introColBtn');

    if (rowBtn && colBtn) {
        if (dir === 'row') {
            rowBtn.className = "py-2 px-3 rounded-xl border border-sky-300 bg-sky-50 text-sky-800 font-bold text-xs transition shadow-sm";
            colBtn.className = "py-2 px-3 rounded-xl border border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50 font-bold text-xs transition shadow-sm";
        } else {
            rowBtn.className = "py-2 px-3 rounded-xl border border-sky-200 bg-white text-sky-800 hover:bg-sky-50 font-bold text-xs transition shadow-sm";
            colBtn.className = "py-2 px-3 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 font-bold text-xs transition shadow-sm";
        }
    }

    // Instantly rotate axis labels inside onboarding card sandbox
    updateAxisDisplay(dir, 'intro');
}

// TRANSITION FROM FULLSCREEN INTRO TO MAIN SPLITSCREEN LEVEL GAMEPLAY
function enterFormalGame() {
    gameState.mode = 'game';
    
    // Play rewarding double meow melody
    playSuccessMelody();

    // Render level first
    render();

    // If first time landing on levels screen, fire the spotlight pointer tour automatically
    if (localStorage.getItem('cat_flex_tour_done') !== 'true') {
        setTimeout(startTour, 500);
    }
}

// RENDER CORE LEVELS PLATFORM (SCREEN 2)
// 修復6：移除寫死的 'row'，改為讀當前關卡的實際方向，防止轉場標籤閃爍與非預期對齊問題
function renderGameScreen() {
    const card = document.getElementById('contentCard');
    const catBox = document.getElementById('catBox');
    const targetBox = document.getElementById('targetBox');
    
    const glowHeater = document.getElementById('glowHeater');
    const emojiHeater = document.getElementById('emojiHeater');
    const guideLine7 = document.getElementById('guideLine7');
    const treeHollow = document.getElementById('treeHollow');
    const throneBg = document.getElementById('throneBg');
    const axisMain = document.getElementById('axisMain');
    const axisCross = document.getElementById('axisCross');

    // 根據當前關卡的實際方向來決定
    const currentLevel = gameLevels[gameState.currentLevelIndex];
    const currentDirection = currentLevel.initialStyles.flexDirection || 'row';
    updateAxisDisplay(currentDirection);

    // 補回被誤刪的裝飾重設程式碼，避免跨關卡或初始載入殘留
    if (glowHeater) glowHeater.classList.add('opacity-0');
    if (emojiHeater) emojiHeater.classList.add('opacity-0');
    if (guideLine7) guideLine7.classList.add('opacity-0');
    if (treeHollow) treeHollow.classList.add('opacity-0');
    if (throneBg) throneBg.classList.add('opacity-0');
    if (axisMain) axisMain.style.opacity = '0';
    if (axisCross) axisCross.style.opacity = '0';

    targetBox.classList.remove('opacity-0');
    renderLevelContent(card, catBox, targetBox);
}

function updateCSSEditor(currentLevel) {
    const editor = document.getElementById('cssEditorContainer');
    if (!editor) return;

    let appliedStyles = gameState.isCurrentLevelSolved ? currentLevel.correctStyles : currentLevel.initialStyles;
    let html = `<div class="text-blue-400 font-bold">.cat-box <span class="text-slate-400">{</span></div>`;

    currentLevel.visibleProperties.forEach(prop => {
        const isActive = currentLevel.activeProperties.includes(prop);
        const cssKey = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
        const value = appliedStyles[prop];

        if (isActive) {
            if (gameState.isCurrentLevelSolved) {
                html += `
                    <div class="pl-4 pr-2 py-1.5 my-1 rounded border border-emerald-500/30 bg-emerald-950/40 flex justify-between items-center transition-all duration-300">
                        <div>
                            <span class="text-pink-400 font-bold">${cssKey}</span>: 
                            <span class="text-emerald-400 font-extrabold text-sm">${value}</span>;
                        </div>
                        <span class="text-[9px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded shadow-sm select-none">✅ 已對齊</span>
                    </div>
                `;
            } else {
                html += `
                    <div class="pl-4 pr-2 py-1.5 my-1 rounded border-2 border-orange-500 bg-orange-950/30 flex justify-between items-center ring-2 ring-orange-400/30 animate-pulse transition-all duration-300">
                        <div>
                            <span class="text-pink-400 font-extrabold">${cssKey}</span>: 
                            <span class="text-orange-400 font-extrabold underline decoration-dashed decoration-2">${value}</span>;
                        </div>
                        <span class="text-[9px] bg-orange-500 text-white font-bold px-2 py-0.5 rounded shadow-sm select-none">✏️ 點選選項修正此列</span>
                    </div>
                `;
            }
        } else {
            html += `
                <div class="pl-4 py-0.5 text-slate-500 opacity-60">
                    <span class="text-pink-400/70">${cssKey}</span>: <span class="text-yellow-100/70">${value}</span>;
                </div>
            `;
        }
    });

    html += `<div class="text-slate-400">}</div>`;
    editor.innerHTML = html;
}

function renderLevelContent(card, catBox, targetBox) {
    const currentLevel = gameLevels[gameState.currentLevelIndex];
    
    // Build current CSS Style to simulate on play cat container
    let appliedStyles = gameState.isCurrentLevelSolved ? currentLevel.correctStyles : currentLevel.initialStyles;

    // Apply style dynamically on Carton Box
    for(let key in appliedStyles) {
        catBox.style[key] = appliedStyles[key];
    }

    // Update interactive style editor highlights
    updateCSSEditor(currentLevel);

    // Apply perfect guide styles on ghost targetBox
    targetBox.style.display = 'flex';
    for(let key in currentLevel.correctStyles) {
        targetBox.style[key] = currentLevel.correctStyles[key];
    }

    // Custom level details decoration inside Box
    if (currentLevel.id === 4) {
        const glowHeater = document.getElementById('glowHeater');
        const emojiHeater = document.getElementById('emojiHeater');
        if (glowHeater) glowHeater.classList.remove('opacity-0');
        if (emojiHeater) emojiHeater.classList.remove('opacity-0');
    } else if (currentLevel.id === 7) {
        const guideLine7 = document.getElementById('guideLine7');
        if (guideLine7) guideLine7.classList.remove('opacity-0');
    } else if (currentLevel.id === 9) {
        const treeHollow = document.getElementById('treeHollow');
        const axisMain = document.getElementById('axisMain');
        const axisCross = document.getElementById('axisCross');
        if (treeHollow) treeHollow.classList.remove('opacity-0');
        
        // Align axis labels to column mode (Vertical = Main, Horizontal = Cross)
        updateAxisDisplay('column');

        if (axisMain) axisMain.style.opacity = '1';
        if (axisCross) axisCross.style.opacity = '1';
    } else if (currentLevel.id === 10) {
        const throneBg = document.getElementById('throneBg');
        if (throneBg) {
            throneBg.classList.remove('opacity-0');
            if (gameState.isCurrentLevelSolved) {
                throneBg.style.transform = "translate(-50%, -50%) scale(1.4)";
            } else {
                throneBg.style.transform = "translate(-50%, -50%) scale(0.9)";
            }
        }
    }

    // Adjust box border style on success
    if (gameState.isCurrentLevelSolved) {
        catBox.classList.add('success');
    } else {
        catBox.classList.remove('success');
    }

    // Cat state based on solved state
    let catExpression = 'happy';
    if (!gameState.isCurrentLevelSolved) {
        if (currentLevel.id === 5) catExpression = 'sparking'; 
        if (currentLevel.id === 8) catExpression = 'squished';  
    } else {
        if (currentLevel.id === 4) catExpression = 'cozy_halo'; 
        if (currentLevel.id === 10) catExpression = 'sleepy';  
    }

    // Always render empty target box on bottom (Will NOT get deleted when answer is correct!)
    targetBox.innerHTML = '';
    currentLevel.cats.forEach(cat => {
        const shadowEl = document.createElement('div');
        shadowEl.className = `relative p-1 flex items-center justify-center`;
        if (cat.size === 'small') {
            shadowEl.classList.add('w-12', 'h-12');
        } else if (cat.size === 'medium') {
            shadowEl.classList.add('w-20', 'h-20');
        } else if (cat.size === 'large') {
            shadowEl.classList.add('w-28', 'h-28');
        } else if (cat.size === 'fluid') {
            shadowEl.className = "relative p-1 w-16 h-16 m-1";
        }
        shadowEl.innerHTML = getTargetBoxHTML(cat);
        targetBox.appendChild(shadowEl);
    });

    // RENDER USER-CONTROLLED REAL CATS IN CAT BOX
    catBox.innerHTML = '';
    currentLevel.cats.forEach(cat => {
        const catEl = document.createElement('div');
        catEl.className = `cat-item relative p-1`;
        
        // Class & sizing based on levels
        if (cat.size === 'small') {
            catEl.classList.add('w-12', 'h-12');
        } else if (cat.size === 'medium') {
            catEl.classList.add('w-20', 'h-20');
        } else if (cat.size === 'large') {
            catEl.classList.add('w-28', 'h-28');
        } else if (cat.size === 'fluid') {
            if (gameState.isCurrentLevelSolved) {
                catEl.className = "cat-item relative p-1 w-16 h-16 m-1";
            } else {
                catEl.className = "cat-item relative p-1 w-7 h-20 flex-shrink-1";
            }
        }

        catEl.innerHTML = `
            ${getCatSVG(cat.type, catExpression)}
            <span class="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white/85 backdrop-blur-sm text-[8px] text-gray-750 font-black px-1 py-0.5 rounded shadow-sm border border-white/60 whitespace-nowrap pointer-events-none">${cat.name}</span>
        `;
        catBox.appendChild(catEl);
    });

    // UPDATE BOTTOM ENCOURAGEMENT/HINT TIP DYNAMICALLY (Fixes the state preservation bug and applies non-spoiler murmurs)
    const bottomHint = document.getElementById('bottomHint');
    if (bottomHint) {
        if (gameState.isCurrentLevelSolved) {
            bottomHint.innerHTML = `😻 喵～太讚了！所有貓咪都暖洋洋地窩進專屬箱子裡囉！✨`;
        } else if (gameState.wrongSelections.length > 0) {
            bottomHint.innerHTML = `❌ 哎呀，不對唷！${currentLevel.hint}`;
        } else {
            // Cute customized cat encouraging quotes per level (Fixed levels 1, 2, 3, 5, 8 to avoid direct word spoils)
            const catQuotes = [
                "喵嗚～新買的磨砂玻璃大紙箱耶！人家最喜歡鑽箱子了，快啟動排版魔法讓我們通通窩進去吧！📦",
                "喵～隔壁的三花說想跟我們肩並肩橫著坐成一列，像小火車那樣手拉手排隊，要怎麼對齊呢？🐾",
                "喵哈～這個垂直高塔窄窄長長的，大家想玩貓咪疊羅漢，一個頂著一個由上往下疊，快幫我們轉個排列方向吧！⬇️",
                "（呼嚕呼嚕...）電暖爐好溫暖喔，快幫我們移到水平正中間的 C 位吹暖氣！☀️",
                "黑貓跟賓士貓在哈氣了！快用分配間隔的魔法幫牠們拉開最大安全牆距，中間空出來！🙀",
                "波斯貓傲嬌抬頭：『我們需要舒適的左右對等小留白，拒絕貼牆面壁思過喵！』🌸",
                "緬因貓跟奶貓身高差太多、看起來歪斜，快幫我們在垂直線上置中切齊吧！📏",
                "喵嗚～小箱子要塞爆了，橘貓們被擠成了肉條！快開啟自動換行魔法拯救液體貓咪！🥵",
                "⚠️ 喵！注意！直向 column 模式下，主軸跟交錯軸對調了，這題是左右平移的對齊陷阱喔！👀",
                "👑 終極登基！國王貓要在黃金紙箱的正中央登基，請同時施展雙軸中心對齊神技！✨"
            ];
            bottomHint.innerHTML = catQuotes[gameState.currentLevelIndex] || "請利用排版語法，將各個貓咪準確送入同顏色的目標紙箱中！";
        }
    }

    // LEVEL PROGRESS DOTS
    let dotsHTML = `<div class="flex gap-1.5 flex-wrap my-3">`;
    gameLevels.forEach((lvl, idx) => {
        let dotClass = "bg-white/40 text-amber-900 hover:bg-white/80";
        if (idx === gameState.currentLevelIndex) {
            dotClass = "bg-orange-500 text-white border border-orange-400 ring-2 ring-orange-200";
        } else if (idx <= gameState.unlockedLevelIndex) {
            dotClass = "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300";
        }
        dotsHTML += `
            <button onclick="goToLevel(${idx})" class="w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${dotClass}">
                ${idx + 1}
            </button>
        `;
    });
    dotsHTML += `</div>`;

    // RENDER LEFT INTERFACE CARD
    let solvedMessageHTML = "";
    let nextButtonHTML = "";

    if (gameState.isCurrentLevelSolved) {
        let meowText = "🐾 MEOW! 貓咪已完美入箱！";
        if(currentLevel.id === 10) {
            meowText = "🏆 MEOW-FUL! 貓咪完美全通關！";
        }
        solvedMessageHTML = `
            <div class="mt-4 p-3 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-xs font-bold flex flex-col gap-1.5 animate-bounce">
                <span class="flex items-center gap-1">✨ ${meowText}</span>
                <p class="text-[11px] font-normal text-emerald-700">我們成功在 <code>.cat-box</code> 上施加了彈性排版屬性，貓咪此時已與對應色系的小箱子完美重合！</p>
            </div>
        `;

        if (gameState.currentLevelIndex < gameLevels.length - 1) {
            nextButtonHTML = `
                <button onclick="nextLevel()" class="px-6 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-lg hover:-translate-y-0.5 w-full justify-center text-sm">
                    前往下一關 ➔
                </button>
            `;
        } else {
            nextButtonHTML = `
                <button onclick="triggerConfetti()" class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold transition flex items-center gap-1.5 shadow-lg hover:-translate-y-0.5 w-full justify-center text-sm">
                    👑 重溫登基加冕！
                </button>
            `;
        }
    } else {
        let optionsHTML = `<div class="space-y-2 mt-3">`;
        currentLevel.options.forEach(opt => {
            let isWrong = gameState.wrongSelections.includes(opt.key);
            let btnClass = "bg-white/70 border-white/90 text-amber-950 hover:bg-white/90";
            if(isWrong) {
                btnClass = "bg-red-100 border-red-300 text-red-500 cursor-not-allowed opacity-75 animate-shake";
            }
            optionsHTML += `
                <button onclick="selectOption('${opt.key}')" ${isWrong ? 'disabled' : ''} class="w-full text-left p-3 rounded-xl border font-bold text-xs md:text-sm transition flex justify-between items-center group shadow-sm ${btnClass}">
                    <div class="flex items-center gap-3">
                        <span class="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs group-hover:bg-orange-200 transition">${opt.key}</span>
                        <code class="text-xs font-semibold">${opt.text}</code>
                    </div>
                    <span class="text-xs text-orange-500 opacity-0 group-hover:opacity-100 transition">點擊送出 ➔</span>
                </button>
            `;
        });
        optionsHTML += `</div>`;
        nextButtonHTML = optionsHTML;
    }

    card.innerHTML = `
        <div class="overflow-y-auto max-h-[380px] pr-1 flex flex-col gap-2">
            <div class="flex justify-between items-center">
                <span class="text-xs bg-orange-100 text-orange-600 font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">關卡 ${currentLevel.id} / 10</span>
                <span class="text-xs font-semibold text-amber-800">解鎖度: ${Math.round((gameState.unlockedLevelIndex / 9) * 100)}%</span>
            </div>
            ${dotsHTML}
            <h2 class="text-lg font-bold text-amber-950">${currentLevel.title}</h2>
            <p class="text-xs text-orange-950 font-semibold bg-orange-100/50 border border-orange-200 rounded-lg p-2.5 leading-relaxed">
                🔍 挑戰情境：${currentLevel.scenario}
            </p>
            <div class="text-xs text-amber-900/80 mt-1 leading-relaxed">
                <b>📚 語法講堂：</b>${currentLevel.syntax_desc}
            </div>
            ${solvedMessageHTML}
        </div>
        <div class="mt-4 pt-3 border-t border-white/30 flex flex-col gap-2">
            ${nextButtonHTML}
        </div>
    `;
}

function selectOption(key) {
    const currentLevel = gameLevels[gameState.currentLevelIndex];
    
    if (key === currentLevel.correct) {
        gameState.isCurrentLevelSolved = true;
        gameState.wrongSelections = [];
        
        if (gameState.currentLevelIndex === gameState.unlockedLevelIndex) {
            gameState.unlockedLevelIndex = Math.min(gameLevels.length - 1, gameState.currentLevelIndex + 1);
            localStorage.setItem('cat_flex_unlocked', gameState.unlockedLevelIndex);
        }

        playMeow(1.15);
        triggerHearts();
        
        if (currentLevel.id === 10) {
            triggerConfetti();
        }

        render();
    } else {
        if (!gameState.wrongSelections.includes(key)) {
            gameState.wrongSelections.push(key);
        }
        playFailBuzzer();
        
        render();
        
        const catBox = document.getElementById('catBox');
        catBox.classList.add('animate-shake');
        setTimeout(() => {
            catBox.classList.remove('animate-shake');
        }, 400);
    }
}

function triggerHearts() {
    const catBox = document.getElementById('catBox');
    const colors = ['❤️', '💖', '✨', '🐾', '😻'];
    
    for (let i = 0; i < 8; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart-particle text-xl';
        heart.innerText = colors[Math.floor(Math.random() * colors.length)];
        
        heart.style.left = `${Math.random() * 80 + 10}%`;
        heart.style.top = `${Math.random() * 50 + 20}%`;
        heart.style.animationDelay = `${Math.random() * 0.3}s`;
        
        catBox.appendChild(heart);
        
        setTimeout(() => { heart.remove(); }, 1600);
    }
}

// Celebrate game clearing
function triggerConfetti() {
    const catBox = document.getElementById('catBox');
    const items = ['🥫', '🐟', '👑', '✨', '⭐', '🌈'];
    
    for (let i = 0; i < 24; i++) {
        const can = document.createElement('div');
        can.className = 'can-particle text-xl';
        can.innerText = items[Math.floor(Math.random() * items.length)];
        
        can.style.left = `${Math.random() * 90}%`;
        can.style.top = `-20px`;
        can.style.animationDelay = `${Math.random() * 0.8}s`;
        can.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
        
        catBox.appendChild(can);
        
        setTimeout(() => { can.remove(); }, 3000);
    }
    playMeow(1.3);
    setTimeout(() => playMeow(1.4), 250);
    setTimeout(() => playMeow(1.5), 500);
}

function nextLevel() {
    if (gameState.currentLevelIndex < gameLevels.length - 1) {
        gameState.currentLevelIndex++;
        gameState.isCurrentLevelSolved = false;
        gameState.wrongSelections = [];
        playPurr();
        render();
    }
}

function goToLevel(idx) {
    if (idx <= gameState.unlockedLevelIndex) {
        gameState.currentLevelIndex = idx;
        gameState.isCurrentLevelSolved = false;
        gameState.wrongSelections = [];
        playPurr();
        render();
    } else {
        playFailBuzzer();
        document.getElementById('bottomHint').innerHTML = `🔒 這關還沒解鎖喔！請依序答對前面的關卡。`;
    }
}

function switchMode(mode) {
    gameState.mode = mode;
    playPurr();
    render();
}

// 修復2：window.onload 直接讀取 localStorage 並安全恢復歷史進度，隨後渲染畫面
window.onload = function() {
    const saved = localStorage.getItem('cat_flex_unlocked');
    if (saved !== null) {
        gameState.unlockedLevelIndex = parseInt(saved, 10);
    }
    render();
    setTimeout(() => {
        playMeow(1.0);
    }, 600);
}