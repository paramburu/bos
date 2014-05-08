(function ($) {
    'use strict';

    $('.controls a').on('click', function (event) {
        event.preventDefault();
    });



    $(function() {
        var Page = Pager(),
            reflowGraphs = function () {
                bofView.steelCompositionGraph.reflow();
                bofView.slagCompositionGraph.reflow();
                bofView.meltingPathGraph.reflow();
            };

        Page.on('goneto.page', function (e, view) {
            switch (view) {
                case 'simulator':
                    reflowGraphs();

                    $('.drawer').addClass('closed');
                break;
                case 'final_results':
                    var $graphResults = $('.steel-slag-results');

                    $('#steel_composition_graph')
                        .appendTo($graphResults);

                    $('#slag_composition_graph')
                        .appendTo($graphResults);

                    $('#melting_path_graph')
                        .appendTo($('.melting-path-results'));
                break;
            }
        }).on('goto.page', function (e, views) {
            switch (views.next) {
                case 'simulator':
                    window.bosLog = new BOSLog();

                    window.bofModel = new BOFModel(document.getElementById("target_steel_grade").value);
                    bofModel.init();

                    initFurnace();

                    bofView.init();

                    bofControl.startSimulation();

                    break;
            }
        });

        $('.show-additional-info').one('click', function () {
            setTimeout(reflowGraphs, 10);
        });

        window.Page = Page;

        $('.spinner').spnr();
        $('.slider').sldr();

        $(document).foundation();

    });
})(jQuery);
