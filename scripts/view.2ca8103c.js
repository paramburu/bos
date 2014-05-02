(function($) {
    'use strict';
    var

    ViewsFactory = function(current, next) {
        return new Views(current, next);
    },

        Views = function(currentView, defaultView) {
            if (!currentView) {
                currentView = (defaultView) ? defaultView : 'intro';
            }

            this.currentView = currentView;

            this._setupEvents();
            this.gotoView(currentView);
        };

    Views.prototype = {
        _setupEvents: function() {
            var that = this;

            $('[data-goto-id]').on('click', function(e) {
                var next = $(this).data('gotoId');

                that.gotoView(next);
                e.preventDefault();
            });

            $(window).on('popstate', function(e) {
                var oe = e.originalEvent;

                that.gotoView(oe.state);
            });
        },
        gotoView: function(next) {
            this.trigger('goto.view', {
                current: this.currentView,
                next: next
            });

            document.getElementById(this.currentView).style.display = 'none';
            document.getElementById(next).style.display = 'inherit';

            this.currentView = next;
        }
    };

    $.extend(Views.prototype, pubsub);


    window.Views = ViewsFactory;

})(jQuery);


(function($, document, window) {
    'use strict';

    var SCALE_FACTOR_PX_M = 24.5,
        STEEL_SCALE_FACTOR = 1.55,

        furnaceShell = document.getElementById('furnaceShell'),
        innerFurnaceImg = document.getElementById('inner_furnace'),
        slagCnv = document.getElementById('slag'),
        finalPosition = false,
        finalSteelTemperature,

        graphs = {},

        temperatureLabel = $('.liquid-steel-temperature .value')[0],
        oxygenLabel = $('.total-oxygen-volume .value')[0],

        $popup = $('#popup'),

        stop = function() {
            stirringGas.stop();
            upperContent.stop();
        },

        displayTemperature = function(t) {
            temperatureLabel.innerHTML = t;
        },

        displayOxygenVolume = function(v) {
            oxygenLabel.innerHTML = Math.floor(v);
        },

        displayUserMessage = function(title, message, skipFinalResults) {
            if (!skipFinalResults) {
                $popup.addClass('to-final-results');
            }

            $popup.find('.popup-title')[0].innerHTML = title;
            $popup.find('.popup-body')[0].innerHTML = message;

            $popup.foundation('reveal', 'open');
        },

        argonFlowChange = function(val) {
            stirringGas.maxNumberOfBubbles = 15 + Math.floor(val * 100);
        },

        stopNitrogenFlow = function() {
            stirringGas.maxNumberOfBubbles = 0;
            $('.gas-rate').sldr('value', 0);
        },

        initGraphs = function() {
            graphs.steelCompositionGraph = new RGraph.Line('steel_composition_graph_cnv', [bofModel.steel.composition[bofModel.getElementIndex("C")] * 100], [bofModel.steel.composition[bofModel.getElementIndex("Si")] * 100], [bofModel.steel.composition[bofModel.getElementIndex("Mn")] * 100], [bofModel.steel.composition[bofModel.getElementIndex("P")] * 1000]);
            graphs.steelCompositionGraph.Set('labels', [0]);

            graphs.steelCompositionGraph.Set('ymax', 5);
            graphs.steelCompositionGraph.Set('scale.zerostart', true);
            graphs.steelCompositionGraph.Set('background.grid.hlines', true);
            graphs.steelCompositionGraph.Set('background.grid.vlines', false);
            graphs.steelCompositionGraph.Set('linewidth', 2);
            graphs.steelCompositionGraph.Set('colors', ['#DD0000', '#000000', '#00DD00', '#0000DD']);
            graphs.steelCompositionGraph.Set('yaxispos', 'left');
            graphs.steelCompositionGraph.Set('axis.color', '#999999');
            graphs.steelCompositionGraph.Set('text.color', '#000000');
            graphs.steelCompositionGraph.Set('gutter.top', 45);
            graphs.steelCompositionGraph.Set('gutter.bottom', 40);
            graphs.steelCompositionGraph.Set('gutter.left', 40);
            graphs.steelCompositionGraph.Set('gutter.right', 10);

            graphs.steelCompositionGraph.Set('title', gt('steel_composition_graph_title'));
            graphs.steelCompositionGraph.Set('title.size', 10);
            graphs.steelCompositionGraph.Set('title.xaxis', gt('minutes_after_start'));
            graphs.steelCompositionGraph.Set('title.xaxis.bold', false);
            graphs.steelCompositionGraph.Set('title.xaxis.size', 10);

            graphs.steelCompositionGraph.Set('key', ['wt-%C', 'wt-%Si', 'wt-%Mn', 'wt-%P*10']);
            graphs.steelCompositionGraph.Set('key.text.color', ['#DD0000', '#000000', '#00DD00', '#0000DD']);
            graphs.steelCompositionGraph.Set('key.position', 'gutter');
            graphs.steelCompositionGraph.Set('key.position.y', 30);

            graphs.steelCompositionGraph.Draw();


            /************************/
            //  SLAG COMPOSITION    //
            /************************/
            graphs.slagCompositionGraph = new RGraph.Line('slag_composition_graph_cnv', [bofModel.slag.composition[bofModel.getCompoundIndex("SiO2")] * 100], [bofModel.slag.composition[bofModel.getCompoundIndex("FeO")] * 100], [bofModel.slag.composition[bofModel.getCompoundIndex("MnO")] * 100], [bofModel.slag.composition[bofModel.getCompoundIndex("CaO")] * 100], [bofModel.slag.composition[bofModel.getCompoundIndex("MgO")] * 100]);

            graphs.slagCompositionGraph.Set('labels', [0]);

            graphs.slagCompositionGraph.Set('ymax', 100);
            graphs.slagCompositionGraph.Set('numyticks', 4);
            graphs.slagCompositionGraph.Set('ylabels.count', 4);
            graphs.slagCompositionGraph.Set('scale.zerostart', true);
            graphs.slagCompositionGraph.Set('background.grid.hlines', true);
            graphs.slagCompositionGraph.Set('background.grid.vlines', false);
            graphs.slagCompositionGraph.Set('linewidth', 2);
            graphs.slagCompositionGraph.Set('colors', ['#000000', '#DD0000', '#00DD00', '#FFFFFF', '#FFFF33']);
            graphs.slagCompositionGraph.Set('yaxispos', 'left');
            graphs.slagCompositionGraph.Set('axis.color', '#999999');
            graphs.slagCompositionGraph.Set('text.color', '#000000');
            graphs.slagCompositionGraph.Set('gutter.top', 45);
            graphs.slagCompositionGraph.Set('gutter.bottom', 40);
            graphs.slagCompositionGraph.Set('gutter.left', 40);
            graphs.slagCompositionGraph.Set('gutter.right', 10);


            graphs.slagCompositionGraph.Set('title', gt('slag_composition_graph_title'));
            graphs.slagCompositionGraph.Set('title.size', 10);
            graphs.slagCompositionGraph.Set('title.xaxis', gt('minutes_after_start'));
            graphs.slagCompositionGraph.Set('title.xaxis.bold', false);
            graphs.slagCompositionGraph.Set('title.xaxis.size', 10);

            graphs.slagCompositionGraph.Set('key', ['%SiO2', '%FeOx', '%MnO', '%CaO', '%MgO']);
            graphs.slagCompositionGraph.Set('key.text.color', ['#000000', '#DD0000', '#00DD00', '#FFFFFF', '#FFFF33']);
            graphs.slagCompositionGraph.Set('key.position', 'gutter');
            graphs.slagCompositionGraph.Set('key.position.y', 30);

            graphs.slagCompositionGraph.Draw();


            /************************/
            //      MELTING PATH    //
            /************************/
            graphs.meltingPathGraph = new RGraph.Scatter('melting_path_cnv', [
                [bofModel.steel.composition[bofModel.getElementIndex("C")] * 100, bofModel.steel.temperature - 273]
            ]);

            graphs.meltingPathGraph.Set('scale.zerostart', true);
            graphs.meltingPathGraph.Set('xmin', 0);
            graphs.meltingPathGraph.Set('xmax', 5.0);
            graphs.meltingPathGraph.Set('ymin', 1000);
            graphs.meltingPathGraph.Set('ymax', 1800);

            graphs.meltingPathGraph.Set('background.grid', false);
            graphs.meltingPathGraph.Set('background.image', document.getElementById('melting_path_bg').src);
            graphs.meltingPathGraph.Set('background.image.stretch', true);

            graphs.meltingPathGraph.Set('xscale', true);
            graphs.meltingPathGraph.Set('xscale.decimals', 1);
            graphs.meltingPathGraph.Set('tickmarks', 'circle');
            graphs.meltingPathGraph.Set('ticksize', 8);
            graphs.meltingPathGraph.Set('defaultcolor', '#B70000');
            graphs.meltingPathGraph.Set('numyticks', 8);
            graphs.meltingPathGraph.Set('ylabels.specific', ['1800', '1700', '1600', '1500', '1400', '1300', '1200', '1100', '1000'])
            graphs.meltingPathGraph.Set('title.yaxis', 'T / Celsius');
            graphs.meltingPathGraph.Set('title.yaxis.size', 10);
            graphs.meltingPathGraph.Set('title.yaxis.bold', false);
            graphs.meltingPathGraph.Set('title.yaxis.x', 30);

            graphs.meltingPathGraph.Set('axis.color', 'black');
            graphs.meltingPathGraph.Set('text.color', '#000000');
            graphs.meltingPathGraph.Set('gutter.top', 25);
            graphs.meltingPathGraph.Set('gutter.bottom', 30);
            graphs.meltingPathGraph.Set('gutter.left', 80);
            graphs.meltingPathGraph.Set('gutter.right', 10);

            graphs.meltingPathGraph.Set('title', gt('melting_path_graph_title'));
            graphs.meltingPathGraph.Set('title.size', 10);
            graphs.meltingPathGraph.Set('title.xaxis', 'wt-%C');
            graphs.meltingPathGraph.Set('title.xaxis.bold', false);
            graphs.meltingPathGraph.Set('title.xaxis.size', 10);

            graphs.meltingPathGraph.Draw();
        },

        openAnalysisResultsDialog = function() {
            if (bofModel.analysisPending) {
                document.getElementById("partial_analysis_results_button").disabled = true;
                $(document.getElementById("partial_analysis_results")).foundation('reveal', 'open');
            } else if (bofModel.resultsTime) {
                $(document.getElementById("complete_analysis_results")).foundation('reveal', 'open');
            } else {
                document.getElementById("partial_analysis_results_button").disabled = false;
                $(document.getElementById("partial_analysis_results")).foundation('reveal', 'open');
            }
        },

        displayPartialAnalysisResults = function() {
            document.getElementById("partial_analysis_results_button").disabled = true;
            $(document.getElementById("partial_analysis_results")).foundation('reveal', 'open');
        },

        displayCompleteAnalysisResults = function() {
            $(document.getElementById("complete_analysis_results")).foundation('reveal', 'open');
        },

        displayFinalResults = function() {
            //hide simulator
            // document.getElementById("simulator").className = "invisible";

            //Complete end results
            bofModel.analyzeFinalSteelComposition();

            bofModel.analyzeFinalSlagComposition();

            var minutes = bofModel.steelGrade.maximumTime;
            var checkTime = minutes;
            var hours = Math.floor(minutes / 60);
            minutes = Math.floor(minutes % 60);
            document.getElementById("final_results_target_time").innerHTML = hours + "H:" + minutes + "M";
            var seconds = bofControl.getSecondsTotal();
            minutes = Math.floor(seconds / 60);
            checkTime = checkTime - minutes;
            hours = Math.floor(minutes / 60);
            minutes = Math.floor(minutes % 60);
            document.getElementById("final_results_actual_time").innerHTML = hours + "H:" + minutes + "M";
            if (checkTime > 0) {
                $(document.getElementById("final_results_time_img")).toggleClass("fa-times-circle fa-check-circle");
            }

            document.getElementById("final_results_target_temperature").innerHTML = bofModel.steelGrade.minimumTemperature +
                "-" + bofModel.steelGrade.maximumTemperature + " &deg;C";
            finalSteelTemperature = bosLog.temperatureLog_array[bosLog.temperatureLog_array.length - 1];
            document.getElementById("final_results_actual_temperature").innerHTML = finalSteelTemperature + " &deg;C";
            if (finalSteelTemperature <= bofModel.steelGrade.maximumTemperature && finalSteelTemperature >= bofModel.steelGrade.minimumTemperature) {
                $(document.getElementById("final_results_temperature_img")).toggleClass("fa-times-circle fa-check-circle");
            }

            document.getElementById("final_results_hm_cost").innerHTML = "$" + bosLog.hotMetalCost;
            document.getElementById("final_results_hm_pre_cost").innerHTML = "$0"; //Missing information
            document.getElementById("final_results_additions_cost").innerHTML = "$" + bosLog.additionsCost;
            document.getElementById("final_results_other_cost").innerHTML = "$" + bosLog.getConsumablesCost();
            var totalCost = bosLog.getTotalCost();
            var mass = (bosLog.finalSteelMass > 0) ? bosLog.finalSteelMass : bofModel.steel.mass;
            var costPerTonne = Math.round(totalCost * 100 / (mass / 1000)) / 100;
            document.getElementById("final_results_total_cost").innerHTML = "$" + totalCost +
                "<br>($" + costPerTonne + "/t)";

            View.gotoView('final_results');

        },

        startFurnaceRotation = function() {
            // document.getElementById("control_and_info").className = "control_and_info_out";
            // document.getElementById("bos_scrap").style.display = "none";
            // document.getElementById("bos_furnace").className = "up";
            // document.getElementById("ladle").className = "in";
            // this.innerFurnace.style.left = '50px';
            // this.innerFurnace.style.top = '45';
            // this.innerFurnace.style.width = '225';

            // this.bosInner.steelLevelY -= 30;
            // //bofModel.steelLevel +=30;
            // this.bosInner.setBackground();

            // this.slagCnv.style.left = '50px';
            // this.slagCnv.style.top = '45';
            // this.slagCnv.style.width = '225';
            // this.currentFoamHeight += 30;
        },

        rotateFurnace = function(deg) {
            // if ((deg == 0) || (this.finalPosition)) {
            //     return;
            // }
            // if (deg == 95) {
            //     this.finalPosition = true;
            // }

            finalPosition = true;

            // this.furnaceShell.style.webkitTransform = 'rotate(' + deg + 'deg)';
            // this.furnaceShell.style.webkitTransformOrigin = '46.2% 53.5%';

            // this.furnaceShell.style.transform = 'rotate(' + deg + 'deg)';
            // this.furnaceShell.style.transformOrigin = '46.2% 53.5%';

            // this.furnaceShell.style.msTransform = 'rotate(' + deg + 'deg)';
            // this.furnaceShell.style.msTransformOrigin = '46.2% 53.5%';

            // //bofView.upperContent.currentFoamHeight = Math.max(0, bofView.upperContent.currentFoamHeight-bofView.upperContent.rateFoaming);

            // if (deg < 75) {
            //     //this.innerFurnace.style.width = '230px';
            //     this.innerFurnace.style.left = parseInt(50 - deg / 5 + 3).toString() + 'px';
            //     this.slagCnv.style.left = parseInt(30 - deg / 5).toString() + 'px';
            //     this.slagCnv.style.width = parseInt(230 + deg).toString() + 'px';
            // } else if ((deg >= 75) && (deg < 85)) {
            //     this.innerFurnace.style.width = parseInt(230 + 20 * deg / 95).toString() + 'px';
            //     this.innerFurnace.style.left = parseInt(50 - 20 * deg / 95).toString() + 'px';
            //     this.slagCnv.style.width = parseInt(230 + 20 * deg / 95).toString() + 'px';
            //     this.slagCnv.style.left = parseInt(50 - 20 * deg / 95).toString() + 'px';
            // } else {
            //     this.innerFurnace.style.width = parseInt(230 + 50 * deg / 95).toString() + 'px';
            //     document.getElementById("hot_metal_stream").style.top = (deg - 85) * 10 - 120;
            // }
        },


        init = function() {
            innerFurnace.init();
            stirringGas.init();
            upperContent.init();

            initGraphs();

            $.extend(this, graphs, {
                SCALE_FACTOR_PX_M: SCALE_FACTOR_PX_M,
                STEEL_SCALE_FACTOR: STEEL_SCALE_FACTOR,
                bosInner: innerFurnace,
                stirringGas: stirringGas,
                upperContent: upperContent,
                lanceModel: new LanceModel(),
                stop: stop,
                displayTemperature: displayTemperature,
                displayOxygenVolume: displayOxygenVolume,
                displayUserMessage: displayUserMessage,
                argonFlowChange: argonFlowChange,
                stopNitrogenFlow: stopNitrogenFlow,
                openAnalysisResultsDialog: openAnalysisResultsDialog,
                displayPartialAnalysisResults: displayPartialAnalysisResults,
                displayCompleteAnalysisResults: displayCompleteAnalysisResults,
                displayFinalResults: displayFinalResults,
                rotateFurnace: rotateFurnace,
                startFurnaceRotation: startFurnaceRotation
            });
        };



    $popup.on('closed', function() {
        if ($popup.hasClass('to-final-results')) {
            displayFinalResults();
            $popup.removeClass('to-final-results');
        }
    });

    window.bofView = {
        init: init
    };
})(jQuery, document, window)


var scrapPositioning = (function() {
    var scrapImg = $('#furnace_scrap'),
        defaultPos = parseFloat(scrapImg.css('bottom'));

    var updatePosition = function(offset) {
        scrapImg.css('bottom', defaultPos + offset);
    };

    return updatePosition;
})(document);
