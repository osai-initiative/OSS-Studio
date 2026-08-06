export type Submission = {
  id: number;
  name: string;
  description: string;
  submitter_email: string;
  website_url: string;
  weights_url: string;
  code_url: string;
  data_url: string;
  license: string;
  status: 'pending' | 'labeled' | 'rejected';
  labels: string;
  approved: number;
  audit_notes: string;
  created_at: string;
  audited_at: string | null;
};

export const TIER_LABELS = ['open_weights', 'open_code', 'open_data'] as const;
export const CLOSED_LABEL = 'closed';
export type TierLabel = (typeof TIER_LABELS)[number] | typeof CLOSED_LABEL;
export const ALL_LABELS = [...TIER_LABELS, CLOSED_LABEL] as const;

export const LABEL_NAMES: Record<TierLabel, string> = {
  open_weights: 'Open Weights',
  open_code: 'Open Code',
  open_data: 'Open Data',
  closed: 'Fully Closed',
};

export function parseLabels(raw: string): TierLabel[] {
  if (!raw) return [];
  return raw.split(',').filter((l): l is TierLabel => ALL_LABELS.includes(l as TierLabel));
}

export function labelSummary(labels: TierLabel[]): string[] {
  const names = labels.map((l) => LABEL_NAMES[l]);
  if (labels.length === 3 && !labels.includes(CLOSED_LABEL)) return ['Open Source', 'OSAII Approved'];
  return names;
}

export function isApproved(labels: TierLabel[]): boolean {
  return labels.length === 3 && !labels.includes(CLOSED_LABEL);
}

export function isClosed(labels: TierLabel[]): boolean {
  return labels.length === 1 && labels[0] === CLOSED_LABEL;
}

function mapSubmission(row: Record<string, unknown>): Submission {
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    submitter_email: String(row.submitter_email ?? ''),
    website_url: String(row.website_url ?? ''),
    weights_url: String(row.weights_url ?? ''),
    code_url: String(row.code_url ?? ''),
    data_url: String(row.data_url ?? ''),
    license: String(row.license ?? ''),
    status: (row.status as Submission['status']) ?? 'pending',
    labels: String(row.labels ?? ''),
    approved: Number(row.approved ?? 0),
    audit_notes: String(row.audit_notes ?? ''),
    created_at: String(row.created_at ?? ''),
    audited_at: row.audited_at ? String(row.audited_at) : null,
  };
}

export async function createSubmission(db: D1Database, data: {
  name: string;
  description: string;
  submitter_email: string;
  website_url: string;
  weights_url: string;
  code_url: string;
  data_url: string;
  license: string;
}): Promise<Submission> {
  const res = await db.prepare(
    `INSERT INTO submissions (name, description, submitter_email, website_url, weights_url, code_url, data_url, license)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(data.name, data.description, data.submitter_email, data.website_url, data.weights_url, data.code_url, data.data_url, data.license).run();
  return { ...data, id: Number(res.meta.last_row_id), status: 'pending', labels: '', approved: 0, audit_notes: '', created_at: '', audited_at: null };
}

export async function listSubmissions(db: D1Database, status?: string): Promise<Submission[]> {
  let sql = 'SELECT * FROM submissions';
  const args: string[] = [];
  if (status) {
    sql += ' WHERE status = ?';
    args.push(status);
  }
  sql += ' ORDER BY (status = "pending") DESC, created_at DESC';
  const res = await db.prepare(sql).bind(...args).all<Record<string, unknown>>();
  return res.results.map(mapSubmission);
}

export async function getSubmission(db: D1Database, id: number): Promise<Submission | null> {
  const res = await db.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first<Record<string, unknown>>();
  return res ? mapSubmission(res) : null;
}

export async function labelSubmission(db: D1Database, id: number, labels: TierLabel[], publish: boolean, notes: string): Promise<Submission | null> {
  const status = publish ? 'labeled' : 'rejected';
  const approved = publish ? (isApproved(labels) ? 1 : 0) : 0;
  const res = await db.prepare(
    `UPDATE submissions SET labels = ?, approved = ?, status = ?, audit_notes = ?, audited_at = datetime('now')
     WHERE id = ?`,
  ).bind(labels.join(','), approved, status, notes, id).run();
  if (!res.meta.changes) return null;
  return getSubmission(db, id);
}

export async function listCatalog(db: D1Database): Promise<Submission[]> {
  const res = await db.prepare(
    "SELECT * FROM submissions WHERE status = 'labeled' ORDER BY audited_at DESC",
  ).all<Record<string, unknown>>();
  return res.results.map(mapSubmission);
}
