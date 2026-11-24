// Types for Ava's add-on client (src-tauri/src/addons/ava.js, served at
// /ava.js) and for an add-on's manifest.json (src-tauri/src/addons/manifest.rs).

/** A folder or file the person gave this add-on in Ava's picker. */
export type Grant = { token: string; name: string; kind: 'folder' | 'file' }

/** One entry in a granted folder. */
export type Entry = { name: string; path: string; kind: 'folder' | 'file'; size: number; modified: number }

/** An MCP transport over Ava's bridge, for the MCP Apps SDK: `new App(…).connect(ava().transport())`. */
export type Transport = {
  onmessage?: (message: unknown) => void
  onerror?: (error: Error) => void
  onclose?: () => void
  start(): Promise<void>
  send(message: unknown): Promise<void>
  close(): Promise<void>
}

export type AvaClient = {
  /** One JSON-RPC request to Ava (MCP, MCP Apps, or Ava's own `ava/` methods). */
  request(method: string, params?: Record<string, unknown>): Promise<unknown>
  notify(method: string, params?: Record<string, unknown>): Promise<unknown>
  transport(): Transport
  /** Hear a notification by its method (e.g. 'notifications/roots/list_changed', 'ava/notifications/open'). */
  on(method: string, fn: (params: Record<string, unknown>) => void): () => void
  /** Who this add-on is, as Ava knows it. */
  hello(): Promise<{ id: string; name: string; version: string }>
  /** What the person gave this add-on, as MCP roots (URIs in this add-on's origin). */
  roots(): Promise<{ roots: { uri: string; name?: string }[] }>
  pickFolder(): Promise<Grant>
  pickFiles(options?: { multiple?: boolean }): Promise<Grant[]>
  grants(): Promise<Grant[]>
  files: {
    list(token: string, path?: string): Promise<Entry[]>
    stat(token: string, path: string): Promise<Entry>
    read(token: string, path: string, options?: { encoding?: 'utf8' | 'base64' }): Promise<string>
    write(token: string, path: string, data: string, options?: { encoding?: 'utf8' | 'base64' }): Promise<Entry>
    mkdir(token: string, path: string): Promise<Entry>
    rename(token: string, from: string, to: string): Promise<Entry>
    /** To the Trash. */
    delete(token: string, path: string): Promise<void>
    /** A URL for <img>, <audio>, <video>, streamed by Ava by range. */
    url(token: string, path?: string): string
  }
  storage: {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<void>
    delete(key: string): Promise<void>
    keys(): Promise<string[]>
  }
  /** A link in the person's browser (Ava asks first unless it's a declared host). */
  openExternal(url: string): Promise<void>
  net: {
    /** A request to one of the add-on's declared hosts, through Ava. */
    fetch(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string | null }): Promise<{ status: number; headers: Record<string, string>; body: string }>
  }
  /**
   * This computer's own apps (needs the 'device' permission and the source in `device`).
   * Sync is one way: import into a folder of the add-on's own (`folder`, "From your Mac"),
   * whatever platform it came from. Writing back happens only inside an approved card.
   */
  device: {
    status(source: DeviceSource): Promise<DeviceStatus>
    /** Every record of `source` (calendar: `from`/`to` in unix seconds; default a month back to a year ahead). Shows the platform's permission prompt if it hasn't asked. */
    read<S extends DeviceSource>(source: S, options?: { from?: number; to?: number }): Promise<{ folder: string; records: DeviceRecord[S][] }>
    /** One change the person approved on a card: `step` is that call's `_meta['ava/step']`. Refused at any other time. */
    write(source: DeviceSource, change: DeviceChange, step: string): Promise<Record<string, unknown>>
  }
}

/** One of this computer's own apps an add-on may import from. */
export type DeviceSource = 'calendar' | 'contacts' | 'reminders' | 'notes'

/** Whether there's anything to import here, whether Ava may read it now, and where imports go. */
export type DeviceStatus = { available: boolean; access: 'allowed' | 'notAsked' | 'denied' | 'missing'; folder: string }

/** What an import gives, per source. Times are local: "2026-11-12 10:00", or "2026-11-12" for a whole day. */
export type DeviceRecord = {
  calendar: { id: string; title: string; starts: string; ends: string; all_day: boolean; location: string | null; calendar: string }
  contacts: { name: string; nickname: string; organization: string; phones: { label: string; number: string }[]; emails: string[]; birthday: string | null }
  reminders: { id: string; title: string; list: string; due: string | null; notes: string | null; done: boolean }
  notes: { title: string; folder: string; modified: string; text: string }
}

/** What can be written back (macOS today): new events, reminders and notes, and ticking off a reminder. */
export type DeviceChange =
  | { kind: 'add'; title: string; starts: string; ends?: string; location?: string }
  | { kind: 'add'; title: string; due?: string; list?: string; notes?: string }
  | { kind: 'complete'; id: string }
  | { kind: 'add'; title: string; text: string; folder?: string }

/** Ava's client, as /ava.js set it up. Throws outside Ava. */
export function ava(): AvaClient

/** What one of an add-on's tools does: reads, changes its own files, or reaches outside (Ava asks the person). */
export type Effect = 'read' | 'inside' | 'outside'
export type Permission = 'files' | 'storage' | 'tools' | 'network' | 'device'

/** The words an approval card's button may say: what happens when the person taps it. Never a generic OK. */
export type Verb = 'Add' | 'Save' | 'Delete' | 'Done' | 'Send' | 'Import' | 'Remove' | 'Open' | 'Purchase'

/**
 * One action of a tool that has several (`calendar(action: 'add', …)`): reads run at once;
 * a change ('inside' or 'outside') waits for the person's card, whose button says `verb`.
 */
export type Action =
  | { name: string; effect: 'read'; verb?: never }
  | { name: string; effect: 'inside' | 'outside'; verb: Verb }

/**
 * A tool. With `actions`, its `effect` is the strongest of theirs and its input_schema has a
 * required string `action` whose enum is exactly their names, in order. A tool named like its
 * add-on is the add-on's one tool, and Ava sees it by that name alone (`calendar`).
 */
export type Tool = { name: string; description: string; effect: Effect; input_schema: Record<string, unknown>; actions?: Action[] }
/**
 * With the 'files' permission, whether the add-on's tools need a picked folder or file:
 * 'needed' (the default) means Ava offers them only once the person picked one;
 * 'optional' means they work without, and the add-on only sometimes asks for files.
 */
export type FilesUse = 'needed' | 'optional'

/** manifest.json at the root of an add-on's bundle. */
export type Manifest = {
  /** 3–32 of a–z, 0–9 and '-'; `ava`, `ava-*`, `addis-*` and `marketplace` are Ava's. */
  id: string
  name: string
  version: string
  description?: string
  /** The page Ava opens (default index.html). */
  entry?: string
  icon?: string
  permissions?: Permission[]
  /** Only with the 'files' permission; left out, it's 'needed'. */
  files?: FilesUse
  /** Hosts it may reach through `ava.net.fetch` (needs 'network'). */
  egress?: string[]
  tools?: Tool[]
  /** With the 'device' permission: the computer's apps it imports from. Never with 'network'. */
  device?: DeviceSource[]
}
