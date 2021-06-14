# glomex-dialog

A dialog web component that allows docking a video player or putting it in a lightbox.
It allows implementing a similar feature as [amp-video-docking](https://amp.dev/documentation/examples/multimedia-animations/advanced_video_docking/) but without using AMP.

This component only works in modern browsers that support [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) with [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components#shadow_dom).

For a formatted view of this document, please visit: http://unpkg.com/@glomex/glomex-dialog/index.html

## Testing

Checkout this project, do `npm install`, `npm start` and visit http://localhost:5000.

## Usage

~~~html
<script type="module">
  import 'http://unpkg.com/@glomex/glomex-dialog';
</script>
<!--
  mode: "hidden" | "inline" | "dock" | "lightbox"
-->
<glomex-dialog mode="inline">
  <!--
    "dock-overlay" is optional:
    enables drag'n'drop feature when defined
  -->
  <div slot="dock-overlay"></div>
  <div slot="dialog-element">
    <!-- Your HTML that should be docked / put into lightbox -->
  </div>
</glomex-dialog>
~~~

## Examples

### Inline mode

```js preact
import { html, render, useRef } from 'docup'

export default () => {
  const select = useRef();
  const dialog = useRef();
  const onButtonClick = () => {
    dialog.current.setAttribute('mode', select.current.value);
  };

  return html`
  <p>
  <select ref=${select}>
    <option value="hidden">hidden</option>
    <option value="inline" selected>inline</option>
    <option value="dock">dock</option>
    <option value="lightbox">lightbox</option>
  </select>
  <button onClick=${onButtonClick} class="button">Switch Dialog Mode</button>
  </p>
  <glomex-dialog ref=${dialog} mode="inline">
  <div slot="dialog-element">
    <div style="position: relative;">
      <div class="placeholder-16x9"></div>
      <video
        class="video-element"
        controls
        playsinline
        webkit-playsinline
        preload="none"
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        poster="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg">
      </video>
    </div>
  </div>
  </glomex-dialog>`
}
```

### Alternative dock target

Can render into an alternative dock target when this dock target is visible during dock transition.
Otherwise it uses the default dock target.

```js preact
import { html, render, useRef } from 'docup'

const sidebar = document.querySelector('.sidebar');
const alternativeDockTarget = document.createElement('div');
alternativeDockTarget.setAttribute('id', 'alternative-dock-target');
alternativeDockTarget.style.background = '#999';
alternativeDockTarget.width = '100%';
alternativeDockTarget.pointerEvents = 'none';
alternativeDockTarget.innerHTML = '<div class="placeholder-16x9"></div>';
sidebar.appendChild(alternativeDockTarget);

export default () => {
  const select = useRef();
  const dialog = useRef();
  const onButtonClick = () => {
    dialog.current.setAttribute('mode', select.current.value);
  };

  return html`
  <p>
  <select ref=${select}>
    <option value="hidden">hidden</option>
    <option value="inline" selected>inline</option>
    <option value="dock">dock</option>
    <option value="lightbox">lightbox</option>
  </select>
  <button onClick=${onButtonClick} class="button">Switch Dialog Mode</button>
  </p>
  <glomex-dialog ref=${dialog} dock-target="#alternative-dock-target" mode="inline">
  <div slot="dialog-element">
    <div style="position: relative;">
      <div class="placeholder-16x9"></div>
      <video
        class="video-element"
        controls
        playsinline
        webkit-playsinline
        preload="none"
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        poster="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg">
      </video>
    </div>
  </div>
  </glomex-dialog>`
}
```

~~~html
<glomex-dialog mode="inline" dock-target="#some-css-selector">
  <!-- ... -->
</glomex-dialog>
~~~

### Hidden

```js preact
import { html, render, useRef } from 'docup'

export default () => {
  const select = useRef();
  const dialog = useRef();
  const onButtonClick = () => {
    dialog.current.setAttribute('mode', select.current.value);
  };

  return html`
  <p>
  <select ref=${select}>
    <option value="hidden" selected>hidden</option>
    <option value="inline">inline</option>
    <option value="dock">dock</option>
    <option value="lightbox">lightbox</option>
  </select>
  <button onClick=${onButtonClick} class="button">Switch Dialog Mode</button>
  </p>
  <glomex-dialog mode="hidden" ref=${dialog}>
  <div slot="dialog-element">
    <div style="position: relative;">
      <div class="placeholder-16x9"></div>
      <video
        class="video-element"
        controls
        playsinline
        webkit-playsinline
        preload="none"
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        poster="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg">
      </video>
    </div>
  </div>
  </glomex-dialog>`
}
```

~~~html
<!-- without a defined mode attribute -->
<glomex-dialog mode="hidden">
  <!-- ... -->
</glomex-dialog>
~~~

### Provide own dock overlay

```js preact
import { html, render, useRef } from 'docup'

export default () => {
  const select = useRef();
  const dialog = useRef();
  const video = useRef();
  const onButtonClick = () => {
    dialog.current.setAttribute('mode', select.current.value);
  };

  const onPlayButtonClick = (event) => {
    video.current.play();
    event.preventDefault();
  };

  const onPauseButtonClick = (event) => {
    video.current.pause();
    event.preventDefault();
  }

  return html`
  <p>
  <style>
    glomex-dialog .custom-overlay {
      opacity: 0;
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      cursor: move;
    }
    glomex-dialog[mode=dock] .custom-overlay:hover {
      display: block;
      opacity: 1;
    }

    glomex-dialog .custom-overlay:hover {
      background-color: rgba(200, 200, 200, 0.7);
    }
    glomex-dialog .controls {
      display: flex;
      justify-content: space-evenly;
      align-items: center;
      height: 100%;
    }
    glomex-dialog .play-button, glomex-dialog .pause-button {
      color: black;
      font-size: 5em;
      cursor: pointer;
    }

    glomex-dialog .play-button:hover, glomex-dialog .pause-button:hover {
      color: white;
      font-size: 5em;
      cursor: pointer;
    }
  </style>
  <select ref=${select}>
    <option value="hidden">hidden</option>
    <option value="inline" selected>inline</option>
    <option value="dock">dock</option>
    <option value="lightbox">lightbox</option>
  </select>
  <button onClick=${onButtonClick} class="button">Switch Dialog Mode</button>
  </p>
  <glomex-dialog ref=${dialog} mode="inline" dock-target-inset="0px auto auto 0px">
    <div slot="dock-overlay" class="custom-overlay">
      <div class="controls">
        <button class="play-button" onClick=${onPlayButtonClick}>▶</button>
        <button class="pause-button" onClick=${onPauseButtonClick}>■</button>
      </div>
    </div>
    <div slot="dialog-element">
      <div style="position: relative;">
        <div class="placeholder-16x9"></div>
        <video
          ref=${video}
          class="video-element"
          controls
          playsinline
          webkit-playsinline
          preload="none"
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          poster="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg">
        </video>
      </div>
    </div>
  </glomex-dialog>`
}
```

~~~html
<style>
  glomex-dialog .custom-overlay {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    cursor: move;
  }
  glomex-dialog .custom-overlay:hover {
    background-color: rgba(200, 200, 200, 0.7);
  }
</style>
<glomex-dialog mode="inline" dock-target-inset="50px 10px auto auto">
  <!-- when this is defined it automatically makes the element draggable -->
  <!-- allows to place custom elements in the dock-overlay -->
  <div slot="dock-overlay" class="custom-overlay">
    <!-- place custom controls here -->
  </div>
  <!-- ... -->
</glomex-dialog>
~~~

### Custom dialog layout

```js preact
import { html, render, useRef } from 'docup'

export default () => {
  const select = useRef();
  const dialog = useRef();
  const onButtonClick = () => {
    dialog.current.setAttribute('mode', select.current.value);
  };

  return html`
  <style>
    glomex-dialog .title {
      display: none;
      color: white;
      background: red;
      padding: 0.2em 0.5em;
    }

    glomex-dialog[mode=dock] .title,
    glomex-dialog[mode=lightbox] .title {
      display: block;
      font-size: 1.5em;
    }

    glomex-dialog[mode=dock] .backdrop,
    glomex-dialog[mode=lightbox] .backdrop {
      border: 10px solid red;
      background: red;
    }
  </style>
  <p>
  <select ref=${select}>
    <option value="hidden">hidden</option>
    <option value="inline" selected>inline</option>
    <option value="dock">dock</option>
    <option value="lightbox">lightbox</option>
  </select>
  <button onClick=${onButtonClick} class="button">Switch Dialog Mode</button>
  </p>
  <glomex-dialog ref=${dialog} mode="inline" dock-aspect-ratio="16:11" dock-target-inset="auto 0px 0px auto">
  <div slot="dialog-element">
    <div class="backdrop">
    <div class="title">Super Duper Title</div>
    <div style="position: relative;">
      <div class="placeholder-16x9"></div>
      <video
        class="video-element"
        controls
        playsinline
        webkit-playsinline
        preload="none"
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        poster="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg">
      </video>
    </div>
    </div>
  </div>
  </glomex-dialog>`
}
```

~~~html
<style>
  glomex-dialog[mode=dock] .backdrop,
  glomex-dialog[mode=lightbox] .backdrop {
    background: red;
    border: 10px solid red;
  }
</style>
<!-- You can set a different aspect ratio for the dock mode -->
<glomex-dialog mode="inline" dock-aspect-ratio="16:10" dock-target-inset="50px 10px auto auto">
  <div class="backdrop">
    <div class="title">Some Title</div>
    <!-- ... --->
  </div>
</glomex-dialog>
~~~

### With IntersectionObserver and custom position

This example auto docks the video element when the player gets scrolled out of view.

```js preact
import { html, render, useRef, useEffect } from 'docup'

export default () => {
  const select = useRef();
  const dialog = useRef();
  const onButtonClick = () => {
    dialog.current.setAttribute('mode', select.current.value);
  };

  let onceVisible = false;
  let currentIntersectionRatio;

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const glomexDialog = dialog.current;
      currentIntersectionRatio = entries[0].intersectionRatio;
      if (!onceVisible) {
        onceVisible = entries[0].intersectionRatio === 1;
        return;
      }
      const currentMode = glomexDialog.getAttribute('mode');
      if (currentMode === 'lightbox' || !currentMode) {
        return;
      }
      if (entries[0].intersectionRatio < 1 && glomexDialog.getAttribute('mode') !== 'dock') {
        glomexDialog.setAttribute('mode', 'dock');
      } else if (entries[0].intersectionRatio === 1) {
        glomexDialog.setAttribute('mode', 'inline');
      }
    }, {
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
    });
    if (dialog.current) {
      observer.observe(dialog.current);
      dialog.current.addEventListener('modechange', (evt) => {
        if (evt.detail.mode === 'inline' && currentIntersectionRatio !== 1) {
          onceVisible = false;
        }
      });
    }
  }, [dialog]);

  return html`
  <p>
  <select ref=${select}>
    <option value="hidden" selected>hidden</option>
    <option value="inline">inline</option>
    <option value="dock">dock</option>
    <option value="lightbox">lightbox</option>
  </select>
  <button onClick=${onButtonClick} class="button">Switch Dialog Mode</button>
  </p>
  <glomex-dialog ref=${dialog} mode="inline" dock-target-inset="50px 10px auto auto">
  <div slot="dialog-element">
    <div style="position: relative;">
      <div class="placeholder-16x9"></div>
      <video
        class="video-element"
        controls
        playsinline
        webkit-playsinline
        preload="none"
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        poster="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg">
      </video>
    </div>
  </div>
  </glomex-dialog>`
}
```

~~~html
<!-- The intersection-observer-code is custom in the above example -->
<glomex-dialog mode="inline" dock-target-inset="50px 10px auto auto">
  <!-- ... -->
</glomex-dialog>
~~~

## API

### Attributes

| Attribute           |
|---------------------|
| `aspect-ratio`      |
| `dock-aspect-ratio` |
| `dock-target`       |
| `dock-target-inset` |
| `mode`              |

### Methods

| Method              | Type       |
|---------------------|------------|
| `refreshDockDialog` | `(): void` |

### Events

| Event          | Type                          |
|----------------|-------------------------------|
| `modechange` | `CustomEvent<{ mode: string; }>` |
| `dockchange`   | `CustomEvent<{ scale: number; }>` |

## License

[Apache 2.0 License](https://oss.ninja/apache-2.0-header/glomex)
