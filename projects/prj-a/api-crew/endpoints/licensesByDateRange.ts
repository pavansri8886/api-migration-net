import { defineEndpoint } from '../../../../src/types';

/** Licenses of one crew member valid in a date range (fromDate, toDate in the query). */
export default defineEndpoint({
  method: 'GET',
  path: {
    v1: '/api/crew/{crewId}/licenses',
    v2: '/api/v2/crew/{crewId}/licenses',
  },
  ignore: ['meta.requestId', '**.lastUpdated'],
  sortArrays: { licenses: 'licenseNumber' },
});
