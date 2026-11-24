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

## Related

- [frieren-desk](https://github.com/frieren-labs/frieren-desk) owns the database:
  `hooks/frieren-log.sh` writes `turns`/`tools`, `shell.qml` writes
  `conversations`/`messages`/`reminders`. This project never writes.
- [frieren-desk#32](https://github.com/frieren-labs/frieren-desk/issues/32)
  tracks durable memory with a usage dashboard. The activity half lives here;
  the `memory_hits` half lands here once the desk side creates the table.
