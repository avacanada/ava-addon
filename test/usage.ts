// Compiled by `npm run check`: the types say what an add-on writes.
import { ava, type Manifest } from '../index.js'

export async function example() {
  const client = ava()
  const [folder] = await client.grants()
  if (!folder) return client.pickFolder()
  const notes = await client.files.list(folder.token)
  const text = await client.files.read(folder.token, notes[0]?.path ?? 'README.md')
  await client.storage.set('last', { at: Date.now(), length: text.length })
  return client.files.url(folder.token, notes[0]?.path)
}

export const manifest: Manifest = {
  id: 'moodboard',
  name: 'Moodboard',
  version: '1.0.0',
  permissions: ['files', 'tools'],
  tools: [{ name: 'add', description: 'Add an image.', effect: 'inside', input_schema: { type: 'object' } }],
}

// Files only for import and export: its tools reach Ava without a picked folder.
export const whiteboard: Manifest = {
  id: 'whiteboard',
  name: 'Whiteboard',
  version: '1.0.0',
  permissions: ['files', 'tools'],
  files: 'optional',
  tools: [{ name: 'draw', description: 'Draw a shape.', effect: 'inside', input_schema: { type: 'object' } }],
}

// One tool with actions, importing from the Mac's Calendar into its own folder.
export const calendar: Manifest = {
  id: 'calendar',
  name: 'Calendar',
  version: '1.0.0',
  permissions: ['files', 'storage', 'tools', 'device'],
  device: ['calendar'],
  egress: [],
  tools: [{
    name: 'calendar', description: 'The calendar.', effect: 'inside',
    input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'add'] } }, required: ['action'] },
    actions: [{ name: 'list', effect: 'read' }, { name: 'add', effect: 'inside', verb: 'Add' }],
  }],
}

export async function importEvents() {
  const { folder, records } = await ava().device.read('calendar')
  return records.map(e => `${folder}/${e.calendar}/${e.title} ${e.starts}`)
}

// @ts-expect-error: a change needs a verb for its card.
export const noVerb: Manifest['tools'] = [{ name: 'x', description: 'x', effect: 'inside', input_schema: { type: 'object' }, actions: [{ name: 'add', effect: 'inside' }] }]
// @ts-expect-error: never a generic OK.
export const okVerb: Manifest['tools'] = [{ name: 'x', description: 'x', effect: 'inside', input_schema: { type: 'object' }, actions: [{ name: 'add', effect: 'inside', verb: 'OK' }] }]

// @ts-expect-error: 'needed' or 'optional', nothing else.
export const sometimes: Manifest = { id: 'sometimes', name: 'Sometimes', version: '1.0.0', permissions: ['files'], files: 'sometimes' }
