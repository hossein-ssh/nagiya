import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { authRouter } from './server/routes/auth.ts';
import { usersRouter } from './server/routes/users.ts';
import { attendanceRouter } from './server/routes/attendance.ts';
import { activitiesRouter } from './server/routes/activities.ts';
import { noticesRouter } from './server/routes/notices.ts';
import { pointsRouter } from './server/routes/points.ts';
import { auditRouter } from './server/routes/audit.ts';
import { systemRouter } from './server/routes/system.ts';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Parse JSON request bodies with support for image base64
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routers
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/points', pointsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/system', systemRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  // Always serve public assets if public directory exists
  const publicPath = path.resolve(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  const distPath = path.resolve(process.cwd(), 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

  if (isProduction && hasDist) {
    // Production mode with built assets
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'مسیر API مورد نظر یافت نشد.' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development mode or fallback if dist has not been compiled yet
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[سرور] سامانه با موفقیت بر روی پورت ${PORT} راه‌اندازی شد.`);
    console.log(`[سرور] آدرس: http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
