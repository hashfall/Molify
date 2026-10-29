// Register GSAP plugins
gsap.registerPlugin(Draggable, InertiaPlugin, CustomEase, Flip);

class FashionGallery {
  constructor() {
    this.viewport = document.getElementById("viewport");
    this.canvasWrapper = document.getElementById("canvasWrapper");
    this.gridContainer = document.getElementById("gridContainer");
    this.splitScreenContainer = document.getElementById("splitScreenContainer");
    this.imageTitleOverlay = document.getElementById("imageTitleOverlay");
    this.closeButton = document.getElementById("closeButton");

    // Elemento fantasma para manter os atalhos compatíveis.
    this.controlsContainer =
      document.getElementById("controlsContainer") ||
      document.createElement("div");

    if (!this.controlsContainer.querySelector(".sound-toggle")) {
      this.controlsContainer.innerHTML =
        '<div class="percentage-indicator"></div><div class="switch"></div><button class="sound-toggle"></button>';
    }

    this.soundToggle =
      this.controlsContainer.querySelector(".sound-toggle");

    this.customEase = CustomEase.create("smooth", ".87,0,.13,1");
    this.centerEase = CustomEase.create("center", ".25,.46,.45,.94");

    this.config = {
      itemSize: FashionGallery.pickItemSize(),
      baseGap: 16,
      rows: 10,
      cols: 12,
      currentZoom: 0.6,
      currentGap: 32
    };

    this.zoomState = {
      isActive: false,
      selectedItem: null,
      flipAnimation: null,
      scalingOverlay: null
    };

    this.gridItems = [];
    this.gridDimensions = {};
    this.lastValidPosition = { x: 0, y: 0 };
    this.draggable = null;
    this.viewportObserver = null;
    this.reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    this.handleSplitAreaClick =
      this.handleSplitAreaClick.bind(this);
    this.handleZoomKeys = this.handleZoomKeys.bind(this);

    this.initSoundSystem();
    this.initImageData();
  }

  // Celular = cartões menores; tablet pequeno = médios.
  static pickItemSize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (Math.min(w, h) <= 520) return 200;
    if (w <= 900) return 260;
    return 320;
  }

  initSoundSystem() {
    const urls = {
      click: "https://assets.codepen.io/7558/glitch-fx-001.mp3",
      open: "https://assets.codepen.io/7558/click-glitch-001.mp3",
      close: "https://assets.codepen.io/7558/click-glitch-001.mp3",
      "drag-start": "https://assets.codepen.io/7558/preloader-2s-001.mp3",
      "drag-end": "https://assets.codepen.io/7558/preloader-2s-001.mp3"
    };

    this.soundSystem = {
      enabled: false,
      sounds: {},

      play: (soundName) => {
        if (!this.soundSystem.enabled || !urls[soundName]) return;

        try {
          let audio = this.soundSystem.sounds[soundName];

          if (!audio) {
            audio = new Audio(urls[soundName]);
            audio.volume = 0.3;
            this.soundSystem.sounds[soundName] = audio;
          }

          audio.currentTime = 0;
          audio.play().catch(() => {});
        } catch (e) {
          // Ignora erros de áudio.
        }
      },

      toggle: () => {
        this.soundSystem.enabled = !this.soundSystem.enabled;
        this.soundToggle.classList.toggle(
          "active",
          this.soundSystem.enabled
        );

        if (this.zoomState.isActive) return;

        if (this.soundSystem.enabled) {
          setTimeout(() => {
            this.soundSystem.play("click");
          }, 50);
        }
      }
    };

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
      currentAmplitude +=
        (targetAmplitude - currentAmplitude) * 0.08;

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
        ctx.fillStyle = interpolateColor(
          primaryColor,
          muteColor,
          muteFactor
        );

        for (let i = 0; i < width; i++) {
          const x = i - width / 2;
          const e = Math.exp((-x * x) / 50);
          const y =
            centerY +
            Math.cos(x * 0.4 - time * 8) *
              e *
              height *
              0.35 *
              currentAmplitude;

          ctx.fillRect(i, Math.round(y), 1, 2);
        }

        ctx.fillStyle = interpolateColor(
          accentColor,
          muteColor,
          muteFactor
        );

        for (let i = 0; i < width; i++) {
          const x = i - width / 2;
          const e = Math.exp((-x * x) / 80);
          const y =
            centerY +
            Math.cos(x * 0.3 - time * 5) *
              e *
              height *
              0.25 *
              currentAmplitude;

          ctx.fillRect(i, Math.round(y), 1, 2);
        }
      }

      requestAnimationFrame(animate);
    };

    animate();
  }

  initImageData() {
    // Dados dos elementos em elementos.js.
    this.imageData = ELEMENTOS.map((el) => ({
      number: String(el.z).padStart(3, "0"),
      title: el.n,
      symbol: el.s,
      category: el.c,
      description:
        `${el.s} · número atômico ${el.z}. Abra o cartão completo para ver o modelo de Bohr, a configuração eletrônica e as principais propriedades.`,
      thumb: `img/thumb/${el.f}.webp`,
      square: `img/quadrado/${el.f}.webp`,
      detail: `img/detalhe/${el.f}.webp`
    }));

    this.fashionImages = this.imageData.map((data) => data.thumb);
  }

  calculateGapForZoom(zoomLevel) {
    if (zoomLevel >= 1.0) return 16;
    if (zoomLevel >= 0.6) {
      return this.config.itemSize < 320 ? 20 : 32;
    }
    return 64;
  }

  calculateGridDimensions(gap = this.config.currentGap) {
    const totalWidth =
      this.config.cols * (this.config.itemSize + gap) - gap;
    const totalHeight =
      this.config.rows * (this.config.itemSize + gap) - gap;

    this.gridDimensions = {
      width: totalWidth,
      height: totalHeight,
      scaledWidth: totalWidth * this.config.currentZoom,
      scaledHeight: totalHeight * this.config.currentZoom,
      gap
    };

    return this.gridDimensions;
  }

  generateGridItems() {
    document.documentElement.style.setProperty(
      "--item-size",
      `${this.config.itemSize}px`
    );

    this.config.currentGap = this.calculateGapForZoom(
      this.config.currentZoom
    );

    this.calculateGridDimensions();

    this.canvasWrapper.style.width =
      `${this.gridDimensions.width}px`;
    this.canvasWrapper.style.height =
      `${this.gridDimensions.height}px`;

    this.gridContainer.innerHTML = "";
    this.gridItems = [];

    let imageIndex = 0;
    const total = this.imageData.length;

    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        if (imageIndex >= total) break;

        const item = document.createElement("div");
        item.className = "grid-item";

        const x =
          col * (this.config.itemSize + this.config.currentGap);
        const y =
          row * (this.config.itemSize + this.config.currentGap);

        item.style.left = `${x}px`;
        item.style.top = `${y}px`;

        const currentIndex = imageIndex;
        const imageUrl = this.fashionImages[currentIndex];
        imageIndex++;

        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt =
          `Cartão do elemento ${this.imageData[currentIndex].title}`;
        img.decoding = "async";
        img.loading = "lazy";
        item.appendChild(img);

        const itemData = {
          element: item,
          img,
          row,
          col,
          baseX: x,
          baseY: y,
          imageUrl,
          index: this.gridItems.length
        };

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
          const selected = this.zoomState.selectedItem;
          if (selected && entry.target === selected.element) return;

          entry.target.classList.toggle(
            "out-of-view",
            !entry.isIntersecting
          );
        });
      },
      { root: null, threshold: 0.15, rootMargin: "10%" }
    );

    this.gridItems.forEach((item) => {
      this.viewportObserver.observe(item.element);
    });
  }

  updateTitleOverlay(imageIndex) {
    const data = this.imageData[imageIndex % this.imageData.length];
    const numberElement =
      document.querySelector("#imageSlideNumber span");
    const titleElement =
      document.querySelector("#imageSlideTitle h1");
    const descriptionElement =
      document.getElementById("imageSlideDescription");

    if (numberElement && titleElement && descriptionElement) {
      numberElement.textContent = data.number;
      titleElement.textContent = data.title;

      const category = document.getElementById(
        "imageSlideCategory"
      );
      if (category) category.textContent = data.category;

      this.currentData = data;
      this.setIndex(1);

      descriptionElement.innerHTML = "";
      const line = document.createElement("span");
      line.className = "description-line";
      line.textContent = data.description;
      descriptionElement.appendChild(line);
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
      opacity: 1
    });

    return overlay;
  }

  enterZoomMode(selectedItemData) {
    if (this.zoomState.isActive) return;

    this.zoomState.isActive = true;
    this.zoomState.selectedItem = selectedItemData;
    this.soundSystem.play("open");

    if (this.draggable) this.draggable.disable();

    document.body.classList.add("zoom-mode");

    const splitContainer = this.splitScreenContainer;
    const zoomTarget = document.getElementById("zoomTarget");

    splitContainer.classList.add("active");
    gsap.set(splitContainer, { opacity: 1 });

    this.zoomState.scalingOverlay = this.createScalingOverlay(
      selectedItemData.img
    );

    gsap.set(selectedItemData.img, { opacity: 0 });

    // Troca a miniatura pelo cartão quadrado em alta resolução.
    const hi = new Image();
    const overlayImg =
      this.zoomState.scalingOverlay.querySelector("img");

    hi.onload = () => {
      if (this.zoomState.scalingOverlay) {
        overlayImg.src = hi.src;
      }
    };

    hi.src = this.imageData[selectedItemData.index].square;

    this.updateTitleOverlay(selectedItemData.index);
    this.imageTitleOverlay.classList.add("active");
    gsap.set(this.imageTitleOverlay, { opacity: 1 });

    this.zoomState.flipAnimation = Flip.fit(
      this.zoomState.scalingOverlay,
      zoomTarget,
      {
        duration: this.reduceMotion ? 0.01 : 0.2,
        ease: "power2.out",
        absolute: true
      }
    );

    this.controlsContainer.classList.add("split-mode");
    this.closeButton.classList.add("active");
    this.positionCloseButton();
    gsap.set(this.closeButton, { x: 0, opacity: 1 });

    document
      .getElementById("splitLeft")
      .addEventListener("click", this.handleSplitAreaClick);
    document
      .getElementById("splitRight")
      .addEventListener("click", this.handleSplitAreaClick);
    document.addEventListener("keydown", this.handleZoomKeys);
  }

  handleSplitAreaClick(event) {
    if (event.target === event.currentTarget) {
      this.exitZoomMode();
    }
  }

  exitZoomMode() {
    if (
      !this.zoomState.isActive ||
      !this.zoomState.selectedItem ||
      !this.zoomState.scalingOverlay ||
      this.zoomState.closing
    ) {
      return;
    }

    this.zoomState.closing = true;
    this.soundSystem.play("close");
    document.removeEventListener("keydown", this.handleZoomKeys);

    const splitLeft = document.getElementById("splitLeft");
    const splitRight = document.getElementById("splitRight");

    if (splitLeft) {
      splitLeft.removeEventListener(
        "click",
        this.handleSplitAreaClick
      );
    }

    if (splitRight) {
      splitRight.removeEventListener(
        "click",
        this.handleSplitAreaClick
      );
    }

    const duration = this.reduceMotion ? 0.01 : 0.2;
    const splitContainer = this.splitScreenContainer;
    const selectedElement = this.zoomState.selectedItem.element;
    const selectedImg = this.zoomState.selectedItem.img;

    if (this.zoomState.flipAnimation) {
      this.zoomState.flipAnimation.kill();
    }

    gsap.set(this.imageTitleOverlay, { opacity: 0 });
    this.imageTitleOverlay.classList.remove("active");
    gsap.set(this.closeButton, { opacity: 0, x: 40 });
    splitContainer.classList.remove("active");
    this.controlsContainer.classList.remove("split-mode");

    gsap.to(splitContainer, {
      opacity: 0,
      duration,
      ease: "power2.out"
    });

    Flip.fit(this.zoomState.scalingOverlay, selectedElement, {
      duration,
      ease: "power2.out",
      absolute: true,
      onComplete: () => {
        gsap.set(selectedImg, { opacity: 1 });

        if (this.zoomState.scalingOverlay) {
          document.body.removeChild(
            this.zoomState.scalingOverlay
          );
          this.zoomState.scalingOverlay = null;
        }

        document.body.classList.remove("zoom-mode");
        this.closeButton.classList.remove("active");

        if (this.draggable) this.draggable.enable();

        this.zoomState.isActive = false;
        this.zoomState.selectedItem = null;
        this.zoomState.flipAnimation = null;
        this.zoomState.closing = false;

        if (
          FashionGallery.pickItemSize() !== this.config.itemSize
        ) {
          this.rebuildGrid();
        }
      }
    });
  }

  setupHomeLinks() {
    const params = new URLSearchParams(location.search);
    params.delete("slot");

    const queryString = params.toString();

    document.querySelectorAll("a[data-home]").forEach((link) => {
      link.href =
        "../index.html" +
        (queryString ? `?${queryString}` : "");
    });

    document.querySelectorAll("a[data-self]").forEach((link) => {
      link.href = "index.html" + location.search;
    });
  }

  initSelection() {
    this.setupHomeLinks();

    const params = new URLSearchParams(location.search);
    this.slot = params.has("slot")
      ? parseInt(params.get("slot"), 10)
      : null;
    this.eqParam = params.get("eq");
    this.index = 1;

    if (this.slot === null || isNaN(this.slot)) return;

    const selectBox = document.getElementById("selectBox");
    if (selectBox) selectBox.hidden = false;

    const minusButton = document.getElementById("idxMinus");
    const plusButton = document.getElementById("idxPlus");
    const selectButton = document.getElementById("selectButton");

    if (minusButton) {
      minusButton.onclick = () => this.setIndex(this.index - 1);
    }

    if (plusButton) {
      plusButton.onclick = () => this.setIndex(this.index + 1);
    }

    if (selectButton) {
      selectButton.onclick = () => this.selectElement();
    }
  }

  setIndex(number) {
    this.index = Math.max(1, Math.min(20, number));

    const value = document.getElementById("idxValue");
    if (value) value.textContent = this.index;

    const preview = document.getElementById("idxPreview");

    if (preview && this.currentData) {
      const subscript = String(this.index).replace(
        /\d/g,
        (digit) => "₀₁₂₃₄₅₆₇₈₉"[digit]
      );

      preview.textContent =
        this.currentData.symbol +
        (this.index > 1 ? subscript : "");
    }
  }

  selectElement() {
    if (!this.currentData || this.slot === null) return;

    let equation;

    try {
      equation = JSON.parse(this.eqParam);
    } catch (e) {
      equation = null;
    }

    if (!Array.isArray(equation) || equation.length !== 4) {
      equation = [[], [], [], []];
    }

    if (equation[this.slot].length >= 4) {
      location.href =
        "../index.html?eq=" +
        encodeURIComponent(JSON.stringify(equation));
      return;
    }

    equation[this.slot].push({
      s: this.currentData.symbol,
      n: this.index
    });

    location.href =
      "../index.html?eq=" +
      encodeURIComponent(JSON.stringify(equation));
  }

  openDetails() {
    const data = this.currentData;
    if (!data || this.detailOpen) return;

    this.detailOpen = true;
    this.soundSystem.play("open");

    const modal = document.getElementById("detailModal");
    const img = document.getElementById("detailImage");
    const heading = document.getElementById("detailHeading");
    const subheading = document.getElementById("detailSub");

    if (heading) {
      heading.textContent =
        `Mais detalhes sobre o elemento ${data.title}`;
    }

    if (subheading) {
      subheading.textContent =
        `${data.symbol} · nº ${parseInt(data.number, 10)} · ${data.category}`;
    }

    if (!modal || !img) return;

    modal.classList.add("loading");
    img.onload = () => modal.classList.remove("loading");
    img.src = data.detail;
    img.alt = `Cartão detalhado: ${data.title}`;
    modal.classList.add("open");
  }

  closeDetails() {
    if (!this.detailOpen) return;

    this.detailOpen = false;
    this.soundSystem.play("close");

    const modal = document.getElementById("detailModal");
    if (modal) modal.classList.remove("open");
  }

  handleZoomKeys(event) {
    if (!this.zoomState.isActive) return;

    if (event.key === "Escape") {
      if (this.detailOpen) this.closeDetails();
      else this.exitZoomMode();
    }
  }

  calculateBounds() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const { scaledWidth, scaledHeight } = this.gridDimensions;
    const marginX =
      this.config.currentGap * this.config.currentZoom;
    const marginY =
      this.config.currentGap * this.config.currentZoom;

    let minX;
    let maxX;
    let minY;
    let maxY;

    if (scaledWidth <= viewportWidth) {
      const centerX = (viewportWidth - scaledWidth) / 2;
      minX = maxX = centerX;
    } else {
      maxX = marginX;
      minX = viewportWidth - scaledWidth - marginX;
    }

    if (scaledHeight <= viewportHeight) {
      const centerY = (viewportHeight - scaledHeight) / 2;
      minY = maxY = centerY;
    } else {
      maxY = marginY;
      minY = viewportHeight - scaledHeight - marginY;
    }

    return { minX, maxX, minY, maxY };
  }

  initDraggable() {
    if (this.draggable) {
      this.draggable.kill();
    }

    this.calculateGridDimensions(this.config.currentGap);
    const bounds = this.calculateBounds();

    this.draggable = Draggable.create(this.canvasWrapper, {
      type: "x,y",
      bounds,
      edgeResistance: 0.8,
      inertia: true,
      minimumMovement: window.matchMedia("(pointer: coarse)").matches
        ? 10
        : 5,

      throwProps: {
        x: {
          velocity: "auto",
          resistance: 300,
          end: (endValue) => Math.round(endValue)
        },
        y: {
          velocity: "auto",
          resistance: 300,
          end: (endValue) => Math.round(endValue)
        }
      },

      // O Draggable só chama onClick quando o toque/clique não foi arrasto.
      onClick: (event) => {
        const target =
          event?.target instanceof Element ? event.target : null;
        const card = target?.closest(".grid-item");

        const itemData = this.gridItems.find(
          (item) => item.element === card
        );

        if (!itemData || this.zoomState.isActive) return;

        this.soundSystem.play("click");
        this.enterZoomMode(itemData);
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
      }
    })[0];
  }

  handleMouseLeave() {
    if (!document.body.classList.contains("dragging")) return;

    document.body.classList.remove("dragging");

    gsap.to(this.canvasWrapper, {
      duration: 0.6,
      x: this.lastValidPosition.x,
      y: this.lastValidPosition.y,
      ease: "power2.out"
    });

    if (this.draggable) {
      this.draggable.endDrag();
    }
  }

  resetPosition() {
    if (this.zoomState.isActive) {
      this.exitZoomMode();
      return;
    }

    this.calculateGridDimensions(this.config.currentGap);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const { scaledWidth, scaledHeight } = this.gridDimensions;
    const centerX = (viewportWidth - scaledWidth) / 2;
    const centerY = (viewportHeight - scaledHeight) / 2;

    gsap.to(this.canvasWrapper, {
      duration: 0.5,
      x: centerX,
      y: centerY,
      ease: this.centerEase,
      onComplete: () => {
        this.lastValidPosition.x = centerX;
        this.lastValidPosition.y = centerY;
        this.initDraggable();
      }
    });
  }

  rebuildGrid() {
    this.config.itemSize = FashionGallery.pickItemSize();
    this.generateGridItems();
    this.setupViewportObserver();

    gsap.set(this.canvasWrapper, {
      scale: this.config.currentZoom
    });

    this.calculateGridDimensions(this.config.currentGap);

    const { scaledWidth, scaledHeight } = this.gridDimensions;
    const centerX = (window.innerWidth - scaledWidth) / 2;
    const centerY = (window.innerHeight - scaledHeight) / 2;

    gsap.set(this.canvasWrapper, { x: centerX, y: centerY });

    this.lastValidPosition.x = centerX;
    this.lastValidPosition.y = centerY;
    this.initDraggable();
  }

  init() {
    this.initSelection();

    this.config.currentGap = this.calculateGapForZoom(
      this.config.currentZoom
    );

    this.generateGridItems();

    gsap.set(this.canvasWrapper, {
      scale: this.config.currentZoom
    });

    this.calculateGridDimensions(this.config.currentGap);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const { scaledWidth, scaledHeight } = this.gridDimensions;
    const centerX = (viewportWidth - scaledWidth) / 2;
    const centerY = (viewportHeight - scaledHeight) / 2;

    gsap.set(this.canvasWrapper, { x: centerX, y: centerY });

    this.lastValidPosition.x = centerX;
    this.lastValidPosition.y = centerY;

    this.setupEventListeners();
    this.controlsContainer.classList.add("visible");
    this.initDraggable();
    this.setupViewportObserver();
  }

  // Layout compacto: celular em pé ou deitado.
  isCompactLayout() {
    return window.matchMedia(
      "(max-width: 900px) and (orientation: portrait), (orientation: landscape) and (max-height: 560px)"
    ).matches;
  }

  positionCloseButton() {
    gsap.set(this.closeButton, {
      y: this.isCompactLayout()
        ? 0
        : -this.closeButton.offsetHeight / 2
    });
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const deltaWidth = Math.abs(width - this.lastSize.w);
    const deltaHeight = Math.abs(height - this.lastSize.h);

    // Ignora mudanças pequenas de altura causadas pela barra do navegador.
    if (deltaWidth < 2 && deltaHeight < 150) return;

    this.lastSize = { w: width, h: height };

    if (this.zoomState.isActive) {
      if (this.zoomState.scalingOverlay) {
        Flip.fit(
          this.zoomState.scalingOverlay,
          document.getElementById("zoomTarget"),
          { duration: 0, absolute: true }
        );
      }

      this.positionCloseButton();
      return;
    }

    if (FashionGallery.pickItemSize() !== this.config.itemSize) {
      this.rebuildGrid();
      return;
    }

    this.resetPosition();
  }

  setupEventListeners() {
    this.lastSize = {
      w: window.innerWidth,
      h: window.innerHeight
    };

    let resizeTimer;

    const onResize = (delay) => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.handleResize(), delay);
    };

    window.addEventListener("resize", () => onResize(150));
    window.addEventListener("orientationchange", () => onResize(300));

    document.addEventListener("mouseleave", () => {
      this.handleMouseLeave();
    });

    this.viewport.addEventListener("mouseleave", () => {
      this.handleMouseLeave();
    });

    this.closeButton.addEventListener("click", () => {
      this.exitZoomMode();
    });

    const detailsButton =
      document.getElementById("detailsButton");

    if (detailsButton) {
      detailsButton.addEventListener("click", (event) => {
        event.stopPropagation();
        this.openDetails();
      });
    }

    const detailModal =
      document.getElementById("detailModal");

    if (detailModal) {
      detailModal.addEventListener("click", (event) => {
        if (
          event.target.closest(".detail-card") &&
          !event.target.closest(".detail-close")
        ) {
          return;
        }

        this.closeDetails();
      });
    }

    this.soundToggle.addEventListener("click", () => {
      this.soundSystem.toggle();
    });
  }
}

// Inicia a galeria direto, sem preloader.
let gallery;

document.addEventListener("DOMContentLoaded", () => {
  gallery = new FashionGallery();
  gallery.init();
});