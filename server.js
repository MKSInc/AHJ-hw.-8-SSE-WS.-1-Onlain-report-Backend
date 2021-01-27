/* eslint-disable max-len */
const path = require('path');
const Koa = require('koa');
const koaStatic = require('koa-static');
const Router = require('koa-router');
const { streamEvents } = require('http-event-stream');
const { Game } = require('./src/Game');

const app = new Koa();

app.use(async (ctx, next) => {
  ctx.response.set('Access-Control-Allow-Origin', '*');
  console.log('start');
  await next();
});

const dirPublic = path.join(__dirname, 'public');
app.use(koaStatic(dirPublic));

const router = new Router();

const events2 = [{
  id: 'qq1',
  data: 'test',
}, {
  id: 'aa',
  data: 'test2',
}];

const game = new Game();
game.start();

router.get('/events', async (ctx) => {
  console.log('ctx.params.id', ctx.params.id);
  ctx.response.body = JSON.stringify(game.events);
  game.lastSentEvent = game.events[game.events.length - 1];
});

router.get('/restart', async (ctx) => {
  console.log('Game has been restarted');
  game.restart();
  ctx.body = 'Game has been restarted';
});

router.get('/sse', async (ctx) => {
  console.log('Start /sse');
  await streamEvents(ctx.req, ctx.res, {
    // 1. Если разорвать соединение, отсоеденив кабель на десктопе или отключив мобильную сеть, то
    // пропущенные сообщения после восстановления связи доставяться автоматически (без участия fetch).
    // 2. Если разорвать соединение в настройках сети на десктопе, то тогда срабатывает fetch, в этом
    // случае нужно самому вычислить пропущенные сообщения, используя lastEventId, и отправить их
    // через return. Если восстановить связь после того как
    async fetch(lastEventId) {
      console.log('lastEventId:', lastEventId);
      const lastEventIndex = game.events.findIndex((event) => event.id === lastEventId);
      console.log('lastEventIndex:', lastEventIndex);
      game.lastSentEvent = game.events[game.events.length - 1];
      const result = game.events.splice(lastEventIndex);
      console.log('return result', result);
      console.log('!!!!!!!!!!!!!!');
      return [{ id: 'fetch', data: 'from fetch' }];
      // return game.events.splice(lastEventIndex);
    },
    stream(sse) {
      console.log('Request');
      const interval = setInterval(() => {
        console.log(`Event send ${game.eventsCount}`);
        // console.log(game);
        if (!game.lastSentEvent) {
          console.log('SSE send events[0]');
          sse.sendEvent(game.events[0]);
          game.lastSentEvent = game.events[0];
        } else {
          const lastSentEventIndex = game.events.findIndex((event) => event.id === game.lastSentEvent.id);
          // Проверяем, появилось ли новое событие после последнего отправленного.
          if (lastSentEventIndex + 1 < game.events.length) {
            const event = game.events[lastSentEventIndex + 1];
            console.log(`{ id: ${event.id}, event: ${event.event} }`);
            sse.sendEvent(event);
            game.lastSentEvent = event;
          }
          // Если это событие завершающее игру, то хорошо бы закрыть поток на стороне сервера, но ...
          if (game.lastSentEvent.event === 'end') {
            // eslint-disable-next-line no-console
            console.log('End game, end stream');
            clearInterval(interval);
            ctx.res.status = 204; // Ни чего не дает (возможно, не правильно использую).
            sse.close(); // Закрывает поток, но браузер переподключается по новой.
            // Поэтому приходится закрывать на стороне клента (streamSSE.close()).
          }
        }
      }, 2000);

      return () => {
        // Эта функция сработает в случае закрытия потока на стороне клиента (streamSSE.close()).
        // eslint-disable-next-line no-console
        console.log('Stream closed on client');
        clearInterval(interval);
      };
    },
  });

  ctx.respond = false;
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
// eslint-disable-next-line no-console
app.listen(PORT, () => console.log(`Koa server has been started on port ${PORT} ...`));
