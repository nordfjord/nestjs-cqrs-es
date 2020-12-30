import { ExpectedVersion } from '..'
import { Event } from '../event'
import { ConcurrencyException } from '../exceptions/concurrency.exception'
import { IEventStore, IEventsToSave } from '../interfaces/eventstore.interface'

export class InMemoryEventStore implements IEventStore {
  private readonly events: Event[] = []
  private readonly streams: Record<string, Event[]> = {}

  getPublishedEvents() {
    return this.events
  }
  async save(e: IEventsToSave): Promise<void> {
    const current = this.streams[e.streamId] || (this.streams[e.streamId] = [])
    this.assertConcurrency(current.length - 1, e.expectedVersion)
    this.events.push(...e.events)
    current.push(...e.events)
  }

  assertConcurrency(version: number, expectedVersion: number) {
    if (version !== expectedVersion) throw new ConcurrencyException()
  }

  async *readStreamFromStart(
    streamId: string,
    resolveLinkTos?: boolean,
  ): AsyncGenerator<Event<any>, void, unknown> {
    const events = this.streams[streamId] || []
    for (const event of events) {
      yield event
    }
  }
}
