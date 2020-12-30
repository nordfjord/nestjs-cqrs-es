import { v4 } from 'uuid'
export class Event<P = any> {
  public readonly eventType: string

  constructor(
    public readonly data: P,
    public readonly eventId = v4(),
    public readonly correlationId?: string,
    public readonly causationId?: string,
  ) {
    this.eventType = Object.getPrototypeOf(this).constructor.name
  }
}
