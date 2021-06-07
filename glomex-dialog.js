const NON_VISIBLE_WIDTH = window.innerWidth < 720 ? 320 : 640;
const DEFAULT_DOCK_TARGET_INSET = '0px 10px auto auto';
const DEFAULT_TRANSITION_DURATION = 300;
const DOCK_Z_INDEX = 9999999;
const LIGHTBOX_Z_INDEX = 10000000;

const updateViewPortWidth = (element) => {
  let viewPortWidth = window.innerWidth * 0.3;
  if (viewPortWidth < 180) {
    viewPortWidth = 180;
  }
  element.shadowRoot.querySelector('.dock-target').style.width = `${viewPortWidth}px`;
};

const updatePlaceholderAspectRatio = (element, aspectRatio) => {
  element.shadowRoot.querySelector('.placeholder.aspect-ratio-box')
    .style.paddingTop = `${(1 / aspectRatio) * 100}%`;
};

const updateDockAspectRatio = (element, aspectRatio) => {
  element.shadowRoot.querySelector('.dock-target .aspect-ratio-box')
    .style.paddingTop = `${(1 / aspectRatio) * 100}%`;
};

const getAlternativeDockTarget = (element) => {
  const dockTarget = element.getAttribute('dock-target');
  let dockTargetElement;
  if (dockTarget) {
    dockTargetElement = document.querySelector(dockTarget);
    const intersection = getViewportIntersection(dockTargetElement);
    if (intersection && intersection.width > 0 && intersection.height > 0) {
      return dockTargetElement;
    }
  }
  return null;
};

const getDefaultDockTarget = (element) => element.shadowRoot.querySelector('.dock-target');

const updateDockTargetState = (element) => {
  const alternativeDockTarget = getAlternativeDockTarget(element);
  if (alternativeDockTarget && !element.getAttribute('alternative-dock-target')) {
    element.setAttribute('alternative-dock-target', '');
  } else {
    element.removeAttribute('alternative-dock-target');
  }
};

const getAspectRatioFromStrings = (aspectRatioStrings = []) => {
  aspectRatioStrings.push('16:9');
  return aspectRatioStrings.map((aspectRatio) => {
    if (!aspectRatio) return NaN;
    const ratioSplit = aspectRatio.split(':');
    return ratioSplit[0] / ratioSplit[1];
  }).filter((aspectRatio) => !!aspectRatio)[0];
};

const animateFromTo = (element, {
  from, to, animate = false, aspectRatio,
} = {}) => {
  window.requestAnimationFrame(() => {
    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();
    const visualViewport = getVisualViewport();

    const width = fromRect.width === 0 ? NON_VISIBLE_WIDTH : fromRect.width;
    const height = width / aspectRatio;

    element.style.position = 'fixed';
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.top = `${fromRect.top + visualViewport.offsetTop}px`;
    element.style.left = `${fromRect.left + visualViewport.offsetLeft}px`;

    const deltaX = toRect.left - fromRect.left;
    const deltaY = toRect.top - fromRect.top;
    const deltaScale = toRect.width / width;

    element.style.transform = `translate(${(deltaX / width) * 100}%, ${(deltaY / height) * 100}%) scale(${deltaScale})`;
    element.style.transitionProperty = 'transform';
    element.style.transformOrigin = 'top left';
    if (animate) {
      element.style.transitionDuration = `${DEFAULT_TRANSITION_DURATION}ms`;
      element.style.transitionTimingFunction = 'ease-out';
    } else {
      element.style.transitionDuration = null;
      element.style.transitionTimingFunction = null;
    }
    element.dispatchEvent(
      new CustomEvent('dockchange', {
        detail: {
          scale: deltaScale,
        },
        bubbles: true,
        composed: true,
      }),
    );
  });
};

const toPositions = (insetString) => {
  const insetParts = insetString.split(' ');
  if (!insetString) {
    return undefined;
  }
  if (insetParts.length === 1) {
    return {
      top: insetParts[0], right: 'auto', bottom: 'auto', left: 'auto',
    };
  }
  if (insetParts.length === 2) {
    return {
      top: insetParts[0], right: insetParts[1], bottom: insetParts[0], left: insetParts[1],
    };
  }
  if (insetParts.length === 3) {
    return {
      top: insetParts[0], right: insetParts[1], bottom: insetParts[1], left: insetParts[2],
    };
  }
  if (insetParts.length === 4) {
    return {
      top: insetParts[0], right: insetParts[1], bottom: insetParts[2], left: insetParts[3],
    };
  }
  return undefined;
};

function pointerCoords(e) {
  const coords = e.touches ? e.touches[0] : e;
  return {
    x: 'x' in coords ? coords.x : coords.clientX,
    y: 'y' in coords ? coords.y : coords.clientY,
  };
}

class GlomexDialogElement extends window.HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `<style>
    :host {
      display: block;
      position: relative;
    }

    .dock-target {
      position: fixed;
      pointer-events: none;
    }

    .aspect-ratio-box {
      height: 0;
      overflow: hidden;
    }

    .placeholder {
      display: none;
      background-color: rgba(200, 200, 200, 0.8);
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24px' width='24px' version='1.1' viewBox='0 0 24 24'%3E%3Cg fill='none' fill-rule='evenodd' stroke='none' stroke-width='1'%3E%3Cg transform='scale(1, 1)'%3E%3Cpath d='M19,19 L5,19 L5,5 L12,5 L13,3 L5,3 L3,3 3,3.9 3,5 L3,19 L3,20.1 3,21 5,21 L19,21 L21,21 21,20.1 21,19 L21,12 L19,12 L19,19 Z M14,3 L14,5 L17.59,5 L7.76,14.83 L9.17,16.24 L19,6.41 L19,10 L21,10 L21,3 L14,3 Z' fill='%23fff' fill-rule='nonzero'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      background-size: 10%;
    }

    .dialog-content {
      display: block;
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
    }

    .drag-handle {
      position: absolute;
      top: 0;
      left: 0;
      width: 2em;
      height: 2em;
      padding: 0.5em;
      fill-color: white;
      margin: .5em;
      border-radius: 2px;
      background-color: rgba(0, 0, 0, 0.7);
      transition: background 300ms ease-in-out, opacity 300ms ease-in-out;
      opacity: 0;
    }

    :host([alternative-dock-target]) .drag-handle {
      display: none;
    }

    .drag-handle:hover {
      background-color: rgba(0, 0, 0, 0.4);
    }

    .drag-handle:active .drag-handle-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.4);
    }

    .drag-handle svg {
      fill: white;
      width: 100%;
      height: 100%;
    }

    :host([mode=dock]) .dialog-content:hover .drag-handle {
      opacity: 1;
      cursor: move;
    }

    .dialog-content ::slotted([slot=dock-overlay]){
      display: none;
    }

    :host([mode=dock]) .dialog-content ::slotted([slot=dock-overlay]){
      display: block;
    }

    :host([mode=dock]) .dialog-content {
      z-index: ${DOCK_Z_INDEX};
    }

    :host([mode=lightbox]) .dialog-content {
      animation-name: fade-in;
      animation-duration: 200ms;
      animation-timing-function: ease-in;
      position: fixed;
      margin: 1vh auto;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: ${LIGHTBOX_Z_INDEX};
      max-height: 40vh;
      max-width: 95vw;
      width: 850px;
    }

    :host([mode=lightbox]):before {
      content: " ";
      background: rgba(0, 0, 0, 0.3);
      display: block;
      position: fixed;
      top: 0;
      right: 0;
      left: 0;
      bottom: 0;
      z-index: 1;
    }

    @keyframes fade-in {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
    </style>
    <div class="placeholder aspect-ratio-box"></div>
    <div class="dock-target">
      <div class="aspect-ratio-box"></div>
    </div>
    <div class="dialog-content">
      <slot name="dialog-element"></slot>
      <slot name="dock-overlay">
        <div class="drag-handle">
          <div class="drag-handle-overlay"></div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrows-move" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708l2-2zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10zM.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708l-2-2zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8z"/></svg>
        </div>
      </slot>
    </div>`;
    const dockTarget = this.shadowRoot.querySelector('.dock-target');
    Object.assign(dockTarget.style, toPositions(DEFAULT_DOCK_TARGET_INSET));

    this._wasInInlineMode = false;

    this.addEventListener('click', ({ target }) => {
      if (this.isDragging) return;
      if (!(target instanceof GlomexDialogElement)) return;
      if (this._wasInInlineMode) {
        this.setAttribute('mode', 'inline');
      } else {
        this.removeAttribute('mode');
      }
    });
  }

  connectedCallback() {
    updateViewPortWidth(this);
    updatePlaceholderAspectRatio(this, getAspectRatioFromStrings([
      this.getAttribute('aspect-ratio'),
    ]));
    updateDockAspectRatio(this, getAspectRatioFromStrings([
      this.getAttribute('dock-aspect-ratio'),
      this.getAttribute('aspect-ratio'),
    ]));

    if (!this.hasAttribute('mode')) {
      this.shadowRoot.querySelector('.dialog-content').style.display = 'none';
    }

    if (this._disconnectDragAndDrop) this._disconnectDragAndDrop();
    this._disconnectDragAndDrop = connectDragAndDrop(this);

    const onResize = () => {
      updateViewPortWidth(this);
      this.refreshDockDialog();
    };
    window.addEventListener('resize', onResize);

    this._disconnectResize = () => {
      window.removeEventListener('resize', onResize);
    };
  }

  disconnectedCallback() {
    if (this._disconnectDragAndDrop) this._disconnectDragAndDrop();
    this._disconnectResize();
  }

  static get observedAttributes() {
    return ['mode', 'aspect-ratio', 'dock-target', 'dock-target-inset', 'dock-aspect-ratio'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const dialogContent = this.shadowRoot.querySelector('.dialog-content');
    const placeholder = this.shadowRoot.querySelector('.placeholder');
    if (name === 'mode') {
      if (newValue === 'dock') {
        this.parentElement.removeAttribute('modal');
        dialogContent.style.zIndex = DOCK_Z_INDEX;
        dialogContent.style.display = 'block';
        updateDockTargetState(this);
        animateFromTo(dialogContent, {
          from: placeholder,
          to: getAlternativeDockTarget(this) || getDefaultDockTarget(this),
          animate: this._wasInInlineMode,
          aspectRatio: getAspectRatioFromStrings([
            this.getAttribute('dock-aspect-ratio'),
            this.getAttribute('aspect-ratio'),
          ]),
        });
      } else if (newValue === 'inline') {
        this._wasInInlineMode = true;
        placeholder.style.display = 'block';
        dialogContent.style.position = 'absolute';
        dialogContent.style.transform = null;
        dialogContent.style.top = null;
        dialogContent.style.left = null;
        dialogContent.style.display = 'block';
        if (this._wasInInlineMode && oldValue === 'dock') {
          dialogContent.style.transitionDuration = `${DEFAULT_TRANSITION_DURATION}ms`;
          dialogContent.style.transitionTimingFunction = 'ease-out';
        }
        setTimeout(() => {
          if (this.getAttribute('mode') === 'inline') {
            dialogContent.setAttribute('style', '');
          }
        }, DEFAULT_TRANSITION_DURATION);
      } else if (newValue === 'lightbox') {
        // prevent scrolling
        window.document.body.style.height = '100%';
        window.document.body.style.overflow = 'hidden';
        dialogContent.setAttribute('style', '');
        dialogContent.style.display = 'block';
        // TODO: rethink focus-handling?
        dialogContent.setAttribute('tabindex', '-1');
        dialogContent.focus();
      } else {
        this._wasInInlineMode = false;
        placeholder.style.display = 'none';
        dialogContent.setAttribute('style', '');
        dialogContent.style.display = 'none';
      }

      if (newValue !== 'lightbox') {
        // reset prevent scrolling
        window.document.body.style.height = null;
        window.document.body.style.overflow = null;
      }

      this.dispatchEvent(
        new CustomEvent('toggledialog', {
          detail: {
            mode: newValue,
          },
          bubbles: true,
          composed: true,
        }),
      );
    }

    if (name === 'dock-target') {
      if (this._disconnectDragAndDrop) this._disconnectDragAndDrop();
      this._disconnectDragAndDrop = connectDragAndDrop(this);
      this.refreshDockDialog();
    }

    if (name === 'dock-target-inset') {
      Object.assign(
        this.shadowRoot.querySelector('.dock-target').style,
        toPositions(newValue) || toPositions(DEFAULT_DOCK_TARGET_INSET),
      );
      this.refreshDockDialog();
    }

    if (name === 'aspect-ratio') {
      updatePlaceholderAspectRatio(this, getAspectRatioFromStrings([
        this.getAttribute('aspect-ratio'),
      ]));
    }

    if (name === 'dock-aspect-ratio') {
      updateDockAspectRatio(this, getAspectRatioFromStrings([
        this.getAttribute('dock-aspect-ratio'),
        this.getAttribute('aspect-ratio'),
      ]));
    }
  }

  refreshDockDialog() {
    const dialogContent = this.shadowRoot.querySelector('.dialog-content');
    if (this.getAttribute('mode') === 'dock') {
      updateDockTargetState(this);
      animateFromTo(dialogContent, {
        from: this.shadowRoot.querySelector('.placeholder'),
        to: getAlternativeDockTarget(this) || getDefaultDockTarget(this),
        animate: false,
        aspectRatio: getAspectRatioFromStrings([
          this.getAttribute('dock-aspect-ratio'),
          this.getAttribute('aspect-ratio'),
        ]),
      });
    }
  }
}

/*
 * Viewport intersection logic partially copied from
 * https://github.com/ampproject/amphtml/blob/bf50181843d8520cd017f6fab94740c6727416a5/extensions/amp-video-docking/0.1/amp-video-docking.js
 */
function layoutRectLtwh(left, top, width, height) {
  return {
    left,
    top,
    width,
    height,
    bottom: top + height,
    right: left + width,
    x: left,
    y: top,
  };
}

/* eslint-disable */
function rectIntersection() {
  let x0 = -Infinity;
  let x1 = Infinity;
  let y0 = -Infinity;
  let y1 = Infinity;
  for (let i = 0; i < arguments.length; i++) {
    const current = arguments[i];
    if (!current) {
      continue;
    }
    x0 = Math.max(x0, current.left);
    x1 = Math.min(x1, current.left + current.width);
    y0 = Math.max(y0, current.top);
    y1 = Math.min(y1, current.top + current.height);
    if (x1 < x0 || y1 < y0) {
      return null;
    }
  }
  if (x1 == Infinity) {
    return null;
  }
  return layoutRectLtwh(x0, y0, x1 - x0, y1 - y0);
}
/* eslint-enable */

function getViewportRect() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    left: 0,
    top: 0,
  };
}

function getVisualViewport() {
  return window.visualViewport || {
    offsetLeft: 0,
    offsetTop: 0,
    scale: 1,
  };
}

function getViewportIntersection(elem) {
  const rect = elem.getBoundingClientRect();
  return rectIntersection(getViewportRect(), rect);
}

function connectDragAndDrop(element) {
  let initialX;
  let initialY;
  let dockTargetRect;
  const dragHandle = element.shadowRoot.querySelector('slot[name=dock-overlay]');
  const dockTarget = element.shadowRoot.querySelector('.dock-target');

  const onMove = (event) => {
    const moveCoords = pointerCoords(event);
    const viewportRect = getViewportRect();
    const newTopValue = dockTargetRect.top + moveCoords.y - initialY;
    const newLeftValue = dockTargetRect.left + moveCoords.x - initialX;
    const visualVp = getVisualViewport();
    // Do not allow to drag dock-target out of viewport
    const clampLeft = Math.min(
      Math.max(newLeftValue, 0),
      (viewportRect.width - dockTargetRect.width + visualVp.offsetLeft) * visualVp.scale,
    );
    const clampTop = Math.min(
      Math.max(newTopValue, 0),
      (viewportRect.height - dockTargetRect.height + visualVp.offsetTop) * visualVp.scale,
    );

    window.requestAnimationFrame(() => {
      dockTarget.style.left = `${clampLeft}px`;
      dockTarget.style.top = `${clampTop}px`;
      dockTarget.style.bottom = 'auto';
      dockTarget.style.right = 'auto';
      element.refreshDockDialog();
    });
  };

  const onNonPassiveTouchMove = (event) => {
    event.preventDefault();
  };

  const mouseUp = () => {
    disconnectListeners();
    // reset scrolling
    window.document.body.style.height = null;
    window.document.body.style.overflow = null;
    setTimeout(() => {
      element.isDragging = false;
    }, 1);
  };

  const mouseDown = (event) => {
    disconnectListeners();
    if (element.getAttribute('mode') !== 'dock') return;
    element.isDragging = true;
    // prevent scrolling
    window.document.body.style.height = '100%';
    window.document.body.style.overflow = 'hidden';
    // just because touchdown would complain
    if (event.cancelable && event.type === 'mousedown') {
      event.preventDefault();
    }
    const coords = pointerCoords(event);
    const visualViewport = getVisualViewport();
    initialX = coords.x - visualViewport.offsetLeft;
    initialY = coords.y - visualViewport.offsetTop;
    dockTargetRect = dockTarget.getBoundingClientRect();

    // prevent document scrolling on iOS
    window.addEventListener('touchmove', onNonPassiveTouchMove, { passive: false, once: true });
    document.addEventListener('mousemove', onMove, false);
    document.addEventListener('touchmove', onMove, false);
    document.addEventListener('mouseup', mouseUp, false);
    document.addEventListener('touchend', mouseUp, false);
    document.addEventListener('touchcancel', mouseUp, false);
  };

  function disconnectListeners() {
    window.removeEventListener('touchmove', onNonPassiveTouchMove, { passive: false, once: true });
    document.removeEventListener('mousemove', onMove, false);
    document.removeEventListener('touchmove', onMove, false);
    document.removeEventListener('mouseup', mouseUp, false);
    document.removeEventListener('touchend', mouseUp, false);
    document.removeEventListener('touchcancel', mouseUp, false);
  }

  function fixIosHover() {}

  function onClick(e) {
    e.preventDefault();
  }

  // get hover working on iOS
  document.documentElement.addEventListener('touchstart', fixIosHover, false);
  dragHandle.addEventListener('mousedown', mouseDown, false);
  dragHandle.addEventListener('touchstart', mouseDown, false);
  dragHandle.addEventListener('click', onClick, false);

  return () => {
    mouseUp();
    document.documentElement.removeEventListener('touchstart', fixIosHover, false);
    dragHandle.removeEventListener('mousedown', mouseDown, false);
    dragHandle.removeEventListener('touchstart', mouseDown, false);
    dragHandle.removeEventListener('click', onClick, false);
  };
}

if ('attachShadow' in window.document.createElement('div')
  && window.customElements
  && !window.customElements.get('glomex-dialog')
) {
  window.customElements.define('glomex-dialog', GlomexDialogElement);
}
