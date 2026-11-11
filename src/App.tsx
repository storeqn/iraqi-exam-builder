import { lazy, Suspense, useEffect, useState } from 'react'
import { BookOpen, CircleHelp, FileText, FolderOpen, LayoutDashboard, Layers3, Menu, MonitorDown, Plus, Settings2, ShieldCheck, X } from 'lucide-react'
import { z } from 'zod'
import { Dashboard, type ExamAction } from './Dashboard'
import { copyExam, defaultSettings, examName, examSchema, fromTemplate, newExam, settingsSchema, uid, type Backup, type BankEntry, type Exam } from './model'
import { putBank, putExam, putProfile, putSettings, readAll, readJson, remove, restore } from './storage'
import { DesignerBar } from './DesignerBar'
import { Button, Footer, IconButton, Modal, PWAInstall, SplashScreen, brand, errorText, useInstall } from './ui'
const Bank=lazy(()=>import('./Bank').then(module=>({default:module.Bank})))
const ExamEditor=lazy(()=>import('./ExamEditor').then(module=>({default:module.ExamEditor})))
const Settings=lazy(()=>import('./Settings').then(module=>({default:module.Settings})))
const nav=[
  ['home','لوحة التحكم',LayoutDashboard],['exams','أوراقي المحفوظة',FolderOpen],['templates','قوالب الامتحانات',Layers3],['bank','بنك الأسئلة',BookOpen],
  ['settings','الإعدادات',Settings2],['about','المساعدة وعن التطبيق',CircleHelp],
] as const
const locationPath=()=>location.hash.replace(/^#\/?/,'').split('/').filter(Boolean)
const go=(path:string)=>{location.hash='#/'+path}
const empty:Backup={version:1,exams:[],bank:[],profiles:[],settings:defaultSettings}
function About({install}: {install:ReturnType<typeof useInstall>}) {
  return <>
    <div className="page-heading"><div><h1>المساعدة وعن التطبيق</h1><p>{brand}</p></div></div>
    <section className="panel help-panel"><h2>إنشاء ورقة امتحانية</h2><ol><li>أنشئ ورقة فارغة أو اختر قالبًا مناسبًا.</li><li>أدخل بيانات الامتحان، ثم أضف الأسئلة والدرجات والفروع.</li><li>من شريط تنسيق نص السؤال، أدرج جدولًا أو معادلة. استخدم «رسم هندسي» لإضافة الأشكال والمحاور.</li><li>راجع الصفحات واضبط الهوامش واتجاه الورقة قبل الطباعة أو التصدير.</li></ol><h2>حفظ الملفات ومشاركتها</h2><p>تبقى الأوراق في المتصفح على هذا الجهاز. احتفظ بنسخة JSON من الإعدادات. شارك ملف PDF أو Word من قائمة مشاركة الجهاز عند توفرها، أو نزّله وأرفقه يدويًا.</p></section>
    <section className="panel help-panel"><h2>تثبيت التطبيق</h2><PWAInstall install={install}/></section>
    <Footer/>
  </>
}
export default function App() {
  const [path,setPath]=useState(locationPath)
  const [data,setData]=useState<Backup>(empty)
  const [loaded,setLoaded]=useState(false)
  const [loadError,setLoadError]=useState('')
  const [toast,setToast]=useState<{text:string;time:number}>()
  const [drawer,setDrawer]=useState(false)
  const [installOpen,setInstallOpen]=useState(false)
  const [creating,setCreating]=useState(false)
  const install=useInstall()
  const [route='home',id,command]=path
  const current=data.exams.find(exam=>exam.id===id)
  const page=nav.find(([key])=>key===route)
  const editing=route==='edit'||route==='preview'
  const notify=(text:string)=>setToast({text,time:Date.now()})
  const report=(error:unknown)=>notify(errorText(error))
  useEffect(()=>{
    const changed=()=>{setPath(locationPath());setDrawer(false);window.scrollTo({top:0,behavior:'instant'})}
    window.addEventListener('hashchange',changed)
    return ()=>window.removeEventListener('hashchange',changed)
  },[])
  async function load() {
    try {setData(await readAll());setLoaded(true);setLoadError('')}
    catch(error){setLoadError('تعذّر فتح التخزين المحلي. '+errorText(error))}
  }
  useEffect(()=>{void load()},[])
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(undefined),6500);return()=>window.clearTimeout(timer)},[toast])
  useEffect(()=>{document.documentElement.dataset.theme=data.settings.theme},[data.settings.theme])
  async function save(exam:Exam) {
    await putExam(exam)
    setData(old=>({...old,exams:[...old.exams.filter(item=>item.id!==exam.id),exam]}))
  }
  async function saveBank(entries:BankEntry[]) {
    const unique=[...new Map(entries.map(item=>[item.id,item])).values()]
    await putBank(unique)
    const ids=new Set(unique.map(entry=>entry.id))
    setData(old=>({...old,bank:[...old.bank.filter(entry=>!ids.has(entry.id)),...unique]}))
  }
  async function add(exam:Exam) {
    if(creating)return
    setCreating(true)
    try{await save(exam);go('edit/'+exam.id)}
    catch(error){report(error)}
    finally{setCreating(false)}
  }
  function create(){if(loaded)void add(newExam(data.settings))}
  function template(key:string) {
    const stored=data.exams.find(exam=>exam.id===key&&exam.template)
    if(loaded)void add(stored?copyExam(stored):fromTemplate(key,data.settings))
  }
  function action(exam:Exam,type:ExamAction) {
    if(type==='delete'){
      if(confirm(`حذف «${examName(exam)}»؟`))void remove('exams',exam.id).then(()=>{setData(old=>({...old,exams:old.exams.filter(item=>item.id!==exam.id)}));notify('تم حذف الورقة.')}).catch(report)
    } else if(type==='duplicate') {
      const copy=copyExam(exam,exam.template)
      void save(copy).then(()=>notify('تم تكرار الورقة.')).catch(report)
    } else go((type==='edit'?'edit':'preview')+'/'+exam.id+(type==='export'||type==='share'?'/'+type:''))
  }
  async function importExam(file:File) {
    const payload=z.object({version:z.literal(1),exam:examSchema}).parse(await readJson(file))
    const now=new Date().toISOString()
    const exam={...payload.exam,id:uid(),modified:now,template:false}
    await save(exam)
    go('edit/'+exam.id)
    notify('تم استيراد الورقة.')
  }
  return <div className="app-shell">
    <a href="#main-content" className="skip-link" onClick={event=>{event.preventDefault();document.getElementById('main-content')?.focus()}}>انتقل إلى المحتوى</a>
    <SplashScreen/>
    {drawer&&<button className="drawer-overlay" aria-label="إغلاق القائمة" onClick={()=>setDrawer(false)}/>}
    <aside className={`sidebar ${drawer?'shown':''}`}>
      <a href="#/" className="brand"><img src="/logo.svg" width="46" height="46" alt=""/><span><strong>أسئلتي<span className="brand-dot">.</span></strong><small>{brand}</small></span></a>
      <div className="side-main"><span className="side-label">مساحة العمل</span><nav aria-label="مساحة العمل">
        {nav.slice(0,4).map(([key,label,Icon])=><a key={key} href={key==='home'?'#/':'#/'+key} aria-current={route===key||editing&&key==='exams'?'page':undefined}><Icon size={19}/><span>{label}</span></a>)}
      </nav><span className="side-label secondary-label">التطبيق</span><nav aria-label="التطبيق">
        {nav.slice(4).map(([key,label,Icon])=><a key={key} href={'#/'+key} aria-current={route===key?'page':undefined}><Icon size={19}/><span>{label}</span></a>)}
      </nav></div>
      <div className="side-install"><div><MonitorDown size={20}/><strong>أسئلتي على جهازك</strong></div><p>افتح محرر أوراقك من الشاشة الرئيسية.</p><Button onClick={()=>setInstallOpen(true)}>تثبيت التطبيق</Button></div>
      <span className="side-credit" dir="ltr">ENG BAHAA</span>
    </aside>
    <div className="workspace">
      <DesignerBar/>
      <header className="topbar"><div className="top-context"><IconButton label={drawer?'إغلاق القائمة':'فتح القائمة'} className="mobile-menu" onClick={()=>setDrawer(!drawer)}>{drawer?<X size={22}/>:<Menu size={22}/>}</IconButton><span className="context-icon">{editing?<FileText size={18}/>:page?(()=>{const Icon=page[2];return <Icon size={18}/>})():<LayoutDashboard size={18}/>}</span><strong>{editing?'محرر الامتحان':page?.[1]??'أسئلتي'}</strong></div><div className="top-actions"><span className="local-chip"><ShieldCheck size={16}/> حفظ على جهازك</span>{!editing&&<Button kind="primary" disabled={!loaded||creating} onClick={create}><Plus size={17}/>ورقة جديدة</Button>}</div></header>
      <main id="main-content" tabIndex={-1} className={editing?'main editor-main':'main'}>
        {!loaded&&(loadError?<section className="panel" role="alert"><p>{loadError}</p><Button onClick={()=>void load()}>إعادة المحاولة</Button></section>:<p className="loading" role="status">جارٍ تحميل أوراقك…</p>)}
        {loaded&&(route==='home'||route==='exams'||route==='templates')&&<Dashboard key={route} exams={data.exams} mode={route} create={create} template={template} action={action} importExam={file=>void importExam(file).catch(report)}/>}
        <Suspense fallback={<p className="loading" role="status">جارٍ تحميل أدوات العمل…</p>}>
        {loaded&&route==='bank'&&<Bank entries={data.bank} save={saveBank} remove={async id=>{await remove('bank',id);setData(old=>({...old,bank:old.bank.filter(entry=>entry.id!==id)}))}} notify={notify}/>}
        {loaded&&route==='settings'&&<Settings data={data} save={async input=>{const settings=settingsSchema.parse(input);await putSettings(settings);setData(old=>({...old,settings}))}} restore={async value=>{await restore(value);await load()}} remove={async id=>{await remove('profiles',id);setData(old=>({...old,profiles:old.profiles.filter(item=>item.id!==id)}))}} install={install} notify={notify}/>}
        {loaded&&route==='about'&&<About install={install}/>}
        {loaded&&editing&&(current?<ExamEditor key={path.join('/')} initial={current} data={data} view={route==='preview'} initialDialog={command==='export'||command==='share'?command:null} save={save} saveBank={saveBank} saveProfile={async profile=>{await putProfile(profile);setData(old=>({...old,profiles:[...old.profiles,profile]}))}} notify={notify}/>:<section className="panel"><h1>الورقة غير موجودة على هذا الجهاز</h1><a className="button secondary" href="#/exams">الأوراق المحفوظة</a></section>)}
        </Suspense>
        {loaded&&!editing&&!page&&<section className="panel"><h1>الصفحة غير موجودة</h1><a className="button secondary" href="#/">لوحة التحكم</a></section>}
      </main>
    </div>
    {installOpen&&<Modal title="تثبيت أسئلتي" close={()=>setInstallOpen(false)}><PWAInstall install={install}/></Modal>}
    {toast&&<div className="toast" role="status">{toast.text}<IconButton label="إغلاق الإشعار" onClick={()=>setToast(undefined)}><X size={16}/></IconButton></div>}
  </div>
}
