function toEventSSE(event) {
  return {
    id: event.id,
    data: JSON.stringify(event.data),
    event: event.type,
  };
}

function getMissedEvents({ lastEventId, game }) {
  // Индекс последнего полученного события клиентом.
  const lastEventIndex = game.events.findIndex((event) => `${event.id}` === lastEventId);

  // Массив всех пропущенных событий.
  const result = game.events.slice(lastEventIndex + 1);

  // Для удобства проверки, первое и последнее события помечены.
  result[0].data.description = `${result[0].data.description} (first from fetch)`;
  result[result.length - 1].data.description = `${result[result.length - 1].data.description} last from fetch`;

  return result.map(toEventSSE);
}

module.exports = {
  getMissedEvents,
  toEventSSE,
};
