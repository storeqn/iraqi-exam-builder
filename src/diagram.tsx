import { parse, type MathNode } from 'mathjs/number'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Diagram, Shape } from './model'

export const stage = { width:600, height:360 }
const operators = new Set(['add','subtract','multiply','divide','pow','unaryMinus','unaryPlus'])
const functions = new Set(['sin','cos','tan','asin','acos','atan','sqrt','abs','log','log10','exp','floor','ceil'])
const symbols = new Set(['x','pi','e',...functions])
function compile(expression:string) {
  let count=0
  const tree=parse(expression)
  tree.traverse(node=>{
    count++
    const value=node as MathNode & {name?:string;fn?:string | {name?:string};value?:unknown}
    const safe = node.type==='ParenthesisNode' || (node.type==='ConstantNode' && typeof value.value==='number') ||
      (node.type==='SymbolNode' && symbols.has(value.name??'')) ||
      (node.type==='OperatorNode' && typeof value.fn==='string' && operators.has(value.fn)) ||
      (node.type==='FunctionNode' && typeof value.fn==='object' && functions.has(value.fn.name??''))
    if(!safe||count>90)throw new Error('استخدم x والعمليات الحسابية والدوال مثل sin(x) وsqrt(x).')
  })
  return tree.compile()
}
export function graphPath(shape:Shape) {
  const program=compile(shape.expression)
  const width=Math.max(20,Math.abs(shape.w)), height=Math.max(20,Math.abs(shape.h))
  let result='', previous:number|null=null
  for(let i=0;i<=320;i++){
    const x=-10+i/16
    const value=program.evaluate({x})
    if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>10){previous=null;continue}
    const px=shape.x+x*width/20, py=shape.y-value*height/20
    result+=(previous===null||Math.abs(previous-value)>4?'M':'L')+px.toFixed(2)+' '+py.toFixed(2)+' '
    previous=value
  }
  return result
}
function figure(shape:Shape) {
  const {x,y,w,h,kind}=shape
  const width=Math.max(5,Math.abs(w)),height=Math.max(5,Math.abs(h))
  const radians=Math.atan2(h,w)
  const extension=900
  const edgeX=Math.cos(radians)*extension, edgeY=Math.sin(radians)*extension
  const arrow=(px:number,py:number,direction:number) => {
    const a=direction-0.45,b=direction+0.45
    return `M${px-10*Math.cos(a)},${py-10*Math.sin(a)}L${px},${py}L${px-10*Math.cos(b)},${py-10*Math.sin(b)}`
  }
  switch(kind){
    case 'point':return <circle cx={x} cy={y} r={4} fill={shape.color}/>
    case 'line':return <line x1={x-edgeX} y1={y-edgeY} x2={x+edgeX} y2={y+edgeY}/>
    case 'segment':return <><line x1={x} y1={y} x2={x+w} y2={y+h}/><circle cx={x} cy={y} r="3" fill={shape.color}/><circle cx={x+w} cy={y+h} r="3" fill={shape.color}/></>
    case 'ray':return <><line x1={x} y1={y} x2={x+w} y2={y+h}/><path d={arrow(x+w,y+h,radians)}/></>
    case 'angle':{
      const r=Math.min(27,width/2), ay=y-r*Math.sin(Math.atan2(height,width)), ax=x+r*Math.cos(Math.atan2(height,width))
      return <path d={`M${x+width},${y}H${x}L${x+width},${y-height} M${x+r},${y}A${r},${r} 0 0 0 ${ax},${ay}`}/>
    }
    case 'triangle':return <polygon points={`${x},${y+height} ${x+width/2},${y} ${x+width},${y+height}`}/>
    case 'rectangle':return <rect x={x} y={y} width={width} height={height}/>
    case 'square':return <rect x={x} y={y} width={width} height={width}/>
    case 'circle':return <circle cx={x} cy={y} r={width/2}/>
    case 'arc':{
      const radius=width*width/(8*height)+height/2
      const large=height>width/2?1:0
      return <path d={`M${x},${y}A${radius},${radius} 0 ${large} 1 ${x+width},${y}`}/>
    }
    case 'axes':return <><path d={`M${x-width/2},${y}h${width} M${x},${y+height/2}v${-height} ${arrow(x+width/2,y,0)} ${arrow(x,y-height/2,-Math.PI/2)}`}/>{Array.from({length:19},(_,i)=>i-9).filter(Boolean).map(i=><path key={i} d={`M${x+i*width/20},${y-3}v6 M${x-3},${y+i*height/20}h6`}/>)}</>
    case 'graph':{try{return <path d={graphPath(shape)}/>}catch{return null}}
  }
}
export function DiagramSvg({shapes, selected, pick, svgRef, move, release, grid=false}: {shapes:Diagram;selected?:string;pick?:(event:React.PointerEvent<SVGGElement>,shape:Shape)=>void;svgRef?:React.Ref<SVGSVGElement>;move?:(event:React.PointerEvent<SVGSVGElement>)=>void;release?:()=>void;grid?:boolean}) {
  return <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="600" height="360" role="img" aria-label="رسم رياضي" onPointerMove={move} onPointerUp={release} onPointerCancel={release}>
    <rect width="600" height="360" fill="#ffffff"/>
    {grid && <path d={Array.from({length:61},(_,i)=>`M${i*10} 0v360`).join(' ')+Array.from({length:37},(_,i)=>`M0 ${i*10}h600`).join(' ')} stroke="#e5ebf3" fill="none"/>}
    {shapes.map(shape=><g key={shape.id} stroke={shape.id===selected?'#2563eb':shape.color} strokeWidth={shape.weight} strokeLinecap="round" strokeLinejoin="round" fill="none" onPointerDown={pick?event=>pick(event,shape):undefined}>
      {pick&&<g stroke="transparent" strokeWidth={16} pointerEvents="stroke">{figure(shape)}</g>}{figure(shape)}
      {shape.label&&<text x={shape.x+10} y={shape.y-9} fill={shape.color} stroke="none" fontSize="17" fontFamily="Arial, sans-serif">{shape.label}</text>}
      {shape.measure&&<text x={shape.x+10} y={shape.y+23} fill={shape.color} stroke="none" fontSize="14" fontFamily="Arial, sans-serif">{shape.measure}</text>}
    </g>)}
  </svg>
}
export const diagramSvg = (diagram:Diagram) => renderToStaticMarkup(<DiagramSvg shapes={diagram}/>)
