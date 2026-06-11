import { describe, it, expect } from 'vitest';

const Calc = require('../calculations.js');

describe('Community percentile', () => {
    it('returns correct percentile for known distribution', () => {
        const dist = [1,2,3,4,5,6,7,8,9,10];
        const res = Calc.computePercentile(5, dist, [2,4,6,8,10]);
        expect(res.percentile).toBe(50); // five values <=5 out of 10
        expect(Array.isArray(res.buckets)).toBe(true);
        expect(res.buckets.length).toBeGreaterThan(0);
    });
});
