(function(root, factory){
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.EcoCalc = factory();
    }
}(typeof self !== 'undefined' ? self : this, function(){

    const COEFF = {
        carMile: 0.35,
        transitHour: 1.2,
        flightHour: 90,
        electricityKwh: 0.37,
        heating: {
            'natural-gas': 1400,
            'electricity': 800,
            'heating-oil': 2200,
            'none': 0
        },
        diet: {
            'heavy-meat': 3000,
            'medium-meat': 2000,
            'low-meat': 1400,
            'vegetarian': 1000,
            'vegan': 600
        },
        foodWaste: {
            'high': 300,
            'medium': 100,
            'low': 0
        },
        shopping: {
            'high': 1800,
            'medium': 800,
            'low': 300
        },
        recycleBenefit: -150
    };

    function calculateEmissionsFromValues(inputs) {
        // inputs: { carMiles, transitHours, flightHours, electricity, heatingSource, householdSize, dietStyle, foodWaste, shoppingSpend, recycle }
        const safe = Object.assign({
            carMiles:0, transitHours:0, flightHours:0, electricity:0, heatingSource:'electricity', householdSize:1, dietStyle:'medium-meat', foodWaste:'medium', shoppingSpend:'medium', recycle:true
        }, inputs || {});

        const transportEmissions = (safe.carMiles * 52 * COEFF.carMile) + (safe.transitHours * 52 * COEFF.transitHour) + (safe.flightHours * COEFF.flightHour);
        const energyEmissions = ((safe.electricity * 12 * COEFF.electricityKwh) + COEFF.heating[safe.heatingSource]) / Math.max(1, safe.householdSize);
        const dietEmissions = COEFF.diet[safe.dietStyle] + COEFF.foodWaste[safe.foodWaste];
        let shoppingEmissions = COEFF.shopping[safe.shoppingSpend];
        if (safe.recycle) shoppingEmissions += COEFF.recycleBenefit;

        const totalKg = transportEmissions + energyEmissions + dietEmissions + shoppingEmissions;
        const totalTons = Math.max(0.1, totalKg / 1000);

        return {
            emissions: {
                transport: transportEmissions,
                energy: energyEmissions,
                diet: dietEmissions,
                shopping: shoppingEmissions
            },
            totalTons: totalTons
        };
    }

    function computeCarbonScore(totalTons) {
        const min = 0.0, max = 24.0;
        const clamped = Math.max(min, Math.min(max, totalTons));
        const raw = 100 - ((clamped - min) / (max - min)) * 100;
        const score = Math.round(Math.max(0, Math.min(100, raw)));
        return score;
    }

    function buildRecommendations(inputs, emissions) {
        const safeInputs = Object.assign({ carMiles:0 }, inputs || {});
        const safeEmissions = Object.assign({ transport:0, energy:0, diet:0, shopping:0 }, emissions || {});

        const pairs = [
            { key: 'transport', val: safeEmissions.transport },
            { key: 'energy', val: safeEmissions.energy },
            { key: 'diet', val: safeEmissions.diet },
            { key: 'shopping', val: safeEmissions.shopping }
        ].sort((a, b) => b.val - a.val);

        const top = pairs[0].key;
        const recs = [];

        if (top === 'transport') {
            recs.push({ title: 'Swap one weekly 10-mile car trip to bike/transit', savingsKg: Math.round(10 * 52 * COEFF.carMile), action: { type: 'habit', id: 'public-transit' } });
            recs.push({ title: 'Combine errands to reduce weekly driving by 25%', savingsKg: Math.round((safeInputs.carMiles * 52 * COEFF.carMile) * 0.25), action: { type: 'pledge', id: 'electric-bike' } });
        } else if (top === 'energy') {
            recs.push({ title: 'Lower thermostat 2° and save energy', savingsKg: 250, action: { type: 'habit', id: 'thermostat' } });
            recs.push({ title: 'Switch to LED bulbs at home', savingsKg: 150, action: { type: 'pledge', id: 'led-bulbs' } });
        } else if (top === 'diet') {
            recs.push({ title: 'Replace 2 meat meals per week with plant meals', savingsKg: 300, action: { type: 'habit', id: 'plant-meal' } });
            recs.push({ title: 'Try a monthly vegetarian challenge', savingsKg: 600, action: { type: 'pledge', id: 'meatless-mondays' } });
        } else {
            recs.push({ title: 'Buy one secondhand item instead of new per month', savingsKg: 120, action: { type: 'habit', id: 'zero-waste' } });
            recs.push({ title: 'Reduce discretionary shopping by 30%', savingsKg: 240, action: { type: 'pledge', id: 'green-power' } });
        }

        recs.push({ title: 'Start composting to reduce food waste', savingsKg: 80, action: { type: 'habit', id: 'zero-waste' } });
        return recs;
    }

    return { calculateEmissionsFromValues, computeCarbonScore, buildRecommendations, computePercentile, COEFF };
}));

// Compute percentile and bucket distribution for a value against a numeric array
function computePercentile(value, distribution, bins) {
    if (!Array.isArray(distribution) || distribution.length === 0) {
        return { percentile: 50, buckets: [], bins: [] };
    }
    const sorted = distribution.slice().sort((a, b) => a - b);
    let countLE = 0;
    for (let i = 0; i < sorted.length; i++) if (sorted[i] <= value) countLE++;
    const percentile = Math.round((countLE / sorted.length) * 100);

    const defaultBins = [0, 2, 4, 8, 16, 32];
    const b = Array.isArray(bins) && bins.length > 0 ? bins : defaultBins;
    const buckets = new Array(b.length).fill(0);
    for (let i = 0; i < sorted.length; i++) {
        const v = sorted[i];
        let placed = false;
        for (let j = 0; j < b.length; j++) {
            if (v <= b[j]) { buckets[j]++; placed = true; break; }
        }
        if (!placed) {
            buckets[buckets.length - 1]++;
        }
    }

    return { percentile, buckets, bins: b };
}
