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
        },
        gotoView: function(next) {
            this.trigger('goto.view', {
                current: this.currentView,
                next: next
            });

            document.getElementById(this.currentView).style.display = 'none';
            document.getElementById(next).style.display = 'inherit';

            this.currentView = next;

            this.trigger('goneto.view', this.currentView);
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
            Highcharts.setOptions({
                chart: {
                    resetZoomButton: {
                        theme: {
                            fill: 'white',
                            stroke: 'silver',
                            r: 0,
                            states: {
                                hover: {
                                    fill: '#41739D',
                                    style: {
                                        color: 'white'
                                    }
                                }
                            }
                        }
                    }
                },
                plotOptions: {
                    spline: {
                        marker: {
                            enabled: false
                        }
                    },
                    series: {
                        marker: {
                            states: {
                                hover: {
                                    radius: 4
                                }
                            },
                        },
                        states: {
                            hover: {
                                halo: {
                                    size: 8
                                }
                            }
                        }
                    }
                },
                legend: {
                    align: 'right',
                    layout: 'vertical',
                    verticalAlign: 'middle',
                    itemStyle: {
                        paddingBottom: 20
                    }
                },
                yAxis: {
                    gridLineDashStyle: 'Dash'
                }
            });

            graphs.steelCompositionGraph = new Highcharts.Chart({
                chart: {
                    type: 'spline',
                    renderTo: 'steel_composition_graph',
                    zoomType: 'x'
                },
                title: {
                    text: null
                },
                credits: {
                    text: 'steeluniversity.com',
                    href: 'http://www.steeluniversity.com'
                },
                tooltip: {
                    shared: true,
                    valueDecimals: 2
                },
                series: [{
                    name: 'C',
                    id: 'C',
                    yAxis: 1,
                    data: [bofModel.steel.composition[bofModel.getElementIndex("C")] * 100]
                },{
                    name: 'Si',
                    id: 'Si',
                    data: [bofModel.steel.composition[bofModel.getElementIndex("Si")] * 100]
                },{
                    name: 'Mn',
                    id: 'Mn',
                    data: [bofModel.steel.composition[bofModel.getElementIndex("Mn")] * 100]
                },{
                    name: 'P',
                    id: 'P',
                    data: [bofModel.steel.composition[bofModel.getElementIndex("P")] * 100]
                }],
                xAxis: {
                    title: {
                        text: 'T[min]'
                    },
                    min: 0,
                    minRange: 10
                },
                yAxis: [{
                    title: {
                        text: 'Wt% Si Mn P'
                    },
                    labels: {
                        // style: {
                        //     color: Highcharts.getOptions().colors[3]
                        // }
                    },
                    max: 1,
                    min: 0,
                    minTickInterval: 0.01
                },{
                    title: {
                        text: 'Wt%C'
                    },
                    labels: {
                        style: {
                            color: Highcharts.getOptions().colors[0]
                        }
                    },
                    max: 5,
                    min: 0,
                    minTickInterval: 0.01
                }]
            });

            /************************/
            //  SLAG COMPOSITION    //
            /************************/

            graphs.slagCompositionGraph = new Highcharts.Chart({
                chart: {
                    type: 'spline',
                    renderTo: 'slag_composition_graph',
                    zoomType: 'x'
                },
                title: {
                    text: null
                },
                credits: {
                    text: 'steeluniversity.com',
                    href: 'http://www.steeluniversity.com'
                },
                tooltip: {
                    shared: true,
                    valueDecimals: 2
                },
                series: [{
                    name: 'SiO2',
                    id: 'SiO2',
                    data: [bofModel.slag.composition[bofModel.getCompoundIndex("SiO2")] * 100]
                },{
                    name: 'FeO',
                    id: 'FeO',
                    data: [bofModel.slag.composition[bofModel.getCompoundIndex("FeO")] * 100]
                },{
                    name: 'MnO',
                    id: 'MnO',
                    data: [bofModel.slag.composition[bofModel.getCompoundIndex("MnO")] * 100]
                },{
                    name: 'CaO',
                    id: 'CaO',
                    data: [bofModel.slag.composition[bofModel.getCompoundIndex("CaO")] * 100]
                },{
                    name: 'MgO',
                    id: 'MgO',
                    data: [bofModel.slag.composition[bofModel.getCompoundIndex("MgO")] * 100]
                }],
                xAxis: {
                    title: {
                        text: 'T[min]'
                    },
                    min: 0,
                    minRange: 10
                },
                yAxis: {
                    title: {
                        text: 'Wt%'
                    },
                    max: 100,
                    min: 0,
                    minTickInterval: 0.01
                }
            });


            /************************/
            //      MELTING PATH    //
            /************************/
            graphs.meltingPathGraph = new Highcharts.Chart({
                chart: {
                    type: 'scatter',
                    renderTo: 'melting_path_graph',
                    plotBackgroundImage: document.getElementById('melting_path_bg').src
                },
                title: {
                    text: null
                },
                credits: {
                    text: 'steeluniversity.com',
                    href: 'http://www.steeluniversity.com'
                },
                tooltip: {
                    useHTML: true,
                    valueSuffix: '&deg;C'
                },
                legend: {
                    enabled: false
                },
                xAxis: {
                    title: {
                        text: 'Wt%C'
                    },
                    min: 0,
                    max: 5,
                    minorGridLineWidth: 0,
                },
                yAxis: {
                    title: {
                        text: '&deg;C',
                        useHTML: true
                    },
                    tickWidth: 1,
                    lineWidth: 1,
                    gridLineWidth: 0,
                    min: 1000,
                    max: 1800
                },
                series: [{
                    name: '%C / T',
                    data: [[bofModel.steel.composition[bofModel.getElementIndex("C")] * 100, bofModel.steel.temperature - 273]]
                }]
            });
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
