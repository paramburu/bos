(function($) {
    var $additions = $('#additions'),
        $ironMassSpnr = $(document.getElementById("additions_iron_mass")),
        $limeMassSpnr = $(document.getElementById("additions_lime_mass")),
        $dolomiteMassSpnr = $(document.getElementById("additions_dolomite_mass")),

    refreshAdditionsTotals = function() {
        var ironMass = $ironMassSpnr[0],
            ironCost = document.getElementById("additions_iron_cost"),
            limeMass = $limeMassSpnr[0],
            limeCost = document.getElementById("additions_lime_cost"),
            dolomiteMass = $dolomiteMassSpnr[0],
            dolomiteCost = document.getElementById("additions_dolomite_cost");

        ironCost.innerHTML = "$ " + parseFloat(ironMass.value * 0.085).toFixed(2);
        limeCost.innerHTML = "$ " + parseFloat(limeMass.value * 0.085).toFixed(2);
        dolomiteCost.innerHTML = "$ " + parseFloat(dolomiteMass.value * 0.085).toFixed(2);

        var massTotal = parseFloat(parseFloat(ironMass.value) + parseFloat(limeMass.value) + parseFloat(dolomiteMass.value)).toFixed(2);
        var costTotal = parseFloat(parseFloat(ironMass.value * 0.085) + parseFloat(limeMass.value * 0.085) + parseFloat(dolomiteMass.value * 0.085)).toFixed(2);

        document.getElementById("additions_total_mass").innerHTML = massTotal + " kg";
        document.getElementById("additions_total_cost").innerHTML = "$ " + costTotal;
        if (massTotal > 0) {
            document.getElementById("additions_order_button").disabled = false;
        } else {
            document.getElementById("additions_order_button").disabled = true;
        }
    },

        clearAdditionsForm = function() {
            $ironMassSpnr.spnr('value', 0);
            $limeMassSpnr.spnr('value', 0);
            $dolomiteMassSpnr.spnr('value', 0);

            refreshAdditionsTotals();
        },

        orderAdditions = function() {
            var ironMass = parseInt($ironMassSpnr.spnr('value')),
                limeMass = parseInt($limeMassSpnr.spnr('value')),
                dolomiteMass = parseInt($dolomiteMassSpnr.spnr('value')),
                costTotal = document.getElementById("additions_total_cost").innerHTML;

            costTotal = costTotal.slice(2, costTotal.length);
            costTotal = parseInt(costTotal);

            var str = gt('additions') + ": ",
                oxide,
                no_metal = new ChemicalComposition(),
                tempMat;

            if (ironMass > 0) {
                str += gt('iron_ore') + ": ";
                str += ironMass + " kg; ";
                oxide = new ChemicalComposition(new ChemicalComponent("FeO", 5));
                oxide.addData(new ChemicalComponent("Al2O3", 0), 0.003);
                oxide.addData(new ChemicalComponent("CaO", 2), 0.005);
                oxide.addData(new ChemicalComponent("MgO", 8), 0.001);
                oxide.addData(new ChemicalComponent("P", 17), 0.00001);
                tempMat = new Material("IO", "Iron Ore", "Minor addition", "Powder", 1.8, 85, no_metal, oxide, 0);
                bofModel.addMaterial(new MaterialAmount(tempMat, ironMass / 1000), 298);
            }
            if (limeMass > 0) {
                str += gt('lime') + ": ";
                str += limeMass + " kg; ";
                oxide = new ChemicalComposition(new ChemicalComponent("CaO", 2));
                oxide.addData(new ChemicalComponent("Al2O3", 0), 0.012);
                oxide.addData(new ChemicalComponent("MgO", 8), 0.018);
                oxide.addData(new ChemicalComponent("SiO2", 14), 0.021);
                oxide.addData(new ChemicalComponent("P", 17), 0.0001);
                oxide.addData(new ChemicalComponent("S", 18), 0.0001);
                tempMat = new Material("LI", "Lime", "Slag", "Powder", 1.0, 85, no_metal, oxide, 0);
                bofModel.addMaterial(new MaterialAmount(tempMat, limeMass / 1000), 298);
            }
            if (dolomiteMass > 0) {
                str += gt('dolomite') + ": ";
                str += dolomiteMass + " kg; ";
                oxide = new ChemicalComposition(new ChemicalComponent("CaO", 2));
                oxide.addData(new ChemicalComponent("MgO", 8), 0.385);
                oxide.addData(new ChemicalComponent("SiO2", 14), 0.02);
                oxide.addData(new ChemicalComponent("P", 17), 0.00005);
                oxide.addData(new ChemicalComponent("S", 18), 0.0015);
                tempMat = new Material("DO", "Dolomite", "Slag", "Powder", 1.0, 85, no_metal, oxide, 0);
                bofModel.addMaterial(new MaterialAmount(tempMat, dolomiteMass / 1000), 298);
            }
            str = str.slice(0, -2);

            // Add an entry to the events log
            bosLog.storeMsg(bofControl.getTime(), str);
            // Add the cost of the additions by grabbing the total cost already calculated
            bosLog.addCost("additions", costTotal);
        };

    $additions.find('.clearform').on('click', function(event) {
        clearAdditionsForm();
        event.preventDefault();
    });

    $additions.find('.spinner')
        .on('spnrspin', refreshAdditionsTotals)
        .on('spnrstop', refreshAdditionsTotals);

    $additions.find('#additions_order_button').on('click', function (event) {
        orderAdditions();
        $additions.foundation('reveal', 'close');
        clearAdditionsForm();

        event.preventDefault();
    });

})(jQuery);
