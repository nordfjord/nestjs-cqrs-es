import { RecordedEvent } from 'node-eventstore-client'
import { Event } from '../event'

export type Transformer = (event: RecordedEvent & { data: any }) => Event
