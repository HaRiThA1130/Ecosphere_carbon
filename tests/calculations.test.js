import { describe, it, expect } from 'vitest';

// Load module (UMD supports Node require)
const Calc = require('../calculations.js');

describe('Calculations module', () => {
    it('computes emissions for a baseline input', () => {
        const inputs = { carMiles: 100, transitHours: 2, flightHours: 0, electricity: 900, heatingSource: 'electricity', householdSize: 1, dietStyle: 'medium-meat', foodWaste: 'medium', shoppingSpend: 'medium', recycle: true };
        const out = Calc.calculateEmissionsFromValues(inputs);
        expect(out).toHaveProperty('emissions');
        expect(out.totalTons).toBeGreaterThan(0);
        expect(Math.round(out.emissions.transport)).toBe(1945);
        expect(Math.round(out.emissions.energy)).toBe(4796);
        expect(Math.round(out.emissions.diet)).toBe(2100);
        expect(Math.round(out.emissions.shopping)).toBe(650);
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

    it('handles invalid values safely in emission calculation', () => {
        const out = Calc.calculateEmissionsFromValues({
            carMiles: -100,
            transitHours: -1,
            flightHours: -3,
            electricity: -50,
            householdSize: 0,
            heatingSource: 'none',
            dietStyle: 'vegan',
            foodWaste: 'low',
            shoppingSpend: 'low',
            recycle: false
        });
        expect(out.totalTons).toBeGreaterThanOrEqual(0.1);
        expect(out.emissions.transport).toBeLessThanOrEqual(0);
    });

    it('builds recommendations from the dominant footprint source', () => {
        const recs = Calc.buildRecommendations({ carMiles: 150 }, { transport: 1200, energy: 400, diet: 300, shopping: 200 });
        expect(Array.isArray(recs)).toBe(true);
        expect(recs.length).toBeGreaterThanOrEqual(3);
        expect(recs[0].action.type).toBe('habit');
        expect(recs[0].action.id).toBe('public-transit');
    });

    it('switches recommendation strategy by dominant source', () => {
        const energyRecs = Calc.buildRecommendations({}, { transport: 100, energy: 500, diet: 50, shopping: 25 });
        const dietRecs = Calc.buildRecommendations({}, { transport: 100, energy: 50, diet: 500, shopping: 25 });
        const shoppingRecs = Calc.buildRecommendations({}, { transport: 100, energy: 50, diet: 25, shopping: 500 });

        expect(energyRecs[0].action.id).toBe('thermostat');
        expect(dietRecs[0].action.id).toBe('plant-meal');
        expect(shoppingRecs[0].action.id).toBe('zero-waste');
    });

    it('maps score linearly across the expected range', () => {
        expect(Calc.computeCarbonScore(0)).toBe(100);
        expect(Calc.computeCarbonScore(12)).toBe(50);
        expect(Calc.computeCarbonScore(24)).toBe(0);
    });

    it('returns a stable percentile result for empty distributions', () => {
        const res = Calc.computePercentile(5, []);
        expect(res.percentile).toBe(50);
        expect(res.buckets).toEqual([]);
    });
});
