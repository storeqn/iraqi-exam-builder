import { lazy, Suspense, useState } from 'react'
import { ArrowDown, ArrowUp, Bold, BookmarkPlus, ChevronDown, Copy, GripVertical, MoreHorizontal, Plus, Shapes, Trash2 } from 'lucide-react'
import { RichEditor } from './RichEditor'
import { diagramSvg } from './diagram'
import { blankPaper, questionFontSizes, types, uid, type Diagram, type Question, type Typography } from './model'
import { readImage } from './storage'
import { Button, Field, FilePicker, IconButton, Modal, Select, errorText } from './ui'
const GeometryEditor=lazy(()=>import('./GeometryEditor'))
function TextFormat({label, value, change, defaultSize}: {label:string;value?:Typography;change:(value:Typography)=>void;defaultSize:number}) {
  return <div className="text-format" role="group" aria-label={label}>
    <Select label={`حجم خط ${label}`} value={String(value?.size??'')} options={[[ '', `افتراضي (${defaultSize})`],...questionFontSizes.map(size=>String(size))]}
      change={size=>change({...value,size:size?Number(size) as Typography['size']:undefined})}/>
    <Button className="font-weight-button" kind={value?.bold?'primary':'secondary'} aria-pressed={value?.bold??false}
      aria-label={`خط عريض: ${label}`} onClick={()=>change({...value,bold:!value?.bold})}><Bold size={16}/>خط عريض</Button>
  </div>
}
const editorTextStyle=(value:Typography|undefined, defaultSize:number)=>({fontSize:value?.size??defaultSize,fontWeight:value?.bold?700:undefined})

export function QuestionEditor({question, index, count, change, remove, duplicate, reorder, bank, notify, initiallyOpen=true, inputId, paperSize=blankPaper.size}: {
  question:Question;index:number;count:number;change:(question:Question)=>void;remove?:()=>void;duplicate?:()=>void;
  reorder?:(from:number,to:number)=>void;bank?:()=>void;notify:(message:string)=>void;initiallyOpen?:boolean;inputId?:string;paperSize?:number
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
      <Button kind="ghost" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><span className="question-index">{index+1}</span><span>السؤال {index+1}</span><ChevronDown size={15}/></Button>
      {(reorder||bank||duplicate||remove)&&<details className="question-actions">
        <summary><MoreHorizontal size={18}/> إجراءات</summary>
        <div className="question-action-list">
          {reorder&&<><Button disabled={index===0} onClick={()=>reorder(index,index-1)}><ArrowUp size={16}/>نقل لأعلى</Button><Button disabled={index===count-1} onClick={()=>reorder(index,index+1)}><ArrowDown size={16}/>نقل لأسفل</Button></>}
          {bank&&<Button onClick={bank}><BookmarkPlus size={17}/>حفظ في بنك الأسئلة</Button>}
          {duplicate&&<Button onClick={duplicate}><Copy size={16}/>تكرار السؤال</Button>}
          {remove&&<Button kind="danger" onClick={remove}><Trash2 size={16}/>حذف السؤال</Button>}
        </div>
      </details>}
    </div>
    {expanded&&<div className="question-body">
      <RichEditor inputId={inputId} label="نص السؤال" textStyle={editorTextStyle(question.typography,paperSize)} placeholder="اكتب السؤال هنا… مثال: عرّف الكسور المتكافئة." value={question.content} change={value=>update('content',value)}/>
      <TextFormat label="السؤال" value={question.typography} change={value=>update('typography',value)} defaultSize={paperSize}/>
      <div className="form-grid">
        <Field label="درجة السؤال" type="number" min="0" max="10000" step="0.001" value={question.marks} onChange={event=>update('marks',Math.max(0,Math.min(10000,+event.target.value)))}/>
        <Select label="نوع السؤال" value={question.type} options={types} change={value=>update('type',value as Question['type'])}/>
      </div>
      {options&&<div className="options question-option-settings">
        <strong>{paired?'نص العمودين':'خيارات الإجابة'}</strong>
        <TextFormat label="الخيارات" value={question.optionsTypography} change={value=>update('optionsTypography',value)} defaultSize={paperSize}/>
        {question.options.map((option,i)=><div className="option-row" key={option.id}><Field label={paired?`العمود الأول ${i+1}`:`الخيار ${i+1}`} style={editorTextStyle(question.optionsTypography,paperSize)} maxLength={350} value={option.left} onChange={event=>update('options',question.options.map(item=>item.id===option.id?{...item,left:event.target.value}:item))}/>
          {paired&&<Field label={`العمود الثاني ${i+1}`} style={editorTextStyle(question.optionsTypography,paperSize)} maxLength={350} value={option.right} onChange={event=>update('options',question.options.map(item=>item.id===option.id?{...item,right:event.target.value}:item))}/>}
          <IconButton label="إزالة الخيار" onClick={()=>update('options',question.options.filter(item=>item.id!==option.id))}><Trash2 size={16}/></IconButton></div>)}
        <Button disabled={question.options.length>=80} onClick={()=>update('options',[...question.options,{id:uid(),left:'',right:''}])}><Plus size={16}/>{paired?'إضافة صف':'إضافة خيار'}</Button>
        {question.type==='صح أو خطأ'&&!question.options.length&&<Button onClick={()=>update('options',['صح','خطأ'].map(left=>({id:uid(),left,right:''})))}>إضافة صح وخطأ</Button>}
      </div>}
      {question.parts.map((part,i)=><div className="subquestion" key={part.id}>
        <div className="section-line"><strong>الفرع {i+1}</strong><IconButton label="حذف الفرع" onClick={()=>{if(confirm('حذف هذا الفرع؟'))update('parts',question.parts.filter(item=>item.id!==part.id))}}><Trash2 size={16}/></IconButton></div>
        <RichEditor label={`نص الفرع ${i+1}`} placeholder="اكتب نص الفرع هنا…" value={part.content} textStyle={editorTextStyle(part.typography,paperSize)}
          change={content=>update('parts',question.parts.map(item=>item.id===part.id?{...item,content}:item))}/>
        <TextFormat label={`الفرع ${i+1}`} value={part.typography} defaultSize={paperSize}
          change={typography=>update('parts',question.parts.map(item=>item.id===part.id?{...item,typography}:item))}/>
      </div>)}
      <div className="button-row question-extras">
        <Button disabled={question.parts.length>=100} onClick={()=>update('parts',[...question.parts,{id:uid(),content:''}])}><Plus size={16}/>إضافة فرع للسؤال</Button>
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
