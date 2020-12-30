import { Inject } from '@nestjs/common'
import { AggregateRoot } from './aggregate-root'
import { Event } from './event'
import { EventStore } from './eventstore'
import { IEventStore } from './interfaces/eventstore.interface'

export class AggregateRepository<T extends AggregateRoot<Event>> {
  constructor(
    @Inject(EventStore) private readonly eventStore: IEventStore,
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
    await this.eventStore.save(aggregate.getUncommittedEvents())
    aggregate.commit()
  }

  private create(id: string) {
    return new (this.Aggregate as any)(this.category, id) as T
  }
}
