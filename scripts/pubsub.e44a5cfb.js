(function ($, window) {
    'use strict';

    var
    obs = $({}),
    pubsub = {
        on: function(events, selector, data, fn) {
                if (typeof selector === 'function') {
                    selector = $.proxy(selector, this);
                } else if (typeof data === 'function') {
                    data = $.proxy(data, this);
                } else {
                    fn = $.proxy(fn, this);
                }

                return obs.on(events, selector, data, fn);
        },
        trigger: function(event, extraParameters) {
                return obs.trigger(event, extraParameters);
        }
    };

    window.pubsub = pubsub;

})(jQuery, window);
