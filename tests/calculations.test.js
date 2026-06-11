import { describe, it, expect } from 'vitest';

// Load module (UMD supports Node require)
const Calc = require('../calculations.js');

describe('Calculations module', () => {
    it('computes emissions for a baseline input', () => {
        const inputs = { carMiles: 100, transitHours: 2, flightHours: 0, electricity: 900, heatingSource: 'electricity', householdSize: 1, dietStyle: 'medium-meat', foodWaste: 'medium', shoppingSpend: 'medium', recycle: true };
        const out = Calc.calculateEmissionsFromValues(inputs);
        expect(out).toHaveProperty('emissions');
        expect(out.totalTons).toBeGreaterThan(0);
    });

    it('computes carbon score bounds', () => {
        const scoreLow = Calc.computeCarbonScore(0.1);
        const scoreHigh = Calc.computeCarbonScore(24.0);
        expect(scoreLow).toBeGreaterThanOrEqual(0);
        expect(scoreLow).toBeLessThanOrEqual(100);
        expect(scoreHigh).toBeGreaterThanOrEqual(0);
        expect(scoreHigh).toBeLessThanOrEqual(100);
        expect(scoreLow).toBeGreaterThan(scoreHigh);
    });
});
