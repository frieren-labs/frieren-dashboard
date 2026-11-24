# frieren-dashboard

Read-only web dashboard for `frieren.db`, the SQLite database owned by
[frieren-desk](https://github.com/frieren-labs/frieren-desk).

Scope: query everything in the DB and review its state. Nothing here writes:
the schema belongs to frieren-desk (`hooks/frieren-log.sh` for `turns`/`tools`
/`daily`, `shell.qml` for `conversations`/`messages`/`reminders`). This project
opens the file with `readOnly: true` plus `PRAGMA query_only = ON`, and never
runs `CREATE`/`INSERT`/`UPDATE`. Fresh DBs with missing tables render empty.

Tables covered: `turns`, `tools` (+ `daily` aggregation computed inline),
`conversations`, `messages` (+ FTS5 search with `LIKE` fallback), `reminders`,
`reminder_events` (counts). The `memory_hits` table from
frieren-desk#32 (phase 2) does not exist yet; when it lands it gets a page here.

## Develop

```bash
pnpm install
pnpm dev      # http://localhost:4321
```

Database resolution: `FRIEREN_DB` env, else
`${XDG_STATE_HOME:-$HOME/.local/state}/frieren/frieren.db`.

## Build / run

```bash
pnpm build
node ./dist/server/entry.mjs   # PORT=4321, HOST=127.0.0.1
```

JSON for scripts (parity with `frieren-stats --json`):

```bash
curl 'http://localhost:4321/api/overview.json?days=14'
```
