const fs = require('fs');
const path = require('path');

async function build() {
  const outDir = 'assets';
  const outPath = path.join(outDir, 'tailwind.min.css');

  // Preferred: if a compiled tailwind index.css exists in node_modules, copy it.
  const vendorPath = path.join('node_modules', 'tailwindcss', 'index.css');
  if (fs.existsSync(vendorPath)) {
    try {
      fs.mkdirSync(outDir, { recursive: true });
      const data = fs.readFileSync(vendorPath, 'utf8');
      fs.writeFileSync(outPath, data, 'utf8');
      console.log(`Copied prebuilt Tailwind from ${vendorPath} -> ${outPath}`);
      return;
    } catch (err) {
      console.error('Failed to copy prebuilt Tailwind:', err);
      process.exit(1);
    }
  }

  // Fallback: try to build from src/input.css using PostCSS + tailwind if available.
  try {
    const postcss = require('postcss');
    const tailwind = require('tailwindcss');
    const autoprefixer = require('autoprefixer');

    const inputPath = 'src/input.css';
    const input = fs.readFileSync(inputPath, 'utf8');
    const result = await postcss([tailwind, autoprefixer]).process(input, {
      from: inputPath,
      to: outPath,
      map: false,
    });

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, result.css, 'utf8');
    console.log(`Built ${outPath} via PostCSS`);
  } catch (err) {
    console.error('Build failed: could not build Tailwind CSS.', err.message || err);
    console.error('Install dependencies or ensure node_modules/tailwindcss/index.css exists.');
    process.exit(1);
  }
}

build();
