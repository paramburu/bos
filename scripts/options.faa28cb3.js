(function($) {
    'use strict';
    $(document).ready(function() {
        var hotMetalMass = document.getElementById("materials_hot_metal_mass"),
            hotMetalCost = $(".materials_hot_metal_cost"),
            lightScrapMass = document.getElementById("materials_light_scrap_mass"),
            lightScrapCost = $(".materials_light_scrap_cost"),
            heavyScrapMass = document.getElementById("materials_heavy_scrap_mass"),
            heavyScrapCost = $(".materials_heavy_scrap_cost"),
            ironMass = document.getElementById("materials_iron_mass"),
            ironCost = $(".materials_iron_cost"),
            limeMass = document.getElementById("materials_lime_mass"),
            limeCost = $(".materials_lime_cost"),
            dolomiteMass = document.getElementById("materials_dolomite_mass"),
            dolomiteCost = $(".materials_dolomite_cost"),
            totalMass = $(".materials_total_mass"),
            totalCost = $(".materials_total_cost"),
            totalCostPerTonne = $(".materials_cost_per_tonne"),
            startButton = document.getElementById('start_simulation'),
            updateTargetComposition = function(val) {
                switch (val) {
                    case "beam":
                        $(".composition_c_min").html("0.1");
                        $(".composition_c_max").html("0.16");
                        $(".composition_si_max").html("0.25");
                        $(".composition_mn_max").html("1.5");
                        $(".composition_p_max").html("0.025");
                        $(".composition_s_max").html("0.1");
                        $(".composition_cr_max").html("0.1");
                        $(".composition_mo_max").html("0.04");
                        $(".composition_ni_max").html("0.15");
                        $(".composition_cu_max").html("0.15");
                        $(".composition_nb_max").html("0.05");
                        $(".composition_ti_max").html("0.01");
                        break;
                    case "car":
                        $(".composition_c_min").html("0");
                        $(".composition_c_max").html("0.01");
                        $(".composition_si_max").html("0.25");
                        $(".composition_mn_max").html("0.85");
                        $(".composition_p_max").html("0.075");
                        $(".composition_s_max").html("0.5");
                        $(".composition_cr_max").html("0.5");
                        $(".composition_mo_max").html("0.1");
                        $(".composition_ni_max").html("0.8");
                        $(".composition_cu_max").html("0.8");
                        $(".composition_nb_max").html("0.03");
                        $(".composition_ti_max").html("0.035");
                        break;
                    case "pipe":
                        $(".composition_c_min").html("0");
                        $(".composition_c_max").html("0.08");
                        $(".composition_si_max").html("0.23");
                        $(".composition_mn_max").html("1.1");
                        $(".composition_p_max").html("0.008");
                        $(".composition_s_max").html("0.01");
                        $(".composition_cr_max").html("0.06");
                        $(".composition_mo_max").html("0.01");
                        $(".composition_ni_max").html("0.05");
                        $(".composition_cu_max").html("0.06");
                        $(".composition_nb_max").html("0.018");
                        $(".composition_ti_max").html("0.01");
                        break;
                    case "gear":
                        $(".composition_c_min").html("0.3");
                        $(".composition_c_max").html("0.45");
                        $(".composition_si_max").html("0.4");
                        $(".composition_mn_max").html("0.9");
                        $(".composition_p_max").html("0.035");
                        $(".composition_s_max").html("0.08");
                        $(".composition_cr_max").html("1.2");
                        $(".composition_mo_max").html("0.3");
                        $(".composition_ni_max").html("0.3");
                        $(".composition_cu_max").html("0.35");
                        $(".composition_nb_max").html("0");
                        $(".composition_ti_max").html("0");
                        break;
                }
            },

            refreshMaterialsTotals = function() {
                var massTotal, costTotal,
                    massForComposition;

                hotMetalCost.html("$ " + parseFloat(hotMetalMass.value * 185).toFixed(0));
                lightScrapCost.html("$ " + parseFloat(lightScrapMass.value * 0.19).toFixed(0));
                heavyScrapCost.html("$ " + parseFloat(heavyScrapMass.value * 0.15).toFixed(0));
                ironCost.html("$ " + parseFloat(ironMass.value * 0.085).toFixed(0));
                limeCost.html("$ " + parseFloat(limeMass.value * 0.085).toFixed(0));
                dolomiteCost.html("$ " + parseFloat(dolomiteMass.value * 0.085).toFixed(0));

                massTotal = Math.floor((parseFloat(hotMetalMass.value * 1000) + parseFloat(lightScrapMass.value) +
                    parseFloat(heavyScrapMass.value) + parseFloat(ironMass.value) + parseFloat(limeMass.value) +
                    parseFloat(dolomiteMass.value)) / 1000);
                costTotal = parseFloat(parseFloat(hotMetalMass.value * 185) + parseFloat(lightScrapMass.value * 0.19) +
                    parseFloat(heavyScrapMass.value * 0.15) + parseFloat(ironMass.value * 0.85) + parseFloat(limeMass.value * 0.85) +
                    parseFloat(dolomiteMass.value * 0.85)).toFixed(0);
                massForComposition = Math.floor((parseFloat(hotMetalMass.value * 1000) + parseFloat(lightScrapMass.value) +
                    parseFloat(heavyScrapMass.value)) / 1000);

                totalMass.innerHTML = massTotal + " t";
                totalCost.html("$ " + costTotal);
                totalCostPerTonne.html("$ " + parseFloat(costTotal / massTotal).toFixed(0) + "\/t");

                // //REFRESH COMPOSITIONS TABLE
                $(".composition_c_result").html(parseFloat((parseFloat(hotMetalMass.value * 4.5) + parseFloat(lightScrapMass.value / 1000 * 0.05) +
                    parseFloat(heavyScrapMass.value / 1000 * 0.05)) / massForComposition).toFixed(3));

                $(".composition_si_result").html(parseFloat(parseFloat(hotMetalMass.value * 0.4) / massForComposition).toFixed(3));

                $(".composition_mn_result").html(parseFloat((parseFloat(hotMetalMass.value * 0.5) +
                    parseFloat(lightScrapMass.value / 1000 * 0.12) + parseFloat(heavyScrapMass.value / 1000 * 0.12)) / massForComposition).toFixed(3));

                $(".composition_p_result").html(parseFloat((parseFloat(hotMetalMass.value * 0.08) +
                    parseFloat(lightScrapMass.value / 1000 * 0.015) + parseFloat(heavyScrapMass.value / 1000 * 0.015)) / massForComposition).toFixed(3));

                $(".composition_s_result").html(parseFloat((parseFloat(hotMetalMass.value * 0.02) +
                    parseFloat(lightScrapMass.value / 1000 * 0.015) + parseFloat(heavyScrapMass.value / 1000 * 0.015)) / massForComposition).toFixed(3));

                $(".composition_cr_result").html(parseFloat((parseFloat(lightScrapMass.value / 1000 * 0.26) +
                    parseFloat(heavyScrapMass.value / 1000 * 0.26)) / massForComposition).toFixed(3));

                $(".composition_mo_result").html(parseFloat((parseFloat(lightScrapMass.value / 1000 * 0.14) +
                    parseFloat(heavyScrapMass.value / 1000 * 0.14)) / massForComposition).toFixed(3));

                $(".composition_ni_result").html(parseFloat((parseFloat(lightScrapMass.value / 1000 * 0.4) +
                    parseFloat(heavyScrapMass.value / 1000 * 0.4)) / massForComposition).toFixed(3));

                $(".composition_cu_result").html(parseFloat((parseFloat(lightScrapMass.value / 1000 * 0.02) +
                    parseFloat(heavyScrapMass.value / 1000 * 0.02)) / massForComposition).toFixed(3));

                $(".composition_nb_result").html(parseFloat((parseFloat(lightScrapMass.value / 1000 * 0.001) +
                    parseFloat(heavyScrapMass.value / 1000 * 0.001)) / massForComposition).toFixed(3));

                $(".composition_ti_result").html(parseFloat((parseFloat(lightScrapMass.value / 1000 * 0.015) +
                    parseFloat(heavyScrapMass.value / 1000 * 0.015)) / massForComposition).toFixed(3));


                if (massTotal > 300) {
                    totalMass.css('color', 'red');
                    startButton.disabled = true;
                } else {
                    totalMass.css('color', 'inherit');
                    startButton.disabled = false;
                }
            },
            target_steel_grade = document.getElementById('target_steel_grade');


        // Step 1
        $(document.getElementById('step1')).on('change', function(event) {
            var target = event.target,
                description = $(this).find('.description')[0];

            description.innerHTML = gt(target.value + '_user_details');
        });

        // Step 2
        $(document.getElementById('step2')).on('change', function(event) {
            var value = event.target.value,
                description = $(this).find('.description')[0];

            switch (value) {
                case 'car':
                    description.innerHTML = gt('car_steel_description');
                    break;
                case 'pipe':
                    description.innerHTML = gt('pipe_steel_description') + gt('experienced_users');
                    break;
                case 'gear':
                    description.innerHTML = gt('engineering_steel_description');
                    break;
                default:
                    description.innerHTML = gt('construction_steel_description') + gt('novice_users');
            }

            target_steel_grade.value = value;
        });

        // Step 3
        $(target_steel_grade).on('change', function () {
            var value = this.value;

            updateTargetComposition(value);
            document.getElementById(value+'_grade').checked = true;
        });

        $('.raw-materials .clearform').on('click', function(e) {
            hotMetalMass.value = 200;
            lightScrapMass.value = 0;
            heavyScrapMass.value = 0;
            ironMass.value = 0;
            limeMass.value = 0;
            dolomiteMass.value = 0;

            refreshMaterialsTotals();

            e.preventDefault();
        });

        $('.raw-materials table')
            .on('spnrspin', '.spinner', refreshMaterialsTotals)
            .on('spnrstop', '.spinner', function (event) {
                var material = event.target;

                refreshMaterialsTotals();

                $('.' + material.id + ' .value').html($(material).spnr('value'));
            });

        // Step 5
        $('.show-summary').on('vclick', function () {
            $('.selected-steel-grade').text($('option:selected', target_steel_grade).clone().children().remove().end().text());

            $('.selected-user-level').text($('input[name=userLevel]:checked').parent('label').clone().children().remove().end().text());

            $('.hot-metal-temperature .value').text($('#hot_metal_temperature').spnr('value'));

            $('.stirring-gas-rate .value').text($('#stirring_gas_rate').spnr('value'));
        });

    });
})(jQuery);
