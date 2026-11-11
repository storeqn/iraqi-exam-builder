import { Button, Field, FilePicker, Select, Toggle, errorText } from './ui'
import { defaultPrintTitle, examTypes, type Info, type Paper } from './model'
import { readImage } from './storage'
const fields = [
  ['subject','المادة'],['grade','الصف'],['school','اسم المدرسة'],
  ['country','الدولة'],['ministry','الوزارة'],['directorate','مديرية التربية'],['teacher','اسم المدرس'],
  ['classroom','الشعبة'],['year','السنة الدراسية'],['date','التاريخ'],['duration','الزمن'],['round','الدور'],
  ['invocation','عبارة البسملة'],['heading','عنوان رأس الورقة'],['administration','الإدارة المدرسية'],['signature','خانة التوقيع'],['closing','العبارة الختامية'],
] as const
export function ExamForm({info, change, notify, compact=false}: {info:Info;change:(info:Info)=>void;notify:(message:string)=>void;compact?:boolean}) {
  const update=<K extends keyof Info>(key:K,value:Info[K])=>change({...info,[key]:value})
  const primary=['subject','grade','school']
  const compactKeys=['country','ministry','directorate','school','teacher','invocation','heading']
  const examples:Partial<Record<keyof Info,string>>={subject:'مثال: الرياضيات',grade:'مثال: السادس الابتدائي',school:'مثال: مدرسة القرنة'}
  function renderField([key,label]:typeof fields[number]) {
    return <Field key={key} label={key==='heading'&&!compact?'بادئة العنوان التلقائي':label} placeholder={examples[key]} type={key==='date'?'date':'text'} maxLength={350}
      value={info[key]} onChange={event=>update(key,event.target.value)}/>
  }
  const schoolLogo=<div className="button-row">
    <FilePicker label={info.logo?'تغيير شعار المدرسة':'إضافة شعار المدرسة'} accept="image/png,image/jpeg,image/webp" pick={file=>void readImage(file).then(value=>update('logo',value)).catch(error=>notify(errorText(error)))}/>
    {info.logo&&<><img className="logo-preview" alt="شعار المدرسة" src={info.logo}/><Button kind="danger" onClick={()=>update('logo','')}>حذف الشعار</Button></>}
  </div>
  if(compact)return <><div className="form-grid">{fields.filter(([key])=>compactKeys.includes(key)).map(renderField)}</div>{schoolLogo}</>
  return <>
    <div className="form-grid">
      <div className="field-wide">
        <Field label="عنوان الورقة المطبوع" aria-describedby="print-title-help" maxLength={350} placeholder={defaultPrintTitle(info)||'مثال: أسئلة امتحان نصف السنة'}
          value={info.printedTitle??''} onChange={event=>update('printedTitle',event.target.value)}/>
        <small id="print-title-help" className="field-hint">اتركه فارغًا لاستخدام العنوان التلقائي.</small>
      </div>
      {fields.filter(([key])=>primary.includes(key)).map(renderField)}
      <Select label="نوع الامتحان" value={info.kind} options={examTypes} change={value=>update('kind',value as Info['kind'])}/>
      {info.kind==='مخصص'&&<Field label="اسم نوع الامتحان" placeholder="مثال: امتحان الفصل الثالث" maxLength={350} value={info.customKind} onChange={event=>update('customKind',event.target.value)}/>}
    </div>
    <details className="editor-details">
      <summary>تفاصيل إضافية <span>التاريخ، الدرجات، التعليمات</span></summary>
      <div className="details-content">
        <div className="form-grid">
          <Field label="الدرجة الكلية" type="number" min="0" max="10000" step="0.001" value={info.total??''} onChange={event=>update('total',event.target.value===''?null:Math.max(0,Math.min(10000,+event.target.value)))}/>
          {fields.filter(([key])=>!primary.includes(key)).map(renderField)}
        </div>
        {schoolLogo}
        {([['instructions','تعليمات الامتحان','مثال: أجب عن جميع الأسئلة'],['notes','ملاحظات أسفل الورقة','اكتب ملاحظة إذا احتجت إليها']] as const).map(([key,label,placeholder])=><label className="field" key={key}>{label}<textarea rows={2} maxLength={4000} placeholder={placeholder} value={info[key]} onChange={event=>update(key,event.target.value)}/></label>)}
      </div>
    </details>
  </>
}
export function PaperControls({paper, change}: {paper:Paper;change:(paper:Paper)=>void}) {
  const update=<K extends keyof Paper>(key:K,value:Paper[K])=>change({...paper,[key]:value})
  return <>
    <div className="form-grid">
      <Select label="اتجاه الورقة" value={paper.orientation} options={[[ 'portrait','عمودي'],['landscape','أفقي']]} change={value=>update('orientation',value as Paper['orientation'])}/>
      <Select label="خط الورقة" value={paper.font} options={[[ 'Amiri','أميري'],['Cairo','القاهرة']]} change={value=>update('font',value as Paper['font'])}/>
      <Field label="الهوامش (مم)" type="number" min="8" max="28" value={paper.margin} onChange={event=>update('margin',Math.max(8,Math.min(28,+event.target.value)))}/>
      <Field label="حجم خط الأسئلة الافتراضي" type="number" min="12" max="30" value={paper.size} onChange={event=>update('size',Math.max(12,Math.min(30,+event.target.value)))}/>
      <Field label="تباعد السطور" type="number" min="1.15" max="2.2" step="0.05" value={paper.spacing} onChange={event=>update('spacing',Math.max(1.15,Math.min(2.2,+event.target.value)))}/>
      <Select label="ترقيم الأسئلة" value={paper.numbering} options={[[ 'arabic','س1، س2'],['numeric','1، 2']]} change={value=>update('numbering',value as Paper['numbering'])}/>
      <Select label="ترقيم الفروع" value={paper.parts} options={[[ 'letters','أ، ب، ج'],['numbers','1، 2، 3']]} change={value=>update('parts',value as Paper['parts'])}/>
      <Select label="ترتيب رأس الورقة" value={paper.headerOrder} options={[[ 'standard','المدرسة على اليمين'],['reversed','المدرسة على اليسار']]} change={value=>update('headerOrder',value as Paper['headerOrder'])}/>
      <Select label="ترتيب التذييل" value={paper.footerOrder} options={[[ 'standard','المدرس على اليمين'],['reversed','المدرس على اليسار']]} change={value=>update('footerOrder',value as Paper['footerOrder'])}/>
    </div>
    <div className="toggle-grid">
      {([['border','إطار الورقة'],['instructions','إظهار التعليمات'],['ministry','إظهار الدولة والوزارة والمديرية'],['repeat','تكرار الرأس في كل صفحة'],['credit','إظهار اعتماد المصمم على الورقة']] as const).map(([key,label])=><Toggle key={key} label={label} checked={paper[key]} change={value=>update(key,value)}/>)}
    </div>
  </>
}
