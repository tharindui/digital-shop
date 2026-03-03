const garments = [
  {
    name: "Classic Tee",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 380"><path d="M93 50 54 96l39 32 34-34v229h106V94l34 34 39-32-39-46-47 24-26-31h-40l-26 31z" fill="#ff6b6b" stroke="#d94c4c" stroke-width="8"/></svg>`,
  },
  {
    name: "Navy Hoodie",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 380"><path d="M84 89 43 144l46 32 27-32v177h128V144l27 32 46-32-41-55-40 20-18-33h-76l-18 33z" fill="#355c9a" stroke="#21457a" stroke-width="8"/><path d="M140 76c8-20 25-32 40-32s32 12 40 32" fill="none" stroke="#21457a" stroke-width="8" stroke-linecap="round"/></svg>`,
  },
  {
    name: "Mint Jacket",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 380"><path d="M90 66 55 106l30 24 44-41v230h102V89l44 41 30-24-35-40-45 19-32-40h-26l-32 40z" fill="#59c9a5" stroke="#3aa180" stroke-width="8"/><line x1="180" y1="84" x2="180" y2="319" stroke="#fff" stroke-width="8"/></svg>`,
  },
];

const canvas = document.getElementById("fittingCanvas");
const ctx = canvas.getContext("2d");
const photoInput = document.getElementById("photoInput");
const garmentSelect = document.getElementById("garmentSelect");
const scaleInput = document.getElementById("scaleInput");
const yOffsetInput = document.getElementById("yOffsetInput");
const downloadBtn = document.getElementById("downloadBtn");

const state = {
  modelImage: null,
  garmentImage: null,
  garmentIndex: 0,
  scale: Number(scaleInput.value),
  yOffset: Number(yOffsetInput.value),
};

function loadSvgAsImage(svg) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  });
}

async function setGarment(index) {
  state.garmentIndex = index;
  state.garmentImage = await loadSvgAsImage(garments[index].svg);
  drawScene();
}

function drawEmptyState() {
  ctx.fillStyle = "#eef1fb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#6c7896";
  ctx.font = "600 30px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Upload a model photo", canvas.width / 2, canvas.height / 2 - 12);
  ctx.font = "400 20px Inter, sans-serif";
  ctx.fillText("then pick a garment", canvas.width / 2, canvas.height / 2 + 28);
}

function drawScene() {
  if (!state.modelImage) {
    drawEmptyState();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.modelImage, 0, 0, canvas.width, canvas.height);

  if (!state.garmentImage) {
    return;
  }

  const baseWidth = canvas.width * 0.58 * state.scale;
  const ratio = state.garmentImage.height / state.garmentImage.width;
  const height = baseWidth * ratio;

  const x = (canvas.width - baseWidth) / 2;
  const y = canvas.height * 0.24 + state.yOffset;

  ctx.globalAlpha = 0.85;
  ctx.drawImage(state.garmentImage, x, y, baseWidth, height);
  ctx.globalAlpha = 1;
}

function initGarmentOptions() {
  garments.forEach((garment, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = garment.name;
    garmentSelect.append(option);
  });
}

photoInput.addEventListener("change", () => {
  const file = photoInput.files?.[0];
  if (!file) return;

  const image = new Image();
  image.onload = () => {
    state.modelImage = image;
    drawScene();
  };
  image.src = URL.createObjectURL(file);
});

garmentSelect.addEventListener("change", async () => {
  await setGarment(Number(garmentSelect.value));
});

scaleInput.addEventListener("input", () => {
  state.scale = Number(scaleInput.value);
  drawScene();
});

yOffsetInput.addEventListener("input", () => {
  state.yOffset = Number(yOffsetInput.value);
  drawScene();
});

downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "fitting-room-preview.png";
  link.click();
});

initGarmentOptions();
setGarment(0);
drawEmptyState();
