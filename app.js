const STORAGE_KEY = "stakerun_state_v1";
const DEFAULT_BALANCE = 20000;

const state = loadState();

const walletBalanceEl = document.getElementById("walletBalance");
const activeCountEl = document.getElementById("activeCount");
const completedCountEl = document.getElementById("completedCount");
const challengeListEl = document.getElementById("challengeList");
const ledgerListEl = document.getElementById("ledgerList");
const activitySummaryEl = document.getElementById("activitySummary");

const challengeForm = document.getElementById("challengeForm");

initDateDefaults();
render();

challengeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("challengeName").value.trim();
  const startDate = document.getElementById("challengeStart").value;
  const endDate = document.getElementById("challengeEnd").value;
  const entryFee = Number(document.getElementById("challengeFee").value);
  const threshold = Number(document.getElementById("challengeThreshold").value);

  if (!name || !startDate || !endDate || entryFee <= 0 || threshold <= 0) {
    alert("Please complete every field with valid values.");
    return;
  }

  if (startDate > endDate) {
    alert("Start date must be before end date.");
    return;
  }

  const challenge = {
    id: crypto.randomUUID(),
    name,
    startDate,
    endDate,
    entryFee,
    threshold,
    status: "draft",
    joined: false,
    evaluated: false,
    averageSteps: null,
    result: null,
    participants: 1,
    completers: 0,
  };

  state.challenges.unshift(challenge);
  saveState();
  challengeForm.reset();
  initDateDefaults();
  render();
});

document.querySelectorAll("[data-add-steps]").forEach((button) => {
  button.addEventListener("click", () => {
    const amount = Number(button.dataset.addSteps);
    addStepsForDate(getToday(), amount);
    render();
  });
});

document.getElementById("generateRange").addEventListener("click", () => {
  const startDate = document.getElementById("rangeStart").value;
  const endDate = document.getElementById("rangeEnd").value;
  if (!startDate || !endDate) {
    alert("Pick a start and end date.");
    return;
  }
  if (startDate > endDate) {
    alert("Range start must be before end.");
    return;
  }
  generateStepsForRange(startDate, endDate);
  render();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

function initDateDefaults() {
  const today = getToday();
  const weekLater = addDays(today, 6);
  document.getElementById("challengeStart").value = today;
  document.getElementById("challengeEnd").value = weekLater;
  document.getElementById("rangeStart").value = today;
  document.getElementById("rangeEnd").value = weekLater;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        wallet: parsed.wallet ?? { balance: DEFAULT_BALANCE, ledger: [] },
        challenges: parsed.challenges ?? [],
        activities: parsed.activities ?? {},
      };
    } catch (error) {
      console.warn("Failed to parse saved state", error);
    }
  }
  return {
    wallet: {
      balance: DEFAULT_BALANCE,
      ledger: [
        {
          id: crypto.randomUUID(),
          type: "seed",
          amount: DEFAULT_BALANCE,
          note: "Seeded wallet for demo",
          date: new Date().toISOString(),
        },
      ],
    },
    challenges: [],
    activities: {},
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  walletBalanceEl.textContent = formatCurrency(state.wallet.balance);

  const activeChallenges = state.challenges.filter(
    (challenge) => challenge.joined && !challenge.evaluated
  );
  const completedChallenges = state.challenges.filter((challenge) => challenge.evaluated);
  activeCountEl.textContent = activeChallenges.length;
  completedCountEl.textContent = completedChallenges.length;

  renderChallenges();
  renderLedger();
  renderActivitySummary();
}

function renderChallenges() {
  challengeListEl.innerHTML = "";
  if (state.challenges.length === 0) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "No challenges yet. Create one to get started.";
    challengeListEl.appendChild(empty);
    return;
  }

  state.challenges.forEach((challenge) => {
    const card = document.createElement("div");
    card.className = "challenge";

    const badge = document.createElement("span");
    badge.className = `badge ${getBadgeClass(challenge)}`;
    badge.textContent = getBadgeLabel(challenge);

    const title = document.createElement("strong");
    title.textContent = challenge.name;

    const details = document.createElement("p");
    details.className = "label";
    details.textContent = `${challenge.startDate} → ${challenge.endDate}`;

    const stats = document.createElement("p");
    stats.className = "label";
    const averageText = challenge.averageSteps === null ? "Not evaluated" : `${Math.round(challenge.averageSteps)} avg steps/day`;
    stats.textContent = `Fee ${formatCurrency(challenge.entryFee)} · Target ${challenge.threshold} steps · ${averageText}`;

    const actions = document.createElement("div");
    actions.className = "button-row";

    if (!challenge.joined) {
      const joinBtn = document.createElement("button");
      joinBtn.className = "btn primary";
      joinBtn.textContent = "Join challenge";
      joinBtn.addEventListener("click", () => joinChallenge(challenge.id));
      actions.appendChild(joinBtn);
    }

    if (challenge.joined && !challenge.evaluated) {
      const evaluateBtn = document.createElement("button");
      evaluateBtn.className = "btn secondary";
      evaluateBtn.textContent = "Evaluate";
      evaluateBtn.addEventListener("click", () => evaluateChallenge(challenge.id));
      actions.appendChild(evaluateBtn);
    }

    card.append(badge, title, details, stats, actions);
    challengeListEl.appendChild(card);
  });
}

function renderLedger() {
  ledgerListEl.innerHTML = "";
  if (state.wallet.ledger.length === 0) {
    ledgerListEl.textContent = "No transactions yet.";
    return;
  }

  state.wallet.ledger.slice(0, 8).forEach((entry) => {
    const item = document.createElement("div");
    item.className = "ledger-item";

    const amount = document.createElement("div");
    amount.className = "ledger-amount";
    const sign = entry.type === "stake" ? "-" : "+";
    amount.textContent = `${sign}${formatCurrency(entry.amount)}`;

    const note = document.createElement("div");
    note.textContent = entry.note;

    const date = document.createElement("div");
    date.className = "label";
    date.textContent = new Date(entry.date).toLocaleString();

    item.append(amount, note, date);
    ledgerListEl.appendChild(item);
  });
}

function renderActivitySummary() {
  const today = getToday();
  const entries = Object.entries(state.activities)
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .slice(0, 5)
    .map(([date, steps]) => `${date}: ${steps.toLocaleString()} steps`);

  activitySummaryEl.innerHTML = "";
  const todaySteps = state.activities[today] || 0;
  const todayLine = document.createElement("p");
  todayLine.textContent = `Today: ${todaySteps.toLocaleString()} steps`;
  activitySummaryEl.appendChild(todayLine);

  if (entries.length) {
    const history = document.createElement("div");
    history.innerHTML = `<strong>Recent days</strong><br>${entries.join("<br>")}`;
    activitySummaryEl.appendChild(history);
  }
}

function joinChallenge(challengeId) {
  const challenge = state.challenges.find((item) => item.id === challengeId);
  if (!challenge) return;

  if (state.wallet.balance < challenge.entryFee) {
    alert("Not enough balance to join.");
    return;
  }

  state.wallet.balance -= challenge.entryFee;
  state.wallet.ledger.unshift({
    id: crypto.randomUUID(),
    type: "stake",
    amount: challenge.entryFee,
    note: `Staked for ${challenge.name}`,
    date: new Date().toISOString(),
  });

  challenge.joined = true;
  challenge.status = "active";

  saveState();
  render();
}

function evaluateChallenge(challengeId) {
  const challenge = state.challenges.find((item) => item.id === challengeId);
  if (!challenge) return;

  const averageSteps = calculateAverageSteps(challenge.startDate, challenge.endDate);
  challenge.averageSteps = averageSteps;

  const isCompleted = averageSteps >= challenge.threshold;
  challenge.evaluated = true;
  challenge.status = isCompleted ? "completed" : "failed";
  challenge.completers = isCompleted ? 1 : 0;

  if (isCompleted && challenge.completers > 0) {
    const pot = challenge.entryFee * challenge.participants;
    const prize = Math.floor(pot / challenge.completers);
    state.wallet.balance += prize;
    state.wallet.ledger.unshift({
      id: crypto.randomUUID(),
      type: "prize",
      amount: prize,
      note: `Payout from ${challenge.name}`,
      date: new Date().toISOString(),
    });
    challenge.result = `Won ${formatCurrency(prize)}`;
  } else {
    challenge.result = "Missed goal";
  }

  saveState();
  render();
}

function calculateAverageSteps(startDate, endDate) {
  const dates = getDateRange(startDate, endDate);
  const total = dates.reduce((sum, date) => sum + (state.activities[date] || 0), 0);
  return total / dates.length;
}

function addStepsForDate(date, amount) {
  state.activities[date] = (state.activities[date] || 0) + amount;
  saveState();
}

function generateStepsForRange(startDate, endDate) {
  const dates = getDateRange(startDate, endDate);
  dates.forEach((date) => {
    const steps = randomBetween(2000, 12000);
    state.activities[date] = steps;
  });
  saveState();
}

function getDateRange(startDate, endDate) {
  const dates = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(amount) {
  return `$${(amount / 100).toFixed(2)}`;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getBadgeClass(challenge) {
  if (challenge.status === "completed") return "completed";
  if (challenge.status === "failed") return "failed";
  if (!challenge.joined) return "draft";
  return "active";
}

function getBadgeLabel(challenge) {
  if (challenge.status === "completed") return "completed";
  if (challenge.status === "failed") return "failed";
  if (challenge.joined) return "active";
  return "draft";
}
