import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    arrayUnion, 
    collection, 
    addDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyCwqkkod97NQ6n7refHH9P9rY0vjEBSMMk",
    authDomain: "test2-b7ccb.firebaseapp.com",
    projectId: "test2-b7ccb",
    storageBucket: "test2-b7ccb.firebasestorage.app",
    messagingSenderId: "1095135627775",
    appId: "1:1095135627775:web:33fd7950f50d6d9ae43fca"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

let gameState = {
    level: 1,
    xp: 0,
    maxXp: 120,
    coins: 50,
    equipped: { 
        bg: "none",
        vde: "none",
        de: [null, null, null]
    },
    inventory: [], // 처음에는 기본 제공 아이템 없이 완전히 비어있음 (코인숍에서 사야 함)
    currentShopTab: "bg",
    currentDecorTab: "all",
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
        checkedToday: false,
        checkedDays: [] 
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

// 이미지 기반 장식/배경 아이템 모음
const allItems = [
    { id: "bg1", name: "쿨톤 방", type: "bg", img: "bg1.png" },
    { id: "bg2", name: "웜톤 방", type: "bg", img: "bg2.png" },
    { id: "de1", name: "노란 나비", type: "de", img: "de1.png" },
    { id: "de2", name: "무당벌레", type: "de", img: "de2.png" },
    { id: "de3", name: "보라 커튼 창문", type: "de", img: "de3.png" },
    { id: "de4", name: "연두 벽시계", type: "de", img: "de4.png" },
    { id: "de5", name: "꽃 액자", type: "de", img: "de5.png" },
    { id: "vde1", name: "도토리 장식", type: "vde", img: "vde1.png" },
    { id: "vde2", name: "네잎클로버", type: "vde", img: "vde2.png" }
];

// 코인숍 판매 상품 목록
const shopItems = {
    bg: [
        { id: "bg1", name: "쿨톤 방", price: 150, type: "bg", img: "bg1.png" },
        { id: "bg2", name: "웜톤 방", price: 150, type: "bg", img: "bg2.png" }
    ],
    de: [
        { id: "de1", name: "노란 나비", price: 100, type: "de", img: "de1.png" },
        { id: "de2", name: "무당벌레", price: 100, type: "de", img: "de2.png" },
        { id: "de3", name: "보라 커튼 창문", price: 180, type: "de", img: "de3.png" },
        { id: "de4", name: "연두 벽시계", price: 120, type: "de", img: "de4.png" },
        { id: "de5", name: "꽃 액자", price: 140, type: "de", img: "de5.png" }
    ],
    vde: [
        { id: "vde1", name: "도토리 장식", price: 90, type: "vde", img: "vde1.png" },
        { id: "vde2", name: "네잎클로버", price: 90, type: "vde", img: "vde2.png" }
    ]
};

// Auth State Changed & Firestore Data Load
onAuthStateChanged(auth, async (user) => {
    const unloggedView = document.getElementById("auth-unlogged");
    const loggedView = document.getElementById("auth-logged");
    const userDisplayEmail = document.getElementById("user-display-email");

    if (user) {
        currentUser = user;
        if (unloggedView) unloggedView.style.display = "none";
        if (loggedView) loggedView.style.display = "block";
        if (userDisplayEmail) userDisplayEmail.innerText = user.email;

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.coins !== undefined) gameState.coins = data.coins;
            if (data.level !== undefined) gameState.level = data.level;
            if (data.inventory) gameState.inventory = data.inventory;
            
            const raw = data.weeklyFocusMinutes || [0,0,0,0,0,0,0]; // [일,월,화,수,목,금,토]
            gameState.weeklyStats.thisWeek = [raw[1], raw[2], raw[3], raw[4], raw[5], raw[6], raw[0]]; // 월~일로 순서 변환
            
            if (data.attendance) {
                gameState.attendance.checkedDays = data.attendance; // ["2026-08-20", "2026-08-25", ...]
                gameState.attendance.monthlyCount = data.attendance.length;
            }   

            renderAttendance();   // 그래프도 즉시 다시 그리기
            updateAllUI();
        }
    } else {
        currentUser = null;
        if (unloggedView) unloggedView.style.display = "block";
        if (loggedView) loggedView.style.display = "none";
    }
});

async function syncGameStateToFirebase() {
    if (!currentUser) return;
    try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            coins: gameState.coins,
            level: gameState.level,
            inventory: gameState.inventory,
            missions: gameState.missions   // ⬅️ 추가

        });
    } catch (e) {
        console.error("Firestore 저장 실패:", e);
    }
}

window.onload = function() {
    startUsageTracking();
    updateAllUI();
    renderAttendance();

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

    const xpText = document.getElementById('xp-text');
    if (xpText) xpText.innerText = gameState.level >= 6 ? "MAX" : `${gameState.xp} / ${gameState.maxXp}`;

    const plantImg = document.getElementById('plant-img');
    if (plantImg) {
        const plantStage = Math.min(gameState.level, 6);
        plantImg.src = `lv${plantStage}.png`;
    }

    const bgItem = allItems.find(i => i.id === gameState.equipped.bg);
    const room = document.getElementById('room');
    if (room) {
        if (bgItem && bgItem.img) {
            room.style.backgroundImage = `url('${bgItem.img}')`;
            room.style.backgroundColor = "transparent";
        } else {
            room.style.backgroundImage = "none";
            room.style.backgroundColor = "#f7f3e9";
        }
    }

    for (let i = 0; i < 3; i++) {
        const slotEl = document.getElementById(`bg-decor-${i + 1}`);
        const equippedId = gameState.equipped.de[i];
        const item = allItems.find(it => it.id === equippedId);

        if (slotEl) {
            if (item && item.img) {
                slotEl.innerHTML = `<img src="${item.img}" alt="${item.name}">`;
            } else {
                slotEl.innerHTML = "";
            }
        }
    }

    const vdeSlot = document.getElementById('vde-decor');
    const vdeItem = allItems.find(i => i.id === gameState.equipped.vde);
    if (vdeSlot) {
        if (vdeItem && vdeItem.img) {
            vdeSlot.innerHTML = `<img src="${vdeItem.img}" alt="${vdeItem.name}">`;
        } else {
            vdeSlot.innerHTML = "";
        }
    }

    const banner = document.getElementById('equipped-banner');
    if (banner) {
        banner.innerText = bgItem ? `🪴 ${bgItem.name}` : "🪴 기본 식물 공간";
    }

    renderMissions();
    updateUsageDisplay();
}

function gainXP(amount) {
    if (gameState.level >= 6) {
        gameState.xp = gameState.maxXp;
        updateAllUI();
        return;
    }

    gameState.xp += amount;
    while (gameState.xp >= gameState.maxXp && gameState.level < 6) {
        gameState.xp -= gameState.maxXp;
        gameState.level++;
        gameState.maxXp = Math.round(gameState.maxXp * 1.8);
        
        let rewardCoin = 50 + (gameState.level * 10);
        gameState.coins += rewardCoin;

        openLevelUpModal(gameState.level, rewardCoin);
    }

    if (gameState.level >= 6) {
        gameState.xp = gameState.maxXp;
    }

    updateAllUI();
    syncGameStateToFirebase();
}

function switchDecorTab(tab) {
    gameState.currentDecorTab = tab;
    document.querySelectorAll('#screen-decor .shop-pill').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`decor-tab-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');
    renderInventory();
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = "";

    let ownedItems = gameState.inventory.map(itemId => allItems.find(i => i.id === itemId)).filter(Boolean);

    if (gameState.currentDecorTab !== 'all') {
        ownedItems = ownedItems.filter(item => item.type === gameState.currentDecorTab);
    }

    if (ownedItems.length === 0) {
        grid.innerHTML = `<div style="grid-column: span 2; text-align: center; color: #888; padding: 30px;">보유한 아이템이 없습니다.<br>코인숍에서 배경이나 장식을 구매해 보세요!</div>`;
        return;
    }

    ownedItems.forEach(item => {
        let isEquipped = false;
        let slotBadge = null;

        if (item.type === 'de') {
            const slotIndex = gameState.equipped.de.indexOf(item.id);
            if (slotIndex !== -1) {
                isEquipped = true;
                const circleNumbers = ['①', '②', '③'];
                slotBadge = circleNumbers[slotIndex];
            }
        } else {
            isEquipped = (gameState.equipped[item.type] === item.id);
        }

        const div = document.createElement('div');
        div.className = "item-card";
        div.innerHTML = `
            ${slotBadge ? `<div class="slot-badge-icon">${slotBadge}</div>` : ''}
            <div class="item-icon">
                <img src="${item.img}" alt="${item.name}">
            </div>
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

    if (item.type === 'de') {
        const existingSlotIndex = gameState.equipped.de.indexOf(itemId);
        if (existingSlotIndex !== -1) {
            gameState.equipped.de[existingSlotIndex] = null;
        } else {
            const emptySlotIndex = gameState.equipped.de.findIndex(slot => slot === null);
            if (emptySlotIndex !== -1) {
                gameState.equipped.de[emptySlotIndex] = itemId;
            } else {
                alert("배경 장식은 동시에 최대 3개까지만 착용할 수 있습니다!\n기존 장식을 해제 후 착용해주세요.");
                return;
            }
        }
    } else {
        if (gameState.equipped[item.type] === itemId) {
            gameState.equipped[item.type] = "none";
        } else {
            gameState.equipped[item.type] = itemId;
        }
    }

    updateAllUI();
    renderInventory();
}

function switchShopTab(tab) {
    gameState.currentShopTab = tab;
    document.querySelectorAll('#screen-shop .shop-pill').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');
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
            <div class="item-icon">
                <img src="${item.img}" alt="${item.name}">
            </div>
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
    alert("🛍️ 아이템을 구매했습니다! 보관함에서 확인 후 착용해 보세요.");
    updateAllUI();
    renderShop();
    syncGameStateToFirebase();
}

function renderAttendance() {
    const streakEl = document.getElementById('streak-days');
    const monthlyEl = document.getElementById('monthly-count');
    if (streakEl) streakEl.innerText = gameState.attendance.streak;
    if (monthlyEl) monthlyEl.innerText = gameState.attendance.monthlyCount;

    const calendar = document.getElementById('calendar');
    if (calendar) {
        calendar.innerHTML = "";

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0~11
        const todayDay = now.getDate();

        // 이번 달의 실제 마지막 날짜 계산 (28~31일 자동 대응)
        const lastDateOfMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= lastDateOfMonth; day++) {
            const div = document.createElement('div');
            div.className = "day-cell";
            if (day === todayDay) div.classList.add('today');

            // "YYYY-MM-DD" 형식으로 만들어서 Firestore 저장 형식과 비교
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (gameState.attendance.checkedDays.includes(dateStr)) {
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
                <div class="bar last-week" style="height: ${lastH}%"></div>
                <div class="bar this-week" style="height: ${thisH}%"></div>
            </div>
            <div class="day-label">${day}</div>
        `;
        chartContainer.appendChild(col);
    });
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
//미션클리어보상
function claimMission(id) {
    const mission = gameState.missions.find(m => m.id === id);
    if (mission && !mission.completed) {
        mission.completed = true;
        gameState.coins += 2;
        gainXP(10);
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
//집중완료보상
async function finishTimer() {
    resetTimer();
    const mins = gameState.targetFocusMinutes;
    const gainedXP = mins * 20;
    const gainedCoins = mins * 5;
    if (window.saveFocusMinutesToFirebase) {
        const updatedArr = await window.saveFocusMinutesToFirebase(mins); // [일,월,화,수,목,금,토]
        gameState.weeklyStats.thisWeek = [updatedArr[1], updatedArr[2], updatedArr[3], updatedArr[4], updatedArr[5], updatedArr[6], updatedArr[0]];
        renderAttendance();
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

    for (let lvl = 1; lvl <= 6; lvl++) {
        const isReached = gameState.level >= lvl;
        const isCurrent = gameState.level === lvl;

        const itemDiv = document.createElement('div');
        itemDiv.className = `roadmap-step ${isReached ? 'achieved' : ''} ${isCurrent ? 'current' : ''}`;

        itemDiv.innerHTML = `
            <div class="roadmap-node">
                <span class="node-dot"></span>
            </div>
            <div class="roadmap-card">
                <div class="roadmap-lvl">Lv.${lvl} ${isCurrent ? '<span class="current-tag">NOW</span>' : ''}</div>
                <div class="roadmap-info">
                    <div class="roadmap-icon-wrap">🪙</div>
                    <div class="roadmap-text">
                        <div class="reward-title">레벨 달성 보상</div>
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

function openLevelUpModal(lvl, coins) {
    const modal = document.getElementById('level-up-modal');
    if (!modal) return;

    document.getElementById('modal-level-num').innerText = `Lv.${lvl}`;
    const iconSlot = document.getElementById('modal-reward-item');
    const textSlot = document.getElementById('modal-reward-text');
    
    iconSlot.innerText = "🪙";
    textSlot.innerText = `${coins} 코인 획득!`;

    modal.style.display = 'flex';
}

function closeLevelUpModal() {
    const modal = document.getElementById('level-up-modal');
    if (modal) modal.style.display = 'none';
}

// -------------------------------------------------------------
// FIREBASE 연동 모달 & 서비스 로직
// -------------------------------------------------------------

window.openAuthModal = function() {
    document.getElementById('auth-modal').style.display = 'flex';
};
window.closeAuthModal = function() {
    document.getElementById('auth-modal').style.display = 'none';
};

window.openGroupModal = function() {
    document.getElementById('group-modal').style.display = 'flex';
};
window.closeGroupModal = function() {
    document.getElementById('group-modal').style.display = 'none';
};

window.signUpFirebase = async function() {
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    const nickname = document.getElementById("auth-nickname").value;

    if (!email || !password) return alert("이메일과 비밀번호를 입력하세요.");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            nickname: nickname || "사용자",
            level: 1,
            coins: 50,
            inventory: [],
            attendance: [],
            groupIds: [],
            weeklyFocusMinutes: [0, 0, 0, 0, 0, 0, 0],   // ⬅️ 추가 (일~토)
            missions: [
                { id: 1, title: "아침 기상 후 물 한 잔 마시기 💧", completed: false },
                { id: 2, title: "스마트폰 내려두고 스트레칭 🧘", completed: false }
            ],
            lastMissionResetDate: getMissionDateKey()   // ⬅️ 문제 2에서 쓸 값, 아래서 설명
        });

        alert("회원가입 완료 및 로그인되었습니다!");
        closeAuthModal();
    } catch (error) {
        alert("회원가입 오류: " + error.message);
    }

    
};

window.saveFocusMinutesToFirebase = async function(minutes) {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    const data = snap.data();
    let weeklyArr = data.weeklyFocusMinutes || [0,0,0,0,0,0,0];
    const todayIndex = new Date().getDay(); // 일=0 ~ 토=6
    weeklyArr[todayIndex] += minutes;
    await updateDoc(userRef, { weeklyFocusMinutes: weeklyArr });
    return weeklyArr;
};

window.loginFirebase = async function() {
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;

    if (!email || !password) return alert("이메일과 비밀번호를 입력하세요.");

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("성공적으로 로그인되었습니다!");
        closeAuthModal();
    } catch (error) {
        alert("로그인 실패: 이메일이나 비밀번호를 확인하세요.");
    }
};

window.logoutFirebase = async function() {
    try {
        await signOut(auth);
        alert("로그아웃되었습니다.");
        closeAuthModal();
    } catch (error) {
        console.error("로그아웃 에러:", error);
    }
};

window.checkAttendanceFirebase = async function() {
    if (!currentUser) return alert("로그인이 필요합니다. 상단 👤 버튼으로 로그인하세요!");

    const today = new Date().toISOString().split('T')[0];
    const todayDay = new Date().getDate();
    const userRef = doc(db, "users", currentUser.uid);

    try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const attendanceList = userData.attendance || [];

            if (attendanceList.includes(today)) {
                alert("오늘 이미 출석체크를 완료하셨습니다!");
                return;
            }

            gameState.coins += 10;
            gameState.attendance.streak += 1;
            gameState.attendance.monthlyCount += 1;
            
            if (!gameState.attendance.checkedDays.includes(today)) {
                gameState.attendance.checkedDays.push(today);
            }
            gameState.attendance.monthlyCount = gameState.attendance.checkedDays.length;

            await updateDoc(userRef, {
                attendance: arrayUnion(today),
                coins: gameState.coins
            });

            updateAllUI();
            renderAttendance();
            alert("🎉 오늘 출석체크 완료! 10 코인이 적립되었습니다.");
        }
    } catch (error) {
        console.error("출석체크 오류:", error);
    }
};

window.createGroupFirebase = async function() {
    if (!currentUser) return alert("로그인이 필요합니다.");

    const groupName = document.getElementById("group-name-input").value;
    const groupDesc = document.getElementById("group-desc-input").value;

    if (!groupName) return alert("그룹 이름을 입력해주세요.");

    try {
        const groupRef = await addDoc(collection(db, "groups"), {
            name: groupName,
            description: groupDesc,
            ownerId: currentUser.uid,
            members: [currentUser.uid],
            createdAt: new Date()
        });

        await updateDoc(doc(db, "users", currentUser.uid), {
            groupIds: arrayUnion(groupRef.id)
        });

        alert(`🎉 그룹이 생성되었습니다!\n그룹 ID: ${groupRef.id}`);
        closeGroupModal();
    } catch (error) {
        console.error("그룹 생성 오류:", error);
    }
};

window.joinGroupFirebase = async function() {
    if (!currentUser) return alert("로그인이 필요합니다.");

    const groupId = document.getElementById("group-id-input").value;
    if (!groupId) return alert("가입할 그룹 ID를 입력해주세요.");

    try {
        const groupRef = doc(db, "groups", groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
            alert("존재하지 않는 그룹 ID입니다.");
            return;
        }

        await updateDoc(groupRef, {
            members: arrayUnion(currentUser.uid)
        });

        await updateDoc(doc(db, "users", currentUser.uid), {
            groupIds: arrayUnion(groupId)
        });

        alert("👥 공부 그룹에 가입되었습니다!");
        closeGroupModal();
    } catch (error) {
        console.error("그룹 가입 오류:", error);
    }
};

// Global Window 내보내기
window.showScreen = showScreen;
window.adjustTargetTime = adjustTargetTime;
window.handleMainTimerBtn = handleMainTimerBtn;
window.resetTimer = resetTimer;
window.addCustomMission = addCustomMission;
window.claimMission = claimMission;
window.deleteMission = deleteMission;
window.switchDecorTab = switchDecorTab;
window.toggleEquip = toggleEquip;
window.switchShopTab = switchShopTab;
window.buyItem = buyItem;
window.setAlertThreshold = setAlertThreshold;
window.showLevelRewardsInfo = showLevelRewardsInfo;
window.closeRoadmapModal = closeRoadmapModal;
window.closeLevelUpModal = closeLevelUpModal;
