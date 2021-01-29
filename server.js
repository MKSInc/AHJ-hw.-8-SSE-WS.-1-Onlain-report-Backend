/* eslint-disable max-len */
const path = require('path');
const Koa = require('koa');
const koaStatic = require('koa-static');
const Router = require('koa-router');
const { streamEvents } = require('http-event-stream');
const { Game } = require('./src/Game');
const { getMissedEvents, toEventSSE } = require('./src/getMissedEvents');

const game = new Game();
game.start();

const app = new Koa();

app.use(async (ctx, next) => {
  // Так как frontend на ходится на сервере, то CORS не нужен.
  // ctx.response.set('Access-Control-Allow-Origin', '*');
  await next();
});

const dirPublic = path.join(__dirname, 'public');
app.use(koaStatic(dirPublic));

const router = new Router();

// Возвращает пользователю произошедшие события, если он зашел на трансляцию после её начала
// или обновил страницу.
router.get('/events', async (ctx) => {
  ctx.response.body = JSON.stringify(game.events);
  game.lastSentEvent = game.events[game.events.length - 1];
});

router.get('/restart', async (ctx) => {
  // eslint-disable-next-line no-console
  console.log('Game has been restarted');
  game.restart();
  ctx.body = 'Game has been restarted';
});

router.get('/sse', async (ctx) => {
  await streamEvents(ctx.req, ctx.res, {
    // 1. Если разорвать соединение, отсоеденив кабель, то пропущенные сообщения после
    //    восстановления связи доставяться автоматически (без участия fetch).
    // 2. Если разорвать соединение в настройках сети компьютера или отключить мобильную связь,
    //    то тогда срабатает fetch, в этом случае нужно самому вычислить пропущенные сообщения,
    //    используя lastEventId, и отправить их через return.
    // 3. В случае разрыва соединения в настройках сети компьютера, и после ее восстановления,
    //    пропущенные собщения доставляются через fetch и сразу после этого иногда возникает
    //    ошибка связи. Связь восстанавливается только в конце трансляции и передает все
    //    оставшиеся сообщения. Иногда помогает обновление страницы.
    async fetch(lastEventId) {
      game.lastSentEvent = game.events[game.events.length - 1];

      return getMissedEvents({ lastEventId, game });
    },
    stream(sse) {
      const interval = setInterval(() => {
        // Если lastSentEvent пуст (в случае перезапуска игры кнопкой).
        if (!game.lastSentEvent) {
          sse.sendEvent(toEventSSE(game.events[0]));
          // eslint-disable-next-line prefer-destructuring
          game.lastSentEvent = game.events[0];
        } else {
          const lastSentEventIndex = game.events.findIndex((event) => event.id === game.lastSentEvent.id);

          // Проверяем, появилось ли новое событие после последнего отправленного.
          if (lastSentEventIndex + 1 < game.events.length) {
            const event = game.events[lastSentEventIndex + 1];
            sse.sendEvent(toEventSSE(event));
            game.lastSentEvent = event;
          }
          // Если это событие завершает игру, то хорошо было бы закрыть поток на стороне сервера, но ...
          if (game.lastSentEvent.event === 'end') {
            // eslint-disable-next-line no-console
            console.log('End game, end stream');
            clearInterval(interval);
            ctx.res.status = 204; // Ни чего не дает (возможно, не правильно использую).
            sse.close(); // Закрывает поток, но браузер переподключается по новой.
            // Поэтому приходится закрывать на стороне клента (streamSSE.close()).
            // Так же, возможно, автор пакета 'http-event-stream' не предусмотрел возможность
            // закрыть поток так, чтобы браузер не переподключался.
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
