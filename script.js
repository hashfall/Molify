
const carousel = document.querySelector(".carousel");
const cells = document.querySelectorAll(".carousel__cell");
const scene = document.querySelector(".scene");
const descriptionTitle = document.getElementById("carouselDescriptionTitle");
const descriptionText = document.getElementById("carouselDescriptionText");
const descriptionExample = document.getElementById("carouselDescriptionExample");

const angle = 360 / cells.length;
let rotation = 0;
let radius = 0;
let pointerX = 0;
let dragTarget = null;
let movedPointer = false;
let suppressClick = false;

function updateDescription() {
  const selectedIndex = ((Math.round(-rotation / angle) % cells.length) + cells.length) % cells.length;
  const selectedCell = cells[selectedIndex];
  descriptionTitle.textContent = selectedCell.dataset.title;
  descriptionText.textContent = selectedCell.dataset.description;
  descriptionExample.textContent = selectedCell.dataset.example;
}

function layoutCarousel() {
  const cardWidth = cells[0].getBoundingClientRect().width;
  radius = (cardWidth / 2) / Math.tan(Math.PI / cells.length);

  cells.forEach((cell, index) => {
    cell.style.transform =
      `translate(-50%, -50%) rotateY(${index * angle}deg) translateZ(${radius}px)`;
    cell.style.backgroundImage =
      `linear-gradient(180deg, transparent 35%, rgba(0, 0, 0, .72)), url("${new URL(cell.dataset.image, document.baseURI).href}")`;
    cell.setAttribute("role", "link");
    cell.setAttribute("tabindex", "0");
  });

  carousel.style.transform =
    `translateZ(${-radius}px) rotateY(${rotation}deg)`;
  updateDescription();
}

function rotate(direction) {
  rotation += direction * angle;
  carousel.style.transform =
    `translateZ(${-radius}px) rotateY(${rotation}deg)`;
  updateDescription();
}

document.getElementById("prev").addEventListener("click", () => rotate(1));
document.getElementById("next").addEventListener("click", () => rotate(-1));

function abrirPagina(cell) {
  const caminho = cell.dataset.link;

  if (caminho) {
    window.location.href = caminho;
  }
}

cells.forEach((cell) => {
  cell.addEventListener("click", () => {
    if (suppressClick) return;
    abrirPagina(cell);
  });

  cell.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      abrirPagina(cell);
    }
  });
});

scene.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  dragTarget = event.target.closest(".carousel__cell");
  if (!dragTarget) return;

  pointerX = event.clientX;
  movedPointer = false;
  carousel.classList.add("is-dragging");
  dragTarget.setPointerCapture(event.pointerId);
});

scene.addEventListener("pointermove", (event) => {
  if (!dragTarget?.hasPointerCapture(event.pointerId)) return;
  const delta = event.clientX - pointerX;
  if (Math.abs(delta) > 3) movedPointer = true;
  rotation += delta * 0.45;
  pointerX = event.clientX;
  carousel.style.transform =
    `translateZ(${-radius}px) rotateY(${rotation}deg)`;
  updateDescription();
});

function finishDrag(event) {
  if (!dragTarget?.hasPointerCapture(event.pointerId)) return;
  dragTarget.releasePointerCapture(event.pointerId);
  carousel.classList.remove("is-dragging");
  dragTarget = null;

  if (movedPointer) {
    suppressClick = true;
    window.setTimeout(() => { suppressClick = false; }, 0);
  }
}

scene.addEventListener("pointerup", finishDrag);
scene.addEventListener("pointercancel", finishDrag);

window.addEventListener("resize", layoutCarousel);
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") rotate(1);
  if (event.key === "ArrowRight") rotate(-1);
});

layoutCarousel();
