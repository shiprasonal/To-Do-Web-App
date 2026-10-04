/* ---------- Safe storage (browser block kare to bhi app na tute) ---------- */
function load(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function store(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

/* ---------- Elements ---------- */
const form = document.getElementById("taskForm");
const input = document.getElementById("taskInput");
const dueInput = document.getElementById("dueInput");
const errorEl = document.getElementById("error");
const pendingList = document.getElementById("pendingList");
const completedList = document.getElementById("completedList");
const pendingEmpty = document.getElementById("pendingEmpty");
const completedEmpty = document.getElementById("completedEmpty");
const pendingCount = document.getElementById("pendingCount");
const completedCount = document.getElementById("completedCount");
const pendingPanel = document.getElementById("pendingPanel");
const completedPanel = document.getElementById("completedPanel");
const leftCount = document.getElementById("leftCount");
const clearBtn = document.getElementById("clearBtn");
const themeBtn = document.getElementById("themeBtn");
const filterBtns = document.querySelectorAll(".filter");

/* ---------- State ---------- */
let tasks = [];
try {
  tasks = JSON.parse(load("tasks")) || [];
} catch (e) {
  tasks = [];
}
let filter = "all";
let editingId = null;
let currentTheme = "light";

function save() {
  store("tasks", JSON.stringify(tasks));
}

/* ---------- Dark / Light mode ---------- */
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  themeBtn.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
  store("theme", theme);
}

themeBtn.addEventListener("click", () => {
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

applyTheme(load("theme") === "dark" ? "dark" : "light");

/* ---------- Helpers ---------- */
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function makeButton(label, className, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn " + className;
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

/* ---------- Task actions ---------- */
function toggleTask(task) {
  task.done = !task.done;
  task.completedAt = task.done ? Date.now() : null;
  save();
  render();
}

function deleteTask(task) {
  tasks = tasks.filter((t) => t.id !== task.id);
  save();
  render();
}

function startEdit(task) {
  editingId = task.id;
  render();
  const editBox = document.querySelector(".edit-input");
  if (editBox) editBox.focus();
}

function saveEdit(task, newText) {
  const value = newText.trim();
  if (!value) return;
  task.text = value;
  editingId = null;
  save();
  render();
}

function cancelEdit() {
  editingId = null;
  render();
}

/* ---------- Build one task row ---------- */
function createTaskItem(task, today) {
  const li = document.createElement("li");
  li.className = "item" + (task.done ? " completed" : "");

  const actions = document.createElement("div");
  actions.className = "actions";

  if (editingId === task.id) {
    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "edit-input";
    editInput.value = task.text;
    editInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveEdit(task, editInput.value);
      if (e.key === "Escape") cancelEdit();
    });
    li.appendChild(editInput);

    actions.append(
      makeButton("Save", "complete", () => saveEdit(task, editInput.value)),
      makeButton("Cancel", "", cancelEdit)
    );
  } else {
    const text = document.createElement("div");
    text.className = "task-text";
    text.textContent = task.text;
    text.title = "Double-click to edit";
    text.addEventListener("dblclick", () => startEdit(task));
    li.appendChild(text);

    if (task.due) {
      const due = document.createElement("div");
      const overdue = !task.done && task.due < today;
      due.className = "due" + (overdue ? " overdue" : "");
      due.textContent = (overdue ? "Overdue: " : "Due: ") + task.due;
      li.appendChild(due);
    }

    const time = document.createElement("div");
    time.className = "time";
    let info = "Added: " + formatTime(task.createdAt || task.id);
    if (task.done && task.completedAt) {
      info += "  |  Completed: " + formatTime(task.completedAt);
    }
    time.textContent = info;
    li.appendChild(time);

    actions.append(
      makeButton(task.done ? "Mark Pending" : "Mark Complete", "complete", () => toggleTask(task)),
      makeButton("Edit", "", () => startEdit(task)),
      makeButton("Delete", "danger", () => deleteTask(task))
    );
  }

  li.appendChild(actions);
  return li;
}

/* ---------- Draw everything ---------- */
function render() {
  pendingList.innerHTML = "";
  completedList.innerHTML = "";

  // Aaj ki date (local time, India mein bhi sahi aayegi)
  const d = new Date();
  const today =
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");

  let pending = 0;
  let completed = 0;

  tasks.forEach((task) => {
    if (task.done) {
      completedList.appendChild(createTaskItem(task, today));
      completed++;
    } else {
      pendingList.appendChild(createTaskItem(task, today));
      pending++;
    }
  });

  pendingCount.textContent = pending + " pending";
  completedCount.textContent = completed + " completed";
  leftCount.textContent = pending + (pending === 1 ? " task left" : " tasks left");

  pendingEmpty.hidden = pending > 0;
  completedEmpty.hidden = completed > 0;

  pendingPanel.hidden = filter === "completed";
  completedPanel.hidden = filter === "pending";
}

/* ---------- Add new task ---------- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();

  if (!text) {
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;

  tasks.unshift({
    id: Date.now(),
    text: text,
    done: false,
    due: dueInput.value,
    createdAt: Date.now(),
    completedAt: null,
  });
  save();
  input.value = "";
  dueInput.value = "";

  // Naya task turant dikhe, isliye filter "All" par wapas
  filter = "all";
  filterBtns.forEach((b) => b.classList.toggle("active", b.dataset.filter === "all"));

  render();
});

/* ---------- Filters ---------- */
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

/* ---------- Clear completed ---------- */
clearBtn.addEventListener("click", () => {
  tasks = tasks.filter((t) => !t.done);
  save();
  render();
});

render();