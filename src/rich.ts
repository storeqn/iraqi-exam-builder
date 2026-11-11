import DOMPurify from 'dompurify'
import katex from 'katex'

export function clean(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS:['p','div','span','br','b','strong','i','em','u','ul','ol','li','table','thead','tbody','tr','td','th'],
    ALLOWED_ATTR:['data-equation','dir','colspan','rowspan'], ALLOW_DATA_ATTR:false,
  })
}
export function richHtml(html: string, editable = false) {
  const template = document.createElement('template')
  template.innerHTML = clean(html)
  for (const token of template.content.querySelectorAll<HTMLElement>('span[data-equation]')) {
    const latex = token.dataset.equation?.slice(0, 5000) ?? ''
    token.className = 'equation'
    token.dir = 'ltr'
    if (editable) {
      token.contentEditable = 'false'
      token.title = 'تحرير المعادلة'
    }
    token.innerHTML = katex.renderToString(latex, {throwOnError:false, trust:false, maxExpand:250, maxSize:12, output:'html'})
    token.setAttribute('aria-label', latex)
  }
  return template.innerHTML
}
export function captureRich(editor: HTMLElement) {
  const copy = editor.cloneNode(true) as HTMLElement
  for (const token of copy.querySelectorAll('span[data-equation]')) token.textContent = ''
  return clean(copy.innerHTML)
}
export const escapeText = (value: string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
export function equationMarkup(latex: string) {
  return richHtml(`<span data-equation="${escapeText(latex)}"></span>`, true)
}
