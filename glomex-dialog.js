import { RotataToFullscreen } from './rotate-to-fullscreen.js';

const NON_VISIBLE_WIDTH = window.innerWidth < 720 ? 320 : 640;
const DEFAULT_DOCK_TARGET_INSET = '0px 10px auto auto';
const DEFAULT_TRANSITION_DURATION = 300;
const LIGHTBOX_Z_INDEX = 2147483647;
const DOCK_Z_INDEX = 2147483646;
const MIN_DOCK_WIDTH = 192;
const MAX_DOCK_WIDTH = 400;
const PHONE_MAX_WIDTH = 480;
const STICKY_TOP_SELECTOR_THRESHOLD = 200;

let allowRotateToFullscreen = false;
if (window.matchMedia(
  `(max-device-width: ${PHONE_MAX_WIDTH}px) and (pointer: coarse)`,
).matches) {
  allowRotateToFullscreen = true;
}

const updateViewPortWidth = (element) => {
  let viewPortWidth = window.innerWidth * 0.3;
  if (viewPortWidth < MIN_DOCK_WIDTH) {
    viewPortWidth = MIN_DOCK_WIDTH;
  } else if (viewPortWidth > MAX_DOCK_WIDTH) {
    viewPortWidth = MAX_DOCK_WIDTH;
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

const updateDockStickyAspectRatio = (element, aspectRatio) => {
  element.shadowRoot.querySelector('.dock-sticky-target .aspect-ratio-box')
    .style.paddingTop = `${(1 / aspectRatio) * 100}%`;
};

const getAlternativeDockTarget = (element) => {
  const dockTarget = element.getAttribute('dock-target');
  let dockTargetElements;
  if (dockTarget) {
    try {
      dockTargetElements = document.querySelectorAll(dockTarget);
    } catch (e) {
      // invalid selector strings should allow falling back to the default handling
      return null;
    }
    if (dockTargetElements.length === 0) return null;
    // pick the innermost node (querySelectorAll sorts by order in DOM)
    const dockTargetElement = dockTargetElements[dockTargetElements.length - 1];
    const intersection = getViewportIntersection(dockTargetElement);
    if (intersection && intersection.width > 0 && intersection.height > 0) {
      return dockTargetElement;
    }
  }
  return null;
};

const getDefaultDockTarget = (element) => element.shadowRoot.querySelector('.dock-target');
const getDockStickyTarget = (element) => element.shadowRoot.querySelector('.dock-sticky-target');

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
    if (ratioSplit.length === 1) return Number(aspectRatio);
    return ratioSplit[0] / ratioSplit[1];
  }).filter((aspectRatio) => !!aspectRatio)[0];
};

const moveFromTo = (element, {
  from, to, animate = false, aspectRatio,
  initialAspectRatio, downscale = false,
  transitionDuration,
} = {}) => new Promise((resolve) => {
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();
  const visualViewport = getVisualViewport();

  const width = fromRect.width === 0 ? NON_VISIBLE_WIDTH : fromRect.width;
  const height = fromRect.height === 0
    ? (NON_VISIBLE_WIDTH / initialAspectRatio)
    : fromRect.height;
  const toHeight = width / aspectRatio;
  const elementInnerContainer = element.firstElementChild;

  element.style.position = 'fixed';
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.transform = 'scale(1)';
  element.style.top = `${fromRect.top + visualViewport.offsetTop}px`;
  element.style.left = `${fromRect.left + visualViewport.offsetLeft}px`;
  // avoid CLS further
  element.style.display = 'grid';

  const deltaX = toRect.left - fromRect.left;
  const deltaY = toRect.top - fromRect.top;
  const deltaScale = toRect.width / width;

  const moveDialog = () => {
    // avoid CLS (see setting to "display: grid" before requestAnimationFrame)
    element.style.display = null;
    element.style.height = `${toHeight}px`;
    element.style.transform = `translate(${(deltaX / width) * 100}%, ${(deltaY / toHeight) * 100}%) scale(${deltaScale})`;
    element.style.transitionProperty = 'transform';
    element.style.transformOrigin = 'top left';
    element.style.transitionTimingFunction = 'ease-out';
    if (animate) {
      element.style.transitionDuration = `${transitionDuration}ms`;
    } else {
      element.style.transitionDuration = null;
    }

    if (!downscale) {
      // avoid as best as possible that the contained element is shortly scaled too large
      // somehow width+scale is not applied at the same time when the motion is too fast
      elementInnerContainer.style.transitionDuration = '0s';
      elementInnerContainer.style.transitionProperty = 'transform';
      elementInnerContainer.style.width = `${toRect.width}px`;
      elementInnerContainer.style.height = `${toRect.height}px`;
      elementInnerContainer.style.transform = `scale(${1 / deltaScale})`;
      elementInnerContainer.style.transformOrigin = 'top left';
    }
  };

  if (!animate) {
    moveDialog();
    resolve({
      scale: downscale ? deltaScale : 1,
    });
    return;
  }

  window.requestAnimationFrame(() => {
    moveDialog();
    resolve({
      scale: downscale ? deltaScale : 1,
    });
  });
});

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

function getActiveElement(root) {
  const activeEl = root.activeElement;

  if (!activeEl) {
    return null;
  }

  if (activeEl.shadowRoot) {
    return getActiveElement(activeEl.shadowRoot);
  }
  return activeEl;
}

function isInDocument(element, document) {
  let currentElement = element;
  while (currentElement && currentElement.parentNode) {
    if (currentElement.parentNode === document) {
      return true;
    } if (currentElement.parentNode instanceof window.DocumentFragment) {
      currentElement = currentElement.parentNode.host;
    } else {
      currentElement = currentElement.parentNode;
    }
  }
  return false;
}

/**
 * A dialog web component that allows docking a video player or
 * putting it in a lightbox. It allows implementing a similar
 * feature as amp-video-docking but without using AMP.
 *
 * @attr {string} mode - Can take the values "hidden", "inline", "dock" or "lightbox".
 * @attr {string} aspect-ratio - The aspect-ratio for the inline element. Default is 16:9
 * @attr {string} dock-target - A dom-element with position:fixed where mode=dock should animate to
 * @attr {string} dock-target-inset - Defines the position of the dock using inset
 * @attr {string} dock-aspect-ratio - The aspect-ratio when the element is mode=dock
 * @attr {string} dock-mode - When set to "sticky" it behaves similar to "position: sticky" in CSS
 *   (with a max width of 400px). If undefined docks the content to a corner.
 * @attr {string} dock-sticky-target-top - The top distance for dock-mode=sticky in pixels
 *   (defaults to 0)
 * @attr {string} dock-sticky-aspect-ratio - The aspect-ratio when the element is docked
 *   for dock-mode=sticky
 * @attr {string} dock-downscale - Do you want to scale the element when mode=dock
 */
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
      visibility: hidden;
    }

    .dock-sticky-target {
      position: fixed;
      pointer-events: none;
      visibility: hidden;
    }

    .aspect-ratio-box {
      height: 0;
    }

    .placeholder {
      display: block;
      cursor: pointer;
    }

    .placeholder-inner {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      display: block;
    }

    .placeholder-default {
      background-color: var(--placeholder-background-color, rgba(200, 200, 200, 0.8));
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24px' width='24px' version='1.1' viewBox='0 0 24 24'%3E%3Cg fill='none' fill-rule='evenodd' stroke='none' stroke-width='1'%3E%3Cg transform='scale(1, 1)'%3E%3Cpath d='M19,19 L5,19 L5,5 L12,5 L13,3 L5,3 L3,3 3,3.9 3,5 L3,19 L3,20.1 3,21 5,21 L19,21 L21,21 21,20.1 21,19 L21,12 L19,12 L19,19 Z M14,3 L14,5 L17.59,5 L7.76,14.83 L9.17,16.24 L19,6.41 L19,10 L21,10 L21,3 L14,3 Z' fill='%23fff' fill-rule='nonzero'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      background-size: 10%;
      width: 100%;
      height: 100%;
    }

    :host([mode=hidden]) .dialog-content,
    :host([mode=hidden]) .placeholder {
      display: none;
    }

    .popover {
      border: 0;
      margin: 0;
      padding: 0;
      background: transparent;
      display: block;
    }

    :host([mode=inline]) .popover {
      display: block;
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      overflow: visible;
    }

    .dialog-content {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      padding: 0;
      margin: 0;
      background: transparent;
      will-change: transform, transition, width, height, top, left, opacity;
    }

    .dialog-inner-wrapper {
      width: 100%;
      height: 100%;
      position: absolute;
      top 0;
      left: 0;
      max-width: 100%;
      will-change: transition, transform, width, height;
    }

    /*
       fixes an issue with fullscreen in safari,
       "will-change: transform" lets external elements shine through
    */
    .dialog-content:-webkit-full-screen-ancestor:not(iframe),
    .dialog-inner-wrapper:-webkit-full-screen-ancestor:not(iframe) {
      will-change: auto;
    }

    .drag-handle {
      position: absolute;
      top: 0;
      left: 0;
      width: 1em;
      height: 1em;
      padding: 0.25em;
      fill-color: white;
      border-radius: 2px;
      background-color: rgba(0, 0, 0, 0.7);
      transition: background 300ms ease-in-out, opacity 300ms ease-in-out;
      opacity: 0;
      z-index: 1;
    }

    :host([mode=dock]) .dialog-content {
      position: absolute;
    }

    :host([alternative-dock-target]) .drag-handle,
    :host([dock-mode=sticky]) .drag-handle {
      display: none;
    }

    .drag-handle:hover, .drag-handle:active {
      background-color: rgba(0, 0, 0, 0.4);
    }

    .drag-handle:active {
      opacity: 1;
      cursor: move;
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

    .dialog-content ::slotted([slot=dock-background]) {
      visibility: hidden;
    }

    .dialog-content slot[name="dock-background"] {
      touch-action: none;
      cursor: move;
      position: absolute;
      display: block;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }

    :host([dock-mode=sticky]) slot[name="dock-background"] {
      cursor: unset;
    }

    :host([mode=dock]) .dialog-content ::slotted([slot=dock-background]) {
      visibility: visible;
    }

    :host([mode=dock]) .dialog-content {
      z-index: ${DOCK_Z_INDEX};
    }

    :host([mode=lightbox]) .dialog-content {
      display: flex;
      max-height: 100dvh;
      max-width: 100dvw;
      align-items: center;
      justify-content: center;
      animation-name: fade-in;
      animation-duration: 200ms;
      animation-timing-function: ease-in;
      position: fixed;
      top: 0;
      left: 0;
      z-index: ${LIGHTBOX_Z_INDEX};
      overflow: hidden;
    }

    :host([mode=lightbox]) .dialog-content::backdrop {
      width: 100%;
      height: 100%;
      background: var(--lightbox-background, rgba(0, 0, 0, 0.5));
      backdrop-filter: blur(4px) saturate(50%);
    }

    :host([mode=lightbox]) .dialog-content slot[name="dock-background"] {
      display: none;
    }

    :host([mode=lightbox]) .dialog-inner-wrapper {
      max-width: 80%;
      position: unset;
      height: unset;
    }

    @media (max-width: 1024px) {
      :host([mode=lightbox]) .dialog-inner-wrapper {
        max-width: 95%;
      }
    }

    :host([mode=lightbox]) slot[name="dialog-element"] {
      display: flex;
      aspect-ratio: 16 / 9;
      margin: 0 auto;
      max-height: 100dvh;
    }

    @media (orientation: portrait) {
      :host([mode=lightbox]) slot[name="dialog-element"] {
        aspect-ratio: 9 / 16;
      }
      :host([mode=lightbox]) .dialog-inner-wrapper {
        max-width: unset;
      }
    }

    @media (max-device-width: ${PHONE_MAX_WIDTH}px) and (pointer: coarse) and (orientation: landscape) {
      :host([mode=lightbox]) .dialog-content {
        animation-name: none;
        height: 100%;
        width: 100%;
      }

      :host([mode=lightbox]) .dialog-inner-wrapper {
        height: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        min-height: -webkit-fill-available !important;
      }

      :host([mode=lightbox]):before {
        background: #000;
      }
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
    <div class="placeholder aspect-ratio-box">
      <slot name="placeholder" class="placeholder-inner">
        <div class="placeholder-default"></div>
      </slot>
    </div>
    <div class="popover" popover="manual">
      <div class="dock-target">
        <div class="aspect-ratio-box"></div>
      </div>
      <div class="dock-sticky-target">
        <div class="aspect-ratio-box"></div>
      </div>
      <dialog class="dialog-content" part="dialog-content">
        <div class="dialog-inner-wrapper">
          <slot name="dock-background">
            <div class="drag-handle">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrows-move" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708l2-2zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10zM.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708l-2-2zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8z"/></svg>
            </div>
          </slot>
          <slot name="dialog-element"></slot>
        </div>
      </dialog>
    </div>`;
    const dockTarget = this.shadowRoot.querySelector('.dock-target');
    const positions = toPositions(DEFAULT_DOCK_TARGET_INSET);
    const dockStickyTarget = this.shadowRoot.querySelector('.dock-sticky-target');
    const placeholderSlot = this.shadowRoot.querySelector('.placeholder-inner');
    dockStickyTarget.style.top = positions.top;
    Object.assign(dockTarget.style, positions);

    this._wasInHiddenMode = false;
    this._internalModeChange = false;
    this._dockTargetResizeObserver = undefined;
    this._bodyStyleAdjusted = false;

    this.addEventListener('click', ({ target }) => {
      if (this.classList.contains('dragging')) return;
      // allows clicks within GlomexDialog and on a slotted placeholder
      if (!(target instanceof GlomexDialogElement)
        && target.assignedSlot !== placeholderSlot
      ) return;
      this._internalModeChange = true;
      if (this._wasInHiddenMode) {
        this.setAttribute('mode', 'hidden');
      } else {
        this.setAttribute('mode', 'inline');
      }
    });
  }

  connectedCallback() {
    if (this._bodyStyleAdjusted) {
      window.document.body.style.height = null;
      window.document.body.style.overflow = null;
    }
    this._bodyStyleAdjusted = false;
    updateViewPortWidth(this);
    updatePlaceholderAspectRatio(this, getAspectRatioFromStrings([
      this.getAttribute('aspect-ratio'),
    ]));
    updateDockAspectRatio(this, getAspectRatioFromStrings([
      this.getAttribute('dock-aspect-ratio'),
      this.getAttribute('aspect-ratio'),
    ]));
    updateDockStickyAspectRatio(this, getAspectRatioFromStrings([
      this.getAttribute('dock-sticky-aspect-ratio'),
      this.getAttribute('aspect-ratio'),
    ]));

    if (!this.hasAttribute('mode')) {
      // default-mode is "inline"
      this.setAttribute('mode', 'inline');
    }

    if (this._disconnectDragAndDrop) this._disconnectDragAndDrop();
    this._disconnectDragAndDrop = connectDragAndDrop(this);

    const onResize = () => {
      this._adjustLightboxModeForLandscapeOnMobile();
      updateViewPortWidth(this);
      this.refreshDockDialog();
    };
    onResize();
    window.addEventListener('resize', onResize);
    this._disconnectResize = () => {
      window.removeEventListener('resize', onResize);
    };

    const onKeyup = (event) => {
      const currentMode = this.getAttribute('mode');
      if (currentMode !== 'lightbox') return;
      if (event.key === 'Escape' || event.key === 'Esc') {
        this._internalModeChange = true;
        if (this._wasInHiddenMode) {
          this.setAttribute('mode', 'hidden');
        } else {
          this.setAttribute('mode', 'inline');
        }
      }
      // restrict tab behavior in lightbox mode
      if (event.key === 'Tab') {
        const activeElement = getActiveElement(window.document);
        if (activeElement !== this && !isInDocument(activeElement, this)) {
          const dialogInnerWrapper = this.shadowRoot.querySelector('.dialog-inner-wrapper');
          dialogInnerWrapper.focus();
        }
      }
    };
    window.document.addEventListener('keyup', onKeyup);
    this._disconnectKeyup = () => {
      window.document.removeEventListener('keyup', onKeyup);
    };
  }

  disconnectedCallback() {
    if (this._disconnectDragAndDrop) this._disconnectDragAndDrop();
    this._disconnectResize();
    this._disconnectKeyup();
    if (this._rotateToFullscreen) {
      this._rotateToFullscreen.disable();
      this._rotateToFullscreen.removeEventListener('exit', this._onRotateToFullscreenExit);
      this._rotateToFullscreen.removeEventListener('enter', this._onRotateToFullscreenEnter);
      this._rotateToFullscreen = undefined;
    }
    if (this._dockTargetResizeObserver) {
      this._dockTargetResizeObserver.disconnect();
      this._dockTargetResizeObserver = undefined;
    }
    if (this._bodyStyleAdjusted) {
      window.document.body.style.height = null;
      window.document.body.style.overflow = null;
    }
    this._bodyStyleAdjusted = false;
  }

  static get observedAttributes() {
    return [
      'mode',
      'aspect-ratio',
      'dock-target',
      'dock-target-inset',
      'dock-aspect-ratio',
      'dock-mode',
      'dock-sticky-target-top',
      'dock-sticky-aspect-ratio',
      'dock-downscale',
      'rotate-to-fullscreen',
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const dialogContent = this.shadowRoot.querySelector('.dialog-content');
    const dialogInnerWrapper = dialogContent.querySelector('.dialog-inner-wrapper');
    const placeholder = this.shadowRoot.querySelector('.placeholder');
    const popover = this.shadowRoot.querySelector('.popover');
    const dockMode = this.getAttribute('dock-mode');
    const transitionDuration = DEFAULT_TRANSITION_DURATION;
    const aspectRatios = [
      dockMode === 'sticky'
        ? this.getAttribute('dock-sticky-aspect-ratio')
        : this.getAttribute('dock-aspect-ratio'),
      this.getAttribute('aspect-ratio'),
    ];
    const moveTo = dockMode === 'sticky'
      ? getDockStickyTarget(this)
      : getAlternativeDockTarget(this) || getDefaultDockTarget(this);
    if (name === 'dock-target') {
      const dockTarget = getAlternativeDockTarget(this);
      if (!newValue) {
        if (this._dockTargetResizeObserver) {
          this._dockTargetResizeObserver.disconnect();
        }
      } else if (window.ResizeObserver && dockTarget) {
        this._dockTargetResizeObserver = new window.ResizeObserver(
          () => this.refreshDockDialog(),
        );
        this._dockTargetResizeObserver.observe(dockTarget);
      }
    }

    if (name === 'mode') {
      if (this._wasInHiddenMode && (
        newValue === 'lightbox'
        || newValue === 'dock'
        || newValue === 'inline'
      )) {
        if (newValue !== 'inline') {
          placeholder.style.display = 'none';
        }
        placeholder.style.visibility = 'hidden';
      } else {
        placeholder.style.display = null;
        placeholder.style.visibility = null;
      }
      window.removeEventListener('touchmove', this._onNonPassiveTouchMove, {
        passive: false,
      });

      if (newValue === 'dock') {
        if (popover.showPopover) popover.showPopover();
        // ensure to refresh dock-target states before transition
        this.refreshDockDialog();
        dialogContent.style.zIndex = DOCK_Z_INDEX;
        updateDockTargetState(this);
        moveFromTo(dialogContent, {
          from: placeholder,
          to: moveTo,
          animate: !this._wasInHiddenMode,
          initialAspectRatio: getAspectRatioFromStrings([
            this.getAttribute('aspect-ratio'),
          ]),
          aspectRatio: getAspectRatioFromStrings(aspectRatios),
          downscale: this.getAttribute('dock-downscale'),
          transitionDuration,
        }).then(({ scale }) => {
          if (oldValue === 'lightbox') {
            this.refreshDockDialog();
          }
          if (this.getAttribute('dock-downscale')) {
            this.dispatchEvent(
              new CustomEvent('dockscale', {
                detail: { scale },
                bubbles: true,
                composed: true,
              }),
            );
          }
        });
      } else if (newValue === 'inline') {
        const goToInline = () => {
          // also ensure that "absolute" positioning works
          if (popover.hidePopover) popover.hidePopover();

          // somehow this avoids CLS when switching between
          // position "fixed" => "absolute"
          dialogContent.style.display = 'grid';
          dialogContent.style.position = 'absolute';
          dialogContent.style.transform = 'scale(1)';
          dialogInnerWrapper.style.transform = null;
          dialogInnerWrapper.style.width = null;
          dialogContent.style.top = null;
          dialogContent.style.left = null;
          if (!this._wasInHiddenMode && oldValue === 'dock') {
            dialogContent.style.transitionDuration = `${transitionDuration}ms`;
            dialogInnerWrapper.style.transitionDuration = null;
            dialogContent.style.transitionTimingFunction = 'ease-out';
          }
          setTimeout(() => {
            if (this.getAttribute('mode') === 'inline') {
              dialogContent.setAttribute('style', '');
              dialogInnerWrapper.setAttribute('style', '');
              placeholder.style.visibility = 'hidden';
              if (popover.hidePopover) popover.hidePopover();
            }
          }, transitionDuration);
        };
        if (oldValue === 'dock') {
          // in order to transition with animation back from dock to inline
          dialogContent.style.transitionDuration = `${transitionDuration}ms`;
          // reposition element without animation
          // so that new position with scroll gets calculated
          moveFromTo(dialogContent, {
            from: placeholder,
            to: moveTo,
            animate: false,
            initialAspectRatio: getAspectRatioFromStrings([
              this.getAttribute('aspect-ratio'),
            ]),
            aspectRatio: getAspectRatioFromStrings(aspectRatios),
            downscale: this.getAttribute('dock-downscale'),
            transitionDuration,
          }).then(() => {
            window.requestAnimationFrame(() => {
              goToInline();
            });
          });
        } else if (oldValue !== 'inline') {
          goToInline();
        }
        this._wasInHiddenMode = false;
      } else if (newValue === 'lightbox') {
        // prevent scrolling
        window.document.body.style.height = '100%';
        window.document.body.style.overflow = 'hidden';
        this._bodyStyleAdjusted = true;
        dialogContent.setAttribute('style', '');
        dialogInnerWrapper.setAttribute('style', '');
        dialogInnerWrapper.setAttribute('tabindex', '-1');
        dialogInnerWrapper.focus();
        // prevent document scrolling on iOS
        this._onNonPassiveTouchMove = (event) => {
          event.preventDefault();
        };
        window.addEventListener('touchmove', this._onNonPassiveTouchMove, {
          passive: false,
        });
        if (popover.showPopover) popover.showPopover();
        dialogContent.showModal();
        this._adjustLightboxModeForLandscapeOnMobile();
        if (this._rotateToFullscreen) {
          this._rotateToFullscreen.enable();
        }
      } else if (newValue === 'hidden') {
        this._wasInHiddenMode = true;
      }

      if (newValue !== 'lightbox') {
        // reset prevent scrolling
        if (this._bodyStyleAdjusted) {
          window.document.body.style.height = null;
          window.document.body.style.overflow = null;
        }
        dialogContent.close();
        dialogInnerWrapper.removeAttribute('tabindex');
      }

      if (oldValue === 'lightbox' && this._rotateToFullscreen) {
        this._rotateToFullscreen.disable();
        dialogContent.close();
      }

      this.dispatchEvent(
        new CustomEvent('modechange', {
          detail: {
            previousMode: oldValue,
            mode: newValue,
            internal: this._internalModeChange,
          },
          bubbles: true,
          composed: true,
        }),
      );
      this._internalModeChange = false;
    }

    if (name === 'dock-target') {
      if (this._disconnectDragAndDrop) this._disconnectDragAndDrop();
      this._disconnectDragAndDrop = connectDragAndDrop(this);
      this.refreshDockDialog();
    }

    if (name === 'dock-target-inset') {
      const positions = toPositions(newValue) || toPositions(DEFAULT_DOCK_TARGET_INSET);
      Object.assign(
        this.shadowRoot.querySelector('.dock-target').style,
        positions,
      );

      // ensure to position from left by X% (e.g. 50% = center it)
      const transform = [];
      if (positions.top.match(/%$/)) {
        transform.push(`translateY(-${positions.top})`);
      } else if (positions.bottom.match(/%$/)) {
        transform.push(`translateY(${positions.bottom})`);
      }
      if (positions.left.match(/%$/)) {
        transform.push(`translateX(-${positions.left})`);
      } else if (positions.right.match(/%$/)) {
        transform.push(`translateX(${positions.right})`);
      }

      if (transform.length > 0) {
        this.shadowRoot.querySelector('.dock-target').style.transform = transform.join(' ');
      }
      this.refreshDockDialog();
    }

    if (name === 'dock-sticky-target-top') {
      this.refreshDockDialog();
    }

    if (name === 'dock-mode') {
      if (this._disconnectDragAndDrop) this._disconnectDragAndDrop();
      if (newValue !== 'sticky') {
        this._disconnectDragAndDrop = connectDragAndDrop(this);
      }
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

    if (name === 'dock-sticky-aspect-ratio') {
      updateDockStickyAspectRatio(this, getAspectRatioFromStrings([
        this.getAttribute('dock-sticky-aspect-ratio'),
        this.getAttribute('aspect-ratio'),
      ]));
    }
    if (name === 'dock-downscale' && newValue) {
      if (newValue) {
        dialogInnerWrapper.setAttribute('style', '');
      } else {
        // No implementation when dock-downscale gets reset
      }
    }

    if (name === 'rotate-to-fullscreen') {
      if (newValue == null && this._rotateToFullscreen) {
        this._rotateToFullscreen.disable();
        this._rotateToFullscreen.removeEventListener('exit', this._onRotateToFullscreenExit);
        this._rotateToFullscreen.removeEventListener('enter', this._onRotateToFullscreenEnter);
        this._rotateToFullscreen = undefined;
      } else if (allowRotateToFullscreen) {
        this._onRotateToFullscreenExit = (event) => {
          if (event.detail.orientation.indexOf('landscape') === 0) {
            this._internalModeChange = true;
            this.setAttribute('mode', this._wasInHiddenMode ? 'hidden' : 'inline');
          }
          this.removeAttribute('fullscreen');
        };
        this._onRotateToFullscreenEnter = () => {
          // expose fullscreen to the light-dom so we can apply fullscreen styles there
          // (device-mode: fullscreen) media queries somehow don't work in combination
          // with shadow dom
          this.setAttribute('fullscreen', '');
        };
        try {
          // iOS < 14 will fail extending EventTarget constructor
          this._rotateToFullscreen = new RotataToFullscreen(window, dialogInnerWrapper);
          this._rotateToFullscreen.addEventListener('exit', this._onRotateToFullscreenExit);
          this._rotateToFullscreen.addEventListener('enter', this._onRotateToFullscreenEnter);
        } catch (err) {
          // ignore
        }
      }
    }
  }

  _adjustLightboxModeForLandscapeOnMobile() {
    if (this.getAttribute('mode') !== 'lightbox') return;
    const mobileLandscapeSelector = `(max-device-width: ${PHONE_MAX_WIDTH}px) and (pointer: coarse) and (orientation: landscape)`;
    if (window.matchMedia(mobileLandscapeSelector).matches) {
      // allow scrolling in mobile landscape
      // so that the user can scroll down to remove the browser bar
      if (this._bodyStyleAdjusted) {
        window.document.body.style.overflow = null;
      }
    } else {
      window.document.body.style.overflow = 'hidden';
      this._bodyStyleAdjusted = true;
    }
  }

  /**
   * Forces repositioning docked dialog element.
   * Should be called when an external "dock-target" changed
   * its size or position.
   */
  refreshDockDialog() {
    const dialogContent = this.shadowRoot.querySelector('.dialog-content');
    const dockStickyTarget = this.shadowRoot.querySelector('.dock-sticky-target');
    const dockStickyTargetTop = this.getAttribute('dock-sticky-target-top');
    const clientRect = this.getBoundingClientRect();
    const mode = this.getAttribute('mode');
    const dockMode = this.getAttribute('dock-mode');
    const aspectRatios = [
      dockMode === 'sticky'
        ? this.getAttribute('dock-sticky-aspect-ratio')
        : this.getAttribute('dock-aspect-ratio'),
      this.getAttribute('aspect-ratio'),
    ];
    if (dockMode === 'sticky') {
      const alternativeDockTarget = getAlternativeDockTarget(this);
      if (alternativeDockTarget) {
        // adjust the ".dock-sticky-target" top value based on selector
        const { height } = getViewportIntersection(alternativeDockTarget);
        // in case we attach to navigation bars that can be expanded
        // we ignore to adjust sticky position below a certain threshold
        // based on given external selector
        if (height < STICKY_TOP_SELECTOR_THRESHOLD && height > 0) {
          dockStickyTarget.style.top = `${height || 0}px`;
        } else {
          // when not visible adjust to dock-sticky-target-top value
          dockStickyTarget.style.top = `${dockStickyTargetTop || 0}px`;
        }
      } else {
        // when no alternative dock target adjust to dock-sticky-target-top value
        dockStickyTarget.style.top = `${dockStickyTargetTop || 0}px`;
      }
    }

    const moveTo = dockMode === 'sticky'
      ? getDockStickyTarget(this)
      : getAlternativeDockTarget(this) || getDefaultDockTarget(this);

    let stickyWidth = clientRect.width;
    if (stickyWidth === 0) {
      stickyWidth = window.innerWidth * 0.9;
    }

    dockStickyTarget.style.left = `${clientRect.left}px`;
    dockStickyTarget.style.width = `${stickyWidth}px`;
    dockStickyTarget.style.height = `${stickyWidth / getAspectRatioFromStrings(aspectRatios)}px`;

    if (mode === 'dock') {
      updateDockTargetState(this);
      moveFromTo(dialogContent, {
        from: this.shadowRoot.querySelector('.placeholder'),
        to: moveTo,
        animate: false,
        initialAspectRatio: getAspectRatioFromStrings([
          this.getAttribute('aspect-ratio'),
        ]),
        aspectRatio: getAspectRatioFromStrings(aspectRatios),
        downscale: this.getAttribute('dock-downscale'),
        transitionDuration: 0,
      }).then(({ scale }) => {
        if (this.getAttribute('dock-downscale')) {
          this.dispatchEvent(
            new CustomEvent('dockscale', {
              detail: { scale },
              bubbles: true,
              composed: true,
            }),
          );
        }
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
  let bodyStyleAdjusted = false;
  const dragHandle = element.shadowRoot.querySelector('slot[name=dock-background]');
  const dockTarget = element.shadowRoot.querySelector('.dock-target');
  const dialogElement = element.shadowRoot.querySelector('slot[name=dialog-element]');
  // overlay for the whole page so that events don't bubble into other iframes
  const pageOverlay = document.createElement('div');
  pageOverlay.style.display = 'block';
  pageOverlay.style.position = 'fixed';
  pageOverlay.style.top = 0;
  pageOverlay.style.right = 0;
  pageOverlay.style.bottom = 0;
  pageOverlay.style.left = 0;
  pageOverlay.style.zIndex = DOCK_Z_INDEX - 1;

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
      dockTarget.style.transform = null;
      element.refreshDockDialog();
    });
  };

  const onNonPassiveTouchMove = (event) => {
    event.preventDefault();
  };

  const mouseUp = () => {
    disconnectListeners();
    dialogElement.style.pointerEvents = null;
    // reset scrolling
    if (bodyStyleAdjusted) {
      window.document.body.style.height = null;
      window.document.body.style.overflow = null;
    }
    if (pageOverlay.parentNode === document.body) {
      document.body.removeChild(pageOverlay);
    }
    setTimeout(() => {
      element.classList.remove('dragging');
    }, 1);
  };

  const mouseDown = (event) => {
    disconnectListeners();
    if (element.getAttribute('mode') !== 'dock') return;
    element.classList.add('dragging');
    // prevent mousemove events to be swallowed when glomex-dialog
    // has an iframe as child
    dialogElement.style.pointerEvents = 'none';
    // prevent scrolling
    window.document.body.style.height = '100%';
    window.document.body.style.overflow = 'hidden';
    bodyStyleAdjusted = true;
    // place an overlay above the whole document to
    // prevent events bubbling into iframes on that page during drag
    document.body.appendChild(pageOverlay);

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
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('mouseup', mouseUp, { passive: true });
    document.addEventListener('touchend', mouseUp, { passive: true });
    document.addEventListener('touchcancel', mouseUp, { passive: true });
  };

  function disconnectListeners() {
    window.removeEventListener('touchmove', onNonPassiveTouchMove, { passive: false, once: true });
    document.removeEventListener('mousemove', onMove, { passive: true });
    document.removeEventListener('touchmove', onMove, { passive: true });
    document.removeEventListener('mouseup', mouseUp, { passive: true });
    document.removeEventListener('touchend', mouseUp, { passive: true });
    document.removeEventListener('touchcancel', mouseUp, { passive: true });
    if (bodyStyleAdjusted) {
      window.document.body.style.height = null;
      window.document.body.style.overflow = null;
    }
    bodyStyleAdjusted = false;
  }

  function fixIosHover() {}

  // get hover working on iOS
  document.documentElement.addEventListener('touchstart', fixIosHover, { passive: true });
  dragHandle.addEventListener('mousedown', mouseDown, { passive: false });
  dragHandle.addEventListener('touchstart', mouseDown, { passive: true });

  return () => {
    mouseUp();
    document.documentElement.removeEventListener('touchstart', fixIosHover, { passive: true });
    dragHandle.removeEventListener('mousedown', mouseDown, { passive: false });
    dragHandle.removeEventListener('touchstart', mouseDown, { passive: true });
  };
}

if ('attachShadow' in window.document.createElement('div')
  && window.customElements
  && !window.customElements.get('glomex-dialog')
) {
  window.customElements.define('glomex-dialog', GlomexDialogElement);
}
