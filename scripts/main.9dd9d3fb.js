(function ($) {
    'use strict';

    pubsub.on('goto.view', function (e, views) {
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


    $('.controls a').on('click', function (event) {
        event.preventDefault();
    });



    $(function() {
        var View = Views();

        window.View = View;

        $('.spinner').spnr();
        $('.slider').sldr();

        $(document).foundation();

    });
})(jQuery);
