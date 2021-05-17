# glomex-dialog
A dialog web component that allows docking a video player or putting it in a lightbox

See an example here: http://unpkg.com/@glomex/glomex-dialog/example.html

## Usage

~~~html
<script type="module">
  import 'http://unpkg.com/@glomex/glomex-dialog';
</script>
<!-- adjusting mode to "dock" or "lightbox" -->
<glomex-dialog id="inlinePlayer" mode="inline" dock-target-inset="0px 10px auto auto">
  <div slot="dialog-element">
    <a-video-player></a-video-player>
  </div>
</glomex-dialog>
~~~

## API

### Attributes

| Attribute           | Values |
|---------------------|--------|
| `aspect-ratio`      | `16:9` (default) |
| `dock-target`       | `#anotherElement` |
| `dock-target-inset` | `0px 10px auto auto` |
| `mode`              | `inline`, `dock`, `lightbox` |

### Properties

| Property      | Modifiers | Type              |
|---------------|-----------|-------------------|
| `aspectRatio` | readonly  | `number`          |
| `dockTarget`  | readonly  | `Element \| null` |
| `placeholder` | readonly  | `Element \| null` |

### Methods

| Method              | Type       |
|---------------------|------------|
| `refreshDockTarget` | `(): void` |

### Events

| Event          | Type                          |
|----------------|-------------------------------|
| `toggledialog` | `CustomEvent<{ mode: any; }>` |

## License

[Apache 2.0 License](https://oss.ninja/apache-2.0-header/glomex)
