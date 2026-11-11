import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, CircleAlert, Eye, FileDown, FilePlus2, PenLine, Plus, Printer, Save, Share2, SlidersHorizontal } from 'lucide-react'
import { Bank, BankForm, newBank } from './Bank'
import { ExamForm, PaperControls } from './ExamForm'
import { ExportPanel } from './ExportPanel'
import { QuestionEditor } from './QuestionEditor'
import { PaperPreview } from './paper'
import { copyExam, examName, examSchema, move, newQuestion, sumMarks, uid, type Backup, type BankEntry, type Exam, type Profile, type Question } from './model'
import { saveJson } from './storage'
import { Button, Field, Modal, Select, errorText } from './ui'
type Dialog = 'export'|'share'|'bank'|'bank-save'|'profile'|null

export function ExamEditor({initial,data,view,initialDialog,save,saveBank,saveProfile,notify}: {
  initial:Exam;data:Backup;view:boolean;initialDialog:Dialog;save:(exam:Exam)=>Promise<void>;saveBank:(entries:BankEntry[])=>Promise<void>;saveProfile:(profile:Profile)=>Promise<void>;notify:(message:string)=>void
}) {
  const [exam,setExam]=useState(initial)
  const [status,setStatus]=useState<'saved'|'saving'|'error'|'dirty'>('saved')
  const [tab,setTab]=useState(view?'preview':'edit')
  const [section,setSection]=useState('info')
  const [dialog,setDialog]=useState<Dialog>(initialDialog)
  const [selected,setSelected]=useState<Question>()
  const [profileKind,setProfileKind]=useState<Profile['kind']>('school')
  const [profileName,setProfileName]=useState('')
  const [ready,setReady]=useState(false)
  const printRef=useRef<HTMLDivElement>(null)
  const latest=useRef(initial)
  const committed=useRef(initial)
  const queue=useRef<Promise<void>>(Promise.resolve())
  const saveRef=useRef(save)
  const mounted=useRef(true)
  saveRef.current=save
  const readyCallback=useCallback((value:boolean)=>setReady(value),[])
  const persist=useCallback((snapshot:Exam)=>{
    if(snapshot===committed.current)return Promise.resolve()
    if(mounted.current)setStatus('saving')
    const operation=queue.current.catch(()=>{}).then(async()=>{
      if(snapshot===committed.current)return
      await saveRef.current(examSchema.parse(snapshot))
      committed.current=snapshot
    })
    queue.current=operation
    return operation.then(()=>{
      if(mounted.current&&latest.current===snapshot)setStatus('saved')
    }).catch(error=>{
      if(mounted.current&&latest.current===snapshot)setStatus('error')
      throw error
    })
  },[])
  useEffect(()=>{
    mounted.current=true
    function onHide() {if(data.settings.autosave && latest.current!==committed.current) void persist(latest.current).catch(()=>{})}
    function visibility() {if(document.visibilityState==='hidden')onHide()}
    function unload(event:BeforeUnloadEvent) {if(latest.current!==committed.current){event.preventDefault();event.returnValue=''}}
    function guard(event:MouseEvent) {
      if(data.settings.autosave||latest.current===committed.current||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return
      const anchor=(event.target as Element|null)?.closest('a[href^="#/"]')
      if(anchor && !confirm('مغادرة الورقة دون حفظ التعديلات؟'))event.preventDefault()
    }
    document.addEventListener('click',guard,true)
    document.addEventListener('visibilitychange',visibility)
    window.addEventListener('beforeunload',unload)
    return ()=>{mounted.current=false;document.removeEventListener('click',guard,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('beforeunload',unload);onHide()}
  },[data.settings.autosave,persist])
  useEffect(()=>{
    if(!data.settings.autosave||exam===initial)return
    const timeout=window.setTimeout(()=>void persist(exam).catch(()=>{}),600)
    return ()=>window.clearTimeout(timeout)
  },[exam,initial,data.settings.autosave,persist])
  function update(change:(exam:Exam)=>Exam) {
    const next={...change(latest.current),modified:new Date().toISOString()}
    latest.current=next;setExam(next);setStatus(data.settings.autosave?'saving':'dirty')
  }
  function updateQuestion(id:string,change:Partial<Question>|Question) {update(old=>({...old,questions:old.questions.map(question=>question.id===id?{...question,...change}:question)}))}
  function addQuestion() {
    setSection('questions')
    update(old=>({...old,questions:[...old.questions,newQuestion(old.info.subject.includes('رياض')?'رياضيات':'إجابة قصيرة')]}))
  }
  function applyProfile(id:string) {
    const profile=data.profiles.find(item=>item.id===id)
    if(!profile)return
    update(old=>({...old,info:{...old.info,...(profile.kind==='school'?{school:profile.school,directorate:profile.directorate,logo:profile.logo}:{teacher:profile.teacher})}}))
  }
  function fail(error:unknown) {notify(errorText(error))}
  function print() {if(printRef.current)void import('./exports').then(module=>module.printExam(printRef.current!)).catch(fail)}
  const marks=sumMarks(exam)
  return <>
    <div className="editor-heading"><div><a className="back-link" href="#/exams"><ArrowRight size={16}/>الأوراق المحفوظة</a><h1>{examName(exam)}</h1></div><div className="editor-top-actions">
      {!view&&<span className={`save-status ${status}`} role="status">{status==='saved'?<Check size={15}/>:status==='error'?<CircleAlert size={15}/>:null}{status==='saved'?'تم الحفظ':status==='saving'?'جارٍ الحفظ':status==='error'?'تعذر الحفظ':'تعديلات غير محفوظة'}</span>}
      {!view&&<Button onClick={()=>void persist(latest.current).catch(fail)}><Save size={16}/>حفظ</Button>}
      {view&&<a className="button secondary" href={`#/edit/${exam.id}`}><PenLine size={16}/>تحرير</a>}
      <Button disabled={!ready} onClick={print}><Printer size={16}/>طباعة</Button>
      <Button disabled={!ready} onClick={()=>setDialog('share')}><Share2 size={16}/>مشاركة</Button>
      <Button kind="primary" disabled={!ready} onClick={()=>setDialog('export')}><FileDown size={17}/>تصدير</Button>
    </div></div>
    {!view&&<div className="mobile-editor-tabs" role="group" aria-label="عرض المحرر"><Button kind={tab==='edit'?'primary':'secondary'} onClick={()=>setTab('edit')}><PenLine size={16}/>تحرير</Button><Button kind={tab==='preview'?'primary':'secondary'} onClick={()=>setTab('preview')}><Eye size={16}/>معاينة</Button></div>}
    <div className={`editor-grid mode-${tab} ${view?'read-only':''}`}>
      {!view&&<section className="editor-panel">
        <div className="editor-sections" role="group" aria-label="أقسام التحرير">
          {([[ 'info','بيانات الامتحان',FilePlus2],['questions','الأسئلة',BookOpen],['paper','تنسيق الورقة',SlidersHorizontal]] as const).map(([key,label,Icon])=><button key={key} className={section===key?'selected':''} aria-pressed={section===key} onClick={()=>setSection(key)}><Icon size={16}/>{label}</button>)}
        </div>
        <div className="editor-body">
          {section==='info'&&<>
            <Field label="عنوان الورقة في لوحة التحكم" maxLength={350} placeholder="مثال: رياضيات السادس · نصف السنة" value={exam.title} onChange={event=>update(old=>({...old,title:event.target.value}))}/>
            <ExamForm info={exam.info} change={info=>update(old=>({...old,info}))} notify={notify}/>
            <div className="button-row">
              {!!data.profiles.length&&<Select label="استخدام ملف محفوظ" value="" options={[[ '', 'اختر ملفًا'],...data.profiles.map(item=>[item.id,item.name] as const)]} change={applyProfile}/>}
              <Button onClick={()=>{setProfileName(exam.info.school||exam.info.teacher);setDialog('profile')}}>حفظ بيانات المدرسة أو المدرس</Button>
              <Button onClick={()=>void Promise.resolve().then(()=>save(examSchema.parse(copyExam(exam,true)))).then(()=>notify('تم حفظ القالب.')).catch(fail)}>حفظ كقالب</Button>
              <Button onClick={()=>saveJson({version:1,exam},'مشروع-امتحان.json')}>تنزيل المشروع JSON</Button>
            </div>
          </>}
          {section==='paper'&&<PaperControls paper={exam.paper} change={paper=>update(old=>({...old,paper}))}/>}
          {section==='questions'&&<>
            <div className="section-line marks-line"><strong>{exam.questions.length} سؤال</strong><span>مجموع الدرجات <bdi>{marks}</bdi>{exam.info.total!==null&&<> / <bdi>{exam.info.total}</bdi></>}</span></div>
            {exam.info.total!==null&&marks!==exam.info.total&&<p className="warning" role="status"><CircleAlert size={17}/> مجموع درجات الأسئلة يختلف عن الدرجة الكلية.</p>}
            <div className="button-row"><Button kind="primary" disabled={exam.questions.length>=250} onClick={addQuestion}><Plus size={18}/>إضافة سؤال</Button><Button onClick={()=>setDialog('bank')}><BookOpen size={17}/>إدراج من البنك</Button></div>
            {!exam.questions.length&&<div className="empty-inline">أضف سؤالًا لبدء بناء ورقتك.</div>}
            <div className="questions-stack">{exam.questions.map((question,index)=><QuestionEditor key={question.id} question={question} index={index} count={exam.questions.length} change={next=>updateQuestion(question.id,next)} notify={notify}
              reorder={(from,to)=>update(old=>({...old,questions:move(old.questions,from,to)}))}
              remove={()=>{if(confirm('حذف هذا السؤال من الورقة؟'))update(old=>({...old,questions:old.questions.filter(item=>item.id!==question.id)}))}}
              duplicate={exam.questions.length<250?()=>update(old=>({...old,questions:[...old.questions.slice(0,index+1),{...structuredClone(question),id:uid()},...old.questions.slice(index+1)]})):undefined}
              bank={()=>{setSelected(question);setDialog('bank-save')}}/>)}</div>
          </>}
        </div>
      </section>}
      <div className="preview-column"><PaperPreview exam={exam} printRef={printRef} ready={readyCallback}/></div>
    </div>
    {(dialog==='export'||dialog==='share')&&<Modal title={dialog==='share'?'مشاركة الورقة':'تصدير الورقة الامتحانية'} close={()=>setDialog(null)}><ExportPanel exam={exam} paper={printRef} ready={ready} preferred={data.settings.exportFormat} sharing={dialog==='share'} notify={notify}/></Modal>}
    {dialog==='bank'&&<Modal wide title="اختيار أسئلة من البنك" close={()=>setDialog(null)}><Bank entries={data.bank} save={saveBank} remove={async()=>{}} notify={notify} insert={entries=>{
      if(exam.questions.length+entries.length>250){notify('الحد الأقصى 250 سؤالًا لكل ورقة.');return}
      update(old=>({...old,questions:[...old.questions,...entries.map(({question})=>({...structuredClone(question),id:uid()}))]}));setDialog(null)
    }}/></Modal>}
    {dialog==='bank-save'&&selected&&<Modal title="إضافة إلى بنك الأسئلة" close={()=>setDialog(null)}><BankForm initial={newBank(exam.info.subject,exam.info.grade,selected)} save={async entry=>{await saveBank([entry]);setDialog(null);notify('تم حفظ السؤال في البنك.')}} notify={notify} metadataOnly/></Modal>}
    {dialog==='profile'&&<Modal title="حفظ ملف شخصي" close={()=>setDialog(null)}><div className="form-grid"><Select label="نوع الملف" value={profileKind} options={[[ 'school','مدرسة'],['teacher','مدرس']]} change={value=>{setProfileKind(value as Profile['kind']);setProfileName(value==='school'?exam.info.school:exam.info.teacher)}}/><Field label="اسم الملف الشخصي" maxLength={350} value={profileName} onChange={event=>setProfileName(event.target.value)}/></div><div className="button-row"><Button kind="primary" disabled={!profileName.trim()} onClick={()=>void saveProfile({id:uid(),name:profileName.trim(),kind:profileKind,school:exam.info.school,teacher:exam.info.teacher,directorate:exam.info.directorate,logo:exam.info.logo}).then(()=>{setDialog(null);notify('تم حفظ الملف الشخصي.')}).catch(fail)}>حفظ الملف</Button></div></Modal>}
  </>
}
