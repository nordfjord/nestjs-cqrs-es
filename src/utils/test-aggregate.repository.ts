import { AggregateRoot } from '../aggregate-root'
import { Event } from '../event'
import { getRepositoryToken } from './repository'

export class TestAggregateRepository<T extends AggregateRoot<Event>> {
  private events: Record<string, Event[]> = {}
  private category: string
  constructor(private Aggregate: Function) {
    this.category = Aggregate.name
  }
  async findOne(id: string) {
    const aggregate = this.create(id)
    const events =
      this.events[aggregate.streamId] || (this.events[aggregate.streamId] = [])
    for (const event of events) {
      aggregate.apply(event, true)
    }
    return aggregate
  }

  async save(a: T) {
    const eventsToSave = a.getUncommittedEvents()
    const currentEvents = this.events[eventsToSave.streamId]
    if (eventsToSave.expectedVersion !== currentEvents.length - 1)
      throw new Error('Concurrency exception')
    currentEvents.push(...eventsToSave.events)
    a.commit()
  }

  getEventsFor(id: string) {
    return this.events[this.create(id).streamId]
  }

  create(id: string) {
    return new (this.Aggregate as any)(this.category, id) as T
  }

  static forAggregate<T extends AggregateRoot<Event>>(aggregate: Function) {
    return {
      provide: getRepositoryToken(aggregate),
      useValue: new TestAggregateRepository<T>(aggregate),
    }
  }
}
