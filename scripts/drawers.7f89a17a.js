(function ( $, window, document, undefined ) {
    'use strict';

    $(document).ready(function () {
        $('.drawer .handle').on('click', function (e) {
            $(this).parent('.drawer').toggleClass('closed');

            e.preventDefault();
        });

        $('.drawer .close').on('button', function (e) {
            $(this).parent('.drawer').addClass('closed');

            e.preventDefault();
        });
    });

})( jQuery, window, document );
