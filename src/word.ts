import { AlignmentType, BorderStyle, Document, Footer, ImageRun, Math as WordMath, Packer, PageNumber, PageOrientation, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType, type IRunOptions } from 'docx'
import { capture, canvasBlob } from './exports'
import type { Exam } from './model'
import { nativeEquation } from './wordMath'

type Run = TextRun|ImageRun|WordMath
type Block = Paragraph|Table
const arabic=/[\u0600-\u08ff]/
const border={style:BorderStyle.SINGLE,size:6,color:'2E3744'}
const noBorder={style:BorderStyle.NONE,size:0}
function paragraph(children:Run[], alignment:typeof AlignmentType[keyof typeof AlignmentType]=AlignmentType.RIGHT) {
  return new Paragraph({children,bidirectional:true,alignment,spacing:{after:70}})
}
function blockTypography(block:HTMLElement):IRunOptions {
  const size=Number.parseFloat(block.style.fontSize)
  const halfPoints=Number.isFinite(size)?Math.round(size*1.5):undefined
  const bold=block.style.fontWeight==='700'
  return {size:halfPoints,sizeComplexScript:halfPoints,bold:bold||undefined,boldComplexScript:bold||undefined}
}
function imageElement(src:string) {
  return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('تعذّر تضمين صورة في مستند Word.'));image.src=src})
}
async function pngFromImage(src:string) {
  const image=await imageElement(src)
  const scale=Math.min(1,1200/Math.max(image.naturalWidth,image.naturalHeight))
  const canvas=document.createElement('canvas')
  canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale)
  canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height)
  const blob=await canvasBlob(canvas,'image/png')
  return {bytes:new Uint8Array(await blob.arrayBuffer()),width:canvas.width,height:canvas.height}
}
async function asPicture(element:HTMLElement|SVGElement, limit:number, limitHeight=320):Promise<ImageRun> {
  let data:{bytes:Uint8Array;width:number;height:number}
  if(element instanceof HTMLImageElement)data=await pngFromImage(element.src)
  else if(element instanceof SVGElement) {
    const clone=element.cloneNode(true) as SVGElement
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg')
    data=await pngFromImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(clone.outerHTML))
  } else {
    const canvas=await capture(element,3)
    const blob=await canvasBlob(canvas,'image/png')
    data={bytes:new Uint8Array(await blob.arrayBuffer()),width:element.offsetWidth,height:element.offsetHeight}
  }
  const scale=Math.min(1,limit/data.width,limitHeight/data.height)
  return new ImageRun({type:'png',data:data.bytes,transformation:{width:Math.max(1,Math.round(data.width*scale)),height:Math.max(1,Math.round(data.height*scale))}})
}
async function runs(nodes:Iterable<Node>, options:IRunOptions={}):Promise<Run[]> {
  const result:Run[]=[]
  for(const node of nodes) {
    if(node.nodeType===Node.TEXT_NODE) {
      const value=node.textContent??''
      for(const part of value.match(/[\u0600-\u08ff][\u0600-\u08ff\s]*|[^\u0600-\u08ff]+/gu)??[])result.push(new TextRun({...options,text:part,rightToLeft:arabic.test(part)}))
    } else if(node instanceof HTMLElement) {
      if(node.dataset.equation!==undefined){result.push(nativeEquation(node.dataset.equation)??await asPicture(node,420,170));continue}
      if(node.tagName==='BR'){result.push(new TextRun({break:1}));continue}
      const tag=node.tagName
      const bold=options.bold||['B','STRONG','TH'].includes(tag)
      result.push(...await runs(node.childNodes,{
        ...options,bold,boldComplexScript:bold,italics:options.italics||['I','EM'].includes(tag),
        underline:tag==='U'?{}:options.underline,
      }))
    }
  }
  return result
}
async function tableFor(table:HTMLTableElement, typography:IRunOptions):Promise<Table> {
  const rows:TableRow[]=[]
  for(const row of table.rows) {
    const cells:TableCell[]=[]
    for(const cell of row.cells) cells.push(new TableCell({
      children:await richBlocks(cell,typography),columnSpan:cell.colSpan,
      ...(cell.tagName==='TH'?{shading:{type:ShadingType.CLEAR,fill:'EDEFF2'}}:{}),
    }))
    if(cells.length)rows.push(new TableRow({children:cells,cantSplit:true}))
  }
  return new Table({rows,width:{size:100,type:WidthType.PERCENTAGE},visuallyRightToLeft:true})
}
async function richBlocks(element:HTMLElement, typography:IRunOptions):Promise<Block[]> {
  const blocks:Block[]=[]
  let pending:Run[]=[]
  const flush=()=>{if(pending.length){blocks.push(paragraph(pending));pending=[]}}
  for(const node of element.childNodes) {
    if(node instanceof HTMLTableElement){flush();if(node.rows.length)blocks.push(await tableFor(node,typography));continue}
    if(node instanceof HTMLElement && ['DIV','P','UL','OL'].includes(node.tagName)) {
      flush()
      if(node.matches('ul,ol')){
        for(const [index,li] of Array.from(node.children).entries())blocks.push(paragraph([new TextRun({...typography,text:node.tagName==='UL'?'• ':String(index+1)+'. '}),...await runs(li.childNodes,typography)]))
      } else if(node.querySelector('table,ul,ol'))blocks.push(...await richBlocks(node,typography))
      else blocks.push(paragraph(await runs(node.childNodes,typography)))
    } else pending.push(...await runs([node],typography))
  }
  flush()
  return blocks.length?blocks:[paragraph([])]
}
async function wordHeader(header:HTMLElement):Promise<Table> {
  const cells:TableCell[]=[]
  for(const [i,column] of Array.from(header.children).entries()){
    const content:Paragraph[]=[]
    for(const node of column.children){
      const children=node instanceof HTMLImageElement?[await asPicture(node,65,65)]:await runs([node])
      content.push(paragraph(children,AlignmentType.CENTER))
    }
    cells.push(new TableCell({children:content.length?content:[paragraph([],AlignmentType.CENTER)],width:{size:i===1?36:32,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:border,left:noBorder,right:noBorder}}))
  }
  return new Table({rows:[new TableRow({children:cells,cantSplit:true})],width:{size:100,type:WidthType.PERCENTAGE},visuallyRightToLeft:true})
}
export async function makeWord(sheets:HTMLElement[],exam:Exam) {
  const content:Block[]=[]
  const paper=exam.paper
  const margin=Math.round(paper.margin*56.6929)
  for(const [index,sheet] of sheets.entries()){
    if(index&&paper.repeat)content.push(new Paragraph({pageBreakBefore:true,spacing:{after:0,line:20},children:[new TextRun({text:' ',size:2})]}))
    const header=sheet.querySelector<HTMLElement>('.sheet-header')
    if(header)content.push(await wordHeader(header))
    const entries=Array.from(sheet.querySelectorAll<HTMLElement>('.sheet-block'))
    for(let i=0;i<entries.length;i++){
      const block=entries[i]
      const typography=blockTypography(block)
      const label=block.querySelector<HTMLElement>('.sheet-label')
      if(label)content.push(paragraph([new TextRun({...typography,text:label.innerText.replace(/\n/g,'   '),bold:true,boldComplexScript:true,rightToLeft:true})]))
      const rich=block.querySelector<HTMLElement>('.sheet-rich')
      if(rich)content.push(...await richBlocks(rich,typography))
      const pair=block.querySelector('.sheet-pair')
      if(pair) {
        const rows:TableRow[]=[]
        let current:Element|null=pair
        while(current) {
          const pairStyle=blockTypography(entries[i])
          const cells=await Promise.all(Array.from(current.children).map(async cell=>new TableCell({
            children:[paragraph(await runs(cell.childNodes,pairStyle))],width:{size:50,type:WidthType.PERCENTAGE},
          })))
          rows.push(new TableRow({children:cells,cantSplit:true}))
          current=entries[i+1]?.querySelector('.sheet-pair')??null
          if(current)i++
        }
        content.push(new Table({rows,width:{size:100,type:WidthType.PERCENTAGE},visuallyRightToLeft:true}))
      }
      const picture=block.querySelector<HTMLImageElement|SVGElement>('img, .sheet-diagram svg')
      if(picture)content.push(paragraph([await asPicture(picture,paper.orientation==='portrait'?530:740)],AlignmentType.CENTER))
    }
    const footer=sheet.querySelector('.sheet-footer')
    if(footer)for(const entry of Array.from(footer.querySelectorAll('.sheet-closing,.sheet-signatures div:not(:has(div)),.sheet-credit')))content.push(paragraph(await runs([entry]),AlignmentType.CENTER))
  }
  const doc=new Document({
    styles:{default:{document:{run:{font:paper.font,size:Math.round(paper.size*1.5),sizeComplexScript:Math.round(paper.size*1.5)},paragraph:{spacing:{line:Math.round(240*paper.spacing)}}}}},
    sections:[{
      properties:{page:{
        size:{width:11906,height:16838,orientation:paper.orientation==='portrait'?PageOrientation.PORTRAIT:PageOrientation.LANDSCAPE},
        margin:{top:margin,right:margin,bottom:margin,left:margin},
        borders:paper.border?{pageBorderTop:{...border,space:12},pageBorderBottom:{...border,space:12},pageBorderLeft:{...border,space:12},pageBorderRight:{...border,space:12}}:undefined,
      }},
      footers:{default:new Footer({children:[paragraph([new TextRun({children:[PageNumber.CURRENT,' / ',PageNumber.TOTAL_PAGES]})],AlignmentType.CENTER)]})},
      children:content,
    }],
  })
  return Packer.toBlob(doc)
}
