import { ModuleMetadata, Type } from '@nestjs/common'
import { Config } from '../contract/config'

export interface ConfigService {
  createEventStoreConfig(): Config | Promise<Config>
}

export interface EventStoreModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  name?: string
  useExisting?: Type<ConfigService>
  useClass?: Type<ConfigService>
  useFactory?: (...args: any[]) => Promise<Config> | Config
  inject?: any[]
}
