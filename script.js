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
  const email = idInput.value.trim().toLowerCase();
  const pw = pwInput.value.trim();

  const emailRule = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  if (!emailRule.test(email)) {
    alert("올바른 이메일 형식만 가능합니다");
    return;
  }

  if (/[^a-z0-9@._%+-]/.test(email)) {
    alert("영문 이메일만 가능합니다");
    return;
  }

  try {
    const ref = doc(db, "users", email);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      alert("계정 없음");
      return;
    }

    if (snap.data().password !== pw) {
      alert("비밀번호 틀림");
      return;
    }

    currentUser = email;

    const mine = seats.find((s) => s.owner === currentUser);

    if (mine) {
      mySeatText.textContent = `${currentUser}님: ${mine.num}번 자리`;
    } else {
      mySeatText.textContent = `${currentUser}님 로그인됨`;
    }

    render();
  } catch (error) {
    console.error(error);
    alert("로그인 실패");
  }
};

signupBtn.onclick = async () => {
  const email = idInput.value.trim().toLowerCase();
  const pw = pwInput.value.trim();

  const emailRule = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  const pwRule = /^(?=.*[!@#$%^&*])(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  if (!emailRule.test(email)) {
    alert("올바른 이메일 형식만 가능합니다");
    return;
  }

  if (/[^a-z0-9@._%+-]/.test(email)) {
    alert("영문 이메일만 가능합니다");
    return;
  }

  if (!pwRule.test(pw)) {
    alert("비밀번호는 8자 이상 / 숫자 / 영문 / 특수문자 포함");
    return;
  }

  try {
    const ref = doc(db, "users", email);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      alert("이미 가입된 이메일입니다");
      return;
    }

    await setDoc(ref, {
      password: pw,
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
