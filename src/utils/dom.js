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