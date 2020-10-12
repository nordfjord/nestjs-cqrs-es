import { Inject } from '@nestjs/common'
import { getRepositoryToken } from '../utils/repository'

export const InjectAggregateRepository = (aggregate: Function) =>
  Inject(getRepositoryToken(aggregate))
