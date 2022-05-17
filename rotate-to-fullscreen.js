// when bundled for IE window.EventTarget could be undefined
// and extending "RotateToFullscreen" with "undefined" would lead to
// a failing bundled file
const EventTarget = window.EventTarget || Object;

/**
 * Handles <glomex-dialog rotate-to-fullscreen>
 */
export class RotataToFullscreen extends EventTarget {
  constructor(window, fullscreenElement) {
    super();
    this._element = fullscreenElement;
    this._rootNode = this._element.getRootNode();
    this._window = window;
    this._onOrientationChange = this._onOrientationChange.bind(this);
    this._onIframeFullscreenChange = this._onIframeFullscreenChange.bind(this);
  }

  enable() {
    const { _window: window, _element: element } = this;
    const { screen } = window;

    if (!(screen && screen.orientation)) return;

    screen.orientation.addEventListener('change', this._onOrientationChange);
    element.addEventListener('fullscreenchange', this._onIframeFullscreenChange);

    const isInLandscape = screen.orientation.type.indexOf('landscape') === 0;
    if (this._rootNode.fullscreenElement === null && isInLandscape) {
      element.requestFullscreen().catch(() => {});
    }
  }

  disable() {
    const { _window: window, _element: element } = this;
    const { screen, document } = window;

    if (!(screen && screen.orientation)) return;

    if (this._rootNode.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
      // "fullscreenchange" is emitted async
      // ensure to send out an early exit here so that the consumer
      // can update on his own
      this.dispatchEvent(new window.CustomEvent('exit', {
        detail: {
          orientation: screen.orientation.type
        }
      }));
    }

    screen.orientation.removeEventListener('change', this._onOrientationChange);
    element.removeEventListener('fullscreenchange', this._onIframeFullscreenChange);
  }

  _onOrientationChange() {
    const { _window: window, _element: element } = this;
    const { screen, document } = window;

    if (
      this._rootNode.fullscreenElement === null
      && screen.orientation.type.indexOf('landscape') === 0
    ) {
      element.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  _onIframeFullscreenChange() {
    const { screen } = this._window;

    if (this._rootNode.fullscreenElement === null) {
      this.dispatchEvent(new window.CustomEvent('exit', {
        detail: {
          orientation: screen.orientation.type
        }
      }));
    } else {
      this.dispatchEvent(new window.CustomEvent('enter'));
    }
  }
}
