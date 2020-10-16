import { Event } from '../event'

export interface IEventStore {
  readStreamFromStart(
    streamId: string,
    resolveLinkTos?: boolean,
  ): AsyncGenerator<Event, void, unknown>
}
