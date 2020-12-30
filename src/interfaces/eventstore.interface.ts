import { Event } from '../event'

export interface IEventStore {
  readStreamFromStart(
    streamId: string,
    resolveLinkTos?: boolean,
  ): AsyncGenerator<Event, void, unknown>
  save(e: IEventsToSave): Promise<void>
}

export interface IEventsToSave {
  streamId: string
  expectedVersion: number
  events: Event[]
}
