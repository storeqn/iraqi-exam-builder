import { useRef, useState } from 'react'
import { Copy, Download, Redo2, Trash2, Undo2 } from 'lucide-react'
import { DiagramSvg, diagramSvg, graphPath, stage } from './diagram'
import { shapeTypes, uid, type Diagram, type Shape, type ShapeKind } from './model'
import { download } from './storage'
import { Button, Field, Select, Toggle } from './ui'
const labels = ['نقطة','مستقيم','قطعة مستقيمة','شعاع','زاوية','مثلث','مستطيل','مربع','دائرة','قوس','محاور إحداثية','منحنى دالة']
const choices = shapeTypes.map((kind,index)=>[kind,labels[index]] as const)
const bounded = (n:number) => Math.max(-1000,Math.min(1000,n))
export default function GeometryEditor({initial, save}: {initial:Diagram;save:(diagram:Diagram)=>void}) {
  const [shapes,setShapes]=useState(initial)
  const [history,setHistory]=useState<Diagram[]>([])
  const [future,setFuture]=useState<Diagram[]>([])
  const [selected,setSelected]=useState(initial[0]?.id??'')
  const [kind,setKind]=useState<ShapeKind>('triangle')
  const [grid,setGrid]=useState(true)
  const [snap,setSnap]=useState(true)
  const svg=useRef<SVGSVGElement>(null)
  const drag=useRef<{before:Diagram;id:string;dx:number;dy:number}|null>(null)
  const current=shapes.find(shape=>shape.id===selected)
  const invalid=shapes.some(shape=>{if(shape.kind!=='graph')return false;try{return !graphPath(shape)}catch{return true}})
  function commit(next:Diagram) {setHistory(old=>[...old.slice(-39),shapes]);setFuture([]);setShapes(next)}
  function undo() {const previous=history.at(-1);if(previous){setFuture([shapes,...future]);setShapes(previous);setHistory(history.slice(0,-1))}}
  function redo() {const next=future[0];if(next){setHistory([...history,shapes]);setShapes(next);setFuture(future.slice(1))}}
  function add() {
    const centered=['axes','graph','circle','point'].includes(kind)
    const shape:Shape={id:uid(),kind,x:centered?300:145,y:centered?180:105,w:kind==='axes'||kind==='graph'?420:140,h:kind==='axes'||kind==='graph'?280:85,label:'',measure:'',color:'#182640',weight:2,expression:'x^2/3'}
    commit([...shapes,shape]);setSelected(shape.id)
  }
  function update<K extends keyof Shape>(key:K,value:Shape[K]) {commit(shapes.map(shape=>shape.id===selected?{...shape,[key]:value}:shape))}
  function position(event:React.PointerEvent) {
    const matrix=svg.current?.getScreenCTM()
    return matrix ? new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()) : new DOMPoint(stage.width/2,stage.height/2)
  }
  function pick(event:React.PointerEvent<SVGGElement>,shape:Shape) {
    if(event.button!==0)return
    event.preventDefault()
    setSelected(shape.id)
    const point=position(event)
    drag.current={before:shapes,id:shape.id,dx:point.x-shape.x,dy:point.y-shape.y}
    svg.current?.setPointerCapture(event.pointerId)
  }
  function move(event:React.PointerEvent<SVGSVGElement>) {
    const active=drag.current
    if(!active)return
    const point=position(event)
    const align=(value:number)=>bounded(snap?Math.round(value/10)*10:Math.round(value))
    setShapes(old=>old.map(shape=>shape.id===active.id?{...shape,x:align(point.x-active.dx),y:align(point.y-active.dy)}:shape))
  }
  function release() {
    const active=drag.current
    if(active && active.before!==shapes){setHistory(old=>[...old.slice(-39),active.before]);setFuture([])}
    drag.current=null
  }
  return <div className="geometry">
    <div className="button-row"><Select label="نوع الشكل" value={kind} options={choices} change={value=>setKind(value as ShapeKind)}/><Button kind="primary" disabled={shapes.length>=60} onClick={add}>إضافة شكل</Button><Button disabled={!history.length} onClick={undo}><Undo2 size={16}/>تراجع</Button><Button disabled={!future.length} onClick={redo}><Redo2 size={16}/>إعادة</Button></div>
    <div className="button-row"><Toggle label="الشبكة" checked={grid} change={setGrid}/><Toggle label="محاذاة السحب للشبكة" checked={snap} change={setSnap}/></div>
    <div className="geometry-stage"><DiagramSvg shapes={shapes} selected={selected} pick={pick} svgRef={svg} move={move} release={release} grid={grid}/></div>
    {!!shapes.length&&<Select label="الشكل المحدد" value={current?.id??''} options={[[ '', 'اختر شكلاً'],...shapes.map((shape,index)=>[shape.id,`${index+1}. ${labels[shapeTypes.indexOf(shape.kind)]}${shape.label?' — '+shape.label:''}`] as const)]} change={setSelected}/>}
    {current&&<><div className="form-grid">
      {([['x','الموضع X'],['y','الموضع Y'],['w','العرض / اتجاه X'],['h','الارتفاع / اتجاه Y']] as const).map(([key,label])=><Field key={key} label={label} type="number" min={-1000} max={1000} value={current[key]} onChange={event=>update(key,bounded(+event.target.value))}/>)}
      <Field label="اسم الشكل" maxLength={100} value={current.label} onChange={event=>update('label',event.target.value)}/>
      <Field label="القياس" maxLength={100} value={current.measure} onChange={event=>update('measure',event.target.value)}/>
      <Field label="اللون" type="color" value={current.color} onChange={event=>update('color',event.target.value)}/>
      <Field label="سماكة الخط" type="number" min="0.5" max="12" step="0.5" value={current.weight} onChange={event=>update('weight',Math.max(.5,Math.min(12,+event.target.value)))}/>
      {current.kind==='graph'&&<Field label="الدالة بدلالة x" maxLength={160} dir="ltr" value={current.expression} onChange={event=>update('expression',event.target.value)}/>}
    </div><div className="button-row"><Button disabled={shapes.length>=60} onClick={()=>{const copy={...current,id:uid(),x:current.x+10,y:current.y+10};commit([...shapes,copy]);setSelected(copy.id)}}><Copy size={15}/>تكرار الشكل</Button><Button kind="danger" onClick={()=>{commit(shapes.filter(shape=>shape.id!==selected));setSelected('')}}><Trash2 size={15}/>حذف الشكل</Button></div></>}
    {invalid&&<p className="warning" role="alert">توجد دالة غير صالحة أو خارج مجال الرسم. جرّب x^2/3 أو sin(x).</p>}
    <div className="button-row"><Button kind="primary" disabled={!shapes.length||invalid} onClick={()=>save(shapes)}>إدراج الرسم</Button><Button disabled={!shapes.length||invalid} onClick={()=>download(new Blob([diagramSvg(shapes)],{type:'image/svg+xml'}),'رسم-رياضي.svg')}><Download size={16}/>تنزيل SVG</Button></div>
  </div>
}
