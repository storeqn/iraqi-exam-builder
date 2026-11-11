import { useEffect, useState } from 'react'
import { BookOpen, Download, HardDrive, MonitorDown, Settings2 } from 'lucide-react'
import { ExamForm, PaperControls } from './ExamForm'
import { type Backup, type Profile, type Settings as SettingsData } from './model'
import { readJson, saveJson } from './storage'
import { Button, FilePicker, Footer, PWAInstall, Select, Toggle, brand, errorText, type useInstall } from './ui'

export function Settings({data, save, restore, remove, install, notify}: {data:Backup;save:(settings:SettingsData)=>Promise<void>;restore:(input:unknown)=>Promise<void>;remove:(id:string)=>Promise<void>;install:ReturnType<typeof useInstall>;notify:(message:string)=>void}) {
  const [value,setValue]=useState(data.settings)
  const [saving,setSaving]=useState(false)
  useEffect(()=>setValue(data.settings),[data.settings])
  const set=<K extends keyof SettingsData>(key:K,next:SettingsData[K])=>setValue(old=>({...old,[key]:next}))
  function run(action:Promise<void>) {void action.catch(error=>notify(errorText(error)))}
  return <>
    <div className="page-heading"><div><h1>الإعدادات</h1><p>اضبط تفضيلات التطبيق وإعدادات الأوراق الجديدة.</p></div><Button kind="primary" disabled={saving} onClick={()=>{setSaving(true);run(save(value).then(()=>notify('تم حفظ الإعدادات.')).finally(()=>setSaving(false)))}}>حفظ الإعدادات</Button></div>
    <div className="settings-stack">
      <section className="panel"><h2><Settings2 size={19}/>المظهر والحفظ</h2><div className="form-grid"><Select label="المظهر" value={value.theme} options={[[ 'light','فاتح'],['dark','داكن']]} change={next=>set('theme',next as SettingsData['theme'])}/><label className="field">لغة الواجهة<input value="العربية" readOnly/></label><Select label="صيغة التصدير الافتراضية" value={value.exportFormat} options={[[ 'pdf','PDF'],['docx','Word'],['png','PNG'],['jpeg','JPEG']]} change={next=>set('exportFormat',next as SettingsData['exportFormat'])}/><Toggle label="حفظ تلقائي للأوراق" checked={value.autosave} change={next=>set('autosave',next)}/></div></section>
      <details className="panel"><summary>بيانات المدرسة والمدرس ورأس الورقة</summary><ExamForm compact info={value.info} change={next=>set('info',next)} notify={notify}/></details>
      <details className="panel"><summary>تنسيق الورقة الافتراضي</summary><PaperControls paper={value.paper} change={next=>set('paper',next)}/></details>
      <section className="panel"><h2><BookOpen size={19}/>الملفات الشخصية المحفوظة</h2>{!data.profiles.length&&<p className="muted">يمكنك حفظ ملف للمدرس أو المدرسة من محرر الورقة.</p>}{data.profiles.map((profile:Profile)=><div className="section-line profile-line" key={profile.id}><span>{profile.name} · {profile.kind==='school'?'مدرسة':'مدرس'}</span><Button kind="danger" onClick={()=>{if(confirm('حذف هذا الملف الشخصي؟'))run(remove(profile.id))}}>حذف</Button></div>)}</section>
      <section className="panel"><h2><HardDrive size={19}/>النسخ الاحتياطي والاستعادة</h2><p>تُحفظ الملفات في هذا المتصفح. تُضيف الاستعادة العناصر الجديدة وتحدّث العناصر المطابقة في النسخة الاحتياطية.</p><div className="button-row"><Button onClick={()=>saveJson(data,'أسئلتي-نسخة-احتياطية.json')}><Download size={16}/>تنزيل نسخة احتياطية</Button><FilePicker label="استعادة نسخة احتياطية" accept=".json,application/json" pick={file=>{if(confirm('استعادة النسخة وتحديث العناصر المطابقة والإعدادات؟'))run(readJson(file).then(restore).then(()=>notify('تمت استعادة النسخة الاحتياطية.')))}}/></div></section>
      <section className="panel"><h2><MonitorDown size={19}/>تثبيت التطبيق</h2><PWAInstall install={install}/></section>
      <section className="panel"><h2>عن {brand}</h2><p>أداة محلية لإعداد أوراق الامتحانات العراقية وتنسيقها وتصديرها.</p><Footer compact/></section>
    </div>
  </>
}
