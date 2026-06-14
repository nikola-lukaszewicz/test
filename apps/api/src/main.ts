import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Globalny prefix — wszystkie endpointy pod /api
  app.setGlobalPrefix('api');

  // Walidacja DTO na podstawie dekoratorów class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS — przydatne gdy frontend odpalony bez proxy
  app.enableCors({ origin: true });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 API działa na http://localhost:${port}/api`);
}

bootstrap();
