import type { ModelType } from './models'

export interface EndpointPair {
  post?: string
  latest?: string
}

export type EndpointMap = Partial<Record<ModelType, EndpointPair>>

export const DEFAULT_ENDPOINTS: EndpointMap = {
  dss: { post: '/dsss', latest: '/dsss-latest' },
  fhss: { post: '/fhss', latest: '/fhss-latest' },
  gfsk: { post: '/gfsk', latest: '/gfsk-latest' },
  ttc: { post: '/ttc', latest: '/ttc-latest' },
  adhoc: { post: '/adhoc', latest: '/adhoc-latest' },
  coordination: { post: '/coordination', latest: '/coordination-latest' },
  vhf: { post: '/vhf', latest: '/vhf-latest' },
  uhf: { post: '/uhf', latest: '/uhf-latest' },
  fiveG: { post: '/5g', latest: '/5g-latest' },
  custom: { post: '/choose', latest: '/choose-latest' },
}

export function mergeEndpoints(overrides?: EndpointMap): EndpointMap {
  return Object.fromEntries(
    Object.entries(DEFAULT_ENDPOINTS).map(([model, endpoint]) => [
      model,
      { ...endpoint, ...(overrides?.[model as ModelType] || {}) },
    ]),
  ) as EndpointMap
}
