/**
 * jQuery Sldr
 *
 *  Depends:
 *      jquery.ui.core.js
 *      jquery.ui.widget.js
 *
 *  Options
 *      min (int|float)
 *      max (int|float)
 *      step (int|float)
 *      vertical (bool)
 *      labelFunction (function) :: (value) -> (processed value to display)
 *
 * Setup
 *      <input type="text|range|number" min="X" max="Y" step="Z" value="W" class="slider" data-sldr-vertical>
 *
 * Initialization
 *      $('.slider').sldr(options);
 *
 *
 * Events
 *      sldrstart
 *      sldrstop
 *      sldrchange
 *      sldrslide
 *
 */
(function($, window, document, undefined) {
    'use strict';

    var modifier = function (fn) {
        return function() {
            var hash = {};
            hash.previous = this.value();

            fn.apply(this, arguments);
            hash.value = this.value();

            if (hash.previous !== hash.value) {
                this._updateHandle(this._toPercentage(hash.value));
                this._updateLabel(hash.value);
                this._trigger('slide', arguments[1], hash);
            }
        };
    };

    $.widget('ptr.sldr', {
        template: '<div class="sldr-inner">' +
                    '<a href="#" class="sldr-handle"></a>' +
                  '</div>' +
                  '<span class="sldr-label"></span>',
                  // '<input type="number" class="sldr-input">',
        options: {
            min: 0,
            max: 100,
            step: 1,
            labelFunction: function (x) { return x; },
            vertical: false,
            // change: function () { console.log('EVENT'); }
        },

        _create: function() {
            var value;

            this._draw();

            value = this.value();
            this._updateHandle(this._toPercentage());
            this._updateLabel(this.value());

            this.sliding = false;
            this._setupEvents();

            if (this.element.prop('disabled')) {
                this.disable();
            }
        },

        _draw: function() {
            var sldr = this.sldr = $(this.template),
                wrapper = $('<div class="sldr-wrapper"></div>').append(sldr),
                input = this.element.clone(true).addClass('sldr-input')
                    .attr('type', 'number').appendTo(wrapper)
                    .val(this._adjustValue(this._adjustValue(+this.element.val())));

            this.handle = sldr.find('.sldr-handle');
            this.label = wrapper.find('.sldr-label');

            if (this.options.vertical) {
                wrapper.addClass('sldr-vertical');
            }

            this.element.replaceWith(wrapper);
            this.oldElement = this.element;
            this.element = input;
            this._sliderHeight = sldr.outerHeight();
        },

        _setupEvents: function() {
            this._on(document, this._documentEvents);
            this._on(this.sldr, this._sliderEvents);
        },

        _getCreateOptions: function() {
            var opts = {},
                el = this.element,
                attrs = ['min', 'max', 'step', 'vertical'];

            $.each(attrs, function(i, option) {
                var value, valid;

                switch (option) {
                    case 'vertical':
                        value = el.data('sldrVertical');
                        valid = value = (value !== undefined);
                        break;
                    default:
                        value = parseFloat(el.attr(option));
                        valid = !isNaN(value);
                }

                if (valid) {
                    opts[option] = value;
                }
            });

            return opts;
        },

        _value: function(value) {
            var adjusted;

            if (value !== '') {
                adjusted = this._adjustValue(value);
            }

            this.element.val(adjusted);
        },

        value: function(newVal, event) {
            if (!arguments.length) {
                return +this.element.val();
            }

            modifier(this._value).call(this, newVal, event);
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

        _toPercentage: function(value) {
            var opts = this.options,
                diff = opts.max - opts.min,
                percentage = (parseFloat(value) - opts.min) / diff * 100;

            percentage = parseFloat(percentage.toFixed(this._precision()));
            return percentage;
        },

        _updateHandle: function(percentage) {
            var dir = this.options.vertical ? 'bottom' : 'left';

            percentage += '%';

            this.handle.css(dir, percentage);
        },

        _adjustValue: function(value) {
            return this._capValue(this._roundStep(value));
        },

        _capValue: function(value) {
            var opts = this.options;

            if (value <= opts.min) {
                return opts.min;
            }

            if (value >= opts.max) {
                return opts.max;
            }

            return value;
        },

        _roundStep: function(value) {
            var opts = this.options,
                modStep = (value - opts.min) % opts.step,
                alignValue = value - modStep;

            if (Math.abs(modStep) * 2 >= opts.step) {
                alignValue += (modStep > 0) ? opts.step : (-opts.step);
            }

            return parseFloat(alignValue.toFixed(this._precision()));
        },

        _updateValue: function(event) {
            var opts = this.options,
                pos = opts.vertical ? event.pageY : event.pageX,
                offset = opts.vertical ? this.sldr.offset().top : this.sldr.offset().left,
                percentage = (pos - offset) / this._sliderHeight * 100,
                newVal;

            if (opts.vertical) {
                percentage = 100 - percentage;
            }

            newVal = (opts.max - opts.min) * percentage / 100;
            newVal += opts.min;

            this.value(newVal, event);

            event.preventDefault();
        },

        _updateLabel: function(value) {
            var processed = this.options.labelFunction(value);

            this.label[0].innerHTML = processed;
        },

        _start: function(event) {
            this._startValue = this.value();
            this.sliding = true;
            this._updateValue(event);
            this._trigger('start', event, this._startValue);
        },

        _slide: function(event) {
            if (this.sliding) {
                this._updateValue(event);
            }
        },

        _stop: function (event) {
            var hash = {
                previous: this._startValue,
                value: this.value()
            };

            if (!this.sliding) {
                return false;
            }

            this.sliding = false;

            this._trigger('stop', event, hash);

            if (hash.value !== hash.previous) {
                this._trigger('change', event, hash);
            }
        },

        _documentEvents: {
            'vmousemove': '_slide',
            'vmouseup': '_stop'
        },

        _sliderEvents: {
            'vclick': function(event) {
                event.preventDefault();
            },
            'vmousedown': '_start'
        },

        enable: function () {
            this.handle.removeClass('disabled');
            return this._super();
        },

        disable: function () {
            this.handle.addClass('disabled');
            return this._super();
        },

        _destroy: function() {
            this.oldElement.val(this.element.val());
            this.sldr.parent().replaceWith(this.oldElement);
        },
    });
})(jQuery, window, document);
