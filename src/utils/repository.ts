export const getRepositoryToken = (aggregate: Function) => {
  return `${aggregate.name}AggregateRepository`
}
