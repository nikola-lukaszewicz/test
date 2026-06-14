import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Todo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';

const RENOTIFY_AFTER_MS = 20 * 60 * 60 * 1000; // ponów najwyżej raz na ~dobę

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit() {
    if (!this.telegram.enabled) {
      this.logger.log('Powiadomienia Telegram wyłączone (uzupełnij .env, aby włączyć).');
      return;
    }

    const minutes = Number(process.env.NOTIFY_INTERVAL_MINUTES ?? 30) || 30;
    const intervalMs = minutes * 60 * 1000;

    const interval = setInterval(() => {
      this.checkOverdue().catch((e) => this.logger.error(e));
    }, intervalMs);
    this.scheduler.addInterval('overdue-check', interval);

    this.logger.log(`Powiadomienia Telegram włączone (sprawdzanie co ${minutes} min).`);
    // pierwszy bieg po chwili od startu
    setTimeout(() => this.checkOverdue().catch((e) => this.logger.error(e)), 10_000);
  }

  private todayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  }

  async checkOverdue(): Promise<void> {
    const today = this.todayISO();

    const candidates = await this.prisma.todo.findMany({
      where: {
        completed: false,
        dueDate: { not: null, lte: today },
      },
    });

    const now = Date.now();
    const toNotify = candidates.filter(
      (t) => !t.lastNotifiedAt || now - t.lastNotifiedAt.getTime() > RENOTIFY_AFTER_MS,
    );

    if (toNotify.length === 0) return;

    const overdue = toNotify.filter((t) => t.dueDate! < today);
    const dueToday = toNotify.filter((t) => t.dueDate === today);

    const message = this.buildMessage(overdue, dueToday);
    const sent = await this.telegram.send(message);

    if (sent) {
      await this.prisma.todo.updateMany({
        where: { id: { in: toNotify.map((t) => t.id) } },
        data: { lastNotifiedAt: new Date() },
      });
      this.logger.log(`Wysłano przypomnienie o ${toNotify.length} zadaniach.`);
    }
  }

  private buildMessage(overdue: Todo[], dueToday: Todo[]): string {
    const line = (t: Todo) => {
      const est = t.estimatedMinutes ? ` (~${t.estimatedMinutes} min)` : '';
      return `• ${this.escape(t.title)}${est}`;
    };

    const parts: string[] = ['<b>📋 Przypomnienie o zadaniach</b>'];
    if (overdue.length) {
      parts.push(`\n<b>⏰ Zaległe (${overdue.length}):</b>\n${overdue.map(line).join('\n')}`);
    }
    if (dueToday.length) {
      parts.push(`\n<b>📅 Na dziś (${dueToday.length}):</b>\n${dueToday.map(line).join('\n')}`);
    }
    return parts.join('\n');
  }

  private escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
