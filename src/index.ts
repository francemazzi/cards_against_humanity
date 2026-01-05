import 'dotenv/config';
import { createServer, startServer, stopServer } from './server/Server.js';

const fastify = createServer();

startServer(fastify).catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await stopServer(fastify);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await stopServer(fastify);
  process.exit(0);
});

