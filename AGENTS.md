# AGENTS.md — Ocellus

Elite Dangerous commodity market search (Inara.cz). MCP server (SSE) + CLI + interactive REPL.
Nodemon auto-restarts the MCP server on file edits (`npm run mcp`).

## Quick Reference

| Tool | Description |
|---|---|
| `search_commodity` | Find stations buying/selling a commodity near a system. See README.md for full parameter table. |
| `clearcache` | Clear in-memory cache. Takes no arguments. |

## Referenced Documentation

| File | What it covers |
|---|---|
| [README.md](./README.md) | Installation, MCP/CLI usage, full parameter table, REPL commands |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Design, project structure, future expansion plans |
| [.kilo/skills/using-ocellus/SKILL.md](./.kilo/skills/using-ocellus/SKILL.md) | NL query syntax, trade route calculation, travel time tables |

## Agent Notes

- Load the `using-ocellus` skill for NL syntax and route calculation logic
- Nodemon watches `src/` for changes and restarts the MCP server
- MCP tools are registered via Zod schemas in `src/main/mcp/commodity-market.js`
- CLI entry point: `src/main/Ocellus.js` detects `--cli` flag and delegates
