import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, isoOffset, resetDb } from './utils';

describe('Powtarzalność i nawyki (e2e)', () => {
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

  // pomocnik: utwórz i od razu ukończ zadanie
  async function createAndComplete(title: string, extra: Record<string, unknown> = {}) {
    const created = await http.post('/api/todos').send({ title, ...extra });
    await http.patch(`/api/todos/${created.body.id}`).send({ completed: true });
    return created.body;
  }

  describe('Powtarzalność', () => {
    it('ukończenie zadania dziennego tworzy kolejne wystąpienie na następny dzień', async () => {
      const today = isoOffset(0);
      await createAndComplete('Ćwiczenia', { recurrence: 'daily', dueDate: today, category: 'dom' });

      const list = await http.get('/api/todos').expect(200);
      const cwiczenia = list.body.filter((t: any) => t.title === 'Ćwiczenia');
      expect(cwiczenia).toHaveLength(2); // ukończone + nowe

      const next = cwiczenia.find((t: any) => !t.completed);
      expect(next).toBeDefined();
      expect(next.dueDate).toBe(isoOffset(1));
      expect(next.recurrence).toBe('daily');
    });

    it('zadanie tygodniowe tworzy wystąpienie +7 dni', async () => {
      await createAndComplete('Sprzątanie', { recurrence: 'weekly', dueDate: isoOffset(0) });
      const list = await http.get('/api/todos').expect(200);
      const next = list.body.find((t: any) => t.title === 'Sprzątanie' && !t.completed);
      expect(next.dueDate).toBe(isoOffset(7));
    });

    it('zadanie bez powtarzalności nie tworzy kolejnego wystąpienia', async () => {
      await createAndComplete('Jednorazowe', { dueDate: isoOffset(0) });
      const list = await http.get('/api/todos').expect(200);
      expect(list.body.filter((t: any) => t.title === 'Jednorazowe')).toHaveLength(1);
    });
  });

  describe('GET /api/todos/habits – wykrywanie nawyków', () => {
    it('nie wykrywa nawyku poniżej progu (2 ukończenia)', async () => {
      await createAndComplete('Czytanie');
      await createAndComplete('Czytanie');
      const res = await http.get('/api/todos/habits').expect(200);
      expect(res.body).toEqual([]);
    });

    it('wykrywa nawyk po 3 ukończeniach tego samego tytułu', async () => {
      await createAndComplete('Medytacja', { category: 'dom' });
      await createAndComplete('Medytacja', { category: 'dom' });
      await createAndComplete('Medytacja', { category: 'dom' });

      const res = await http.get('/api/todos/habits').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        title: 'Medytacja',
        category: 'dom',
        count: 3,
        alreadyTracked: false,
      });
    });

    it('normalizuje tytuł (wielkość liter / spacje) przy zliczaniu', async () => {
      await createAndComplete('Bieganie');
      await createAndComplete('  bieganie ');
      await createAndComplete('BIEGANIE');
      const res = await http.get('/api/todos/habits').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].count).toBe(3);
    });

    it('oznacza nawyk jako alreadyTracked, gdy istnieje zadanie powtarzalne o tym tytule', async () => {
      await createAndComplete('Spacer');
      await createAndComplete('Spacer');
      await createAndComplete('Spacer');
      // utwórz powtarzalne zadanie o tym samym tytule
      await http.post('/api/todos').send({ title: 'Spacer', recurrence: 'daily', dueDate: isoOffset(0) });

      const res = await http.get('/api/todos/habits').expect(200);
      const spacer = res.body.find((h: any) => h.title === 'Spacer');
      expect(spacer.alreadyTracked).toBe(true);
    });
  });
});
