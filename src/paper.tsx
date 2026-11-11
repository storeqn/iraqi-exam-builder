import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Maximize, Minus, Plus } from 'lucide-react'
import { DiagramSvg } from './diagram'
import { dimensions, partNumber, printedExamTitle, questionNumber, type Exam, type Question, type Typography } from './model'
import { richHtml } from './rich'
import { IconButton } from './ui'

export interface PaperBlock { id:string; group:string; label?:string; marks?:number; rich?:string; labelKind?:'question'|'part'; node?:ReactNode; typography?:Typography }
type Pages = PaperBlock[][]
export const millimeters = (value:number) => value*96/25.4
export function paperStyle(exam:Exam): CSSProperties {
  const {width,height}=dimensions(exam.paper)
  return {width,height,padding:millimeters(exam.paper.margin),fontFamily:exam.paper.font,fontSize:exam.paper.size,lineHeight:exam.paper.spacing}
}
export function Header({exam}: {exam:Exam}) {
  const {info,paper}=exam
  const school=<div>{info.logo&&<img src={info.logo} alt="شعار المدرسة"/>}{paper.ministry&&<>{info.country&&<div>{info.country}</div>}{info.ministry&&<div>{info.ministry}</div>}{info.directorate&&<div>{info.directorate}</div>}</>}{info.school&&<div>{info.school}</div>}</div>
  const details=<div>{([[ 'الصف',info.grade],['الشعبة',info.classroom],['المادة',info.subject],['التاريخ',info.date],['الزمن',info.duration],['الدرجة',info.total===null?'':String(info.total)]] as const).map(([label,value])=>value&&<div key={label}>{label} / <bdi>{value}</bdi></div>)}</div>
  const reversed=paper.headerOrder==='reversed'
  const title=printedExamTitle(info)
  if(!info.logo&&!info.school&&!(paper.ministry&&(info.country||info.ministry||info.directorate))&&!(info.invocation||title||info.year||info.round||info.grade||info.classroom||info.subject||info.date||info.duration||info.total!==null))return null
  return <header className="sheet-header">
    {reversed?details:school}
    <div className="sheet-center">{info.invocation&&<div>{info.invocation}</div>}{title&&<strong>{title}</strong>}{info.year&&<div>السنة الدراسية <bdi>{info.year}</bdi></div>}{info.round&&<div>{info.round}</div>}</div>
    {reversed?school:details}
  </header>
}
export function SheetFooter({exam}: {exam:Exam}) {
  const {info,paper}=exam
  if(!(info.teacher||info.administration||info.signature||info.closing||paper.credit))return null
  const teacher=info.teacher&&<div>مدرس المادة / {info.teacher}</div>
  const admin=(info.administration||info.signature)&&<div>{info.administration&&<div>{info.administration}</div>}{info.signature&&<div>{info.signature}</div>}</div>
  return <footer className="sheet-footer">
    {info.closing&&<div className="sheet-closing">{info.closing}</div>}
    <div className="sheet-signatures">{paper.footerOrder==='reversed'?<>{admin}{teacher}</>:<>{teacher}{admin}</>}</div>
    {paper.credit&&<div className="sheet-credit">إنشاء وتصميم <bdi>ENG BAHAA</bdi></div>}
  </footer>
}
const optionTypes = new Set(['اختيار من متعدد','صِل بين العمودين','صح أو خطأ','قارن'])
export function pairedQuestion(question:Question) {return question.type==='صِل بين العمودين'||question.type==='قارن'}
export function blocksFor(exam:Exam):PaperBlock[] {
  const {info,paper}=exam
  const blocks:PaperBlock[]=[]
  if(paper.instructions&&info.instructions)blocks.push({id:'instructions',group:'instructions',label:'التعليمات',rich:richHtml(info.instructions.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'))})
  exam.questions.forEach((q,i)=>{
    const group=q.id
    const block=(id:string, properties:Omit<PaperBlock,'id'|'group'>)=>blocks.push({id:group+'-'+id,group,...properties})
    block('body',{label:questionNumber(i,paper.numbering),labelKind:'question',marks:q.marks,typography:q.typography,rich:richHtml(q.content)})
    if(optionTypes.has(q.type)&&q.options.length){
      if(pairedQuestion(q)) q.options.forEach((option,index)=>block('pair'+index,{typography:q.optionsTypography,node:<div className="sheet-pair"><div>{option.left}</div><div>{option.right}</div></div>}))
      else q.options.forEach((option,index)=>block('option'+index,{label:partNumber(index,paper.parts)+')',labelKind:'part',typography:q.optionsTypography,rich:richHtml(option.left.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'))}))
    }
    q.parts.forEach((part,index)=>block(part.id,{label:partNumber(index,paper.parts)+')',labelKind:'part',typography:part.typography,rich:richHtml(part.content)}))
    q.images.forEach((image,index)=>block('image'+index,{node:<img className="sheet-attachment" src={image} alt={`صورة السؤال ${i+1}`}/>}))
    q.diagrams.forEach((diagram,index)=>block('diagram'+index,{node:<div className="sheet-diagram"><DiagramSvg shapes={diagram}/></div>}))
  })
  if(info.notes)blocks.push({id:'notes',group:'notes',label:'ملاحظات',rich:richHtml(info.notes.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'))})
  return blocks
}
function Block({block}: {block:PaperBlock}) {
  return <div className={`sheet-block ${block.labelKind??''}`} style={{fontSize:block.typography?.size,fontWeight:block.typography?.bold?700:undefined}}>
    {block.label&&<div className="sheet-label"><strong>{block.label}</strong>{!!block.marks&&<small>{block.marks} درجة</small>}</div>}
    {block.rich!==undefined&&<div className="sheet-rich" dir="rtl" dangerouslySetInnerHTML={{__html:block.rich}}/>}
    {block.node}
  </div>
}
function Sheet({exam, blocks, number, total, measure=false}: {exam:Exam;blocks:PaperBlock[];number:number;total:number;measure?:boolean}) {
  return <article className={`paper-sheet ${exam.paper.border?'bordered':''}`} style={paperStyle(exam)} dir="rtl" data-sheet={measure?undefined:number}>
    {(number===1||exam.paper.repeat||measure)&&<div data-paper-header><Header exam={exam}/></div>}
    <div className="sheet-body">{blocks.map(block=><Block key={block.id} block={block}/>)}</div>
    {(number===total||measure)&&<div data-paper-footer><SheetFooter exam={exam}/></div>}
    <div className="sheet-page-number">{number} / {total}</div>
  </article>
}
type Anchor = {node:Node; offset:number}
function fragment(range:Range,source:HTMLElement,start:Anchor,end:Anchor) {
  range.setStart(start.node,start.offset);range.setEnd(end.node,end.offset)
  const wrapper=document.createElement('div')
  wrapper.append(range.cloneContents())
  let ancestor=range.commonAncestorContainer
  if(ancestor.nodeType===Node.TEXT_NODE)ancestor=ancestor.parentNode!
  while(ancestor!==source && ancestor instanceof Element) {
    const copy=ancestor.cloneNode(false)
    while(wrapper.firstChild)copy.appendChild(wrapper.firstChild)
    wrapper.append(copy)
    ancestor=ancestor.parentNode!
  }
  return wrapper.innerHTML
}
function divide(element:HTMLElement, limit:(first:boolean)=>number, measure:(html:string,first:boolean)=>number) {
  const source=element.cloneNode(true) as HTMLElement
  const anchors:Anchor[]=[{node:source,offset:0}]
  function visit(parent:Node) {
    for(const [index,node] of Array.from(parent.childNodes).entries()) {
      if(node.nodeType===Node.TEXT_NODE) {
        const value=node.textContent??''
        const words=Array.from(value.matchAll(/\S+\s*|\s+/gu))
        for(const word of words) {
          for(let offset=64;offset<word[0].length;offset+=64) anchors.push({node,offset:word.index+offset})
          anchors.push({node,offset:word.index+word[0].length})
        }
      } else if(node instanceof Element) {
        if(node.matches('[data-equation], br')) anchors.push({node:parent,offset:index+1})
        else { visit(node); if(node.matches('div,p,tr,li,table'))anchors.push({node:parent,offset:index+1}) }
      }
    }
  }
  visit(source)
  anchors.push({node:source,offset:source.childNodes.length})
  const range=document.createRange(), result:string[]=[]
  let start=0
  while(start<anchors.length-1) {
    let low=start+1, high=anchors.length-1, best=low
    const first=start===0, available=limit(first)
    while(low<=high) {
      const middle=(low+high)>>1
      const html=fragment(range,source,anchors[start],anchors[middle])
      if(measure(html,first)<=available){best=middle;low=middle+1}else high=middle-1
    }
    const html=fragment(range,source,anchors[start],anchors[best])
    if(html||first)result.push(html)
    start=best
  }
  return result
}
function paginate(source:HTMLElement, blocks:PaperBlock[], exam:Exam): Pages {
  const heights=Array.from(source.querySelector('.sheet-body')!.children) as HTMLElement[]
  const header=source.querySelector('[data-paper-header]')!.getBoundingClientRect().height
  const footer=source.querySelector('[data-paper-footer]')!.getBoundingClientRect().height
  const base=dimensions(exam.paper).height-2*millimeters(exam.paper.margin)-12
  const records=blocks.map((block,index)=>({block,element:heights[index],height:heights[index].offsetHeight+1}))
  const pages:Pages=[[]]
  let used=0
  const room=()=>base-((pages.length===1||exam.paper.repeat)?header:0)
  const next=()=>{pages.push([]);used=0}
  const append=(block:PaperBlock,height:number)=>{pages.at(-1)!.push(block);used+=height}
  for(let i=0;i<records.length;){
    let end=i+1
    while(end<records.length&&records[end].block.group===records[i].block.group)end++
    const group=records.slice(i,end)
    const height=group.reduce((sum,item)=>sum+item.height,0)
    if(height<=room() && used && used+height>room())next()
    for(const item of group){
      const body=item.element.querySelector<HTMLElement>('.sheet-rich')
      if(item.height<=room()||!body) {
        if(used && used+item.height>room())next()
        append(item.block,item.height)
        continue
      }
      if(used && room()-used<120)next()
      const probe=item.element.cloneNode(true) as HTMLElement
      probe.style.position='absolute';probe.style.visibility='hidden';probe.style.width=item.element.offsetWidth+'px'
      source.append(probe)
      const probeBody=probe.querySelector<HTMLElement>('.sheet-rich')!
      const label=probe.querySelector<HTMLElement>('.sheet-label')
      const measure=(html:string,first:boolean)=>{
        probeBody.innerHTML=html
        if(label)label.hidden=!first
        return probe.offsetHeight+1
      }
      const pieces=divide(body,first=>Math.max(75,(first?room()-used:base-(exam.paper.repeat?header:0))-3),measure)
      pieces.forEach((rich,index)=>{
        if(index)next()
        append({...item.block,id:item.block.id+'-'+index,rich,label:index?undefined:item.block.label,marks:index?undefined:item.block.marks},measure(rich,index===0))
      })
      probe.remove()
    }
    i=end
  }
  if(used&&used+footer>room())next()
  return pages
}
export function PaperPreview({exam, printRef, ready}: {exam:Exam;printRef:React.RefObject<HTMLDivElement|null>;ready:(value:boolean)=>void}) {
  const blocks=useMemo(()=>blocksFor(exam),[exam])
  const [pages,setPages]=useState<Pages>([])
  const [page,setPage]=useState(1)
  const [zoom,setZoom]=useState(1)
  const [width,setWidth]=useState(550)
  const measure=useRef<HTMLDivElement>(null)
  const viewer=useRef<HTMLDivElement>(null)
  const preview=useRef<HTMLDivElement>(null)
  const size=dimensions(exam.paper)
  useLayoutEffect(()=>{
    const element=viewer.current!
    const observer=new ResizeObserver(()=>setWidth(element.clientWidth))
    observer.observe(element)
    return ()=>observer.disconnect()
  },[])
  useLayoutEffect(()=>{
    const source=measure.current?.querySelector<HTMLElement>('.paper-sheet')
    if(!source)return
    ready(false)
    let active=true
    const body=source.querySelector('.sheet-body')!
    let frame=0
    const layout=()=>{
      if(!active)return
      setPages(paginate(source,blocks,exam))
      ready(true)
    }
    const queue=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(layout)}
    const observer=new ResizeObserver(queue)
    observer.observe(body)
    const images=Array.from(source.querySelectorAll('img'))
    void Promise.all([document.fonts.ready,...images.map(image=>image.decode().catch(()=>{}))]).then(queue)
    layout()
    return ()=>{active=false;observer.disconnect();cancelAnimationFrame(frame)}
  },[blocks,exam,ready])
  const current=Math.min(page,pages.length||1)
  const scale=Math.max(0.15,Math.min(1,(width-28)/size.width))*zoom
  return <section className="preview-panel">
    <div className="preview-toolbar">
      <strong>معاينة الورقة <small>A4</small></strong>
      <div className="preview-controls">
        <IconButton label="تصغير" onClick={()=>setZoom(value=>Math.max(.5,value-.15))}><Minus size={16}/></IconButton>
        <bdi>{Math.round(scale*100)}%</bdi>
        <IconButton label="تكبير" onClick={()=>setZoom(value=>Math.min(2,value+.15))}><Plus size={16}/></IconButton>
        <IconButton label="ملاءمة العرض" onClick={()=>setZoom(1)}><Maximize size={15}/></IconButton>
      </div>
    </div>
    <div className="preview-viewport" ref={viewer}><div className="preview-sized" ref={preview} style={{width:size.width*scale,height:size.height*scale}}><div className="preview-transform" style={{transform:`scale(${scale})`}}>
      <Sheet exam={exam} blocks={pages[current-1]??[]} number={current} total={pages.length||1}/>
    </div></div></div>
    <div className="page-nav"><IconButton label="الصفحة السابقة" disabled={current<=1} onClick={()=>setPage(current-1)}><ChevronRight size={17}/></IconButton><span>صفحة {current} من {pages.length||1}</span><IconButton label="الصفحة التالية" disabled={current>=pages.length} onClick={()=>setPage(current+1)}><ChevronLeft size={17}/></IconButton></div>
    <div ref={measure} className="paper-measure" aria-hidden="true"><Sheet exam={exam} blocks={blocks} number={1} total={1} measure/></div>
    <div ref={printRef} className="print-root" aria-hidden="true">
      <style>{`@page { size: A4 ${exam.paper.orientation}; margin: 0; } .print-root { --print-width: ${exam.paper.orientation==='portrait'?210:297}mm; --print-height: ${exam.paper.orientation==='portrait'?297:210}mm; }`}</style>
      {pages.map((content,index)=><Sheet key={index} exam={exam} blocks={content} number={index+1} total={pages.length}/>)}
    </div>
  </section>
}
