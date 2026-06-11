import { describe, it, expect } from 'vitest';

const Calc = require('../calculations.js');

describe('Report helpers', () => {
    it('produces stable percentile output for a monotonic distribution', () => {
        const data = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 8.0, 13.0];
        const res = Calc.computePercentile(3.0, data, [1, 2, 4, 8, 16]);
        expect(res.percentile).toBe(63);
        expect(res.bins).toEqual([1, 2, 4, 8, 16]);
        expect(res.buckets.reduce((sum, value) => sum + value, 0)).toBe(data.length);
    });

    it('keeps recommendation output deterministic for a given input profile', () => {
        const inputs = { carMiles: 0, transitHours: 0, flightHours: 0, electricity: 1200, householdSize: 1, dietStyle: 'vegan', foodWaste: 'low', shoppingSpend: 'low', recycle: false };
        const emissions = { transport: 100, energy: 1500, diet: 200, shopping: 100 };
        const first = Calc.buildRecommendations(inputs, emissions);
        const second = Calc.buildRecommendations(inputs, emissions);
        expect(first).toEqual(second);
        expect(first[0].action.id).toBe('thermostat');
    });
});