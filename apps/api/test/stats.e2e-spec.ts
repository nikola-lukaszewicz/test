import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, isoOffset, resetDb } from './utils';

describe('Statystyki i streaki (e2e)', () => {
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

  // wstawia ukończenie z konkretną datą (do testów streaków)
  async function logCompletion(title: string, daysAgo: number, category = 'dom') {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(9, 0, 0, 0);
    await prisma.completionLog.create({
      data: { titleKey: title.toLowerCase(), title, category, completedAt: d },
    });
  }

  describe('GET /api/todos/stats – totals', () => {
    it('liczy total/completed/active/overdue/rate', async () => {
      await http.post('/api/todos').send({ title: 'A', category: 'praca' });
      await http.post('/api/todos').send({ title: 'B', category: 'dom', dueDate: isoOffset(-2) });
      const c = await http.post('/api/todos').send({ title: 'C', category: 'praca' });
      await http.patch(`/api/todos/${c.body.id}`).send({ completed: true });

      const res = await http.get('/api/todos/stats').expect(200);
      expect(res.body.totals).toEqual({
        total: 3,
        completed: 1,
        active: 2,
        overdue: 1, // B z terminem w przeszłości, nieukończone
        completionRate: 33,
      });
    });

    it('rate = 0 dla pustej listy', async () => {
      const res = await http.get('/api/todos/stats').expect(200);
      expect(res.body.totals).toEqual({
        total: 0,
        completed: 0,
        active: 0,
        overdue: 0,
        completionRate: 0,
      });
    });
  });

  describe('GET /api/todos/stats – byCategory', () => {
    it('grupuje liczby wg kategorii (tylko niepuste)', async () => {
      await http.post('/api/todos').send({ title: 'p1', category: 'praca' });
      const p2 = await http.post('/api/todos').send({ title: 'p2', category: 'praca' });
      await http.patch(`/api/todos/${p2.body.id}`).send({ completed: true });
      await http.post('/api/todos').send({ title: 'd1', category: 'dom' });

      const res = await http.get('/api/todos/stats').expect(200);
      expect(res.body.byCategory).toEqual([
        { category: 'praca', total: 2, completed: 1 },
        { category: 'dom', total: 1, completed: 0 },
      ]);
    });
  });

  describe('GET /api/todos/stats – last7Days', () => {
    it('zwraca 7 dni, ostatni to dziś z liczbą dzisiejszych ukończeń', async () => {
      const a = await http.post('/api/todos').send({ title: 'x' });
      const b = await http.post('/api/todos').send({ title: 'y' });
      await http.patch(`/api/todos/${a.body.id}`).send({ completed: true });
      await http.patch(`/api/todos/${b.body.id}`).send({ completed: true });

      const res = await http.get('/api/todos/stats').expect(200);
      expect(res.body.last7Days).toHaveLength(7);
      const last = res.body.last7Days[6];
      expect(last.date).toBe(isoOffset(0));
      expect(last.count).toBe(2);
    });
  });

  describe('GET /api/todos/stats – streaki', () => {
    it('liczy bieżący i najdłuższy streak dla ciągłych dni', async () => {
      await logCompletion('Joga', 0);
      await logCompletion('Joga', 1);
      await logCompletion('Joga', 2);

      const res = await http.get('/api/todos/stats').expect(200);
      const joga = res.body.streaks.find((s: any) => s.title === 'Joga');
      expect(joga).toMatchObject({ current: 3, longest: 3 });
    });

    it('przerwany streak: current = 0, longest zachowany', async () => {
      await logCompletion('Plywanie', 3);
      await logCompletion('Plywanie', 4);
      await logCompletion('Plywanie', 5);

      const res = await http.get('/api/todos/stats').expect(200);
      const p = res.body.streaks.find((s: any) => s.title === 'Plywanie');
      expect(p).toMatchObject({ current: 0, longest: 3 });
    });

    it('streak żyje, gdy zrobiono wczoraj (jeszcze nie dziś)', async () => {
      await logCompletion('Pisanie', 1);
      await logCompletion('Pisanie', 2);

      const res = await http.get('/api/todos/stats').expect(200);
      const p = res.body.streaks.find((s: any) => s.title === 'Pisanie');
      expect(p).toMatchObject({ current: 2, longest: 2 });
    });

    it('pomija czynności wykonane tylko jednego dnia (brak streaka)', async () => {
      await logCompletion('Raz', 0);
      const res = await http.get('/api/todos/stats').expect(200);
      expect(res.body.streaks.find((s: any) => s.title === 'Raz')).toBeUndefined();
    });
  });
});
