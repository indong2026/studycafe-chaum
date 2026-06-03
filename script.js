import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAnKX8uOzVZBzsQlDgxmFymFeaX-Mn7s_4",
  authDomain: "studycafe-c3f62.firebaseapp.com",
  projectId: "studycafe-c3f62",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// UI
const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const reserveBtn = document.getElementById("reserveBtn");
const cancelBtn = document.getElementById("cancelBtn");

const idInput = document.getElementById("idInput");
const pwInput = document.getElementById("pwInput");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const changePwBtn = document.getElementById("changePwBtn");

const mySeatText = document.getElementById("mySeatText");
const sessionSelect = document.getElementById("sessionSelect");

const reserveTimeInfo = document.getElementById("reserveTimeInfo");

reserveTimeInfo.textContent = "예약 가능 시간 : 12:30 ~ 21:30";

// 상태
let currentUser = null;
let selectedSeat = null;

let seats = [];

for (let i = 1; i <= 12; i++) {
  seats.push({
    num: i,
    owner: "",
    session: "",
  });
}

// 🔥 남은 시간 계산
function getRemainingMinutes(endTime) {
  const diff = endTime - Date.now();
  return Math.max(0, Math.floor(diff / 60000));
}

// 🔥 렌더
function render() {
  document.querySelectorAll(".desk").forEach((div, index) => {
    const seat = seats[index];

    if (seat.used) {
      div.classList.add("used");
    } else {
      div.classList.remove("used");
    }

    let timeText = "";

    if (seat.used && seat.endTime) {
      const remain = getRemainingMinutes(seat.endTime);

      if (remain <= 0) {
        const ref = doc(db, "seats", String(seat.num));

        setDoc(ref, {
          used: false,
          owner: "",
          endTime: 0,
        });

        return;
      }

      timeText =
        remain <= 10
          ? `<span class="time-red">${remain}분 남음</span>`
          : `${remain}분 남음`;
    }

    div.innerHTML = `${seat.num}번<br>${timeText}`;

    div.onclick = async () => {
      if (!currentUser) {
        alert("로그인 먼저");
        return;

        if (!canReserve()) {
          alert("예약 가능 시간은 12:30 ~ 21:30 입니다.");

          return;
        }
      }

      // 내 자리 취소
      if (seat.used && seat.owner === currentUser) {
        const ok = confirm("취소하시겠습니까?");
        if (!ok) return;

        const ref = doc(db, "seats", String(seat.num));

        await setDoc(ref, {
          used: false,
          owner: "",
          endTime: 0,
        });

        return;
      }

      // 남 자리 막기
      if (seat.used && seat.owner !== currentUser) return;

      // 이미 내 자리 있음
      const mine = seats.find((s) => s.owner === currentUser);

      if (mine) {
        alert("이미 자리 사용 중");
        return;
      }

      selectedSeat = seat.num;

      popupText.textContent = `${seat.num}번 자리를 예약하시겠습니까?`;

      popup.classList.remove("hidden");
    };
  });
}

// 🔥 로그인
loginBtn.onclick = async () => {
  const id = idInput.value.trim();
  const pw = pwInput.value.trim();

  const idRule = /^[0-9]{5}$/;

  if (!idRule.test(id)) {
    alert("학번 5자리 입력");
    return;
  }

  try {
    const ref = doc(db, "users", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      alert("계정 없음");
      return;
    }

    if (snap.data().password !== pw) {
      alert("비밀번호 틀림");
      return;
    }

    currentUser = id;

    mySeatText.textContent = `${id}님 로그인됨`;

    render();
  } catch (e) {
    console.error(e);
    alert("로그인 실패");
  }
};

// 🔥 회원가입
signupBtn.onclick = async () => {
  const id = idInput.value.trim();
  const pw = pwInput.value.trim();

  const idRule = /^[0-9]{5}$/;

  const pwRule = /^(?=.*[!@#$%^&*])(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  if (!idRule.test(id)) {
    alert("학번 5자리 입력");
    return;
  }

  if (!pwRule.test(pw)) {
    alert("비밀번호 8자 이상 / 영문 / 숫자 / 특수문자");
    return;
  }

  try {
    const ref = doc(db, "users", id);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      alert("이미 가입됨");
      return;
    }

    await setDoc(ref, {
      password: pw,
    });

    alert("회원가입 완료");
  } catch (e) {
    console.error(e);
    alert("회원가입 실패");
  }
};

// 🔥 좌석 데이터 실시간 반영
seats.forEach((seat) => {
  const ref = doc(db, "seats", String(seat.num));

  onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data();

      seat.owner = data.owner || "";
      seat.session = data.session || "";
    }

    if (currentUser) {
      const mine = seats.find((s) => s.owner === currentUser);

      if (mine) {
        mySeatText.textContent = `${currentUser}님: ${mine.num}번 자리`;
      }
    }

    render();
  });
});

// 🔥 예약
reserveBtn.onclick = async () => {

  if (!canReserve()) {
    alert("현재 예약할 수 없습니다.");

    return;
  }
  if (!selectedSeat || !currentUser) return;

  const session = sessionSelect.value;

  const ref = doc(db, "seats", String(selectedSeat));

  await setDoc(ref, {
    owner: currentUser,
    session: sessionSelect.value,
    date: todayString(),
  });

  popup.classList.add("hidden");

  selectedSeat = null;
};

// 🔥 비밀번호 변경
changePwBtn.onclick = async () => {
  if (!currentUser) {
    alert("로그인 먼저");
    return;
  }

  const oldPw = prompt("현재 비밀번호");
  const newPw = prompt("새 비밀번호");

  const pwRule = /^(?=.*[!@#$%^&*])(?=.*[A-Za-z])(?=.*\d).{4,}$/;

  if (!oldPw || !newPw) return;

  if (!pwRule.test(newPw)) {
    alert("비밀번호 형식 오류");
    return;
  }

  try {
    const ref = doc(db, "users", currentUser);
    const snap = await getDoc(ref);

    if (snap.data().password !== oldPw) {
      alert("현재 비밀번호 틀림");
      return;
    }

    await updateDoc(ref, {
      password: newPw,
    });

    alert("변경 완료");
  } catch (e) {
    console.error(e);
    alert("변경 실패");
  }
};

render();

function sessionText(session) {
  if (session === "part1") return "1부";

  if (session === "part2") return "2부";

  if (session === "both") return "1+2부";

  return "";
}

function todayString() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

function canReserve() {
  const now = new Date();

  const minute = now.getHours() * 60 + now.getMinutes();

  // 12:30 ~ 21:30

  return minute >= 750 && minute < 1290;
}

cancelBtn.onclick = () => {
  popup.classList.add("hidden");
  selectedSeat = null;
};
