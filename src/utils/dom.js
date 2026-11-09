export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    // Skip "empty" values so callers can write { disabled: isBusy } safely.
    if (value === undefined || value === null || value === false) continue;

    if (key === 'className') {
      el.className = value;
    } else if (key === 'text') {
      el.textContent = value; // safe: never interpreted as HTML
    } else if (key.startsWith('on') && typeof value === 'function') {
      // onClick → 'click', onKeydown → 'keydown'
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in el && typeof value !== 'string') {
      // DOM properties such as `checked` or `disabled` take real booleans.
      el[key] = value;
    } else {
      // Everything else becomes an HTML attribute: aria-label, data-*, type...
      el.setAttribute(key, value === true ? '' : value);
    }
  }

  // Children can be elements, strings, or (nested) arrays of them.
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return el;
}

export async function Svg(path, props = {}) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Could not load SVG: ${path}`);
  }

  const markup = await response.text();
  const svgDocument = new DOMParser().parseFromString(markup, 'image/svg+xml');

  if (svgDocument.querySelector('parsererror') || svgDocument.documentElement.localName !== 'svg') {
    throw new Error(`Invalid SVG: ${path}`);
  }

  const icon = document.importNode(svgDocument.documentElement, true);

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;

    if (key.startsWith('on') && typeof value === 'function') {
      icon.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'text') {
      icon.textContent = value;
    } else {
      icon.setAttribute(key === 'className' ? 'class' : key, String(value));
    }
  }

  return icon;
}
