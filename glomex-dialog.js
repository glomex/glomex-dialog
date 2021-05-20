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

const updateAspectRatio = (element) => {
  const paddingTop = `${(1 / (element.aspectRatio)) * 100}%`;
  Array.prototype.slice.call(
    element.shadowRoot.querySelectorAll('.aspect-ratio-box'),
  ).forEach((box) => {
    box.style.paddingTop = paddingTop;
  });
};

const animateFromTo = (element, {
  from, to, animate = false, aspectRatio,
} = {}) => {
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();

  const width = fromRect.width === 0 ? NON_VISIBLE_WIDTH : fromRect.width;
  const height = width / aspectRatio;

  element.style.position = 'fixed';
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.top = `${fromRect.top}px`;
  element.style.left = `${fromRect.left}px`;

  const deltaX = toRect.left - fromRect.left;
  const deltaY = toRect.top - fromRect.top;
  const deltaScale = toRect.width / width;

  element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaScale})`;
  element.style.transitionProperty = 'transform';
  element.style.transformOrigin = 'top left';
  if (animate) {
    element.style.transitionDuration = `${DEFAULT_TRANSITION_DURATION}ms`;
    element.style.transitionTimingFunction = 'ease-out';
  } else {
    element.style.transitionDuration = null;
    element.style.transitionTimingFunction = null;
  }
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

export class GlomexDialogElement extends window.HTMLElement {
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

    /* add :hover */
    :host([mode=dock]) .dialog-content ::slotted([slot=dialog-overlay]){
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      cursor: move;
    }

    :host([mode=dock]) .dialog-content ::slotted([slot=dialog-overlay]:hover){
      background-color: rgba(200, 200, 200, 0.7);
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
      <slot name="dialog-overlay"></slot>
    </div>`;
    this._moving = false;
    this._wasInInlineMode = false;
    const dockTarget = this.shadowRoot.querySelector('.dock-target');
    Object.assign(dockTarget.style, toPositions(DEFAULT_DOCK_TARGET_INSET));

    this.addEventListener('click', ({ target }) => {
      if (this._moving) return;
      if (!(target instanceof GlomexDialogElement)) return;
      if (this._wasInInlineMode) {
        this.setAttribute('mode', 'inline');
      } else {
        this.removeAttribute('mode');
      }
    });

    const dialogOverlay = this.shadowRoot.querySelector('slot[name=dialog-overlay]');
    let initialX;
    let initialY;
    let dockTargetRect;

    const onMove = (event) => {
      const moveCoords = pointerCoords(event);
      this.dockTarget.style.top = `${dockTargetRect.top + moveCoords.y - initialY}px`;
      this.dockTarget.style.left = `${dockTargetRect.left + moveCoords.x - initialX}px`;
      this.dockTarget.style.bottom = 'auto';
      this.dockTarget.style.bottom = 'right';
      this.refreshDockTarget();
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
        this._moving = false;
      }, 1);
    };

    const mouseDown = (event) => {
      if (this.getAttribute('mode') !== 'dock') return;
      this._moving = true;
      // prevent scrolling
      window.document.body.style.height = '100%';
      window.document.body.style.overflow = 'hidden';
      const coords = pointerCoords(event);
      initialX = coords.x;
      initialY = coords.y;
      dockTargetRect = this.dockTarget.getBoundingClientRect();

      disconnectListeners();

      // prevent document scrolling on iOS
      window.addEventListener('touchmove', onNonPassiveTouchMove, { passive: false, once: true });
      document.body.addEventListener('mousemove', onMove);
      document.body.addEventListener('touchmove', onMove);
      document.body.addEventListener('mouseup', mouseUp);
      document.body.addEventListener('touchend', mouseUp);
    };

    function disconnectListeners() {
      document.body.removeEventListener('mousemove', onMove);
      document.body.removeEventListener('touchmove', onMove);
      document.body.removeEventListener('mouseup', mouseUp);
      document.body.removeEventListener('touchend', mouseUp);
      window.removeEventListener('touchmove', onNonPassiveTouchMove, { passive: false, once: true });
    }

    if (this.dockTarget === dockTarget) {
      // get hover working on iOS
      document.documentElement.addEventListener('touchstart', () => {});
      dialogOverlay.addEventListener('mousedown', mouseDown);
      dialogOverlay.addEventListener('touchstart', mouseDown);
    }
  }

  connectedCallback() {
    updateViewPortWidth(this);
    updateAspectRatio(this);

    if (!this.hasAttribute('mode')) {
      this.shadowRoot.querySelector('.dialog-content').style.display = 'none';
    }

    window.addEventListener('resize', () => {
      updateViewPortWidth(this);
      this.refreshDockTarget();
    });
  }

  static get observedAttributes() {
    return ['mode', 'aspect-ratio', 'dock-target', 'dock-target-inset'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const dialogContent = this.shadowRoot.querySelector('.dialog-content');
    if (name === 'mode') {
      if (newValue === 'dock') {
        this.parentElement.removeAttribute('modal');
        dialogContent.style.zIndex = DOCK_Z_INDEX;
        animateFromTo(dialogContent, {
          from: this.placeholder,
          to: this.dockTarget,
          animate: this._wasInInlineMode,
          aspectRatio: this.aspectRatio,
        });
      } else if (newValue === 'inline') {
        this._wasInInlineMode = true;
        this.placeholder.style.display = 'block';

        dialogContent.style.position = 'absolute';
        dialogContent.style.transform = null;
        dialogContent.style.top = null;
        dialogContent.style.left = null;
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
        // TODO: rethink focus-handling?
        dialogContent.setAttribute('tabindex', '-1');
        dialogContent.focus();
      } else if (!newValue) {
        this._wasInInlineMode = false;
        this.placeholder.style.display = 'none';

        dialogContent.setAttribute('style', '');
      }

      if (newValue !== 'lightbox') {
        // reset prevent scrolling
        window.document.body.style.height = null;
        window.document.body.style.overflow = null;
      }

      if (!newValue) {
        dialogContent.style.display = 'none';
      } else {
        dialogContent.style.display = 'block';
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
      this.refreshDockTarget();
    }

    if (name === 'dock-target-inset') {
      Object.assign(
        this.shadowRoot.querySelector('.dock-target').style,
        toPositions(newValue) || toPositions(DEFAULT_DOCK_TARGET_INSET),
      );
      this.refreshDockTarget();
    }

    if (name === 'aspectRatio') {
      updateAspectRatio(this);
    }
  }

  refreshDockTarget() {
    const dialogContent = this.shadowRoot.querySelector('.dialog-content');
    if (this.getAttribute('mode') === 'dock') {
      animateFromTo(dialogContent, {
        from: this.placeholder,
        to: this.dockTarget,
        animate: false,
        aspectRatio: this.aspectRatio,
      });
    }
  }

  get aspectRatio() {
    const aspectRatioString = this.getAttribute('aspect-ratio');
    if (!aspectRatioString) return 16 / 9;
    const ratioSplit = aspectRatioString.split(':');
    return ratioSplit[0] / ratioSplit[1];
  }

  get placeholder() {
    return this.shadowRoot.querySelector('.placeholder');
  }

  get dockTarget() {
    const dockTarget = this.getAttribute('dock-target');
    let dockTargetElement;
    if (dockTarget) {
      dockTargetElement = document.querySelector(dockTarget);
      const intersection = getViewportIntersection(dockTargetElement);
      if (intersection && intersection.width > 0 && intersection.height > 0) {
        return dockTargetElement;
      }
    }
    return this.shadowRoot.querySelector('.dock-target');
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

function getViewportIntersection(elem) {
  const viewportRect = {
    width: window.innerWidth,
    height: window.innerHeight,
    left: 0,
    top: 0,
  };
  const rect = elem.getBoundingClientRect();
  return rectIntersection(viewportRect, rect);
}

if ('attachShadow' in window.document.createElement('div')
  && window.customElements
  && !window.customElements.get('glomex-dialog')
) {
  window.customElements.define('glomex-dialog', GlomexDialogElement);
}
