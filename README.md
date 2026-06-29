# RecruiterAgent 🤖

Dein persönlicher KI-Assistent für die Personalberatung. Claude claude-sonnet-4-6 + Next.js 15 + Vercel.

## Was der Agent kann

```
"Speicher: Max Mustermann, Java-Entwickler bei SAP, Hamburg, linkedin.com/in/..."
"Suche mir alle Senior Entwickler in NRW"
"Erstell einen Anschreiben-Entwurf für Mustermann, Stelle Backend Engineer bei BMW"
"Leg das Unternehmen TechGmbH an, Ansprechpartner Frau Müller, mueller@techgmbh.de"
"Was ist der Stand meiner Pipeline?"
"Update Mustermann auf Status Interview"
```

## Setup

### 1. Dependencies
```bash
npm install
cp .env.example .env.local
# .env.local ausfüllen (ANTHROPIC_API_KEY + DATABASE_URL)
```

### 2. Datenbank (Neon - kostenlos)
1. https://neon.tech → kostenloses Konto
2. Neues Projekt → Connection String kopieren → als DATABASE_URL eintragen
3. `npx prisma db push`

### 3. Starten
```bash
npm run dev
# http://localhost:3000
```

## Vercel Deployment

1. GitHub-Repo pushen
2. https://vercel.com/new → Repo importieren
3. Env-Variablen eintragen: ANTHROPIC_API_KEY + DATABASE_URL
4. Deploy → fertig (auch auf dem Handy nutzbar als PWA)

## Umgebungsvariablen

| Variable | Wo her |
|----------|--------|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `DATABASE_URL` | https://neon.tech |

## Wichtig: Sicherheit

- **Kein automatischer E-Mail-Versand** – Anschreiben werden als Entwurf gespeichert
- Du versendest alle E-Mails manuell über Outlook
- Deine Daten liegen nur in deiner eigenen Neon-Datenbank
