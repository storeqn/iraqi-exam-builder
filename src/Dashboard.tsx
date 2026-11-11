import { useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, ChevronDown, Copy, Eye, FileDown, FilePlus2, FileText, FolderOpen, GraduationCap, Layers3, MoreHorizontal, PenLine, Plus, Search, Share2, Sigma, Trash2 } from 'lucide-react'
import { examName, kindName, starterTemplates, type Exam } from './model'
import { Button, FilePicker, Footer } from './ui'
const date = new Intl.DateTimeFormat('ar-IQ',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Baghdad'})
const templateIcons={school:GraduationCap,layers:Layers3,math:Sigma}
export type ExamAction='edit'|'preview'|'export'|'share'|'duplicate'|'delete'
export function Dashboard({exams, mode, create, template, action, importExam}: {exams:Exam[];mode:'home'|'exams'|'templates';create:()=>void;template:(key:string)=>void;action:(exam:Exam,action:ExamAction)=>void;importExam:(file:File)=>void}) {
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState('')
  const [sort,setSort]=useState('new')
  const [open,setOpen]=useState('')
  const active=exams.filter(exam=>!exam.template)
  const savedTemplates=exams.filter(exam=>exam.template)
  const subjects=[...new Set(active.map(exam=>exam.info.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'))
  const filtered=useMemo(()=>exams.filter(exam=>exam.template===(mode==='templates')&&(!filter||exam.info.subject===filter)&&[examName(exam),exam.info.subject,exam.info.grade,exam.info.school,kindName(exam.info)].join(' ').toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>sort==='title'?examName(a).localeCompare(examName(b),'ar'):sort==='old'?a.modified.localeCompare(b.modified):b.modified.localeCompare(a.modified)),[exams,filter,mode,search,sort])
  const list=mode==='home'?filtered.slice(0,6):filtered
  return <>
    {mode==='home'&&<section className="hero">
      <div className="hero-copy"><span className="hero-kicker"><GraduationCap size={17}/> مساحة عمل المعلم</span><h1>ورقتك الامتحانية،<br/><em>بتنسيق يليق بصفّك.</em></h1><p>حرّر أسئلتك بالعربية، أضف المعادلات والرسوم، ثم اطبع ورقتك أو شاركها من جهازك.</p><Button kind="primary" onClick={create}><Plus size={21}/>إنشاء ورقة امتحانية جديدة</Button></div>
      <div className="hero-visual" aria-hidden="true"><div className="hero-halo"/><div className="hero-paper-back"/><div className="hero-paper"><div className="art-head"><GraduationCap size={29}/><div><b>أسئلة الامتحان</b><span>ورقة امتحانية</span></div></div><div className="art-rule"/><div className="art-question"><i>س1</i><span/><span/></div><div className="art-question"><i>س2</i><span/><span/></div><div className="art-question"><i>س3</i><span/><span/></div><div className="art-footer"/></div><div className="art-math" dir="ltr"><Sigma size={24}/><span>x² + y²</span></div><div className="art-pen"><PenLine size={24}/></div></div>
    </section>}
    {mode!=='home'&&<div className="page-heading"><div><h1>{mode==='exams'?'أوراقي المحفوظة':'قوالب الامتحانات'}</h1><p>{mode==='exams'?'ابحث في أوراقك، أو استورد مشروعًا محفوظًا.':'ابدأ بتنسيق مناسب لامتحانك أو استخدم أحد قوالبك المحفوظة.'}</p></div>{mode==='exams'&&<Button kind="primary" onClick={create}><Plus size={18}/>ورقة جديدة</Button>}</div>}
    {mode!=='templates'&&<section className="dashboard-section">
      <div className="section-heading"><div><h2>{mode==='home'?'الأوراق الأخيرة':'جميع الأوراق'}</h2><p>{active.length?active.length+' ورقة محفوظة على هذا الجهاز':'أوراقك المحفوظة تظهر هنا.'}</p></div>{mode==='home'?<a className="button secondary" href="#/exams">عرض الكل<ArrowLeft size={16}/></a>:<FilePicker label="استيراد مشروع" accept=".json,application/json" pick={importExam}/>}</div>
      {(mode==='exams'||active.length>0)&&<div className="filter-row">
        <label className="search-box"><Search size={18}/><input aria-label="ابحث عن ورقة" placeholder="ابحث بالعنوان، المادة أو المدرسة…" value={search} onChange={event=>setSearch(event.target.value)}/></label>
        <label className="select-box"><select aria-label="تصفية حسب المادة" value={filter} onChange={event=>setFilter(event.target.value)}><option value="">كل المواد</option>{subjects.map(subject=><option key={subject}>{subject}</option>)}</select><ChevronDown size={15}/></label>
        <label className="select-box"><select aria-label="ترتيب الأوراق" value={sort} onChange={event=>setSort(event.target.value)}><option value="new">آخر تعديل</option><option value="old">الأقدم تعديلًا</option><option value="title">حسب الاسم</option></select><ChevronDown size={15}/></label>
      </div>}
      {!list.length&&<div className="empty-state"><div className="empty-icon">{active.length?<Search size={26}/>:<FolderOpen size={27}/>}</div><strong>{active.length?'لم نجد أوراقًا مطابقة':'لا توجد أوراق امتحانية بعد'}</strong><p>{active.length?'جرّب البحث باسم مادة أخرى أو امسح التصفية.':'ابدأ بورقة فارغة أو اختر قالبًا من القوالب أدناه.'}</p>{!active.length&&<Button onClick={create}><FilePlus2 size={16}/>إنشاء أول ورقة</Button>}</div>}
    </section>}
    {!!list.length&&<div className="exam-cards">{list.map(exam=><article className="exam-card" key={exam.id}>
      <div className="exam-card-top"><span className="card-icon"><FileText size={22}/></span><span className="chip">{kindName(exam.info)||'ورقة امتحان'}</span><div className="card-menu"><Button kind="ghost" className="icon-button" aria-label={`خيارات ${examName(exam)}`} aria-expanded={open===exam.id} onClick={()=>setOpen(open===exam.id?'':exam.id)}><MoreHorizontal size={21}/></Button>
      {open===exam.id&&<div className="menu-list" onBlur={event=>{if(!event.currentTarget.parentElement?.contains(event.relatedTarget))setOpen('')}}>{([[Eye,'معاينة','preview'],[Copy,'تكرار','duplicate'],[FileDown,'تصدير','export'],[Share2,'مشاركة','share'],[Trash2,'حذف','delete']] as const).map(([Icon,label,key])=><Button kind={key==='delete'?'danger':'ghost'} key={key} onClick={()=>{setOpen('');action(exam,key)}}><Icon size={15}/>{label}</Button>)}</div>}</div></div>
      <h3>{examName(exam)}</h3><p>{[exam.info.subject,exam.info.grade,exam.info.school].filter(Boolean).join(' · ')||'بيانات الورقة غير مكتملة'}</p>
      <small>أُنشئت {date.format(new Date(exam.created))} · عُدلت {date.format(new Date(exam.modified))}</small>
      <div className="section-line"><Button onClick={()=>mode==='templates'?template(exam.id):action(exam,'edit')}><PenLine size={15}/>{mode==='templates'?'استخدام القالب':'تحرير الورقة'}</Button></div>
    </article>)}</div>}
    {mode!=='exams'&&<section className="dashboard-section templates-section">
      <div className="section-heading"><div><h2>{mode==='home'?'ابدأ من قالب':'القوالب الجاهزة'}</h2><p>اختر قالبًا وعدّل حقوله وتنسيقه حسب امتحانك.</p></div>{mode==='home'&&<a href="#/templates" className="button secondary">كل القوالب<ArrowLeft size={16}/></a>}</div>
      <div className="template-cards">{starterTemplates.map(item=>{const Icon=templateIcons[item.icon];return <button className={`template-card ${item.key}`} key={item.key} onClick={()=>template(item.key)}><span className="card-icon"><Icon size={22}/></span><span><strong>{item.name}</strong><small>{item.description}</small></span><ArrowLeft size={18} className="template-arrow"/></button>})}</div>
      {mode==='templates'&&!savedTemplates.length&&<div className="empty-inline"><BookOpen size={18}/> لحفظ قالب خاص، افتح ورقة امتحانية واختر «حفظ كقالب».</div>}
    </section>}
    <Footer/>
  </>
}
