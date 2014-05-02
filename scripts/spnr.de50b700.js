/**
 * jQuery Spnr
 *
 *  Depends:
 *      jquery.ui.core.js
 *      jquery.ui.widget.js
 *
 *  Options
 *      min (int|float)
 *      max (int|float)
 *      step (int|float)
 *      initialValue (int|float) (Defaults to value="")
 *      incremental (bool)
 *
 * Setup
 *      <input type="text|number" min="X" max="Y" step="Z" value="W" class="spinner">
 *
 * Initialization
 *      $('.spinner').spnr(options);
 *
 *
 * Events
 *      spnrstart
 *      spnrstop
 *      spnrchange
 *      spnrspin
 *
 */
(function($, window, document, undefined) {
    'use strict';

    function modifier(fn) {
        return function() {
            var previous = this.element.val();
            fn.apply(this, arguments);
            if (previous !== this.element.val()) {
                this._trigger('change');

            }
        };
    }

    $.widget('ptr.spnr', {
        wrapper: '<div class="spnr-wrapper"></div>',
        options: {
            initialValue: null,
            min: null,
            max: null,
            step: 1,
            incremental: true
        },

        _create: function() {
            this._setOption('max', this.options.max);
            this._setOption('min', this.options.min);
            this._setOption('step', this.options.step);

            if (this.value() !== '') {
                // Format the value, but don't constrain.
                this._value(this.element.val(), true);
            }

            this._draw();
            this._on(this._events);
            this._on(document, {
                'vmousemove': '_preventScroll',
                'vmouseup': '_stop'
            });
        },

        _getCreateOptions: function() {
            var options = {},
                element = this.element;

            $.each( [ 'min', 'max', 'step' ], function( i, option ) {
                var value = element.attr( option );
                if ( value !== undefined && value.length ) {
                    options[ option ] = value;
                }
            });

            if (element.val() !== '') {
                options.initialValue = element.val();
            }

            return options;
        },

        _draw: function() {
            var spnr = this.spnr = this.element
                .addClass('spnr-input radius')
                .wrap(this.wrapper)
                .parent()
                .prepend(this._spinButton('down'))
                .append(this._spinButton('up'));

            if (this.options.disabled) {
                this.disable();
            }

            this.buttons = spnr.find('.spnr-btn').attr( 'tabIndex', -1 );
        },

        _spinButton: function(dir) {
            return ['<button class="spnr-btn spnr-', dir, '"><span class="fa fa-chevron-', dir, ' fa-lg"></span></button>'].join('');
        },

        _start: function(event) {
            if (!this.spinning && this._trigger('start', event) === false) {
                return false;
            }

            if (!this.counter) {
                this.counter = 1;
            }
            this.spinning = true;
            return true;
        },

        _repeat: function(i, steps, event) {
            i = i || 500;

            clearTimeout(this.timer);
            this.timer = this._delay(function() {
                this._repeat(40, steps, event);
            }, i);

            this._spin(steps * this.options.step, event);
        },

        _spin: function(step, event) {
            var value = this.value() || 0;

            if (!this.counter) {
                this.counter = 1;
            }

            value = this._adjustValue(value + step * this._increment(this.counter));

            if (!this.spinning || this._trigger('spin', event, {
                value: value
            }) !== false) {
                this._value(value);
                this.counter++;
            }
        },

        _increment: function(i) {
            var incremental = this.options.incremental;

            if (incremental) {
                return $.isFunction(incremental) ?
                    incremental(i) :
                    Math.floor(i * i * i / 50000 - i * i / 500 + 17 * i / 200 + 1);
            }

            return 1;
        },

        _events: {
            keydown: function(event) {
                if (this._start(event) && this._keydown(event)) {
                    event.preventDefault();
                }
            },
            keyup: '_stop',
            'vmousedown .spnr-btn': function(event) {
                event.preventDefault();

                if (this._start(event) === false) {
                    return;
                }
                this._repeat(null, $(event.currentTarget).hasClass('spnr-up') ? 1 : -1, event);
            },
            'vclick .spnr-btn': function(event) {
                event.preventDefault();
            },
            'focusout .spnr-input': function () {
                if (this.options.initialValue && this.value() === null) {
                    this._value('');
                } else {
                    this._value(this.value());
                }
            },
            'mousewheel': function( event ) {
                var delta = event.originalEvent.wheelDelta;
                if ( !delta ) {
                    return;
                }

                if ( !this.spinning && !this._start( event ) ) {
                    return false;
                }

                this._spin( (delta > 0 ? 1 : -1) * this.options.step, event );
                clearTimeout( this.mousewheelTimer );
                this.mousewheelTimer = this._delay(function() {
                    if ( this.spinning ) {
                        this._stop( event );
                    }
                }, 100 );

                event.preventDefault();
            }
        },

        _destroy: function() {
            this.element
                .removeClass('spnr-input')
                .prop('disabled', false);

            this.spnr.replaceWith(this.element);
        },

        _keydown: function(event) {
            var options = this.options,
                keyCode = $.ui.keyCode;

            switch (event.keyCode) {
                case keyCode.UP:
                    this._repeat(null, 1, event);
                    return true;
                case keyCode.DOWN:
                    this._repeat(null, -1, event);
                    return true;
                case keyCode.PAGE_UP:
                    this._repeat(null, options.page, event);
                    return true;
                case keyCode.PAGE_DOWN:
                    this._repeat(null, -options.page, event);
                    return true;
            }

            return false;
        },

        _stop: function(event) {
            if (!this.spinning) {
                return;
            }

            clearTimeout(this.timer);
            clearTimeout(this.mousewheelTimer);
            this.counter = 0;
            this.spinning = false;
            this._trigger('stop', event);
        },

        _preventScroll: function (event) {
            if (this.spinning) {
                event.preventDefault();
            }
        },

        _setOption: function(key, value) {
            if (key === 'max' || key === 'min' || key === 'step') {
                if (typeof value === 'string') {
                    value = this._parse(value);
                }
            }

            this._super(key, value);

            if (key === 'disabled') {
                if (value) {
                    this.element.prop('disabled', true);
                    this.buttons.prop('disabled', true);
                } else {
                    this.element.prop('disabled', false);
                    this.buttons.prop('disabled', false);
                }
            }
        },

        _setOptions: modifier(function( options ) {
            this._super( options );
            this._value( this.element.val() );
        }),

        _parse: function(value) {
            if (typeof value === 'string' && value !== '') {
                value = +value;
            }
            return value === '' || isNaN(value) ? null : value;
        },

        _precision: function() {
            var precision = this._precisionOf(this.options.step);
            if (this.options.min !== null) {
                precision = Math.max(precision, this._precisionOf(this.options.min));
            }
            return precision;
        },

        _precisionOf: function(num) {
            var str = num.toString(),
                decimal = str.indexOf('.');
            return decimal === -1 ? 0 : str.length - decimal - 1;
        },

        _adjustValue: function(value) {
            var base, aboveMin,
                options = this.options;

            // make sure we're at a valid step
            // - find out where we are relative to the base (min or 0)
            base = options.min !== null ? options.min : 0;
            aboveMin = value - base;
            // - round to the nearest step
            aboveMin = Math.round(aboveMin / options.step) * options.step;
            // - rounding is based on 0, so adjust back to our base
            value = base + aboveMin;

            // fix precision from bad JS floating point math
            value = parseFloat(value.toFixed(this._precision()));

            // clamp the value
            if (options.max !== null && value > options.max) {
                return options.max;
            }
            if (options.min !== null && value < options.min) {
                return options.min;
            }

            return value;
        },

        // Update value without triggering event.
        _value: function(value, allowAny) {
            var parsed;
            if (value !== '') {
                parsed = this._parse(value);
                if (parsed !== null && !allowAny) {
                    parsed = this._adjustValue(parsed);
                }
            } else {
                parsed = this.options.initialValue;
            }
            this.element.val(parsed);
        },

        value: function(newVal) {
            if (!arguments.length) {
                return this._parse(this.element.val());
            }

            modifier(this._value).call(this, newVal);
        },

        widget: function() {
            return this.spnr;
        }
    });
})(jQuery, window, document);
