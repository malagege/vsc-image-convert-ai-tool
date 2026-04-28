# vsc-image-convert-ai-tool

A Visual Studio Code extension that lets **GitHub Copilot / AI** convert images to **WebP** or **AVIF** format. Configurable default settings are available in VS Code Settings, and the conversion tool is callable directly by AI assistants through the Language Model Tools API.

---

## Features

- 🤖 **AI-callable image conversion tool** – Copilot can call `imageConvert_convert` to convert one or more images on your behalf.
- ⚙️ **Configurable defaults** – Set your preferred output format, quality, output directory, and overwrite behaviour in VS Code Settings.
- 📁 **Glob-pattern support** – Pass patterns like `/project/images/*.png` to convert entire folders.
- 🖼️ **Supported input formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.tiff`, `.avif`, `.gif`, `.svg`
- 📤 **Supported output formats**: `webp`, `avif`
- 📊 **Size reporting** – After each conversion, original size, new size, and the percentage saved are reported.

---

## Requirements

- Visual Studio Code **1.95** or later (Language Model Tools API)
- Node.js **18** or later (needed to build from source)

---

## Extension Settings

All settings live under the `imageConvert` namespace and are configurable via **File → Preferences → Settings**.

| Setting | Type | Default | Description |
|---|---|---|---|
| `imageConvert.defaultOutputFormat` | `"webp"` \| `"avif"` | `"webp"` | Default output format |
| `imageConvert.defaultQuality` | number (1–100) | `80` | Default conversion quality |
| `imageConvert.defaultOutputDirectory` | string | `""` | Default output directory (empty = same folder as source) |
| `imageConvert.forceOverwrite` | boolean | `false` | Overwrite existing files without asking |

---

## Commands

| Command | Description |
|---|---|
| `Image Convert: Convert Current File` | Converts the file open in the active editor using your default settings |
| `Image Convert: Select and Convert Images` | Opens a file picker so you can select images to convert |

---

## Using with AI (Copilot)

Once the extension is installed, GitHub Copilot can call the `imageConvert_convert` tool.  
Example prompt in the Copilot chat:

```
Convert all PNG files in the images/ folder to WebP with quality 85.
```

The tool accepts the following parameters (all optional except `files`):

| Parameter | Type | Description |
|---|---|---|
| `files` | `string[]` | Paths or glob patterns of images to convert |
| `outputFormat` | `"webp"` \| `"avif"` | Target format (defaults to setting) |
| `quality` | number | Quality 1–100 (defaults to setting) |
| `outputDirectory` | string | Where to save (defaults to setting) |
| `forceOverwrite` | boolean | Overwrite existing files (defaults to setting) |

---

## Building from Source

```bash
git clone https://github.com/malagege/vsc-image-convert-ai-tool.git
cd vsc-image-convert-ai-tool
npm install
npm run compile
```

Press **F5** in VS Code to open an Extension Development Host.

---

## Credits

- Image processing powered by [Sharp](https://github.com/lovell/sharp) (Apache 2.0)
- Inspired by [mcp-gdx-image-webify](https://github.com/geckod22/mcp-gdx-image-webify)

## License

MIT
