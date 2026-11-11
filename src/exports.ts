import { getFontEmbedCSS, toCanvas } from 'html-to-image'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import { dimensions, examName, type Exam } from './model'
import { download } from './storage'

export type Format = 'pdf'|'docx'|'png'|'jpeg'
export function baseName(exam:Exam) {return examName(exam).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').slice(0,95)}
const typeOf={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',png:'image/png',jpeg:'image/jpeg'}
export async function settle(node:HTMLElement) {
  await document.fonts.ready
  await Promise.all(Array.from(node.querySelectorAll('img')).map(img=>img.decode()))
}
export function canvasBlob(canvas:HTMLCanvasElement,mime:string,quality?:number) {
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('تعذّر إنشاء الصورة على هذا الجهاز.')),mime,quality))
}
export async function capture(node:HTMLElement,pixelRatio:number,fontEmbedCSS?:string) {
  await settle(node)
  const width=node.offsetWidth,height=node.offsetHeight
  try {
    const canvas=await toCanvas(node,{
      width,height,canvasWidth:width,canvasHeight:height,pixelRatio,backgroundColor:'#fff',preferredFontFormat:'woff2',
      fontEmbedCSS, style:{margin:'0',boxShadow:'none',visibility:'visible',position:'static',transform:'none'},
    })
    const context=canvas.getContext('2d')!
    const pixels=context.getImageData(0,0,canvas.width,canvas.height).data
    const hasInk=pixels.some((value,index)=>index%4!==3&&value<240&&pixels[index-index%4+3]>0)
    if(hasInk||!node.textContent?.trim())return canvas
    canvas.width=0
  } catch (error) {
    if(error instanceof RangeError)throw error
  }
  const {default:html2canvas}=await import('html2canvas')
  return html2canvas(node,{
    scale:pixelRatio,backgroundColor:'#fff',logging:false,
    onclone:(_,element)=>{
      element.style.visibility='visible'
      element.style.transform='none'
      element.style.boxShadow='none'
      element.style.margin='0'
      const print=element.closest<HTMLElement>('.print-root')
      if(print){
        print.style.position='absolute'
        print.style.inset='0 auto auto 0'
        print.style.zIndex='auto'
      }
    },
  })
}
export async function makeFile(root:HTMLElement,exam:Exam,format:Format,page:number|null):Promise<File> {
  const sheets=Array.from(root.querySelectorAll<HTMLElement>('[data-sheet]'))
  if(!sheets.length)throw new Error('انتظر حتى تكتمل معاينة الورقة.')
  const name=baseName(exam)
  if(format==='docx') {
    const {makeWord}=await import('./word')
    return new File([await makeWord(sheets,exam)],name+'.docx',{type:typeOf.docx})
  }
  const fontCSS=await getFontEmbedCSS(sheets[0],{preferredFontFormat:'woff2'})
  if(format==='pdf') {
    const size=exam.paper.orientation
    const pdf=new jsPDF({orientation:size,unit:'mm',format:'a4',compress:true})
    const width=size==='portrait'?210:297, height=size==='portrait'?297:210
    pdf.setProperties({title:examName(exam),subject:exam.info.subject,author:exam.info.teacher})
    for(const [index,sheet] of sheets.entries()){
      if(index)pdf.addPage('a4',size)
      const canvas=await capture(sheet,2.5,fontCSS)
      pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,width,height,undefined,'FAST')
      canvas.width=0
    }
    return new File([pdf.output('blob')],name+'.pdf',{type:typeOf.pdf})
  }
  const chosen=page===null?sheets:[sheets[page-1]]
  if(chosen.some(sheet=>!sheet))throw new Error('رقم الصفحة خارج النطاق.')
  const extension=format==='jpeg'?'jpg':'png'
  const image=async (sheet:HTMLElement)=>{
    const canvas=await capture(sheet,2.5,fontCSS)
    const blob=await canvasBlob(canvas,typeOf[format],.95)
    canvas.width=0
    return blob
  }
  if(chosen.length===1) return new File([await image(chosen[0])],`${name}-${page??1}.${extension}`,{type:typeOf[format]})
  const zip=new JSZip()
  for(const [index,sheet] of chosen.entries())zip.file(`page-${String(index+1).padStart(3,'0')}.${extension}`,await image(sheet))
  return new File([await zip.generateAsync({type:'blob'})],name+'-الصفحات.zip',{type:'application/zip'})
}
export async function shareFile(file:File) {
  if(navigator.canShare?.({files:[file]}) && navigator.share) {
    try {await navigator.share({files:[file],title:file.name});return 'shared'}
    catch(error) {if(error instanceof DOMException && error.name==='AbortError')return 'cancelled'}
  }
  download(file,file.name)
  return 'downloaded'
}
export async function printExam(root:HTMLElement) {
  await settle(root)
  window.print()
}
export function pageDescription(exam:Exam) {
  const size=dimensions(exam.paper)
  return `A4 · ${size.width>size.height?'أفقي':'عمودي'}`
}
