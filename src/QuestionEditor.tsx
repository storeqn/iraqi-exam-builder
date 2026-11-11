import { lazy, Suspense, useState } from 'react'
import { ArrowDown, ArrowUp, BookmarkPlus, ChevronDown, Copy, GripVertical, ImagePlus, Plus, Shapes, Trash2 } from 'lucide-react'
import { RichEditor } from './RichEditor'
import { diagramSvg } from './diagram'
import { types, uid, type Diagram, type Question } from './model'
import { readImage } from './storage'
import { Button, Field, FilePicker, IconButton, Modal, Select, errorText } from './ui'
const GeometryEditor=lazy(()=>import('./GeometryEditor'))
export function QuestionEditor({question, index, count, change, remove, duplicate, reorder, bank, notify, initiallyOpen=true}: {
  question:Question;index:number;count:number;change:(question:Question)=>void;remove?:()=>void;duplicate?:()=>void;
  reorder?:(from:number,to:number)=>void;bank?:()=>void;notify:(message:string)=>void;initiallyOpen?:boolean
}) {
  const [expanded,setExpanded]=useState(initiallyOpen)
  const [drawing,setDrawing]=useState<number|null>(null)
  const [over,setOver]=useState(false)
  const options=question.type==='اختيار من متعدد'||question.type==='صِل بين العمودين'||question.type==='صح أو خطأ'||question.type==='قارن'
  const paired=question.type==='صِل بين العمودين'||question.type==='قارن'
  const update=<K extends keyof Question>(key:K,value:Question[K])=>change({...question,[key]:value})
  function saveDiagram(diagram:Diagram) {
    if(drawing===null)return
    const next=[...question.diagrams];next[drawing]=diagram;update('diagrams',next);setDrawing(null)
  }
  return <article className={`question-card ${over?'drag-over':''}`} onDragOver={event=>{if(reorder&&event.dataTransfer.types.includes('application/x-exam-question')){event.preventDefault();setOver(true)}}} onDragLeave={()=>setOver(false)} onDrop={event=>{const position=event.dataTransfer.getData('application/x-exam-question');if(reorder&&position!==''){event.preventDefault();reorder(Number(position),index)}setOver(false)}}>
    <div className="question-head">
      {reorder&&<span className="drag-handle" draggable title="اسحب لتغيير الترتيب" onDragStart={event=>{event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-exam-question',String(index))}}><GripVertical size={18}/></span>}
      <Button kind="ghost" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><span className="question-index">س{index+1}</span><span>{question.type}</span><ChevronDown size={15}/></Button>
      <div className="question-actions">
        {reorder&&<><IconButton label="نقل لأعلى" disabled={index===0} onClick={()=>reorder(index,index-1)}><ArrowUp size={16}/></IconButton><IconButton label="نقل لأسفل" disabled={index===count-1} onClick={()=>reorder(index,index+1)}><ArrowDown size={16}/></IconButton></>}
        {bank&&<IconButton label="حفظ في بنك الأسئلة" onClick={bank}><BookmarkPlus size={17}/></IconButton>}
        {duplicate&&<IconButton label="تكرار السؤال" onClick={duplicate}><Copy size={16}/></IconButton>}
        {remove&&<IconButton label="حذف السؤال" onClick={remove}><Trash2 size={16}/></IconButton>}
      </div>
    </div>
    {expanded&&<div className="question-body">
      <div className="form-grid"><Select label="نوع السؤال" value={question.type} options={types} change={value=>update('type',value as Question['type'])}/><Field label="درجة السؤال" type="number" min="0" max="10000" step="0.001" value={question.marks} onChange={event=>update('marks',Math.max(0,Math.min(10000,+event.target.value)))}/></div>
      <RichEditor label="نص السؤال" value={question.content} change={value=>update('content',value)}/>
      {options&&<div className="options">
        {question.options.map((option,i)=><div className="option-row" key={option.id}><Field label={paired?`العمود الأول ${i+1}`:`الخيار ${i+1}`} maxLength={350} value={option.left} onChange={event=>update('options',question.options.map(item=>item.id===option.id?{...item,left:event.target.value}:item))}/>
          {paired&&<Field label={`العمود الثاني ${i+1}`} maxLength={350} value={option.right} onChange={event=>update('options',question.options.map(item=>item.id===option.id?{...item,right:event.target.value}:item))}/>}
          <IconButton label="إزالة الخيار" onClick={()=>update('options',question.options.filter(item=>item.id!==option.id))}><Trash2 size={16}/></IconButton></div>)}
        <Button disabled={question.options.length>=80} onClick={()=>update('options',[...question.options,{id:uid(),left:'',right:''}])}><Plus size={16}/>{paired?'إضافة صف':'إضافة خيار'}</Button>
        {question.type==='صح أو خطأ'&&!question.options.length&&<Button onClick={()=>update('options',['صح','خطأ'].map(left=>({id:uid(),left,right:''})))}>إضافة صح وخطأ</Button>}
      </div>}
      {question.parts.map((part,i)=><div className="subquestion" key={part.id}><div className="section-line"><strong>الفرع {i+1}</strong><IconButton label="حذف الفرع" onClick={()=>{if(confirm('حذف هذا الفرع؟'))update('parts',question.parts.filter(item=>item.id!==part.id))}}><Trash2 size={16}/></IconButton></div><RichEditor label={`نص الفرع ${i+1}`} value={part.content} change={value=>update('parts',question.parts.map(item=>item.id===part.id?{...item,content:value}:item))}/></div>)}
      <div className="button-row">
        <Button disabled={question.parts.length>=100} onClick={()=>update('parts',[...question.parts,{id:uid(),content:''}])}><Plus size={16}/>إضافة فرع</Button>
        <FilePicker label="إضافة صورة" accept="image/png,image/jpeg,image/webp" disabled={question.images.length>=12} pick={file=>void readImage(file).then(image=>update('images',[...question.images,image])).catch(error=>notify(errorText(error)))}/>
        <Button disabled={question.diagrams.length>=12} onClick={()=>setDrawing(question.diagrams.length)}><Shapes size={16}/>رسم هندسي</Button>
      </div>
      {(!!question.images.length||!!question.diagrams.length)&&<div className="attachments">
        {question.images.map((image,i)=><div key={i}><img src={image} alt={`صورة السؤال ${i+1}`}/><Button kind="danger" onClick={()=>update('images',question.images.filter((_,j)=>i!==j))}><Trash2 size={15}/>إزالة</Button></div>)}
        {question.diagrams.map((diagram,i)=><div key={i}><img src={`data:image/svg+xml,${encodeURIComponent(diagramSvg(diagram))}`} alt={`الرسم الهندسي ${i+1}`}/><div className="button-row"><Button onClick={()=>setDrawing(i)}>تحرير الرسم</Button><Button kind="danger" onClick={()=>update('diagrams',question.diagrams.filter((_,j)=>i!==j))}><Trash2 size={15}/>إزالة</Button></div></div>)}
      </div>}
    </div>}
    {drawing!==null&&<Modal wide title="محرر الأشكال الهندسية" close={()=>setDrawing(null)}><Suspense fallback={<p>جارٍ تحميل أدوات الرسم…</p>}><GeometryEditor initial={question.diagrams[drawing]??[]} save={saveDiagram}/></Suspense></Modal>}
  </article>
}
