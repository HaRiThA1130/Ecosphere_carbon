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

    return { calculateEmissionsFromValues, computeCarbonScore, COEFF };
}));

// Compute percentile and bucket distribution for a value against a numeric array
(function(){
    function computePercentile(value, distribution, bins) {
        if (!Array.isArray(distribution) || distribution.length === 0) {
            return { percentile: 50, buckets: [], bins: [] };
        }
        const sorted = distribution.slice().sort((a,b)=>a-b);
        let countLE = 0;
        for (let i=0;i<sorted.length;i++) if (sorted[i] <= value) countLE++;
        const percentile = Math.round((countLE / sorted.length) * 100);

        // bins default
        const defaultBins = [0,2,4,8,16,32];
        const b = Array.isArray(bins) && bins.length>0 ? bins : defaultBins;
        const buckets = new Array(b.length).fill(0);
        for (let i=0;i<sorted.length;i++){
            const v = sorted[i];
            let placed = false;
            for (let j=0;j<b.length;j++){
                if (v <= b[j]) { buckets[j]++; placed = true; break; }
            }
            if (!placed) {
                // overflow bucket
                if (buckets[buckets.length-1] === undefined) buckets[buckets.length-1]=0;
                buckets[buckets.length-1]++;
            }
        }

        return { percentile, buckets, bins: b };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports.computePercentile = computePercentile;
    }
    if (typeof window !== 'undefined' && window.EcoCalc) {
        window.EcoCalc.computePercentile = computePercentile;
    }
})();
