import { Inject, Injectable } from '@nestjs/common'
import { IEventPublisher } from '@nestjs/cqrs'
import {
  EventStoreNodeConnection,
  createConnection,
  ResolvedEvent,
  EventData,
  createJsonEventData,
  WriteResult,
} from 'node-eventstore-client'
import { Config } from './contract/config'
import { EVENT_STORE_SETTINGS_TOKEN } from './contract/constant'
import { Event } from './event'
import { EventTransformerStorage } from './event-transformer.storage'
import { IEventStore, IEventsToSave } from './interfaces/eventstore.interface'

@Injectable()
export class EventStore implements IEventStore {
  client: EventStoreNodeConnection
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

  async save({ streamId, events, expectedVersion }: IEventsToSave) {
    if (!events.length) return

    await this.client.appendToStream(
      streamId,
      expectedVersion,
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
