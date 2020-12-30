import { Event } from './event'

const INTERNAL_EVENTS = Symbol()

export class AggregateRoot<TEvent extends Event = Event> {
  private readonly [INTERNAL_EVENTS]: TEvent[] = []
  private version = -1
  public streamId: string

  constructor(streamName: string, id: string) {
    this.streamId = `${streamName}-${id}`
  }

  apply<T extends TEvent = TEvent>(event: TEvent, isFromHistory = false) {
    if (isFromHistory) {
      const handler = this.getEventHandler(event)
      handler && handler.call(this, event)
      ++this.version
      return
    }

    this[INTERNAL_EVENTS].push(event)
  }

  commit() {
    for (const event of this[INTERNAL_EVENTS]) {
      this.apply(event, true)
    }
    this[INTERNAL_EVENTS].length = 0
  }

  getUncommittedEvents() {
    const events = this[INTERNAL_EVENTS].slice()
    return { streamId: this.streamId, expectedVersion: this.version, events }
  }

  protected getEventHandler<T extends TEvent = TEvent>(
    event: T,
  ): Function | undefined {
    const handler = `on${this.getEventName(event)}`
    return this[handler]
  }

  protected getEventName(event: any): string {
    const { constructor } = Object.getPrototypeOf(event)
    return constructor.name as string
  }
}
