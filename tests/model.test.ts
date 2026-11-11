import { test } from 'node:test'
import assert from 'node:assert/strict'
import { backupSchema, copyExam, defaultSettings, dimensions, examSchema, fromTemplate, move, newExam, newQuestion, partNumber, questionNumber, sumMarks } from '../src/model'
import { diagramSvg, graphPath } from '../src/diagram'

test('Iraqi templates stay editable and copies have independent data', () => {
  const exam=fromTemplate('math',defaultSettings)
  const copy=copyExam(exam,true)
  assert.notEqual(copy.id,exam.id)
  assert.equal(copy.template,true)
  assert.equal(copy.questions[0].type,'رياضيات')
  copy.questions[0].marks=5
  assert.equal(exam.questions[0].marks,0)
  assert.ok(examSchema.safeParse(copy).success)
  assert.equal(fromTemplate('secondary',defaultSettings).info.total,100)
})
test('mark calculation, A4 direction, numbering, and reorder', () => {
  const exam=newExam()
  exam.questions=[{...newQuestion(),marks:0.1},{...newQuestion(),marks:0.2}]
  assert.equal(sumMarks(exam),0.3)
  assert.equal(questionNumber(0,'arabic'),'س1')
  assert.equal(partNumber(2,'letters'),'ج')
  assert.deepEqual(move(['أ','ب','ج'],0,2),['ب','ج','أ'])
  assert.deepEqual(move(['أ'],0,5),['أ'])
  assert.ok(dimensions(exam.paper).height>dimensions(exam.paper).width)
  assert.ok(dimensions({...exam.paper,orientation:'landscape'}).height<dimensions({...exam.paper,orientation:'landscape'}).width)
})
test('import rejects malformed images, duplicate identifiers, and invalid marks', () => {
  const exam=newExam()
  const question=newQuestion()
  assert.ok(!examSchema.safeParse({...exam,questions:[question,question]}).success)
  assert.ok(!examSchema.safeParse({...exam,questions:[{...question,marks:-1}]}).success)
  assert.ok(!examSchema.safeParse({...exam,questions:[{...question,images:['data:image/svg+xml,<svg/>']}]}).success)
  assert.ok(!backupSchema.safeParse({version:1,exams:[exam,exam],bank:[],profiles:[],settings:defaultSettings}).success)
})
test('function plotting accepts arithmetic and rejects executable syntax', () => {
  const shape={id:crypto.randomUUID(),kind:'graph' as const,x:300,y:180,w:400,h:300,label:'',measure:'',color:'#000000',weight:2,expression:'sin(x)+x/4'}
  assert.match(graphPath(shape),/^M.+L/)
  assert.throws(()=>graphPath({...shape,expression:'x=2'}))
  assert.throws(()=>graphPath({...shape,expression:'import(x)'}))
})

test('circular arcs use the radius derived from their chord and height', () => {
  const shape={id:crypto.randomUUID(),kind:'arc' as const,x:100,y:130,w:100,h:50,label:'',measure:'',color:'#000000',weight:2,expression:''}
  assert.match(diagramSvg([shape]),/M100,130A50,50 0 0 1 200,130/)
})
