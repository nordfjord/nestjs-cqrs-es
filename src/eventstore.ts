import { Inject, Injectable } from '@nestjs/common'
import {
  EventStoreNodeConnection,
  createConnection,
  ResolvedEvent,
  EventData,
  createJsonEventData,
  WriteResult,
} from 'node-eventstore-client'
import { Subject } from 'rxjs'
import { Config } from './contract/config'
import { EVENT_STORE_SETTINGS_TOKEN } from './contract/constant'
import { Event } from './event'
import { EventTransformerStorage } from './event-transformer.storage'

@Injectable()
export class EventStore {
  client: EventStoreNodeConnection
  subject$?: Subject<any>
  isConnected = false

  constructor(
    @Inject(EVENT_STORE_SETTINGS_TOKEN)
    private readonly eventStoreSettings: Config,
  ) {
    this.connect()
  }

  private connect() {
    if (this.client) this.client.close()
    this.client = createConnection(
      this.eventStoreSettings.connection,
      this.eventStoreSettings.tcpEndpoint ||
        this.eventStoreSettings.gossipSeeds ||
        'tcp://127.0.0.1:1113',
    )
    this.attachHandlers()
    this.client.connect()
  }

  private attachHandlers() {
    this.client.on('connected', () => {
      this.isConnected = true
    })
    this.client.on('closed', () => {
      this.isConnected = false
      this.connect()
    })
  }

  private createPayload(event: Event): EventData {
    const metadata =
      event.correlationId || event.causationId
        ? {
            $correlationId: event.correlationId,
            $causationId: event.causationId,
          }
        : null

    const eventPayload: EventData = createJsonEventData(
      event.eventId,
      event.data,
      metadata,
      event.eventType,
    )
    return eventPayload
  }

  async publish(event: Event): Promise<WriteResult | undefined> {
    if (!event) {
      return
    }

    const eventPayload = this.createPayload(event)

    await this.client.appendToStream(event.eventStreamId, event.version, [
      eventPayload,
    ])
  }

  async publishAll(events: Event[]) {
    if (!events.length) return

    const first = events[0]

    const version = first.version

    return await this.client.appendToStream(
      first.eventStreamId,
      version,
      events.map(x => this.createPayload(x)),
    )
  }

  async *readStreamFromStart(streamId: string, resolveLinkTos = false) {
    const increment = 1000
    let current = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const slice = await this.client.readStreamEventsForward(
        streamId,
        current,
        increment,
        resolveLinkTos,
      )
      for (const recordedEvent of slice.events) {
        const event = this.convertEvent(recordedEvent)
        if (event) {
          yield event
        }
      }
      current += increment
      if (slice.isEndOfStream) return
    }
  }

  convertEvent(r: ResolvedEvent): Event | undefined {
    if (!r) return
    if (!r.event) return
    const transformer = EventTransformerStorage.getTransformer(
      r.event.eventType,
    )
    if (transformer) {
      return transformer({
        ...r.event,
        data:
          r.event.isJson && r.event.data
            ? JSON.parse(r.event.data.toString())
            : {},
      })
    }
  }
}
