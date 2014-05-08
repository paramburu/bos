(function($) {
    'use strict';
    var PagerFactory = function(current, next) {
            return new Pager(current, next);
        },

        Pager = function(currentView, defaultView) {
            if (!currentView) {
                currentView = (defaultView) ? defaultView : 'intro';
            }

            this.currentView = currentView;

            this._setupEvents();

            this.$this = $(this);

            this.gotoView(currentView);
        };

    Pager.prototype = {
        _setupEvents: function() {
            var that = this;

            $('[data-goto-id]').on('click', function(e) {
                var next = $(this).data('gotoId');

                that.gotoView(next);
                e.preventDefault();
            });
        },
        gotoView: function(next) {
            this.trigger('goto.page', {
                current: this.currentView,
                next: next
            });

            document.getElementById(this.currentView).style.display = 'none';
            document.getElementById(next).style.display = 'inherit';

            this.currentView = next;

            this.trigger('goneto.page', this.currentView);
        },
        on: function(events, selector, data, fn) {
                return this.$this.on(events, selector, data, fn);
        },
        trigger: function(event, extraParameters) {
                return this.$this.trigger(event, extraParameters);
        }
    };

    window.Pager = PagerFactory;

})(jQuery);
