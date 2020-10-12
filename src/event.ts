import { v4 } from 'uuid'
import { expectedVersion as ExpectedVersion } from 'node-eventstore-client'
export class Event<P = any> {
  public readonly eventType: string

  constructor(
    public readonly eventStreamId: string,
    public readonly data: P,
    public version: number = ExpectedVersion.any,
    public readonly eventId = v4(),
    public readonly correlationId?: string,
    public readonly causationId?: string,
  ) {
    this.eventType = Object.getPrototypeOf(this).constructor.name
  }
}
