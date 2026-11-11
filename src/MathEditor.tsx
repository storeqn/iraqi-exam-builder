import { useEffect, useRef, useState } from 'react'
import { MathfieldElement } from 'mathlive'
import { Button } from './ui'

MathfieldElement.fontsDirectory=import.meta.env.DEV?'/node_modules/mathlive/fonts':'/mathlive-fonts'
const buttons=[
  ['كسر','\\frac{#0}{#?}'],['أس','^{#?}'],['جذر','\\sqrt{#0}'],['جذر نوني','\\sqrt[#?]{#0}'],['≤','\\leq'],['≥','\\geq'],['≠','\\ne'],['±','\\pm'],['زاوية','\\angle'],
  ['sin','\\sin'],['cos','\\cos'],['tan','\\tan'],['log','\\log'],['حد','\\lim_{#?}'],['تكامل','\\int_{#?}^{#?}'],['مشتقة','\\frac{d}{dx}'],['مجموع','\\sum_{#?}^{#?}'],
  ['مصفوفة','\\begin{pmatrix}#? & #? \\\\ #? & #?\\end{pmatrix}'],['(x, y)','\\left(#?,#?\\right)'],['∈','\\in'],['∪','\\cup'],['∩','\\cap'],['ℝ','\\mathbb{R}'],['∞','\\infty'],['π','\\pi'],['α','\\alpha'],['β','\\beta'],['θ','\\theta'],
]
export default function MathEditor({initial, existing, save}: {initial:string;existing:boolean;save:(latex:string)=>void}) {
  const mount=useRef<HTMLDivElement>(null)
  const math=useRef<MathfieldElement|null>(null)
  const [showSource,setShowSource]=useState(false)
  const [value,setValue]=useState(initial)
  const [keyboard,setKeyboard]=useState(false)
  useEffect(()=>{
    const element=new MathfieldElement()
    element.setAttribute('aria-label','المعادلة الرياضية')
    element.mathVirtualKeyboardPolicy='manual'
    element.value=initial
    element.addEventListener('input',()=>setValue(element.value))
    mount.current?.append(element)
    math.current=element
    window.mathVirtualKeyboard.container=element.closest('dialog')
    element.focus()
    return ()=>{window.mathVirtualKeyboard.hide();window.mathVirtualKeyboard.container=null;element.remove();math.current=null}
  },[initial])
  return <>
    <p className="muted">استخدم الرموز لإدراج أجزاء المعادلة، ثم انتقل بين الخانات باستخدام الأسهم.</p>
    <div className="math-buttons" dir="ltr">{buttons.map(([label,source])=><Button key={label} onClick={()=>{math.current?.focus();math.current?.insert(source);setValue(math.current?.value??'')}}>{label}</Button>)}</div>
    <div className="math-host" ref={mount} dir="ltr"/>
    <div className="button-row"><Button onClick={()=>{const panel=window.mathVirtualKeyboard;if(panel.visible)panel.hide();else{math.current?.focus();panel.show()}setKeyboard(panel.visible)}}>{keyboard?'إخفاء لوحة الرموز':'لوحة الرموز'}</Button><Button kind="ghost" onClick={()=>setShowSource(!showSource)}>{showSource?'إخفاء LaTeX':'عرض LaTeX'}</Button></div>
    {showSource && <label className="field">LaTeX<input dir="ltr" maxLength={5000} value={value} onChange={event=>{setValue(event.target.value);if(math.current)math.current.value=event.target.value}}/></label>}
    <div className="button-row"><Button kind="primary" disabled={!value.trim() || value.length>5000} onClick={()=>save(value)}>حفظ المعادلة</Button>{existing&&<Button kind="danger" onClick={()=>save('')}>إزالة المعادلة</Button>}</div>
  </>
}
