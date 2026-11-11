import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/cairo/arabic-400.css'
import '@fontsource/cairo/arabic-600.css'
import '@fontsource/cairo/arabic-700.css'
import '@fontsource/cairo/arabic-800.css'
import '@fontsource/cairo/latin-400.css'
import '@fontsource/cairo/latin-700.css'
import '@fontsource/amiri/arabic-400.css'
import '@fontsource/amiri/arabic-700.css'
import '@fontsource/amiri/latin-400.css'
import '@fontsource/amiri/latin-700.css'
import 'katex/dist/katex.min.css'
import './style.css'
import App from './App'
import { Button } from './ui'

class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  render(){
    if(!this.state.failed)return this.props.children
    return <main className="fatal panel" role="alert"><img src="/logo.svg" alt="" width="48" height="48"/><h1>تعذّر عرض التطبيق</h1><p>أعد تحميل الصفحة لمحاولة فتح أوراقك المحلية.</p><Button kind="primary" onClick={()=>location.reload()}>إعادة التحميل</Button></main>
  }
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>)
