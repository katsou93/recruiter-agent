/**
 * scripts/seed-jobs.ts
 *
 * Legt spekulative Stellenanzeigen (DevOps / Cloud Engineer, Mid + Senior)
 * für deutsche Großstädte in Vincere an.
 *
 * ---------------------------------------------------------------------------
 * BENUTZUNG
 * ---------------------------------------------------------------------------
 *   npx tsx scripts/seed-jobs.ts --dry-run                  # nichts senden, nur zeigen
 *   npx tsx scripts/seed-jobs.ts --only=Berlin              # eine Stadt (4 Jobs)
 *   npx tsx scripts/seed-jobs.ts --cities=Berlin,Hamburg    # mehrere Städte
 *   npx tsx scripts/seed-jobs.ts                            # alles
 *   npx tsx scripts/seed-jobs.ts --reset-state              # State vergessen
 *
 * Empfohlener Ablauf:
 *   1) --dry-run --only=Berlin      -> Payloads prüfen
 *   2) --only=Berlin                -> 4 Jobs live, in Vincere kontrollieren
 *   3) (ohne Flags)                 -> Rest ausrollen
 *
 * ---------------------------------------------------------------------------
 * IDEMPOTENZ
 * ---------------------------------------------------------------------------
 * Jeder erzeugte Job bekommt einen deterministischen Key (z.B. "berlin::devops::senior").
 * Erfolgreich angelegte Keys landen in scripts/.seed-jobs-state.json.
 * Ein erneuter Lauf überspringt sie. Skript kann also jederzeit abgebrochen
 * und neu gestartet werden, ohne Duplikate zu erzeugen.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ===========================================================================
// KONFIGURATION
// ===========================================================================

const CONFIG = {
  /** Interne Sammelfirma "Stellenanzeigen" */
  companyId: 14534,
  /** Kontakt "Recruiting Team" an dieser Firma */
  contactId: 37109,
  /** Vincere-Endpunkt (NICHT /api/v2/job — der gibt 404) */
  path: '/api/v2/position',
  /** Pause zwischen zwei Requests in ms — schützt vor Rate-Limits */
  delayMs: 1200,
  /** Wie oft ein fehlgeschlagener Request wiederholt wird */
  maxRetries: 4,
  /** Nach so vielen Fehlern in Folge bricht das Skript ab */
  abortAfterConsecutiveFailures: 3,
} as const;

const STATE_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '.seed-jobs-state.json',
);

/** Deutsche Großstädte (nach Einwohnerzahl). Beliebig kürzbar/erweiterbar. */
const CITIES = [
  'Berlin',
  'Hamburg',
  'München',
  'Köln',
  'Frankfurt am Main',
  'Stuttgart',
  'Düsseldorf',
  'Leipzig',
  'Dortmund',
  'Essen',
  'Bremen',
  'Dresden',
  'Hannover',
  'Nürnberg',
  'Duisburg',
  'Bochum',
  'Wuppertal',
  'Bielefeld',
  'Bonn',
  'Münster',
] as const;

// ===========================================================================
// JOB-VARIANTEN
// ===========================================================================

type Level = 'mid' | 'senior';
type Track = 'devops' | 'cloud';

interface Variant {
  track: Track;
  level: Level;
  title: (city: string) => string;
  minPay: number;
  maxPay: number;
  publicDescription: (city: string) => string;
  internalDescription: (city: string) => string;
}

const VARIANTS: Variant[] = [
  {
    track: 'devops',
    level: 'mid',
    title: (city) => `DevOps Engineer (m/w/d) – ${city}`,
    minPay: 60000,
    maxPay: 75000,
    publicDescription: (city) => `
<h3>DevOps Engineer (m/w/d) in ${city}</h3>
<p>Für unsere Kunden im Raum ${city} suchen wir DevOps Engineers, die Build- und Deployment-Prozesse nicht nur verwalten, sondern spürbar besser machen wollen.</p>
<h4>Deine Aufgaben</h4>
<ul>
  <li>Aufbau und Pflege von CI/CD-Pipelines (GitLab CI, GitHub Actions oder Jenkins)</li>
  <li>Containerisierung und Betrieb von Anwendungen mit Docker und Kubernetes</li>
  <li>Infrastructure as Code mit Terraform, Ansible oder Pulumi</li>
  <li>Monitoring und Alerting mit Prometheus, Grafana oder vergleichbaren Werkzeugen</li>
  <li>Enge Zusammenarbeit mit den Entwicklungsteams bei Release und Betrieb</li>
</ul>
<h4>Dein Profil</h4>
<ul>
  <li>Mindestens 2 Jahre Berufserfahrung im DevOps- oder Platform-Umfeld</li>
  <li>Sicherer Umgang mit Linux und mindestens einer Skriptsprache (Bash, Python, Go)</li>
  <li>Praxis mit einem der großen Cloud-Anbieter (AWS, Azure oder GCP)</li>
  <li>Deutschkenntnisse mindestens B2, gutes technisches Englisch</li>
</ul>
<h4>Was geboten wird</h4>
<ul>
  <li>Gehaltsrahmen 60.000 – 75.000 € je nach Erfahrung und Qualifikation</li>
  <li>Hybrides Arbeiten, in vielen Fällen 2–3 Remote-Tage pro Woche</li>
  <li>Zertifizierungen und Weiterbildung werden finanziert</li>
  <li>Unbefristete Festanstellung</li>
</ul>
<p>Bewirb dich gern auch dann, wenn du nicht jeden Punkt erfüllst – wir gleichen dein Profil mit mehreren offenen Mandaten ab.</p>
`.trim(),
    internalDescription: (city) => `
SPEKULATIVE ANZEIGE – Kandidatengewinnung, kein konkretes Kundenmandat.

Region: ${city}
Track: DevOps | Level: Mid (ca. 2–5 Jahre BE)
Zielgehalt: 60.000 – 75.000 € p.a.

Screening-Kriterien:
- CI/CD in Produktion aufgebaut, nicht nur genutzt
- Kubernetes über "kubectl apply" hinaus (Helm, Operators, Netzwerk)
- IaC-Erfahrung zwingend, Terraform bevorzugt
- Cloud-Provider egal, Tiefe zählt mehr als Breite
- Deutsch B2 aufwärts (Kundenanforderung in der Mehrzahl der Mandate)

Passende Mandate: Platform-/DevOps-Rollen im Mittelstand und bei Dienstleistern.
Bei Überqualifikation auf die Senior-Variante derselben Stadt umrouten.
`.trim(),
  },
  {
    track: 'devops',
    level: 'senior',
    title: (city) => `Senior DevOps Engineer (m/w/d) – ${city}`,
    minPay: 85000,
    maxPay: 110000,
    publicDescription: (city) => `
<h3>Senior DevOps Engineer (m/w/d) in ${city}</h3>
<p>Für anspruchsvolle Plattform- und Modernisierungsprojekte im Raum ${city} suchen wir erfahrene DevOps Engineers, die Architekturentscheidungen treffen und Teams technisch führen.</p>
<h4>Deine Aufgaben</h4>
<ul>
  <li>Konzeption und Betrieb skalierbarer Kubernetes-Plattformen</li>
  <li>Definition von Deployment-, Release- und Rollback-Strategien</li>
  <li>GitOps-Workflows mit ArgoCD oder Flux</li>
  <li>Security und Compliance in der Delivery-Pipeline verankern</li>
  <li>Fachliche Anleitung jüngerer Kolleginnen und Kollegen, Code- und Architektur-Reviews</li>
</ul>
<h4>Dein Profil</h4>
<ul>
  <li>Mindestens 5 Jahre Erfahrung im DevOps-, SRE- oder Platform-Engineering</li>
  <li>Tiefe Kubernetes-Kenntnisse, idealerweise mit Multi-Cluster-Setups</li>
  <li>Sehr sichere Terraform-Praxis inklusive Modulentwicklung</li>
  <li>Erfahrung mit Observability, Incident Response und Kostenoptimierung</li>
  <li>Deutschkenntnisse mindestens B2</li>
</ul>
<h4>Was geboten wird</h4>
<ul>
  <li>Gehaltsrahmen 85.000 – 110.000 € je nach Erfahrung und Verantwortung</li>
  <li>Weitgehend selbstbestimmtes Arbeiten, hoher Remote-Anteil möglich</li>
  <li>Technische Fachlaufbahn ohne Zwang zur Personalführung</li>
  <li>Budget für Konferenzen und Zertifizierungen</li>
</ul>
<p>Wir besprechen mit dir vertraulich, welche Mandate zu deinem Profil und deinen Vorstellungen passen.</p>
`.trim(),
    internalDescription: (city) => `
SPEKULATIVE ANZEIGE – Kandidatengewinnung, kein konkretes Kundenmandat.

Region: ${city}
Track: DevOps | Level: Senior (5+ Jahre BE)
Zielgehalt: 85.000 – 110.000 € p.a.

Screening-Kriterien:
- Plattform von Grund auf gebaut, nicht nur betrieben
- Multi-Cluster / Multi-Tenant Kubernetes von Vorteil
- Terraform-Module selbst geschrieben und versioniert
- Incident-Erfahrung: On-Call, Postmortems, SLO-Definition
- Seniorität muss sich in Entscheidungen zeigen, nicht nur in Jahren

Achtung: Kandidaten in diesem Band sind meist passiv und gut versorgt.
Erstkontakt über konkreten technischen Aufhänger, nicht über Gehalt.
`.trim(),
  },
  {
    track: 'cloud',
    level: 'mid',
    title: (city) => `Cloud Engineer (m/w/d) – ${city}`,
    minPay: 62000,
    maxPay: 78000,
    publicDescription: (city) => `
<h3>Cloud Engineer (m/w/d) in ${city}</h3>
<p>Im Raum ${city} suchen wir Cloud Engineers, die Infrastruktur planen, automatisieren und langfristig betreiben – von der Migration bis zum stabilen Regelbetrieb.</p>
<h4>Deine Aufgaben</h4>
<ul>
  <li>Design und Umsetzung von Cloud-Infrastruktur auf AWS, Azure oder GCP</li>
  <li>Migration bestehender Workloads aus dem Rechenzentrum in die Cloud</li>
  <li>Automatisierung mit Terraform, CloudFormation oder Bicep</li>
  <li>Netzwerk, Identity und Zugriffskonzepte sauber aufsetzen</li>
  <li>Kostenkontrolle und Rightsizing der Umgebungen</li>
</ul>
<h4>Dein Profil</h4>
<ul>
  <li>Mindestens 2 Jahre Erfahrung mit einer der großen Cloud-Plattformen</li>
  <li>Solides Verständnis von Netzwerken, DNS, Routing und Firewalling</li>
  <li>Automatisierungsdenken statt Klickarbeit in der Konsole</li>
  <li>Zertifizierungen wie AWS Solutions Architect oder Azure Administrator sind ein Plus</li>
  <li>Deutschkenntnisse mindestens B2</li>
</ul>
<h4>Was geboten wird</h4>
<ul>
  <li>Gehaltsrahmen 62.000 – 78.000 € je nach Erfahrung</li>
  <li>Flexible Arbeitszeiten und hybrides Arbeiten</li>
  <li>Bezahlte Zertifizierungspfade beim Cloud-Anbieter deiner Wahl</li>
  <li>Unbefristete Festanstellung</li>
</ul>
<p>Sprich uns an, auch wenn du gerade nur unverbindlich schaust.</p>
`.trim(),
    internalDescription: (city) => `
SPEKULATIVE ANZEIGE – Kandidatengewinnung, kein konkretes Kundenmandat.

Region: ${city}
Track: Cloud | Level: Mid (ca. 2–5 Jahre BE)
Zielgehalt: 62.000 – 78.000 € p.a.

Screening-Kriterien:
- Ein Provider in der Tiefe schlägt drei oberflächlich
- Netzwerk-Grundlagen abfragen, hier scheitern viele
- Terraform oder natives IaC-Tool des Providers
- Migrationserfahrung ist ein starkes Plus (viele Mandate sind Migrationen)
- Deutsch B2 aufwärts

Abgrenzung zu DevOps-Mid: hier liegt der Schwerpunkt auf Infrastruktur und
Netzwerk, nicht auf Build-Pipelines. Bei Pipeline-Schwerpunkt umrouten.
`.trim(),
  },
  {
    track: 'cloud',
    level: 'senior',
    title: (city) => `Senior Cloud Engineer / Cloud Architect (m/w/d) – ${city}`,
    minPay: 88000,
    maxPay: 115000,
    publicDescription: (city) => `
<h3>Senior Cloud Engineer / Cloud Architect (m/w/d) in ${city}</h3>
<p>Für Transformations- und Architekturprojekte im Raum ${city} suchen wir erfahrene Cloud-Spezialisten, die Zielbilder entwerfen und deren Umsetzung technisch verantworten.</p>
<h4>Deine Aufgaben</h4>
<ul>
  <li>Entwurf von Cloud-Zielarchitekturen inklusive Landing Zones</li>
  <li>Governance, Sicherheit und Compliance über mehrere Accounts hinweg</li>
  <li>Technische Leitung von Migrations- und Modernisierungsvorhaben</li>
  <li>FinOps: Transparenz und Steuerung der Cloud-Kosten</li>
  <li>Beratung von Fachbereichen und IT-Leitung auf Augenhöhe</li>
</ul>
<h4>Dein Profil</h4>
<ul>
  <li>Mindestens 5 Jahre Cloud-Erfahrung, davon Anteile in Architekturverantwortung</li>
  <li>Landing Zones, Multi-Account-Strukturen und Identity-Föderation aus der Praxis</li>
  <li>Sehr gute IaC-Kenntnisse, idealerweise mit eigenem Modul-Katalog</li>
  <li>Fähigkeit, technische Entscheidungen verständlich zu begründen</li>
  <li>Deutschkenntnisse mindestens C1, da beratungsnah gearbeitet wird</li>
</ul>
<h4>Was geboten wird</h4>
<ul>
  <li>Gehaltsrahmen 88.000 – 115.000 € je nach Erfahrung und Verantwortung</li>
  <li>Gestaltungsspielraum bei Technologieentscheidungen</li>
  <li>Hoher Remote-Anteil, Reisetätigkeit meist überschaubar</li>
  <li>Fachlaufbahn oder Führungslaufbahn, beides möglich</li>
</ul>
<p>Wir gleichen dein Profil vertraulich mit passenden Mandaten ab, bevor irgendetwas weitergegeben wird.</p>
`.trim(),
    internalDescription: (city) => `
SPEKULATIVE ANZEIGE – Kandidatengewinnung, kein konkretes Kundenmandat.

Region: ${city}
Track: Cloud | Level: Senior / Architect (5+ Jahre BE)
Zielgehalt: 88.000 – 115.000 € p.a.

Screening-Kriterien:
- Landing Zone selbst entworfen? Konkret nachfragen, Buzzword-Quote hoch
- Multi-Account-Governance, SCPs / Azure Policy
- FinOps-Erfahrung ist Differenzierungsmerkmal
- Beratungsnähe: C1 Deutsch faktisch Pflicht
- Zertifizierungen allein sagen in diesem Band wenig aus

Kandidaten hier oft in Beratungshäusern und wechselwillig wegen Reisetätigkeit.
Reisearmut ist das stärkste Argument, nicht Gehalt.
`.trim(),
  },
];

// ===========================================================================
// VINCERE-ANBINDUNG
// ===========================================================================

/**
 * Zwei Wege, das Skript zu authentifizieren:
 *
 * A) Bestehenden Client wiederverwenden (bevorzugt, weil Token-Refresh
 *    dort schon gelöst ist). Importzeile anpassen und postToVincere unten
 *    entsprechend umstellen:
 *
 *      import { vincereRequest } from '../src/lib/vincere';
 *
 * B) Direkt per Umgebungsvariablen (Standard unten). Dafür setzen:
 *
 *      VINCERE_TENANT=codari
 *      VINCERE_API_KEY=...
 *      VINCERE_ID_TOKEN=...      # aus der Neon-DB, gültiges id_token
 *
 * Variante B ist bewusst dumm gehalten: kein Refresh. Für einen einmaligen
 * Seed-Lauf von wenigen Minuten reicht das. Läuft der Token ab, bricht das
 * Skript sauber ab und du startest nach Refresh neu — dank State-File
 * werden bereits angelegte Jobs übersprungen.
 */

const TENANT = process.env.VINCERE_TENANT ?? 'codari';
const API_KEY = process.env.VINCERE_API_KEY ?? '';
const ID_TOKEN = process.env.VINCERE_ID_TOKEN ?? '';
const BASE_URL = `https://${TENANT}.vincere.io`;

interface VincereResult {
  ok: boolean;
  status: number;
  body: unknown;
  jobId?: number | string;
}

async function postToVincere(payload: unknown): Promise<VincereResult> {
  const res = await fetch(`${BASE_URL}${CONFIG.path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'id-token': ID_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let body: unknown = raw;
  try {
    body = JSON.parse(raw);
  } catch {
    /* Vincere antwortet nicht immer mit JSON */
  }

  const jobId =
    body && typeof body === 'object'
      ? ((body as Record<string, unknown>).id as number | undefined) ??
        ((body as Record<string, unknown>).position_id as number | undefined)
      : undefined;

  return { ok: res.ok, status: res.status, body, jobId };
}

// ===========================================================================
// PAYLOAD-BAU + VALIDIERUNG
// ===========================================================================

function isoToday(): string {
  const d = new Date();
  return `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

function buildPayload(city: string, variant: Variant) {
  return {
    job_title: variant.title(city),
    company_id: CONFIG.companyId,
    contact_id: CONFIG.contactId,
    registration_date: isoToday(),
    open_date: isoToday(),
    internal_description: variant.internalDescription(city),
    public_description: variant.publicDescription(city),
    job_type: 'PERMANENT',
    employment_type: 'FULL_TIME',
    compensation: {
      pay_type: 'SALARY',
      min_pay: variant.minPay,
      max_pay: variant.maxPay,
      currency: 'EUR',
    },
  };
}

/** Prüft Pflichtfelder, bevor irgendetwas gesendet wird. */
function validatePayload(p: ReturnType<typeof buildPayload>): string[] {
  const errors: string[] = [];
  if (!p.job_title?.trim()) errors.push('job_title leer');
  if (!Number.isInteger(p.company_id)) errors.push('company_id keine Zahl');
  if (!Number.isInteger(p.contact_id)) errors.push('contact_id keine Zahl');
  if (!p.internal_description?.trim()) errors.push('internal_description leer');
  if (!p.public_description?.trim()) errors.push('public_description leer');
  if (!/^\d{4}-\d{2}-\d{2}T/.test(p.registration_date))
    errors.push('registration_date Formatfehler');
  if (p.compensation.min_pay >= p.compensation.max_pay)
    errors.push('min_pay >= max_pay');
  return errors;
}

// ===========================================================================
// STATE
// ===========================================================================

type State = Record<string, { jobId: number | string | null; createdAt: string }>;

function loadState(): State {
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as State;
  } catch {
    console.warn('State-Datei unlesbar, starte mit leerem State.');
    return {};
  }
}

function saveState(state: State): void {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ===========================================================================
// HILFSFUNKTIONEN
// ===========================================================================

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv: string[]) {
  const get = (name: string): string | undefined => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : undefined;
  };
  const has = (name: string) => argv.includes(`--${name}`);

  const only = get('only');
  const citiesArg = get('cities');

  let cities: string[] = [...CITIES];
  if (only) cities = [only];
  else if (citiesArg) cities = citiesArg.split(',').map((c) => c.trim()).filter(Boolean);

  return {
    dryRun: has('dry-run'),
    resetState: has('reset-state'),
    cities,
  };
}

/** Sendet mit Backoff. Wiederholt nur bei 429 und 5xx. */
async function postWithRetry(payload: unknown): Promise<VincereResult> {
  let last: VincereResult | null = null;

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const result = await postToVincere(payload);
      if (result.ok) return result;
      last = result;

      const retryable = result.status === 429 || result.status >= 500;
      if (!retryable) return result;

      const wait = Math.min(30_000, 2 ** attempt * 1000);
      console.warn(
        `    HTTP ${result.status} — Versuch ${attempt}/${CONFIG.maxRetries}, warte ${wait}ms`,
      );
      await sleep(wait);
    } catch (err) {
      last = { ok: false, status: 0, body: String(err) };
      const wait = Math.min(30_000, 2 ** attempt * 1000);
      console.warn(
        `    Netzwerkfehler — Versuch ${attempt}/${CONFIG.maxRetries}, warte ${wait}ms`,
      );
      await sleep(wait);
    }
  }

  return last ?? { ok: false, status: 0, body: 'unbekannter Fehler' };
}

// ===========================================================================
// HAUPTLAUF
// ===========================================================================

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Unbekannte Städte früh melden statt still ignorieren
  const unknown = args.cities.filter(
    (c) => !(CITIES as readonly string[]).includes(c),
  );
  if (unknown.length) {
    console.warn(
      `Hinweis: nicht in der Städteliste, wird trotzdem angelegt: ${unknown.join(', ')}`,
    );
  }

  if (args.resetState && existsSync(STATE_FILE)) {
    writeFileSync(STATE_FILE, '{}', 'utf8');
    console.log('State zurückgesetzt.\n');
  }

  const state = loadState();

  if (!args.dryRun && (!API_KEY || !ID_TOKEN)) {
    console.error(
      'FEHLER: VINCERE_API_KEY und/oder VINCERE_ID_TOKEN fehlen.\n' +
        'Setze sie als Umgebungsvariablen oder nutze --dry-run.',
    );
    process.exit(1);
  }

  const tasks = args.cities.flatMap((city) =>
    VARIANTS.map((variant) => ({
      key: `${slug(city)}::${variant.track}::${variant.level}`,
      city,
      variant,
    })),
  );

  console.log(
    `${args.dryRun ? '[DRY RUN] ' : ''}${tasks.length} Anzeigen geplant ` +
      `(${args.cities.length} Städte × ${VARIANTS.length} Varianten)\n`,
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;
  let consecutiveFailures = 0;
  const failures: { key: string; status: number; body: unknown }[] = [];

  for (const [i, task] of tasks.entries()) {
    const prefix = `[${String(i + 1).padStart(3)}/${tasks.length}]`;
    const label = `${task.key}`;

    if (state[task.key]?.jobId) {
      console.log(`${prefix} ÜBERSPRUNGEN  ${label} (Job ${state[task.key].jobId})`);
      skipped++;
      continue;
    }

    const payload = buildPayload(task.city, task.variant);
    const errors = validatePayload(payload);
    if (errors.length) {
      console.error(`${prefix} UNGÜLTIG      ${label} — ${errors.join('; ')}`);
      failed++;
      failures.push({ key: task.key, status: 0, body: errors });
      continue;
    }

    if (args.dryRun) {
      console.log(`${prefix} WÜRDE ANLEGEN ${label}`);
      console.log(`        Titel:   ${payload.job_title}`);
      console.log(
        `        Gehalt:  ${payload.compensation.min_pay}–${payload.compensation.max_pay} ${payload.compensation.currency}`,
      );
      console.log(
        `        Größe:   public ${payload.public_description.length} Z., internal ${payload.internal_description.length} Z.`,
      );
      continue;
    }

    const result = await postWithRetry(payload);

    if (result.ok) {
      state[task.key] = {
        jobId: result.jobId ?? null,
        createdAt: new Date().toISOString(),
      };
      saveState(state); // nach JEDEM Erfolg speichern, nicht erst am Ende
      console.log(`${prefix} ANGELEGT      ${label} → Job ${result.jobId ?? '(ID unbekannt)'}`);
      created++;
      consecutiveFailures = 0;
    } else {
      console.error(`${prefix} FEHLER        ${label} — HTTP ${result.status}`);
      console.error(`        ${JSON.stringify(result.body).slice(0, 400)}`);
      failed++;
      consecutiveFailures++;
      failures.push({ key: task.key, status: result.status, body: result.body });

      if (consecutiveFailures >= CONFIG.abortAfterConsecutiveFailures) {
        console.error(
          `\nABBRUCH: ${consecutiveFailures} Fehler in Folge. ` +
            `Vermutlich Token abgelaufen oder Schema-Problem.\n` +
            `Bereits angelegte Jobs sind im State gesichert — einfach neu starten.`,
        );
        break;
      }
    }

    await sleep(CONFIG.delayMs);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Angelegt:      ${created}`);
  console.log(`Übersprungen:  ${skipped}`);
  console.log(`Fehlgeschlagen:${failed}`);
  console.log('─'.repeat(60));

  if (failures.length) {
    console.log('\nFehlgeschlagene Einträge:');
    for (const f of failures) {
      console.log(`  ${f.key} (HTTP ${f.status})`);
    }
    console.log('\nErneut ausführen — Erfolgreiche werden übersprungen.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Unerwarteter Fehler:', err);
  process.exit(1);
});
