const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

// Insert semantic tokens into :root
let rootRepl = : root {
  /* Semantic Tokens (Light Theme Default) */
  --bg - body: var(--wood - 50);
--bg - surface: var(--white);
--bg - alt: var(--green - 50);
--text - primary: var(--gray - 800);
--text - secondary: var(--gray - 500);
--border - light: var(--gray - 200);
--bg - invert: var(--green - 900);
--text - invert: var(--white);
;
css = css.replace(/:root\s*\{/, rootRepl);

// Add data-theme="dark" right after :root closes
let darkTheme =
    [data - theme="dark"] {
  --bg - body: var(--gray - 900);
--bg - surface: var(--black);
--bg - alt: #222222;
--text - primary: var(--gray - 100);
--text - secondary: var(--gray - 400);
--border - light: var(--gray - 800);
--bg - invert: var(--green - 100);
--text - invert: var(--gray - 900);
}
;
css = css.replace(/(\n\}\n\n\/\* -- RESET)/, }\n\\n/* -- RESET);

// Replace direct generic usages
css = css.replace(/var\(--wood-50\)/g, 'var(--bg-body)');
css = css.replace(/var\(--white\)/g, 'var(--bg-surface)');
css = css.replace(/var\(--green-50\)/g, 'var(--bg-alt)');
css = css.replace(/var\(--gray-800\)/g, 'var(--text-primary)');
css = css.replace(/var\(--gray-500\)/g, 'var(--text-secondary)');
css = css.replace(/var\(--gray-200\)/g, 'var(--border-light)');

fs.writeFileSync('styles.css', css);
console.log("CSS updated!");
