let gameState = {
    level: 1,
    xp: 0,
    maxXp: 120,
    coins: 100,
    equipped: { hat: "none", acc: "none", bg: "none" },
    inventory: ["hat_party", "acc_ribbon"], 
    currentShopTab: "bg",
    usageSeconds: 463, 
    alertThresholdMinutes: 30, 
    targetFocusMinutes: 10,
    timerInterval: null,
    isTimerRunning: false,
    isTimerPaused: false,
    remainingSeconds: 600,
    attendance: {
        streak: 1,
        monthlyCount: 1,
        checkedToday: true,
        checkedDays: [20] 
    },
    weeklyStats: {
        lastWeek: [40, 60, 30, 90, 50, 120, 80],
        thisWeek: [50, 75, 45, 110, 80, 140, 0]
    },
    missions: [
        { id: 1, title: "아침 기상 후 물 한 잔 마시기 💧", completed: false },
        { id: 2, title: "스마트폰 내려두고 스트레칭 🧘", completed: false }
    ]
};

const levelRewards = {
    1: { id: "bg_default", name: "시작의 공간", icon: "🏠", type: "bg" },
    2: { id: "hat_crown", name: "왕관", icon: "👑", type: "hat" },
    3: { id: "bg_galaxy", name: "우주 속으로", icon: "🌌", type: "bg", color: "#1a1c2e" },
    4: { id: "acc_monocle", name: "기사의 혜안", icon: "🧐", type: "acc" },
    5: { id: "bg_palace", name: "황금 궁전", icon: "🏰", type: "bg", color: "#fef3c7" },
    6: { id: "hat_angel", name: "천사 고리", icon: "😇", type: "hat" },
    7: { id: "bg_candy", name: "달콤 캔디랜드", icon: "🍭", type: "bg", color: "#fce7f3" },
    8: { id: "acc_magic_wand", name: "마법 요술봉", icon: "🪄", type: "acc" },
    9: { id: "hat_dragon", name: "아기용 모자", icon: "🐲", type: "hat" },
    10: { id: "bg_rainbow_castle", name: "꿈의 무지개 성", icon: "🌈", type: "bg", color: "#ecfdf5" }
};

const wearableItems = [
    { id: "hat_party", name: "꼬마 고깔모자", icon: "🎪", type: "hat" },
    { id: "acc_ribbon", name: "빨간 나비리본", icon: "🎀", type: "acc" },
    { id: "hat_flower", name: "노란 꽃모자", icon: "🌼", type: "hat" },
    { id: "acc_necklace", name: "진주 목걸이", icon: "📿", type: "acc" },
    { id: "dec_lamp", name: "감성 스탠드", icon: "💡", type: "acc" },
    { id: "dec_book", name: "마음의 양식", icon: "📚", type: "acc" },
    { id: "dec_pencil", name: "행운의 연필", icon: "✏️", type: "acc" },
    { id: "acc_glasses", name: "지적인 안경", icon: "👓", type: "acc" },
    { id: "hat_ribbon", name: "핑크 리본모자", icon: "🎀", type: "hat" },
    { id: "acc_bowtie", name: "하늘색 보우타이", icon: "👔", type: "acc" },
    levelRewards[2], levelRewards[4], levelRewards[6], levelRewards[8], levelRewards[9]
];

const backgroundItems = [
    { id: "bg_default", name: "기본 공간", icon: "", type: "bg", color: "#f7f3e9" },
    { id: "bg_ocean", name: "바닷속 세계", icon: "🐠", type: "bg", color: "#e0f2fe" },
    { id: "bg_sparkle_forest", name: "반짝이는 숲", icon: "✨", type: "bg", color: "#dcfce7" },
    { id: "bg_night", name: "별빛 밤하늘", icon: "🌙", type: "bg", color: "#1e293b" },
    { id: "bg_rainbow", name: "무지개 동산", icon: "🌈", type: "bg", color: "#fef9c3" },
    { id: "bg_sky", name: "푸른 하늘", icon: "☁️", type: "bg", color: "#bae6fd" },
    levelRewards[3], levelRewards[5], levelRewards[7], levelRewards[10]
];

const allItems = [...wearableItems, ...backgroundItems];

const shopItems = {
    bg: [
        { id: "bg_ocean", name: "바닷속 세계", icon: "🐠", price: 300, type: "bg", color: "#e0f2fe" },
        { id: "bg_sparkle_forest", name: "반짝이는 숲", icon: "✨", price: 300, type: "bg", color: "#dcfce7" },
        { id: "bg_sky", name: "푸른 하늘", icon: "☁️", price: 150, type: "bg", color: "#bae6fd" },
        { id: "bg_night", name: "별빛 밤하늘", icon: "🌙", price: 200, type: "bg", color: "#1e293b" },
        { id: "bg_rainbow", name: "무지개 동산", icon: "🌈", price: 250, type: "bg", color: "#fef9c3" }
    ],
    acc: [
        { id: "hat_flower", name: "노란 꽃모자", icon: "🌼", price: 180, type: "hat" },
        { id: "acc_necklace", name: "진주 목걸이", icon: "📿", price: 220, type: "acc" },
        { id: "dec_lamp", name: "감성 스탠드", icon: "💡", price: 150, type: "acc" },
        { id: "dec_book", name: "마음의 양식", icon: "📚", price: 100, type: "acc" },
        { id: "dec_pencil", name: "행운의 연필", icon: "✏️", price: 80, type: "acc" },
        { id: "acc_glasses", name: "지적인 안경", icon: "👓", price: 140, type: "acc" }
    ]
};

window.onload = function() {
    startUsageTracking();
    updateAllUI();
    renderAttendance();

window.onUserReady = async function() {
        if (window.loadUserDataFromFirebase) {
            const data = await window.loadUserDataFromFirebase();
            if (data) {
                if (data.coins !== undefined) gameState.coins = data.coins;
                if (data.inventory) gameState.inventory = data.inventory;
                if (data.equipped) gameState.equipped = data.equipped;
                if (data.missions) gameState.missions = data.missions;
                
                const raw = data.weeklyFocusMinutes || [0,0,0,0,0,0,0];
                gameState.weeklyStats.thisWeek = [raw[1], raw[2], raw[3], raw[4], raw[5], raw[6], raw[0]];
                if (data.attendanceStreak !== undefined) gameState.attendance.streak = data.attendanceStreak;

                updateAllUI();
                renderAttendance();
            }
        }
    };

    const missionInput = document.getElementById('custom-mission-input');
    if (missionInput) {
        missionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addCustomMission();
        });
    }

    window.addEventListener('keydown', function(e) {
        const modal = document.getElementById('level-up-modal');
        if (modal && e.key === 'Enter' && modal.style.display === 'flex') {
            closeLevelUpModal();
        }
    });
};

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
    
    const targetScreen = document.getElementById('screen-' + id);
    if (targetScreen) targetScreen.classList.add('active');

    const activeNavBtn = document.querySelector(`.nav-${id}`);
    if (activeNavBtn) activeNavBtn.classList.add('active');

    if (id === 'decor') renderInventory();
    if (id === 'shop') renderShop();
    if (id === 'attendance') renderAttendance();
}

function updateAllUI() {
    const lvlDisp = document.getElementById('level-display');
    const coinDisp = document.getElementById('coin-display');
    if (lvlDisp) lvlDisp.innerText = `Lv.${gameState.level}`;
    if (coinDisp) coinDisp.innerText = `🪙 ${gameState.coins}`;
    
    const xpPercent = Math.min(100, Math.floor((gameState.xp / gameState.maxXp) * 100));
    const xpBar = document.getElementById('xp-bar');
    if (xpBar) xpBar.style.width = `${xpPercent}%`;

    const plantImg = document.getElementById('plant-img');
    if (plantImg) {
        const plantStage = Math.min(gameState.level, 6);
        plantImg.src = `lv${plantStage}.png`;
    }

    const hat = allItems.find(i => i.id === gameState.equipped.hat);
    const acc = allItems.find(i => i.id === gameState.equipped.acc);
    const bg = backgroundItems.find(i => i.id === gameState.equipped.bg);

    const wearHat = document.getElementById('wear-hat');
    const wearAcc = document.getElementById('wear-acc');
    if (wearHat) wearHat.innerText = hat ? hat.icon : "";
    if (wearAcc) wearAcc.innerText = acc ? acc.icon : "";
    
    const room = document.getElementById('room');
    const bgLayer = document.getElementById('room-bg-layer');
    if (room) {
        if (bg) {
            room.style.backgroundColor = bg.color;
            if (bgLayer) bgLayer.innerText = bg.icon || "";
        } else {
            room.style.backgroundColor = "#f7f3e9";
            if (bgLayer) bgLayer.innerText = "";
        }
    }

    const equippedHatText = hat ? hat.name : '';
    const equippedAccText = acc ? acc.name : '';
    const equippedText = [equippedHatText, equippedAccText].filter(Boolean).join(', ');
    const banner = document.getElementById('equipped-banner');
    if (banner) banner.innerText = equippedText ? `👗 착용: ${equippedText}` : "🪴 기본 식물 공간";

    renderMissions();
    updateUsageDisplay();
}

function gainXP(amount) {
    gameState.xp += amount;
    while (gameState.xp >= gameState.maxXp) {
        gameState.xp -= gameState.maxXp;
        gameState.level++;
        gameState.maxXp = Math.round(gameState.maxXp * 1.8);
        
        let rewardCoin = 50 + (gameState.level * 10);
        gameState.coins += rewardCoin;

        const specialReward = levelRewards[gameState.level];
        if (specialReward && !gameState.inventory.includes(specialReward.id)) {
            gameState.inventory.push(specialReward.id);
        }
        openLevelUpModal(gameState.level, rewardCoin, specialReward);
    }
    updateAllUI();
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = "";

    const userOwnedItems = gameState.inventory.map(itemId => allItems.find(i => i.id === itemId)).filter(Boolean);

    if (userOwnedItems.length === 0) {
        grid.innerHTML = `<div style="grid-column: span 2; text-align: center; color: #888; padding: 30px;">보관함이 비어있습니다. 코인숍에서 아이템을 구매해보세요!</div>`;
        return;
    }

    userOwnedItems.forEach(item => {
        const isEquipped = gameState.equipped[item.type] === item.id;
        const div = document.createElement('div');
        div.className = "item-card";
        div.innerHTML = `
            <div class="item-icon">${item.icon || "🎁"}</div>
            <div class="item-name">${item.name}</div>
            <button class="item-btn ${isEquipped ? 'equipped' : ''}" onclick="toggleEquip('${item.id}')">
                ${isEquipped ? '해제' : '착용'}
            </button>
        `;
        grid.appendChild(div);
    });
}

function toggleEquip(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    if (gameState.equipped[item.type] === item.id) {
        gameState.equipped[item.type] = "none";
    } else {
        gameState.equipped[item.type] = item.id;
    }
    updateAllUI();
    renderInventory();
}

function switchShopTab(tab) {
    gameState.currentShopTab = tab;
    document.getElementById('tab-bg').classList.toggle('active', tab === 'bg');
    document.getElementById('tab-acc').classList.toggle('active', tab === 'acc');
    renderShop();
}

function renderShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    grid.innerHTML = "";

    const items = shopItems[gameState.currentShopTab] || [];
    items.forEach(item => {
        const isBought = gameState.inventory.includes(item.id);
        const div = document.createElement('div');
        div.className = "item-card";
        div.innerHTML = `
            <div class="item-icon">${item.icon || "🎨"}</div>
            <div class="item-name">${item.name}</div>
            <button class="item-btn ${isBought ? 'bought' : ''}" onclick="buyItem('${item.id}', ${item.price})" ${isBought ? 'disabled' : ''}>
                ${isBought ? '보유중' : item.price + ' 코인'}
            </button>
        `;
        grid.appendChild(div);
    });
}

function buyItem(id, price) {
    if (gameState.coins < price) {
        alert("코인이 부족합니다!");
        return;
    }
    gameState.coins -= price;
    gameState.inventory.push(id);
    alert("🛍️ 아이템을 구매했습니다!");
    updateAllUI();
    renderShop();
}

function renderAttendance() {
    const streakEl = document.getElementById('streak-days');
    const monthlyEl = document.getElementById('monthly-count');
    if (streakEl) streakEl.innerText = gameState.attendance.streak;
    if (monthlyEl) monthlyEl.innerText = gameState.attendance.monthlyCount;

    const calendar = document.getElementById('calendar');
    if (calendar) {
        calendar.innerHTML = "";
        for (let day = 1; day <= 30; day++) {
            const div = document.createElement('div');
            div.className = "day-cell";
            if (day === 20) div.classList.add('today'); 
            if (gameState.attendance.checkedDays.includes(day)) {
                div.classList.add('checked');
            }
            div.innerText = day;
            calendar.appendChild(div);
        }
    }
    renderWeeklyChart();
}

function renderWeeklyChart() {
    const chartContainer = document.getElementById('weekly-chart');
    if (!chartContainer) return;
    chartContainer.innerHTML = "";

    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const lastWeek = gameState.weeklyStats.lastWeek;
    const thisWeek = gameState.weeklyStats.thisWeek;
    const maxVal = Math.max(...lastWeek, ...thisWeek, 120);

    days.forEach((day, idx) => {
        const lastH = (lastWeek[idx] / maxVal) * 100;
        const thisH = (thisWeek[idx] / maxVal) * 100;

        const col = document.createElement('div');
        col.className = 'chart-col';
        col.innerHTML = `
            <div class="bars-wrap">
                <div class="bar last-week" style="height: ${lastH}%" title="지난주 ${day}요일: ${lastWeek[idx]}분"></div>
                <div class="bar this-week" style="height: ${thisH}%" title="이번주 ${day}요일: ${thisWeek[idx]}분"></div>
            </div>
            <div class="day-label">${day}</div>
        `;
        chartContainer.appendChild(col);
    });
}

async function syncWeeklyStatsFromFirebase() {
    if (!window.loadWeeklyStatsFromFirebase) return;
    const data = await window.loadWeeklyStatsFromFirebase();
    if (!data) return;

    const raw = data.weeklyFocusMinutes || [0,0,0,0,0,0,0];
    gameState.weeklyStats.thisWeek = [raw[1], raw[2], raw[3], raw[4], raw[5], raw[6], raw[0]];

    if (data.attendanceStreak !== undefined) {
        gameState.attendance.streak = data.attendanceStreak;
    }

    renderAttendance();
}

function renderMissions() {
    const list = document.getElementById('mission-list');
    const countDisplay = document.getElementById('mission-count');
    if (!list) return;

    list.innerHTML = "";
    const completedCount = gameState.missions.filter(m => m.completed).length;
    if (countDisplay) countDisplay.innerText = `${completedCount}/${gameState.missions.length} 완료`;

    gameState.missions.forEach((m) => {
        const div = document.createElement('div');
        div.className = "mission-item";
        div.innerHTML = `
            <span class="mission-text" style="${m.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${m.title}</span>
            <div>
                <button class="claim-btn ${m.completed ? 'done' : ''}" onclick="claimMission(${m.id})">${m.completed ? '✓' : '완료'}</button>
                <button class="delete-btn" onclick="deleteMission(${m.id})">✕</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function claimMission(id) {
    const mission = gameState.missions.find(m => m.id === id);
    if (mission && !mission.completed) {
        mission.completed = true;
        gameState.coins += 20;
        gainXP(35);
    }
}

function addCustomMission() {
    const input = document.getElementById('custom-mission-input');
    const title = input.value.trim();
    if (!title) return alert("미션 내용을 입력해주세요!");
    gameState.missions.push({ id: Date.now(), title: title, completed: false });
    input.value = "";
    updateAllUI();
}

function deleteMission(id) {
    gameState.missions = gameState.missions.filter(m => m.id !== id);
    updateAllUI();
}

function adjustTargetTime(min) {
    if (gameState.isTimerRunning || gameState.isTimerPaused) return;
    gameState.targetFocusMinutes = Math.max(1, gameState.targetFocusMinutes + min);
    document.getElementById('target-time-display').innerText = gameState.targetFocusMinutes + "분";
    gameState.remainingSeconds = gameState.targetFocusMinutes * 60;
    updateTimerDisplay(gameState.remainingSeconds);
}

function updateTimerDisplay(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    document.getElementById('timer').innerText = `00:${m}:${s}`;
}

function handleMainTimerBtn() {
    if (!gameState.isTimerRunning && !gameState.isTimerPaused) {
        gameState.remainingSeconds = gameState.targetFocusMinutes * 60;
        startTimer();
    } else if (gameState.isTimerRunning) {
        pauseTimer();
    } else if (gameState.isTimerPaused) {
        startTimer();
    }
}

function startTimer() {
    gameState.isTimerRunning = true;
    gameState.isTimerPaused = false;
    document.getElementById('timer-main-btn').innerText = "잠시 멈추기 ⏸️";
    document.getElementById('timer-stop-btn').style.display = "inline-block";

    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        gameState.remainingSeconds--;
        updateTimerDisplay(gameState.remainingSeconds);
        if (gameState.remainingSeconds <= 0) {
            clearInterval(gameState.timerInterval);
            finishTimer();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(gameState.timerInterval);
    gameState.isTimerRunning = false;
    gameState.isTimerPaused = true;
    document.getElementById('timer-main-btn').innerText = "이어서 시작 ▶️";
}

function resetTimer() {
    clearInterval(gameState.timerInterval);
    gameState.isTimerRunning = false;
    gameState.isTimerPaused = false;
    gameState.remainingSeconds = gameState.targetFocusMinutes * 60;
    updateTimerDisplay(gameState.remainingSeconds);
    document.getElementById('timer-main-btn').innerText = "집중 시작하기 ✨";
    document.getElementById('timer-stop-btn').style.display = "none";
}

async function finishTimer() {
    resetTimer();
    const mins = gameState.targetFocusMinutes;
    const gainedXP = mins * 5;
    const gainedCoins = mins * 3;

    if (window.saveFocusMinutesToFirebase) {
        await window.saveFocusMinutesToFirebase(mins);
        await syncWeeklyStatsFromFirebase();
    }

    gameState.coins += gainedCoins;
    alert(`🎉 ${mins}분 집중 완료!\n+${gainedXP} XP / +🪙 ${gainedCoins} 코인 획득!`);
    gainXP(gainedXP);
}

function startUsageTracking() {
    setInterval(() => {
        gameState.usageSeconds++;
        updateUsageDisplay();
    }, 1000);
}

function updateUsageDisplay() {
    const h = Math.floor(gameState.usageSeconds / 3600);
    const m = Math.floor((gameState.usageSeconds % 3600) / 60);
    const s = gameState.usageSeconds % 60;
    const text = document.getElementById('usage-time-display');
    if (text) text.innerText = `${h}시간 ${m}분 ${s}초`;

    const targetSec = gameState.alertThresholdMinutes * 60;
    const percent = Math.min(100, Math.floor((gameState.usageSeconds / targetSec) * 100));

    const circle = document.getElementById('usage-circle');
    const progressBar = document.getElementById('usage-progress-bar');
    if (circle) circle.innerText = `${percent}%`;
    if (progressBar) progressBar.style.width = `${percent}%`;
}

function setAlertThreshold(minutes) {
    gameState.alertThresholdMinutes = minutes;
    document.querySelectorAll('.alert-option-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`alert-btn-${minutes}`);
    if (targetBtn) targetBtn.classList.add('active');
    updateUsageDisplay();
}

function showLevelRewardsInfo() {
    const roadmapModal = document.getElementById('roadmap-modal');
    const roadmapList = document.getElementById('roadmap-list');
    if (!roadmapModal || !roadmapList) return;

    roadmapList.innerHTML = "";

    for (let lvl = 1; lvl <= 10; lvl++) {
        const isReached = gameState.level >= lvl;
        const isCurrent = gameState.level === lvl;
        const reward = levelRewards[lvl];

        const itemDiv = document.createElement('div');
        itemDiv.className = `roadmap-step ${isReached ? 'achieved' : ''} ${isCurrent ? 'current' : ''}`;

        itemDiv.innerHTML = `
            <div class="roadmap-node">
                <span class="node-dot"></span>
            </div>
            <div class="roadmap-card">
                <div class="roadmap-lvl">Lv.${lvl} ${isCurrent ? '<span class="current-tag">NOW</span>' : ''}</div>
                <div class="roadmap-info">
                    <div class="roadmap-icon-wrap">${reward ? reward.icon : "🪙"}</div>
                    <div class="roadmap-text">
                        <div class="reward-title">${reward ? reward.name : '달성 보상'}</div>
                        <div class="reward-sub">+ ${50 + (lvl * 10)} 코인</div>
                    </div>
                </div>
            </div>
        `;
        roadmapList.appendChild(itemDiv);
    }

    roadmapModal.style.display = 'flex';
}

function closeRoadmapModal() {
    const modal = document.getElementById('roadmap-modal');
    if (modal) modal.style.display = 'none';
}

function openLevelUpModal(lvl, coins, specialItem) {
    const modal = document.getElementById('level-up-modal');
    if (!modal) return;

    document.getElementById('modal-level-num').innerText = `Lv.${lvl}`;
    const iconSlot = document.getElementById('modal-reward-item');
    const textSlot = document.getElementById('modal-reward-text');
    
    if (specialItem) {
        iconSlot.innerText = specialItem.icon;
        textSlot.innerHTML = `${specialItem.name}<br><span style="font-size:0.85rem; color:#ff8fa3;">+ 🪙 ${coins} 코인</span>`;
    } else {
        iconSlot.innerText = "🪙";
        textSlot.innerText = `${coins} 코인 획득!`;
    }
    modal.style.display = 'flex';
}

function closeLevelUpModal() {
    const modal = document.getElementById('level-up-modal');
    if (modal) modal.style.display = 'none';
}
