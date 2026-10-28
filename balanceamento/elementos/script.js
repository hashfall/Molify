// Register GSAP plugins
gsap.registerPlugin(Draggable, InertiaPlugin, CustomEase, Flip);

class PreloaderManager {
  constructor(onComplete) {
    this.onCompleteCallback = onComplete;
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.startTime = null;
    this.duration = 2000; // 2 seconds
    this.finished = false;
    this.createLoadingScreen();
  }

  createLoadingScreen() {
    this.overlay = document.getElementById("preloader-overlay");
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 100000;
    `;

    this.canvas = document.createElement("canvas");
    this.canvas.width = 300;
    this.canvas.height = 300;

    this.ctx = this.canvas.getContext("2d");
    this.overlay.appendChild(this.canvas);

    this.startAnimation();
  }

  startAnimation() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    let time = 0;
    let lastTime = 0;

    const dotRings = [
      { radius: 20, count: 8 },
      { radius: 35, count: 12 },
      { radius: 50, count: 16 },
      { radius: 65, count: 20 },
      { radius: 80, count: 24 },
    ];

    // Cores claras para ficarem visíveis no fundo preto
    const colors = {
      primary: "#DFF0FC",
      accent: "#56B2F0",
    };

    const hexToRgb = (hex) => {
      return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      ];
    };

    const primaryRgb = hexToRgb(colors.primary);
    const accentRgb = hexToRgb(colors.accent);

    const animate = (timestamp) => {
      if (!this.startTime) this.startTime = timestamp;

      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      time += deltaTime * 0.001;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw center dot
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0.9)`;
      this.ctx.fill();

      // Draw Line Pulse Wave animation
      dotRings.forEach((ring, ringIndex) => {
        for (let i = 0; i < ring.count; i++) {
          const angle = (i / ring.count) * Math.PI * 2;
          const radiusPulse = Math.sin(time * 2 - ringIndex * 0.4) * 3;
          const x = centerX + Math.cos(angle) * (ring.radius + radiusPulse);
          const y = centerY + Math.sin(angle) * (ring.radius + radiusPulse);

          const opacityWave =
            0.4 + Math.sin(time * 2 - ringIndex * 0.4 + i * 0.2) * 0.6;
          const isActive = Math.sin(time * 2 - ringIndex * 0.4 + i * 0.2) > 0.6;
          const alpha = Math.max(0, Math.min(1, opacityWave));

          // Draw line from center to point
          this.ctx.beginPath();
          this.ctx.moveTo(centerX, centerY);
          this.ctx.lineTo(x, y);
          this.ctx.lineWidth = 0.8;

          if (isActive) {
            this.ctx.strokeStyle = `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${alpha * 0.7})`;
          } else {
            this.ctx.strokeStyle = `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, ${alpha * 0.3})`;
          }
          this.ctx.stroke();

          // Draw dot at the end of the line
          this.ctx.beginPath();
          this.ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          if (isActive) {
            this.ctx.fillStyle = `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${alpha})`;
          } else {
            this.ctx.fillStyle = `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, ${alpha})`;
          }
          this.ctx.fill();
        }
      });

      // Check if we should complete the loading
      if (timestamp - this.startTime >= this.duration) {
        this.complete();
        return;
      }

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  complete() {
    if (this.finished) return;
    this.finished = true;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.overlay) {
      this.overlay.style.transition = "opacity 0.8s ease";
      this.overlay.style.opacity = "0";
      setTimeout(() => {
        this.overlay?.remove();
      }, 800);
    }

    // Inicia a galeria já durante o fade-out do preloader
    if (this.onCompleteCallback) this.onCompleteCallback();
  }
}

class FashionGallery {
  constructor() {
    // DOM elements
    this.viewport = document.getElementById("viewport");
    this.canvasWrapper = document.getElementById("canvasWrapper");
    this.gridContainer = document.getElementById("gridContainer");
    this.splitScreenContainer = document.getElementById("splitScreenContainer");
    this.imageTitleOverlay = document.getElementById("imageTitleOverlay");
    this.closeButton = document.getElementById("closeButton");
    // A barra de zoom foi removida da tela; mantemos um elemento "fantasma" fora do DOM
    // para o restante do código (atalhos 1, 2, 3 e F) continuar funcionando.
    this.controlsContainer =
      document.getElementById("controlsContainer") ||
      document.createElement("div");
    if (!this.controlsContainer.querySelector(".sound-toggle")) {
      this.controlsContainer.innerHTML =
        '<div class="percentage-indicator"></div><div class="switch"></div><button class="sound-toggle"></button>';
    }
    this.soundToggle = this.controlsContainer.querySelector(".sound-toggle");
    // Create custom eases
    this.customEase = CustomEase.create("smooth", ".87,0,.13,1");
    this.centerEase = CustomEase.create("center", ".25,.46,.45,.94");
    // Configuration
    this.config = {
      itemSize: 320,
      baseGap: 16,
      rows: 10,
      cols: 12,
      currentZoom: 0.6,
      currentGap: 32,
    };
    // State
    this.zoomState = {
      isActive: false,
      selectedItem: null,
      flipAnimation: null,
      scalingOverlay: null,
    };
    this.gridItems = [];
    this.gridDimensions = {};
    this.lastValidPosition = {
      x: 0,
      y: 0,
    };
    this.draggable = null;
    this.viewportObserver = null;

    // Handlers com bind fixo (para o removeEventListener funcionar)
    this.handleSplitAreaClick = this.handleSplitAreaClick.bind(this);
    this.handleZoomKeys = this.handleZoomKeys.bind(this);

    // Initialize sound system
    this.initSoundSystem();
    // Initialize image data
    this.initImageData();
  }
  initSoundSystem() {
    this.soundSystem = {
      enabled: false,
      sounds: {
        click: new Audio("https://assets.codepen.io/7558/glitch-fx-001.mp3"),
        open: new Audio("https://assets.codepen.io/7558/click-glitch-001.mp3"),
        close: new Audio("https://assets.codepen.io/7558/click-glitch-001.mp3"),
        "zoom-in": new Audio(
          "https://assets.codepen.io/7558/whoosh-fx-001.mp3",
        ),
        "zoom-out": new Audio(
          "https://assets.codepen.io/7558/whoosh-fx-001.mp3",
        ),
        "drag-start": new Audio(
          "https://assets.codepen.io/7558/preloader-2s-001.mp3",
        ),
        "drag-end": new Audio(
          "https://assets.codepen.io/7558/preloader-2s-001.mp3",
        ),
      },
      play: (soundName) => {
        if (!this.soundSystem.enabled || !this.soundSystem.sounds[soundName])
          return;
        try {
          const audio = this.soundSystem.sounds[soundName];
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } catch (e) {
          // Silently handle audio errors
        }
      },
      toggle: () => {
        this.soundSystem.enabled = !this.soundSystem.enabled;
        this.soundToggle.classList.toggle("active", this.soundSystem.enabled);
        // Prevent visual conflicts during sound toggle
        if (this.zoomState.isActive) return;
        if (this.soundSystem.enabled) {
          // Delay sound to prevent flashing during visual updates
          setTimeout(() => {
            this.soundSystem.play("click");
          }, 50);
        }
      },
    };
    // Preload sounds
    Object.values(this.soundSystem.sounds).forEach((audio) => {
      audio.preload = "auto";
      audio.volume = 0.3;
    });
    // Initialize sound wave canvas animation
    this.initSoundWave();
  }
  initSoundWave() {
    const canvas = document.getElementById("soundWaveCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = 32;
    const height = 16;
    const centerY = Math.floor(height / 2);
    let startTime = Date.now();
    let currentAmplitude = this.soundSystem.enabled ? 1 : 0;
    const interpolateColor = (color1, color2, factor) => {
      const r1 = parseInt(color1.substring(1, 3), 16);
      const g1 = parseInt(color1.substring(3, 5), 16);
      const b1 = parseInt(color1.substring(5, 7), 16);
      const r2 = parseInt(color2.substring(1, 3), 16);
      const g2 = parseInt(color2.substring(3, 5), 16);
      const b2 = parseInt(color2.substring(5, 7), 16);
      const r = Math.round(r1 + factor * (r2 - r1))
        .toString(16)
        .padStart(2, "0");
      const g = Math.round(g1 + factor * (g2 - g1))
        .toString(16)
        .padStart(2, "0");
      const b = Math.round(b1 + factor * (b2 - b1))
        .toString(16)
        .padStart(2, "0");
      return `#${r}${g}${b}`;
    };
    const animate = () => {
      const targetAmplitude = this.soundSystem.enabled ? 1 : 0;
      currentAmplitude += (targetAmplitude - currentAmplitude) * 0.08;
      ctx.clearRect(0, 0, width, height);
      const time = (Date.now() - startTime) / 1000;
      const muteFactor = 1 - currentAmplitude;
      const primaryColor = "#1C394D";
      const accentColor = "#377199";
      const muteColor = "#9FC3DC";
      if (!this.soundSystem.enabled && currentAmplitude < 0.01) {
        ctx.fillStyle = muteColor;
        ctx.fillRect(0, centerY, width, 2);
      } else {
        ctx.fillStyle = interpolateColor(primaryColor, muteColor, muteFactor);
        for (let i = 0; i < width; i++) {
          const x = i - width / 2;
          const e = Math.exp((-x * x) / 50);
          const y =
            centerY +
            Math.cos(x * 0.4 - time * 8) * e * height * 0.35 * currentAmplitude;
          ctx.fillRect(i, Math.round(y), 1, 2);
        }
        ctx.fillStyle = interpolateColor(accentColor, muteColor, muteFactor);
        for (let i = 0; i < width; i++) {
          const x = i - width / 2;
          const e = Math.exp((-x * x) / 80);
          const y =
            centerY +
            Math.cos(x * 0.3 - time * 5) * e * height * 0.25 * currentAmplitude;
          ctx.fillRect(i, Math.round(y), 1, 2);
        }
      }
      requestAnimationFrame(animate);
    };
    animate();
  }
  initImageData() {
    // Dados dos 118 elementos (elementos.js) + imagens quadradas e detalhadas
    this.imageData = ELEMENTOS.map((el) => ({
      number: String(el.z).padStart(3, "0"),
      title: el.n,
      symbol: el.s,
      category: el.c,
      description: `${el.s} · número atômico ${el.z}. Abra o cartão completo para ver o modelo de Bohr, a configuração eletrônica e as principais propriedades.`,
      thumb: `img/thumb/${el.f}.webp`,
      square: `img/quadrado/${el.f}.webp`,
      detail: `img/detalhe/${el.f}.webp`,
    }));
    this.fashionImages = this.imageData.map((d) => d.thumb);
  }
  // Custom line splitting function (since we can't use SplitText)
  splitTextIntoLines(element, text) {
    element.innerHTML = "";
    // Split by sentences and create lines
    const sentences = text.split(/(?<=[.!?])\s+/);
    const lines = [];
    // Create temporary div to measure text width
    const temp = document.createElement("div");
    temp.style.cssText = `
          position: absolute;
          visibility: hidden;
          width: ${element.offsetWidth}px;
          font-family: 'PPNeueMontreal', sans-serif;
          font-size: 17px;
          font-weight: 300;
          line-height: 1.5;
        `;
    document.body.appendChild(temp);
    let currentLine = "";
    sentences.forEach((sentence) => {
      const words = sentence.split(" ");
      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        temp.textContent = testLine;
        if (temp.offsetWidth > element.offsetWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
    });
    if (currentLine) {
      lines.push(currentLine);
    }
    document.body.removeChild(temp);
    // Create line elements
    lines.forEach((lineText) => {
      const lineSpan = document.createElement("span");
      lineSpan.className = "description-line";
      lineSpan.textContent = lineText;
      element.appendChild(lineSpan);
    });
    return element.querySelectorAll(".description-line");
  }
  calculateGapForZoom(zoomLevel) {
    if (zoomLevel >= 1.0) return 16;
    else if (zoomLevel >= 0.6) return 32;
    else return 64;
  }
  calculateGridDimensions(gap = this.config.currentGap) {
    const totalWidth = this.config.cols * (this.config.itemSize + gap) - gap;
    const totalHeight = this.config.rows * (this.config.itemSize + gap) - gap;
    this.gridDimensions = {
      width: totalWidth,
      height: totalHeight,
      scaledWidth: totalWidth * this.config.currentZoom,
      scaledHeight: totalHeight * this.config.currentZoom,
      gap: gap,
    };
    return this.gridDimensions;
  }
  generateGridItems() {
    this.config.currentGap = this.calculateGapForZoom(this.config.currentZoom);
    this.calculateGridDimensions();
    this.canvasWrapper.style.width = this.gridDimensions.width + "px";
    this.canvasWrapper.style.height = this.gridDimensions.height + "px";
    this.gridContainer.innerHTML = "";
    this.gridItems = [];

    let imageIndex = 0;
    const total = this.imageData.length;
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        if (imageIndex >= total) break;
        const item = document.createElement("div");
        item.className = "grid-item";

        // Calculate final grid position
        const x = col * (this.config.itemSize + this.config.currentGap);
        const y = row * (this.config.itemSize + this.config.currentGap);

        // Set to grid position
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;

        // Hide initially - will be positioned and shown in playIntroAnimation
        item.style.opacity = "0";

        const imageUrl = this.fashionImages[imageIndex];
        imageIndex++;
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = `Cartão do elemento ${this.imageData[imageIndex - 1].title}`;
        img.decoding = "async";
        item.appendChild(img);
        const itemData = {
          element: item,
          img: img,
          row: row,
          col: col,
          baseX: x,
          baseY: y,
          imageUrl: imageUrl,
          index: this.gridItems.length,
        };
        // Add click event for zoom
        item.addEventListener("click", () => {
          if (!this.zoomState.isActive) {
            this.soundSystem.play("click");
            this.enterZoomMode(itemData);
          }
        });
        this.gridContainer.appendChild(item);
        this.gridItems.push(itemData);
      }
    }
  }
  setupViewportObserver() {
    if (this.viewportObserver) {
      this.viewportObserver.disconnect();
    }
    this.viewportObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Skip if this is the currently selected item in zoom mode
          if (
            this.zoomState.selectedItem &&
            entry.target === this.zoomState.selectedItem.element
          ) {
            return;
          }
          if (entry.isIntersecting) {
            entry.target.classList.remove("out-of-view");
            gsap.to(entry.target, {
              opacity: 1,
              duration: 0.6,
              ease: "power2.out",
            });
          } else {
            entry.target.classList.add("out-of-view");
            gsap.to(entry.target, {
              opacity: 0.1,
              duration: 0.6,
              ease: "power2.out",
            });
          }
        });
      },
      {
        root: null,
        threshold: 0.15,
        rootMargin: "10%",
      },
    );
    // Observe all grid items
    this.gridItems.forEach((item) => {
      this.viewportObserver.observe(item.element);
    });
  }
  updateTitleOverlay(imageIndex) {
    const data = this.imageData[imageIndex % this.imageData.length];
    const numberElement = document.querySelector("#imageSlideNumber span");
    const titleElement = document.querySelector("#imageSlideTitle h1");
    const descriptionElement = document.getElementById("imageSlideDescription");
    if (numberElement && titleElement && descriptionElement) {
      numberElement.textContent = data.number;
      titleElement.textContent = data.title;
      const cat = document.getElementById("imageSlideCategory");
      if (cat) cat.textContent = data.category;
      this.currentData = data;
      this.setIndex(1);
      // Split description into lines
      this.descriptionLines = this.splitTextIntoLines(
        descriptionElement,
        data.description,
      );
    }
  }
  createScalingOverlay(sourceImg) {
    const overlay = document.createElement("div");
    overlay.className = "scaling-image-overlay";
    const img = document.createElement("img");
    img.src = sourceImg.src;
    img.alt = sourceImg.alt;
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    const sourceRect = sourceImg.getBoundingClientRect();
    gsap.set(overlay, {
      left: sourceRect.left,
      top: sourceRect.top,
      width: sourceRect.width,
      height: sourceRect.height,
      opacity: 1,
    });
    return overlay;
  }
  enterZoomMode(selectedItemData) {
    if (this.zoomState.isActive) return;
    this.zoomState.isActive = true;
    this.zoomState.selectedItem = selectedItemData;
    this.soundSystem.play("open");
    // Disable dragging
    if (this.draggable) this.draggable.disable();
    document.body.classList.add("zoom-mode");
    const splitContainer = this.splitScreenContainer;
    const zoomTarget = document.getElementById("zoomTarget");
    splitContainer.classList.add("active");
    gsap.to(splitContainer, {
      opacity: 1,
      duration: 1.2,
      ease: this.customEase,
    });
    this.zoomState.scalingOverlay = this.createScalingOverlay(
      selectedItemData.img,
    );
    gsap.set(selectedItemData.img, {
      opacity: 0,
    });
    // Troca a miniatura pelo cartão quadrado em alta resolução
    const hi = new Image();
    const overlayImg = this.zoomState.scalingOverlay.querySelector("img");
    hi.onload = () => {
      if (this.zoomState.scalingOverlay) overlayImg.src = hi.src;
    };
    hi.src = this.imageData[selectedItemData.index].square;
    this.zoomState.flipAnimation = Flip.fit(
      this.zoomState.scalingOverlay,
      zoomTarget,
      {
        duration: 1.2,
        ease: this.customEase,
        absolute: true,
        onComplete: () => {
          this.updateTitleOverlay(selectedItemData.index);
          const imageTitleOverlay = this.imageTitleOverlay;
          // Reset positions for animation
          gsap.set("#imageSlideNumber span", {
            y: 20,
            opacity: 0,
          });
          gsap.set("#imageSlideTitle h1", {
            y: 60,
            opacity: 0,
          });
          gsap.set(this.descriptionLines, {
            y: 80,
            opacity: 0,
          });
          gsap.set(".image-slide-extras", { y: 30, opacity: 0 });
          // Show overlay container immediately
          imageTitleOverlay.classList.add("active");
          gsap.to(imageTitleOverlay, {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
          });
          // Animate in number
          gsap.to("#imageSlideNumber span", {
            duration: 0.8,
            y: 0,
            opacity: 1,
            ease: this.customEase,
            delay: 0.1,
          });
          // Animate in title
          gsap.to("#imageSlideTitle h1", {
            duration: 0.8,
            y: 0,
            opacity: 1,
            ease: this.customEase,
            delay: 0.15,
          });
          gsap.to(".image-slide-extras", {
            duration: 0.8,
            y: 0,
            opacity: 1,
            ease: this.customEase,
            delay: 0.45,
          });
          // Animate description lines one by one
          gsap.to(this.descriptionLines, {
            duration: 0.8,
            y: 0,
            opacity: 1,
            ease: this.customEase,
            delay: 0.2,
            stagger: 0.15,
          });
        },
      },
    );
    this.controlsContainer.classList.add("split-mode");
    gsap.fromTo(
      this.closeButton,
      {
        x: 40,
        opacity: 0,
      },
      {
        x: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.9,
      },
    );
    this.closeButton.classList.add("active");
    // Add event listeners
    document
      .getElementById("splitLeft")
      .addEventListener("click", this.handleSplitAreaClick);
    document
      .getElementById("splitRight")
      .addEventListener("click", this.handleSplitAreaClick);
    document.addEventListener("keydown", this.handleZoomKeys);
  }
  handleSplitAreaClick(e) {
    if (e.target === e.currentTarget) {
      this.exitZoomMode();
    }
  }
  exitZoomMode() {
    if (
      !this.zoomState.isActive ||
      !this.zoomState.selectedItem ||
      !this.zoomState.scalingOverlay
    )
      return;
    this.soundSystem.play("close");
    document.removeEventListener("keydown", this.handleZoomKeys);
    const splitLeft = document.getElementById("splitLeft");
    const splitRight = document.getElementById("splitRight");
    if (splitLeft)
      splitLeft.removeEventListener("click", this.handleSplitAreaClick);
    if (splitRight)
      splitRight.removeEventListener("click", this.handleSplitAreaClick);
    const splitContainer = this.splitScreenContainer;
    const selectedElement = this.zoomState.selectedItem.element;
    const selectedImg = this.zoomState.selectedItem.img;
    if (this.zoomState.flipAnimation) {
      this.zoomState.flipAnimation.kill();
    }
    // Hide title overlay quickly
    const overlayElement = this.imageTitleOverlay;
    gsap.to(overlayElement, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.out",
    });
    gsap.to("#imageSlideNumber span", {
      duration: 0.4,
      y: -20,
      opacity: 0,
      ease: "power2.out",
    });
    gsap.to(".image-slide-extras", { duration: 0.3, opacity: 0, y: -20 });
    gsap.to("#imageSlideTitle h1", {
      duration: 0.4,
      y: -60,
      opacity: 0,
      ease: "power2.out",
    });
    if (this.descriptionLines) {
      gsap.to(this.descriptionLines, {
        duration: 0.4,
        y: -80,
        opacity: 0,
        ease: "power2.out",
        stagger: -0.05,
        onComplete: () => {
          overlayElement.classList.remove("active");
          // Reset all text elements
          gsap.set("#imageSlideNumber span", {
            y: 20,
            opacity: 0,
          });
          gsap.set("#imageSlideTitle h1", {
            y: 60,
            opacity: 0,
          });
          gsap.set(this.descriptionLines, {
            y: 80,
            opacity: 0,
          });
        },
      });
    }
    gsap.to(this.closeButton, {
      duration: 0.3,
      opacity: 0,
      x: 40,
      ease: "power2.in",
    });
    splitContainer.classList.remove("active");
    this.controlsContainer.classList.remove("split-mode");
    gsap.to(splitContainer, {
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
    });
    Flip.fit(this.zoomState.scalingOverlay, selectedElement, {
      duration: 1.2,
      ease: this.customEase,
      absolute: true,
      onComplete: () => {
        gsap.set(selectedImg, {
          opacity: 1,
        });
        if (this.zoomState.scalingOverlay) {
          document.body.removeChild(this.zoomState.scalingOverlay);
          this.zoomState.scalingOverlay = null;
        }
        splitContainer.classList.remove("active");
        document.body.classList.remove("zoom-mode");
        this.closeButton.classList.remove("active");
        if (this.draggable) this.draggable.enable();
        this.zoomState.isActive = false;
        this.zoomState.selectedItem = null;
        this.zoomState.flipAnimation = null;
      },
    });
    if (this.zoomState.scalingOverlay) {
      gsap.to(this.zoomState.scalingOverlay, {
        opacity: 0.4,
        duration: 0.8,
        ease: "power2.out",
      });
    }
  }
  /* ---- Seleção para a equação ---- */
  initSelection() {
    const params = new URLSearchParams(location.search);
    this.slot = params.has("slot") ? parseInt(params.get("slot"), 10) : null;
    this.eqParam = params.get("eq");
    this.index = 1;
    if (this.slot === null || isNaN(this.slot)) return;
    const labels = ["Reagente 1", "Reagente 2", "Produto 1", "Produto 2"];
    const ctx = document.getElementById("selectContext");
    ctx.hidden = false;
    ctx.textContent = `Selecionando para: ${labels[this.slot] || "termo"}`;
    document.getElementById("selectBox").hidden = false;
    document.getElementById("idxMinus").onclick = () =>
      this.setIndex(this.index - 1);
    document.getElementById("idxPlus").onclick = () =>
      this.setIndex(this.index + 1);
    document.getElementById("selectButton").onclick = () =>
      this.selectElement();
  }
  setIndex(n) {
    this.index = Math.max(1, Math.min(20, n));
    const v = document.getElementById("idxValue");
    if (v) v.textContent = this.index;
    const p = document.getElementById("idxPreview");
    if (p && this.currentData) {
      const sub = String(this.index).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[d]);
      p.textContent = this.currentData.symbol + (this.index > 1 ? sub : "");
    }
  }
  selectElement() {
    if (!this.currentData || this.slot === null) return;
    let eq;
    try {
      eq = JSON.parse(this.eqParam);
    } catch (e) {
      eq = null;
    }
    if (!Array.isArray(eq) || eq.length !== 4) eq = [[], [], [], []];
    if (eq[this.slot].length >= 4) {
      location.href =
        "../index.html?eq=" + encodeURIComponent(JSON.stringify(eq));
      return;
    }
    eq[this.slot].push({ s: this.currentData.symbol, n: this.index });
    location.href =
      "../index.html?eq=" + encodeURIComponent(JSON.stringify(eq));
  }
  openDetails() {
    const data = this.currentData;
    if (!data || this.detailOpen) return;
    this.detailOpen = true;
    this.soundSystem.play("open");
    const modal = document.getElementById("detailModal");
    const img = document.getElementById("detailImage");
    document.getElementById("detailHeading").textContent =
      `Mais detalhes sobre o elemento ${data.title}`;
    document.getElementById("detailSub").textContent =
      `${data.symbol} · nº ${parseInt(data.number, 10)} · ${data.category}`;
    modal.classList.add("loading");
    img.onload = () => modal.classList.remove("loading");
    img.src = data.detail;
    img.alt = `Cartão detalhado: ${data.title}`;
    modal.classList.add("open");
    gsap.fromTo(
      ".detail-card",
      { y: 40, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: this.customEase },
    );
    gsap.fromTo(
      ".detail-head",
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, delay: 0.1, ease: "power2.out" },
    );
  }
  closeDetails() {
    if (!this.detailOpen) return;
    this.detailOpen = false;
    this.soundSystem.play("close");
    const modal = document.getElementById("detailModal");
    gsap.to(modal.querySelectorAll(".detail-card, .detail-head"), {
      opacity: 0,
      y: 20,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => modal.classList.remove("open"),
    });
  }
  handleZoomKeys(e) {
    if (!this.zoomState.isActive) return;
    if (e.key === "Escape") {
      if (this.detailOpen) this.closeDetails();
      else this.exitZoomMode();
    }
  }
  calculateBounds() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { scaledWidth, scaledHeight } = this.gridDimensions;
    const marginX = this.config.currentGap * this.config.currentZoom;
    const marginY = this.config.currentGap * this.config.currentZoom;
    let minX, maxX, minY, maxY;
    if (scaledWidth <= vw) {
      const centerX = (vw - scaledWidth) / 2;
      minX = maxX = centerX;
    } else {
      maxX = marginX;
      minX = vw - scaledWidth - marginX;
    }
    if (scaledHeight <= vh) {
      const centerY = (vh - scaledHeight) / 2;
      minY = maxY = centerY;
    } else {
      maxY = marginY;
      minY = vh - scaledHeight - marginY;
    }
    return {
      minX,
      maxX,
      minY,
      maxY,
    };
  }
  initDraggable() {
    if (this.draggable) {
      this.draggable.kill();
    }
    this.calculateGridDimensions(this.config.currentGap);
    const bounds = this.calculateBounds();
    this.draggable = Draggable.create(this.canvasWrapper, {
      type: "x,y",
      bounds: bounds,
      edgeResistance: 0.8,
      inertia: true,
      throwProps: {
        x: {
          velocity: "auto",
          resistance: 300,
          end: (endValue) => Math.round(endValue),
        },
        y: {
          velocity: "auto",
          resistance: 300,
          end: (endValue) => Math.round(endValue),
        },
      },
      onDragStart: () => {
        document.body.classList.add("dragging");
        this.soundSystem.play("drag-start");
        this.lastValidPosition.x = this.draggable.x;
        this.lastValidPosition.y = this.draggable.y;
      },
      onDrag: () => {
        this.lastValidPosition.x = this.draggable.x;
        this.lastValidPosition.y = this.draggable.y;
      },
      onDragEnd: () => {
        document.body.classList.remove("dragging");
        this.soundSystem.play("drag-end");
      },
    })[0];
  }
  handleMouseLeave() {
    if (document.body.classList.contains("dragging")) {
      document.body.classList.remove("dragging");
      gsap.to(this.canvasWrapper, {
        duration: 0.6,
        x: this.lastValidPosition.x,
        y: this.lastValidPosition.y,
        ease: "power2.out",
      });
      if (this.draggable) {
        this.draggable.endDrag();
      }
    }
  }
  calculateFitZoom() {
    const vw = window.innerWidth;
    const vh = window.innerHeight - 80;
    const currentGap = this.calculateGapForZoom(1.0);
    const gridWidth =
      this.config.cols * (this.config.itemSize + currentGap) - currentGap;
    const gridHeight =
      this.config.rows * (this.config.itemSize + currentGap) - currentGap;
    const margin = 40;
    const availableWidth = vw - margin * 2;
    const availableHeight = vh - margin * 2;
    const zoomToFitWidth = availableWidth / gridWidth;
    const zoomToFitHeight = availableHeight / gridHeight;
    const fitZoom = Math.min(zoomToFitWidth, zoomToFitHeight);
    return Math.max(0.1, Math.min(2.0, fitZoom));
  }
  playIntroAnimation() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const screenCenterX = vw / 2;
    const screenCenterY = vh / 2;
    const canvasStyle = getComputedStyle(this.canvasWrapper);
    const canvasMatrix = new DOMMatrix(canvasStyle.transform);
    const canvasX = canvasMatrix.m41;
    const canvasY = canvasMatrix.m42;
    const canvasScale = canvasMatrix.a;
    const centerX =
      (screenCenterX - canvasX) / canvasScale - this.config.itemSize / 2;
    const centerY =
      (screenCenterY - canvasY) / canvasScale - this.config.itemSize / 2;

    // Position items at center but keep hidden
    this.gridItems.forEach((itemData, index) => {
      const zIndex = this.gridItems.length - index;
      gsap.set(itemData.element, {
        left: centerX,
        top: centerY,
        scale: 0.8,
        zIndex: zIndex,
        opacity: 0, // Keep hidden, will fade in during animation
      });
    });

    // Animate from center to grid positions with fade in
    gsap.to(
      this.gridItems.map((item) => item.element),
      {
        duration: 0.2,
        left: (index) => this.gridItems[index].baseX,
        top: (index) => this.gridItems[index].baseY,
        scale: 1,
        opacity: 1,
        ease: "power2.out",
        stagger: {
          amount: 1.5,
          from: "start",
          grid: [this.config.rows, this.config.cols],
        },
        onComplete: () => {
          this.gridItems.forEach((itemData) => {
            gsap.set(itemData.element, {
              zIndex: 1,
            });
          });
          // Show controls with staggered animation
          const percentageIndicator = this.controlsContainer.querySelector(
            ".percentage-indicator",
          );
          const switchElement = this.controlsContainer.querySelector(".switch");
          const soundToggle =
            this.controlsContainer.querySelector(".sound-toggle");
          gsap.set(this.controlsContainer, {
            opacity: 0,
          });
          gsap.set(percentageIndicator, {
            x: "-3em",
          });
          gsap.set(switchElement, {
            y: "2em",
          });
          gsap.set(soundToggle, {
            x: "3em",
          });
          const navTimeline = gsap.timeline();
          navTimeline.to(
            this.controlsContainer,
            {
              opacity: 1,
              duration: 0.5,
              ease: "power2.out",
            },
            0,
          );
          navTimeline.to(
            percentageIndicator,
            {
              x: 0,
              duration: 0.2,
              ease: "power2.out",
            },
            0.25,
          );
          navTimeline.to(
            switchElement,
            {
              y: 0,
              duration: 0.2,
              ease: "power2.out",
            },
            0.3,
          );
          navTimeline.to(
            soundToggle,
            {
              x: 0,
              duration: 0.2,
              ease: "power2.out",
            },
            0.35,
          );
          this.controlsContainer.classList.add("visible");
        },
      },
    );
  }
  autoFitZoom(buttonElement = null) {
    if (this.zoomState.isActive) {
      this.exitZoomMode();
      return;
    }
    const fitZoom = this.calculateFitZoom();
    this.config.currentZoom = fitZoom;
    const newGap = this.calculateGapForZoom(fitZoom);
    this.soundSystem.play(fitZoom < 0.6 ? "zoom-out" : "zoom-in");
    this.calculateGridDimensions(this.config.currentGap);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const currentScaledWidth =
      this.gridDimensions.width * this.config.currentZoom;
    const currentScaledHeight =
      this.gridDimensions.height * this.config.currentZoom;
    const centerX = (vw - currentScaledWidth) / 2;
    const centerY = (vh - currentScaledHeight) / 2;
    gsap.to(this.canvasWrapper, {
      duration: 0.6,
      x: centerX,
      y: centerY,
      ease: this.centerEase,
      onComplete: () => {
        if (newGap !== this.config.currentGap) {
          this.gridItems.forEach((itemData) => {
            const newX = itemData.col * (this.config.itemSize + newGap);
            const newY = itemData.row * (this.config.itemSize + newGap);
            itemData.baseX = newX;
            itemData.baseY = newY;
            gsap.to(itemData.element, {
              duration: 1.0,
              left: newX,
              top: newY,
              ease: this.customEase,
            });
          });
          const newWidth =
            this.config.cols * (this.config.itemSize + newGap) - newGap;
          const newHeight =
            this.config.rows * (this.config.itemSize + newGap) - newGap;
          gsap.to(this.canvasWrapper, {
            duration: 1.0,
            width: newWidth,
            height: newHeight,
            ease: this.customEase,
          });
          this.config.currentGap = newGap;
        }
        this.calculateGridDimensions(newGap);
        const finalScaledWidth = this.gridDimensions.width * fitZoom;
        const finalScaledHeight = this.gridDimensions.height * fitZoom;
        const finalCenterX = (vw - finalScaledWidth) / 2;
        const finalCenterY = (vh - finalScaledHeight) / 2;
        gsap.to(this.canvasWrapper, {
          duration: 1.2,
          scale: fitZoom,
          x: finalCenterX,
          y: finalCenterY,
          ease: this.customEase,
          onComplete: () => {
            this.lastValidPosition.x = finalCenterX;
            this.lastValidPosition.y = finalCenterY;
            this.initDraggable();
          },
        });
      },
    });
    this.updatePercentageIndicator(fitZoom);
    document.querySelectorAll(".switch-button").forEach((btn) => {
      btn.classList.remove("switch-button-current");
    });
    if (buttonElement) {
      buttonElement.classList.add("switch-button-current");
    } else {
      const buttons = document.querySelectorAll(".switch-button");
      if (buttons[3]) buttons[3].classList.add("switch-button-current");
    }
  }
  updatePercentageIndicator(zoomLevel) {
    const percentage = Math.round(zoomLevel * 100);
    const el = document.getElementById("percentageIndicator");
    if (el) el.textContent = `${percentage}%`;
  }
  setZoom(zoomLevel, buttonElement = null) {
    if (this.zoomState.isActive) {
      this.exitZoomMode();
      return;
    }
    const newGap = this.calculateGapForZoom(zoomLevel);
    const oldZoom = this.config.currentZoom;
    this.config.currentZoom = zoomLevel;
    this.soundSystem.play(zoomLevel < oldZoom ? "zoom-out" : "zoom-in");
    this.calculateGridDimensions(this.config.currentGap);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const currentScaledWidth = this.gridDimensions.width * oldZoom;
    const currentScaledHeight = this.gridDimensions.height * oldZoom;
    const centerX = (vw - currentScaledWidth) / 2;
    const centerY = (vh - currentScaledHeight) / 2;
    gsap.to(this.canvasWrapper, {
      duration: 0.6,
      x: centerX,
      y: centerY,
      ease: this.centerEase,
      onComplete: () => {
        if (newGap !== this.config.currentGap) {
          this.gridItems.forEach((itemData) => {
            const newX = itemData.col * (this.config.itemSize + newGap);
            const newY = itemData.row * (this.config.itemSize + newGap);
            itemData.baseX = newX;
            itemData.baseY = newY;
            gsap.to(itemData.element, {
              duration: 1.2,
              left: newX,
              top: newY,
              ease: this.customEase,
            });
          });
          const newWidth =
            this.config.cols * (this.config.itemSize + newGap) - newGap;
          const newHeight =
            this.config.rows * (this.config.itemSize + newGap) - newGap;
          gsap.to(this.canvasWrapper, {
            duration: 1.2,
            width: newWidth,
            height: newHeight,
            ease: this.customEase,
          });
          this.config.currentGap = newGap;
        }
        this.calculateGridDimensions(newGap);
        const finalScaledWidth = this.gridDimensions.width * zoomLevel;
        const finalScaledHeight = this.gridDimensions.height * zoomLevel;
        const finalCenterX = (vw - finalScaledWidth) / 2;
        const finalCenterY = (vh - finalScaledHeight) / 2;
        gsap.to(this.canvasWrapper, {
          duration: 1.2,
          scale: zoomLevel,
          x: finalCenterX,
          y: finalCenterY,
          ease: this.customEase,
          onComplete: () => {
            this.lastValidPosition.x = finalCenterX;
            this.lastValidPosition.y = finalCenterY;
            this.calculateGridDimensions(newGap);
            this.initDraggable();
          },
        });
      },
    });
    this.updatePercentageIndicator(zoomLevel);
    document.querySelectorAll(".switch-button").forEach((btn) => {
      btn.classList.remove("switch-button-current");
    });
    if (buttonElement) {
      buttonElement.classList.add("switch-button-current");
    } else {
      const buttons = document.querySelectorAll(".switch-button");
      if (!buttons.length) return;
      if (zoomLevel === 0.3) buttons[0].classList.add("switch-button-current");
      else if (zoomLevel === 0.6)
        buttons[1].classList.add("switch-button-current");
      else if (zoomLevel === 1.0)
        buttons[2].classList.add("switch-button-current");
    }
  }
  resetPosition() {
    if (this.zoomState.isActive) {
      this.exitZoomMode();
      return;
    }
    this.calculateGridDimensions(this.config.currentGap);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { scaledWidth, scaledHeight } = this.gridDimensions;
    const centerX = (vw - scaledWidth) / 2;
    const centerY = (vh - scaledHeight) / 2;
    gsap.to(this.canvasWrapper, {
      duration: 1.0,
      x: centerX,
      y: centerY,
      ease: this.centerEase,
      onComplete: () => {
        this.lastValidPosition.x = centerX;
        this.lastValidPosition.y = centerY;
        this.initDraggable();
      },
    });
  }
  init() {
    this.initSelection();
    this.config.currentGap = this.calculateGapForZoom(this.config.currentZoom);
    this.generateGridItems();

    // Set initial opacity for viewport to hide the flash
    gsap.set(this.viewport, { opacity: 0 });

    gsap.set(this.canvasWrapper, {
      scale: this.config.currentZoom,
    });
    this.calculateGridDimensions(this.config.currentGap);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { scaledWidth, scaledHeight } = this.gridDimensions;
    const centerX = (vw - scaledWidth) / 2;
    const centerY = (vh - scaledHeight) / 2;
    gsap.set(this.canvasWrapper, {
      x: centerX,
      y: centerY,
    });
    this.lastValidPosition.x = centerX;
    this.lastValidPosition.y = centerY;
    this.updatePercentageIndicator(this.config.currentZoom);

    // Setup event listeners
    this.setupEventListeners();

    // Fade in viewport, then play animations
    gsap.to(this.viewport, {
      duration: 0.6,
      opacity: 1,
      ease: "power2.inOut",
      onComplete: () => {
        this.playIntroAnimation();

        gsap.to(".header", {
          duration: 1.2,
          opacity: 1,
          ease: "power2.out",
          delay: 0.8,
        });

        gsap.to(".footer", {
          duration: 1.4,
          opacity: 1,
          ease: "power2.out",
          delay: 1,
        });

        setTimeout(() => {
          this.initDraggable();
          this.setupViewportObserver();
        }, 1500);
      },
    });
  }
  setupEventListeners() {
    window.addEventListener("resize", () => {
      setTimeout(() => {
        this.resetPosition();
      }, 100);
    });
    document.addEventListener("mouseleave", () => this.handleMouseLeave());
    this.viewport.addEventListener("mouseleave", () => this.handleMouseLeave());
    this.closeButton.addEventListener("click", () => this.exitZoomMode());
    document.getElementById("detailsButton").addEventListener("click", (e) => {
      e.stopPropagation();
      this.openDetails();
    });
    document.getElementById("detailModal").addEventListener("click", (e) => {
      if (
        e.target.closest(".detail-card") &&
        !e.target.closest(".detail-close")
      )
        return;
      this.closeDetails();
    });
    this.soundToggle.addEventListener("click", () => this.soundSystem.toggle());
    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (this.zoomState.isActive) return;
      switch (e.key) {
        case "1":
          this.setZoom(0.3);
          break;
        case "2":
          this.setZoom(0.6);
          break;
        case "3":
          this.setZoom(1.0);
          break;
        case "f":
        case "F":
          this.autoFitZoom();
          break;
      }
    });
  }
}

// Initialize gallery with preloader
let gallery;
document.addEventListener("DOMContentLoaded", () => {
  new PreloaderManager(() => {
    gallery = new FashionGallery();
    gallery.init();
  });
});
