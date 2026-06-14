import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, isoOffset, resetDb } from './utils';

describe('Todos – CRUD, walidacja, hierarchia (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  // ---------- Tworzenie ----------
  describe('POST /api/todos', () => {
    it('tworzy zadanie z domyślnymi wartościami', async () => {
      const res = await http.post('/api/todos').send({ title: '  Kup mleko  ' }).expect(201);
      expect(res.body).toMatchObject({
        title: 'Kup mleko', // przycięte
        completed: false,
        priority: 'medium',
        category: 'inne',
        dueDate: null,
        estimatedMinutes: null,
        recurrence: null,
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
    });

    it('zapisuje wszystkie pola', async () => {
      const res = await http
        .post('/api/todos')
        .send({
          title: 'Raport',
          priority: 'high',
          category: 'praca',
          dueDate: '2026-06-20',
          estimatedMinutes: 90,
          recurrence: 'weekly',
        })
        .expect(201);
      expect(res.body).toMatchObject({
        priority: 'high',
        category: 'praca',
        dueDate: '2026-06-20',
        estimatedMinutes: 90,
        recurrence: 'weekly',
      });
    });

    it.each([
      ['pusty tytuł', { title: '' }],
      ['brak tytułu', {}],
      ['zły priorytet', { title: 'x', priority: 'urgent' }],
      ['zła kategoria', { title: 'x', category: 'zakupy' }],
      ['zła powtarzalność', { title: 'x', recurrence: 'hourly' }],
      ['zła data', { title: 'x', dueDate: 'not-a-date' }],
      ['czas < 1', { title: 'x', estimatedMinutes: 0 }],
      ['nieznane pole', { title: 'x', foo: 'bar' }],
    ])('odrzuca niepoprawne dane: %s', async (_label, payload) => {
      await http.post('/api/todos').send(payload).expect(400);
    });
  });

  // ---------- Odczyt + hierarchia ----------
  describe('GET /api/todos – sortowanie hierarchiczne', () => {
    it('sortuje wg kategorii: praca → spotkanie → wizyta → inne → dom', async () => {
      await http.post('/api/todos').send({ title: 'D', category: 'dom' });
      await http.post('/api/todos').send({ title: 'P', category: 'praca' });
      await http.post('/api/todos').send({ title: 'W', category: 'wizyta' });
      await http.post('/api/todos').send({ title: 'I', category: 'inne' });
      await http.post('/api/todos').send({ title: 'S', category: 'spotkanie' });

      const res = await http.get('/api/todos').expect(200);
      expect(res.body.map((t: any) => t.title)).toEqual(['P', 'S', 'W', 'I', 'D']);
    });

    it('w obrębie kategorii sortuje wg priorytetu (bez terminu)', async () => {
      await http.post('/api/todos').send({ title: 'low', category: 'praca', priority: 'low' });
      await http.post('/api/todos').send({ title: 'high', category: 'praca', priority: 'high' });
      await http.post('/api/todos').send({ title: 'med', category: 'praca', priority: 'medium' });

      const res = await http.get('/api/todos').expect(200);
      expect(res.body.map((t: any) => t.title)).toEqual(['high', 'med', 'low']);
    });

    it('termin ma pierwszeństwo przed priorytetem; wcześniejszy termin wyżej', async () => {
      await http
        .post('/api/todos')
        .send({ title: 'later-high', category: 'praca', priority: 'high', dueDate: '2026-07-01' });
      await http
        .post('/api/todos')
        .send({ title: 'sooner-low', category: 'praca', priority: 'low', dueDate: '2026-06-15' });

      const res = await http.get('/api/todos').expect(200);
      expect(res.body.map((t: any) => t.title)).toEqual(['sooner-low', 'later-high']);
    });

    it('ukończone zadania trafiają na koniec', async () => {
      const done = await http.post('/api/todos').send({ title: 'zrobione', category: 'praca' });
      await http.patch(`/api/todos/${done.body.id}`).send({ completed: true });
      await http.post('/api/todos').send({ title: 'aktywne', category: 'dom' });

      const res = await http.get('/api/todos').expect(200);
      expect(res.body.map((t: any) => t.title)).toEqual(['aktywne', 'zrobione']);
    });
  });

  describe('GET /api/todos/:id', () => {
    it('zwraca pojedyncze zadanie', async () => {
      const created = await http.post('/api/todos').send({ title: 'jedno' });
      const res = await http.get(`/api/todos/${created.body.id}`).expect(200);
      expect(res.body.title).toBe('jedno');
    });

    it('zwraca 404 dla nieistniejącego id', async () => {
      await http.get('/api/todos/nieistnieje').expect(404);
    });
  });

  // ---------- Aktualizacja ----------
  describe('PATCH /api/todos/:id', () => {
    it('aktualizuje pola i ustawia completedAt przy ukończeniu', async () => {
      const created = await http.post('/api/todos').send({ title: 'edytuj' });
      const res = await http
        .patch(`/api/todos/${created.body.id}`)
        .send({ title: 'po edycji', priority: 'high', completed: true })
        .expect(200);
      expect(res.body.title).toBe('po edycji');
      expect(res.body.priority).toBe('high');
      expect(res.body.completed).toBe(true);
      expect(res.body.completedAt).not.toBeNull();
    });

    it('czyści termin po przesłaniu null', async () => {
      const created = await http.post('/api/todos').send({ title: 'z terminem', dueDate: isoOffset(1) });
      const res = await http.patch(`/api/todos/${created.body.id}`).send({ dueDate: null }).expect(200);
      expect(res.body.dueDate).toBeNull();
    });

    it('cofnięcie ukończenia zeruje completedAt', async () => {
      const created = await http.post('/api/todos').send({ title: 'toggle' });
      await http.patch(`/api/todos/${created.body.id}`).send({ completed: true });
      const res = await http
        .patch(`/api/todos/${created.body.id}`)
        .send({ completed: false })
        .expect(200);
      expect(res.body.completed).toBe(false);
      expect(res.body.completedAt).toBeNull();
    });

    it('zwraca 404 przy aktualizacji nieistniejącego', async () => {
      await http.patch('/api/todos/nope').send({ title: 'x' }).expect(404);
    });
  });

  // ---------- Usuwanie ----------
  describe('DELETE /api/todos/:id', () => {
    it('usuwa zadanie (204) i potem zwraca 404', async () => {
      const created = await http.post('/api/todos').send({ title: 'do usunięcia' });
      await http.delete(`/api/todos/${created.body.id}`).expect(204);
      await http.get(`/api/todos/${created.body.id}`).expect(404);
    });

    it('zwraca 404 przy usuwaniu nieistniejącego', async () => {
      await http.delete('/api/todos/nope').expect(404);
    });
  });
});
