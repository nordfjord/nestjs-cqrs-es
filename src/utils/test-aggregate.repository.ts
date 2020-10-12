import { AggregateRoot } from '@nestjs/cqrs'
import { Event } from '../event'
import { getRepositoryToken } from './repository'

export class TestAggregateRepository<T extends AggregateRoot<Event>> {
  private events: Record<string, Event[]> = {}
  constructor(private Aggregate: Function) {}
  async findOne(id: string) {
    const events = this.events[id] || (this.events[id] = [])
    const aggregate = this.create(id)
    for (const event of events) {
      aggregate.apply(event, true)
    }
    return aggregate
  }

  async save(a: T) {
    const events = a.getUncommittedEvents()
    this.events[(a as any).id].push(...events)
    a.uncommit()
  }

  getEventsFor(id: string) {
    return this.events[id]
  }

  create(id: string) {
    return new (this.Aggregate as any)(id) as T
  }

  static forAggregate<T extends AggregateRoot<Event>>(aggregate: Function) {
    return {
      provide: getRepositoryToken(aggregate),
      useValue: new TestAggregateRepository<T>(aggregate),
    }
  }
}
