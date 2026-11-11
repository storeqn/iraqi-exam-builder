import { z } from 'zod'

export const types = ['تعاريف','املأ الفراغات','اختيار من متعدد','صح أو خطأ','علّل','إجابة قصيرة','مقالي','قارن','عدّد','صِل بين العمودين','رياضيات','سؤال مصوّر','تنسيق مخصص'] as const
export const examTypes = ['امتحان شهري','الفصل الأول','نصف السنة','الفصل الثاني','الامتحان النهائي','الدور الأول','الدور الثاني','مخصص'] as const
export const difficulties = ['سهل','متوسط','صعب'] as const
export const shapeTypes = ['point','line','segment','ray','angle','triangle','rectangle','square','circle','arc','axes','graph'] as const
const small = z.string().max(350)
const text = z.string().max(120_000)
export const imagePattern = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/
const image = z.string().max(3_600_000).regex(imagePattern)
const coords = z.number().finite().min(-2000).max(2000)
const shape = z.object({
  id: z.uuid(), kind: z.enum(shapeTypes), x: coords, y: coords, w: coords, h: coords,
  label: small, measure: small, color: z.string().regex(/^#[0-9a-f]{6}$/i),
  weight: z.number().min(0.5).max(12), expression: z.string().max(160),
})
export const diagramSchema = z.array(shape).max(60)
function unique<T extends {id:string}>(items:T[]) {
  return new Set(items.map(item=>item.id)).size===items.length
}
export const questionSchema = z.object({
  id: z.uuid(), type: z.enum(types), content: text, marks: z.number().min(0).max(10000),
  parts: z.array(z.object({ id: z.uuid(), content: text })).max(100),
  options: z.array(z.object({ id: z.uuid(), left: small, right: small })).max(80),
  images: z.array(image).max(12), diagrams: z.array(diagramSchema).max(12),
}).refine(question=>unique(question.parts)&&unique(question.options)&&question.diagrams.every(unique),'معرّفات السؤال مكررة')
export const infoSchema = z.object({
  country: small, ministry: small, directorate: small, school: small, teacher: small,
  subject: small, grade: small, classroom: small, year: small, kind: z.enum(examTypes),
  customKind: small, date: z.string().regex(/^(|\d{4}-\d{2}-\d{2})$/), duration: small,
  total: z.number().min(0).max(10000).nullable(), round: small, logo: image.or(z.literal('')),
  instructions: z.string().max(4000), notes: z.string().max(4000),
  administration: small, signature: small, closing: small, invocation: small, heading: small, printedTitle: small.optional(),
})
export const paperSchema = z.object({
  orientation: z.enum(['portrait','landscape']), font: z.enum(['Amiri','Cairo']),
  margin: z.number().min(8).max(28), size: z.number().min(12).max(30),
  spacing: z.number().min(1.15).max(2.2), border: z.boolean(), instructions: z.boolean(),
  ministry: z.boolean(), repeat: z.boolean(), credit: z.boolean(),
  numbering: z.enum(['arabic','numeric']), parts: z.enum(['letters','numbers']),
  headerOrder: z.enum(['standard','reversed']), footerOrder: z.enum(['standard','reversed']),
})
export const examSchema = z.object({
  id: z.uuid(), title: small, created: z.iso.datetime(), modified: z.iso.datetime(),
  info: infoSchema, paper: paperSchema, questions: z.array(questionSchema).max(250),
  template: z.boolean(),
}).refine(exam=>unique(exam.questions),'معرّفات الأسئلة مكررة')
export const bankSchema = z.object({ id: z.uuid(), subject: small, grade: small, chapter: small, difficulty: z.enum(difficulties), question: questionSchema })
export const profileSchema = z.object({ id: z.uuid(), name: small, kind: z.enum(['school','teacher']), school: small, teacher: small, directorate: small, logo: image.or(z.literal('')) })
export const settingsSchema = z.object({
  theme: z.enum(['light','dark']), autosave: z.boolean(), exportFormat: z.enum(['pdf','docx','png','jpeg']),
  info: infoSchema, paper: paperSchema,
})
export const backupSchema = z.object({
  version: z.literal(1), exams: z.array(examSchema).max(2000), bank: z.array(bankSchema).max(4000), profiles: z.array(profileSchema).max(1000), settings: settingsSchema,
}).superRefine((value, ctx) => {
  for (const key of ['exams', 'bank', 'profiles'] as const) {
    if (new Set(value[key].map(item => item.id)).size !== value[key].length) ctx.addIssue({ code: 'custom', path: [key], message: 'معرّف مكرر' })
  }
})
export type Exam = z.infer<typeof examSchema>
export type Info = z.infer<typeof infoSchema>
export type Paper = z.infer<typeof paperSchema>
export type Question = z.infer<typeof questionSchema>
export type BankEntry = z.infer<typeof bankSchema>
export type Profile = z.infer<typeof profileSchema>
export type Settings = z.infer<typeof settingsSchema>
export type Backup = z.infer<typeof backupSchema>
export type Diagram = z.infer<typeof diagramSchema>
export type Shape = Diagram[number]
export type ShapeKind = Shape['kind']
export const uid = () => crypto.randomUUID()
export const blankInfo: Info = {
  country: 'جمهورية العراق', ministry: 'وزارة التربية', directorate: '', school: '', teacher: '', subject: '', grade: '', classroom: '',
  year: '', kind: 'امتحان شهري', customKind: '', date: '', duration: '', total: null, round: '', logo: '', instructions: '', notes: '',
  administration: '', signature: '', closing: 'مع تمنياتنا لكم بالنجاح', invocation: 'بسم الله الرحمن الرحيم', heading: 'أسئلة',
}
export const blankPaper: Paper = {
  orientation: 'portrait', font: 'Amiri', margin: 14, size: 20, spacing: 1.55, border: true, instructions: true, ministry: true,
  repeat: false, credit: false, numbering: 'arabic', parts: 'letters', headerOrder: 'standard', footerOrder: 'standard',
}
export const defaultSettings: Settings = { theme: 'light', autosave: true, exportFormat: 'pdf', info: blankInfo, paper: blankPaper }
export const newQuestion = (type: Question['type'] = 'إجابة قصيرة'): Question => ({
  id: uid(), type, content: '', marks: 0, parts: [], options: [], images: [], diagrams: [],
})
export function newExam(settings: Settings = defaultSettings): Exam {
  const now = new Date().toISOString()
  return { id: uid(), title: '', created: now, modified: now, info: { ...settings.info }, paper: { ...settings.paper }, questions: [], template: false }
}
export function copyExam(exam: Exam, template = false): Exam {
  const now = new Date().toISOString()
  return { ...structuredClone(exam), id: uid(), title: (exam.template ? exam.title : `${examName(exam)} — ${template ? 'قالب' : 'نسخة'}`).slice(0,350), created: now, modified: now, template }
}
export const examName = (exam: Exam) => exam.title || exam.info.printedTitle?.trim() || [exam.info.subject, exam.info.grade].filter(Boolean).join(' · ') || 'ورقة امتحانية جديدة'
export const sumMarks = (exam: Exam) => Math.round(exam.questions.reduce((sum, question) => sum + question.marks, 0) * 1000) / 1000
export const questionNumber = (index: number, style: Paper['numbering']) => style === 'arabic' ? `س${index + 1}` : `${index + 1}.`
const letters = 'أبجدهوزحطيكلمنسعفصقرشتثخذضظغ'
export const partNumber = (index: number, style: Paper['parts']) => style === 'letters' && index < letters.length ? letters[index] : String(index + 1)
export const dimensions = (paper: Paper) => paper.orientation === 'portrait' ? { width: 794, height: 1123 } : { width: 1123, height: 794 }
export const kindName = (info: Info) => info.kind === 'مخصص' ? info.customKind : info.kind
export const defaultPrintTitle = (info: Info) => [info.heading,kindName(info)].filter(Boolean).join(' ')
export const printedExamTitle = (info: Info) => info.printedTitle?.trim() || defaultPrintTitle(info)
export const move = <T,>(items: T[], from: number, to: number) => {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items
  const result = [...items]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}
export const starterTemplates = [
  { key: 'primary', name: 'المرحلة الابتدائية', description: 'رأس بسيط وترقيم بالحروف للفروع', icon: 'school' },
  { key: 'secondary', name: 'المرحلة الثانوية', description: 'حقول المادة والصف والزمن والدرجة', icon: 'layers' },
  { key: 'math', name: 'ورقة الرياضيات', description: 'مساحة للعمل على المعادلات والأشكال', icon: 'math' },
] as const
export function fromTemplate(key: string, settings: Settings) {
  const exam = newExam(settings)
  if (key === 'primary') exam.paper.size = 23
  if (key === 'secondary') { exam.info.kind = 'الامتحان النهائي'; exam.info.total = 100; exam.paper.repeat = true }
  if (key === 'math') { exam.info.subject = 'الرياضيات'; exam.questions = [newQuestion('رياضيات')] }
  return exam
}
