let time = 10; // ✅ เริ่มที่ 10 วิ
let score = 0;
let timer;
let highScores = [];

const timeEl = document.getElementById("time");
const scoreEl = document.getElementById("score");
const questionEl = document.getElementById("question");
const choicesEl = document.getElementById("choices");
const startBtn = document.getElementById("startBtn");
const scoresList = document.getElementById("scoresList");

function startGame() {
  time = 10; // ✅ รีเซ็ตให้ 10 วิ
  score = 0;
  updateStatus();
  startBtn.style.display = "none";
  nextQuestion();
  timer = setInterval(() => {
    time--;
    updateStatus();
    if (time <= 0) endGame();
  }, 1000);
}

function updateStatus() {
  timeEl.textContent = time;
  scoreEl.textContent = score;
}

function nextQuestion() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const answer = a * b; // โจทย์เป็นคูณ

  questionEl.textContent = `${a} × ${b} = ?`;
  choicesEl.innerHTML = "";

  let answers = [answer];
  while (answers.length < 4) {
    let wrong = Math.floor(Math.random() * 100);
    if (!answers.includes(wrong)) answers.push(wrong);
  }
  answers.sort(() => Math.random() - 0.5);

  answers.forEach(num => {
    const btn = document.createElement("button");
    btn.textContent = num;
    btn.className = "choice";
    btn.onclick = () => checkAnswer(num, answer);
    choicesEl.appendChild(btn);
  });
}

function checkAnswer(choice, answer) {
  if (choice === answer) {
    score += 10;
  } else {
    score -= 5;
    if (score < 0) score = 0;
  }
  updateStatus();
  nextQuestion();
}

function endGame() {
  clearInterval(timer);
  questionEl.textContent = "⏰ หมดเวลา!";
  choicesEl.innerHTML = "";
  startBtn.style.display = "inline-block";

  let name = prompt("ใส่ชื่อเพื่อบันทึกคะแนน:");
  if (name) {
    highScores.push({ name, score });
    highScores.sort((a, b) => b.score - a.score);
    if (highScores.length > 5) highScores.pop();
    renderScores();

    // ✅ บันทึกลง Firebase ด้วย
    saveScore(name, score).then(() => loadStats());
  }
}

function renderScores() {
  scoresList.innerHTML = "";
  highScores.forEach(s => {
    const li = document.createElement("li");
    li.textContent = `${s.name} - ${s.score}`;
    scoresList.appendChild(li);
  });
}

startBtn.addEventListener("click", startGame);