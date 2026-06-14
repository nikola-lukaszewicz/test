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

## Funkcje

- **Hierarchia kategorii** — zadania grupowane wg ważności: Praca → Spotkania → Wizyty → Inne → Obowiązki domowe (na końcu), wewnątrz wg priorytetu i terminu.
- **Priorytety** (niski / średni / wysoki) z kolorami.
- **Terminy + kalendarz** miesięczny z kropkami i filtrowaniem po dniu; podświetlanie zaległych i dzisiejszych zadań.
- **Szacowany czas** wykonania + sumy przy grupach i w nagłówku.
- **Zadania powtarzalne** (codziennie / co tydzień) — po ukończeniu automatycznie tworzy się następne wystąpienie.
- **Wykrywanie nawyków** — czynności ukończone ≥3 razy są proponowane jako powtarzalne przypomnienia.
- **Powiadomienia w przeglądarce** (gdy karta otwarta) oraz **na telefon przez Telegram** (gdy zadanie nie zostało odhaczone na czas).

## Powiadomienia na telefon (Telegram)

Opcjonalne — bez konfiguracji aplikacja działa normalnie (tylko powiadomienia w przeglądarce).

1. `cp apps/api/.env.example apps/api/.env`
2. Na Telegramie napisz do **@BotFather** → `/newbot` → skopiuj **token**.
3. Napisz cokolwiek do swojego nowego bota, potem otwórz w przeglądarce
   `https://api.telegram.org/bot<TOKEN>/getUpdates` i znajdź `"chat":{"id": ...}`.
4. Wpisz `TELEGRAM_BOT_TOKEN` i `TELEGRAM_CHAT_ID` w `apps/api/.env`.
5. Zrestartuj `pnpm dev`. Backend co `NOTIFY_INTERVAL_MINUTES` (domyślnie 30) sprawdza
   zaległe / dzisiejsze niezrobione zadania i wysyła przypomnienie na Telegram.

## Baza danych

SQLite przez [Prisma](https://www.prisma.io/) (plik `apps/api/prisma/dev.db`). Migracje uruchamiają się
automatycznie przy `pnpm dev`. Przydatne:

```bash
cd apps/api
pnpm db:studio   # przeglądarka danych Prisma Studio
```

## Testy (E2E)

Testy end-to-end pokrywają wszystkie przepływy API (Jest + supertest, izolowana
testowa baza SQLite `prisma/test.db`):

```bash
pnpm test                 # uruchom z roota (przez Turbo)
# lub:
cd apps/api && pnpm test:e2e
```

Zakres (37 testów):
- **CRUD** — tworzenie, odczyt, aktualizacja, usuwanie, kody 201/200/204/404
- **Walidacja** — pusty tytuł, złe enum-y (priorytet/kategoria/powtarzalność), zła data, czas < 1, nieznane pola
- **Hierarchia sortowania** — kategoria → termin → priorytet, ukończone na końcu
- **Powtarzalność** — ukończenie tworzy kolejne wystąpienie (+1 dzień / +7 dni)
- **Nawyki** — próg 3 ukończeń, normalizacja tytułu, flaga `alreadyTracked`
- **Statystyki** — totals, podział wg kategorii, ostatnie 7 dni
- **Streaki** — bieżący i najdłuższy, przerwanie, „żywy" gdy zrobiono wczoraj

## Inne komendy

```bash
pnpm build   # build obu aplikacji
pnpm lint    # lint obu aplikacji
```
