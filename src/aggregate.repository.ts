import { AggregateRoot } from '@nestjs/cqrs'
import { Event } from './event'
import { EventStore } from './eventstore'

export class AggregateRepository<T extends AggregateRoot<Event>> {
  constructor(
    private readonly eventStore: EventStore,
    private readonly Aggregate: Function,
    private readonly category: string,
  ) {}

  async findOne(id: string) {
    const aggregate = this.create(id)

    for await (const event of this.eventStore.readStreamFromStart(
      `${this.category}-${id}`,
    )) {
      aggregate.apply(event, true)
    }

    return aggregate
  }

  async save(aggregate: T) {
    await this.eventStore.publishAll(aggregate.getUncommittedEvents())
    aggregate.uncommit()
  }

  private create(id: string) {
    return new (this.Aggregate as any)(id) as T
  }
}
