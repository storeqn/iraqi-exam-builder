import { openDB, type DBSchema } from 'idb'
import { backupSchema, defaultSettings, type Backup, type BankEntry, type Exam, type Profile, type Settings } from './model'

interface LocalDB extends DBSchema {
  exams: { key: string; value: Exam }
  bank: { key: string; value: BankEntry }
  profiles: { key: string; value: Profile }
  settings: { key: string; value: Settings }
}
let connection: ReturnType<typeof openDB<LocalDB>> | undefined
function db() {
  connection ??= openDB<LocalDB>('iraqi-exam-builder', 1, {
    upgrade(database) {
      database.createObjectStore('exams', { keyPath: 'id' })
      database.createObjectStore('bank', { keyPath: 'id' })
      database.createObjectStore('profiles', { keyPath: 'id' })
      database.createObjectStore('settings')
    },
    blocking() { void connection?.then(database => database.close()); connection = undefined },
    terminated() { connection = undefined },
  }).catch(error => { connection = undefined; throw error })
  return connection
}
export async function readAll(): Promise<Backup> {
  const transaction = (await db()).transaction(['exams', 'bank', 'profiles', 'settings'])
  const [exams, bank, profiles, settings] = await Promise.all([
    transaction.objectStore('exams').getAll(), transaction.objectStore('bank').getAll(),
    transaction.objectStore('profiles').getAll(), transaction.objectStore('settings').get('current'),
  ])
  await transaction.done
  return { version: 1, exams, bank, profiles, settings: settings ?? defaultSettings }
}
export const putExam = async (exam: Exam) => (await db()).put('exams', exam)
export async function putBank(entries: BankEntry[]) {
  const transaction=(await db()).transaction('bank','readwrite')
  await Promise.all([...entries.map(entry=>transaction.store.put(entry)),transaction.done])
}
export const putProfile = async (profile: Profile) => (await db()).put('profiles', profile)
export const putSettings = async (settings: Settings) => (await db()).put('settings', settings, 'current')
export const remove = async (store: 'exams' | 'bank' | 'profiles', id: string) => (await db()).delete(store, id)
export async function restore(input: unknown) {
  const backup = backupSchema.parse(input)
  const transaction = (await db()).transaction(['exams', 'bank', 'profiles', 'settings'], 'readwrite')
  await Promise.all([
    ...backup.exams.map(exam => transaction.objectStore('exams').put(exam)),
    ...backup.bank.map(entry => transaction.objectStore('bank').put(entry)),
    ...backup.profiles.map(profile => transaction.objectStore('profiles').put(profile)),
    transaction.objectStore('settings').put(backup.settings, 'current'),
    transaction.done,
  ])
}
export async function readJson(file: File): Promise<unknown> {
  if (file.size > 80 * 1024 * 1024) throw new Error('حجم الملف يتجاوز 80 ميغابايت.')
  try { return JSON.parse(await file.text()) } catch { throw new Error('تعذّرت قراءة ملف JSON.') }
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
export const saveJson = (value: unknown, name: string) => download(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), name)
export async function readImage(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2_500_000) throw new Error('اختر صورة PNG أو JPEG أو WebP بحجم أقل من 2.5 ميغابايت.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/webp', 0.9)
}
