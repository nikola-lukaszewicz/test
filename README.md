# Todo List — NestJS + React (Turborepo)

Monorepo z aplikacją do zarządzania zadaniami (todo list).

- **`apps/api`** — backend [NestJS](https://nestjs.com/) (REST API, port `3001`)
- **`apps/web`** — frontend [React](https://react.dev/) + [Vite](https://vitejs.dev/) (port `5173`)

Zarządzane przez [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/) workspaces.

## Wymagania

- Node.js `>= 20`
- pnpm `>= 10` (`npm install -g pnpm`)

## Instalacja

```bash
pnpm install
```

## Uruchomienie (jedna komenda)

```bash
pnpm dev
```

To odpala **jednocześnie** backend i frontend:

- API:  http://localhost:3001/api
- Web:  http://localhost:5173

Frontend ma skonfigurowane proxy — zapytania z `/api` są przekierowywane do backendu, więc nie ma problemów z CORS w trakcie developmentu.

## Inne komendy

```bash
pnpm build   # build obu aplikacji
pnpm lint    # lint obu aplikacji
```
