const path = require('path');
const Koa = require('koa');
const koaStatic = require('koa-static');

const app = new Koa();

const dirPublic = path.join(__dirname, 'public');
app.use(koaStatic(dirPublic));

app.use(async (ctx) => {
  ctx.body = 'Hello!';
});

const PORT = process.env.PORT || 3000;
// eslint-disable-next-line no-console
app.listen(PORT, () => console.log(`Koa server has been started on port ${PORT} ...`));
