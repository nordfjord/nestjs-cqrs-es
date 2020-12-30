import { AggregateRoot } from './aggregate-root'
import { Test } from '@nestjs/testing'
import { AggregateRepository } from './aggregate.repository'
import { InjectAggregateRepository } from './decorators/inject-repository.decorator'
import { Event } from './event'
import { EventStore } from './eventstore'
import { getRepositoryToken } from './utils/repository'
import { InMemoryEventStore } from './utils/in-memory-event-store'
import { ConcurrencyException } from './exceptions/concurrency.exception'

test('it loads events from history', async () => {
  const events = [
    new SomethingHappened({ id: '1', what: 'First thing' }),
    new SomethingHappened({ id: '1', what: 'Second thing' }),
  ]
  const eventStore = new InMemoryEventStore()
  await eventStore.save({
    streamId: 'Something-1',
    expectedVersion: -1,
    events,
  })

  const repository = createAggregateRepository(eventStore)

  const something = await repository.findOne('1')

  expect(something.happenings).toHaveLength(2)
  expect(something.happenings).toEqual(['First thing', 'Second thing'])
})

test('Saving uncommited events', async () => {
  const eventStore = new InMemoryEventStore()
  const repository = createAggregateRepository(eventStore)
  const something = await repository.findOne('1')
  await something.doSomething('stuff')

  // does not apply uncommited events
  expect(something.happenings).toEqual([])

  await repository.save(something)

  expect(eventStore.getPublishedEvents()).toHaveLength(1)
  expect(eventStore.getPublishedEvents()).toEqual([
    jasmine.objectContaining({ data: { id: 'Something-1', what: 'stuff' } }),
  ])
  expect(something.getUncommittedEvents().events).toHaveLength(0)
  expect(something.happenings).toEqual(['stuff'])
})

test('Optimistic concurrency', async () => {
  const repository = createAggregateRepository()
  const something = await repository.findOne('1')
  something.doSomething('stuff')

  const sameSomething = await repository.findOne('1')
  sameSomething.doSomething('stuff')

  await repository.save(something)
  something.commit()

  await expect(repository.save(sameSomething)).rejects.toThrowError(
    ConcurrencyException,
  )
  sameSomething.commit()
})

test(`It's injectable via @InjectAggregateRepository(Something)`, async () => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      { provide: EventStore, useClass: InMemoryEventStore },
      {
        provide: getRepositoryToken(Something),
        useFactory: (eventStore: EventStore) => {
          return new AggregateRepository(eventStore, Something, 'Something')
        },
        inject: [EventStore],
      },
      DependsOnAggregateRepository,
    ],
  }).compile()

  const dependent = moduleRef.get<DependsOnAggregateRepository>(
    DependsOnAggregateRepository,
  )

  const something = await dependent.getSomething()

  expect(something).toBeDefined()
  expect(something).toBeInstanceOf(Something)
})

class SomethingHappened extends Event {
  constructor(data: { id: string; what: string }) {
    super(data)
  }
}

class Something extends AggregateRoot<Event> {
  public happenings: string[] = []

  public doSomething(what: string) {
    this.apply(new SomethingHappened({ id: this.streamId, what }))
  }

  onSomethingHappened(event: SomethingHappened) {
    this.happenings.push(event.data.what)
  }
}

function createAggregateRepository(eventStore = new InMemoryEventStore()) {
  return new AggregateRepository<Something>(eventStore, Something, 'Something')
}

class DependsOnAggregateRepository {
  constructor(
    @InjectAggregateRepository(Something)
    private readonly repository: AggregateRepository<Something>,
  ) {}

  async getSomething() {
    return await this.repository.findOne('')
  }
}
