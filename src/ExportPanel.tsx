import { useEffect, useState } from 'react'
import { Download, FileDown, MessageCircle, Printer, Share2 } from 'lucide-react'
import type { Exam } from './model'
import { download } from './storage'
import { Button, Field, Select, errorText } from './ui'
import type { Format } from './exports'

export function ExportPanel({exam, paper, ready, preferred, sharing, notify}: {
  exam:Exam;paper:React.RefObject<HTMLDivElement|null>;ready:boolean;preferred:Format;sharing:boolean;notify:(message:string)=>void
}) {
  const [format,setFormat]=useState<Format>(preferred)
  const [scope,setScope]=useState('all')
  const [page,setPage]=useState(1)
  const [busy,setBusy]=useState(false)
  const [file,setFile]=useState<File>()
  const [feedback,setFeedback]=useState('')
  useEffect(()=>{setFile(undefined);setFeedback('')},[format,scope,page,exam])
  const count=paper.current?.querySelectorAll('[data-sheet]').length??0
  const image=format==='png'||format==='jpeg'
  async function create(send:boolean) {
    if(!paper.current||busy)return
    setBusy(true);setFeedback('')
    try {
      const {makeFile}=await import('./exports')
      const output=await makeFile(paper.current,exam,format,image&&scope==='single'?page:null)
      if(send)setFile(output)
      else download(output,output.name)
    } catch(error){setFeedback(errorText(error))} finally{setBusy(false)}
  }
  const send=async()=>{
    if(!file)return
    const {shareFile}=await import('./exports')
    try {const outcome=await shareFile(file);if(outcome==='downloaded')setFeedback('تم تنزيل الملف. يمكنك إرفاقه يدويًا في واتساب أو تطبيق المشاركة.')}
    catch(error){setFeedback(errorText(error))}
  }
  return <div className="export-panel">
    <div className="form-grid">
      <Select label="نوع الملف" value={format} options={[[ 'pdf','PDF'],['docx','Word · DOCX'],['png','صورة PNG'],['jpeg','صورة JPEG']]} change={value=>setFormat(value as Format)}/>
      {image&&<Select label="نطاق التصدير" value={scope} options={[[ 'all','كل الصفحات'],['single','صفحة واحدة']]} change={setScope}/>}
      {image&&scope==='single'&&<Field label="رقم الصفحة" type="number" min="1" max={count} value={page} onChange={event=>setPage(+event.target.value)}/>}
    </div>
    {format==='pdf'&&<p className="muted">ملف A4 عالي الدقة يحافظ على شكل النص العربي والمعادلات كما تظهر في المعاينة. النص داخل PDF غير قابل للتحديد.</p>}
    {format==='docx'&&<p className="muted">النص والجداول والمعادلات المتوافقة قابلة للتحرير. تُضمّن الأشكال والمعادلات التي تحتاج تنسيقًا خاصًا كصور، وقد يعيد Word توزيع الصفحات.</p>}
    {image&&<p className="muted">تُنزل الصفحات المتعددة داخل ملف ZIP يضم صورة مستقلة لكل صفحة.</p>}
    {busy&&<p role="status">جارٍ إعداد الملف…</p>}
    {feedback&&<p className="warning" role="status">{feedback}</p>}
    <div className="button-row">
      <Button kind="primary" disabled={!ready||busy||(image&&scope==='single'&&(page<1||page>count||!Number.isInteger(page)))} onClick={()=>void create(sharing)}>
        {sharing?<Share2 size={17}/>:<FileDown size={17}/>}
        {sharing?'تجهيز ملف للمشاركة':'تنزيل الملف'}
      </Button>
      <Button disabled={!ready||busy} onClick={()=>{if(paper.current)void import('./exports').then(module=>module.printExam(paper.current!)).catch(error=>notify(errorText(error)))}}><Printer size={16}/>طباعة</Button>
    </div>
    {sharing&&file&&<div className="share-ready"><p>{file.name}</p><div className="button-row"><Button kind="primary" onClick={()=>void send()}><Share2 size={17}/>مشاركة الملف</Button><Button onClick={()=>download(file,file.name)}><Download size={16}/>تنزيل</Button></div></div>}
    {sharing&&<p className="muted"><MessageCircle size={16}/> اختر واتساب من قائمة مشاركة الجهاز إذا كان متاحًا، أو نزّل الملف وأرفقه داخل واتساب.</p>}
  </div>
}
