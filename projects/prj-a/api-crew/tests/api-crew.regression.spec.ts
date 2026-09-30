import { defineRegressionTests } from '../../../../src/suites/regressionSuite';
import * as endpoints from '../endpoints';

defineRegressionTests(__dirname, endpoints);
