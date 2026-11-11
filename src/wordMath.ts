import katex from 'katex'
import { Math as WordMath, MathFraction, MathRadical, MathRun, MathSubScript, MathSubSuperScript, MathSuperScript, type MathComponent } from 'docx'

function components(node:Element):MathComponent[] {
  const tag=node.localName
  if(node.hasAttribute('mathvariant'))throw new Error('Styled math requires rendering.')
  const children=Array.from(node.children)
  switch(tag) {
    case 'math':
    case 'semantics':
    case 'mrow':
    case 'mstyle':
      return children.flatMap(components)
    case 'annotation':
    case 'mspace':
      return []
    case 'mi':
    case 'mn':
    case 'mo':
    case 'mtext':
      return [new MathRun(node.textContent??'')]
    case 'mfrac':
      return [new MathFraction({
        numerator:components(children[0]),denominator:components(children[1]),
        type:node.getAttribute('linethickness')==='0px'?'noBar':'stacked',
      })]
    case 'msqrt':
      return [new MathRadical({children:children.flatMap(components)})]
    case 'mroot':
      return [new MathRadical({children:components(children[0]),degree:components(children[1])})]
    case 'msub':
      return [new MathSubScript({children:components(children[0]),subScript:components(children[1])})]
    case 'msup':
      return [new MathSuperScript({children:components(children[0]),superScript:components(children[1])})]
    case 'msubsup':
      return [new MathSubSuperScript({children:components(children[0]),subScript:components(children[1]),superScript:components(children[2])})]
    default:
      throw new Error('This MathML structure requires rendering.')
  }
}

export function nativeEquation(latex:string):WordMath|null {
  try {
    const html=katex.renderToString(latex,{output:'mathml',throwOnError:true,trust:false,maxExpand:250,maxSize:12})
    const container=document.createElement('template')
    container.innerHTML=html
    const math=container.content.querySelector('math')
    if(!math)return null
    const children=components(math)
    return children.length?new WordMath({children}):null
  } catch {return null}
}
