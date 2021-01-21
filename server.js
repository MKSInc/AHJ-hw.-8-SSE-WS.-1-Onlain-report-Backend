const path = require('path');
const Koa = require('koa');
const koaStatic = require('koa-static');
const Router = require('koa-router');
const { streamEvents } = require('http-event-stream');
const { nanoid } = require('nanoid');

const app = new Koa();

const dirPublic = path.join(__dirname, 'public');
app.use(koaStatic(dirPublic));

app.use(async (ctx, next) => {
  ctx.response.set('Access-Control-Allow-Origin', '*');
  await next();
});

const router = new Router();
app.use(router.routes());
app.use(router.allowedMethods());

let i = 0;
let eventId = 0;
const events = [];
const events2 = [{
  id: 'qq',
  data: 'test',
}, {
  id: 'aa',
  data: 'test2',
}];

router.get('/sse', async (ctx) => {
  streamEvents(ctx.req, ctx.res, {
    async fetch(lastEventId) {
      console.log('lastEventId:', lastEventId);
      const lastEventIndex = events.findIndex((event) => event.id === lastEventId);
      console.log('lastEventIndex:', lastEventIndex);
      return events2;
    },
    stream(sse) {
      const interval = setInterval(() => {
        const event = {
          id: eventId,
          data: `Message ${i}`,
        };
        console.log(event.data);
        sse.sendEvent(event);
        events.push(event);
        i += 1;
        eventId += 1;
      }, 2000);
      return () => clearInterval(interval);
    },
  });

  ctx.respond = false;
});
/*
app.use(async (ctx) => {
  ctx.body = 'Hello!';
});
*/
const PORT = process.env.PORT || 3000;
// eslint-disable-next-line no-console
app.listen(PORT, () => console.log(`Koa server has been started on port ${PORT} ...`));
