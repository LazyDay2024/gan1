import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "xxxxxxx",
  appId: "xxxxxxx"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ บันทึกคะแนน
window.saveScore = async function(name, score) {
  try {
    await addDoc(collection(db, "scores"), {
      name: name,
      score: score,
      time: new Date()
    });
    console.log("บันทึกคะแนนแล้ว");
  } catch (e) {
    console.error("ผิดพลาด:", e);
  }
}

// ✅ โหลดสถิติ
window.loadStats = async function() {
  const querySnapshot = await getDocs(collection(db, "scores"));
  let allScores = [];
  querySnapshot.forEach(doc => {
    allScores.push(doc.data().score);
  });

  let avg = 0;
  if (allScores.length > 0) {
    avg = allScores.reduce((a,b)=>a+b,0)/allScores.length;
  }

  document.getElementById("stats").innerHTML =
    `จำนวนผู้เล่น: ${allScores.length} <br> คะแนนเฉลี่ย: ${avg.toFixed(2)}`;
}

// โหลดสถิติทันทีตอนเปิดเว็บ
loadStats();