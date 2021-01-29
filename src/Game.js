class Game {
  constructor() {
    this.events = [];
    this.eventsCount = 1;
    this.lastSentEvent = null;
    this.eventsInterval = null;
  }

  start() {
    this.events.push(this.createEvent());
    this.eventsInterval = setInterval(() => {
      this.eventsCount += 1;
      this.events.push(this.createEvent());
      // eslint-disable-next-line no-console
      console.log('Event created', this.eventsCount);
      if (this.eventsCount === 50) clearInterval(this.eventsInterval);
    }, 2000);
  }

  restart() {
    this.events = [];
    this.eventsCount = 1;
    this.lastSentEvent = null;
    clearInterval(this.eventsInterval);
    this.start();
  }

  getEventType() {
    if (this.eventsCount === 1) return 'start';
    if (this.eventsCount === 50) return 'end';

    const rnd = Math.random();

    if (rnd < 0.6) return 'action';
    if (rnd >= 0.9) return 'goal';
    return 'freekick';
  }

  createEvent() {
    const eventDescriptions = {
      start: 'Игра началась',
      action: 'Идет перемещение мяча по полю, игроки и той, и другой команды активно пытаются атаковать',
      goal: 'Отличный удар! И Г-О-О-О-Л!',
      freekick: 'Нарушение правил, будет штрафной удар',
      end: 'Игра закончилась',
    };

    const type = this.getEventType();

    // Для удобства отслеживания заголовка c lastEventId, id генерируется не рандомно, а
    // с помощью порядкогого номера события.
    return {
      id: this.eventsCount,
      data: {
        description: `(${this.eventsCount}) ${eventDescriptions[type]}`,
        created: new Date(),
      },
      type,
    };
  }
}

module.exports = {
  Game,
};
