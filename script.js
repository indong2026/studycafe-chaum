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

const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const reserveBtn = document.getElementById("reserveBtn");
const cancelBtn = document.getElementById("cancelBtn");

const idInput = document.getElementById("idInput");
const pwInput = document.getElementById("pwInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");

const mySeatText = document.getElementById("mySeatText");
const timeSelect = document.getElementById("timeSelect");

const changePwBtn = document.getElementById("changePwBtn");

let currentUser = null;
let selectedSeat = null;

let seats = [];

for (let i = 1; i <= 12; i++) {
  seats.push({
    num: i,
    used: false,
    time: 0,
    owner: "",
  });
}

function render() {
  document.querySelectorAll(".desk").forEach((div, index) => {
    const seat = seats[index];

    if (seat.used) {
      div.classList.add("used");
    } else {
      div.classList.remove("used");
    }

    div.innerHTML =
      `${seat.num}번<br>` +
      (seat.used
        ? seat.time <= 10
          ? `<span class="time-red">${seat.time}분 남음</span>`
          : `${seat.time}분 남음`
        : "");

    div.onclick = async () => {
      if (!currentUser) {
        alert("로그인 먼저");
        return;
      }

      // 내가 예약한 자리 취소
      if (seat.used && seat.owner === currentUser) {
        const ok = confirm(`${seat.num}번 자리를 취소하시겠습니까?`);

        if (!ok) return;

        const ref = doc(db, "seats", String(seat.num));

        await setDoc(ref, {
          used: false,
          time: 0,
          owner: "",
        });

        return;
      }

      // 남이 사용 중
      if (seat.used && seat.owner !== currentUser) {
        return;
      }

      // 이미 내 자리 있음
      const mine = seats.find((s) => s.owner === currentUser);

      if (mine) {
        alert(`이미 ${mine.num}번 자리를 사용 중입니다`);
        return;
      }

      // 예약 팝업
      selectedSeat = seat.num;

      popupText.textContent = `${seat.num}번 자리를 예약하시겠습니까?`;

      popup.classList.remove("hidden");
    };
  });
}

loginBtn.onclick = async () => {

  const id = idInput.value.trim();
  const pw = pwInput.value.trim();

  // 학번 5자리 체크
  const idRule = /^[0-9]{5}$/;

  if (!idRule.test(id)) {
    alert("학번 5자리로 입력하세요 (예: 20901)");
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

    const mine =
      seats.find((s) => s.owner === currentUser);

    if (mine) {
      mySeatText.textContent =
        `${currentUser}님: ${mine.num}번 자리`;
    } else {
      mySeatText.textContent =
        `${currentUser}님 로그인됨`;
    }

    render();

  } catch (error) {
    console.error(error);
    alert("로그인 실패");
  }
};

signupBtn.onclick = async () => {

  const id = idInput.value.trim();
  const pw = pwInput.value.trim();

  // 학번 5자리 체크
  const idRule = /^[0-9]{5}$/;

  // 비밀번호 규칙 (그대로 유지)
  const pwRule =
    /^(?=.*[!@#$%^&*])(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  if (!idRule.test(id)) {
    alert("학번 5자리로 입력하세요 (예: 20901)");
    return;
  }

  if (!pwRule.test(pw)) {
    alert("비밀번호는 8자 이상 / 숫자 / 영문 / 특수문자 포함");
    return;
  }

  try {
    const ref = doc(db, "users", id);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      alert("이미 가입된 학번입니다");
      return;
    }

    await setDoc(ref, {
      password: pw
    });

    alert("회원가입 완료");

  } catch (error) {
    console.error(error);
    alert("회원가입 실패");
  }
};

seats.forEach((seat) => {
  const ref = doc(db, "seats", String(seat.num));

  onSnapshot(ref, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();

      seat.used = data.used;
      seat.time = data.time;
      seat.owner = data.owner;
    }

    if (currentUser) {
      const mine = seats.find((s) => s.owner === currentUser);

      if (mine) {
        mySeatText.textContent = `${currentUser}님: ${mine.num}번 자리`;
      } else {
        mySeatText.textContent = `${currentUser}님 로그인됨`;
      }
    }

    render();
  });
});

reserveBtn.onclick = async () => {
  if (!selectedSeat || !currentUser) return;

  const minutes = Number(timeSelect.value);

  const ref = doc(db, "seats", String(selectedSeat));

  await setDoc(ref, {
    used: true,
    time: minutes,
    owner: currentUser,
  });

  popup.classList.add("hidden");
  selectedSeat = null;
};

cancelBtn.onclick = () => {
  popup.classList.add("hidden");
  selectedSeat = null;
};

setInterval(() => {
  seats.forEach(async (seat) => {
    if (seat.used && seat.time > 0) {
      const ref = doc(db, "seats", String(seat.num));

      if (seat.time === 1) {
        await setDoc(ref, {
          used: false,
          time: 0,
          owner: "",
        });
      } else {
        await updateDoc(ref, {
          time: seat.time - 1,
        });
      }
    }
  });
}, 60000);

render();

changePwBtn.onclick = async () => {

  if (!currentUser) {
    alert("로그인 먼저");
    return;
  }

  const oldPw =
    prompt("현재 비밀번호 입력");

  const newPw =
    prompt("새 비밀번호 입력");

  const pwRule =
    /^(?=.*[!@#$%^&*])(?=.*[A-Za-z])(?=.*\d).{4,}$/;

  if (!oldPw || !newPw) {
    alert("입력 취소");
    return;
  }

  if (!pwRule.test(newPw)) {
    alert("숫자/영문/특수문자 포함");
    return;
  }

  try {
    const ref =
      doc(db, "users", currentUser);

    const snap =
      await getDoc(ref);

    if (
      snap.data().password !== oldPw
    ) {
      alert("현재 비밀번호 틀림");
      return;
    }

    await updateDoc(ref, {
      password: newPw
    });

    alert("비밀번호 변경 완료");

  } catch (e) {
    console.error(e);
    alert("변경 실패");
  }
};
