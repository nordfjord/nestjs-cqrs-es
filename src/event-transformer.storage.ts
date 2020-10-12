import { Transformer } from './interfaces/transformer.type'

export class EventTransformerStorage {
  private static readonly storage = new Map<string, Transformer>()

  static addTransformers(transformers: Record<string, Transformer>) {
    for (const [key, value] of Object.entries(transformers)) {
      this.storage.set(key, value)
    }
  }

  static getTransformer(name: string) {
    return this.storage.get(name)
  }
}
