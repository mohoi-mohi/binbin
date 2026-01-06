const wheel = document.getElementById("wheel");
const wheelWrap = document.querySelector(".wheel-wrap");
const optionsInput = document.getElementById("options");
const spinButton = document.getElementById("spin");
const resetButton = document.getElementById("reset");
const resultEl = document.getElementById("result");
const statusEl = document.getElementById("status");
const resultCard = document.querySelector(".result-card");

const totalTarget = 100;
const totalTolerance = 0.01;
const defaultOptions = [
  "Pizza 20%",
  "Sushi 18%",
  "Tacos 15%",
  "Ramen 17%",
  "Salad 12%",
  "Burgers 18%"
];

const segmentColors = [
  "#f2c97d",
  "#f4a27c",
  "#cf6f5a",
  "#c4a77d",
  "#86a9c9",
  "#a5c6a5",
  "#e4b5a1",
  "#d7c08a"
];

let options = [];
let invalidLines = [];
let totalWeight = 0;
let currentRotation = 0;
let spinning = false;

function formatPercent(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

function parseOptions(text) {
  const lines = text.split(/\r?\n/);
  const parsed = [];
  const invalid = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    const match = trimmed.match(/^(.*?)(?:\s*[:|,-]?\s*)(\d+(?:\.\d+)?)\s*%$/);
    if (!match) {
      invalid.push(index + 1);
      return;
    }
    const label = match[1].trim();
    const weight = Number(match[2]);
    if (!label || !Number.isFinite(weight) || weight <= 0) {
      invalid.push(index + 1);
      return;
    }
    parsed.push({ label, weight });
  });

  const total = parsed.reduce((sum, option) => sum + option.weight, 0);
  return { options: parsed, invalidLines: invalid, totalWeight: total };
}

function syncOptions() {
  const parsed = parseOptions(optionsInput.value);
  options = parsed.options;
  invalidLines = parsed.invalidLines;
  totalWeight = parsed.totalWeight;
}

function isTotalValid(total) {
  return Math.abs(total - totalTarget) <= totalTolerance;
}

function getStatusMessage() {
  if (invalidLines.length > 0) {
    const lineLabel = invalidLines.length === 1 ? "line" : "lines";
    return `Invalid ${lineLabel}: ${invalidLines.join(", ")}. Use "Name 25%".`;
  }
  if (options.length < 2) {
    return "Add at least two options with percentages.";
  }
  if (!isTotalValid(totalWeight)) {
    return `Total must be 100%. Current total: ${formatPercent(totalWeight)}%.`;
  }
  return "";
}

function canSpin() {
  return options.length >= 2 && invalidLines.length === 0 && isTotalValid(totalWeight);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function updateResult(message) {
  resultEl.textContent = message;
}

function pulseResult() {
  resultCard.classList.remove("celebrate");
  void resultCard.offsetWidth;
  resultCard.classList.add("celebrate");
}

function resizeCanvas() {
  const size = Math.min(wheelWrap.clientWidth, 460);
  wheel.width = size;
  wheel.height = size;
}

function formatLabel(label) {
  const maxLength = 16;
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 3)}...`;
}

function drawPlaceholder(ctx, radius) {
  ctx.fillStyle = "#fdf9f1";
  ctx.beginPath();
  ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(27, 26, 22, 0.1)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(27, 26, 22, 0.6)";
  ctx.font = `${Math.max(12, radius * 0.09)}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Add at least two options with %", 0, -6);
}

function getSegments() {
  if (options.length === 0 || totalWeight <= 0) {
    return [];
  }

  const fullCircle = Math.PI * 2;
  let cursor = 0;

  return options.map((option) => {
    const angle = (option.weight / totalWeight) * fullCircle;
    const startAngle = cursor;
    const endAngle = cursor + angle;
    cursor = endAngle;
    return { ...option, startAngle, endAngle, angle };
  });
}

function drawWheel(rotation) {
  const ctx = wheel.getContext("2d");
  const size = wheel.width;
  const radius = size / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(radius, radius);

  const segments = getSegments();

  if (segments.length < 2) {
    drawPlaceholder(ctx, radius);
    ctx.restore();
    return;
  }

  const baseRotation = rotation - Math.PI / 2;
  ctx.rotate(baseRotation);

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const start = segment.startAngle;
    const end = segment.endAngle;
    const color = segmentColors[i % segmentColors.length];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 4, start, end);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.lineWidth = Math.max(1, radius * 0.01);
    ctx.strokeStyle = "rgba(27, 26, 22, 0.15)";
    ctx.stroke();

    ctx.save();
    ctx.rotate(start + segment.angle / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1b1a16";
    ctx.font = `${Math.max(12, radius * 0.08)}px "Trebuchet MS", sans-serif`;
    const label = `${segment.label} ${formatPercent(segment.weight)}%`;
    ctx.fillText(formatLabel(label), radius * 0.82, 0);
    ctx.restore();
  }

  ctx.restore();

  const hubRadius = radius * 0.12;
  ctx.beginPath();
  ctx.arc(radius, radius, hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#fffaf0";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(27, 26, 22, 0.4)";
  ctx.stroke();
}

function getCurrentIndex() {
  const segments = getSegments();
  if (segments.length === 0) {
    return -1;
  }

  const normalized = (Math.PI * 2 - (currentRotation % (Math.PI * 2))) % (Math.PI * 2);
  for (let i = 0; i < segments.length; i += 1) {
    if (normalized >= segments[i].startAngle && normalized < segments[i].endAngle) {
      return i;
    }
  }
  return segments.length - 1;
}

function setSpinning(value) {
  spinning = value;
  optionsInput.disabled = value;
  resetButton.disabled = value;
  spinButton.disabled = value || !canSpin();
}

function animateSpin(targetRotation, duration) {
  const startRotation = currentRotation;
  const delta = targetRotation - startRotation;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    currentRotation = startRotation + delta * eased;
    drawWheel(currentRotation);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      setSpinning(false);
      const index = getCurrentIndex();
      const result = options[index] ? options[index].label : "--";
      updateResult(result);
      pulseResult();
    }
  }

  requestAnimationFrame(step);
}

function startSpin() {
  if (spinning) {
    return;
  }

  syncOptions();
  const statusMessage = getStatusMessage();
  if (statusMessage) {
    setStatus(statusMessage);
    setSpinning(false);
    drawWheel(currentRotation);
    return;
  }

  setStatus("");
  setSpinning(true);
  updateResult("Spinning...");

  const extraSpins = 4 + Math.random() * 3;
  const randomAngle = Math.random() * Math.PI * 2;
  const targetRotation = currentRotation + extraSpins * Math.PI * 2 + randomAngle;
  const duration = 3200 + Math.random() * 600;

  animateSpin(targetRotation, duration);
}

function handleInputChange() {
  if (spinning) {
    return;
  }

  syncOptions();
  setStatus(getStatusMessage());
  setSpinning(false);
  drawWheel(currentRotation);
}

function resetOptions() {
  if (spinning) {
    return;
  }

  optionsInput.value = defaultOptions.join("\n");
  currentRotation = 0;
  syncOptions();
  setStatus(getStatusMessage());
  updateResult("--");
  setSpinning(false);
  drawWheel(currentRotation);
}

function init() {
  optionsInput.value = defaultOptions.join("\n");
  syncOptions();
  resizeCanvas();
  drawWheel(currentRotation);
  updateResult("--");
  setStatus(getStatusMessage());
  setSpinning(false);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  drawWheel(currentRotation);
});

optionsInput.addEventListener("input", handleInputChange);
spinButton.addEventListener("click", startSpin);
resetButton.addEventListener("click", resetOptions);

init();
