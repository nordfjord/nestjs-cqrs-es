import { DynamicModule, Global, Module, Type } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { Config } from './contract/config'
import {
  EventStoreModuleAsyncOptions,
  ConfigService,
} from './interfaces/options.interface'
import { EVENT_STORE_SETTINGS_TOKEN } from './contract/constant'
import { EventStore } from './eventstore'

@Global()
@Module({
  imports: [CqrsModule],
})
export class EventStoreCoreModule {
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
