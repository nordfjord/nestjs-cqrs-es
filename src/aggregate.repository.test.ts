import { AggregateRoot } from '@nestjs/cqrs'
import { Test } from '@nestjs/testing'
import { AggregateRepository } from './aggregate.repository'
import { InjectAggregateRepository } from './decorators/inject-repository.decorator'
import { Event } from './event'
import { EventStore } from './eventstore'
import { getRepositoryToken } from './utils/repository'

test('it loads events from history', async () => {
  const repository = createAggregateRepository(
    [
      new SomethingHappened({ id: '1', what: 'First thing' }),
      new SomethingHappened({ id: '1', what: 'Second thing' }),
    ],
    () => {},
  )

  const something = await repository.findOne('1')

  expect(something.happenings).toHaveLength(2)
  expect(something.happenings).toEqual(['First thing', 'Second thing'])
})

test('Saving calls publishAll with uncommited events', async () => {
  const publishedEvents: Event[] = []
  const repository = createAggregateRepository([], evts =>
    publishedEvents.push(...evts),
  )
  const something = await repository.findOne('1')
  await something.doSomething('stuff')

  // also applies events to the aggregate immediately
  expect(something.happenings).toEqual(['stuff'])

  await repository.save(something)

  expect(publishedEvents).toHaveLength(1)
  expect(publishedEvents).toEqual([
    jasmine.objectContaining({ data: { id: '1', what: 'stuff' } }),
  ])
  expect(something.getUncommittedEvents()).toHaveLength(0)

  // No change because of saving
  expect(something.happenings).toEqual(['stuff'])
})

test(`It's injectable via @InjectAggregateRepository(Something)`, async () => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      { provide: EventStore, useValue: createEventStore([], () => {}) },
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
    super(`Something-${data.id}`, data)
  }
}

class Something extends AggregateRoot<Event> {
  public happenings: string[] = []

  constructor(public id: string) {
    super()
  }

  public doSomething(what: string) {
    this.apply(new SomethingHappened({ id: this.id, what }))
  }

  onSomethingHappened(event: SomethingHappened) {
    this.happenings.push(event.data.what)
  }
}

function createEventStore(
  events: Event[],
  onPublish: (events: Event[]) => void,
) {
  return ({
    async *readStreamFromStart() {
      for (const event of events) {
        yield event
      }
    },
    publishAll(events) {
      onPublish(events)
    },
  } as any) as EventStore
}

function createAggregateRepository(
  previousEvents: Event[],
  onPublish: (events: Event[]) => void,
) {
  return new AggregateRepository<Something>(
    createEventStore(previousEvents, onPublish),
    Something,
    'Something',
  )
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
