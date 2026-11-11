import { useState } from 'react'
import { BookOpen, Copy, Plus, Search, Trash2 } from 'lucide-react'
import { bankSchema, difficulties, newQuestion, types, uid, type BankEntry } from './model'
import { QuestionEditor } from './QuestionEditor'
import { readJson, saveJson } from './storage'
import { Button, Field, FilePicker, Modal, Select, errorText } from './ui'
import { z } from 'zod'

export function newBank(subject='',grade='',question=newQuestion()):BankEntry {
  return {id:uid(),subject,grade,chapter:'',difficulty:'متوسط',question:structuredClone(question)}
}
export function BankForm({initial,save,notify,metadataOnly=false}: {initial:BankEntry;save:(entry:BankEntry)=>Promise<void>;notify:(message:string)=>void;metadataOnly?:boolean}) {
  const [entry,setEntry]=useState(initial)
  const [saving,setSaving]=useState(false)
  const set=(key:'subject'|'grade'|'chapter',value:string)=>setEntry(old=>({...old,[key]:value}))
  return <>
    <div className="form-grid">
      <Field label="المادة" maxLength={350} value={entry.subject} onChange={event=>set('subject',event.target.value)}/>
      <Field label="الصف" maxLength={350} value={entry.grade} onChange={event=>set('grade',event.target.value)}/>
      <Field label="الفصل أو الوحدة" maxLength={350} value={entry.chapter} onChange={event=>set('chapter',event.target.value)}/>
      <Select label="الصعوبة" value={entry.difficulty} options={difficulties} change={value=>setEntry(old=>({...old,difficulty:value as BankEntry['difficulty']}))}/>
    </div>
    {!metadataOnly&&<QuestionEditor question={entry.question} index={0} count={1} change={question=>setEntry(old=>({...old,question}))} notify={notify}/>}
    <div className="button-row"><Button kind="primary" disabled={saving} onClick={()=>{setSaving(true);void Promise.resolve().then(()=>save(bankSchema.parse(entry))).catch(error=>notify(errorText(error))).finally(()=>setSaving(false))}}>حفظ السؤال</Button></div>
  </>
}
function plain(html:string) {const template=document.createElement('template');template.innerHTML=html;return template.content.textContent??''}
export function Bank({entries, save, remove, notify, insert}: {entries:BankEntry[];save:(entries:BankEntry[])=>Promise<void>;remove:(id:string)=>Promise<void>;notify:(message:string)=>void;insert?:(entries:BankEntry[])=>void}) {
  const [query,setQuery]=useState('')
  const [type,setType]=useState('')
  const [difficulty,setDifficulty]=useState('')
  const [editing,setEditing]=useState<BankEntry>()
  const [selected,setSelected]=useState<string[]>([])
  const list=entries.filter(entry=>(!type||entry.question.type===type)&&(!difficulty||entry.difficulty===difficulty)&&[entry.subject,entry.grade,entry.chapter,plain(entry.question.content)].join(' ').toLowerCase().includes(query.toLowerCase().trim()))
  const mutate=(operation:Promise<void>)=>void operation.catch(error=>notify(errorText(error)))
  return <>
    {!insert&&<><div className="page-heading"><div><h1>بنك الأسئلة</h1><p>احتفظ بأسئلتك حسب المادة والصف والفصل وأعد استخدامها في أوراقك.</p></div><Button kind="primary" onClick={()=>setEditing(newBank())}><Plus size={18}/>سؤال جديد</Button></div>
      <div className="button-row"><FilePicker label="استيراد بنك الأسئلة" accept=".json,application/json" pick={file=>mutate(readJson(file).then(value=>save(z.object({version:z.literal(1),bank:z.array(bankSchema).max(4000)}).parse(value).bank)))}/><Button onClick={()=>saveJson({version:1,bank:entries},'بنك-الأسئلة.json')}>تصدير بنك الأسئلة</Button></div></>}
    <div className="filter-row">
      <label className="search-box"><Search size={18}/><input aria-label="بحث في الأسئلة" placeholder="ابحث في النص أو المادة أو الصف…" value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <Select label="النوع" value={type} options={[[ '', 'كل الأنواع'],...types]} change={setType}/>
      <Select label="الصعوبة" value={difficulty} options={[[ '', 'كل المستويات'],...difficulties]} change={setDifficulty}/>
    </div>
    {!list.length&&<div className="empty-state"><span className="empty-icon"><BookOpen size={24}/></span><strong>{entries.length?'لا توجد نتائج مطابقة':'بنك الأسئلة فارغ'}</strong></div>}
    <div className="bank-list">{list.map(entry=><article key={entry.id} className="bank-item">
      {insert&&<input type="checkbox" aria-label={`اختيار ${plain(entry.question.content).slice(0,45)||entry.question.type}`} checked={selected.includes(entry.id)} onChange={event=>setSelected(event.target.checked?[...selected,entry.id]:selected.filter(id=>id!==entry.id))}/>}
      <div><strong>{plain(entry.question.content).slice(0,120)||entry.question.type}</strong><p>{[entry.subject,entry.grade,entry.chapter,entry.question.type,entry.difficulty].filter(Boolean).join(' · ')}</p></div>
      {!insert&&<div className="button-row"><Button onClick={()=>setEditing(entry)}>تحرير</Button><Button onClick={()=>mutate(save([{...structuredClone(entry),id:uid()}]))}><Copy size={15}/>تكرار</Button><Button kind="danger" onClick={()=>{if(confirm('حذف السؤال من البنك؟'))mutate(remove(entry.id))}}><Trash2 size={15}/>حذف</Button></div>}
    </article>)}</div>
    {insert&&<div className="button-row"><Button kind="primary" disabled={!selected.length} onClick={()=>insert(entries.filter(entry=>selected.includes(entry.id)))}>إدراج الأسئلة المحددة ({selected.length})</Button></div>}
    {editing&&<Modal wide title="سؤال في البنك" close={()=>setEditing(undefined)}><BankForm initial={editing} save={async entry=>{await save([entry]);setEditing(undefined)}} notify={notify}/></Modal>}
  </>
}
