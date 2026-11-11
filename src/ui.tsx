import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode, type InputHTMLAttributes } from 'react'
import { X, Upload } from 'lucide-react'

export const brand = 'منشئ الأسئلة الامتحانية العراقي'
export const errorText = (error: unknown) => error instanceof Error && error.name === 'QuotaExceededError' ? 'مساحة التخزين ممتلئة. احتفظ بنسخة احتياطية وحرّر مساحة.' : error instanceof Error && error.name === 'ZodError' ? 'الملف أو الحقول لا تطابق صيغة التطبيق. تحقق من البيانات وحاول مجددًا.' : error instanceof Error ? error.message : 'تعذّر إكمال العملية.'
export function Button({ className = '', kind = 'secondary', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {kind?: 'primary'|'secondary'|'ghost'|'danger'}) {
  return <button type={type} className={`button ${kind} ${className}`} {...props}/>
}
export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {label: string}) {
  return <Button kind="ghost" className={`icon-button ${className}`} title={label} aria-label={label} {...props}>{children}</Button>
}
export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & {label: string}) {
  return <label className="field"><span>{label}</span><input {...props}/></label>
}
export function Select({ label, value, options, change }: {label: string; value: string; options: readonly (string | readonly [string,string])[]; change: (value: string)=>void}) {
  return <label className="field"><span>{label}</span><select aria-label={label} value={value} onChange={event=>change(event.target.value)}>{options.map(option=>typeof option==='string' ? <option key={option}>{option}</option> : <option key={option[0]} value={option[0]}>{option[1]}</option>)}</select></label>
}
export function Toggle({label, checked, change}: {label:string; checked:boolean; change:(value:boolean)=>void}) {
  return <label className="toggle"><input type="checkbox" checked={checked} onChange={event=>change(event.target.checked)}/>{label}</label>
}
export function FilePicker({label, accept, pick, disabled}: {label:string;accept:string;pick:(file:File)=>void;disabled?:boolean}) {
  const ref = useRef<HTMLInputElement>(null)
  return <><Button disabled={disabled} onClick={()=>ref.current?.click()}><Upload size={16}/>{label}</Button><input hidden ref={ref} type="file" accept={accept} onChange={event=>{const file=event.target.files?.[0]; event.target.value=''; if(file) pick(file)}}/></>
}
export function Modal({title, children, close, wide=false}: {title:string;children:ReactNode;close:()=>void;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null)
  const id=useId()
  useEffect(()=>{
    const dialog=ref.current!
    dialog.showModal()
    return ()=>dialog.close()
  },[])
  return <dialog ref={ref} className={wide?'modal wide':'modal'} aria-labelledby={id} onCancel={event=>{event.preventDefault();close()}}><div className="modal-header"><h2 id={id}>{title}</h2><IconButton label="إغلاق" onClick={close}><X size={19}/></IconButton></div><div className="modal-body">{children}</div></dialog>
}
export function Footer({compact=false}: {compact?:boolean}) {
  return <footer className={`site-footer ${compact?'compact':''}`}>
    <div className="footer-credit"><img src="/logo.svg" alt="" width="34" height="34"/><div><strong>إنشاء وتصميم <bdi>ENG BAHAA</bdi></strong><small>جميع حقوق التصميم محفوظة © <bdi>ENG BAHAA</bdi></small></div></div>
  </footer>
}
export function SplashScreen() {
  const [Visible, setVisible] = useSplash()
  return Visible ? <div className={`splash ${Visible===2?'leaving':''}`} aria-hidden="true" onClick={()=>setVisible(0)}><img src="/logo.svg" alt=""/><div>إنشاء وتصميم</div><strong dir="ltr">ENG BAHAA</strong><p>{brand}</p></div> : null
}
import { useState } from 'react'
function useSplash() {
  const [visible,setVisible]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1)
  useEffect(()=>{
    if (!visible || visible===2) return
    const fade=window.setTimeout(()=>setVisible(2),480)
    return ()=>window.clearTimeout(fade)
  },[visible])
  useEffect(()=>{
    if(visible!==2)return
    const end=window.setTimeout(()=>setVisible(0),180)
    return ()=>window.clearTimeout(end)
  },[visible])
  return [visible,setVisible] as const
}
interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{outcome:string}> }
export function useInstall() {
  const [event,setEvent]=useState<InstallEvent>()
  const [installed,setInstalled]=useState(()=>matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?:boolean}).standalone===true)
  useEffect(()=>{
    const capture=(incoming:Event)=>{incoming.preventDefault();setEvent(incoming as InstallEvent)}
    const done=()=>{setInstalled(true);setEvent(undefined)}
    window.addEventListener('beforeinstallprompt',capture)
    window.addEventListener('appinstalled',done)
    return ()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',done)}
  },[])
  return { available:!!event, installed, prompt: async()=>{ if(!event)return; await event.prompt();await event.userChoice;setEvent(undefined) } }
}
export function PWAInstall({install}: {install:ReturnType<typeof useInstall>}) {
  return <section className="install-guide">
    <img src="/logo.svg" alt="" width="66" height="66"/><h3>{brand}</h3>
    {install.installed ? <p>أنت تستخدم التطبيق في وضع مستقل.</p> : <>
      {install.available && <Button kind="primary" onClick={()=>void install.prompt()}>تثبيت أسئلتي</Button>}
      <p><strong>على iPhone وiPad:</strong> في Safari، افتح قائمة <strong>مشاركة ← إضافة إلى الشاشة الرئيسية</strong>.</p>
      <p><strong>على Android أو الكمبيوتر:</strong> افتح قائمة المتصفح وابحث عن «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» إذا كان الخيار متاحًا.</p>
      <p>بعد تحميل التطبيق أول مرة، يمكن فتح أدواته الأساسية دون اتصال. احفظ نسخًا احتياطية من أوراقك من الإعدادات.</p>
    </>}
  </section>
}
