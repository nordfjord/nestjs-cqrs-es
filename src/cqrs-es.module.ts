import { DynamicModule, Module, Provider, Type } from '@nestjs/common'
import { AggregateRepository } from './aggregate.repository'
import { Config } from './contract/config'
import { EventStoreCoreModule } from './cqrs-es-core.module'
import { EventTransformerStorage } from './event-transformer.storage'
import { EventStore } from './eventstore'
import { EventStoreModuleAsyncOptions } from './interfaces/options.interface'
import { Transformer } from './interfaces/transformer.type'
import { getRepositoryToken } from './utils/repository'

@Module({})
export class EventStoreModule {
  static forRoot(options: Config): DynamicModule {
    return {
      module: EventStoreModule,
      imports: [EventStoreCoreModule.forRoot(options)],
    }
  }

  static forRootAsync(config: EventStoreModuleAsyncOptions) {
    return {
      module: EventStoreModule,
      imports: [EventStoreCoreModule.forRootAsync(config)],
    }
  }

  static forFeature(
    aggregateRoots: Function[],
    transformers: Record<string, Transformer>,
  ): DynamicModule {
    EventTransformerStorage.addTransformers(transformers)
    const providers = this.createAggregateRepositoryProviders(aggregateRoots)
    return {
      module: EventStoreModule,
      providers,
      exports: providers,
    }
  }

  private static createAggregateRepositoryProviders(
    aggregateRoots: Function[],
  ): Provider[] {
    return aggregateRoots.map(aggregateRoot => ({
      provide: getRepositoryToken(aggregateRoot),
      useFactory: eventStore => {
        return new AggregateRepository(
          eventStore,
          aggregateRoot,
          aggregateRoot.name,
        )
      },
      inject: [EventStore],
    }))
  }
}
