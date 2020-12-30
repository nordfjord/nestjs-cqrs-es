import {
  DynamicModule,
  Global,
  Module,
  OnModuleInit,
  Type,
} from '@nestjs/common'
import { CqrsModule, EventBus } from '@nestjs/cqrs'
import { Config } from './contract/config'
import {
  EventStoreModuleAsyncOptions,
  ConfigService,
} from './interfaces/options.interface'
import { EVENT_STORE_SETTINGS_TOKEN } from './contract/constant'
import { EventStore } from './eventstore'
import { Event } from './event'

@Global()
@Module({
  imports: [CqrsModule],
})
export class EventStoreCoreModule implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBus<Event>,
    private readonly eventStore: EventStore,
  ) {}

  async onModuleInit() {
    await this.eventStore.client.subscribeToAll(true, (s, resolvedEvent) => {
      const event = this.eventStore.convertEvent(resolvedEvent)
      if (event) this.eventBus.subject$.next(event)
    })
  }

  static forRoot(config: Config): DynamicModule {
    return {
      module: EventStoreCoreModule,
      providers: [
        EventStore,
        { provide: EVENT_STORE_SETTINGS_TOKEN, useValue: config },
      ],
      exports: [EventStore],
    }
  }

  static forRootAsync(options: EventStoreModuleAsyncOptions) {
    return {
      module: EventStoreCoreModule,
      providers: [EventStore, this.createAsyncProvider(options)],
      exports: [EventStore],
    }
  }

  private static createAsyncProvider(options: EventStoreModuleAsyncOptions) {
    if (options.useFactory) {
      return {
        provide: EVENT_STORE_SETTINGS_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject || [],
      }
    }
    // `as Type<TypeOrmOptionsFactory>` is a workaround for microsoft/TypeScript#31603
    const inject = [
      (options.useClass || options.useExisting) as Type<ConfigService>,
    ]
    return {
      provide: EVENT_STORE_SETTINGS_TOKEN,
      useFactory: async (optionsFactory: ConfigService) =>
        await optionsFactory.createEventStoreConfig(),
      inject,
    }
  }
}
