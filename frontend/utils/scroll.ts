export function scrollToElement(el: Element | null) {
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
}

export function isWideLayout() {
  return window.matchMedia('(min-width: 1280px)').matches;
}