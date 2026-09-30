import { defineEndpoint } from '../../../../src/types';

/** Valid licenses of one crew member. Test data: testdata/validLicenses.json */
export default defineEndpoint({
  method: 'GET',
  path: {
    v1: '/api/crew/{crewId}/licenses/valid',
    v2: '/api/v2/crew/{crewId}/licenses/valid',
  },
  ignore: ['meta.requestId', '**.lastUpdated'],
  sortArrays: { licenses: 'licenseNumber' },
});
