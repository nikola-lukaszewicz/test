import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  private readonly chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  get enabled(): boolean {
    return !!this.token && !!this.chatId;
  }

  async send(text: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug('Telegram wyłączony (brak TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).');
      return false;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      if (!res.ok) {
        this.logger.warn(`Telegram API zwróciło ${res.status}: ${await res.text()}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Błąd wysyłki Telegram: ${(err as Error).message}`);
      return false;
    }
  }
}
