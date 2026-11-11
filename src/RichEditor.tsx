import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Bold, Italic, Underline, List, ListOrdered, Table, Sigma } from 'lucide-react'
import { Button, IconButton, Modal } from './ui'
import { captureRich, equationMarkup, richHtml } from './rich'

const MathEditor = lazy(()=>import('./MathEditor'))
export function RichEditor({value, change, label}: {value:string;change:(value:string)=>void;label:string}) {
  const ref=useRef<HTMLDivElement>(null)
  const seen=useRef<string | undefined>(undefined)
  const selection=useRef<Range|null>(null)
  const token=useRef<HTMLElement|null>(null)
  const [latex,setLatex]=useState<string|null>(null)
  const [table,setTable]=useState(false)
  const [rows,setRows]=useState(2)
  const [columns,setColumns]=useState(2)
  useEffect(()=>{
    if(seen.current!==value && ref.current) {ref.current.innerHTML=richHtml(value,true);seen.current=value}
  },[value])
  function update() {
    if(!ref.current)return
    const next=captureRich(ref.current)
    if(next.length>120_000){ref.current.innerHTML=richHtml(seen.current??'',true);return}
    seen.current=next;change(next)
  }
  function remember() {
    const current=window.getSelection()
    const range=current?.rangeCount ? current.getRangeAt(0) : null
    selection.current=range && ref.current?.contains(range.commonAncestorContainer) ? range.cloneRange() : null
  }
  function focus() {
    const editor=ref.current
    editor?.focus()
    const current=window.getSelection()
    const previous=selection.current
    if(!editor || !current)return
    if(previous && editor.contains(previous.commonAncestorContainer)){current.removeAllRanges();current.addRange(previous)}
    else {const end=document.createRange();end.selectNodeContents(editor);end.collapse(false);current.removeAllRanges();current.addRange(end)}
  }
  function command(name:string, argument?:string) {
    focus()
    document.execCommand(name,false,argument)
    update()
    remember()
  }
  function openEquation(target:HTMLElement|null) {
    remember()
    token.current=target
    setLatex(target?.dataset.equation??'')
  }
  function saveEquation(value:string) {
    flushSync(()=>setLatex(null))
    if(token.current?.isConnected) {
      if(value) token.current.outerHTML=equationMarkup(value)
      else token.current.remove()
      update()
    } else if(value) command('insertHTML',equationMarkup(value)+'&nbsp;')
  }
  const tools=[[Bold,'bold','عريض'],[Italic,'italic','مائل'],[Underline,'underline','تسطير'],[List,'insertUnorderedList','قائمة نقطية'],[ListOrdered,'insertOrderedList','قائمة مرقمة']] as const
  return <div className="rich">
    <div className="rich-tools" aria-label="أدوات التنسيق" role="group">
      {tools.map(([Icon, name, title])=><IconButton key={name} label={title} onMouseDown={event=>event.preventDefault()} onClick={()=>{remember();command(name)}}><Icon size={16}/></IconButton>)}
      <IconButton label="إدراج جدول" onMouseDown={event=>event.preventDefault()} onClick={()=>{remember();setTable(true)}}><Table size={17}/></IconButton>
      <Button kind="ghost" onMouseDown={event=>event.preventDefault()} onClick={()=>openEquation(null)}><Sigma size={17}/>معادلة</Button>
    </div>
    <div ref={ref} className="editable" contentEditable suppressContentEditableWarning role="textbox" aria-label={label} aria-multiline="true" dir="rtl" data-placeholder={label} onInput={update}
      onPaste={event=>{event.preventDefault();remember();command('insertText',event.clipboardData.getData('text/plain'))}}
      onDrop={event=>event.preventDefault()}
      onClick={event=>{const target=(event.target as HTMLElement).closest<HTMLElement>('span[data-equation]');if(target)openEquation(target)}}/>
    {latex!==null && <Modal title="محرر المعادلات" close={()=>setLatex(null)}><Suspense fallback={<p>جارٍ تحميل محرر المعادلات…</p>}><MathEditor initial={latex} existing={!!token.current} save={saveEquation}/></Suspense></Modal>}
    {table && <Modal title="إدراج جدول" close={()=>setTable(false)}>
      <div className="form-grid">
        <label className="field">عدد الصفوف<input type="number" min="1" max="12" value={rows} onChange={event=>setRows(Math.max(1,Math.min(12,+event.target.value)))}/></label>
        <label className="field">عدد الأعمدة<input type="number" min="1" max="8" value={columns} onChange={event=>setColumns(Math.max(1,Math.min(8,+event.target.value)))}/></label>
      </div><Button kind="primary" onClick={()=>{flushSync(()=>setTable(false));command('insertHTML','<table><tbody>'+('<tr>'+'<td><br></td>'.repeat(columns)+'</tr>').repeat(rows)+'</tbody></table><p><br></p>')}}>إدراج الجدول</Button>
    </Modal>}
  </div>
}
